import React, { useState, useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { healthRegistryAPI, companySearchAPI, companyDetailsAPI } from '../../../services/cloudFunctions';
import { processDocumentWithAI } from '../../../services/documentProcessingService';
import { uploadFile } from '../../../services/storageService';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { firebaseApp as app } from '../../../services/firebaseService';
import Button from '../../../components/BoxedInputFields/Button';
import PersonnalizedInputField from '../../../components/BoxedInputFields/Personnalized-InputField';
import UploadFile from '../../../components/BoxedInputFields/UploadFile';
import SimpleDropdown from '../../../components/BoxedInputFields/Dropdown-Field';
import { useDropdownOptions } from '../../pages/profile/utils/DropdownListsImports';
import { FiAlertCircle, FiAlertTriangle, FiCheckCircle, FiLoader, FiMail, FiInfo, FiEdit, FiTrash2, FiFileText } from 'react-icons/fi';
import { getFirebaseErrorMessage } from '../../../utils/errorHandler';
import VerificationDetails from './VerificationDetails';
/**
 * Get MIME type from file extension
 * Used when file.type is not set (e.g., mobile camera captures)
 * Note: HEIC/HEIF are converted to image/jpeg as VertexAI doesn't support them
 */
const getMimeType = (file) => {
  const ext = file.name?.split('.').pop()?.toLowerCase();

  // HEIC/HEIF are not supported by VertexAI - map to jpeg
  // Note: The actual file content is still HEIC, but we tell the API it's jpeg
  // This may work if the backend/Gemini can auto-detect, otherwise we need client-side conversion
  const unsupportedFormats = ['heic', 'heif'];
  if (unsupportedFormats.includes(ext) || file.type === 'image/heic' || file.type === 'image/heif') {
    console.warn('[getMimeType] HEIC/HEIF detected - these formats may not be supported. Consider converting to JPEG.');
    return 'image/jpeg';
  }

  // If file has a valid type, use it
  if (file.type && file.type !== '' && file.type !== 'application/octet-stream') {
    return file.type;
  }

  // Otherwise detect from extension
  const mimeTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };

  return mimeTypes[ext] || 'image/jpeg'; // Default to image/jpeg for unknown types
};

const DOCUMENT_TYPES = [
  { value: 'authorization_card', label: 'Authorization Card' },
  { value: 'identity_card', label: 'Identity Card' },
  { value: 'passport', label: 'Passport' },
  { value: 'swiss_permit', label: 'Swiss Permit (for foreigners)' }
];

// --- Helper Functions ---

/**
 * Extract street name from full address string
 * Example: "Hauptstrasse 123" → "Hauptstrasse"
 */
const extractStreetName = (fullStreet) => {
  if (!fullStreet) return '';
  // Remove house number from end: "Hauptstrasse 123" → "Hauptstrasse"
  return fullStreet.replace(/\s+\d+[a-zA-Z]?$/, '').trim();
};

/**
 * Extract house number from full address string
 * Example: "Hauptstrasse 123" → "123"
 */
const extractHouseNumber = (fullStreet) => {
  if (!fullStreet) return '';
  // Extract house number: "Hauptstrasse 123" → "123"
  const match = fullStreet.match(/(\d+[a-zA-Z]?)$/);
  return match ? match[1] : '';
};

/**
 * Convert residency permit type to profile format
 * Example: "B" → "permit_b"
 */
const convertPermitTypeToProfileFormat = (permitType) => {
  if (!permitType) return null;
  return `permit_${permitType.toLowerCase()}`;
};

const GLNVerificationStep = React.forwardRef(({ role, onComplete, onBack, showHeader = true, hasGLN = true, hideMainButton = false, onVerifyClick, onReadyChange, onProcessingChange }, ref) => {
  const { t } = useTranslation(['dashboard', 'common']);
  const { currentUser } = useAuth();
  const functions = getFunctions(app, 'europe-west6');
  const { phonePrefixOptions } = useDropdownOptions();

  // General State
  const [gln, setGln] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null); // 'verified', 'error', 'complete'
  const [verificationError, setVerificationError] = useState('');
  const [isAPILimitError, setIsAPILimitError] = useState(false);
  const [isTimeoutError, setIsTimeoutError] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(0);

  // Error Contact Form State
  const [contactMessage, setContactMessage] = useState('');
  const [contactPhonePrefix, setContactPhonePrefix] = useState('');
  const [contactPhoneNumber, setContactPhoneNumber] = useState('');

  // Professional Specific State
  const [documentType, setDocumentType] = useState('');
  const [documentFile, setDocumentFile] = useState(null);
  const [identityProgress, setIdentityProgress] = useState(0);
  const [professionalVerificationDetails, setProfessionalVerificationDetails] = useState(null);
  const [selectedProfileType, setSelectedProfileType] = useState('');
  const [glnDetectedProfileType, setGlnDetectedProfileType] = useState('');

  // Facility Specific State
  const [internalRef, setInternalRef] = useState(''); // Internal Reference / PO Number
  const [billingFile, setBillingFile] = useState(null); // Tax/Bill document
  const [billingProgress, setBillingProgress] = useState(0)
  const [facilityIdVerificationDetails, setFacilityIdVerificationDetails] = useState(null);
  const [facilityBillVerificationDetails, setFacilityBillVerificationDetails] = useState(null);

  // Upload persistence state
  const [uploadedDocuments, setUploadedDocuments] = useState({
    identity: null,
    billing: null
  });

  // Helper to generate unique document ID
  const generateDocumentUID = () => {
    return `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  };

  const isProfessional = role === 'worker';
  const isFacility = role === 'company';

  const errorRef = useRef(null);
  const professionalFileInputRef = useRef(null);
  const facilityIdentityFileInputRef = useRef(null);
  const facilityBillingFileInputRef = useRef(null);

  // --- Validation Helpers ---

  /**
   * Validate GLN using EAN-13 algorithm checksum
   * @param {string} gln - 13-digit GLN
   * @returns {boolean} True if valid
   */
  const validateGLNChecksum = (gln) => {
    if (!/^\d{13}$/.test(gln)) return false;

    let sum = 0;
    for (let i = 0; i < 12; i++) {
      let digit = parseInt(gln[i]);
      if (i % 2 === 0) {
        sum += digit;
      } else {
        sum += digit * 3;
      }
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(gln[12]);
  };

  /**
   * Validate Swiss UID format (CHE-XXX.XXX.XXX)
   * @param {string} uid - UID number
   * @returns {boolean} True if valid format
   */
  const validateSwissUID = (uid) => {
    if (!uid) return false;
    // Swiss UID format: CHE-XXX.XXX.XXX
    return /^CHE-\d{3}\.\d{3}\.\d{3}$/.test(uid);
  };

  /**
   * Check if document is expired or expiring soon
   * @param {string} expiryDateString - Expiry date
   * @returns {Object} { isExpired, isExpiringSoon, daysUntilExpiry }
   */
  const checkDocumentExpiry = (expiryDateString) => {
    if (!expiryDateString) return { isExpired: false, isExpiringSoon: false, daysUntilExpiry: null };

    const expiryDate = new Date(expiryDateString);
    const now = new Date();
    const daysUntilExpiry = Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24));

    return {
      isExpired: expiryDate < now,
      isExpiringSoon: daysUntilExpiry < 90 && daysUntilExpiry >= 0, // Within 3 months
      daysUntilExpiry
    };
  };

  // Expose state to parent via ref
  React.useImperativeHandle(ref, () => {
    const hasValidGLN = hasGLN ? (gln && gln.trim().length > 0 && validateGLNChecksum(gln.trim())) : true;
    return {
      isProcessing,
      isReadyToVerify: isProfessional 
        ? (hasValidGLN && documentFile && documentType) 
        : (hasValidGLN && documentFile && billingFile)
    };
  }, [documentFile, documentType, billingFile, isProcessing, isProfessional, hasGLN, gln]);

  // Pass handleVerifyAccount to parent via callback (ref will be populated after definition)
  const handleVerifyRef = React.useRef(null);

  // Notify parent when document readiness changes
  React.useEffect(() => {
    const isReady = isProfessional ? (documentFile && documentType) : (documentFile && billingFile);
    if (onReadyChange && typeof onReadyChange === 'function') {
      onReadyChange(isReady);
    }
  }, [documentFile, documentType, billingFile, isProfessional, onReadyChange]);

  // Notify parent of processing state changes
  React.useEffect(() => {
    if (onProcessingChange && typeof onProcessingChange === 'function') {
      onProcessingChange(isProcessing);
    }
  }, [isProcessing, onProcessingChange]);

  // --- Handlers ---

  const handleGLNChange = (e) => {
    const value = e?.target?.value ?? e ?? '';
    setGln(value);
    if (verificationStatus === 'error') {
      setVerificationStatus(null);
      setVerificationError('');
      setIsAPILimitError(false);
      setIsTimeoutError(false);
      setCountdownSeconds(0);
    }
  };

  const handleFileChange = useCallback((files, type) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (type === 'identity') {
      setDocumentFile(file);
    } else if (type === 'billing') {
      setBillingFile(file);
    }

    setVerificationStatus(null);
    setVerificationError('');
    setIsAPILimitError(false);
    setIsTimeoutError(false);
    setCountdownSeconds(0);
  }, []);

  // --- Main Verification Flow ---

  const handleVerifyAccount = async () => {
    const glnString = gln.trim();
    const isGLNProvided = glnString.length > 0;

    // DEBUG: Log GLN status
    console.log('[DEBUG - GLN Verification] ===== GLN Status =====');
    console.log('[DEBUG] Raw GLN value:', gln);
    console.log('[DEBUG] Trimmed GLN:', glnString);
    console.log('[DEBUG] Is GLN Provided:', isGLNProvided);
    console.log('[DEBUG] GLN Length:', glnString.length);
    console.log('[DEBUG] Role:', role);
    console.log('[DEBUG] Is Professional:', isProfessional);

    // 1. Validation (GLN is optional, documents are mandatory)
    if (isGLNProvided) {
      // Check format first
      if (!/^\d{13}$/.test(glnString)) {
        setVerificationError("GLN must be exactly 13 digits.");
        return;
      }

      // Validate checksum using Luhn algorithm (only for professional GLNs)
      // Note: Facility GLNs may use different validation, so we skip this for companies
      if (isProfessional && !validateGLNChecksum(glnString)) {
        setVerificationError("Invalid GLN checksum. Please verify the number is correct.");
        return;
      }
    }

    if (isProfessional) {
      if (!documentFile || !documentType) {
        setVerificationError('Please select a document type and upload a file');
        return;
      }
    } else {
      // Facility
      if (!documentFile) {
        setVerificationError("Please upload the Responsible Person's ID.");
        return;
      }
      if (!billingFile) {
        setVerificationError("Please upload a billing document.");
        return;
      }
    }

    setIsProcessing(true);
    setVerificationStatus(null);
    setVerificationError('');
    setIsAPILimitError(false);
    setIsTimeoutError(false);
    setShowContactForm(false);
    setIdentityProgress(0);
    setBillingProgress(0);

    try {
      let glnData = null;
      const userId = currentUser.uid;

      // STEP A: Verify GLN (if provided)
      if (isGLNProvided) {
        console.log('[DEBUG - GLN API] ===== Starting GLN Verification =====');
        console.log('[DEBUG] GLN to verify:', glnString);
        console.log('[DEBUG] API type:', isProfessional ? 'healthRegistryAPI' : 'companySearchAPI');

        let result;
        if (isProfessional) {
          console.log('[DEBUG] Calling healthRegistryAPI...');
          result = await healthRegistryAPI(glnString);
        } else {
          console.log('[DEBUG] Calling companySearchAPI...');
          result = await companySearchAPI(glnString);
        }

        console.log('[DEBUG] API Result:', JSON.stringify(result, null, 2));

        if (result.isTimeout) {
          const timeoutError = new Error(result.error || 'TIMEOUT: GLN verification took longer than expected. Please try again.');
          timeoutError.code = 'timeout';
          throw timeoutError;
        }

        if (result.success && result.data) {
          if (isProfessional) {
            if (result.data.entries && result.data.entries.length > 0) {
              glnData = result.data.entries[0];
              console.log('[DEBUG] Professional GLN Data extracted:', JSON.stringify(glnData, null, 2));
            } else {
              console.error('[DEBUG] No entries found in professional result');
              throw new Error('No professional found with this GLN');
            }
          } else {
            // Facility flow - fetch details
            if (result.data.entries && result.data.entries.length > 0) {
              const companyId = result.data.entries[0].id;
              console.log('[DEBUG] Company ID found:', companyId);
              console.log('[DEBUG] Calling companyDetailsAPI...');

              const detailsResult = await companyDetailsAPI(companyId);
              console.log('[DEBUG] Company Details Result:', JSON.stringify(detailsResult, null, 2));

              if (detailsResult.isTimeout) {
                const timeoutError = new Error(detailsResult.error || 'TIMEOUT: Company details retrieval took longer than expected. Please try again.');
                timeoutError.code = 'timeout';
                throw timeoutError;
              }

              if (detailsResult.success) {
                glnData = detailsResult.data;
                console.log('[DEBUG] Facility GLN Data extracted:', JSON.stringify(glnData, null, 2));
              } else {
                console.error('[DEBUG] Failed to retrieve company details');
                throw new Error(detailsResult.error || 'Could not retrieve company details');
              }
            } else {
              console.error('[DEBUG] No entries found in company search result');
              throw new Error('No company found with this GLN');
            }
          }
        } else {
          console.error('[DEBUG] API call failed:', result.error || 'Unknown error');
          const error = new Error(result.error || 'Failed to verify GLN');
          if (result.isTimeout) {
            error.code = 'timeout';
          }
          throw error;
        }
      } else {
        console.log('[DEBUG - GLN API] GLN not provided, skipping API calls');
      }

      // STEP B: Process Documents (OCR/AI) & Save
      if (isProfessional) {
        await processAndSaveProfessional(userId, glnData, isGLNProvided);
      } else {
        await processAndSaveFacility(userId, glnData, isGLNProvided);
      }

      setVerificationStatus('complete');

    } catch (error) {
      handleError(error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Store handleVerifyAccount in ref and notify parent
  React.useEffect(() => {
    handleVerifyRef.current = handleVerifyAccount;
    if (onVerifyClick && typeof onVerifyClick === 'function') {
      onVerifyClick(handleVerifyAccount);
    }
  }, [onVerifyClick]);


  const processAndSaveProfessional = async (userId, glnData, isGLNProvided) => {
    // Upload
    const { downloadURL, storagePath } = await uploadDocument(documentFile, userId, 'identity', setIdentityProgress);

    // AI Process - pass the specific document type for better extraction (swiss_permit, passport, etc.)
    const aiDocumentType = documentType || 'identity';
    const aiResult = await processDocumentWithAI(downloadURL, aiDocumentType, storagePath, getMimeType(documentFile));

    if (!aiResult.success || !aiResult.data) {
      throw new Error('Failed to process document information');
    }

    // Store verification details for display
    if (aiResult.verificationDetails) {
      setProfessionalVerificationDetails(aiResult.verificationDetails);
      console.log('[GLNVerification] Verification details:', aiResult.verificationDetails);
    }

    const extracted = aiResult.data.personalDetails?.identity || {};
    const additionalInfo = aiResult.data.additionalInfo || {};

    // Validate document expiry date
    if (additionalInfo.dateOfExpiry) {
      const expiryCheck = checkDocumentExpiry(additionalInfo.dateOfExpiry);

      if (expiryCheck.isExpired) {
        throw new Error('Document has expired. Please upload a valid, unexpired document.');
      }

      if (expiryCheck.isExpiringSoon) {
        console.warn(`[GLNVerification] Document expiring in ${expiryCheck.daysUntilExpiry} days`);
        // Show warning but allow to continue
        setVerificationError(`Warning: Your document will expire in ${expiryCheck.daysUntilExpiry} days. Please renew it soon.`);
        setTimeout(() => setVerificationError(''), 8000);
      }
    }

    // Cross-Match / Verification Logic
    if (isGLNProvided && glnData) {
      const bagName = (glnData.name || '').toLowerCase();
      const bagFirstName = (glnData.firstName || '').toLowerCase();
      // Use legalLastName if available for more accurate matching
      const extractedLastName = (extracted.legalLastName || extracted.lastName || extracted.surname || '').toLowerCase();
      const extractedFirstName = (extracted.legalFirstName || extracted.firstName || extracted.givenName || '').toLowerCase();

      // Check if names match reasonably well
      const nameMatch = bagName.includes(extractedLastName) || extractedLastName.includes(bagName);
      const firstNameMatch = bagFirstName.includes(extractedFirstName) || extractedFirstName.includes(bagFirstName);

      if (!nameMatch || !firstNameMatch) {
        throw new Error('Document name does not match GLN record. Please check you are using the correct GLN or Document.');
      }
    }

    // Save Profile with full extracted data and document metadata
    await saveWorkerProfile(
      aiResult.data,
      glnData || {},
      {
        downloadURL,
        storagePath,
        fileName: documentFile.name,
        fileType: documentFile.type,
        fileSize: documentFile.size,
        documentType: documentType || 'identity_card'
      },
      isGLNProvided ? gln : null
    );
  };

  const processAndSaveFacility = async (userId, glnData, isGLNProvided) => {
    // Uploads
    const [idUpload, billUpload] = await Promise.all([
      uploadDocument(documentFile, userId, 'responsible_person_id', setIdentityProgress, true),
      uploadDocument(billingFile, userId, 'billing_document', setBillingProgress, true)
    ]);

    // AI Process - pass specific document types for better extraction
    const idDocumentType = documentType || 'identity';
    // Use 'businessDocument' for billing to be more generic (accepts tax docs, registry extracts, etc.)
    const [idResult, billResult] = await Promise.all([
      processDocumentWithAI(idUpload.downloadURL, idDocumentType, idUpload.storagePath, getMimeType(documentFile)),
      processDocumentWithAI(billUpload.downloadURL, 'businessDocument', billUpload.storagePath, getMimeType(billingFile))
    ]);

    if (!idResult.success || !billResult.success) {
      throw new Error('Failed to process one or more documents.');
    }

    // DEBUG: Log raw document processing results
    console.log('[DEBUG - Facility Onboarding] ===== Document Processing Results =====');
    console.log('[DEBUG] ID Document Result:', JSON.stringify(idResult.data, null, 2));
    console.log('[DEBUG] Billing Document Result:', JSON.stringify(billResult.data, null, 2));
    console.log('[DEBUG] GLN Data:', JSON.stringify(glnData, null, 2));
    console.log('[DEBUG] Is GLN Provided:', isGLNProvided);

    // Store verification details for display
    if (idResult.verificationDetails) {
      setFacilityIdVerificationDetails(idResult.verificationDetails);
      console.log('[GLNVerification] ID Verification details:', idResult.verificationDetails);
    }
    if (billResult.verificationDetails) {
      setFacilityBillVerificationDetails(billResult.verificationDetails);
      console.log('[GLNVerification] Billing Verification details:', billResult.verificationDetails);
    }

    // Cross-Match Logic (Facility)
    if (isGLNProvided && glnData) {
      // Check Responsible Person
      const extractedIdentity = idResult.data.personalDetails?.identity || {};
      const responsiblePersons = glnData.responsiblePersons || [];

      const extractedLastName = (extractedIdentity.lastName || extractedIdentity.surname || '').toLowerCase();
      const extractedFirstName = (extractedIdentity.firstName || extractedIdentity.givenName || '').toLowerCase();

      let personMatch = false;
      for (const person of responsiblePersons) {
        const pName = (typeof person === 'string' ? person : person.name || '').toLowerCase();
        if (pName.includes(extractedLastName) && pName.includes(extractedFirstName)) {
          personMatch = true;
          break;
        }
      }

      if (!personMatch) { // Only strict check if GLN data has responsible persons list
        if (responsiblePersons.length > 0) {
          throw new Error('The person on the ID is not listed as a Responsible Person for this GLN facility.');
        }
      }
    }

    // Save Profile with full extracted data and document metadata
    const extractedBill = billResult.data.invoiceDetails || billResult.data.businessDetails || billResult.data.facilityDetails || {};

    // DEBUG: Log extracted billing information
    console.log('[DEBUG - Facility Onboarding] ===== Extracted Billing Data =====');
    console.log('[DEBUG] extractedBill object:', JSON.stringify(extractedBill, null, 2));
    console.log('[DEBUG] Available fields in extractedBill:');
    console.log('  - legalName:', extractedBill.legalName || '(missing)');
    console.log('  - companyName:', extractedBill.companyName || '(missing)');
    console.log('  - uid:', extractedBill.uid || '(missing)');
    console.log('  - vatNumber:', extractedBill.vatNumber || '(missing)');
    console.log('  - taxId:', extractedBill.taxId || '(missing)');
    console.log('  - registrationNumber:', extractedBill.registrationNumber || '(missing)');
    console.log('  - address:', extractedBill.address || extractedBill.billingAddress || '(missing)');
    console.log('  - email:', extractedBill.email || extractedBill.invoiceEmail || '(missing)');

    await saveFacilityProfile(
      glnData || {},
      {
        legalName: extractedBill.legalName || extractedBill.companyName,
        uidNumber: extractedBill.uid || extractedBill.vatNumber || extractedBill.taxId || extractedBill.registrationNumber,
        billingAddress: extractedBill.address || extractedBill.billingAddress || billResult.data.personalDetails?.address,
        invoiceEmail: extractedBill.email || extractedBill.invoiceEmail || billResult.data.personalDetails?.contact?.primaryEmail,
        internalRef,
        responsiblePersonAnalysis: idResult.data,
        billingAnalysis: billResult.data
      },
      {
        idDocument: {
          downloadURL: idUpload.downloadURL,
          storagePath: idUpload.storagePath,
          fileName: documentFile.name,
          fileType: documentFile.type,
          fileSize: documentFile.size,
          documentType: documentType || 'identity_card'
        },
        billingDocument: {
          downloadURL: billUpload.downloadURL,
          storagePath: billUpload.storagePath,
          fileName: billingFile.name,
          fileType: billingFile.type,
          fileSize: billingFile.size,
          documentType: 'businessDocument'
        }
      },
      isGLNProvided ? gln : null
    );
  };

  // --- Helpers ---

  const uploadDocument = async (file, userId, subfolder, onProgress, isFacilityUpload = false) => {
    // Upload flow for documents
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const normalizedFileName = `${baseName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${timestamp}.${fileExtension}`;

    // Standardize path to match Profile section: documents/{userId}/{type}/{filename}
    // For Facilities: documents/facilities/{userId}/{type}/{filename}
    const path = isFacilityUpload
      ? `documents/facilities/${userId}/${subfolder}/${normalizedFileName}`
      : `documents/${userId}/${subfolder}/${normalizedFileName}`;

    console.log(`[GLNVerification] Uploading document: ${file.name}`);
    const downloadURL = await uploadFile(file, path, (progress) => {
      if (onProgress) onProgress(progress);
    });

    // Persist upload metadata to Firestore immediately for recovery on refresh
    try {
      const { doc, updateDoc, arrayUnion, serverTimestamp, getDoc } = await import('firebase/firestore');
      const { db } = await import('../../../services/firebase');

      // Generate unique document ID
      const documentUID = generateDocumentUID();

      // Determine document type for id_type field
      let idType = subfolder;
      if (subfolder === 'identity') {
        idType = documentType || 'identity_card';
      } else if (subfolder === 'responsible_person_id') {
        idType = documentType || 'identity_card';
      } else if (subfolder === 'billing_document') {
        idType = 'billing_document';
      }

      // Create comprehensive document reference
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

      // Get current user document to check existing documents
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      const userData = userDoc.data() || {};
      const existingDocuments = userData.onboardingDocuments || [];

      // Remove any existing document with same subfolder (replace on re-upload)
      const updatedDocuments = existingDocuments.filter(d => d.subfolder !== subfolder);
      updatedDocuments.push(documentReference);

      // Update Firestore with comprehensive document tracking
      await updateDoc(userDocRef, {
        onboardingDocuments: updatedDocuments,
        // Keep backward compatible temporaryUploads for safety
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

      // Update local state
      setUploadedDocuments(prev => ({
        ...prev,
        [subfolder === 'responsible_person_id' ? 'identity' : subfolder]: documentReference
      }));

      console.log(`[GLNVerification] Document reference saved: ${documentUID} (${idType})`);
    } catch (error) {
      console.warn('[GLNVerification] Failed to save upload metadata:', error);
      // Non-critical - continue with verification even if persistence fails
    }

    return { downloadURL, storagePath: path };
  };

  const handleError = (error) => {
    console.error('Processing error:', error);

    const errorCode = error.code || error.message || '';
    const errorMessage = error.message || '';

    // Check for timeout errors first
    const isTimeout = errorCode === 'timeout' || 
                     errorMessage.includes('TIMEOUT') || 
                     errorMessage.toLowerCase().includes('timeout') ||
                     errorMessage.toLowerCase().includes('deadline') ||
                     errorCode === 'functions/deadline-exceeded';

    if (isTimeout) {
      setVerificationError(t('dashboard.onboarding.step4.timeoutError', 'Document processing took longer than expected. Please try again.'));
      setIsTimeoutError(true);
      setIsAPILimitError(false);
      setShowContactForm(false);
      setCountdownSeconds(0);
      setVerificationStatus('error');
      return;
    }

    let userFriendlyMessage = '';

    if (errorCode === 'internal' || errorMessage.toLowerCase() === 'internal') {
      userFriendlyMessage = getFirebaseErrorMessage({ code: 'internal' });
    } else {
      userFriendlyMessage = getFirebaseErrorMessage(error) || errorMessage || 'An error occurred during verification.';
    }

    const msg = userFriendlyMessage.toLowerCase();

    const isLimit = msg.includes('resource') || msg.includes('quota') || msg.includes('limit') || msg.includes('exhausted');

    if (isLimit) {
      const waitTimeMatch = errorMessage.match(/wait (\d+) seconds/i);
      const waitTime = waitTimeMatch ? parseInt(waitTimeMatch[1], 10) : 60;

      setCountdownSeconds(waitTime);
      setVerificationError("Our verification services are currently experiencing high demand. Please wait before trying again.");
      setIsAPILimitError(true);
      setIsTimeoutError(false);
      setShowContactForm(false);
    } else {
      setCountdownSeconds(0);
      setVerificationError(userFriendlyMessage);
      setIsAPILimitError(false);
      setIsTimeoutError(false);
      setShowContactForm(true);
    }

    setVerificationStatus('error');
  };

  const handleSendErrorEmail = () => {
    if (!contactMessage.trim() || !contactPhonePrefix || !contactPhoneNumber.trim()) return;

    const fullPhoneNumber = contactPhonePrefix ? `${contactPhonePrefix} ${contactPhoneNumber}` : contactPhoneNumber;
    const subject = encodeURIComponent('[URGENT ERROR] Onboarding Verification Failure');
    const body = encodeURIComponent(`
[Automated Error Support Onboarding]

User Details:
Name: ${currentUser?.displayName || 'N/A'}
Email: ${currentUser?.email || 'N/A'}
Phone: ${fullPhoneNumber || 'N/A'}
User ID: ${currentUser?.uid || 'N/A'}
Role: ${role || 'N/A'}
Target GLN: ${gln.trim() ? gln : 'No GLN Provided'}
Error Encountered: ${verificationError || 'Unknown'}

User Message:
${contactMessage}
    `);

    const mailtoLink = `mailto:support@medishift.ch?subject=${subject}&body=${body}`;
    window.location.href = mailtoLink;
  };

  const saveWorkerProfile = async (extracted, bag, documentMetadata, glnValue) => {
    const identity = extracted.personalDetails?.identity || {};
    const address = extracted.personalDetails?.address || {};
    const contact = extracted.personalDetails?.contact || {};
    const additionalInfo = extracted.additionalInfo || {};
    const professionalBackground = extracted.professionalBackground || {};

    // FETCH PHONE NUMBER FROM USER DOCUMENT (saved during onboarding phone verification)
    let userPhoneNumber = '';
    let userPhonePrefix = '';
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('../../../services/firebase');
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const userData = userDoc.data() || {};
      
      // Check both nested and flat paths for phone number
      userPhoneNumber = userData?.contact?.primaryPhone || userData?.primaryPhone || '';
      userPhonePrefix = userData?.contact?.primaryPhonePrefix || userData?.primaryPhonePrefix || '';
      
      console.log('[GLNVerification] Fetched phone from user document:', { userPhoneNumber, userPhonePrefix });
    } catch (error) {
      console.warn('[GLNVerification] Failed to fetch phone from user document:', error);
    }

    // Extract proper legal names from the identity document
    // Priority: legalFirstName > firstName > bag.firstName
    const extractedLegalFirstName = identity.legalFirstName || identity.firstName || identity.givenName || '';
    const extractedLegalLastName = identity.legalLastName || identity.lastName || identity.surname || '';

    // For display names, use normalized versions
    const extractedFirstName = identity.firstName || identity.legalFirstName || identity.givenName || '';
    const extractedLastName = identity.lastName || identity.legalLastName || identity.surname || '';

    // Determine permit type from document analysis
    let residencyPermitType = null;
    if (additionalInfo.documentType) {
      const docType = additionalInfo.documentType.toUpperCase();
      if (docType.includes('PERMIT_B')) residencyPermitType = 'B';
      else if (docType.includes('PERMIT_C')) residencyPermitType = 'C';
      else if (docType.includes('PERMIT_L')) residencyPermitType = 'L';
      else if (docType.includes('PERMIT_G')) residencyPermitType = 'G';
      else if (docType.includes('SWISS_PERMIT')) residencyPermitType = 'other';
    }

    // Determine profileType from GLN data (bag) and extract profession data
    let determinedProfileType = '';
    let practiceCantons = [];
    let professionData = null;

    if (bag && bag.professions && Array.isArray(bag.professions) && bag.professions.length > 0) {
      const firstProfession = bag.professions[0];
      const professionObj = firstProfession.profession || firstProfession;
      
      // Extract profession data with all languages
      if (professionObj) {
        professionData = {
          id: professionObj.id || null,
          textEn: professionObj.textEn || professionObj.textEn || '',
          textDe: professionObj.textDe || professionObj.textDe || '',
          textFr: professionObj.textFr || professionObj.textFr || '',
          textIt: professionObj.textIt || professionObj.textIt || ''
        };
      }

      // Map GLN professions to internal profile types
      const professionMap = {
        'medical doctor': 'doctor',
        'physician': 'doctor',
        'pharmacist': 'pharmacist',
        'chiropractor': 'chiropractor',
        'dentist': 'dentist',
        'apothekerin': 'pharmacist',
        'apotheker': 'pharmacist',
        'pharmacien': 'pharmacist',
        'pharmacienne': 'pharmacist',
        'farmacista': 'pharmacist'
      };

      const professionText = professionObj?.textEn || professionObj?.textDe || professionObj?.textFr || professionObj?.textIt || '';
      const profName = professionText.toLowerCase();

      for (const [key, value] of Object.entries(professionMap)) {
        if (profName.includes(key)) {
          determinedProfileType = value;
          break;
        }
      }

      if (determinedProfileType) {
        setGlnDetectedProfileType(determinedProfileType);
        setSelectedProfileType(determinedProfileType);
      }
    }

    // Extract cantons from GLN data if available (often in 'permissions' or similar)
    // Assuming bag structure might vary, but typically has location info or permissions per canton
    // For now, checks if 'cantons' or 'permissions' exists in bag
    if (bag && bag.permissions && Array.isArray(bag.permissions)) {
      practiceCantons = bag.permissions.map(p => p.canton || p.state).filter(Boolean);
      // Deduplicate
      practiceCantons = [...new Set(practiceCantons)];
    }

    const profileData = {
      profileType: selectedProfileType || determinedProfileType,

      verification: {
        GLNStatus: glnValue ? 'Verified' : 'Empty'
      },

      cantons: practiceCantons,

      identity: {
        // Use GLN data if available (verified source), otherwise use extracted data
        legalFirstName: bag.firstName || extractedLegalFirstName,
        legalLastName: bag.name || extractedLegalLastName,
        firstName: bag.firstName || extractedFirstName,
        lastName: bag.name || extractedLastName,
        dateOfBirth: identity.dateOfBirth || null,
        placeOfBirth: identity.placeOfBirth || null,
        gender: identity.gender || null,
        nationality: identity.nationality || null
        // NOTE: ahvNumber not extracted from ID documents - must be added manually in Profile
      },
      // FIXED: Correct address nesting for Profile section
      contact: {
        residentialAddress: {
          street: extractStreetName(address.street) || '',
          number: extractHouseNumber(address.street) || '',
          postalCode: address.postalCode || address.postal || '',
          city: address.city || '',
          canton: address.canton || '',
          country: address.country || 'CH'
        },
        primaryEmail: contact.primaryEmail || currentUser?.email || '',
        primaryPhone: userPhoneNumber || contact.primaryPhone || '',
        primaryPhonePrefix: userPhonePrefix || contact.primaryPhonePrefix || ''
      },
      // FIXED: Map work permit to employmentEligibility (billing section)
      employmentEligibility: residencyPermitType ? {
        workPermit: {
          type: convertPermitTypeToProfileFormat(residencyPermitType), // "B" → "permit_b"
          expiryDate: additionalInfo.dateOfExpiry || null,
          permitNumber: additionalInfo.documentNumber || null,
          issuingCanton: additionalInfo.cantonalReference || null
        }
      } : {},
      // Professional background nested under professionalDetails (matches Profile.js config)
      professionalDetails: {
        mainProfession: professionData ? {
          id: professionData.id,
          textEn: professionData.textEn,
          textDe: professionData.textDe,
          textFr: professionData.textFr,
          textIt: professionData.textIt
        } : null,
        education: professionalBackground.education || [],
        workExperience: professionalBackground.workExperience || [],
        qualifications: [], // Will be populated below with GLN + CV qualifications
        professionalSummary: professionalBackground.professionalSummary || ''
      },
      // Keep residency permit in verification section for reference
      residencyPermit: residencyPermitType ? {
        type: residencyPermitType,
        expiryDate: additionalInfo.dateOfExpiry || null,
        issueDate: additionalInfo.dateOfIssue || null,
        documentNumber: additionalInfo.documentNumber || null,
        issuingAuthority: additionalInfo.issuingAuthority || null,
        cantonalReference: additionalInfo.cantonalReference || null
      } : null,
      verification: {
        identityStatus: 'verified',
        overallVerificationStatus: 'verified',
        verificationDocuments: [
          {
            documentId: `identity_${Date.now()}`,
            type: documentMetadata.documentType || 'identity_card',
            fileName: documentMetadata.fileName,
            originalFileName: documentMetadata.fileName,
            storageUrl: documentMetadata.downloadURL,
            storagePath: documentMetadata.storagePath,
            fileSize: documentMetadata.fileSize,
            fileType: documentMetadata.fileType,
            mimeType: documentMetadata.fileType,
            uploadedAt: new Date().toISOString(),
            status: 'verified',
            verificationStatus: 'verified',
            extractedData: {
              identity: identity,
              address: address,
              additionalInfo: additionalInfo
            }
          }
        ]
      },
      GLN_certified: glnValue,
      verificationStatus: 'verified'
    };

    const filterEmptyQualification = (qual) => {
      if (!qual || typeof qual !== 'object') {
        return false;
      }

      const title = qual.title || qual.name || '';
      const hasTitle = typeof title === 'string' && title.trim().length > 0;

      return hasTitle;
    };

    const cleanQualification = (qual) => {
      const cleaned = {};

      if (qual.title) {
        cleaned.title = qual.title.trim();
      } else if (qual.name) {
        cleaned.title = qual.name.trim();
      }

      if (qual.type && typeof qual.type === 'string' && qual.type.trim().length > 0) {
        cleaned.type = qual.type.trim();
      }

      if (qual.institution && typeof qual.institution === 'string' && qual.institution.trim().length > 0) {
        cleaned.institution = qual.institution.trim();
      } else if (qual.issuingOrganization && typeof qual.issuingOrganization === 'string' && qual.issuingOrganization.trim().length > 0) {
        cleaned.institution = qual.issuingOrganization.trim();
      }

      if (qual.licenseNumber && typeof qual.licenseNumber === 'string' && qual.licenseNumber.trim().length > 0) {
        cleaned.licenseNumber = qual.licenseNumber.trim();
      }

      if (qual.dateObtained && typeof qual.dateObtained === 'string' && qual.dateObtained.trim().length > 0) {
        cleaned.dateObtained = qual.dateObtained.trim();
      } else if (qual.issueDate && typeof qual.issueDate === 'string' && qual.issueDate.trim().length > 0) {
        cleaned.dateObtained = qual.issueDate.trim();
      }

      if (qual.expiryDate && typeof qual.expiryDate === 'string' && qual.expiryDate.trim().length > 0) {
        cleaned.expiryDate = qual.expiryDate.trim();
      }

      if (typeof qual.validForLife === 'boolean') {
        cleaned.validForLife = qual.validForLife;
      }

      if (qual.id) {
        cleaned.id = qual.id;
      }

      if (qual.active !== undefined) {
        cleaned.active = qual.active;
      }

      if (qual.source) {
        cleaned.source = qual.source;
      }

      return cleaned;
    };

    // Add GLN qualifications (CET titles) from BAG API
    if (bag.professions && Array.isArray(bag.professions)) {
      bag.professions.forEach(prof => {
        if (prof.cetTitles && Array.isArray(prof.cetTitles)) {
          prof.cetTitles.forEach(cet => {
            const cetTitle = cet.textEn || cet.textDe || cet.textFr || cet.textIt || '';
            if (cetTitle.trim().length > 0) {
              const qualification = {
                type: 'CET',
                title: cetTitle.trim(),
                source: 'GLN_API'
              };

              if (cet.id) {
                qualification.id = cet.id;
              }

              if (typeof cet.isActive === 'boolean') {
                qualification.active = cet.isActive;
              }

              profileData.professionalDetails.qualifications.push(qualification);
            }
          });
        }
      });
    }

    // Merge CV qualifications with GLN qualifications
    if (professionalBackground.qualifications && Array.isArray(professionalBackground.qualifications)) {
      professionalBackground.qualifications
        .filter(filterEmptyQualification)
        .map(cleanQualification)
        .forEach(qual => {
          if (!qual.source) {
            qual.source = 'CV';
          }
          profileData.professionalDetails.qualifications.push(qual);
        });
    }

    // Filter out any empty qualifications that may have been added
    profileData.professionalDetails.qualifications = profileData.professionalDetails.qualifications
      .filter(filterEmptyQualification)
      .map(cleanQualification);

    const cleanObject = (obj, depth = 0) => {
      if (depth > 20) {
        console.warn('[GLNVerification] Maximum recursion depth reached, truncating object');
        return null;
      }

      if (obj === null || obj === undefined) return null;
      if (obj instanceof Date) return obj.toISOString();
      if (typeof obj === 'function') return undefined;
      if (typeof obj === 'symbol') return undefined;

      if (Array.isArray(obj)) {
        const cleaned = obj.map(item => cleanObject(item, depth + 1)).filter(item => item !== undefined);
        return cleaned.length > 0 ? cleaned : [];
      }

      if (typeof obj === 'object') {
        const cleaned = {};
        for (const [key, value] of Object.entries(obj)) {
          if (value !== undefined) {
            try {
              const cleanedValue = cleanObject(value, depth + 1);
              if (cleanedValue !== undefined) {
                cleaned[key] = cleanedValue;
              }
            } catch (err) {
              console.warn(`[GLNVerification] Error cleaning field ${key}:`, err);
            }
          }
        }
        return Object.keys(cleaned).length > 0 ? cleaned : {};
      }

      return obj;
    };

    console.log('[GLNVerification] Saving professional profile with corrected mappings:', profileData);
    const updateUserProfile = httpsCallable(functions, 'updateUserProfile');

    try {
      const cleanedData = cleanObject(profileData);
      console.log('[GLNVerification] Cleaned data size:', JSON.stringify(cleanedData).length, 'bytes');
      await updateUserProfile(cleanedData);
    } catch (error) {
      console.error('[GLNVerification] Error calling updateUserProfile:', error);
      console.error('[GLNVerification] Error details:', {
        code: error.code,
        message: error.message,
        details: error.details
      });
      throw error;
    }

    // Clean up ONLY temporaryUploads (keep onboardingDocuments for Profile.js to merge)
    // Profile.js will load these and merge them into verification.verificationDocuments
    try {
      const { doc, updateDoc, deleteField } = await import('firebase/firestore');
      const { db } = await import('../../../services/firebase');

      await updateDoc(doc(db, 'users', currentUser.uid), {
        temporaryUploads: deleteField()
        // NOTE: Keeping onboardingDocuments - Profile section needs these as reference
        // They will be merged into verification.verificationDocuments when user visits Profile
      });

      console.log('[GLNVerification] Cleaned up temporaryUploads (kept onboardingDocuments for Profile reference)');
    } catch (error) {
      console.warn('[GLNVerification] Failed to clean up temporary uploads:', error);
    }
  };

  // ... Helpers ...

  const saveFacilityProfile = async (bag, billingInfo, documentMetadata, glnValue) => {
    // Extract responsible person data from their ID document
    const idPersonalDetails = billingInfo.responsiblePersonAnalysis?.personalDetails || {};
    const idIdentity = idPersonalDetails.identity || {};
    const idAdditionalInfo = billingInfo.responsiblePersonAnalysis?.additionalInfo || {};
    const idAddress = idPersonalDetails.address || {};

    // Extract billing/invoice data
    const billingExtracted = billingInfo.billingAnalysis || {};
    const invoiceDetails = billingExtracted.invoiceDetails || billingExtracted.businessDetails || billingExtracted.facilityDetails || {};
    const invoiceAddress = billingInfo.billingAddress || invoiceDetails.billingAddress || invoiceDetails.address || billingExtracted.personalDetails?.address || {};

    // Construct responsible person identity with residential address
    const responsiblePersonIdentity = {
      firstName: idIdentity.firstName || idIdentity.legalFirstName || '',
      lastName: idIdentity.lastName || idIdentity.legalLastName || '',
      dateOfBirth: idIdentity.dateOfBirth || null,
      nationality: idIdentity.nationality || null,
      gender: idIdentity.gender || null,
      documentType: idAdditionalInfo.documentType || null,
      documentNumber: idAdditionalInfo.documentNumber || null,
      documentExpiry: idAdditionalInfo.dateOfExpiry || null,
      // Residential address (from ID document)
      residentialAddress: idAddress.street || idAddress.city ? {
        street: idAddress.street || '',
        city: idAddress.city || '',
        postalCode: idAddress.postalCode || '',
        canton: idAddress.canton || '',
        country: idAddress.country || 'CH'
      } : null
    };

    // Determine facility name - NEVER use person's first name as facility name
    console.log('[DEBUG - Facility Name Determination] ===== Checking Available Sources =====');
    console.log('[DEBUG] GLN bag.name:', bag.name || '(missing)');
    console.log('[DEBUG] invoiceDetails.companyName:', invoiceDetails.companyName || '(missing)');
    console.log('[DEBUG] invoiceDetails.legalName:', invoiceDetails.legalName || '(missing)');
    console.log('[DEBUG] invoiceDetails.name:', invoiceDetails.name || '(missing)');
    console.log('[DEBUG] invoiceDetails.facilityName:', invoiceDetails.facilityName || '(missing)');
    console.log('[DEBUG] billingInfo.legalName:', billingInfo.legalName || '(missing)');

    // Check for company name in businessDetails or invoiceDetails
    const businessDetails = billingExtracted.businessDetails || billingExtracted.invoiceDetails || {};
    console.log('[DEBUG] businessDetails.companyName:', businessDetails.companyName || '(missing)');
    console.log('[DEBUG] businessDetails.legalName:', businessDetails.legalName || '(missing)');

    // Check bank account holder name (often contains company name)
    const bankAccountHolder = billingExtracted.billingInformation?.bankDetails?.accountHolderName || '';
    console.log('[DEBUG] Bank account holder:', bankAccountHolder || '(missing)');

    console.log('[DEBUG] Full bag object:', JSON.stringify(bag, null, 2));
    console.log('[DEBUG] Full invoiceDetails object:', JSON.stringify(invoiceDetails, null, 2));
    console.log('[DEBUG] Full businessDetails object:', JSON.stringify(businessDetails, null, 2));
    console.log('[DEBUG] Full billingInfo object:', JSON.stringify(billingInfo, null, 2));

    // Try multiple sources for facility name
    const facilityName = bag.name
      || invoiceDetails.companyName
      || invoiceDetails.legalName
      || invoiceDetails.name
      || invoiceDetails.facilityName
      || businessDetails.companyName
      || businessDetails.legalName
      || businessDetails.name
      || billingInfo.legalName
      || '';

    console.log('[DEBUG] Determined facilityName:', facilityName || '(EMPTY - ERROR WILL BE THROWN)');

    if (!facilityName) {
      console.error('[ERROR - Facility Name] ===== FACILITY NAME COULD NOT BE DETERMINED =====');
      console.error('[ERROR] All available data sources were empty or undefined');
      console.error('[ERROR] GLN Data (bag):', bag);
      console.error('[ERROR] Billing Info:', billingInfo);
      console.error('[ERROR] Invoice Details:', invoiceDetails);
      console.error('[ERROR] Business Details:', businessDetails);

      // More helpful error message
      const errorMsg = !Object.keys(bag).length
        ? 'Could not extract facility name from billing document. Please ensure you upload a business document (invoice, tax document, or business registration) that clearly shows the company/facility name, not a personal bill.'
        : 'Could not determine facility name from GLN or billing documents. Please ensure documents are correct.';

      throw new Error(errorMsg);
    }

    // Determine legal company name (for official records)
    const legalCompanyName = invoiceDetails.legalName || billingInfo.legalName || bag.name || facilityName;

    const facilityData = {
      role: 'facility',
      profileType: 'pharmacy',
      facilityName: facilityName,
      facilityProfileId: currentUser.uid,
      glnNumber: glnValue,
      responsiblePerson: responsiblePersonIdentity,
      identityLegal: {
        legalCompanyName: legalCompanyName,
        uidNumber: invoiceDetails.uid || invoiceDetails.vatNumber || billingInfo.uidNumber || null
      },
      billingInformation: {
        legalName: legalCompanyName,
        uidNumber: invoiceDetails.uid || invoiceDetails.vatNumber || billingInfo.uidNumber,
        billingAddress: {
          street: invoiceAddress.street || '',
          city: invoiceAddress.city || '',
          postalCode: invoiceAddress.postalCode || '',
          canton: invoiceAddress.canton || '',
          country: invoiceAddress.country || 'CH'
        },
        invoiceEmail: invoiceDetails.email || invoiceDetails.invoiceEmail || billingInfo.invoiceEmail || '',
        internalRef: billingInfo.internalRef || '',
        verificationStatus: 'verified',
        bankName: billingExtracted.billingInformation?.bankDetails?.bankName || null,
        billingContact: billingInfo.billingContact || null
      },
      contactPoints: {
        registeredAddress: {
          street: bag.streetWithNumber || invoiceAddress.street || '',
          city: bag.city || invoiceAddress.city || '',
          postalCode: bag.zip || invoiceAddress.postalCode || '',
          canton: invoiceAddress.canton || bag.canton || '',
          country: 'CH'
        },
        operatingAddress: {
          street: bag.streetWithNumber || invoiceAddress.street || '',
          city: bag.city || invoiceAddress.city || '',
          postalCode: bag.zip || invoiceAddress.postalCode || '',
          canton: invoiceAddress.canton || bag.canton || '',
          country: 'CH'
        },
        generalPhone: invoiceDetails.phone || billingExtracted.personalDetails?.contact?.primaryPhone || '',
        generalEmail: invoiceDetails.email || billingExtracted.personalDetails?.contact?.primaryEmail || currentUser?.email || ''
      },
      verification: {
        identityStatus: 'verified',
        billingStatus: 'verified',
        overallVerificationStatus: 'verified',
        overallStatus: 'verified',
        verificationDocumentsProvided: [
          {
            documentId: `responsible_id_${Date.now()}`,
            type: documentMetadata.idDocument.documentType || 'identity_card',
            fileName: documentMetadata.idDocument.fileName,
            originalFileName: documentMetadata.idDocument.fileName,
            storageUrl: documentMetadata.idDocument.downloadURL,
            storagePath: documentMetadata.idDocument.storagePath,
            fileSize: documentMetadata.idDocument.fileSize,
            fileType: documentMetadata.idDocument.fileType,
            mimeType: documentMetadata.idDocument.fileType,
            uploadedAt: new Date().toISOString(),
            status: 'verified',
            verificationStatus: 'verified',
            extractedData: {
              additionalInfo: idAdditionalInfo,
              identity: idIdentity,
              address: idAddress
            }
          },
          {
            documentId: `billing_${Date.now()}`,
            type: documentMetadata.billingDocument.documentType || 'businessDocument',
            fileName: documentMetadata.billingDocument.fileName,
            originalFileName: documentMetadata.billingDocument.fileName,
            storageUrl: documentMetadata.billingDocument.downloadURL,
            storagePath: documentMetadata.billingDocument.storagePath,
            fileSize: documentMetadata.billingDocument.fileSize,
            fileType: documentMetadata.billingDocument.fileType,
            mimeType: documentMetadata.billingDocument.fileType,
            uploadedAt: new Date().toISOString(),
            status: 'verified',
            verificationStatus: 'verified',
            extractedData: {
              invoiceDetails: invoiceDetails,
              billingAddress: invoiceAddress,
              personalDetails: billingExtracted.personalDetails
            }
          }
        ]
      },
      employees: [{
        uid: currentUser.uid,
        rights: 'admin'
      }]
    };

    console.log('[GLNVerification] Saving facility profile:', facilityData);
    const updateUserProfile = httpsCallable(functions, 'updateUserProfile');
    // Sanitize data to remove undefined values
    await updateUserProfile(JSON.parse(JSON.stringify(facilityData)));

    // Clean up ONLY temporaryUploads (keep onboardingDocuments for Profile.js to merge)
    try {
      const { doc, updateDoc, deleteField } = await import('firebase/firestore');
      const { db } = await import('../../../services/firebase');

      await updateDoc(doc(db, 'users', currentUser.uid), {
        temporaryUploads: deleteField()
        // NOTE: Keeping onboardingDocuments - Profile section needs these as reference
      });

      console.log('[GLNVerification] Cleaned up temporaryUploads (kept onboardingDocuments for Profile reference)');
    } catch (error) {
      console.warn('[GLNVerification] Failed to clean up temporary uploads:', error);
    }
  };

  // DISABLED: Load previously uploaded documents on mount (for recovery after refresh)
  // Restoration disabled due to issues with processing restored documents
  /*
  useEffect(() => {
    const loadPreviousUploads = async () => {
      if (!currentUser) return;

      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../../../services/firebase');

        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const userData = userDoc.data();

        // Try new onboardingDocuments array first, fall back to temporaryUploads
        const onboardingDocs = userData?.onboardingDocuments || [];
        const tempUploads = userData?.temporaryUploads || {};

        if (onboardingDocs.length > 0) {
          console.log('[GLNVerification] Found previous document references:', onboardingDocs);

          // Reconstruct uploadedDocuments state from document references
          const documentsState = {};
          onboardingDocs.forEach(docRef => {
            // Map subfolder to state key
            const key = docRef.subfolder === 'responsible_person_id' ? 'identity' : docRef.subfolder;
            documentsState[key] = docRef;

            // Also restore document type if it's an identity document
            if (docRef.id_type && (docRef.subfolder === 'identity' || docRef.subfolder === 'responsible_person_id')) {
              setDocumentType(docRef.id_type);
            }

            // Create mock file objects for UI display
            if (docRef.subfolder === 'identity' || docRef.subfolder === 'responsible_person_id') {
              setDocumentFile({
                name: docRef.fileName,
                size: docRef.fileSize,
                type: docRef.fileType,
                _restored: true,
                _downloadURL: docRef.downloadURL,
                _storagePath: docRef.storagePath
              });
            } else if (docRef.subfolder === 'billing_document') {
              setBillingFile({
                name: docRef.fileName,
                size: docRef.fileSize,
                type: docRef.fileType,
                _restored: true,
                _downloadURL: docRef.downloadURL,
                _storagePath: docRef.storagePath
              });
            }
          });

          setUploadedDocuments(documentsState);

          // Show info message to user
          setVerificationError(`📋 ${onboardingDocs.length} document${onboardingDocs.length > 1 ? 's' : ''} restored. You can continue from where you left off.`);
          setTimeout(() => setVerificationError(''), 6000);
        } else if (Object.keys(tempUploads).length > 0) {
          // Fallback to old temporaryUploads format
          console.log('[GLNVerification] Found previous uploads (legacy):', tempUploads);
          setUploadedDocuments({
            identity: tempUploads.identity || tempUploads.responsible_person_id || null,
            billing: tempUploads.billing_document || null
          });

          // Show info message to user
          setVerificationError('Previous uploads found. You can continue from where you left off.');
          setTimeout(() => setVerificationError(''), 5000);
        }
      } catch (error) {
        console.warn('[GLNVerification] Failed to load previous uploads:', error);
      }
    };

    loadPreviousUploads();
  }, [currentUser]);
  */

  useEffect(() => {
    if (verificationStatus === 'complete') {
      setTimeout(() => onComplete(), 1500);
    }
  }, [verificationStatus, onComplete]);

  useEffect(() => {
    if ((isAPILimitError || isTimeoutError || showContactForm) && errorRef.current) {
      setTimeout(() => {
        errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }, [isAPILimitError, isTimeoutError, showContactForm]);

  useEffect(() => {
    if (countdownSeconds > 0) {
      const timer = setInterval(() => {
        setCountdownSeconds((prev) => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [countdownSeconds]);


  // --- Render ---

  // Determine if main action button should be enabled
  const isReadyToVerify = (() => {
    if (isProfessional) {
      // GLN is required when hasGLN is true
      const hasValidGLN = hasGLN ? (gln && gln.trim().length > 0 && validateGLNChecksum(gln.trim())) : true;
      // If GLN is checked, profession is auto-detected from GLN. If not checked, require manual selection
      const hasProfession = hasGLN ? (gln && glnDetectedProfileType) : selectedProfileType;
      return hasValidGLN && documentFile && documentType && hasProfession;
    } else {
      // GLN is required when hasGLN is true
      const hasValidGLN = hasGLN ? (gln && gln.trim().length > 0 && validateGLNChecksum(gln.trim())) : true;
      return hasValidGLN && documentFile && billingFile;
    }
  })();

  if (!showHeader && (isProfessional || isFacility)) {
    if (isProfessional) {
      return (
        <>
          {/* Configuration Section - Rendered separately when showHeader is false */}
          <div className="space-y-6" data-configuration-section>
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold text-lg mb-2">{t('dashboard.onboarding.verificationConfiguration.title', 'Configuration de la Vérification')}</h3>
              <p className="text-sm text-muted-foreground">{t('dashboard.onboarding.verificationConfiguration.subtitle', 'Veuillez vérifier votre statut professionnel')}</p>
            </div>

            {/* GLN Section */}
            {hasGLN && (
              <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                <div className="bg-primary/5 p-4 rounded-lg flex gap-3 text-sm text-muted-foreground border border-primary/10">
                  <FiInfo className="w-5 h-5 flex-shrink-0 text-primary mt-0.5" />
                  <p>
                    {isProfessional 
                      ? "Professional GLN number is required. Your profession will be automatically detected from your GLN number."
                      : "Company GLN number is required for facility verification."}
                  </p>
                </div>
                <PersonnalizedInputField
                  label={isProfessional ? 'Professional GLN *' : 'Company GLN *'}
                  value={gln}
                  onChange={handleGLNChange}
                  placeholder="760100..."
                  required={true}
                  error={verificationError && !showContactForm && !isAPILimitError && !isTimeoutError ? verificationError : ''}
                />
              </div>
            )}

            {/* Profession Selection - Hidden when GLN is checked (auto-detected from GLN) */}
            {!hasGLN && (
              <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                <h3 className="font-semibold text-lg">{t('dashboard.onboarding.profileType.title', 'Profession')}</h3>
                <SimpleDropdown
                  label={t('dashboard.onboarding.profileType.label', 'Select your profession')}
                  options={[
                    { value: 'nurse', label: t('dashboard.onboarding.profileType.nurse', 'Nurse') },
                    { value: 'pharmacy_assistant', label: t('dashboard.onboarding.profileType.pharmacy_assistant', 'Pharmacy Assistant') },
                    { value: 'pharmacy_technician', label: t('dashboard.onboarding.profileType.pharmacy_technician', 'Pharmacy Technician') },
                    { value: 'medical_assistant', label: t('dashboard.onboarding.profileType.medical_assistant', 'Medical Assistant') },
                    { value: 'caregiver', label: t('dashboard.onboarding.profileType.caregiver', 'Caregiver') }
                  ]}
                  value={selectedProfileType}
                  onChange={(value) => setSelectedProfileType(value)}
                  placeholder={t('dashboard.onboarding.profileType.placeholder', 'Select profession')}
                  required={true}
                />
              </div>
            )}

            {/* Profession Display when GLN is provided and detected */}
            {gln && glnDetectedProfileType && (
              <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                <h3 className="font-semibold text-lg">{t('dashboard.onboarding.profileType.title', 'Profession')}</h3>
                <div className="p-3 bg-primary/5 border border-primary/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FiCheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium">
                      {glnDetectedProfileType === 'doctor' && t('dashboard.onboarding.profileType.doctor', 'Doctor')}
                      {glnDetectedProfileType === 'pharmacist' && t('dashboard.onboarding.profileType.pharmacist', 'Pharmacist')}
                      {glnDetectedProfileType === 'dentist' && t('dashboard.onboarding.profileType.dentist', 'Dentist')}
                      {glnDetectedProfileType === 'chiropractor' && t('dashboard.onboarding.profileType.chiropractor', 'Chiropractor')}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t('dashboard.onboarding.profileType.autoDetected', 'Automatically detected from GLN')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Documents Section - Rendered separately when showHeader is false */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-6" data-documents-section>
            <h3 className="font-semibold text-lg">Verification Documents</h3>

            {isProfessional && (
              <div className="space-y-3">
                <label className="block text-sm font-medium">Identity Document</label>
                <SimpleDropdown
                  label=""
                  options={DOCUMENT_TYPES}
                  value={documentType}
                  onChange={(value) => setDocumentType(value)}
                  placeholder="Select document type"
                  required={false}
                />

                {documentFile ? (
                  <div className="border border-border/60 rounded-lg p-4 bg-card shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                          <FiFileText className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{documentFile.name}</p>
                            {documentFile._restored && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-transparent text-green-700 border border-green-700">
                                ✓ Restored
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {(documentFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          ref={professionalFileInputRef}
                          type="file"
                          accept=".pdf,.jpg,.png,.jpeg"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleFileChange([e.target.files[0]], 'identity');
                              e.target.value = '';
                            }
                          }}
                          style={{ display: 'none' }}
                        />
                        <button
                          onClick={() => {
                            if (professionalFileInputRef.current) {
                              professionalFileInputRef.current.click();
                            }
                          }}
                          className="flex items-center justify-center w-8 h-8 text-muted-foreground hover:text-primary transition-colors"
                          title="Replace Document"
                          aria-label="Replace Document"
                        >
                          <FiEdit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setDocumentFile(null);
                            setIdentityProgress(0);
                          }}
                          className="flex items-center justify-center w-8 h-8 text-muted-foreground hover:text-destructive transition-colors"
                          title="Remove Document"
                          aria-label="Remove Document"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <UploadFile
                    onChange={(f) => handleFileChange(f, 'identity')}
                    accept=".pdf,.jpg,.png,.jpeg"
                    maxFileSize={5}
                    label="Upload Identity Document"
                    documentName="identity_document"
                    value={[]}
                    isLoading={isProcessing}
                    progress={identityProgress}
                  />
                )}
              </div>
            )}
          </div>
        </>
      );
    }
    
    if (isFacility) {
      return (
        <div className="bg-card border border-border rounded-xl p-5 space-y-6" data-documents-section>
          <h3 className="font-semibold text-lg">Verification Documents</h3>
          <>
            <div className="space-y-3">
              <label className="block text-sm font-medium">1. Responsible Person Identity Document</label>
              <p className="text-xs text-muted-foreground mb-0">Upload ID card of a responsible person listed in the registry.</p>
              <SimpleDropdown
                label=""
                options={DOCUMENT_TYPES}
                value={documentType}
                onChange={(value) => setDocumentType(value)}
                placeholder="Select ID Type"
                required={false}
              />

              {documentFile ? (
                <div className="border border-border/60 rounded-lg p-4 bg-card shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <FiFileText className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{documentFile.name}</p>
                          {documentFile._restored && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-transparent text-green-700 border border-green-700">
                              ✓ Restored
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {(documentFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        ref={facilityIdentityFileInputRef}
                        type="file"
                        accept=".pdf,.jpg,.png,.jpeg"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileChange([e.target.files[0]], 'identity');
                            e.target.value = '';
                          }
                        }}
                        style={{ display: 'none' }}
                      />
                      <button
                        onClick={() => {
                          if (facilityIdentityFileInputRef.current) {
                            facilityIdentityFileInputRef.current.click();
                          }
                        }}
                        className="flex items-center justify-center w-8 h-8 text-muted-foreground hover:text-primary transition-colors"
                        title="Replace Document"
                        aria-label="Replace Document"
                      >
                        <FiEdit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setDocumentFile(null);
                          setIdentityProgress(0);
                        }}
                        className="flex items-center justify-center w-8 h-8 text-muted-foreground hover:text-destructive transition-colors"
                        title="Remove Document"
                        aria-label="Remove Document"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <UploadFile
                  onChange={(f) => handleFileChange(f, 'identity')}
                  accept=".pdf,.jpg,.png,.jpeg"
                  maxFileSize={5}
                  label="Upload ID"
                  documentName="responsible_id"
                  value={[]}
                  isLoading={isProcessing}
                  progress={identityProgress}
                />
              )}
            </div>

            <div className="space-y-3 pt-4 border-t border-border/50">
              <label className="block text-sm font-medium">2. Billing / Tax Document</label>
              <p className="text-xs text-muted-foreground mb-0">Upload a recent bill or tax document for facility verification.</p>

              {billingFile ? (
                <div className="border border-border/60 rounded-lg p-4 bg-card shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <FiFileText className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{billingFile.name}</p>
                          {billingFile._restored && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-transparent text-green-700 border border-green-700">
                              ✓ Restored
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {(billingFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        ref={facilityBillingFileInputRef}
                        type="file"
                        accept=".pdf,.jpg,.png,.jpeg"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileChange([e.target.files[0]], 'billing');
                            e.target.value = '';
                          }
                        }}
                        style={{ display: 'none' }}
                      />
                      <button
                        onClick={() => {
                          if (facilityBillingFileInputRef.current) {
                            facilityBillingFileInputRef.current.click();
                          }
                        }}
                        className="flex items-center justify-center w-8 h-8 text-muted-foreground hover:text-primary transition-colors"
                        title="Replace Document"
                        aria-label="Replace Document"
                      >
                        <FiEdit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setBillingFile(null);
                          setBillingProgress(0);
                        }}
                        className="flex items-center justify-center w-8 h-8 text-muted-foreground hover:text-destructive transition-colors"
                        title="Remove Document"
                        aria-label="Remove Document"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <UploadFile
                  onChange={(f) => handleFileChange(f, 'billing')}
                  accept=".pdf,.jpg,.png,.jpeg"
                  maxFileSize={5}
                  label="Upload Bill"
                  documentName="billing_doc"
                  value={[]}
                  isLoading={isProcessing}
                  progress={billingProgress}
                />
              )}
            </div>

            <div className="pt-2">
              <PersonnalizedInputField
                label="Internal Reference / PO Number (Optional)"
                value={internalRef}
                onChange={(e) => setInternalRef(e.target.value)}
                placeholder="e.g. PO-2024-001"
              />
            </div>
          </>
        </div>
      );
    }
  }

  return (
    <div className="space-y-6">
      {showHeader && (
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold">
            {t('dashboard.onboarding.verify_account', 'Verify Your Account')}
          </h2>
          <p className="text-muted-foreground text-sm mt-2">
            Please provide your details below. We use secure AI verification to certify your account.
          </p>
        </div>
      )}

      {/* Original nested grid layout for when showHeader is true */}
      {isProfessional && showHeader && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: All Configuration Elements */}
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold text-lg mb-2">{t('dashboard.onboarding.verificationConfiguration.title', 'Configuration de la Vérification')}</h3>
              <p className="text-sm text-muted-foreground">{t('dashboard.onboarding.verificationConfiguration.subtitle', 'Veuillez vérifier votre statut professionnel')}</p>
            </div>

            {/* GLN Section */}
            {hasGLN && (
              <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                <div className="bg-primary/5 p-4 rounded-lg flex gap-3 text-sm text-muted-foreground border border-primary/10">
                  <FiInfo className="w-5 h-5 flex-shrink-0 text-primary mt-0.5" />
                  <p>
                    {isProfessional 
                      ? "Professional GLN number is required. Your profession will be automatically detected from your GLN number."
                      : "Company GLN number is required for facility verification."}
                  </p>
                </div>
                <PersonnalizedInputField
                  label={isProfessional ? 'Professional GLN *' : 'Company GLN *'}
                  value={gln}
                  onChange={handleGLNChange}
                  placeholder="760100..."
                  required={true}
                  error={verificationError && !showContactForm && !isAPILimitError && !isTimeoutError ? verificationError : ''}
                />
              </div>
            )}

            {/* Profession Selection - Hidden when GLN is checked (auto-detected from GLN) */}
            {!hasGLN && (
              <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                <h3 className="font-semibold text-lg">{t('dashboard.onboarding.profileType.title', 'Profession')}</h3>
                <SimpleDropdown
                  label={t('dashboard.onboarding.profileType.label', 'Select your profession')}
                  options={[
                    { value: 'nurse', label: t('dashboard.onboarding.profileType.nurse', 'Nurse') },
                    { value: 'pharmacy_assistant', label: t('dashboard.onboarding.profileType.pharmacy_assistant', 'Pharmacy Assistant') },
                    { value: 'pharmacy_technician', label: t('dashboard.onboarding.profileType.pharmacy_technician', 'Pharmacy Technician') },
                    { value: 'medical_assistant', label: t('dashboard.onboarding.profileType.medical_assistant', 'Medical Assistant') },
                    { value: 'caregiver', label: t('dashboard.onboarding.profileType.caregiver', 'Caregiver') }
                  ]}
                  value={selectedProfileType}
                  onChange={(value) => setSelectedProfileType(value)}
                  placeholder={t('dashboard.onboarding.profileType.placeholder', 'Select profession')}
                  required={true}
                />
              </div>
            )}

            {/* Profession Display when GLN is provided and detected */}
            {gln && glnDetectedProfileType && (
              <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                <h3 className="font-semibold text-lg">{t('dashboard.onboarding.profileType.title', 'Profession')}</h3>
                <div className="p-3 bg-primary/5 border border-primary/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FiCheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium">
                      {glnDetectedProfileType === 'doctor' && t('dashboard.onboarding.profileType.doctor', 'Doctor')}
                      {glnDetectedProfileType === 'pharmacist' && t('dashboard.onboarding.profileType.pharmacist', 'Pharmacist')}
                      {glnDetectedProfileType === 'dentist' && t('dashboard.onboarding.profileType.dentist', 'Dentist')}
                      {glnDetectedProfileType === 'chiropractor' && t('dashboard.onboarding.profileType.chiropractor', 'Chiropractor')}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t('dashboard.onboarding.profileType.autoDetected', 'Automatically detected from GLN')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Documents Only */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-6">
            <h3 className="font-semibold text-lg">Verification Documents</h3>

            {isProfessional && (
              <div className="space-y-3">
                <label className="block text-sm font-medium">Identity Document</label>
                <SimpleDropdown
                  label=""
                  options={DOCUMENT_TYPES}
                  value={documentType}
                  onChange={(value) => setDocumentType(value)}
                  placeholder="Select document type"
                  required={false}
                />

                {documentFile ? (
                  <div className="border border-border/60 rounded-lg p-4 bg-card shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                          <FiFileText className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{documentFile.name}</p>
                            {documentFile._restored && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-transparent text-green-700 border border-green-700">
                                ✓ Restored
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {(documentFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          ref={professionalFileInputRef}
                          type="file"
                          accept=".pdf,.jpg,.png,.jpeg"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleFileChange([e.target.files[0]], 'identity');
                              e.target.value = '';
                            }
                          }}
                          style={{ display: 'none' }}
                        />
                        <button
                          onClick={() => {
                            if (professionalFileInputRef.current) {
                              professionalFileInputRef.current.click();
                            }
                          }}
                          className="flex items-center justify-center w-8 h-8 text-muted-foreground hover:text-primary transition-colors"
                          title="Replace Document"
                          aria-label="Replace Document"
                        >
                          <FiEdit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setDocumentFile(null);
                            setIdentityProgress(0);
                          }}
                          className="flex items-center justify-center w-8 h-8 text-muted-foreground hover:text-destructive transition-colors"
                          title="Remove Document"
                          aria-label="Remove Document"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <UploadFile
                    onChange={(f) => handleFileChange(f, 'identity')}
                    accept=".pdf,.jpg,.png,.jpeg"
                    maxFileSize={5}
                    label="Upload Identity Document"
                    documentName="identity_document"
                    value={[]}
                    isLoading={isProcessing}
                    progress={identityProgress}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Documents Section for Facilities */}
      {isFacility && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-6">
          <h3 className="font-semibold text-lg">Verification Documents</h3>
          <>
            <div className="space-y-3">
              <label className="block text-sm font-medium">1. Responsible Person Identity Document</label>
              <p className="text-xs text-muted-foreground mb-0">Upload ID card of a responsible person listed in the registry.</p>
              <SimpleDropdown
                label=""
                options={DOCUMENT_TYPES}
                value={documentType}
                onChange={(value) => setDocumentType(value)}
                placeholder="Select ID Type"
                required={false}
              />

              {/* Document Display/Upload */}
              {documentFile ? (
                <div className="border border-border/60 rounded-lg p-4 bg-card shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <FiFileText className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{documentFile.name}</p>
                          {documentFile._restored && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-transparent text-green-700 border border-green-700">
                              ✓ Restored
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {(documentFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        ref={facilityIdentityFileInputRef}
                        type="file"
                        accept=".pdf,.jpg,.png,.jpeg"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileChange([e.target.files[0]], 'identity');
                            e.target.value = '';
                          }
                        }}
                        style={{ display: 'none' }}
                      />
                      <button
                        onClick={() => {
                          if (facilityIdentityFileInputRef.current) {
                            facilityIdentityFileInputRef.current.click();
                          }
                        }}
                        className="flex items-center justify-center w-8 h-8 text-muted-foreground hover:text-primary transition-colors"
                        title="Replace Document"
                        aria-label="Replace Document"
                      >
                        <FiEdit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setDocumentFile(null);
                          setIdentityProgress(0);
                        }}
                        className="flex items-center justify-center w-8 h-8 text-muted-foreground hover:text-destructive transition-colors"
                        title="Remove Document"
                        aria-label="Remove Document"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <UploadFile
                  onChange={(f) => handleFileChange(f, 'identity')}
                  accept=".pdf,.jpg,.png,.jpeg"
                  maxFileSize={5}
                  label="Upload ID"
                  documentName="responsible_id"
                  value={[]}
                  isLoading={isProcessing}
                  progress={identityProgress}
                />
              )}
            </div>

            <div className="space-y-3 pt-4 border-t border-border/50">
              <label className="block text-sm font-medium">2. Billing / Tax Document</label>
              <p className="text-xs text-muted-foreground mb-0">Upload a recent bill or tax document for facility verification.</p>

              {/* Document Display/Upload */}
              {billingFile ? (
                <div className="border border-border/60 rounded-lg p-4 bg-card shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <FiFileText className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{billingFile.name}</p>
                          {billingFile._restored && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-transparent text-green-700 border border-green-700">
                              ✓ Restored
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {(billingFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        ref={facilityBillingFileInputRef}
                        type="file"
                        accept=".pdf,.jpg,.png,.jpeg"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileChange([e.target.files[0]], 'billing');
                            e.target.value = '';
                          }
                        }}
                        style={{ display: 'none' }}
                      />
                      <button
                        onClick={() => {
                          if (facilityBillingFileInputRef.current) {
                            facilityBillingFileInputRef.current.click();
                          }
                        }}
                        className="flex items-center justify-center w-8 h-8 text-muted-foreground hover:text-primary transition-colors"
                        title="Replace Document"
                        aria-label="Replace Document"
                      >
                        <FiEdit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setBillingFile(null);
                          setBillingProgress(0);
                        }}
                        className="flex items-center justify-center w-8 h-8 text-muted-foreground hover:text-destructive transition-colors"
                        title="Remove Document"
                        aria-label="Remove Document"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <UploadFile
                  onChange={(f) => handleFileChange(f, 'billing')}
                  accept=".pdf,.jpg,.png,.jpeg"
                  maxFileSize={5}
                  label="Upload Bill"
                  documentName="billing_doc"
                  value={[]}
                  isLoading={isProcessing}
                  progress={billingProgress}
                />
              )}
            </div>

            <div className="pt-2">
              <PersonnalizedInputField
                label="Internal Reference / PO Number (Optional)"
                value={internalRef}
                onChange={(e) => setInternalRef(e.target.value)}
                placeholder="e.g. PO-2024-001"
              />
            </div>
          </>
        </div>
      )}

      {/* Main Action Button */}
      {!hideMainButton && (
        <Button
          variant="primary"
          onClick={onVerifyClick || handleVerifyAccount}
          disabled={isProcessing || !isReadyToVerify}
          className="w-full py-6 shadow-lg hover:shadow-xl transition-all"
        >
          {isProcessing ? (
            <>
              <FiLoader className="animate-spin mr-2" />
              Verifying Account...
            </>
          ) : (
            'Verify Account'
          )}
        </Button>
      )}

      {/* Error States */}
      {/* 1. API Limit / System Capacity Error */}
      {isAPILimitError && (
        <div ref={errorRef} className="relative overflow-hidden p-6 bg-white border-2 border-[var(--yellow-2)] rounded-xl shadow-lg flex gap-4 text-[var(--yellow-4)] animate-in fade-in slide-in-from-bottom-2" style={{ boxShadow: 'var(--shadow-elevated)' }}>
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-[var(--yellow-2)]/20 flex items-center justify-center border-2 border-[var(--yellow-2)]">
              <FiInfo className="w-6 h-6 text-[var(--yellow-4)]" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-base mb-2 text-[var(--yellow-4)]">Service High Demand</h4>
            <p className="text-sm mb-3 leading-relaxed text-[var(--yellow-4)]/90">{verificationError}</p>
            {countdownSeconds > 0 && (
              <div className="mt-4 flex items-center gap-3">
                <div className="flex items-center gap-3 bg-[var(--yellow-1)] px-4 py-2.5 rounded-lg border border-[var(--yellow-2)] shadow-sm">
                  <div className="relative">
                    <FiLoader className="w-5 h-5 animate-spin text-[var(--yellow-4)]" />
                  </div>
                  <span className="text-sm font-semibold text-[var(--yellow-4)]">
                    Please wait <span className="font-bold text-lg mx-1">{countdownSeconds}</span> second{countdownSeconds !== 1 ? 's' : ''} before trying again
                  </span>
                </div>
              </div>
            )}
            {countdownSeconds === 0 && isAPILimitError && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-[var(--green-1)] rounded-lg border border-[var(--green-3)]">
                <FiCheckCircle className="w-4 h-4 text-[var(--green-4)]" />
                <p className="text-sm font-medium text-[var(--green-4)]">
                  You can now try again.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Timeout Error with Restart Option */}
      {isTimeoutError && (
        <div ref={errorRef} className="relative overflow-hidden p-6 bg-white border-2 border-[var(--yellow-2)] rounded-xl shadow-lg flex gap-4 text-[var(--yellow-4)] animate-in fade-in slide-in-from-bottom-2" style={{ boxShadow: 'var(--shadow-elevated)' }}>
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-[var(--yellow-2)]/20 flex items-center justify-center border-2 border-[var(--yellow-2)]">
              <FiAlertTriangle className="w-6 h-6 text-[var(--yellow-4)]" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-base mb-2 text-[var(--yellow-4)]">{t('dashboard.onboarding.step4.timeoutTitle', 'Processing Timeout')}</h4>
            <p className="text-sm mb-4 leading-relaxed text-[var(--yellow-4)]/90">{verificationError}</p>
            <p className="text-xs mb-4 text-[var(--yellow-4)]/80 leading-relaxed">
              {t('dashboard.onboarding.step4.timeoutDescription', 'Document processing took longer than expected. This can happen with large files or during high server load. Please try again.')}
            </p>
            <Button
              variant="primary"
              onClick={() => {
                setIsTimeoutError(false);
                setVerificationStatus(null);
                setVerificationError('');
                setIdentityProgress(0);
                setBillingProgress(0);
              }}
              className="w-full mt-2"
              style={{ backgroundColor: 'var(--color-logo-1)', color: 'white' }}
            >
              {t('dashboard.onboarding.step4.restartProcess', 'Restart Process')}
            </Button>
          </div>
        </div>
      )}

      {/* 3. Generic/Verification Error with Contact Form */}
      {showContactForm && (
        <div ref={errorRef} className="mt-8 relative overflow-hidden p-6 bg-white rounded-xl border-2 border-[var(--red-2)] shadow-lg animate-in fade-in slide-in-from-bottom-4" style={{ boxShadow: 'var(--shadow-elevated)' }}>
          <div className="flex items-start gap-4 mb-5">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-[var(--red-2)]/20 flex items-center justify-center border-2 border-[var(--red-2)]">
                <FiAlertCircle className="w-6 h-6 text-[var(--red-4)]" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg mb-2 text-[var(--red-4)]">Verification Failed</h3>
              <p className="text-sm text-[var(--red-4)]/90 mb-2 leading-relaxed">{verificationError}</p>
              <p className="text-xs text-[var(--red-4)]/80 mt-3 leading-relaxed">
                Please review your inputs. If you believe this is an error, contact our urgent support below.
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-5 border-t-2 border-[var(--red-2)]/30">
            <style>{`
              .error-form-inputs .boxed-inputfield-input,
              .error-form-inputs .boxed-dropdown-container {
                border: 1px solid black !important;
              }
              .error-form-inputs .boxed-inputfield-input:hover,
              .error-form-inputs .boxed-dropdown-container:hover {
                border: 1px solid black !important;
              }
              .error-form-inputs .boxed-inputfield-input:focus,
              .error-form-inputs .boxed-dropdown-container:focus {
                border: 1px solid black !important;
              }
            `}</style>
            <h4 className="font-semibold text-sm flex items-center gap-2 text-[var(--red-4)]">
              <div className="w-8 h-8 rounded-lg bg-[var(--red-1)] flex items-center justify-center">
                <FiMail className="w-4 h-4 text-[var(--red-4)]" />
              </div>
              Contact Urgent Support
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end error-form-inputs">
              <SimpleDropdown
                label="Phone Prefix"
                options={phonePrefixOptions}
                value={contactPhonePrefix}
                onChange={setContactPhonePrefix}
                placeholder="+41"
              />
              <PersonnalizedInputField
                label="Phone Number"
                value={contactPhoneNumber}
                onChange={(e) => setContactPhoneNumber(e.target.value)}
                placeholder="79 000 0000"
              />
            </div>

            <textarea
              value={contactMessage}
              onChange={(e) => setContactMessage(e.target.value)}
              placeholder="Describe the issue you are facing..."
              className="w-full px-4 py-3 border border-black rounded-lg bg-white min-h-[100px] text-sm focus:outline-none transition-all"
              style={{ fontFamily: 'var(--font-family-text)' }}
            />

            <Button
              variant="outline"
              onClick={handleSendErrorEmail}
              disabled={!contactMessage.trim()}
              className="w-full border border-black bg-white text-[var(--red-4)] hover:bg-[var(--red-1)] transition-all font-semibold shadow-sm"
              style={{
                fontFamily: 'var(--font-family-text)',
                transition: 'var(--transition-normal)'
              }}
            >
              Report Issue via Email
            </Button>
          </div>
        </div>
      )}

      {/* Success State */}
      {/* Verification Details Display */}
      {verificationStatus === 'complete' && (
        <>
          {isProfessional && professionalVerificationDetails && (
            <VerificationDetails
              verificationDetails={professionalVerificationDetails}
              documentName="Identity Document"
            />
          )}
          {isFacility && facilityIdVerificationDetails && (
            <VerificationDetails
              verificationDetails={facilityIdVerificationDetails}
              documentName="Responsible Person ID"
            />
          )}
          {isFacility && facilityBillVerificationDetails && (
            <VerificationDetails
              verificationDetails={facilityBillVerificationDetails}
              documentName="Billing Document"
            />
          )}
        </>
      )}

      {verificationStatus === 'complete' && (
        <div className="p-6 bg-black/95 border border-gray-800 rounded-xl flex items-start gap-4 text-left animate-in fade-in slide-in-from-bottom-2 shadow-xl">
          {/* Success Icon */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
              <FiCheckCircle className="w-7 h-7 text-white" />
            </div>
          </div>

          {/* Success Message Content */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-1">
              Account Successfully Verified!
            </h3>
            <p className="text-gray-300 text-sm">
              {isProfessional
                ? "Your professional profile is now active. Redirecting to complete your profile setup..."
                : "Your facility profile is now active. Redirecting to complete your profile setup..."
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
});

GLNVerificationStep.propTypes = {
  role: PropTypes.string.isRequired,
  onComplete: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
  showHeader: PropTypes.bool,
  hasGLN: PropTypes.bool,
  hideMainButton: PropTypes.bool,
  onVerifyClick: PropTypes.func,
  onReadyChange: PropTypes.func,
  onProcessingChange: PropTypes.func
};

export default GLNVerificationStep;
