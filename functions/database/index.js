const functions = require('firebase-functions/v1');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');

// Firebase Admin is already initialized in the main index.js
// Import centralized database instance configured for medishift
const db = require('./db');

/**
 * Creates a user profile document when a new user is created
 */
exports.createUserProfile = functions.region('europe-west6').auth.user().onCreate(async (user) => {
  try {
    const userProfile = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      roles: [],
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
exports.cleanupDeletedUser = functions.region('europe-west6').auth.user().onDelete(async (user) => {
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
    database: 'medishift',
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

      const professionalProfileDoc = await db.collection('professionalProfiles').doc(userId).get();
      const facilityProfileDoc = await db.collection('facilityProfiles').doc(userId).get();

      let profileData = { ...userData };
      if (professionalProfileDoc.exists()) {
        profileData = { ...profileData, ...professionalProfileDoc.data() };
      }
      if (facilityProfileDoc.exists()) {
        profileData = { ...profileData, ...facilityProfileDoc.data() };
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
    database: 'medishift',
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

    let currentStep = 'start';
    try {
      // Validate input data
      const rawData = request.data;
      if (!rawData || typeof rawData !== 'object') {
        throw new HttpsError(
          'invalid-argument',
          'Profile data must be an object'
        );
      }

      // Check Admin Initialization
      if (!admin.apps.length) {
        functions.logger.error('Firebase Admin not initialized properly!');
        throw new Error('Firebase Admin not initialized');
      }

      // Sanitize data to remove any potential undefined values that might cause generic 500 errors
      // formatting issues, or other serialization problems
      const data = JSON.parse(JSON.stringify(rawData));

      functions.logger.info(`updateUserProfile called by ${request.auth ? request.auth.uid : 'unauth'}`, {
        structuredData: true,
        dataKeys: Object.keys(data),
        adminOptions: admin.app().options, // Log the initialization options
        connectedDatabaseId: db.databaseId || 'unknown', // Check which DB we are using
        currentStep: currentStep
      });

      // DEBUG: Connectivity Check
      currentStep = 'connectivity_check';
      try {
        const collections = await db.listCollections();
        functions.logger.info(`Connected to DB. Collections: ${collections.map(c => c.id).join(', ')}`);
      } catch (dbError) {
        functions.logger.error('Database connectivity check failed', dbError);
        throw new Error(`Database unreachable: ${dbError.message}`);
      }

      const userId = request.auth.uid;

      const USER_COLLECTION_FIELDS = [
        'uid', 'email', 'emailVerified',
        'firstName', 'lastName', 'displayName', 'photoURL',
        'createdAt', 'updatedAt', 'roles'
      ];

      currentStep = 'fetch_user_doc';
      functions.logger.info(`Fetching current user doc for ${userId}`);
      const currentUserDoc = await db.collection('users').doc(userId).get();
      const currentUserData = currentUserDoc.exists ? currentUserDoc.data() : {};

      const userFieldsToUpdate = {};
      const profileFieldsToUpdate = {};

      for (const [key, value] of Object.entries(data)) {
        if (USER_COLLECTION_FIELDS.includes(key)) {
          userFieldsToUpdate[key] = value;
        } else {
          profileFieldsToUpdate[key] = value;
        }
      }

      userFieldsToUpdate.updatedAt = admin.firestore.FieldValue.serverTimestamp();

      // Update user document
      if (Object.keys(userFieldsToUpdate).length > 0) {
        try {
          if (currentUserDoc.exists) {
            currentStep = 'update_existing_user_doc';
            functions.logger.info(`Updating users document for ${userId}`, {
              fields: Object.keys(userFieldsToUpdate)
            });
            await db.collection('users').doc(userId).set(userFieldsToUpdate, { merge: true });
          } else {
            // Create user document if it doesn't exist
            userFieldsToUpdate.uid = userId;
            userFieldsToUpdate.createdAt = admin.firestore.FieldValue.serverTimestamp();
            currentStep = 'create_new_user_doc';
            functions.logger.info(`Creating users document for ${userId}`, {
              fields: Object.keys(userFieldsToUpdate)
            });
            await db.collection('users').doc(userId).set(userFieldsToUpdate, { merge: true });
          }
          functions.logger.info(`User document updated successfully`);
        } catch (userError) {
          functions.logger.error('Error updating users document', {
            error: userError.message,
            stack: userError.stack,
            userId,
            fields: Object.keys(userFieldsToUpdate)
          });
          throw new HttpsError(
            'internal',
            `Error updating user document: ${userError.message}`
          );
        }
      }

      if (Object.keys(profileFieldsToUpdate).length > 0) {
        const professionalProfileDoc = await db.collection('professionalProfiles').doc(userId).get();
        const facilityProfileDoc = await db.collection('facilityProfiles').doc(userId).get();

        let profileCollection;
        if (professionalProfileDoc.exists()) {
          profileCollection = 'professionalProfiles';
        } else if (facilityProfileDoc.exists()) {
          profileCollection = 'facilityProfiles';
        } else {
          const hasFacilityFields = profileFieldsToUpdate.facilityName || profileFieldsToUpdate.facilityDetails || profileFieldsToUpdate.employees;
          profileCollection = hasFacilityFields ? 'facilityProfiles' : 'professionalProfiles';
        }

        const profileDocRef = db.collection(profileCollection).doc(userId);
        const profileDoc = profileCollection === 'professionalProfiles' ? professionalProfileDoc : facilityProfileDoc;

        functions.logger.info(`Updating ${profileCollection} for user ${userId}`, {
          profileExists: profileDoc.exists,
          fieldsCount: Object.keys(profileFieldsToUpdate).length
        });

        if (!profileDoc.exists) {
          let isAdmin = false;
          try {
            const adminDoc = await db.collection('admins').doc(userId).get();
            if (adminDoc.exists && adminDoc.data().isActive !== false) {
              isAdmin = true;
            }
          } catch (adminCheckError) {
            functions.logger.debug('Admin check failed, continuing without admin status');
          }

          const hasOnboardingData = currentUserData.onboardingData || currentUserData.onboardingProgress;
          if (!hasOnboardingData && !isAdmin) {
            throw new HttpsError(
              'failed-precondition',
              'Profile can only be created after completing onboarding. Please complete the onboarding process first.'
            );
          }

          profileFieldsToUpdate.userId = userId;
          profileFieldsToUpdate.createdAt = admin.firestore.FieldValue.serverTimestamp();
          profileFieldsToUpdate.currentStepIndex = 0;
          profileFieldsToUpdate.tutorialAccessMode = 'loading';
          profileFieldsToUpdate.subscriptionTier = profileFieldsToUpdate.subscriptionTier || 'free';

          if (profileCollection === 'facilityProfiles') {
            profileFieldsToUpdate.employees = profileFieldsToUpdate.employees || [{
              user_uid: userId,
              roles: ['admin']
            }];
            if (!profileFieldsToUpdate.facilityProfileId) {
              profileFieldsToUpdate.facilityProfileId = userId;
            }

            const facilityName = profileFieldsToUpdate.facilityName || profileFieldsToUpdate.facilityDetails?.name || 'New Facility';
            const existingRoles = currentUserData.roles || [];
            const updatedRoles = existingRoles.filter(r => r.facility_uid !== userId);
            updatedRoles.push({
              facility_uid: userId,
              roles: ['admin']
            });

            try {
              currentStep = 'update_facility_roles';
              functions.logger.info('Updating facility roles for creator...');
              await db.collection('users').doc(userId).set({
                roles: updatedRoles,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              }, { merge: true });
            } catch (facilityError) {
              functions.logger.error('Error updating facility roles', {
                error: facilityError.message,
                stack: facilityError.stack,
                userId
              });
            }
          }

          functions.logger.info(`Creating new ${profileCollection} document for ${userId}`, {
            fieldCount: Object.keys(profileFieldsToUpdate).length,
            topFields: Object.keys(profileFieldsToUpdate).slice(0, 5)
          });

          try {
            currentStep = `create_new_profile_doc_${profileCollection}`;
            await profileDocRef.set(profileFieldsToUpdate);
            functions.logger.info(`Successfully created ${profileCollection} document for ${userId}`);

            // DELETE ONBOARDING DATA FROM USER COLLECTION AFTER PROFILE CREATION
            try {
              functions.logger.info(`Deleting onboarding data for user ${userId}`);
              await db.collection('users').doc(userId).update({
                onboardingData: admin.firestore.FieldValue.delete(),
                onboardingProgress: admin.firestore.FieldValue.delete()
              });
              functions.logger.info(`Successfully deleted onboarding data for user ${userId}`);
            } catch (deleteError) {
              functions.logger.error(`Error deleting onboarding data for user ${userId}`, deleteError);
              // We don't throw here as the profile was already created successfully
            }
          } catch (createError) {
            functions.logger.error(`Error creating ${profileCollection} document`, {
              error: createError.message,
              stack: createError.stack,
              code: createError.code,
              userId,
              fieldCount: Object.keys(profileFieldsToUpdate).length
            });
            throw new HttpsError(
              'internal',
              `Error creating profile document: ${createError.message}`
            );
          }
        } else {
          // Update existing profile document
          functions.logger.info(`Updating existing ${profileCollection} document for ${userId}`);

          // Remove null values from top-level fields for Firestore updates
          // Firestore update() doesn't accept null values - they must be omitted or use deleteField()
          const updateData = {};
          for (const [key, value] of Object.entries(profileFieldsToUpdate)) {
            if (value !== null && value !== undefined) {
              updateData[key] = value;
            }
          }

          if (Object.keys(updateData).length > 0) {
            functions.logger.info(`Updating ${profileCollection} with ${Object.keys(updateData).length} fields`, {
              topFields: Object.keys(updateData).slice(0, 5)
            });

            try {
              currentStep = `update_existing_profile_doc_${profileCollection}`;
              await profileDocRef.set(updateData, { merge: true });
              functions.logger.info(`Successfully updated ${profileCollection} document for ${userId}`);
            } catch (updateError) {
              functions.logger.error(`Error updating ${profileCollection} document`, {
                error: updateError.message,
                stack: updateError.stack,
                code: updateError.code,
                userId,
                fieldCount: Object.keys(updateData).length,
                fields: Object.keys(updateData)
              });
              throw new HttpsError(
                'internal',
                `Error updating profile document: ${updateError.message}`
              );
            }
          }
        }
      }

      // Return success response
      return {
        success: true,
        message: 'Profile updated successfully'
      };
    } catch (error) {
      functions.logger.error('Error updating user profile', error);

      // Re-throw HttpsError as-is
      if (error instanceof HttpsError) {
        throw error;
      }

      // DEBUG: Return detailed error to client
      throw new HttpsError(
        'internal',
        `Error updating user profile data at step [${currentStep}]: ${error.message} | Stack: ${error.stack}`
      );
    }
  }
);


// Handle contract creation and notifications
// Handle contract creation and notifications
const onContractCreate = onDocumentCreated({
  document: 'contracts/{contractId}',
  database: 'medishift',
  region: 'europe-west6'
}, async (event) => {
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

    return { success: true };
  } catch (error) {
    console.error('Error processing contract creation:', error);
    return { success: false, error: error.message };
  }
});

// Handle position status updates - CRITICAL: Auto-create conversation when status changes to 'interview'
// Handle position status updates - CRITICAL: Auto-create conversation when status changes to 'interview'
const onPositionUpdate = onDocumentUpdated({
  document: 'positions/{positionId}',
  database: 'medishift',
  region: 'europe-west6'
}, async (event) => {
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

    // Get facility admins (ALL admins)
    const facilityDoc = await db.collection('facilityProfiles').doc(position.facilityProfileId).get();
    if (!facilityDoc.exists) {
      console.error(`Facility ${position.facilityProfileId} not found`);
      return null;
    }

    const facilityData = facilityDoc.data();
    const adminEmployees = facilityData.employees?.filter(emp => emp.roles?.includes('admin')) || [];
    const facilityAdminIds = adminEmployees.map(emp => emp.user_uid);

    // Ensure we have at least one admin
    if (facilityAdminIds.length === 0 && facilityData.admin) {
      facilityAdminIds.push(...facilityData.admin);
    }

    // Default to postedByUserId if available and not already included
    if (position.postedByUserId && !facilityAdminIds.includes(position.postedByUserId)) {
      facilityAdminIds.push(position.postedByUserId);
    }

    if (facilityAdminIds.length === 0 || !professionalUserId) {
      console.error(`Missing participant IDs: facilityAdminIds=${facilityAdminIds}, professionalUserId=${professionalUserId}`);
      return null;
    }

    // Prepare participants list
    const participantIds = [professionalUserId, ...facilityAdminIds];
    const uniqueParticipantIds = [...new Set(participantIds)];

    // Get participant info for conversation
    const participantInfo = [];

    // 1. Professional Info
    const professionalUserDoc = await db.collection('users').doc(professionalUserId).get();
    const professionalUserData = professionalUserDoc.exists ? professionalUserDoc.data() : {};
    participantInfo.push({
      userId: professionalUserId,
      displayName: professionalUserData.displayName || professionalUserData.firstName + ' ' + professionalUserData.lastName || 'Professional',
      photoURL: professionalUserData.photoURL || '',
      roleInConversation: 'professional'
    });

    // 2. Facility Admins Info
    for (const adminId of facilityAdminIds) {
      const adminUserDoc = await db.collection('users').doc(adminId).get();
      if (adminUserDoc.exists) {
        const adminData = adminUserDoc.data();
        participantInfo.push({
          userId: adminId,
          displayName: adminData.displayName || adminData.firstName + ' ' + adminData.lastName || 'Facility Admin',
          photoURL: adminData.photoURL || '',
          roleInConversation: 'facility_representative'
        });
      }
    }

    // Create conversation automatically
    const conversationData = {
      participantIds: uniqueParticipantIds,
      participantInfo,
      positionId: positionId,
      facilityProfileId: position.facilityProfileId,
      professionalProfileId: professionalProfileId,
      contractId: null,
      isTeamChat: uniqueParticipantIds.length > 2, // Mark as team chat if more than 2 participants
      lastMessage: {
        text: `Interview process started for position: ${position.jobTitle || 'Position'}`,
        senderId: 'system',
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      },
      lastMessageTimestamp: admin.firestore.FieldValue.serverTimestamp(),
      unreadCounts: uniqueParticipantIds.reduce((acc, id) => {
        acc[id] = id === professionalUserId ? 1 : 0; // Only mark unread for professional initially
        return acc;
      }, {}),
      isArchivedBy: [],
      typingIndicator: uniqueParticipantIds.reduce((acc, id) => {
        acc[id] = false;
        return acc;
      }, {}),
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

    return { success: true, conversationId: conversationRef.id };
  } catch (error) {
    console.error(`Error processing position interview status for ${positionId}:`, error);
    return { success: false, error: error.message };
  }
});

// Handle contract status updates
// Handle contract status updates
const onContractUpdate = onDocumentUpdated({
  document: 'contracts/{contractId}',
  database: 'medishift',
  region: 'europe-west6'
}, async (event) => {
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
          }
        }

        // Check facility auto-approval
        if (facilitySettings.enabled && !validation.facilityApproved) {
          const minHours = facilitySettings.minimumHoursInAdvance || 24;
          if (hoursUntilStart >= minHours) {
            validation.facilityApproved = true;
            validation.facilityApprovedAt = admin.firestore.FieldValue.serverTimestamp();
            shouldAutoApprove = true;
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
        const eventsRef = db.collection('events').doc(originAvailabilityId);
        const eventsDoc = await eventsRef.get();

        if (eventsDoc.exists) {
          await eventsRef.update({
            status: 'booked',
            bookedByContractId: contractId,
            updated: admin.firestore.FieldValue.serverTimestamp()
          });
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

    return { success: true };
  } catch (error) {
    console.error('Error processing contract update:', error);
    return { success: false, error: error.message };
  }
});

const { seedMedishiftDemoFacility, removeMedishiftDemoFacility, MEDISHIFT_DEMO_FACILITY_ID } = require('./seedMedishiftDemoFacility');

const seedDemoFacility = onCallV2(
  {
    region: 'europe-west6',
    enforceAppCheck: false
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be logged in');
    }

    const userId = request.auth.uid;
    const adminDoc = await db.collection('admins').doc(userId).get();

    if (!adminDoc.exists || adminDoc.data().isActive === false) {
      throw new HttpsError('permission-denied', 'Only admins can seed the demo facility');
    }

    try {
      const result = await seedMedishiftDemoFacility();
      return result;
    } catch (error) {
      console.error('Error seeding demo facility:', error);
      throw new HttpsError('internal', error.message);
    }
  }
);

const removeDemoFacility = onCallV2(
  {
    region: 'europe-west6',
    enforceAppCheck: false
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be logged in');
    }

    const userId = request.auth.uid;
    const adminDoc = await db.collection('admins').doc(userId).get();

    if (!adminDoc.exists || adminDoc.data().isActive === false) {
      throw new HttpsError('permission-denied', 'Only admins can remove the demo facility');
    }

    try {
      const result = await removeMedishiftDemoFacility();
      return result;
    } catch (error) {
      console.error('Error removing demo facility:', error);
      throw new HttpsError('internal', error.message);
    }
  }
);

module.exports = {
  createUserProfile: exports.createUserProfile,
  cleanupDeletedUser: exports.cleanupDeletedUser,
  getUserProfile: exports.getUserProfile,
  updateUserProfile: exports.updateUserProfile,
  onContractCreate,
  onContractUpdate,
  onPositionUpdate,
  seedDemoFacility,
  removeDemoFacility,
  MEDISHIFT_DEMO_FACILITY_ID
}; 