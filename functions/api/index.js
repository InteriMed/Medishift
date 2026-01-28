const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const notificationsFunctions = require('./notifications');
const bagAdminFunctions = require('./BAG_Admin');
const { FUNCTION_CONFIG } = require('../../../Medishift/functions/config/keysDatabasections/config/keysDatabase');

// HTTP endpoint for contract operations (for integration with external systems)
const contractAPI = onCall(FUNCTION_CONFIG, async (request) => {
  // Ensure user is authenticated
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'You must be logged in to use this API'
    );
  }

  const { action, contractId, contractData } = request.data;


  try {
    switch (action) {
      case 'get': {
        // Get a specific contract
        if (!contractId) {
          throw new HttpsError(
            'invalid-argument',
            'Contract ID is required'
          );
        }

        const contractDoc = await admin.firestore()
          .collection('contracts')
          .doc(contractId)
          .get();

        if (!contractDoc.exists) {
          throw new HttpsError(
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
          throw new HttpsError(
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
          throw new HttpsError(
            'invalid-argument',
            'Contract data is required'
          );
        }

        const userId = context.auth.uid;

        // SECURITY CHECK: Ensure user is part of the contract
        const professionalId = contractData.parties?.professional?.profileId;
        const employerId = contractData.parties?.employer?.profileId;

        if (professionalId !== userId && employerId !== userId) {
          throw new HttpsError(
            'permission-denied',
            'You must be either the professional or employer in the contract'
          );
        }

        // PHASE 1: Contracts created from conversations start in 'draft' status
        // When both parties agree, status changes to 'awaiting_dual_approval' for parallel approvals
        const initialStatus = contractData.statusLifecycle?.currentStatus || 'draft';

        // Prepare contract data with metadata
        const newContract = {
          ...contractData,
          createdBy: userId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          statusLifecycle: {
            currentStatus: initialStatus,
            validation: {
              professionalApproved: false,
              facilityApproved: false,
              professionalApprovedAt: null,
              facilityApprovedAt: null
            },
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
          throw new HttpsError(
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
          throw new HttpsError(
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
          throw new HttpsError(
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

        // PHASE 1: Handle parallel approval flow
        if (contractData.statusLifecycle?.currentStatus === 'awaiting_dual_approval') {
          // Update validation flags based on who is approving
          const validation = contract.statusLifecycle?.validation || {};

          if (isProfessional) {
            validation.professionalApproved = true;
            validation.professionalApprovedAt = admin.firestore.FieldValue.serverTimestamp();
          } else if (isEmployer) {
            validation.facilityApproved = true;
            validation.facilityApprovedAt = admin.firestore.FieldValue.serverTimestamp();
          }

          updateData['statusLifecycle.validation'] = validation;

          // Check if both parties have approved
          if (validation.professionalApproved && validation.facilityApproved) {
            updateData['statusLifecycle.currentStatus'] = 'active';
            updateData['statusLifecycle.timestamps.activatedAt'] = admin.firestore.FieldValue.serverTimestamp();
          }
        } else if (contractData.statusLifecycle?.currentStatus) {
          // Handle other status changes
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

      case 'approveContract': {
        // PHASE 1: Parallel approval endpoint with auto-approval support
        if (!contractId) {
          throw new HttpsError(
            'invalid-argument',
            'Contract ID is required'
          );
        }

        const userId = context.auth.uid;

        // Get contract
        const contractDoc = await admin.firestore()
          .collection('contracts')
          .doc(contractId)
          .get();

        if (!contractDoc.exists) {
          throw new HttpsError('not-found', 'Contract not found');
        }

        const contract = contractDoc.data();
        const currentStatus = contract.statusLifecycle?.currentStatus || contract.status || 'draft';

        // Verify contract is in awaiting_dual_approval status
        if (currentStatus !== 'awaiting_dual_approval') {
          throw new HttpsError(
            'failed-precondition',
            `Contract is not awaiting approval. Current status: ${currentStatus}`
          );
        }

        // Determine which party is approving
        const isProfessional = contract.parties?.professional?.profileId === userId;
        const isEmployer = contract.parties?.employer?.profileId === userId;

        if (!isProfessional && !isEmployer) {
          throw new HttpsError(
            'permission-denied',
            'You must be either the professional or employer to approve this contract'
          );
        }

        // Get current validation state
        const validation = contract.statusLifecycle?.validation || {
          professionalApproved: false,
          facilityApproved: false,
          professionalApprovedAt: null,
          facilityApprovedAt: null
        };

        // Update approval flag
        if (isProfessional) {
          if (validation.professionalApproved) {
            throw new HttpsError(
              'failed-precondition',
              'You have already approved this contract'
            );
          }
          validation.professionalApproved = true;
          validation.professionalApprovedAt = admin.firestore.FieldValue.serverTimestamp();
        } else if (isEmployer) {
          if (validation.facilityApproved) {
            throw new HttpsError(
              'failed-precondition',
              'You have already approved this contract'
            );
          }
          validation.facilityApproved = true;
          validation.facilityApprovedAt = admin.firestore.FieldValue.serverTimestamp();
        }

        // Prepare update
        const updateData = {
          'statusLifecycle.validation': validation,
          'statusLifecycle.timestamps.updatedAt': admin.firestore.FieldValue.serverTimestamp(),
          updatedBy: userId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // Check if both parties have approved - activate contract
        if (validation.professionalApproved && validation.facilityApproved) {
          updateData['statusLifecycle.currentStatus'] = 'active';
          updateData['statusLifecycle.timestamps.activatedAt'] = admin.firestore.FieldValue.serverTimestamp();
        }

        // Update contract
        await admin.firestore()
          .collection('contracts')
          .doc(contractId)
          .update(updateData);

        return {
          success: true,
          message: validation.professionalApproved && validation.facilityApproved
            ? 'Contract approved by both parties and activated'
            : 'Your approval has been recorded. Waiting for the other party.'
        };
      }

      default:
        throw new HttpsError(
          'invalid-argument',
          'Invalid action requested'
        );
    }
  } catch (error) {
    console.error('Error in contract API:', error);
    throw new HttpsError(
      'internal',
      error.message
    );
  }
});

// MESSAGE API FUNCTIONS

const messagesAPI = onCall(FUNCTION_CONFIG, async (request) => {
  // SECURITY CHECK: Verify user is authenticated
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'You must be logged in to use this API'
    );
  }

  const { action, conversationId, messageData, conversationData } = request.data;
  const userId = request.auth.uid;

  try {
    switch (action) {
      case 'getConversations': {
        const { context: messageContext = 'personal', facilityId = null } = request.data;

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
            throw new HttpsError(
              'not-found',
              'Facility not found'
            );
          }

          const facilityData = facilityDoc.data();
          if (!facilityData.admin || !facilityData.admin.includes(userId)) {
            throw new HttpsError(
              'permission-denied',
              'You do not have permission to view this facility\'s conversations'
            );
          }

          conversationsQuery = conversationsRef
            .where('facilityProfileId', '==', facilityId)
            .orderBy('lastMessageTimestamp', 'desc');
        } else {
          throw new HttpsError(
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
          throw new HttpsError(
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
          throw new HttpsError(
            'not-found',
            'Conversation not found'
          );
        }

        const conversationData = conversationDoc.data();
        const isParticipant = conversationData.participantIds?.includes(userId) ||
          conversationData.participants?.includes(userId);

        if (!isParticipant) {
          throw new HttpsError(
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
          throw new HttpsError(
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
          throw new HttpsError(
            'not-found',
            'Conversation not found'
          );
        }

        const conversationData = conversationDoc.data();
        const isParticipant = conversationData.participantIds?.includes(userId) ||
          conversationData.participants?.includes(userId);

        if (!isParticipant) {
          throw new HttpsError(
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
        // PHASE 1: Manual conversation creation is disabled
        // Conversations are automatically created when position status changes to 'interview'
        // EXCEPTION: Internal team chats for facility admins
        const { conversationType, facilityId, participants } = conversationData || {};

        if (conversationType === 'internal_team' && facilityId) {
           // SECURITY CHECK: Verify user is an admin of the facility
           const facilityDoc = await admin.firestore().collection('facilityProfiles').doc(facilityId).get();

           if (!facilityDoc.exists) {
             throw new HttpsError('not-found', 'Facility not found');
           }

           const facilityData = facilityDoc.data();
           if (!facilityData.admin || !facilityData.admin.includes(userId)) {
             throw new HttpsError(
               'permission-denied',
               'You do not have permission to create detailed team chats for this facility'
             );
           }

           // Prepare participant list (all selected admins)
           const participantIds = [userId, ...(participants || [])];
           const uniqueParticipantIds = [...new Set(participantIds)];

           // Get user info for all participants
           const participantInfo = [];
           for (const uid of uniqueParticipantIds) {
             const userDoc = await admin.firestore().collection('users').doc(uid).get();
             if (userDoc.exists) {
               const userData = userDoc.data();
               participantInfo.push({
                 userId: uid,
                 displayName: userData.displayName || userData.firstName + ' ' + userData.lastName || 'User',
                 photoURL: userData.photoURL || '',
                 roleInConversation: 'facility_admin'
               });
             }
           }

           const newConversationData = {
             participantIds: uniqueParticipantIds,
             participantInfo,
             facilityProfileId: facilityId,
             type: 'internal_team',
             lastMessage: {
               text: 'Team chat created',
               senderId: 'system',
               timestamp: admin.firestore.FieldValue.serverTimestamp()
             },
             lastMessageTimestamp: admin.firestore.FieldValue.serverTimestamp(),
             unreadCounts: uniqueParticipantIds.reduce((acc, id) => {
               acc[id] = 0;
               return acc;
             }, {}),
             isArchivedBy: [],
             typingIndicator: uniqueParticipantIds.reduce((acc, id) => {
               acc[id] = false;
               return acc;
             }, {}),
             createdAt: admin.firestore.FieldValue.serverTimestamp(),
             updatedAt: admin.firestore.FieldValue.serverTimestamp(),
             createdBy: userId
           };

           const conversationRef = await admin.firestore().collection('conversations').add(newConversationData);
           return {
             success: true,
             conversationId: conversationRef.id
           };
        }

        throw new HttpsError(
          'permission-denied',
          'Manual conversation creation is not allowed. Conversations are automatically created during the interview process.'
        );
      }

      case 'addParticipant': {
        const { participantId } = request.data;
        if (!conversationId || !participantId) {
          throw new HttpsError('invalid-argument', 'Conversation ID and Participant ID are required');
        }

        // SECURITY CHECK: Verify user is a participant
        const conversationRef = admin.firestore().collection('conversations').doc(conversationId);
        const conversationDoc = await conversationRef.get();

        if (!conversationDoc.exists) {
          throw new HttpsError('not-found', 'Conversation not found');
        }

        const conversationData = conversationDoc.data();
        const isParticipant = conversationData.participantIds?.includes(userId) ||
          conversationData.participants?.includes(userId);

        if (!isParticipant) {
          throw new HttpsError('permission-denied', 'You do not have permission to modify this conversation');
        }

        // Check if already a participant
        if (conversationData.participantIds?.includes(participantId)) {
          return { success: true, message: 'User is already a participant' };
        }

        // Get new participant info
        const userDoc = await admin.firestore().collection('users').doc(participantId).get();
        if (!userDoc.exists) {
           throw new HttpsError('not-found', 'User not found');
        }
        const userData = userDoc.data();
        const newParticipantInfo = {
           userId: participantId,
           displayName: userData.displayName || userData.firstName + ' ' + userData.lastName || 'User',
           photoURL: userData.photoURL || '',
           roleInConversation: 'facility_admin' // Presumed role for added participants
        };

        // Update conversation
        await conversationRef.update({
           participantIds: admin.firestore.FieldValue.arrayUnion(participantId),
           participantInfo: admin.firestore.FieldValue.arrayUnion(newParticipantInfo),
           [`unreadCounts.${participantId}`]: 0,
           [`typingIndicator.${participantId}`]: false,
           updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Add system message
        await conversationRef.collection('messages').add({
           senderId: 'system',
           text: `${userData.displayName || 'A new user'} was added to the conversation.`,
           timestamp: admin.firestore.FieldValue.serverTimestamp(),
           status: 'sent'
        });

        return { success: true };
      }

      case 'markAsRead': {
        if (!conversationId) {
          throw new HttpsError(
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
          throw new HttpsError(
            'not-found',
            'Conversation not found'
          );
        }

        const conversationData = conversationDoc.data();
        const isParticipant = conversationData.participantIds?.includes(userId) ||
          conversationData.participants?.includes(userId);

        if (!isParticipant) {
          throw new HttpsError(
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
        throw new HttpsError(
          'invalid-argument',
          'Invalid action requested'
        );
    }
  } catch (error) {
    console.error('Error in messages API:', error);

    // Re-throw HttpsError as-is
    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError(
      'internal',
      error.message
    );
  }
});

// MARKETPLACE API FUNCTIONS

const marketplaceAPI = onCall(FUNCTION_CONFIG, async (request) => {
  // SECURITY CHECK: Verify user is authenticated
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'You must be logged in to use this API'
    );
  }

  const { action, positionId, availabilityId, positionData, availabilityData, professionalProfileId } = request.data;
  const userId = request.auth.uid;

  try {
    switch (action) {
      case 'listPositions': {
        const { filters = {}, limit: queryLimit = 50 } = request.data;

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
        const { filters = {}, limit: queryLimit = 50 } = request.data;

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
          throw new HttpsError('invalid-argument', 'Position ID is required');
        }

        const positionDoc = await admin.firestore().collection('positions').doc(positionId).get();
        if (!positionDoc.exists) {
          throw new HttpsError('not-found', 'Position not found');
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
          throw new HttpsError('invalid-argument', 'Facility profile ID, job title, start time, and end time are required');
        }

        // SECURITY CHECK: Verify user is admin of the facility
        const facilityDoc = await admin.firestore().collection('facilityProfiles').doc(facilityProfileId).get();
        if (!facilityDoc.exists) {
          throw new HttpsError('not-found', 'Facility not found');
        }

        const facilityData = facilityDoc.data();
        if (!facilityData.admin || !facilityData.admin.includes(userId)) {
          throw new HttpsError('permission-denied', 'Only facility admins can create positions');
        }

        const startDate = new Date(startTime);
        const endDate = new Date(endTime);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          throw new HttpsError('invalid-argument', 'Invalid date format');
        }

        if (startDate >= endDate) {
          throw new HttpsError('invalid-argument', 'End time must be after start time');
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
          throw new HttpsError('invalid-argument', 'Position ID is required');
        }

        let profileId = professionalProfileId || userId;

        // Verify position exists
        const positionDoc = await admin.firestore().collection('positions').doc(positionId).get();
        if (!positionDoc.exists) {
          throw new HttpsError('not-found', 'Position not found');
        }

        const position = positionDoc.data();
        if (position.status !== 'open') {
          throw new HttpsError('failed-precondition', 'Position is no longer open');
        }

        // Check if already applied
        const existingApplication = await admin.firestore()
          .collection('positions')
          .doc(positionId)
          .collection('applications')
          .doc(profileId)
          .get();

        if (existingApplication.exists) {
          throw new HttpsError('already-exists', 'You have already applied to this position');
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

      case 'selectApplicant': {
        const { positionId, professionalProfileId } = request.data;

        if (!positionId || !professionalProfileId) {
          throw new HttpsError(
            'invalid-argument',
            'Position ID and professional profile ID are required'
          );
        }

        // Verify position exists and user has permission
        const positionDoc = await admin.firestore().collection('positions').doc(positionId).get();
        if (!positionDoc.exists) {
          throw new HttpsError('not-found', 'Position not found');
        }

        const position = positionDoc.data();

        // SECURITY CHECK: Verify user is facility admin
        const facilityDoc = await admin.firestore()
          .collection('facilityProfiles')
          .doc(position.facilityProfileId)
          .get();

        if (!facilityDoc.exists) {
          throw new HttpsError('not-found', 'Facility not found');
        }

        const facilityData = facilityDoc.data();
        if (!facilityData.admin || !facilityData.admin.includes(userId)) {
          throw new HttpsError(
            'permission-denied',
            'Only facility admins can select applicants'
          );
        }

        // Verify position is still open
        if (position.status !== 'open') {
          throw new HttpsError(
            'failed-precondition',
            `Position is no longer open. Current status: ${position.status}`
          );
        }

        // Verify application exists
        const applicationDoc = await admin.firestore()
          .collection('positions')
          .doc(positionId)
          .collection('applications')
          .doc(professionalProfileId)
          .get();

        if (!applicationDoc.exists) {
          throw new HttpsError('not-found', 'Application not found');
        }

        const application = applicationDoc.data();
        if (application.status !== 'submitted') {
          throw new HttpsError(
            'failed-precondition',
            `Application status is ${application.status}, expected 'submitted'`
          );
        }

        // Update application status to accepted_for_contract
        await admin.firestore()
          .collection('positions')
          .doc(positionId)
          .collection('applications')
          .doc(professionalProfileId)
          .update({
            status: 'accepted_for_contract',
            selectedAt: admin.firestore.FieldValue.serverTimestamp(),
            selectedByUserId: userId
          });

        // Update position status to 'interview' - this will trigger conversation creation
        await admin.firestore()
          .collection('positions')
          .doc(positionId)
          .update({
            status: 'interview',
            selectedApplicantProfileId: professionalProfileId,
            updated: admin.firestore.FieldValue.serverTimestamp()
          });

        return {
          success: true,
          message: 'Applicant selected. Interview process started and conversation created automatically.'
        };
      }

      case 'createAvailability': {
        const { startTime, endTime, jobTypes, locationPreference, hourlyRate, notes } = availabilityData || {};

        if (!startTime || !endTime) {
          throw new HttpsError('invalid-argument', 'Start time and end time are required');
        }

        let profileId = professionalProfileId || userId;

        // SECURITY CHECK: Ensure user can only create availability for their own profile
        if (profileId !== userId) {
          throw new HttpsError('permission-denied', 'You can only create availability for your own profile');
        }

        const startDate = new Date(startTime);
        const endDate = new Date(endTime);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          throw new HttpsError('invalid-argument', 'Invalid date format');
        }

        if (startDate >= endDate) {
          throw new HttpsError('invalid-argument', 'End time must be after start time');
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
        throw new HttpsError('invalid-argument', 'Invalid action requested');
    }
  } catch (error) {
    console.error('Error in marketplace API:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', error.message);
  }
});

module.exports = {
  contractAPI,
  messagesAPI,
  marketplaceAPI,
  ...bagAdminFunctions,
  ...notificationsFunctions
}; 