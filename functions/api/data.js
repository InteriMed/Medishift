const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

// Export user data
exports.exportData = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be signed in to export data'
    );
  }
  
  try {
    const { userId } = data;
    
    // Ensure the caller can only export their own data
    if (userId !== context.auth.uid) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'You can only export your own data'
      );
    }
    
    // Get user type
    const userCollection = await determineUserCollection(userId);
    
    // Get user profile
    const userDoc = await admin.firestore()
      .collection(userCollection)
      .doc(userId)
      .get();
    
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }
    
    const userData = userDoc.data();
    
    // Get user's contracts
    const contractsQuery = userCollection === 'workers' 
      ? admin.firestore().collection('contracts').where('workerID', '==', userId)
      : admin.firestore().collection('contracts').where('companyID', '==', userId);
    
    const contractsSnapshot = await contractsQuery.get();
    const contracts = [];
    
    contractsSnapshot.forEach(doc => {
      contracts.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Get user's availability if they're a worker
    let availability = [];
    if (userCollection === 'workers') {
      const availabilitySnapshot = await admin.firestore()
        .collection('availability')
        .where('workerID', '==', userId)
        .get();
      
      availabilitySnapshot.forEach(doc => {
        availability.push({
          id: doc.id,
          ...doc.data()
        });
      });
    }
    
    // Create the export object
    const exportData = {
      profile: {
        ...userData,
        // Remove sensitive fields
        password: undefined,
        secretQuestions: undefined
      },
      contracts,
      availability
    };
    
    // Log the export
    await admin.firestore().collection('dataExports').add({
      userId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      type: 'user-initiated'
    });
    
    return exportData;
  } catch (error) {
    functions.logger.error('Error exporting user data', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Import data
exports.importData = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be signed in to import data'
    );
  }
  
  try {
    const { userId, importData } = data;
    
    // Ensure the caller can only import data to their own account
    if (userId !== context.auth.uid) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'You can only import data to your own account'
      );
    }
    
    // Get user type
    const userCollection = await determineUserCollection(userId);
    
    // Start a batch operation
    const batch = admin.firestore().batch();
    
    // Import profile data if provided
    if (importData.profile) {
      const userRef = admin.firestore().collection(userCollection).doc(userId);
      
      // Get current data to merge with
      const userDoc = await userRef.get();
      if (userDoc.exists) {
        const currentData = userDoc.data();
        
        // Merge data, preserving critical fields
        const mergedData = {
          ...importData.profile,
          // Preserve these fields from current data
          email: currentData.email,
          createdAt: currentData.createdAt,
          accountType: currentData.accountType,
          // Add import metadata
          lastImport: admin.firestore.FieldValue.serverTimestamp()
        };
        
        batch.update(userRef, mergedData);
      }
    }
    
    // Import contracts if provided
    if (importData.contracts && Array.isArray(importData.contracts)) {
      for (const contract of importData.contracts) {
        // Create a new contract
        const newContractRef = admin.firestore().collection('contracts').doc();
        
        // Ensure the contract has the correct user ID
        const contractData = {
          ...contract,
          [userCollection === 'workers' ? 'workerID' : 'companyID']: userId,
          importedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        batch.set(newContractRef, contractData);
      }
    }
    
    // Import availability if provided and user is a worker
    if (userCollection === 'workers' && importData.availability && Array.isArray(importData.availability)) {
      for (const slot of importData.availability) {
        // Create a new availability slot
        const newSlotRef = admin.firestore().collection('availability').doc();
        
        // Ensure the availability slot has the correct worker ID
        const slotData = {
          ...slot,
          workerID: userId,
          importedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        batch.set(newSlotRef, slotData);
      }
    }
    
    // Commit all the changes
    await batch.commit();
    
    // Log the import
    await admin.firestore().collection('dataImports').add({
      userId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      recordsImported: {
        profile: importData.profile ? 1 : 0,
        contracts: importData.contracts ? importData.contracts.length : 0,
        availability: importData.availability ? importData.availability.length : 0
      }
    });
    
    return {
      success: true,
      message: 'Data imported successfully'
    };
  } catch (error) {
    functions.logger.error('Error importing user data', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// HTTP version for legacy file uploads
exports.importFileData = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      // Only allow POST method
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      
      // Verify authentication
      const idToken = req.headers.authorization?.split('Bearer ')[1];
      if (!idToken) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      // Verify the ID token
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const userId = decodedToken.uid;
      
      // Ensure userId matches the one in the request
      const requestedUserId = req.body.userId;
      if (userId !== requestedUserId) {
        return res.status(403).json({ error: 'Permission denied' });
      }
      
      // Process the uploaded JSON data
      const importData = JSON.parse(req.body.data);
      
      // Call the importData function with the parsed data
      const result = await exports.importData({
        userId,
        importData
      }, { auth: { uid: userId } });
      
      return res.status(200).json(result);
    } catch (error) {
      functions.logger.error('Error in import file data endpoint', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
});

// Helper function to determine which collection a user belongs to
async function determineUserCollection(userId) {
  // Check if user exists in workers collection
  const workerDoc = await admin.firestore()
    .collection('workers')
    .doc(userId)
    .get();
  
  if (workerDoc.exists) {
    return 'workers';
  }
  
  // Check if user exists in companies collection
  const companyDoc = await admin.firestore()
    .collection('companies')
    .doc(userId)
    .get();
  
  if (companyDoc.exists) {
    return 'companies';
  }
  
  // If not found in either, throw an error
  throw new Error('User not found in any collection');
} 