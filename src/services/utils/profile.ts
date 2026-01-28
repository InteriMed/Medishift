import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { FIRESTORE_COLLECTIONS } from '../../config/keysDatabase';

export interface SaveProfileOptions {
  userId: string;
  profileType: 'organization' | 'facility' | 'professional';
  profileData: Record<string, any>;
  profileId?: string;
}

export const saveOrganizationProfile = async (options: SaveProfileOptions): Promise<{ success: boolean; profileId?: string; error?: string }> => {
  try {
    const { userId, profileData, profileId } = options;
    
    const collectionName = FIRESTORE_COLLECTIONS.ORGANIZATIONS;
    const docId = profileId || profileData.organizationProfileId || profileData.uid || `org_${Date.now()}`;
    
    const profileRef = doc(db, collectionName, docId);
    
    await setDoc(profileRef, {
      ...profileData,
      organizationProfileId: docId,
      updatedAt: serverTimestamp(),
      createdAt: profileData.createdAt || serverTimestamp()
    }, { merge: true });
    
    return {
      success: true,
      profileId: docId
    };
  } catch (error: any) {
    console.error('[ProfileSaving] Failed to save organization profile:', error);
    return {
      success: false,
      error: error.message || 'Failed to save organization profile'
    };
  }
};

export const saveFacilityProfile = async (options: SaveProfileOptions): Promise<{ success: boolean; profileId?: string; error?: string }> => {
  try {
    const { userId, profileData, profileId } = options;
    
    const collectionName = FIRESTORE_COLLECTIONS.FACILITY_PROFILES;
    const docId = profileId || profileData.facilityProfileId || `facility_${Date.now()}`;
    
    const profileRef = doc(db, collectionName, docId);
    
    await setDoc(profileRef, {
      ...profileData,
      facilityProfileId: docId,
      userId,
      updatedAt: serverTimestamp(),
      createdAt: profileData.createdAt || serverTimestamp()
    }, { merge: true });
    
    return {
      success: true,
      profileId: docId
    };
  } catch (error: any) {
    console.error('[ProfileSaving] Failed to save facility profile:', error);
    return {
      success: false,
      error: error.message || 'Failed to save facility profile'
    };
  }
};

export const processAndSaveFacility = async (
  userId: string,
  facilityData: Record<string, any>,
  documentData?: Record<string, any>
): Promise<{ success: boolean; profileId?: string; error?: string }> => {
  try {
    const mergedData = {
      ...facilityData,
      ...(documentData && { documents: documentData })
    };
    
    return await saveFacilityProfile({
      userId,
      profileType: 'facility',
      profileData: mergedData
    });
  } catch (error: any) {
    console.error('[ProfileSaving] Failed to process and save facility:', error);
    return {
      success: false,
      error: error.message || 'Failed to process and save facility'
    };
  }
};

export const saveProfessionalProfile = async (options: SaveProfileOptions): Promise<{ success: boolean; profileId?: string; error?: string }> => {
  try {
    const { userId, profileData, profileId } = options;
    
    const collectionName = FIRESTORE_COLLECTIONS.USERS;
    const docId = profileId || userId;
    
    const profileRef = doc(db, collectionName, docId);
    
    await setDoc(profileRef, {
      ...profileData,
      updatedAt: serverTimestamp(),
      createdAt: profileData.createdAt || serverTimestamp()
    }, { merge: true });
    
    return {
      success: true,
      profileId: docId
    };
  } catch (error: any) {
    console.error('[ProfileSaving] Failed to save professional profile:', error);
    return {
      success: false,
      error: error.message || 'Failed to save professional profile'
    };
  }
};

export const processAndSaveProfessional = async (
  userId: string,
  professionalData: Record<string, any>,
  documentData?: Record<string, any>
): Promise<{ success: boolean; profileId?: string; error?: string }> => {
  try {
    const mergedData = {
      ...professionalData,
      ...(documentData && { documents: documentData })
    };
    
    return await saveProfessionalProfile({
      userId,
      profileType: 'professional',
      profileData: mergedData
    });
  } catch (error: any) {
    console.error('[ProfileSaving] Failed to process and save professional:', error);
    return {
      success: false,
      error: error.message || 'Failed to process and save professional'
    };
  }
};

