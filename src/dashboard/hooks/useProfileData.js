import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/authContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/services/firebase';
import { FIRESTORE_COLLECTIONS } from '../../config/keysDatabase';

export const useProfileData = () => {
  const { currentUser, userProfile } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProfileData = useCallback(async () => {
    if (!currentUser?.uid) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const profileRef = doc(db, FIRESTORE_COLLECTIONS.PROFESSIONAL_PROFILES, currentUser.uid);
      const profileSnap = await getDoc(profileRef);

      if (profileSnap.exists()) {
        setProfileData(profileSnap.data());
      } else {
        setProfileData(userProfile || {});
      }
    } catch (err) {
      console.error('Error fetching profile data:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.uid, userProfile]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const updateProfileData = useCallback(async (newData) => {
    setProfileData(newData);
    return newData;
  }, []);

  return {
    profileData,
    isLoading,
    error,
    updateProfileData,
    refetch: fetchProfileData
  };
};

export default useProfileData;

