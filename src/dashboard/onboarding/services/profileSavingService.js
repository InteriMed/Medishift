import { httpsCallable, getFunctions } from 'firebase/functions';
import { firebaseApp as app } from '../../../services/firebaseService';
import { extractStreetName, extractHouseNumber, formatPhoneNumber } from '../utils/glnVerificationUtils';
import { FIRESTORE_COLLECTIONS } from '../../../config/keysDatabase';

const functions = getFunctions(app, 'europe-west6');

export const saveWorkerProfile = async (extracted, bag, documentMetadata, glnValue, currentUser, manualProfession) => {
  
  const identity = extracted.personalDetails?.identity || {};
  const address = extracted.personalDetails?.address || {};
  const contact = extracted.personalDetails?.contact || {};
  const additionalInfo = extracted.additionalInfo || {};
  

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
      contactPhonePrefix: contact.primaryPhonePrefix || contact.phonePrefix || '',
      contactPhone: formatPhoneNumber(contact.primaryPhone || contact.phone, contact.primaryPhonePrefix || contact.phonePrefix).cleanNumber || '',
      contactEmail: contact.primaryEmail || contact.email || ''
    },
    education: bag.education || [],
    workExperience: bag.workExperience || [],
    licensesCertifications: bag.licensesCertifications || [],
    professionalMemberships: bag.professionalMemberships || [],
    volunteering: bag.volunteering || [],
    iban: bag.iban || '',
    bankName: bag.bankName || '',
    cvUrl: bag.cvUrl || null,
    diplomaUrls: bag.diplomaUrls || [],
    residencyPermitType: residencyPermitType,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const updateUserProfile = httpsCallable(functions, 'updateUserProfile');
  await updateUserProfile(profileData);

  try {
    const { doc, getDoc, updateDoc, serverTimestamp } = await import('firebase/firestore');
    const { db } = await import('../../../services/firebase');

    const profileDocRef = doc(db, 'professionalProfiles', currentUser.uid);
    const profileDoc = await getDoc(profileDocRef);
    
    if (profileDoc.exists()) {
      await updateDoc(profileDocRef, {
        shouldStartTutorial: true,
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.warn('[GLNVerification] Failed to set tutorial flag:', error);
  }

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
    employees: [{
      user_uid: currentUser.uid,
      uid: currentUser.uid,
      roles: ['admin'],
      rights: []
    }],
    admins: [currentUser.uid],
    facilityName: facilityName,
    facilityProfileId: currentUser.uid,
    GLN_certified: glnValue,
    verificationStatus: 'verified'
  };

  
  try {
    const { doc, updateDoc } = await import('firebase/firestore');
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
    const { doc, getDoc, updateDoc, arrayUnion, serverTimestamp } = await import('firebase/firestore');
    const { db } = await import('../../../services/firebase');

    const profileDocRef = doc(db, 'facilityProfiles', currentUser.uid);
    const profileDoc = await getDoc(profileDocRef);
    
    if (profileDoc.exists()) {
      await updateDoc(profileDocRef, {
        shouldStartTutorial: true,
        updatedAt: serverTimestamp()
      });
    }

    const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, currentUser.uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const existingMemberships = userData.facilityMemberships || [];
      const isAlreadyMember = existingMemberships.some(m => m.facilityId === currentUser.uid || m.facilityProfileId === currentUser.uid);
      
      if (!isAlreadyMember) {
        await updateDoc(userRef, {
          facilityMemberships: arrayUnion({
            facilityId: currentUser.uid,
            facilityProfileId: currentUser.uid,
            facilityName: facilityName,
            role: 'admin',
            joinedAt: new Date().toISOString()
          }),
          updatedAt: serverTimestamp()
        });
      }
    }
  } catch (error) {
    console.warn('[GLNVerification] Failed to set tutorial flag or update facility memberships:', error);
  }

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

export const saveOrganizationProfile = async (bag, billingInfo, documentMetadata, glnValue, currentUser) => {
  
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

  const organizationName = bag.name || invoiceDetails.companyName || invoiceDetails.legalName || '';
  if (!organizationName) {
    throw new Error('Could not determine organization name from GLN or billing documents. Please ensure documents are correct.');
  }

  const legalCompanyName = invoiceDetails.legalName || billingInfo.legalName || bag.name || organizationName;

  const organizationData = {
    role: 'organization',
    profileType: 'organization',
    organizationName: organizationName,
    additionalName: bag.additionalName || null,
    organizationDetails: {
      name: organizationName,
      additionalName: bag.additionalName || null,
      organizationType: bag.organizationType || bag.type || null,
      registeredSince: bag.registeredSince || null,
      headquartersAddress: {
        street: extractStreetName(bag.streetWithNumber || invoiceAddress.street) || '',
        number: extractHouseNumber(bag.streetWithNumber || invoiceAddress.street) || '',
        city: bag.city || invoiceAddress.city || '',
        postalCode: bag.zip || invoiceAddress.postalCode || '',
        canton: invoiceAddress.canton || bag.canton || '',
        country: invoiceAddress.country || 'CH'
      },
      glnCompany: glnValue || null,
      responsiblePersons: bag.responsiblePersons || []
    },
    responsiblePersonIdentity: responsiblePersonIdentity,
    identityLegal: {
      legalCompanyName: legalCompanyName,
      uidNumber: invoiceDetails.uid || invoiceDetails.vatNumber || billingInfo.uidNumber || null,
      commercialRegisterNumber: invoiceDetails.commercialRegisterNumber || null
    },
    billingInformation: {
      legalName: legalCompanyName,
      uidNumber: invoiceDetails.uid || invoiceDetails.vatNumber || billingInfo.uidNumber || null,
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
    facilities: {},
    internalTeam: {
      employees: [{
        user_uid: currentUser.uid,
        uid: currentUser.uid,
        roles: ['org_admin'],
        rights: ['manage_facilities', 'manage_shared_team', 'manage_internal_team'],
        addedAt: new Date().toISOString(),
        addedBy: currentUser.uid
      }],
      admins: [currentUser.uid]
    },
    sharedTeam: {
      employees: [],
      admins: []
    },
    organizationProfileId: currentUser.uid,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: currentUser.uid,
    verificationStatus: 'verified',
    GLN_certified: glnValue ? true : false
  };

  
  try {
    const { doc, updateDoc } = await import('firebase/firestore');
    const { db } = await import('../../../services/firebase');

    await updateDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, currentUser.uid), {
      GLN_certified: true,
      onboardingCompleted: true,
      'onboardingProgress.organization': {
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
  await updateUserProfile(organizationData);

  try {
    const { doc, getDoc, updateDoc, arrayUnion, serverTimestamp } = await import('firebase/firestore');
    const { db } = await import('../../../services/firebase');

    const profileDocRef = doc(db, FIRESTORE_COLLECTIONS.ORGANIZATIONS, currentUser.uid);
    const profileDoc = await getDoc(profileDocRef);
    
    if (profileDoc.exists()) {
      await updateDoc(profileDocRef, {
        shouldStartTutorial: true,
        updatedAt: serverTimestamp()
      });
    }

    const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, currentUser.uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const existingRoles = userData.roles || [];
      const isAlreadyMember = existingRoles.some(r => r.organization_uid === currentUser.uid);
      
      if (!isAlreadyMember) {
        const newRoleEntry = {
          organization_uid: currentUser.uid,
          roles: ['org_admin'],
          rights: ['manage_facilities', 'manage_shared_team', 'manage_internal_team']
        };
        
        await updateDoc(userRef, {
          roles: [...existingRoles, newRoleEntry],
          updatedAt: serverTimestamp()
        });
      }
    }
  } catch (error) {
    console.warn('[GLNVerification] Failed to set tutorial flag or update organization roles:', error);
  }

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
