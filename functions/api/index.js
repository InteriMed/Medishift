const functions = require('firebase-functions');
const admin = require('firebase-admin');
const notificationsFunctions = require('./notifications');

// HTTP endpoint for contract operations (for integration with external systems)
const contractAPI = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to use this API'
    );
  }

  const { action, contractId, contractData } = data;

  try {
    switch (action) {
      case 'get': {
        // Get a specific contract
        if (!contractId) {
          throw new functions.https.HttpsError(
            'invalid-argument',
            'Contract ID is required'
          );
        }

        const contractDoc = await admin.firestore()
          .collection('contracts')
          .doc(contractId)
          .get();

        if (!contractDoc.exists) {
          throw new functions.https.HttpsError(
            'not-found',
            'Contract not found'
          );
        }

        // SECURITY CHECK: Verify user has permission to view this contract
        const contract = contractDoc.data();
        const userId = context.auth.uid;

        const isProfessional = contract.parties?.professional?.profileId === userId;
        const isEmployer = contract.parties?.employer?.profileId === userId;
        const isParticipant = contract.participants?.includes(userId);

        // Backward compatibility with old structure
        const isOldWorker = contract.workerId === userId;
        const isOldCompany = contract.companyId === userId;

        if (!isProfessional && !isEmployer && !isParticipant && !isOldWorker && !isOldCompany) {
          throw new functions.https.HttpsError(
            'permission-denied',
            'You do not have permission to view this contract'
          );
        }

        return {
          success: true,
          contract: {
            id: contractDoc.id,
            ...contract
          }
        };
      }

      case 'list': {
        // List contracts for the current user
        const userId = context.auth.uid;

        // Query contracts where user is either professional or employer
        const professionalContracts = await admin.firestore()
          .collection('contracts')
          .where('parties.professional.profileId', '==', userId)
          .orderBy('statusLifecycle.timestamps.createdAt', 'desc')
          .get();

        const employerContracts = await admin.firestore()
          .collection('contracts')
          .where('parties.employer.profileId', '==', userId)
          .orderBy('statusLifecycle.timestamps.createdAt', 'desc')
          .get();

        // Also check participants array for backward compatibility
        const participantContracts = await admin.firestore()
          .collection('contracts')
          .where('participants', 'array-contains', userId)
          .get();

        // Combine and deduplicate contracts
        const contractMap = new Map();

        [professionalContracts, employerContracts, participantContracts].forEach(snapshot => {
          snapshot.forEach(doc => {
            if (!contractMap.has(doc.id)) {
              contractMap.set(doc.id, {
                id: doc.id,
                ...doc.data()
              });
            }
          });
        });

        const contracts = Array.from(contractMap.values());

        return {
          success: true,
          contracts
        };
      }

      case 'create': {
        // Create a new contract
        if (!contractData) {
          throw new functions.https.HttpsError(
            'invalid-argument',
            'Contract data is required'
          );
        }

        const userId = context.auth.uid;

        // SECURITY CHECK: Ensure user is part of the contract
        const professionalId = contractData.parties?.professional?.profileId;
        const employerId = contractData.parties?.employer?.profileId;

        if (professionalId !== userId && employerId !== userId) {
          throw new functions.https.HttpsError(
            'permission-denied',
            'You must be either the professional or employer in the contract'
          );
        }

        // Prepare contract data with metadata
        const newContract = {
          ...contractData,
          createdBy: userId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          statusLifecycle: {
            currentStatus: contractData.statusLifecycle?.currentStatus || 'draft',
            timestamps: {
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }
          },
          // Ensure participants array includes both parties
          participants: [
            ...new Set([
              ...(contractData.participants || []),
              professionalId,
              employerId,
              userId
            ].filter(Boolean))
          ]
        };

        const contractRef = await admin.firestore()
          .collection('contracts')
          .add(newContract);

        return {
          success: true,
          contractId: contractRef.id
        };
      }

      case 'update': {
        // Update an existing contract
        if (!contractId || !contractData) {
          throw new functions.https.HttpsError(
            'invalid-argument',
            'Contract ID and data are required'
          );
        }

        const userId = context.auth.uid;

        // Check if contract exists and user has permission
        const contractDoc = await admin.firestore()
          .collection('contracts')
          .doc(contractId)
          .get();

        if (!contractDoc.exists) {
          throw new functions.https.HttpsError(
            'not-found',
            'Contract not found'
          );
        }

        const contract = contractDoc.data();

        // SECURITY CHECK: Verify user has permission to update
        const isProfessional = contract.parties?.professional?.profileId === userId;
        const isEmployer = contract.parties?.employer?.profileId === userId;
        const isParticipant = contract.participants?.includes(userId);

        // Backward compatibility
        const isOldWorker = contract.workerId === userId;
        const isOldCompany = contract.companyId === userId;

        if (!isProfessional && !isEmployer && !isParticipant && !isOldWorker && !isOldCompany) {
          throw new functions.https.HttpsError(
            'permission-denied',
            'You do not have permission to update this contract'
          );
        }

        // Prepare update data
        const updateData = {
          ...contractData,
          updatedBy: userId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // Update status lifecycle if status is being changed
        if (contractData.statusLifecycle?.currentStatus) {
          updateData['statusLifecycle.currentStatus'] = contractData.statusLifecycle.currentStatus;
          updateData['statusLifecycle.timestamps.updatedAt'] = admin.firestore.FieldValue.serverTimestamp();
          if (contractData.statusLifecycle.notes) {
            updateData['statusLifecycle.notes'] = contractData.statusLifecycle.notes;
          }
        }

        // Remove fields that shouldn't be updated directly
        delete updateData.id;
        delete updateData.createdAt;
        delete updateData.createdBy;

        // Update the contract
        await admin.firestore()
          .collection('contracts')
          .doc(contractId)
          .update(updateData);

        return {
          success: true
        };
      }

      default:
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Invalid action requested'
        );
    }
  } catch (error) {
    console.error('Error in contract API:', error);
    throw new functions.https.HttpsError(
      'internal',
      error.message
    );
  }
});

// MESSAGE API FUNCTIONS

const messagesAPI = functions.https.onCall(async (data, context) => {
  // SECURITY CHECK: Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to use this API'
    );
  }

  const { action, conversationId, messageData, conversationData } = data;
  const userId = context.auth.uid;

  try {
    switch (action) {
      case 'getConversations': {
        const { context: messageContext = 'personal', facilityId = null } = data;

        let conversationsQuery;
        const conversationsRef = admin.firestore().collection('conversations');

        if (messageContext === 'personal') {
          conversationsQuery = conversationsRef
            .where('participantIds', 'array-contains', userId)
            .orderBy('lastMessageTimestamp', 'desc');
        } else if (messageContext === 'facility' && facilityId) {
          // SECURITY CHECK: Verify user is an admin of the facility
          const facilityDoc = await admin.firestore().collection('facilityProfiles').doc(facilityId).get();

          if (!facilityDoc.exists) {
            throw new functions.https.HttpsError(
              'not-found',
              'Facility not found'
            );
          }

          const facilityData = facilityDoc.data();
          if (!facilityData.admin || !facilityData.admin.includes(userId)) {
            throw new functions.https.HttpsError(
              'permission-denied',
              'You do not have permission to view this facility\'s conversations'
            );
          }

          conversationsQuery = conversationsRef
            .where('facilityProfileId', '==', facilityId)
            .orderBy('lastMessageTimestamp', 'desc');
        } else {
          throw new functions.https.HttpsError(
            'invalid-argument',
            'Invalid context or missing facilityId'
          );
        }

        const snapshot = await conversationsQuery.get();
        const conversations = [];
        snapshot.forEach(doc => {
          conversations.push({
            id: doc.id,
            ...doc.data()
          });
        });

        return {
          success: true,
          conversations
        };
      }

      case 'getMessages': {
        if (!conversationId) {
          throw new functions.https.HttpsError(
            'invalid-argument',
            'Conversation ID is required'
          );
        }

        // SECURITY CHECK: Verify user is a participant
        const conversationDoc = await admin.firestore()
          .collection('conversations')
          .doc(conversationId)
          .get();

        if (!conversationDoc.exists) {
          throw new functions.https.HttpsError(
            'not-found',
            'Conversation not found'
          );
        }

        const conversationData = conversationDoc.data();
        const isParticipant = conversationData.participantIds?.includes(userId) ||
          conversationData.participants?.includes(userId);

        if (!isParticipant) {
          throw new functions.https.HttpsError(
            'permission-denied',
            'You do not have permission to view this conversation'
          );
        }

        // Get messages from subcollection
        const messagesSnapshot = await admin.firestore()
          .collection('conversations')
          .doc(conversationId)
          .collection('messages')
          .orderBy('timestamp', 'asc')
          .get();

        const messages = [];
        messagesSnapshot.forEach(doc => {
          messages.push({
            id: doc.id,
            ...doc.data()
          });
        });

        return {
          success: true,
          messages
        };
      }

      case 'sendMessage': {
        if (!conversationId || !messageData || !messageData.text) {
          throw new functions.https.HttpsError(
            'invalid-argument',
            'Conversation ID and message text are required'
          );
        }

        // SECURITY CHECK: Verify user is a participant
        const conversationRef = admin.firestore()
          .collection('conversations')
          .doc(conversationId);
        const conversationDoc = await conversationRef.get();

        if (!conversationDoc.exists) {
          throw new functions.https.HttpsError(
            'not-found',
            'Conversation not found'
          );
        }

        const conversationData = conversationDoc.data();
        const isParticipant = conversationData.participantIds?.includes(userId) ||
          conversationData.participants?.includes(userId);

        if (!isParticipant) {
          throw new functions.https.HttpsError(
            'permission-denied',
            'You do not have permission to send messages to this conversation'
          );
        }

        // Add message to subcollection
        const newMessage = {
          senderId: userId,
          text: messageData.text.trim(),
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          status: 'sent',
          imageUrl: messageData.imageUrl || null,
          fileUrl: messageData.fileUrl || null,
          fileName: messageData.fileName || null,
          fileType: messageData.fileType || null,
          reactions: []
        };

        const messageRef = await admin.firestore()
          .collection('conversations')
          .doc(conversationId)
          .collection('messages')
          .add(newMessage);

        // Update conversation's lastMessage and lastMessageTimestamp
        await conversationRef.update({
          lastMessage: {
            text: messageData.text.trim(),
            senderId: userId,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
          },
          lastMessageTimestamp: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return {
          success: true,
          messageId: messageRef.id
        };
      }

      case 'createConversation': {
        if (!conversationData || !conversationData.participantIds || !Array.isArray(conversationData.participantIds) || conversationData.participantIds.length < 2) {
          throw new functions.https.HttpsError(
            'invalid-argument',
            'At least 2 participant IDs are required'
          );
        }

        if (!conversationData.participantInfo || !Array.isArray(conversationData.participantInfo)) {
          throw new functions.https.HttpsError(
            'invalid-argument',
            'Participant info is required'
          );
        }

        // SECURITY CHECK: Ensure user is in participantIds
        if (!conversationData.participantIds.includes(userId)) {
          throw new functions.https.HttpsError(
            'permission-denied',
            'You must be a participant in the conversation'
          );
        }

        const newConversation = {
          participantIds: conversationData.participantIds,
          participantInfo: conversationData.participantInfo,
          contractId: conversationData.contractId || null,
          facilityProfileId: conversationData.facilityProfileId || null,
          professionalProfileId: conversationData.professionalProfileId || null,
          lastMessage: {
            text: '',
            senderId: '',
            timestamp: admin.firestore.FieldValue.serverTimestamp()
          },
          lastMessageTimestamp: admin.firestore.FieldValue.serverTimestamp(),
          unreadCounts: conversationData.participantIds.reduce((acc, id) => {
            acc[id] = 0;
            return acc;
          }, {}),
          isArchivedBy: [],
          typingIndicator: conversationData.participantIds.reduce((acc, id) => {
            acc[id] = false;
            return acc;
          }, {}),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const conversationRef = await admin.firestore()
          .collection('conversations')
          .add(newConversation);

        return {
          success: true,
          conversationId: conversationRef.id
        };
      }

      case 'markAsRead': {
        if (!conversationId) {
          throw new functions.https.HttpsError(
            'invalid-argument',
            'Conversation ID is required'
          );
        }

        // SECURITY CHECK: Verify user is a participant
        const conversationRef = admin.firestore()
          .collection('conversations')
          .doc(conversationId);
        const conversationDoc = await conversationRef.get();

        if (!conversationDoc.exists) {
          throw new functions.https.HttpsError(
            'not-found',
            'Conversation not found'
          );
        }

        const conversationData = conversationDoc.data();
        const isParticipant = conversationData.participantIds?.includes(userId) ||
          conversationData.participants?.includes(userId);

        if (!isParticipant) {
          throw new functions.https.HttpsError(
            'permission-denied',
            'You do not have permission to access this conversation'
          );
        }

        // Update unreadCounts
        if (conversationData.unreadCounts) {
          const unreadCounts = { ...conversationData.unreadCounts };
          unreadCounts[userId] = 0;
          await conversationRef.update({ unreadCounts });
        } else if (conversationData.unreadBy) {
          // Backward compatibility with old structure
          const unreadBy = (conversationData.unreadBy || []).filter(id => id !== userId);
          await conversationRef.update({ unreadBy });
        }

        return {
          success: true
        };
      }

      default:
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Invalid action requested'
        );
    }
  } catch (error) {
    console.error('Error in messages API:', error);

    // Re-throw HttpsError as-is
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      'internal',
      error.message
    );
  }
});

// MARKETPLACE API FUNCTIONS

const marketplaceAPI = functions.https.onCall(async (data, context) => {
  // SECURITY CHECK: Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to use this API'
    );
  }

  const { action, positionId, availabilityId, positionData, availabilityData, professionalProfileId } = data;
  const userId = context.auth.uid;

  try {
    switch (action) {
      case 'listPositions': {
        const { filters = {}, limit: queryLimit = 50 } = data;

        let positionsQuery = admin.firestore()
          .collection('positions')
          .where('status', '==', 'open')
          .orderBy('created', 'desc')
          .limit(queryLimit);

        if (filters.facilityProfileId) {
          positionsQuery = positionsQuery.where('facilityProfileId', '==', filters.facilityProfileId);
        }

        if (filters.jobType) {
          positionsQuery = positionsQuery.where('jobType', '==', filters.jobType);
        }

        const snapshot = await positionsQuery.get();
        const positions = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          positions.push({
            id: doc.id,
            ...data,
            createdAt: data.created?.toDate() || null,
            startTime: data.startTime?.toDate() || null,
            endTime: data.endTime?.toDate() || null
          });
        });

        return { success: true, positions };
      }

      case 'listAvailabilities': {
        const { filters = {}, limit: queryLimit = 50 } = data;

        let availabilitiesQuery = admin.firestore()
          .collection('professionalAvailabilities')
          .where('status', '==', 'available')
          .orderBy('startTime', 'desc')
          .limit(queryLimit);

        if (filters.professionalProfileId) {
          availabilitiesQuery = availabilitiesQuery.where('professionalProfileId', '==', filters.professionalProfileId);
        }

        const snapshot = await availabilitiesQuery.get();
        const availabilities = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          availabilities.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || null,
            startTime: data.startTime?.toDate() || null,
            endTime: data.endTime?.toDate() || null
          });
        });

        return { success: true, availabilities };
      }

      case 'getPosition': {
        if (!positionId) {
          throw new functions.https.HttpsError('invalid-argument', 'Position ID is required');
        }

        const positionDoc = await admin.firestore().collection('positions').doc(positionId).get();
        if (!positionDoc.exists) {
          throw new functions.https.HttpsError('not-found', 'Position not found');
        }

        const position = positionDoc.data();

        // Get applications if user is facility admin
        let applications = [];
        if (position.facilityProfileId) {
          const facilityDoc = await admin.firestore().collection('facilityProfiles').doc(position.facilityProfileId).get();
          if (facilityDoc.exists) {
            const facilityData = facilityDoc.data();
            if (facilityData.admin && facilityData.admin.includes(userId)) {
              const applicationsSnapshot = await admin.firestore()
                .collection('positions')
                .doc(positionId)
                .collection('applications')
                .get();

              applications = applicationsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                applicationTime: doc.data().applicationTime?.toDate() || null
              }));
            }
          }
        }

        return {
          success: true,
          position: {
            id: positionDoc.id,
            ...position,
            createdAt: position.created?.toDate() || null,
            startTime: position.startTime?.toDate() || null,
            endTime: position.endTime?.toDate() || null,
            applications
          }
        };
      }

      case 'createPosition': {
        const { facilityProfileId, jobTitle, jobType, startTime, endTime, location, description, compensation } = positionData || {};

        if (!facilityProfileId || !jobTitle || !startTime || !endTime) {
          throw new functions.https.HttpsError('invalid-argument', 'Facility profile ID, job title, start time, and end time are required');
        }

        // SECURITY CHECK: Verify user is admin of the facility
        const facilityDoc = await admin.firestore().collection('facilityProfiles').doc(facilityProfileId).get();
        if (!facilityDoc.exists) {
          throw new functions.https.HttpsError('not-found', 'Facility not found');
        }

        const facilityData = facilityDoc.data();
        if (!facilityData.admin || !facilityData.admin.includes(userId)) {
          throw new functions.https.HttpsError('permission-denied', 'Only facility admins can create positions');
        }

        const startDate = new Date(startTime);
        const endDate = new Date(endTime);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          throw new functions.https.HttpsError('invalid-argument', 'Invalid date format');
        }

        if (startDate >= endDate) {
          throw new functions.https.HttpsError('invalid-argument', 'End time must be after start time');
        }

        const positionDataToSave = {
          facilityProfileId,
          postedByUserId: userId,
          status: 'open',
          jobTitle,
          jobType: jobType || 'general',
          startTime: admin.firestore.Timestamp.fromDate(startDate),
          endTime: admin.firestore.Timestamp.fromDate(endDate),
          location: location || {},
          description: description || '',
          compensation: compensation || {},
          created: admin.firestore.FieldValue.serverTimestamp(),
          updated: admin.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await admin.firestore().collection('positions').add(positionDataToSave);

        return { success: true, positionId: docRef.id };
      }

      case 'applyToPosition': {
        if (!positionId) {
          throw new functions.https.HttpsError('invalid-argument', 'Position ID is required');
        }

        let profileId = professionalProfileId || userId;

        // Verify position exists
        const positionDoc = await admin.firestore().collection('positions').doc(positionId).get();
        if (!positionDoc.exists) {
          throw new functions.https.HttpsError('not-found', 'Position not found');
        }

        const position = positionDoc.data();
        if (position.status !== 'open') {
          throw new functions.https.HttpsError('failed-precondition', 'Position is no longer open');
        }

        // Check if already applied
        const existingApplication = await admin.firestore()
          .collection('positions')
          .doc(positionId)
          .collection('applications')
          .doc(profileId)
          .get();

        if (existingApplication.exists) {
          throw new functions.https.HttpsError('already-exists', 'You have already applied to this position');
        }

        // Create application
        const applicationData = {
          professionalProfileId: profileId,
          userId: userId,
          applicationTime: admin.firestore.FieldValue.serverTimestamp(),
          status: 'submitted'
        };

        await admin.firestore()
          .collection('positions')
          .doc(positionId)
          .collection('applications')
          .doc(profileId)
          .set(applicationData);

        return { success: true, applicationId: profileId };
      }

      case 'createAvailability': {
        const { startTime, endTime, jobTypes, locationPreference, hourlyRate, notes } = availabilityData || {};

        if (!startTime || !endTime) {
          throw new functions.https.HttpsError('invalid-argument', 'Start time and end time are required');
        }

        let profileId = professionalProfileId || userId;

        // SECURITY CHECK: Ensure user can only create availability for their own profile
        if (profileId !== userId) {
          throw new functions.https.HttpsError('permission-denied', 'You can only create availability for your own profile');
        }

        const startDate = new Date(startTime);
        const endDate = new Date(endTime);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          throw new functions.https.HttpsError('invalid-argument', 'Invalid date format');
        }

        if (startDate >= endDate) {
          throw new functions.https.HttpsError('invalid-argument', 'End time must be after start time');
        }

        const availabilityDataToSave = {
          professionalProfileId: profileId,
          userId: userId,
          startTime: admin.firestore.Timestamp.fromDate(startDate),
          endTime: admin.firestore.Timestamp.fromDate(endDate),
          status: 'available',
          jobTypes: jobTypes || [],
          locationPreference: locationPreference || {},
          hourlyRate: hourlyRate || {},
          notes: notes || '',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await admin.firestore().collection('professionalAvailabilities').add(availabilityDataToSave);

        return { success: true, availabilityId: docRef.id };
      }

      default:
        throw new functions.https.HttpsError('invalid-argument', 'Invalid action requested');
    }
  } catch (error) {
    console.error('Error in marketplace API:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', error.message);
  }
});

module.exports = {
  contractAPI,
  messagesAPI,
  marketplaceAPI,
  ...notificationsFunctions
}; 