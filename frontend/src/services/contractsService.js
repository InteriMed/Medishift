import apiService from './apiService';

const contractsService = {
  /**
   * Get all contracts
   */
  getContracts: async () => {
    try {
      const response = await apiService.get('/contracts');
      return response.data;
    } catch (error) {
      console.error('Error fetching contracts:', error);
      throw error;
    }
  },

  /**
   * Get a single contract by ID
   * @param {string} contractId - Contract ID
   */
  getContract: async (contractId) => {
    try {
      const response = await apiService.get(`/contracts/${contractId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching contract ${contractId}:`, error);
      throw error;
    }
  },

  /**
   * Create a new contract
   * @param {Object} contractData - Contract data
   */
  createContract: async (contractData) => {
    try {
      const response = await apiService.post('/contracts', contractData);
      return response.data;
    } catch (error) {
      console.error('Error creating contract:', error);
      throw error;
    }
  },

  /**
   * Update an existing contract
   * @param {string} contractId - Contract ID
   * @param {Object} contractData - Updated contract data
   */
  updateContract: async (contractId, contractData) => {
    try {
      const response = await apiService.put(`/contracts/${contractId}`, contractData);
      return response.data;
    } catch (error) {
      console.error(`Error updating contract ${contractId}:`, error);
      throw error;
    }
  },

  /**
   * Delete a contract
   * @param {string} contractId - Contract ID
   */
  deleteContract: async (contractId) => {
    try {
      await apiService.delete(`/contracts/${contractId}`);
      return true;
    } catch (error) {
      console.error(`Error deleting contract ${contractId}:`, error);
      throw error;
    }
  },

  /**
   * Generate a PDF for a contract
   * @param {string} contractId - Contract ID
   */
  generatePdf: async (contractId) => {
    try {
      const response = await apiService.get(`/contracts/${contractId}/pdf`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error(`Error generating PDF for contract ${contractId}:`, error);
      throw error;
    }
  },

  /**
   * Get contract activity history
   * @param {string} contractId - Contract ID
   */
  getContractHistory: async (contractId) => {
    try {
      const response = await apiService.get(`/contracts/${contractId}/history`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching history for contract ${contractId}:`, error);
      throw error;
    }
  }
};

export default contractsService; 