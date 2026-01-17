import { httpsCallable } from 'firebase/functions';
import { functions } from './firebaseService';
import { handleFirebaseOperation } from '../utils/errorHandler';

/**
 * Export user data
 * @param {string} userId - User ID
 * @returns {Promise} Exported data
 */
export const exportUserData = async (userId) => {
  return handleFirebaseOperation(
    async () => {
      const exportDataFn = httpsCallable(functions, 'exportData');
      const result = await exportDataFn({ userId });
      return result.data;
    }
  );
};

/**
 * Import user data
 * @param {string} userId - User ID
 * @param {object} importData - Data to import
 * @returns {Promise} Import result
 */
export const importUserData = async (userId, importData) => {
  return handleFirebaseOperation(
    async () => {
      const importDataFn = httpsCallable(functions, 'importData');
      const result = await importDataFn({
        userId,
        importData
      });
      return result.data;
    }
  );
};

/**
 * Import data from a file
 * @param {string} userId - User ID
 * @param {File} file - File to import
 * @returns {Promise} Import result
 */
export const importDataFromFile = async (userId, file) => {
  return handleFirebaseOperation(
    async () => {
      // Create a FileReader to read the file
      const reader = new FileReader();
      
      // Create a promise to handle the async file reading
      const fileReadPromise = new Promise((resolve, reject) => {
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target.result);
            resolve(data);
          } catch (error) {
            reject(new Error('Invalid JSON file'));
          }
        };
        reader.onerror = () => reject(new Error('Error reading file'));
      });
      
      // Read the file as text
      reader.readAsText(file);
      
      // Wait for the file to be read
      const importData = await fileReadPromise;
      
      // Import the data
      return importUserData(userId, importData);
    }
  );
}; 