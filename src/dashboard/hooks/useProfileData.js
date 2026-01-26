// FILE: /src/hooks/useProfileData.js (Updated)

import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, updateDoc, Timestamp, deleteField } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useDashboard } from '../contexts/DashboardContext';
import { WORKSPACE_TYPES } from '../../utils/sessionAuth';
import { FIRESTORE_COLLECTIONS, LOCALSTORAGE_KEYS } from '../../config/keysDatabase';
import tutorialCache from '../contexts/TutorialContext/utils/tutorialCache';

const storage = getStorage();

const USER_COLLECTION_FIELDS = [
  'uid', 'email', 'emailVerified', 'role', 'profileType',
  'firstName', 'lastName', 'displayName', 'photoURL', // User's own name, not facility name
  'createdAt', 'updatedAt',
];

const convertTimestamps = (data) => { /* ... same as before ... */
  if (!data) return data;
  if (Array.isArray(data)) return data.map(convertTimestamps);
  if (data instanceof Timestamp) return data.toDate();
  if (typeof data === 'object' && data !== null) {
    const converted = {};
    for (const key in data) converted[key] = convertTimestamps(data[key]);
    return converted;
  }
  return data;
};

const cleanDataForFirebase = (data) => { /* ... same as before ... */
  if (data === undefined) return undefined;
  if (data === null || typeof data !== 'object' || data instanceof Date || data instanceof Timestamp) return data;
  if (Array.isArray(data)) {
    const cleanedArray = data.map(cleanDataForFirebase).filter(item => item !== undefined);
    return cleanedArray;
  }
  const result = {};
  let hasKeys = false;
  for (const [key, value] of Object.entries(data)) {
    const cleanedValue = cleanDataForFirebase(value);
    if (cleanedValue !== undefined) {
      result[key] = cleanedValue;
      hasKeys = true;
    }
  }
  return hasKeys ? result : (Object.keys(data).length === 0 ? {} : undefined);
};

const useProfileData = () => {
  const { currentUser } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const dashboard = useDashboard();
  const selectedWorkspace = dashboard?.selectedWorkspace;

  const getProfileCollectionName = useCallback((role) => {
    if (role === 'facility' || role === 'company') return FIRESTORE_COLLECTIONS.FACILITY_PROFILES;
    if (role === 'professional') return FIRESTORE_COLLECTIONS.PROFESSIONAL_PROFILES;
    if (role === 'organization') return FIRESTORE_COLLECTIONS.ORGANIZATIONS;
    return FIRESTORE_COLLECTIONS.PROFESSIONAL_PROFILES; // Default or throw error
  }, []);

  // Function to determine the default profileType based on role
  const getDefaultProfileType = useCallback((role) => {
    if (role === 'facility' || role === 'company') return 'pharmacy'; // Default facility type
    if (role === 'professional') return 'doctor'; // Default professional type
    if (role === 'organization') return 'organization'; // Default organization type
    return 'default';
  }, []);


  const fetchProfileData = useCallback(async () => {
    if (!currentUser) {
      setIsLoading(false);
      setProfileData(null);
      return null;
    }
    setIsLoading(true);
    setError(null);

    try {
      const TIMEOUT_MS = 4000;
      const fetchUserDoc = getDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, currentUser.uid));
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out')), TIMEOUT_MS)
      );

      const userDoc = await Promise.race([fetchUserDoc, timeoutPromise]);

      if (!userDoc.exists()) {
        return { uid: currentUser.uid, email: currentUser.email, role: 'professional', profileType: getDefaultProfileType('professional') };
      }

      const userData = convertTimestamps(userDoc.data());

      // Determine role based on workspace if available, fallback to user record
      let userRole = userData.role || 'professional';
      if (selectedWorkspace) {
        if (selectedWorkspace.type === WORKSPACE_TYPES.TEAM) {
          userRole = 'facility';
        } else if (selectedWorkspace.type === 'organization') {
          userRole = 'organization';
        } else if (selectedWorkspace.type === WORKSPACE_TYPES.PERSONAL || selectedWorkspace.type === WORKSPACE_TYPES.ADMIN) {
          userRole = 'professional';
        }
      }

      const userProfileType = userData.profileType || getDefaultProfileType(userRole);

      const profileCollection = getProfileCollectionName(userRole);

      const fetchProfileDoc = getDoc(doc(db, profileCollection, currentUser.uid));
      const profileTimeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out')), TIMEOUT_MS)
      );

      const profileDoc = await Promise.race([fetchProfileDoc, profileTimeoutPromise]);

      let fetchedData = { ...userData, role: userRole, profileType: userProfileType };
      if (profileDoc.exists()) {
        const specificProfileData = convertTimestamps(profileDoc.data());
        fetchedData = { ...fetchedData, ...specificProfileData };
      }

      setProfileData(fetchedData);
      return fetchedData;

    } catch (err) {
      setError(err.message || 'Failed to fetch profile data');

      // Return minimal valid data structure to allow UI to render (or show offline specific UI)
      const offlineData = {
        uid: currentUser.uid,
        email: currentUser.email,
        role: 'professional',
        profileType: getDefaultProfileType('professional'),
        isOffline: true
      };

      setProfileData(offlineData);
      return offlineData;
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, getProfileCollectionName, getDefaultProfileType]);

  useEffect(() => {
    if (currentUser) {
      fetchProfileData();
    } else {
      setProfileData(null);
      setIsLoading(false);
    }
  }, [currentUser, fetchProfileData]);


  const updateProfileData = async (dataToSave, options = {}) => {
    const { forceRefresh = false } = options;

    if (!currentUser) throw new Error("User not authenticated.");
    if (!profileData) throw new Error("Original profile data not loaded for context.");

    setIsLoading(true);
    try {
      const userFieldsToUpdate = {};
      const profileFieldsToUpdate = {};
      const now = Timestamp.now();

      let currentRole = dataToSave.role || profileData.role || 'professional';
      if (selectedWorkspace) {
        if (selectedWorkspace.type === WORKSPACE_TYPES.TEAM) {
          currentRole = 'facility';
        } else if (selectedWorkspace.type === WORKSPACE_TYPES.PERSONAL || selectedWorkspace.type === WORKSPACE_TYPES.ADMIN) {
          currentRole = 'professional';
        }
      }
      const currentProfileType = dataToSave.profileType || profileData.profileType || getDefaultProfileType(currentRole);

      for (const [key, value] of Object.entries(dataToSave)) {
        if (USER_COLLECTION_FIELDS.includes(key)) {
          userFieldsToUpdate[key] = value;
        } else {
          profileFieldsToUpdate[key] = value;
        }
      }
      // Ensure role & profileType are updated in users collection if they changed
      userFieldsToUpdate.role = currentRole;
      userFieldsToUpdate.profileType = currentProfileType;


      const profileCollection = getProfileCollectionName(currentRole);
      const userDocRef = doc(db, FIRESTORE_COLLECTIONS.USERS, currentUser.uid);
      const profileDocRef = doc(db, profileCollection, currentUser.uid);

      if (Object.keys(userFieldsToUpdate).length > 0) {
        userFieldsToUpdate.updatedAt = now;
        const cleanedUserFields = cleanDataForFirebase(userFieldsToUpdate);
        if (cleanedUserFields && Object.keys(cleanedUserFields).length > 0) {
          await updateDoc(userDocRef, cleanedUserFields);
        }
      }

      if (Object.keys(profileFieldsToUpdate).length > 0) {
        profileFieldsToUpdate.updatedAt = now;
        // Ensure userId is always present in profile docs
        if (!profileFieldsToUpdate.userId && !(await getDoc(profileDocRef)).exists()) {
          profileFieldsToUpdate.userId = currentUser.uid;
          profileFieldsToUpdate.createdAt = now; // Set createdAt if creating new
        }
        const cleanedProfileFields = cleanDataForFirebase(profileFieldsToUpdate);
        if (cleanedProfileFields && Object.keys(cleanedProfileFields).length > 0) {
          await setDoc(profileDocRef, cleanedProfileFields, { merge: true });
        }
      }

      // Option to force re-fetch from server (for cases where backend may modify data)
      if (forceRefresh) {
        const freshData = await fetchProfileData();
        return freshData;
      }

      // Default: Return merged data without re-fetching (eliminates duplicate load)
      // This is safe because we know exactly what was saved and can merge it locally
      const mergedData = {
        ...profileData,
        ...dataToSave,
        role: currentRole,
        profileType: currentProfileType,
        updatedAt: now.toDate() // Convert Timestamp to Date for consistency
      };

      // Update local state to reflect the save
      setProfileData(mergedData);
      return mergedData;

    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const initializeProfileDocument = useCallback(async (role = 'professional', type) => {
    if (!currentUser) return false;
    setIsLoading(true);
    try {
      const userDocRef = doc(db, FIRESTORE_COLLECTIONS.USERS, currentUser.uid);
      let userDoc = await getDoc(userDocRef);
      let currentData = {};
      const finalRole = role;
      const finalProfileType = type || getDefaultProfileType(finalRole);

      if (!userDoc.exists()) {
        currentData = {
          uid: currentUser.uid, email: currentUser.email,
          role: finalRole, profileType: finalProfileType,
          createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
          firstName: currentUser.displayName?.split(' ')[0] || '',
          lastName: currentUser.displayName?.split(' ').slice(1).join(' ') || '',
          photoURL: currentUser.photoURL || ''
        };
        await setDoc(userDocRef, currentData);
      } else {
        currentData = convertTimestamps(userDoc.data());
        // Update if role or type is different or missing
        if (currentData.role !== finalRole || currentData.profileType !== finalProfileType || !currentData.role || !currentData.profileType) {
          await updateDoc(userDocRef, { role: finalRole, profileType: finalProfileType, updatedAt: Timestamp.now() });
          currentData.role = finalRole;
          currentData.profileType = finalProfileType;
        }
      }

      const profileCollection = getProfileCollectionName(finalRole);
      const profileDocRef = doc(db, profileCollection, currentUser.uid);
      const profileDoc = await getDoc(profileDocRef);

      if (!profileDoc.exists()) {
        const defaultProfileData = {
          userId: currentUser.uid,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          // Add role-specific minimal defaults
          ...(finalRole === 'professional' ? { education: [], licensesCertifications: [] } : {}),
          ...(finalRole === 'facility' ? { facilityName: `${currentData.firstName || 'New'} ${finalRole === 'facility' ? finalProfileType : ''}`.trim() } : {})
        };
        await setDoc(profileDocRef, defaultProfileData);
      }
      // Fetch the fresh, possibly newly created/updated data
      await fetchProfileData();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, getProfileCollectionName, getDefaultProfileType, fetchProfileData]);

  const uploadProfilePicture = async (userId, imageDataUrl) => {
    if (!userId || !imageDataUrl) {
      throw new Error('UserId and image data are required');
    }

    try {
      // Convert data URL to Blob
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();

      // Create a storage reference
      const storageRef = ref(storage, `profile-pictures/${userId}/${Date.now()}.jpg`);

      // Upload the file
      await uploadBytes(storageRef, blob);

      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);

      return downloadURL;
    } catch (error) {
      throw error;
    }
  };

  const resetProfile = useCallback(async (targetRole, targetProfileType) => {
    if (!currentUser) throw new Error("Not authenticated");

    setIsLoading(true);
    try {
      const userRole = targetRole || profileData?.role || 'professional';
      const userProfileType = targetProfileType || profileData?.profileType || (typeof getDefaultProfileType === 'function' ? getDefaultProfileType(userRole) : 'doctor');
      const profileCollection = getProfileCollectionName(userRole);

      const userDocRef = doc(db, FIRESTORE_COLLECTIONS.USERS, currentUser.uid);
      const profileDocRef = doc(db, profileCollection, currentUser.uid);

      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        throw new Error("User document not found");
      }

      const userData = userDoc.data();
      const profileDoc = await getDoc(profileDocRef);
      const now = Timestamp.now();

      const firstName = currentUser.displayName?.split(' ')[0] || userData.firstName || '';
      const lastName = currentUser.displayName?.split(' ').slice(1).join(' ') || userData.lastName || '';

      const userUpdates = {
        role: userRole,
        profileType: userProfileType,
        updatedAt: now,
        profileStatus: 'incomplete',
        onboardingCompleted: false,
        onboardingProgress: deleteField(),
        onboardingData: deleteField(),
        ...(userRole === 'professional' ? {
          firstName,
          lastName,
          isProfessionalProfileComplete: false
        } : {
          isFacilityProfileComplete: false
        })
      };

      await updateDoc(userDocRef, userUpdates);

      const resetProfileData = {
        userId: currentUser.uid,
        createdAt: profileDoc.exists() ? (profileDoc.data().createdAt || now) : now,
        updatedAt: now,
        tutorialAccessMode: null,
        accessLevelChoice: null,
        subscriptionTier: 'free',
        autofill: null,
        ...(userRole === 'professional' ? {
          education: [],
          licensesCertifications: [],
          identity: {
            legalFirstName: firstName,
            legalLastName: lastName
          },
          contact: {
            primaryEmail: currentUser.email,
            primaryPhone: '',
            primaryPhonePrefix: '',
            residentialAddress: {
              street: '',
              number: '',
              postalCode: '',
              city: '',
              canton: '',
              country: ''
            }
          }
        } : {
          facilityName: `${firstName || 'New'} ${userProfileType || ''}`.trim(),
          facilityDetails: {},
          facilityLegalBilling: null
        })
      };

      await setDoc(profileDocRef, resetProfileData, { merge: false });

      const userId = currentUser.uid;
      
      tutorialCache.clean();
      localStorage.removeItem(LOCALSTORAGE_KEYS.ONBOARDING_FORM_DATA);
      localStorage.removeItem(LOCALSTORAGE_KEYS.AUTOFILL_CACHE(userId));
      localStorage.removeItem(LOCALSTORAGE_KEYS.DOCUMENT_PROCESSING_CACHE(userId));
      
      const profileTabs = ['personalDetails', 'professionalBackground', 'billingInformation', 'documentUploads', 'marketplace', 'account', 'facilityCoreDetails', 'facilityLegalBilling'];
      profileTabs.forEach(tab => {
        localStorage.removeItem(LOCALSTORAGE_KEYS.PROFILE_DRAFT(tab));
      });
      
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('popup_shown_') && key.includes(userId)) {
          localStorage.removeItem(key);
        }
        if (key.startsWith(`autofill_cache_${userId}`)) {
          localStorage.removeItem(key);
        }
        if (key.startsWith(`document_processing_cache_${userId}`)) {
          localStorage.removeItem(key);
        }
        if (key.startsWith('profile_') && key.endsWith('_draft')) {
          localStorage.removeItem(key);
        }
      });

      await fetchProfileData();
      return true;
    } catch (err) {
      console.error('[resetProfile] Error resetting profile:', err);
      const errorMessage = err.message || 'Failed to reset profile';
      setError(errorMessage);
      throw new Error(`Profile reset failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, profileData, getProfileCollectionName, getDefaultProfileType, fetchProfileData]);

  return {
    profileData, isLoading, error,
    fetchProfileData, refreshProfileData: fetchProfileData,
    updateProfileData, initializeProfileDocument,
    uploadProfilePicture,
    uploadImageAndRetrieveURL: uploadProfilePicture,
    resetProfile,
    changeUserRoleAndProfileType: async (newRole, newProfileType) => {
      if (!currentUser) throw new Error("Not authenticated");
      await updateDoc(doc(db, 'users', currentUser.uid), {
        role: newRole,
        profileType: newProfileType,
        updatedAt: Timestamp.now()
      });
      await initializeProfileDocument(newRole, newProfileType);
      return fetchProfileData();
    }
  };
};

export default useProfileData;