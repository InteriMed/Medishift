import { httpsCallable } from 'firebase/functions';
import { functions } from './firebaseService';
import { handleFirebaseOperation } from '../utils/errorHandler';

/**
 * Process a payment for a contract
 * @param {string} contractId - ID of the contract
 * @param {object} paymentDetails - Payment details
 * @returns {Promise} Payment result
 */
export const processPayment = async (contractId, paymentDetails) => {
  return handleFirebaseOperation(
    async () => {
      const processPaymentFn = httpsCallable(functions, 'processPayment');
      const result = await processPaymentFn({
        contractId,
        ...paymentDetails
      });
      return result.data;
    }
  );
};

/**
 * Get payment history for a user
 * @param {string} userId - User ID
 * @returns {Promise} List of payments
 */
export const getPaymentHistory = async (userId) => {
  return handleFirebaseOperation(
    async () => {
      const getPaymentHistoryFn = httpsCallable(functions, 'getPaymentHistory');
      const result = await getPaymentHistoryFn({ userId });
      return result.data;
    }
  );
}; 