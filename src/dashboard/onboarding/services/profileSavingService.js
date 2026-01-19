import { httpsCallable, getFunctions } from 'firebase/functions';
import { firebaseApp as app } from '../../../services/firebaseService';
import { extractStreetName, extractHouseNumber, convertPermitTypeToProfileFormat, formatPhoneNumber } from '../utils/glnVerificationUtils';

const functions = getFunctions(app, 'europe-west6');

export const saveWorkerProfile = async (extracted, bag, documentMetadata, glnValue, currentUser, manualProfession) => {
  const identity = extracted.personalDetails?.identity || {};
  const address = extracted.personalDetails?.address || {};
  const contact = extracted.personalDetails?.contact || {};
  const additionalInfo = extracted.additionalInfo || {};
  const professionalBackground = extracted.professionalBackground || {};

  const extractedLegalFirstName = identity.legalFirstName || identity.firstName || identity.givenName || '';
  const extractedLegalLastName = identity.legalLastName || identity.lastName || identity.surname || '';
  const extractedFirstName = identity.firstName || identity.legalFirstName || identity.givenName || '';
  const extractedLastName = identity.lastName || identity.legalLastName || identity.surname || '';

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
    identity: {
      legalFirstName: bag.firstName || extractedLegalFirstName,
      legalLastName: bag.name || extractedLegalLastName,
      firstName: bag.firstName || extractedFirstName,
      lastName: bag.name || extractedLastName,
      dateOfBirth: identity.dateOfBirth || null,
      placeOfBirth: identity.placeOfBirth || null,
      gender: identity.gender || null,
      nationality: identity.nationality || null
    },
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
      primaryPhone: formatPhoneNumber(contact.primaryPhone, contact.primaryPhonePrefix).cleanNumber || '',
      primaryPhonePrefix: formatPhoneNumber(contact.primaryPhone, contact.primaryPhonePrefix).cleanPrefix || ''
    },
    employmentEligibility: residencyPermitType ? {
      workPermit: {
        type: convertPermitTypeToProfileFormat(residencyPermitType),
        expiryDate: additionalInfo.dateOfExpiry || null,
        permitNumber: additionalInfo.documentNumber || null,
        issuingCanton: additionalInfo.cantonalReference || null
      }
    } : {},
    professionalDetails: {
      profession: manualProfession || (bag.professions && bag.professions.length > 0
        ? bag.professions[0].profession?.textEn || bag.professions[0].profession?.textFr || bag.professions[0].profession?.textDe
        : null),
      education: professionalBackground.education || [],
      workExperience: professionalBackground.workExperience || [],
      qualifications: [],
      professionalSummary: professionalBackground.professionalSummary || ''
    },
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

  try {
    const { doc, updateDoc, deleteField } = await import('firebase/firestore');
    const { db } = await import('../../../services/firebase');

    await updateDoc(doc(db, 'users', currentUser.uid), {
      temporaryUploads: deleteField()
    });

    console.log('[GLNVerification] Cleaned up temporaryUploads (kept onboardingDocuments for Profile reference)');
  } catch (error) {
    console.warn('[GLNVerification] Failed to clean up temporary uploads:', error);
  }
};

export const saveFacilityProfile = async (bag, billingInfo, documentMetadata, glnValue, currentUser) => {
  const idPersonalDetails = billingInfo.responsiblePersonAnalysis?.personalDetails || {};
  const idIdentity = idPersonalDetails.identity || {};
  const idAdditionalInfo = billingInfo.responsiblePersonAnalysis?.additionalInfo || {};
  const idAddress = idPersonalDetails.address || {};

  const billingExtracted = billingInfo.billingAnalysis || {};
  const invoiceDetails = billingExtracted.invoiceDetails || billingExtracted.businessDetails || billingExtracted.facilityDetails || {};
  const invoiceAddress = billingInfo.billingAddress || invoiceDetails.billingAddress || invoiceDetails.address || billingExtracted.personalDetails?.address || {};

  const responsiblePersonIdentity = {
    firstName: idIdentity.firstName || idIdentity.legalFirstName || '',
    lastName: idIdentity.lastName || idIdentity.legalLastName || '',
    dateOfBirth: idIdentity.dateOfBirth || null,
    nationality: idIdentity.nationality || null,
    gender: idIdentity.gender || null,
    documentType: idAdditionalInfo.documentType || null,
    documentNumber: idAdditionalInfo.documentNumber || null,
    documentExpiry: idAdditionalInfo.dateOfExpiry || null,
    residentialAddress: idAddress.street || idAddress.city ? {
      street: idAddress.street || '',
      city: idAddress.city || '',
      postalCode: idAddress.postalCode || '',
      canton: idAddress.canton || '',
      country: idAddress.country || 'CH'
    } : null
  };

  const facilityName = bag.name || invoiceDetails.companyName || invoiceDetails.legalName || '';
  if (!facilityName) {
    throw new Error('Could not determine facility name from GLN or billing documents. Please ensure documents are correct.');
  }

  const legalCompanyName = invoiceDetails.legalName || billingInfo.legalName || bag.name || facilityName;

  const facilityData = {
    role: 'facility',
    profileType: 'pharmacy',
    facilityDetails: {
      name: facilityName,
      additionalName: bag.additionalName || null,
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
    responsiblePersonIdentity: responsiblePersonIdentity,
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
      verificationStatus: 'verified'
    },
    contact: {
      primaryEmail: invoiceDetails.email || billingExtracted.personalDetails?.contact?.primaryEmail || currentUser?.email || '',
      primaryPhone: formatPhoneNumber(invoiceDetails.phone || billingExtracted.personalDetails?.contact?.primaryPhone, billingExtracted.personalDetails?.contact?.primaryPhonePrefix).cleanNumber || '',
      primaryPhonePrefix: formatPhoneNumber(invoiceDetails.phone || billingExtracted.personalDetails?.contact?.primaryPhone, billingExtracted.personalDetails?.contact?.primaryPhonePrefix).cleanPrefix || ''
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
    GLN_certified: glnValue,
    verificationStatus: 'verified'
  };

  console.log('[GLNVerification] Saving facility profile:', facilityData);
  const updateUserProfile = httpsCallable(functions, 'updateUserProfile');
  await updateUserProfile(facilityData);

  try {
    const { doc, updateDoc, deleteField } = await import('firebase/firestore');
    const { db } = await import('../../../services/firebase');

    await updateDoc(doc(db, 'users', currentUser.uid), {
      temporaryUploads: deleteField()
    });

    console.log('[GLNVerification] Cleaned up temporaryUploads (kept onboardingDocuments for Profile reference)');
  } catch (error) {
    console.warn('[GLNVerification] Failed to clean up temporary uploads:', error);
  }
};


