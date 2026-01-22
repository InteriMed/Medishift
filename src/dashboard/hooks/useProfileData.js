// FILE: /src/hooks/useProfileData.js (Updated)

import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';

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

  const getProfileCollectionName = useCallback((role) => {
    if (role === 'facility' || role === 'company') return 'facilityProfiles';
    if (role === 'professional') return 'professionalProfiles';
    console.warn(`[useProfileData] Unknown role: ${role}, defaulting to professionalProfiles`);
    return 'professionalProfiles'; // Default or throw error
  }, []);

  // Function to determine the default profileType based on role
  const getDefaultProfileType = useCallback((role) => {
    if (role === 'facility' || role === 'company') return 'pharmacy'; // Default facility type
    if (role === 'professional') return 'doctor'; // Default professional type
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
      const fetchUserDoc = getDoc(doc(db, 'users', currentUser.uid));
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out')), TIMEOUT_MS)
      );

      const userDoc = await Promise.race([fetchUserDoc, timeoutPromise]);

      if (!userDoc.exists()) {
        console.warn('[useProfileData] User document not found. Call initializeProfileDocument.');
        return { uid: currentUser.uid, email: currentUser.email, role: 'professional', profileType: getDefaultProfileType('professional') };
      }

      const userData = convertTimestamps(userDoc.data());
      const userRole = userData.role || 'professional';
      const userProfileType = userData.profileType || getDefaultProfileType(userRole);

      if (!userData.role || !userData.profileType) {
        console.warn("[useProfileData] User role or profileType missing, will attempt to update in init.");
      }

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
      } else {
        console.warn(`[useProfileData] Profile document in ${profileCollection} not found.`);
      }

      setProfileData(fetchedData);
      return fetchedData;

    } catch (err) {
      console.error('[useProfileData] Error fetching profile data:', err);
      setError(err.message || 'Failed to fetch profile data');

      // Return minimal valid data structure to allow UI to render (or show offline specific UI)
      const offlineData = {
        uid: currentUser.uid,
        email: currentUser.email,
        role: 'professional',
        profileType: getDefaultProfileType('professional'),
        isOffline: true
      };

      if (err.message === 'Request timed out' || err.code === 'unavailable' || err.message?.includes('offline')) {
        console.warn('[useProfileData] Fetch timed out or client offline - using fallback mode');
      }

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
    console.log('[useProfileData] Attempting to save:', dataToSave);
    try {
      const userFieldsToUpdate = {};
      const profileFieldsToUpdate = {};
      const now = Timestamp.now();

      const currentRole = dataToSave.role || profileData.role || 'professional'; // Prioritize dataToSave, then current, then default
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
      const userDocRef = doc(db, 'users', currentUser.uid);
      const profileDocRef = doc(db, profileCollection, currentUser.uid);

      if (Object.keys(userFieldsToUpdate).length > 0) {
        userFieldsToUpdate.updatedAt = now;
        const cleanedUserFields = cleanDataForFirebase(userFieldsToUpdate);
        if (cleanedUserFields && Object.keys(cleanedUserFields).length > 0) {
          console.log("[useProfileData] Updating User Doc:", cleanedUserFields);
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
          console.log(`[useProfileData] Updating Profile Doc in ${profileCollection}:`, cleanedProfileFields);
          await setDoc(profileDocRef, cleanedProfileFields, { merge: true });
        }
      }

      // Option to force re-fetch from server (for cases where backend may modify data)
      if (forceRefresh) {
        console.log("[useProfileData] Force refresh enabled - fetching fresh data from server");
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
      console.log("[useProfileData] Update successful. Returning merged data (no re-fetch).");
      return mergedData;

    } catch (err) { /* ... */ console.error('[useProfileData] Error updating profile data:', err); setError(err.message); throw err;
    } finally { setIsLoading(false); }
  };

  const initializeProfileDocument = useCallback(async (role = 'professional', type) => {
    if (!currentUser) return false;
    console.log(`[useProfileData] Initializing Profile Document for role: ${role}, type: ${type}`);
    setIsLoading(true);
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      let userDoc = await getDoc(userDocRef);
      let currentData = {};
      const finalRole = role;
      const finalProfileType = type || getDefaultProfileType(finalRole);

      if (!userDoc.exists()) {
        console.log("[useProfileData] Creating new user document with role and type...");
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
        console.log(`[useProfileData] Creating new ${profileCollection} document for type ${finalProfileType}...`);
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
      console.log("[useProfileData] Initialization check complete.");
      // Fetch the fresh, possibly newly created/updated data
      await fetchProfileData();
      return true;
    } catch (err) { /* ... */ console.error('[useProfileData] Error initializing profile:', err); setError(err.message); return false;
    } finally { setIsLoading(false); }
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
      console.error('[useProfileData] Error uploading profile picture:', error);
      throw error;
    }
  };

  const resetProfile = useCallback(async (targetRole, targetProfileType) => {
    if (!currentUser) throw new Error("Not authenticated");

    setIsLoading(true);
    try {
      // Use provided role/type or fallback to current profile data
      const userRole = targetRole || profileData?.role || 'professional';
      const userProfileType = targetProfileType || profileData?.profileType || (typeof getDefaultProfileType === 'function' ? getDefaultProfileType(userRole) : 'doctor');
      const profileCollection = getProfileCollectionName(userRole);

      const userDocRef = doc(db, 'users', currentUser.uid);
      const profileDocRef = doc(db, profileCollection, currentUser.uid);

      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        throw new Error("User document not found");
      }

      const userData = userDoc.data();
      const profileDoc = await getDoc(profileDocRef);

      const now = Timestamp.now();

      const existingProfileData = profileDoc.exists() ? profileDoc.data() : null;
      const autofillData = existingProfileData?.autofill || null;

      // Only reset user document fields relevant to this profile type
      const userUpdates = {
        role: userRole,
        profileType: userProfileType,
        updatedAt: now,
      };

      // completion flags will be set directly in resetProfileData
      if (userRole === 'professional') {
        // Also reset name fields to auth defaults if resetting professional
        userUpdates.firstName = currentUser.displayName?.split(' ')[0] || userData.firstName || '';
        userUpdates.lastName = currentUser.displayName?.split(' ').slice(1).join(' ') || userData.lastName || '';
      }

      await updateDoc(userDocRef, userUpdates);

      // Reset the specific Profile Document (Professional or Facility)
      const resetProfileData = {
        userId: currentUser.uid,
        createdAt: profileDoc.exists() ? profileDoc.data().createdAt : now,
        updatedAt: now,
        isProfessionalProfileComplete: false,
        tutorialPassed: false,
        ...(userRole === 'professional' ? {
          education: [],
          licensesCertifications: [],
          identity: {
            legalFirstName: userUpdates.firstName || userData.firstName || '',
            legalLastName: userUpdates.lastName || userData.lastName || ''
          },
          contact: {
            email: currentUser.email
          }
        } : {
          facilityName: `${userData.firstName || 'New'} ${userProfileType || ''}`.trim(),
          facilityDetails: {}
        })
      };

      if (autofillData) {
        resetProfileData.autofill = autofillData;
      }

      // Merge: false ensures we completely wipe the previous profile data
      await setDoc(profileDocRef, resetProfileData, { merge: false });

      await fetchProfileData();
      return true;
    } catch (err) {
      console.error('[useProfileData] Error resetting profile:', err);
      setError(err.message);
      throw err;
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