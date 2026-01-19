import { processDocumentWithAI } from '../../../services/documentProcessingService';
import { getMimeType, checkDocumentExpiry } from '../utils/glnVerificationUtils';
import { uploadDocument } from './documentUploadService';
import { saveWorkerProfile, saveFacilityProfile } from './profileSavingService';

export const processAndSaveProfessional = async (
  documentFile,
  documentType,
  userId,
  glnData,
  isGLNProvided,
  gln,
  currentUser,
  setIdentityProgress,
  setProfessionalVerificationDetails,
  setVerificationError,
  setUploadedDocuments,
  manualProfession
) => {
  const { downloadURL, storagePath } = await uploadDocument(
    documentFile,
    userId,
    'identity',
    documentType,
    setIdentityProgress,
    false,
    setUploadedDocuments
  );

  const aiDocumentType = documentType || 'identity';
  const aiResult = await processDocumentWithAI(downloadURL, aiDocumentType, storagePath, getMimeType(documentFile));

  if (!aiResult.success || !aiResult.data) {
    throw new Error('Failed to process document information');
  }

  if (aiResult.verificationDetails) {
    setProfessionalVerificationDetails(aiResult.verificationDetails);
    console.log('[GLNVerification] Verification details:', aiResult.verificationDetails);
  }

  const extracted = aiResult.data.personalDetails?.identity || {};
  const additionalInfo = aiResult.data.additionalInfo || {};

  if (additionalInfo.dateOfExpiry) {
    const expiryCheck = checkDocumentExpiry(additionalInfo.dateOfExpiry);

    if (expiryCheck.isExpired) {
      throw new Error('Document has expired. Please upload a valid, unexpired document.');
    }

    if (expiryCheck.isExpiringSoon) {
      console.warn(`[GLNVerification] Document expiring in ${expiryCheck.daysUntilExpiry} days`);
      setVerificationError(`Warning: Your document will expire in ${expiryCheck.daysUntilExpiry} days. Please renew it soon.`);
      setTimeout(() => setVerificationError(''), 8000);
    }
  }

  if (isGLNProvided && glnData) {
    const bagName = (glnData.name || '').toLowerCase();
    const bagFirstName = (glnData.firstName || '').toLowerCase();
    const extractedLastName = (extracted.legalLastName || extracted.lastName || extracted.surname || '').toLowerCase();
    const extractedFirstName = (extracted.legalFirstName || extracted.firstName || extracted.givenName || '').toLowerCase();

    const nameMatch = bagName.includes(extractedLastName) || extractedLastName.includes(bagName);
    const firstNameMatch = bagFirstName.includes(extractedFirstName) || extractedFirstName.includes(bagFirstName);

    if (!nameMatch || !firstNameMatch) {
      throw new Error('Document name does not match GLN record. Please check you are using the correct GLN or Document.');
    }
  }

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
    isGLNProvided ? gln : null,
    currentUser,
    manualProfession
  );
};

export const processAndSaveFacility = async (
  documentFile,
  billingFile,
  documentType,
  userId,
  glnData,
  isGLNProvided,
  gln,
  internalRef,
  currentUser,
  setIdentityProgress,
  setBillingProgress,
  setFacilityIdVerificationDetails,
  setFacilityBillVerificationDetails,
  setUploadedDocuments
) => {
  const [idUpload, billUpload] = await Promise.all([
    uploadDocument(documentFile, userId, 'responsible_person_id', documentType, setIdentityProgress, true, setUploadedDocuments),
    uploadDocument(billingFile, userId, 'billing_document', null, setBillingProgress, true, setUploadedDocuments)
  ]);

  const idDocumentType = documentType || 'identity';
  const [idResult, billResult] = await Promise.all([
    processDocumentWithAI(idUpload.downloadURL, idDocumentType, idUpload.storagePath, getMimeType(documentFile)),
    processDocumentWithAI(billUpload.downloadURL, 'businessDocument', billUpload.storagePath, getMimeType(billingFile))
  ]);

  if (!idResult.success || !billResult.success) {
    throw new Error('Failed to process one or more documents.');
  }

  if (idResult.verificationDetails) {
    setFacilityIdVerificationDetails(idResult.verificationDetails);
    console.log('[GLNVerification] ID Verification details:', idResult.verificationDetails);
  }
  if (billResult.verificationDetails) {
    setFacilityBillVerificationDetails(billResult.verificationDetails);
    console.log('[GLNVerification] Billing Verification details:', billResult.verificationDetails);
  }

  if (isGLNProvided && glnData) {
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

    if (!personMatch) {
      if (responsiblePersons.length > 0) {
        throw new Error('The person on the ID is not listed as a Responsible Person for this GLN facility.');
      }
    }
  }

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
    isGLNProvided ? gln : null,
    currentUser
  );
};


