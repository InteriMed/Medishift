const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize the Firebase Admin SDK
admin.initializeApp();

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

/**
 * Updates the user's last login timestamp
 */
exports.updateUserLastLogin = functions.auth.user().onLogin(async (event) => {
  try {
    const { uid } = event.data;

    // Update the user's last login timestamp
    await db.collection('users').doc(uid).update({
      'metadata.lastLogin': admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    functions.logger.info(`Updated last login for user ${uid}`, { structuredData: true });

    return null;
  } catch (error) {
    functions.logger.error('Error updating user last login', error);
    return null;
  }
});

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
exports.getUserProfile = functions.https.onCall(async (data, context) => {
  // SECURITY CHECK: Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to view profile data'
    );
  }

  try {
    const userId = context.auth.uid;

    // Get the user's profile document
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError(
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
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      'internal',
      'Error fetching user profile data'
    );
  }
});

/**
 * API endpoint to update user profile data
 * Handles both user collection and role-specific profile collections
 */
exports.updateUserProfile = functions.https.onCall(async (data, context) => {
  // SECURITY CHECK: Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to update profile data'
    );
  }

  try {
    // Validate input data
    if (!data || typeof data !== 'object') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Profile data must be an object'
      );
    }

    const userId = context.auth.uid;

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

    throw new functions.https.HttpsError(
      'internal',
      'Error updating user profile data'
    );
  }
});

// Handle contract creation and notifications
const onContractCreate = functions.firestore
  .document('contracts/{contractId}')
  .onCreate(async (snapshot, context) => {
    const contract = snapshot.data();
    const { contractId } = context.params;

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

// Handle contract status updates
const onContractUpdate = functions.firestore
  .document('contracts/{contractId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const { contractId } = context.params;

    // Only proceed if status has changed
    if (before.status === after.status) {
      return null;
    }

    try {
      // Determine who should be notified (opposite of who updated)
      const recipientId = after.updatedBy === after.workerId
        ? after.companyId
        : after.workerId;

      // Get status-specific message
      let message = '';
      switch (after.status) {
        case 'accepted':
          message = `Your contract "${after.title}" has been accepted`;
          break;
        case 'rejected':
          message = `Your contract "${after.title}" has been rejected`;
          break;
        case 'completed':
          message = `Contract "${after.title}" has been marked as completed`;
          break;
        case 'cancelled':
          message = `Contract "${after.title}" has been cancelled`;
          break;
        default:
          message = `Contract "${after.title}" status has been updated to ${after.status}`;
      }

      // Create notification in the recipient's collection
      await admin.firestore().collection('notifications').add({
        userId: recipientId,
        type: 'contract_updated',
        title: 'Contract Status Updated',
        message,
        contractId,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`Notification created for contract update ${contractId}`);
      return { success: true };
    } catch (error) {
      console.error('Error processing contract update:', error);
      return { success: false, error: error.message };
    }
  });

module.exports = {
  createUserProfile: exports.createUserProfile,
  updateUserLastLogin: exports.updateUserLastLogin,
  cleanupDeletedUser: exports.cleanupDeletedUser,
  getUserProfile: exports.getUserProfile,
  updateUserProfile: exports.updateUserProfile,
  onContractCreate,
  onContractUpdate
}; 