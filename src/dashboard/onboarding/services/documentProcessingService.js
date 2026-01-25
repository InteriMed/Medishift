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
    const normalize = (str) => (str || '').toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const bagName = normalize(glnData.name);
    const bagFirstName = normalize(glnData.firstName);
    const extractedLastName = normalize(extracted.legalLastName || extracted.lastName || extracted.surname);
    const extractedFirstName = normalize(extracted.legalFirstName || extracted.firstName || extracted.givenName);

    console.log(`[GLNVerification] Matching Names: Registry(${bagFirstName} ${bagName}) vs Extracted(${extractedFirstName} ${extractedLastName})`);

    const nameMatch = bagName.includes(extractedLastName) || extractedLastName.includes(bagName) ||
      bagName.split(' ').some(part => extractedLastName.includes(part)) ||
      extractedLastName.split(' ').some(part => bagName.includes(part));

    const firstNameMatch = bagFirstName.includes(extractedFirstName) || extractedFirstName.includes(bagFirstName) ||
      bagFirstName.split(' ').some(part => extractedFirstName.includes(part)) ||
      extractedFirstName.split(' ').some(part => bagFirstName.includes(part));

    if (!nameMatch || !firstNameMatch) {
      throw new Error(`The name on your document (${extractedFirstName} ${extractedLastName}) does not match the names registered with this GLN (${bagFirstName} ${bagName}). Please ensure you are using the correct GLN.`);
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
  setUploadedDocuments,
  profProfileData
) => {
  let idResult = null;
  let idUpload = null;

  if (documentFile) {
    idUpload = await uploadDocument(documentFile, userId, 'responsible_person_id', documentType, setIdentityProgress, true, setUploadedDocuments);
    const idDocumentType = documentType || 'identity';
    idResult = await processDocumentWithAI(idUpload.downloadURL, idDocumentType, idUpload.storagePath, getMimeType(documentFile));
  } else if (profProfileData && profProfileData.verification?.verificationDocuments?.length > 0) {
    // Use the first verified identity document from the professional profile
    const existingDoc = profProfileData.verification.verificationDocuments.find(d =>
      d.status === 'verified' && (d.type?.includes('identity') || d.type?.includes('passport') || d.type?.includes('permit'))
    ) || profProfileData.verification.verificationDocuments[0];

    idUpload = {
      downloadURL: existingDoc.storageUrl,
      storagePath: existingDoc.storagePath,
      documentType: existingDoc.type,
      fileName: existingDoc.fileName,
      fileType: existingDoc.fileType,
      fileSize: existingDoc.fileSize
    };

    idResult = {
      success: true,
      data: existingDoc.extractedData || { personalDetails: { identity: profProfileData.identity, address: profProfileData.contact?.residentialAddress, contact: profProfileData.contact } },
      verificationDetails: existingDoc.documentInfo
    };

    console.log('[GLNVerification] Using existing verified identity from professional profile');
  } else {
    throw new Error('Identity document is required or user must be a verified professional.');
  }

  const billUpload = await uploadDocument(billingFile, userId, 'billing_document', null, setBillingProgress, true, setUploadedDocuments);
  const billResult = await processDocumentWithAI(billUpload.downloadURL, 'businessDocument', billUpload.storagePath, getMimeType(billingFile));

  if ((idResult && !idResult.success) || !billResult.success) {
    throw new Error('Failed to process one or more documents.');
  }

  if (idResult && idResult.verificationDetails) {
    setFacilityIdVerificationDetails(idResult.verificationDetails);
    console.log('[GLNVerification] ID Verification details:', idResult.verificationDetails);
  }
  if (billResult.verificationDetails) {
    setFacilityBillVerificationDetails(billResult.verificationDetails);
    console.log('[GLNVerification] Billing Verification details:', billResult.verificationDetails);
  }

  if (isGLNProvided && glnData) {
    const normalize = (str) => (str || '').toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const extractedIdentity = idResult.data.personalDetails?.identity || {};
    const responsiblePersons = glnData.responsiblePersons || [];

    const extractedLastName = normalize(extractedIdentity.lastName || extractedIdentity.surname);
    const extractedFirstName = normalize(extractedIdentity.firstName || extractedIdentity.givenName);

    console.log(`[GLNVerification] Matching Facility Person: Extracted(${extractedFirstName} ${extractedLastName}) vs Registry Responsible Persons`);

    let personMatch = false;
    for (const person of responsiblePersons) {
      const pName = normalize(typeof person === 'string' ? person : (person.name || `${person.firstName || ''} ${person.lastName || ''}`));
      if ((pName.includes(extractedLastName) && pName.includes(extractedFirstName)) ||
        (extractedLastName.length > 2 && pName.includes(extractedLastName)) ||
        (extractedFirstName.length > 2 && pName.includes(extractedFirstName))) {
        personMatch = true;
        break;
      }
    }

    if (!personMatch) {
      if (responsiblePersons.length > 0) {
        throw new Error('The person on the ID is not listed as a Responsible Person for this GLN facility in the registry.');
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


