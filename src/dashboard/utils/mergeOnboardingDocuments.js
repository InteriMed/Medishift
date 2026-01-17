import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

/**
 * Merge onboarding documents into profile verification documents
 * Loads documents uploaded during onboarding (step 4) and adds them to the profile's verification documents array
 * Prevents duplicates by checking storagePath
 * 
 * @param {Object} formData - Current profile form data
 * @param {function} setFormData - State setter for formData
 * @param {Object} currentUser - Current authenticated user
 * @returns {Promise<number>} - Number of documents merged
 */
export const mergeOnboardingDocuments = async (formData, setFormData, currentUser) => {
    if (!formData || !currentUser) {
        console.log('[mergeOnboardingDocuments] Missing formData or currentUser');
        return 0;
    }

    // Check if we've already merged (to prevent re-merging on every render)
    if (formData._onboardingDocumentsMerged) {
        console.log('[mergeOnboardingDocuments] Already merged');
        return 0;
    }

    try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            console.warn('[mergeOnboardingDocuments] User document does not exist');
            setFormData(prev => ({ ...prev, _onboardingDocumentsMerged: true }));
            return 0;
        }

        const userData = userDoc.data();
        const onboardingDocs = userData?.onboardingDocuments || [];

        if (onboardingDocs.length === 0) {
            console.log('[mergeOnboardingDocuments] No onboarding documents found');
            setFormData(prev => ({ ...prev, _onboardingDocumentsMerged: true }));
            return 0;
        }

        console.log(`[mergeOnboardingDocuments] Found ${onboardingDocs.length} onboarding documents`);

        const existingDocs = formData.verification?.verificationDocuments || [];

        // Create a Set of existing storage paths to avoid duplicates
        const existingPaths = new Set(existingDocs.map(d => d.storagePath || d.storageUrl));

        // Filter out documents that already exist (by storagePath or downloadURL)
        const newDocs = onboardingDocs.filter(doc =>
            !existingPaths.has(doc.storagePath) && !existingPaths.has(doc.downloadURL)
        );

        if (newDocs.length === 0) {
            console.log('[mergeOnboardingDocuments] All onboarding documents already exist in profile');
            setFormData(prev => ({ ...prev, _onboardingDocumentsMerged: true }));
            return 0;
        }

        console.log(`[mergeOnboardingDocuments] Merging ${newDocs.length} new documents`);

        // Convert onboarding document format to verification document format
        const convertedDocs = newDocs.map(doc => ({
            documentId: doc.uid || `onboarding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: doc.id_type || doc.subfolder || 'identity',
            category: doc.id_type || doc.subfolder || 'identity',
            fileName: doc.fileName,
            originalFileName: doc.originalFileName || doc.fileName,
            storageUrl: doc.downloadURL,
            storagePath: doc.storagePath,
            fileSize: doc.fileSize,
            fileType: doc.fileType,
            mimeType: doc.fileType,
            uploadedAt: doc.uploadedAt,
            status: doc.verified ? 'verified' : 'pending_verification',
            verificationStatus: doc.verified ? 'verified' : 'pending',
            source: 'onboarding' // Mark as from onboarding for reference
        }));

        // Update formData with merged documents
        setFormData(prev => ({
            ...prev,
            verification: {
                ...prev.verification,
                verificationDocuments: [...existingDocs, ...convertedDocs]
            },
            _onboardingDocumentsMerged: true // Flag to prevent re-merging
        }));

        console.log(`[mergeOnboardingDocuments] Successfully merged ${convertedDocs.length} onboarding documents`);
        return convertedDocs.length;

    } catch (error) {
        console.error('[mergeOnboardingDocuments] Error:', error);
        // Still mark as attempted to prevent infinite retries
        setFormData(prev => ({ ...prev, _onboardingDocumentsMerged: true }));
        return 0;
    }
};
