import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../../services/firebase';
import { FIRESTORE_COLLECTIONS } from '../../../../../config/keysDatabase';

export const useFacilitiesAndOrganizations = (currentUser, workspaces) => {
  const [facilities, setFacilities] = useState([]);
  const [organizations, setOrganizations] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser || !workspaces) return;

      const facilitiesList = [];
      const organizationsList = [];

      for (const workspace of workspaces) {
        if (workspace.type === 'facility' && workspace.facilityId) {
          try {
            const facilityRef = doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, workspace.facilityId);
            const facilitySnap = await getDoc(facilityRef);
            if (facilitySnap.exists()) {
              const facilityData = facilitySnap.data();
              facilitiesList.push({
                id: facilitySnap.id,
                name: facilityData.facilityName || facilityData.companyName || 'Unknown Facility'
              });
            }
          } catch (error) {
            console.error(`Error fetching facility ${workspace.facilityId}:`, error);
          }
        } else if (workspace.type === 'organization' && workspace.organizationId) {
          try {
            const orgRef = doc(db, FIRESTORE_COLLECTIONS.ORGANIZATIONS, workspace.organizationId);
            const orgSnap = await getDoc(orgRef);
            if (orgSnap.exists()) {
              const orgData = orgSnap.data();
              organizationsList.push({
                id: orgSnap.id,
                name: orgData.organizationName || orgData.name || 'Unknown Organization'
              });
            }
          } catch (error) {
            console.error(`Error fetching organization ${workspace.organizationId}:`, error);
          }
        }
      }

      setFacilities(facilitiesList);
      setOrganizations(organizationsList);
    };

    fetchData();
  }, [currentUser, workspaces]);

  return { facilities, organizations };
};

