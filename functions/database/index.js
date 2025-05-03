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
 */
exports.getUserProfile = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to view profile data'
    );
  }
  
  try {
    // Get the user's profile document
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    
    if (!userDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'User profile not found'
      );
    }
    
    // Return the user profile data
    return {
      success: true,
      data: userDoc.data()
    };
  } catch (error) {
    functions.logger.error('Error fetching user profile', error);
    
    throw new functions.https.HttpsError(
      'internal',
      'Error fetching user profile data'
    );
  }
});

/**
 * API endpoint to update user profile data
 */
exports.updateUserProfile = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
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
    
    // Extract allowed fields to update
    const { displayName, photoURL, phoneNumber, address, bio } = data;
    
    // Build update object with only allowed fields
    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    if (displayName !== undefined) updateData.displayName = displayName;
    if (photoURL !== undefined) updateData.photoURL = photoURL;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (address !== undefined) updateData.address = address;
    if (bio !== undefined) updateData.bio = bio;
    
    // Update the user's profile document
    await db.collection('users').doc(context.auth.uid).update(updateData);
    
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
  onContractCreate,
  onContractUpdate
}; 