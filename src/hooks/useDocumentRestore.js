import { useEffect } from 'react';

/**
 * Centralized hook to restore uploaded documents from Firestore
 * Used in onboarding and profile pages
 */
export const useDocumentRestore = (
  currentUser: any,
  setDocumentFile: (file: any) => void,
  setBillingFile: (file: any) => void,
  setDocumentType: (type: string) => void,
  setUploadedDocuments: (docs: any) => void,
  setVerificationError: (error: string) => void
) => {
  useEffect(() => {
    const loadPreviousUploads = async () => {
      if (!currentUser) return;

      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../services/services/firebase');
        const { FIRESTORE_COLLECTIONS } = await import('../config/keysDatabase');

        const userDoc = await getDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, currentUser.uid));
        const userData = userDoc.data();

        const onboardingDocs = userData?.onboardingDocuments || [];
        const tempUploads = userData?.temporaryUploads || {};

        if (onboardingDocs.length > 0) {
          const documentsState: Record<string, any> = {};
          onboardingDocs.forEach((docRef: any) => {
            const key = docRef.subfolder === 'responsible_person_id' ? 'identity' : docRef.subfolder;
            documentsState[key] = docRef;

            if (docRef.id_type && (docRef.subfolder === 'identity' || docRef.subfolder === 'responsible_person_id')) {
              setDocumentType(docRef.id_type);
            }

            if (docRef.subfolder === 'identity' || docRef.subfolder === 'responsible_person_id') {
              setDocumentFile({
                name: docRef.fileName,
                size: docRef.fileSize,
                type: docRef.fileType,
                _restored: true,
                _downloadURL: docRef.downloadURL
              });
            } else if (docRef.subfolder === 'billing_document') {
              setBillingFile({
                name: docRef.fileName,
                size: docRef.fileSize,
                type: docRef.fileType,
                _restored: true,
                _downloadURL: docRef.downloadURL
              });
            }
          });

          setUploadedDocuments(documentsState);
          setVerificationError(`📋 ${onboardingDocs.length} document${onboardingDocs.length > 1 ? 's' : ''} restored. You can continue from where you left off.`);
          setTimeout(() => setVerificationError(''), 6000);
        } else if (Object.keys(tempUploads).length > 0) {
          setUploadedDocuments({
            identity: tempUploads.identity || tempUploads.responsible_person_id || null,
            billing: tempUploads.billing_document || null
          });
          setVerificationError('Previous uploads found. You can continue from where you left off.');
          setTimeout(() => setVerificationError(''), 5000);
        }
      } catch (error) {
        console.error('[useDocumentRestore] Failed to load documents:', error);
      }
    };

    loadPreviousUploads();
  }, [currentUser, setDocumentFile, setBillingFile, setDocumentType, setUploadedDocuments, setVerificationError]);
};

