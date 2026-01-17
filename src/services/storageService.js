import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll
} from 'firebase/storage';
import { storage, auth } from './firebase';
import { handleError } from '../utils/errorHandler';

/**
 * Get content type from file extension
 * @param {string} fileName - File name with extension
 * @returns {string|null} MIME type or null if unknown
 */
const getContentTypeFromExtension = (fileName) => {
  if (!fileName) return null;

  const ext = fileName.split('.').pop()?.toLowerCase();
  const mimeTypes = {
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'heic': 'image/heic',
    'heif': 'image/heif',
    // Documents
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    // Text
    'txt': 'text/plain',
    'json': 'application/json',
  };

  return mimeTypes[ext] || null;
};

/**
 * Upload a file to Firebase Storage
 * @param {File} file - File to upload
 * @param {string} path - Storage path (e.g., 'users/user123/profile.jpg')
 * @param {Function} progressCallback - Callback for upload progress
 * @returns {Promise<string>} Download URL of the uploaded file
 */
export const uploadFile = async (file, path, progressCallback = null) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      const error = new Error('User must be authenticated to upload files');
      error.code = 'storage/unauthenticated';
      throw error;
    }

    // Determine content type - use file.type if available, otherwise detect from extension
    let contentType = file.type;
    if (!contentType || contentType === '' || contentType === 'application/octet-stream') {
      const detectedType = getContentTypeFromExtension(file.name);
      if (detectedType) {
        contentType = detectedType;
        console.log('[storageService] Content type detected from extension:', contentType);
      } else {
        // Fallback to image/jpeg for common upload scenarios (permits, IDs, etc.)
        contentType = 'image/jpeg';
        console.warn('[storageService] Could not detect file type, defaulting to image/jpeg');
      }
    }

    console.log('[storageService] Uploading file:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: contentType,
      originalType: file.type || 'not set',
      path: path,
      userId: currentUser.uid
    });

    // Create metadata with explicit content type
    const metadata = {
      contentType: contentType,
      customMetadata: {
        uploadedBy: currentUser.uid,
        originalFileName: file.name
      }
    };

    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file, metadata);

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
          // Enhanced error logging
          console.error('[storageService] Upload error:', {
            code: error.code,
            message: error.message,
            serverResponse: error.serverResponse,
            path: path,
            fileName: file.name
          });

          // Handle specific error types
          if (error.code === 'storage/unauthorized') {
            console.error('[storageService] Unauthorized Error - Possible causes:');
            console.error('  1. Storage rules not deployed - Run: firebase deploy --only storage');
            console.error('  2. User UID does not match path userId');
            console.error('  3. File type or size validation failed');
            console.error('  4. User not authenticated');
            console.error('  Current user:', auth.currentUser?.uid || 'Not authenticated');
            console.error('  Path:', path);
          }

          if (error.code === 'storage/unauthenticated') {
            console.error('[storageService] User not authenticated');
          }

          if (error.message?.includes('CORS') || error.code === 'storage/canceled') {
            console.error('[storageService] CORS/Network Error - Check Firebase Storage bucket configuration:');
            console.error('  - Storage bucket name should match REACT_APP_FIREBASE_STORAGE_BUCKET');
            console.error('  - Bucket format should be: {project-id}.appspot.com or {project-id}.firebasestorage.app');
            console.error('  - Ensure CORS is configured: gsutil cors set storage.cors.json gs://YOUR_BUCKET_NAME');
          }

          handleError(error, 'uploadFile');
          reject(error);
        },
        async () => {
          // Upload completed successfully, get download URL
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log('[storageService] Upload successful:', downloadURL);
            resolve(downloadURL);
          } catch (urlError) {
            console.error('[storageService] Error getting download URL:', urlError);
            reject(urlError);
          }
        }
      );
    });
  } catch (error) {
    console.error('[storageService] Upload exception:', error);
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

const storageService = {
  uploadFile,
  getFileUrl,
  deleteFile
};

export default storageService; 