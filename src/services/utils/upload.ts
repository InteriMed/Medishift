import { ref, uploadBytes, getDownloadURL, deleteObject, UploadMetadata } from 'firebase/storage';
import { storage } from '../services/firebase';
import { getMimeType } from './document';

export interface UploadOptions {
  path?: string;
  metadata?: UploadMetadata;
  onProgress?: (progress: number) => void;
}

export interface UploadResult {
  url: string;
  path: string;
  fileName: string;
}

export const uploadFile = async (
  file: File,
  userId: string,
  options: UploadOptions = {}
): Promise<UploadResult> => {
  const { path: customPath, metadata, onProgress } = options;
  
  const mimeType = getMimeType(file);
  const fileExtension = file.name.split('.').pop() || 'bin';
  const timestamp = Date.now();
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  const storagePath = customPath || `documents/${userId}/${timestamp}_${sanitizedFileName}`;
  const storageRef = ref(storage, storagePath);

  const uploadMetadata: UploadMetadata = {
    contentType: mimeType,
    customMetadata: {
      originalName: file.name,
      uploadedBy: userId,
      uploadedAt: new Date().toISOString(),
      ...metadata?.customMetadata
    },
    ...metadata
  };

  await uploadBytes(storageRef, file, uploadMetadata);
  const url = await getDownloadURL(storageRef);

  return {
    url,
    path: storagePath,
    fileName: sanitizedFileName
  };
};

export const uploadDocument = async (
  file: File,
  userId: string,
  documentType: string,
  docType?: string | null,
  onProgress?: (progress: number) => void,
  showProgress?: boolean,
  onError?: (error: Error) => void
): Promise<{ downloadURL: string; storagePath: string }> => {
  try {
    const storagePath = `documents/${userId}/${documentType}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const result = await uploadFile(file, userId, { 
      path: storagePath,
      onProgress 
    });
    
    return {
      downloadURL: result.url,
      storagePath: result.path
    };
  } catch (error: any) {
    if (onError) onError(error);
    throw error;
  }
};

export const deleteFile = async (filePath: string): Promise<boolean> => {
  try {
    const storageRef = ref(storage, filePath);
    await deleteObject(storageRef);
    return true;
  } catch (error) {
    console.error('[Upload] Failed to delete file:', error);
    return false;
  }
};

export const getFileUrl = async (filePath: string): Promise<string | null> => {
  try {
    const storageRef = ref(storage, filePath);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error('[Upload] Failed to get file URL:', error);
    return null;
  }
};

