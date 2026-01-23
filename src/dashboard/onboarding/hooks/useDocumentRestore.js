import { useEffect } from 'react';

export const useDocumentRestore = (currentUser, setDocumentFile, setBillingFile, setDocumentType, setUploadedDocuments, setVerificationError) => {
  useEffect(() => {
    const loadPreviousUploads = async () => {
      if (!currentUser) return;

      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../../../services/firebase');
        const { FIRESTORE_COLLECTIONS } = await import('../../../config/keysDatabase');

        const userDoc = await getDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, currentUser.uid));
        const userData = userDoc.data();

        const onboardingDocs = userData?.onboardingDocuments || [];
        const tempUploads = userData?.temporaryUploads || {};

        if (onboardingDocs.length > 0) {
          const documentsState = {};
          onboardingDocs.forEach(docRef => {
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
        // Failed to load previous uploads
      }
    };

    loadPreviousUploads();
  }, [currentUser, setDocumentFile, setBillingFile, setDocumentType, setUploadedDocuments, setVerificationError]);
};


