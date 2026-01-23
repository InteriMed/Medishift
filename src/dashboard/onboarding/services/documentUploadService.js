import { uploadFile } from '../../../services/storageService';
import { generateDocumentUID } from '../utils/glnVerificationUtils';
import { FIRESTORE_COLLECTIONS } from '../../../config/keysDatabase';

export const uploadDocument = async (file, userId, subfolder, documentType, onProgress, isFacilityUpload = false, setUploadedDocuments) => {
  const timestamp = Date.now();
  const fileExtension = file.name.split('.').pop();
  const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
  const normalizedFileName = `${baseName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${timestamp}.${fileExtension}`;

  const path = isFacilityUpload
    ? `documents/facilities/${userId}/${subfolder}/${normalizedFileName}`
    : `documents/${userId}/${subfolder}/${normalizedFileName}`;

  const downloadURL = await uploadFile(file, path, (progress) => {
    if (onProgress) onProgress(progress);
  });

  try {
    const { doc, updateDoc, serverTimestamp, getDoc } = await import('firebase/firestore');
    const { db } = await import('../../../services/firebase');

    const documentUID = generateDocumentUID();

    let idType = subfolder;
    if (subfolder === 'identity') {
      idType = documentType || 'identity_card';
    } else if (subfolder === 'responsible_person_id') {
      idType = documentType || 'identity_card';
    } else if (subfolder === 'billing_document') {
      idType = 'billing_document';
    }

    const documentReference = {
      id_type: idType,
      uid: documentUID,
      fileName: file.name,
      originalFileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      storagePath: path,
      downloadURL,
      uploadedAt: new Date().toISOString(),
      verified: false,
      subfolder: subfolder
    };

    const userDocRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId);
    const userDoc = await getDoc(userDocRef);
    const userData = userDoc.data() || {};
    const existingDocuments = userData.onboardingDocuments || [];

    const updatedDocuments = existingDocuments.filter(d => d.subfolder !== subfolder);
    updatedDocuments.push(documentReference);

    await updateDoc(userDocRef, {
      onboardingDocuments: updatedDocuments,
      [`temporaryUploads.${subfolder}`]: {
        downloadURL,
        storagePath: path,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
        verified: false
      },
      updatedAt: serverTimestamp()
    });

    if (setUploadedDocuments) {
      setUploadedDocuments(prev => ({
        ...prev,
        [subfolder === 'responsible_person_id' ? 'identity' : subfolder]: documentReference
      }));
    }

  } catch (error) {
    console.warn('[GLNVerification] Failed to save upload metadata:', error);
  }

  return { downloadURL, storagePath: path };
};


