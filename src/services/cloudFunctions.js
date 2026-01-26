import { getFunctions, httpsCallable } from 'firebase/functions';
import { firebaseApp as app } from './firebaseService';

// Initialize the Firebase Functions
// Initialize the Firebase Functions with correct region
const functions = getFunctions(app, 'europe-west6');

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

// Health Registry API function
export const healthRegistryAPI = async (gln) => {
  try {
    const callHealthRegistryAPI = httpsCallable(functions, 'healthRegistryAPI');

    const result = await callHealthRegistryAPI({
      gln
    });

    return result.data;
  } catch (error) {
    console.error('Health Registry API Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Company Search API function
export const companySearchAPI = async (glnCompany) => {
  try {
    const callCompanySearchAPI = httpsCallable(functions, 'companySearchAPI');

    const result = await callCompanySearchAPI({
      glnCompany
    });

    return result.data;
  } catch (error) {
    console.error('Company Search API Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Company Details API function
export const companyDetailsAPI = async (companyId) => {
  try {
    const callCompanyDetailsAPI = httpsCallable(functions, 'companyDetailsAPI');

    const result = await callCompanyDetailsAPI({
      companyId
    });

    return result.data;
  } catch (error) {
    console.error('Company Details API Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Verify Profile API function
export const verifyProfileAPI = async () => {
  try {
    const callVerifyProfileAPI = httpsCallable(functions, 'verifyProfileAPI');

    const result = await callVerifyProfileAPI({});

    return result.data;
  } catch (error) {
    console.error('Verify Profile API Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Generate Facility Role Invitation API function
export const generateFacilityRoleInvitation = async (facilityId, roleId, workerType, workerTypeOther, workerId) => {
  try {
    const callGenerateInvitation = httpsCallable(functions, 'generateFacilityRoleInvitation');

    const result = await callGenerateInvitation({
      facilityId,
      roleId,
      workerType,
      workerTypeOther,
      workerId
    });

    return result.data;
  } catch (error) {
    console.error('Generate Facility Role Invitation Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get User Profile function
export const getUserProfile = async () => {
  try {
    const callGetUserProfile = httpsCallable(functions, 'getUserProfile');
    const result = await callGetUserProfile({});
    return result.data;
  } catch (error) {
    console.error('Get User Profile Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// GesReg API function
export const gesRegAPI = async (gln) => {
  try {
    const callGesRegAPI = httpsCallable(functions, 'gesRegAPI');

    const result = await callGesRegAPI({
      gln
    });

    return result.data;
  } catch (error) {
    console.error('GesReg API Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Commercial Registry Search API function
export const commercialRegistrySearchAPI = async (criteria) => {
  try {
    const callCommercialRegistrySearchAPI = httpsCallable(functions, 'commercialRegistrySearchAPI');

    const result = await callCommercialRegistrySearchAPI({
      criteria
    });

    return result.data;
  } catch (error) {
    console.error('Commercial Registry Search API Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}; 