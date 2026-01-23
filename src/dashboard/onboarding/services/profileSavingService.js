import { httpsCallable, getFunctions } from 'firebase/functions';
import { firebaseApp as app } from '../../../services/firebaseService';
import { extractStreetName, extractHouseNumber, convertPermitTypeToProfileFormat, formatPhoneNumber } from '../utils/glnVerificationUtils';
import { FIRESTORE_COLLECTIONS } from '../../../config/keysDatabase';

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
    profileType: 'professional',
    identity: {
      legalFirstName: bag.firstName || extractedLegalFirstName,
      legalLastName: bag.name || extractedLegalLastName,
      firstName: bag.firstName || extractedFirstName,
      lastName: bag.name || extractedLastName,
      dateOfBirth: identity.dateOfBirth || null,
      placeOfBirth: identity.placeOfBirth || null,
      gender: identity.gender || null,
      nationality: identity.nationality || identity.citizenCountry || null,
      personalIdentificationNumber: additionalInfo.personalIdentificationNumber || null
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
      glnVerified: glnValue ? true : false,
      glnNumber: glnValue || null,
      verifiedAt: new Date().toISOString(),
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
            personalDetails: {
              identity: identity,
              address: address,
              contact: contact
            },
            additionalInfo: additionalInfo,
            professionalBackground: professionalBackground
          },
          documentInfo: {
            documentNumber: additionalInfo.documentNumber || null,
            dateOfIssue: additionalInfo.dateOfIssue || null,
            dateOfExpiry: additionalInfo.dateOfExpiry || null,
            issuingAuthority: additionalInfo.issuingAuthority || null,
            documentCategory: additionalInfo.documentCategory || null,
            mrz: additionalInfo.mrz || null
          }
        }
      ]
    },
    GLN_certified: true,
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

  
  try {
    const { doc, updateDoc, deleteField } = await import('firebase/firestore');
    const { db } = await import('../../../services/firebase');

    await updateDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, currentUser.uid), {
      GLN_certified: true,
      onboardingCompleted: true,
      'onboardingProgress.professional': {
        completed: true,
        completedAt: new Date(),
        step: 4
      }
    });

  } catch (error) {
    console.warn('[GLNVerification] Failed to update user document flags:', error);
    throw error;
  }

  const updateUserProfile = httpsCallable(functions, 'updateUserProfile');
  await updateUserProfile(profileData);

  try {
    const { doc, updateDoc, deleteField } = await import('firebase/firestore');
    const { db } = await import('../../../services/firebase');

    await updateDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, currentUser.uid), {
      temporaryUploads: deleteField()
    });

  } catch (error) {
    console.warn('[GLNVerification] Failed to cleanup temporaryUploads:', error);
  }
};

export const saveFacilityProfile = async (bag, billingInfo, documentMetadata, glnValue, currentUser) => {
  
  const idPersonalDetails = billingInfo.responsiblePersonAnalysis?.personalDetails || {};
  const idIdentity = idPersonalDetails.identity || {};
  const idAdditionalInfo = billingInfo.responsiblePersonAnalysis?.additionalInfo || {};
  const idAddress = idPersonalDetails.address || {};
  const idContact = idPersonalDetails.contact || {};

  const billingExtracted = billingInfo.billingAnalysis || {};
  const invoiceDetails = billingExtracted.invoiceDetails || billingExtracted.businessDetails || billingExtracted.facilityDetails || {};
  const invoiceAddress = billingInfo.billingAddress || invoiceDetails.billingAddress || invoiceDetails.address || billingExtracted.personalDetails?.address || {};

  const responsiblePersonIdentity = {
    firstName: idIdentity.firstName || idIdentity.legalFirstName || '',
    lastName: idIdentity.lastName || idIdentity.legalLastName || '',
    legalFirstName: idIdentity.legalFirstName || idIdentity.firstName || '',
    legalLastName: idIdentity.legalLastName || idIdentity.lastName || '',
    dateOfBirth: idIdentity.dateOfBirth || null,
    placeOfBirth: idIdentity.placeOfBirth || null,
    nationality: idIdentity.nationality || idIdentity.citizenCountry || null,
    gender: idIdentity.gender || null,
    documentType: idAdditionalInfo.documentType || null,
    documentNumber: idAdditionalInfo.documentNumber || null,
    documentExpiry: idAdditionalInfo.dateOfExpiry || null,
    documentIssue: idAdditionalInfo.dateOfIssue || null,
    issuingAuthority: idAdditionalInfo.issuingAuthority || null,
    personalIdentificationNumber: idAdditionalInfo.personalIdentificationNumber || null,
    residentialAddress: idAddress.street || idAddress.city ? {
      street: extractStreetName(idAddress.street) || '',
      number: extractHouseNumber(idAddress.street) || '',
      city: idAddress.city || '',
      postalCode: idAddress.postalCode || '',
      canton: idAddress.canton || '',
      country: idAddress.country || 'CH'
    } : null,
    contact: idContact.primaryEmail || idContact.primaryPhone ? {
      email: idContact.primaryEmail || null,
      phone: formatPhoneNumber(idContact.primaryPhone, idContact.primaryPhonePrefix).cleanNumber || null,
      phonePrefix: formatPhoneNumber(idContact.primaryPhone, idContact.primaryPhonePrefix).cleanPrefix || null
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
        street: extractStreetName(bag.streetWithNumber || invoiceAddress.street) || '',
        number: extractHouseNumber(bag.streetWithNumber || invoiceAddress.street) || '',
        city: bag.city || invoiceAddress.city || '',
        postalCode: bag.zip || invoiceAddress.postalCode || '',
        canton: invoiceAddress.canton || bag.canton || '',
        country: 'CH'
      },
      glnCompany: glnValue,
      responsiblePersons: bag.responsiblePersons || [],
      facilityType: bag.type || bag.facilityType || null,
      organizationType: bag.organizationType || null,
      registeredSince: bag.registeredSince || null
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
        street: extractStreetName(invoiceAddress.street) || '',
        number: extractHouseNumber(invoiceAddress.street) || '',
        city: invoiceAddress.city || '',
        postalCode: invoiceAddress.postalCode || '',
        canton: invoiceAddress.canton || '',
        country: invoiceAddress.country || 'CH'
      },
      invoiceEmail: invoiceDetails.email || invoiceDetails.invoiceEmail || billingInfo.invoiceEmail || '',
      invoiceNumber: invoiceDetails.invoiceNumber || null,
      invoiceDate: invoiceDetails.invoiceDate || null,
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
      glnVerified: glnValue ? true : false,
      glnNumber: glnValue || null,
      verifiedAt: new Date().toISOString(),
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
            personalDetails: {
              identity: idIdentity,
              address: idAddress,
              contact: idContact
            },
            additionalInfo: idAdditionalInfo
          },
          documentInfo: {
            documentNumber: idAdditionalInfo.documentNumber || null,
            dateOfIssue: idAdditionalInfo.dateOfIssue || null,
            dateOfExpiry: idAdditionalInfo.dateOfExpiry || null,
            issuingAuthority: idAdditionalInfo.issuingAuthority || null,
            documentCategory: idAdditionalInfo.documentCategory || null,
            mrz: idAdditionalInfo.mrz || null
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
            businessDetails: billingExtracted.businessDetails || {},
            facilityDetails: billingExtracted.facilityDetails || {},
            billingAddress: invoiceAddress,
            personalDetails: billingExtracted.personalDetails
          },
          documentInfo: {
            invoiceNumber: invoiceDetails.invoiceNumber || null,
            invoiceDate: invoiceDetails.invoiceDate || null,
            uid: invoiceDetails.uid || null,
            vatNumber: invoiceDetails.vatNumber || null
          }
        }
      ]
    },
    GLN_certified: glnValue,
    verificationStatus: 'verified'
  };

  
  try {
    const { doc, updateDoc, deleteField } = await import('firebase/firestore');
    const { db } = await import('../../../services/firebase');

    await updateDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, currentUser.uid), {
      GLN_certified: true,
      onboardingCompleted: true,
      'onboardingProgress.facility': {
        completed: true,
        completedAt: new Date(),
        step: 5
      }
    });

  } catch (error) {
    console.warn('[GLNVerification] Failed to update user document flags:', error);
    throw error;
  }

  const updateUserProfile = httpsCallable(functions, 'updateUserProfile');
  await updateUserProfile(facilityData);

  try {
    const { doc, updateDoc, deleteField } = await import('firebase/firestore');
    const { db } = await import('../../../services/firebase');

    await updateDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, currentUser.uid), {
      temporaryUploads: deleteField()
    });

  } catch (error) {
    console.warn('[GLNVerification] Failed to cleanup temporaryUploads:', error);
  }
};


