import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../../services/services/firebase';
import { FIRESTORE_COLLECTIONS } from '../../../../../config/keysDatabase';

export const useFacilityOpeningHours = (facilityId) => {
  const [facilityOpeningHours, setFacilityOpeningHours] = useState(null);

  useEffect(() => {
    const fetchFacilityOpeningHours = async () => {
      if (!facilityId) {
        setFacilityOpeningHours(null);
        return;
      }

      try {
        const facilityRef = doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, facilityId);
        const facilitySnap = await getDoc(facilityRef);
        if (facilitySnap.exists()) {
          const facilityData = facilitySnap.data();
          const hours = facilityData?.operationalSettings?.standardOpeningHours || null;
          setFacilityOpeningHours(hours);
        }
      } catch (error) {
        console.error(`Error fetching facility opening hours:`, error);
        setFacilityOpeningHours(null);
      }
    };

    fetchFacilityOpeningHours();
  }, [facilityId]);

  return facilityOpeningHours;
};

