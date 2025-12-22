const functions = require('firebase-functions/v1');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');

// Firebase Admin is already initialized in the main index.js
// Reference to Firestore database
const db = admin.firestore();

/**
 * Creates a user profile document when a new user is created
 */
exports.createUserProfile = functions.auth.user().onCreate(async (user) => {
  try {
    // Create a default profile for new users
    const userProfile = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      role: 'user', // Default role
      isVerified: false,
      metadata: {
        lastLogin: admin.firestore.FieldValue.serverTimestamp(),
        registrationMethod: user.providerData.length > 0
          ? user.providerData[0].providerId
          : 'email'
      }
    };

    // Write to the users collection
    await db.collection('users').doc(user.uid).set(userProfile);

    functions.logger.info(`User profile created for ${user.uid}`, { structuredData: true });

    return null;
  } catch (error) {
    functions.logger.error('Error creating user profile', error);
    return null;
  }
});

// updateUserLastLogin functionality should be implemented client-side
// or via a blocking function (beforeSignIn) if needed.


/**
 * Cleans up user data when a user is deleted
 */
exports.cleanupDeletedUser = functions.auth.user().onDelete(async (user) => {
  try {
    // Delete the user's profile document
    await db.collection('users').doc(user.uid).delete();

    // Delete other user-related documents like settings, preferences, etc.
    const userSettingsDoc = db.collection('userSettings').doc(user.uid);
    const settingsExists = await userSettingsDoc.get().then(doc => doc.exists);
    if (settingsExists) {
      await userSettingsDoc.delete();
    }

    functions.logger.info(`Cleaned up data for deleted user ${user.uid}`, { structuredData: true });

    return null;
  } catch (error) {
    functions.logger.error('Error cleaning up deleted user data', error);
    return null;
  }
});

/**
 * API endpoint to fetch user profile data
 * Fetches both user collection and role-specific profile collection
 */
const { onCall: onCallV2, HttpsError } = require('firebase-functions/v2/https');

exports.getUserProfile = onCallV2(
  {
    cors: true,
    maxInstances: 10
  },
  async (request) => {
    // SECURITY CHECK: Verify user is authenticated
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'You must be logged in to view profile data'
      );
    }

  try {
    const userId = request.auth.uid;

    // Get the user's profile document
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      throw new HttpsError(
        'not-found',
        'User profile not found'
      );
    }

    const userData = userDoc.data();

    // Determine role and fetch role-specific profile
    const role = userData.role || 'professional';
    const profileCollection = role === 'facility' ? 'facilityProfiles' : 'professionalProfiles';
    const profileDoc = await db.collection(profileCollection).doc(userId).get();

    // Merge user data with role-specific profile data
    let profileData = { ...userData };
    if (profileDoc.exists) {
      profileData = { ...profileData, ...profileDoc.data() };
    }

    // Return the merged profile data
    return {
      success: true,
      data: profileData
    };
  } catch (error) {
    functions.logger.error('Error fetching user profile', error);

    // Re-throw HttpsError as-is
    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError(
      'internal',
      'Error fetching user profile data'
    );
  }
  }
);


/**
 * API endpoint to update user profile data
 * Handles both user collection and role-specific profile collections
 */
exports.updateUserProfile = onCallV2(
  {
    cors: true,
    maxInstances: 10
  },
  async (request) => {
    // SECURITY CHECK: Verify user is authenticated
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'You must be logged in to update profile data'
      );
    }

    try {
    // Validate input data
    const data = request.data;
    if (!data || typeof data !== 'object') {
      throw new HttpsError(
        'invalid-argument',
        'Profile data must be an object'
      );
    }

    const userId = request.auth.uid;

    // Define fields that belong to the users collection
    const USER_COLLECTION_FIELDS = [
      'uid', 'email', 'emailVerified', 'role', 'profileType',
      'firstName', 'lastName', 'displayName', 'photoURL',
      'createdAt', 'updatedAt'
    ];

    // Get current user data to determine role
    const currentUserDoc = await db.collection('users').doc(userId).get();
    const currentUserData = currentUserDoc.exists ? currentUserDoc.data() : {};
    const currentRole = data.role || currentUserData.role || 'professional';
    const currentProfileType = data.profileType || currentUserData.profileType || 'doctor';

    // Separate user fields from profile fields
    const userFieldsToUpdate = {};
    const profileFieldsToUpdate = {};

    for (const [key, value] of Object.entries(data)) {
      if (USER_COLLECTION_FIELDS.includes(key)) {
        userFieldsToUpdate[key] = value;
      } else {
        profileFieldsToUpdate[key] = value;
      }
    }

    // Ensure role and profileType are in user fields
    userFieldsToUpdate.role = currentRole;
    userFieldsToUpdate.profileType = currentProfileType;
    userFieldsToUpdate.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    // Update user document
    if (Object.keys(userFieldsToUpdate).length > 0) {
      if (currentUserDoc.exists) {
        await db.collection('users').doc(userId).update(userFieldsToUpdate);
      } else {
        // Create user document if it doesn't exist
        userFieldsToUpdate.uid = userId;
        userFieldsToUpdate.createdAt = admin.firestore.FieldValue.serverTimestamp();
        await db.collection('users').doc(userId).set(userFieldsToUpdate);
      }
    }

    // Update role-specific profile document
    if (Object.keys(profileFieldsToUpdate).length > 0) {
      const profileCollection = currentRole === 'facility' ? 'facilityProfiles' : 'professionalProfiles';
      profileFieldsToUpdate.updatedAt = admin.firestore.FieldValue.serverTimestamp();

      const profileDocRef = db.collection(profileCollection).doc(userId);
      const profileDoc = await profileDocRef.get();

      if (!profileDoc.exists) {
        // Create profile document if it doesn't exist
        profileFieldsToUpdate.userId = userId;
        profileFieldsToUpdate.createdAt = admin.firestore.FieldValue.serverTimestamp();
        await profileDocRef.set(profileFieldsToUpdate);
      } else {
        // Update existing profile document
        await profileDocRef.update(profileFieldsToUpdate);
      }
    }

    // Return success response
    return {
      success: true,
      message: 'Profile updated successfully'
    };
  } catch (error) {
    functions.logger.error('Error updating user profile', error);

    throw new HttpsError(
      'internal',
      'Error updating user profile data'
    );
  }
  }
);


// Handle contract creation and notifications
const onContractCreate = onDocumentCreated('contracts/{contractId}', async (event) => {
  const contract = event.data.data();
  const contractId = event.params.contractId;

  try {
    // Determine recipient based on who created the contract
    const recipientId = contract.createdByType === 'worker'
      ? contract.companyId
      : contract.workerId;

    // Create notification in the recipient's collection
    await admin.firestore().collection('notifications').add({
      userId: recipientId,
      type: 'contract_created',
      title: 'New Contract Proposal',
      message: `You have received a new contract: ${contract.title}`,
      contractId,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`Notification created for contract ${contractId}`);
    return { success: true };
  } catch (error) {
    console.error('Error processing contract creation:', error);
    return { success: false, error: error.message };
  }
});

// Handle position status updates - CRITICAL: Auto-create conversation when status changes to 'interview'
const onPositionUpdate = onDocumentUpdated('positions/{positionId}', async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  const positionId = event.params.positionId;

  // Only proceed if status changed to 'interview'
  if (before.status === after.status || after.status !== 'interview') {
    return null;
  }

  try {
    // Get position data
    const position = after;

    // Get the selected application (status should be 'accepted_for_contract' or similar)
    // We need to find which application was selected
    const applicationsSnapshot = await db.collection('positions')
      .doc(positionId)
      .collection('applications')
      .where('status', '==', 'accepted_for_contract')
      .limit(1)
      .get();

    if (applicationsSnapshot.empty) {
      console.warn(`No accepted application found for position ${positionId} in interview status`);
      return null;
    }

    const selectedApplication = applicationsSnapshot.docs[0].data();
    const professionalProfileId = selectedApplication.professionalProfileId;
    const professionalUserId = selectedApplication.userId;

    // Get facility admin user ID (use postedByUserId or first admin from facility)
    const facilityDoc = await db.collection('facilityProfiles').doc(position.facilityProfileId).get();
    if (!facilityDoc.exists) {
      console.error(`Facility ${position.facilityProfileId} not found`);
      return null;
    }

    const facilityData = facilityDoc.data();
    const facilityAdminId = position.postedByUserId || (facilityData.admin && facilityData.admin[0]);

    if (!facilityAdminId || !professionalUserId) {
      console.error(`Missing participant IDs: facilityAdminId=${facilityAdminId}, professionalUserId=${professionalUserId}`);
      return null;
    }

    // Get participant info for conversation
    const professionalUserDoc = await db.collection('users').doc(professionalUserId).get();
    const professionalUserData = professionalUserDoc.exists ? professionalUserDoc.data() : {};

    const facilityUserDoc = await db.collection('users').doc(facilityAdminId).get();
    const facilityUserData = facilityUserDoc.exists ? facilityUserDoc.data() : {};

    // Create conversation automatically
    const conversationData = {
      participantIds: [professionalUserId, facilityAdminId],
      participantInfo: [
        {
          userId: professionalUserId,
          displayName: professionalUserData.displayName || professionalUserData.firstName + ' ' + professionalUserData.lastName || 'Professional',
          photoURL: professionalUserData.photoURL || '',
          roleInConversation: 'professional'
        },
        {
          userId: facilityAdminId,
          displayName: facilityUserData.displayName || facilityData.facilityName || 'Facility Representative',
          photoURL: facilityUserData.photoURL || '',
          roleInConversation: 'facility_representative'
        }
      ],
      positionId: positionId,
      facilityProfileId: position.facilityProfileId,
      professionalProfileId: professionalProfileId,
      contractId: null,
      lastMessage: {
        text: `Interview process started for position: ${position.jobTitle || 'Position'}`,
        senderId: 'system',
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      },
      lastMessageTimestamp: admin.firestore.FieldValue.serverTimestamp(),
      unreadCounts: {
        [professionalUserId]: 1,
        [facilityAdminId]: 0
      },
      isArchivedBy: [],
      typingIndicator: {
        [professionalUserId]: false,
        [facilityAdminId]: false
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const conversationRef = await db.collection('conversations').add(conversationData);

    // Create initial system message
    await conversationRef.collection('messages').add({
      senderId: 'system',
      text: `Interview process started for position: ${position.jobTitle || 'Position'}. You can now communicate about this opportunity.`,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      status: 'sent'
    });

    // Create notifications
    await Promise.all([
      db.collection('notifications').add({
        userId: professionalUserId,
        type: 'position_interview',
        title: 'Interview Started',
        message: `You have been selected for an interview: ${position.jobTitle || 'Position'}`,
        positionId: positionId,
        conversationId: conversationRef.id,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }),
      db.collection('notifications').add({
        userId: facilityAdminId,
        type: 'position_interview',
        title: 'Interview Started',
        message: `Interview started for position: ${position.jobTitle || 'Position'}`,
        positionId: positionId,
        conversationId: conversationRef.id,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      })
    ]);

    console.log(`Conversation ${conversationRef.id} created automatically for position ${positionId} interview`);
    return { success: true, conversationId: conversationRef.id };
  } catch (error) {
    console.error(`Error processing position interview status for ${positionId}:`, error);
    return { success: false, error: error.message };
  }
});

// Handle contract status updates
const onContractUpdate = onDocumentUpdated('contracts/{contractId}', async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  const contractId = event.params.contractId;

  const beforeStatus = before.statusLifecycle?.currentStatus || before.status;
  const afterStatus = after.statusLifecycle?.currentStatus || after.status;

  // Only proceed if status has changed
  if (beforeStatus === afterStatus) {
    return null;
  }

  try {
    // PHASE 1 ENHANCEMENT: Auto-approval when contract transitions to awaiting_dual_approval
    if (afterStatus === 'awaiting_dual_approval' && beforeStatus !== 'awaiting_dual_approval') {
      const professionalProfileId = after.parties?.professional?.profileId;
      const facilityProfileId = after.parties?.employer?.profileId;
      const contractStartDate = after.terms?.startDate || after.startDate;

      if (professionalProfileId && facilityProfileId && contractStartDate) {
        const startDate = contractStartDate.toDate ? contractStartDate.toDate() : new Date(contractStartDate);
        const now = new Date();
        const hoursUntilStart = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        // Get professional auto-approval settings
        const professionalProfile = await db.collection('professionalProfiles').doc(professionalProfileId).get();
        const professionalSettings = professionalProfile.exists
          ? professionalProfile.data()?.platformSettings?.contractAutoApproval || {}
          : {};

        // Get facility auto-approval settings
        const facilityProfile = await db.collection('facilityProfiles').doc(facilityProfileId).get();
        const facilitySettings = facilityProfile.exists
          ? facilityProfile.data()?.operationalSettings?.contractAutoApproval || {}
          : {};

        const validation = after.statusLifecycle?.validation || {
          professionalApproved: false,
          facilityApproved: false,
          professionalApprovedAt: null,
          facilityApprovedAt: null
        };

        let shouldAutoApprove = false;
        const updateData = {};

        // Check professional auto-approval
        if (professionalSettings.enabled && !validation.professionalApproved) {
          const minHours = professionalSettings.minimumHoursInAdvance || 24;
          if (hoursUntilStart >= minHours) {
            validation.professionalApproved = true;
            validation.professionalApprovedAt = admin.firestore.FieldValue.serverTimestamp();
            shouldAutoApprove = true;
            console.log(`Auto-approved contract ${contractId} for professional (${hoursUntilStart.toFixed(1)}h in advance)`);
          }
        }

        // Check facility auto-approval
        if (facilitySettings.enabled && !validation.facilityApproved) {
          const minHours = facilitySettings.minimumHoursInAdvance || 24;
          if (hoursUntilStart >= minHours) {
            validation.facilityApproved = true;
            validation.facilityApprovedAt = admin.firestore.FieldValue.serverTimestamp();
            shouldAutoApprove = true;
            console.log(`Auto-approved contract ${contractId} for facility (${hoursUntilStart.toFixed(1)}h in advance)`);
          }
        }

        // If auto-approved, update contract
        if (shouldAutoApprove) {
          updateData['statusLifecycle.validation'] = validation;
          updateData['statusLifecycle.timestamps.updatedAt'] = admin.firestore.FieldValue.serverTimestamp();

          // If both approved, activate contract
          if (validation.professionalApproved && validation.facilityApproved) {
            updateData['statusLifecycle.currentStatus'] = 'active';
            updateData['statusLifecycle.timestamps.activatedAt'] = admin.firestore.FieldValue.serverTimestamp();
          }

          await db.collection('contracts').doc(contractId).update(updateData);

          // Create notifications for auto-approval
          const beforeValidation = before.statusLifecycle?.validation || {
            professionalApproved: false,
            facilityApproved: false
          };

          const notifications = [];
          if (validation.professionalApproved && !beforeValidation.professionalApproved) {
            const professionalUserId = professionalProfile.data()?.userId || professionalProfileId;
            notifications.push(
              db.collection('notifications').add({
                userId: professionalUserId,
                type: 'contract_auto_approved',
                title: 'Contract Auto-Approved',
                message: `Your contract has been automatically approved based on your settings (${hoursUntilStart.toFixed(1)}h before start)`,
                contractId,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
              })
            );
          }
          if (validation.facilityApproved && !beforeValidation.facilityApproved) {
            const facilityData = facilityProfile.data();
            const facilityAdminId = facilityData?.admin?.[0] || after.parties?.employer?.profileId;
            if (facilityAdminId) {
              notifications.push(
                db.collection('notifications').add({
                  userId: facilityAdminId,
                  type: 'contract_auto_approved',
                  title: 'Contract Auto-Approved',
                  message: `Contract has been automatically approved based on facility settings (${hoursUntilStart.toFixed(1)}h before start)`,
                  contractId,
                  read: false,
                  createdAt: admin.firestore.FieldValue.serverTimestamp()
                })
              );
            }
          }
          if (notifications.length > 0) {
            await Promise.all(notifications);
          }
        }
      }
    }
    // When contract becomes active, mark professional availability as booked
    if (afterStatus === 'active' && beforeStatus !== 'active') {
      const professionalProfileId = after.parties?.professional?.profileId || after.workerId;
      const contractStart = after.terms?.startDate || after.startDate;
      const contractEnd = after.terms?.endDate || after.endDate;
      const originAvailabilityId = after.originAvailabilityId;

      if (professionalProfileId && contractStart && contractEnd && originAvailabilityId) {
        // Update the availability status to 'booked'
        const availabilityRef = db.collection('availability').doc(originAvailabilityId);
        const availabilityDoc = await availabilityRef.get();

        if (availabilityDoc.exists) {
          await availabilityRef.update({
            status: 'booked',
            bookedByContractId: contractId,
            updated: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log(`Availability ${originAvailabilityId} marked as booked for contract ${contractId}`);
        }
      }
    }

    // Determine who should be notified
    const professionalId = after.parties?.professional?.profileId || after.workerId;
    const employerId = after.parties?.employer?.profileId || after.companyId;

    // Get status-specific message
    let message = '';
    switch (afterStatus) {
      case 'active':
        message = `Your contract "${after.terms?.jobTitle || after.title || 'Contract'}" is now active`;
        break;
      case 'completed':
        message = `Contract "${after.terms?.jobTitle || after.title || 'Contract'}" has been marked as completed`;
        break;
      case 'terminated':
        message = `Contract "${after.terms?.jobTitle || after.title || 'Contract'}" has been terminated`;
        break;
      default:
        message = `Contract "${after.terms?.jobTitle || after.title || 'Contract'}" status has been updated to ${afterStatus}`;
    }

    // Create notifications for both parties
    const notifications = [];
    if (professionalId) {
      notifications.push(
        db.collection('notifications').add({
          userId: professionalId,
          type: 'contract_updated',
          title: 'Contract Status Updated',
          message,
          contractId,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        })
      );
    }
    if (employerId) {
      notifications.push(
        db.collection('notifications').add({
          userId: employerId,
          type: 'contract_updated',
          title: 'Contract Status Updated',
          message,
          contractId,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        })
      );
    }

    await Promise.all(notifications);

    console.log(`Notification created for contract update ${contractId}`);
    return { success: true };
  } catch (error) {
    console.error('Error processing contract update:', error);
    return { success: false, error: error.message };
  }
});

module.exports = {
  createUserProfile: exports.createUserProfile,
  cleanupDeletedUser: exports.cleanupDeletedUser,
  getUserProfile: exports.getUserProfile,
  updateUserProfile: exports.updateUserProfile,
  onContractCreate,
  onContractUpdate,
  onPositionUpdate
}; 