import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebaseService';

// Initialize the Firebase Functions
const functions = getFunctions(app);

// Contract API function
export const contractAPI = async (action, contractId = null, contractData = null) => {
  try {
    const callContractAPI = httpsCallable(functions, 'contractAPI');
    
    const result = await callContractAPI({
      action,
      contractId,
      contractData
    });
    
    return result.data;
  } catch (error) {
    console.error('Cloud Function Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Helper functions for each action
export const getContract = async (contractId) => {
  return await contractAPI('get', contractId);
};

export const listContracts = async () => {
  return await contractAPI('list');
};

export const createContract = async (contractData) => {
  return await contractAPI('create', null, contractData);
};

export const updateContract = async (contractId, contractData) => {
  return await contractAPI('update', contractId, contractData);
}; 