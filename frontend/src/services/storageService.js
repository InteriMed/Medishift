import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject,
  listAll
} from 'firebase/storage';
import { storage } from './firebase';
import { handleError } from '../utils/errorHandler';

/**
 * Upload a file to Firebase Storage
 * @param {File} file - File to upload
 * @param {string} path - Storage path (e.g., 'users/user123/profile.jpg')
 * @param {Function} progressCallback - Callback for upload progress
 * @returns {Promise<string>} Download URL of the uploaded file
 */
export const uploadFile = async (file, path, progressCallback = null) => {
  try {
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);
    
    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Calculate and report progress
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (progressCallback) {
            progressCallback(progress);
          }
        },
        (error) => {
          // Handle error
          handleError(error, 'uploadFile');
          reject(error);
        },
        async () => {
          // Upload completed successfully, get download URL
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        }
      );
    });
  } catch (error) {
    handleError(error, 'uploadFile');
    throw error;
  }
};

/**
 * Get the download URL for a file in Firebase Storage
 * @param {string} path - Storage path
 * @returns {Promise<string>} Download URL
 */
export const getFileUrl = async (path) => {
  try {
    const storageRef = ref(storage, path);
    return await getDownloadURL(storageRef);
  } catch (error) {
    handleError(error, 'getFileUrl');
    throw error;
  }
};

/**
 * Delete a file from Firebase Storage
 * @param {string} path - Storage path
 * @returns {Promise<void>}
 */
export const deleteFile = async (path) => {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error) {
    handleError(error, 'deleteFile');
    throw error;
  }
};

// List all files in a directory
export const listFiles = async (path) => {
  try {
    const storageRef = ref(storage, path);
    const list = await listAll(storageRef);
    
    const fileRefs = list.items.map(item => ({
      name: item.name,
      fullPath: item.fullPath
    }));
    
    return { files: fileRefs, error: null };
  } catch (error) {
    return { files: [], error: error.message };
  }
};

export default {
  uploadFile,
  getFileUrl,
  deleteFile
}; 