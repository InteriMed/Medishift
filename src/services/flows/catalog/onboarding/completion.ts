import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import { FIRESTORE_COLLECTIONS } from '../../../../config/keysDatabase';

export interface OnboardingCompletionData {
  role: 'worker' | 'company' | 'chain';
  belongsToFacility?: boolean;
  legalConsiderationsConfirmed: boolean;
  phoneVerified: boolean;
  phoneData: {
    phoneNumber: string;
    verified: boolean;
  };
  glnVerified?: boolean;
  facilityGlnVerified?: boolean;
  commercialRegistryVerified?: boolean;
}

export const completeOnboarding = async (
  userId: string,
  onboardingData: OnboardingCompletionData,
  onboardingType: 'professional' | 'facility'
): Promise<{ success: boolean; workspaceCreated: boolean; workspaceId?: string }> => {
  try {
    const userDocRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }

    const userData = userDoc.data();

    await updateDoc(userDocRef, {
      [`onboardingProgress.${onboardingType}`]: {
        completed: true,
        role: onboardingData.role,
        completedAt: new Date()
      },
      ...(onboardingType === 'professional' ? { onboardingCompleted: true } : {}),
      updatedAt: new Date()
    });

    let workspaceCreated = false;
    let workspaceId = undefined;

    if (onboardingType === 'professional' && onboardingData.role === 'worker') {
      if (!onboardingData.belongsToFacility) {
        const profileDocRef = doc(db, FIRESTORE_COLLECTIONS.PROFESSIONAL_PROFILES, userId);
        const profileDoc = await getDoc(profileDocRef);

        if (!profileDoc.exists()) {
          const { httpsCallable } = await import('firebase/functions');
          const { functions } = await import('../../../../services/firebase');
          const updateProfile = httpsCallable(functions, 'updateUserProfile');

          await updateProfile({
            role: 'professional',
            profileType: 'doctor',
            userId: userId,
            email: userData.email,
            contact: {
              primaryEmail: userData.email,
              primaryPhone: onboardingData.phoneData?.phoneNumber?.split(' ').slice(1).join(' ') || '',
              primaryPhonePrefix: onboardingData.phoneData?.phoneNumber?.split(' ')[0] || ''
            },
            verification: {
              identityStatus: 'not_verified',
              qualificationsStatus: 'not_verified',
              workEligibilityStatus: 'not_verified',
              overallVerificationStatus: 'not_verified'
            }
          });

          workspaceCreated = true;
          workspaceId = 'personal';
        }
      } else {
        const profileDocRef = doc(db, FIRESTORE_COLLECTIONS.PROFESSIONAL_PROFILES, userId);
        const profileDoc = await getDoc(profileDocRef);

        if (!profileDoc.exists()) {
          const { httpsCallable } = await import('firebase/functions');
          const { functions } = await import('../../../../services/firebase');
          const updateProfile = httpsCallable(functions, 'updateUserProfile');

          await updateProfile({
            role: 'professional',
            profileType: 'doctor',
            tutorialAccessMode: 'team',
            profileCompleted: true,
            email: userData.email,
            contact: {
              primaryEmail: userData.email
            },
            identity: {
              email: userData.email
            },
            verification: {
              identityStatus: 'not_verified',
              qualificationsStatus: 'not_verified',
              workEligibilityStatus: 'not_verified',
              overallVerificationStatus: 'not_verified'
            }
          });

          workspaceCreated = false;
        }
      }
    }

    if (onboardingType === 'facility' && onboardingData.role === 'company') {
      const profileDocRef = doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, userId);
      const profileDoc = await getDoc(profileDocRef);

      if (!profileDoc.exists()) {
        const { httpsCallable } = await import('firebase/functions');
        const { functions } = await import('../../../../services/firebase');
        const updateProfile = httpsCallable(functions, 'updateUserProfile');

        const facilityData = {
          role: 'facility',
          profileType: 'pharmacy',
          userId: userId,
          email: userData.email,
          facilityDetails: {
            name: userData.firstName || userData.displayName || 'New Facility',
            additionalName: null,
            operatingAddress: {
              street: '',
              city: '',
              postalCode: '',
              canton: '',
              country: 'CH'
            },
            glnCompany: null,
            responsiblePersons: []
          },
          responsiblePersonIdentity: {
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            dateOfBirth: null,
            nationality: null,
            gender: null,
            documentType: null,
            documentNumber: null,
            documentExpiry: null,
            residentialAddress: null
          },
          identityLegal: {
            legalCompanyName: userData.firstName || userData.displayName || 'New Facility',
            uidNumber: null
          },
          billingInformation: {
            legalName: userData.firstName || userData.displayName || 'New Facility',
            uidNumber: null,
            billingAddress: {
              street: '',
              city: '',
              postalCode: '',
              canton: '',
              country: 'CH'
            },
            invoiceEmail: userData.email || '',
            internalRef: '',
            verificationStatus: 'pending'
          },
          contact: {
            primaryEmail: userData.email || '',
            primaryPhone: userData.primaryPhone || '',
            primaryPhonePrefix: userData.primaryPhonePrefix || ''
          },
          verification: {
            identityStatus: 'not_verified',
            billingStatus: 'not_verified',
            overallVerificationStatus: 'not_verified',
            verificationDocuments: []
          },
          employees: [{
            user_uid: userId,
            roles: ['admin']
          }],
          facilityProfileId: userId,
          facilityName: userData.firstName || userData.displayName || 'New Facility',
          subscriptionTier: 'free'
        };

        await updateProfile(facilityData);

        const existingRoles = userData.roles || [];
        const updatedRoles = existingRoles.filter((r: any) => r.facility_uid !== userId);
        updatedRoles.push({
          facility_uid: userId,
          roles: ['admin']
        });

        await updateDoc(userDocRef, {
          roles: updatedRoles,
          updatedAt: new Date()
        });

        workspaceCreated = true;
        workspaceId = userId;
      }
    }

    const profileCollection = onboardingType === 'facility' 
      ? FIRESTORE_COLLECTIONS.FACILITY_PROFILES 
      : FIRESTORE_COLLECTIONS.PROFESSIONAL_PROFILES;
    const profileDocRef = doc(db, profileCollection, userId);
    const finalProfileDoc = await getDoc(profileDocRef);
    
    if (finalProfileDoc.exists()) {
      await updateDoc(profileDocRef, {
        shouldStartTutorial: true,
        updatedAt: new Date()
      });
    }

    return {
      success: true,
      workspaceCreated,
      workspaceId
    };
  } catch (error) {
    console.error('Error completing onboarding:', error);
    throw error;
  }
};

