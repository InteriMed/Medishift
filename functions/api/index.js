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
        
        // Check if user has permission to view this contract
        const contract = contractDoc.data();
        const userId = context.auth.uid;
        
        if (contract.workerId !== userId && contract.companyId !== userId) {
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
        
        // Determine if user is a worker or company
        const workerDoc = await admin.firestore()
          .collection('workers')
          .doc(userId)
          .get();
        
        const isWorker = workerDoc.exists;
        const field = isWorker ? 'workerId' : 'companyId';
        
        const contractsSnapshot = await admin.firestore()
          .collection('contracts')
          .where(field, '==', userId)
          .get();
        
        const contracts = [];
        contractsSnapshot.forEach(doc => {
          contracts.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
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
        
        // Add metadata
        const newContract = {
          ...contractData,
          createdBy: userId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          status: 'pending'
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
        
        if (contract.workerId !== userId && contract.companyId !== userId) {
          throw new functions.https.HttpsError(
            'permission-denied',
            'You do not have permission to update this contract'
          );
        }
        
        // Update the contract
        await admin.firestore()
          .collection('contracts')
          .doc(contractId)
          .update({
            ...contractData,
            updatedBy: userId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        
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

module.exports = {
  contractAPI,
  ...notificationsFunctions
}; 