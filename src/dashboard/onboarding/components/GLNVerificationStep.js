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
import { FiAlertCircle, FiCheckCircle, FiLoader, FiMail, FiInfo, FiEdit, FiTrash2, FiFileText } from 'react-icons/fi';
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

  // --- Validation Helpers ---

  /**
   * Validate GLN using Luhn algorithm checksum
   * @param {string} gln - 13-digit GLN
   * @returns {boolean} True if valid
   */
  const validateGLNChecksum = (gln) => {
    if (!/^\d{13}$/.test(gln)) return false;

    // Luhn algorithm checksum validation
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      let digit = parseInt(gln[i]);
      if ((12 - i) % 2 === 0) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
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
  React.useImperativeHandle(ref, () => ({
    isProcessing,
    isReadyToVerify: isProfessional ? (documentFile && documentType) : (documentFile && billingFile)
  }), [documentFile, documentType, billingFile, isProcessing, isProfessional]);

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
    setCountdownSeconds(0);
  }, []);

  // --- Main Verification Flow ---

  const handleVerifyAccount = async () => {
    const glnString = gln.trim();
    const isGLNProvided = glnString.length > 0;

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
    setShowContactForm(false);
    setIdentityProgress(0);
    setBillingProgress(0);

    try {
      let glnData = null;
      const userId = currentUser.uid;

      // STEP A: Verify GLN (if provided)
      if (isGLNProvided) {
        let result;
        if (isProfessional) {
          result = await healthRegistryAPI(glnString);
        } else {
          result = await companySearchAPI(glnString);
        }

        if (result.success && result.data) {
          if (isProfessional) {
            if (result.data.entries && result.data.entries.length > 0) {
              glnData = result.data.entries[0];
            } else {
              throw new Error('No professional found with this GLN');
            }
          } else {
            // Facility flow - fetch details
            if (result.data.entries && result.data.entries.length > 0) {
              const companyId = result.data.entries[0].id;
              const detailsResult = await companyDetailsAPI(companyId);
              if (detailsResult.success) {
                glnData = detailsResult.data;
              } else {
                throw new Error('Could not retrieve company details');
              }
            } else {
              throw new Error('No company found with this GLN');
            }
          }
        } else {
          throw new Error(result.error || 'Failed to verify GLN');
        }
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
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const normalizedFileName = `${baseName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${timestamp}.${fileExtension}`;

    // Standardize path to match Profile section: documents/{userId}/{type}/{filename}
    // For Facilities: documents/facilities/{userId}/{type}/{filename}
    const path = isFacilityUpload
      ? `documents/facilities/${userId}/${subfolder}/${normalizedFileName}`
      : `documents/${userId}/${subfolder}/${normalizedFileName}`;

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
      setShowContactForm(false);
    } else {
      setCountdownSeconds(0);
      setVerificationError(userFriendlyMessage);
      setIsAPILimitError(false);
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

    const profileData = {
      role: 'professional',
      // profileType determined by backend or existing user data
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
        primaryPhone: contact.primaryPhone || '',
        primaryPhonePrefix: contact.primaryPhonePrefix || ''
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

    // Add GLN qualifications (CET titles) from BAG API
    if (bag.professions) {
      bag.professions.forEach(prof => {
        if (prof.cetTitles) {
          prof.cetTitles.forEach(cet => {
            profileData.professionalDetails.qualifications.push({
              type: 'CET',
              title: cet.textEn || cet.textDe || cet.textFr || '',
              id: cet.id,
              active: cet.isActive,
              source: 'GLN_API'
            });
          });
        }
      });
    }

    // FIXED: Merge CV qualifications with GLN qualifications
    if (professionalBackground.qualifications && Array.isArray(professionalBackground.qualifications)) {
      professionalBackground.qualifications.forEach(qual => {
        profileData.professionalDetails.qualifications.push({
          ...qual,
          source: 'CV'
        });
      });
    }

    console.log('[GLNVerification] Saving professional profile with corrected mappings:', profileData);
    const updateUserProfile = httpsCallable(functions, 'updateUserProfile');
    await updateUserProfile(profileData);

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
    const facilityName = bag.name || invoiceDetails.companyName || invoiceDetails.legalName || '';
    if (!facilityName) {
      throw new Error('Could not determine facility name from GLN or billing documents. Please ensure documents are correct.');
    }

    // Determine legal company name (for official records)
    const legalCompanyName = invoiceDetails.legalName || billingInfo.legalName || bag.name || facilityName;

    const facilityData = {
      role: 'facility',
      profileType: 'pharmacy',
      facilityDetails: {
        name: facilityName,
        additionalName: bag.additionalName || null,
        // Operating address - prioritize GLN data, then billing doc
        operatingAddress: {
          street: bag.streetWithNumber || invoiceAddress.street || '',
          city: bag.city || invoiceAddress.city || '',
          postalCode: bag.zip || invoiceAddress.postalCode || '',
          canton: invoiceAddress.canton || bag.canton || '',
          country: 'CH'
        },
        glnCompany: glnValue,
        responsiblePersons: bag.responsiblePersons || []
      },
      // Responsible person identity (from ID document scan)
      responsiblePersonIdentity: responsiblePersonIdentity,
      identityLegal: {
        legalCompanyName: legalCompanyName,
        uidNumber: invoiceDetails.uid || invoiceDetails.vatNumber || billingInfo.uidNumber || null
      },
      billingInformation: {
        legalName: legalCompanyName,
        uidNumber: invoiceDetails.uid || invoiceDetails.vatNumber || billingInfo.uidNumber,
        // Billing address - from invoice/tax document
        billingAddress: {
          street: invoiceAddress.street || '',
          city: invoiceAddress.city || '',
          postalCode: invoiceAddress.postalCode || '',
          canton: invoiceAddress.canton || '',
          country: invoiceAddress.country || 'CH'
        },
        invoiceEmail: invoiceDetails.email || invoiceDetails.invoiceEmail || billingInfo.invoiceEmail || '',
        internalRef: billingInfo.internalRef || '',
        verificationStatus: 'verified'
      },
      contact: {
        primaryEmail: invoiceDetails.email || billingExtracted.personalDetails?.contact?.primaryEmail || currentUser?.email || '',
        primaryPhone: invoiceDetails.phone || billingExtracted.personalDetails?.contact?.primaryPhone || '',
        primaryPhonePrefix: billingExtracted.personalDetails?.contact?.primaryPhonePrefix || ''
      },
      verification: {
        identityStatus: 'verified',
        billingStatus: 'verified',
        overallVerificationStatus: 'verified',
        verificationDocuments: [
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
              identity: idIdentity, // Save extracted identity for reference
              address: idAddress // Save extracted address for reference
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
      GLN_certified: glnValue,
      verificationStatus: 'verified'
    };

    console.log('[GLNVerification] Saving facility profile:', facilityData);
    const updateUserProfile = httpsCallable(functions, 'updateUserProfile');
    await updateUserProfile(facilityData);

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

  // Load previously uploaded documents on mount (for recovery after refresh)
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

  useEffect(() => {
    if (verificationStatus === 'complete') {
      setTimeout(() => onComplete(), 1500);
    }
  }, [verificationStatus, onComplete]);

  useEffect(() => {
    if ((isAPILimitError || showContactForm) && errorRef.current) {
      setTimeout(() => {
        errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }, [isAPILimitError, showContactForm]);

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
    // 1. Document Check (Mandatory)
    if (isProfessional) {
      return documentFile && documentType;
    } else {
      // Facility needs both
      return documentFile && billingFile;
    }
    // GLN is now optional
  })();

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

      {/* GLN Section - Only show if hasGLN is true */}
      {hasGLN && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          {/* Helper Text for Professionals */}
          {isProfessional && (
            <div className="bg-primary/5 p-4 rounded-lg flex gap-3 text-sm text-muted-foreground border border-primary/10">
              <FiInfo className="w-5 h-5 flex-shrink-0 text-primary mt-0.5" />
              <p>
                Professional number required for certified medical professionals in Switzerland (pharmacists, dentists, doctors, etc.).
                For other professions (nurses, assistants, etc.), this number is not mandatory.
                <strong> Enable if you have your own GLN number.</strong>
              </p>
            </div>
          )}

          {/* GLN Input */}
          <div className="animate-in fade-in">
            <PersonnalizedInputField
              label={isProfessional ? 'Professional GLN (Optional)' : 'Company GLN (Optional)'}
              value={gln}
              onChange={handleGLNChange}
              placeholder="760100..."
              error={verificationError && !showContactForm && !isAPILimitError ? verificationError : ''}
            />
          </div>
        </div>
      )}

      {/* Documents Section */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-6">
        <h3 className="font-semibold text-lg">Verification Documents</h3>

        {isFacility && (
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
                      <button
                        onClick={() => {
                          setDocumentFile(null);
                          setIdentityProgress(0);
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
                      <button
                        onClick={() => {
                          setBillingFile(null);
                          setBillingProgress(0);
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
        )}

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

            <UploadFile
              onChange={(f) => handleFileChange(f, 'identity')}
              accept=".pdf,.jpg,.png,.jpeg"
              maxFileSize={5}
              label="Upload Identity Document"
              documentName="identity_document"
              value={documentFile ? [documentFile] : []}
              isLoading={isProcessing}
              progress={identityProgress}
            />
          </div>
        )}
      </div>

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

      {/* 2. Generic/Verification Error with Contact Form */}
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
