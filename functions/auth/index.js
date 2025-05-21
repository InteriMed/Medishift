const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Create user document when a new user is created
const createUserProfile = functions.auth.user().onCreate(async (user) => {
  const { uid, email, displayName, emailVerified } = user;
  
  try {
    // User data will be set when they complete registration
    // This is a placeholder document
    const userData = {
      email,
      displayName: displayName || email.split('@')[0],
      emailVerified,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // We'll store this temporarily until we determine if they're
    // a worker or company during registration
    await admin.firestore().collection('users').doc(uid).set(userData);
    
    console.log(`User profile created for ${uid}`);
    return { success: true };
  } catch (error) {
    console.error('Error creating user profile:', error);
    return { success: false, error: error.message };
  }
});

// Delete user data when user account is deleted
const cleanupUserData = functions.auth.user().onDelete(async (user) => {
  const { uid } = user;
  
  try {
    // Check if user exists in workers collection
    const workerDoc = await admin.firestore().collection('workers').doc(uid).get();
    
    if (workerDoc.exists) {
      await admin.firestore().collection('workers').doc(uid).delete();
    } else {
      // Check if user exists in companies collection
      const companyDoc = await admin.firestore().collection('companies').doc(uid).get();
      
      if (companyDoc.exists) {
        await admin.firestore().collection('companies').doc(uid).delete();
      }
    }
    
    // Delete temporary user doc if it exists
    await admin.firestore().collection('users').doc(uid).delete();
    
    console.log(`User data cleaned up for ${uid}`);
    return { success: true };
  } catch (error) {
    console.error('Error cleaning up user data:', error);
    return { success: false, error: error.message };
  }
});

module.exports = {
  createUserProfile,
  cleanupUserData
}; 