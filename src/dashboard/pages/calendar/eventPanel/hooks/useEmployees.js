import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../../services/services/firebase';
import { FIRESTORE_COLLECTIONS } from '../../../../../config/keysDatabase';

export const useEmployees = (facilityId, organizationId, selectedWorkspace) => {
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  useEffect(() => {
    const fetchEmployees = async () => {
      const isTeamWorkspace = selectedWorkspace?.type === 'facility' || selectedWorkspace?.type === 'organization' || !!selectedWorkspace?.facilityId;
      const shouldLoadEmployees = facilityId || organizationId || (isTeamWorkspace && !facilityId && !organizationId);

      if (!shouldLoadEmployees) {
        setEmployees([]);
        return;
      }

      setLoadingEmployees(true);
      try {
        const employeesList = [];
        const processedUserIds = new Set();

        let facilityIdToUse = facilityId;
        let organizationIdToUse = organizationId;

        if (!facilityIdToUse && !organizationIdToUse && isTeamWorkspace) {
          if (selectedWorkspace?.facilityId) {
            facilityIdToUse = selectedWorkspace.facilityId;
          } else if (selectedWorkspace?.organizationId) {
            organizationIdToUse = selectedWorkspace.organizationId;
          }
        }

        if (facilityIdToUse) {
          await fetchFacilityEmployees(facilityIdToUse, employeesList, processedUserIds);
        } else if (organizationIdToUse) {
          await fetchOrganizationEmployees(organizationIdToUse, employeesList, processedUserIds);
        }

        setEmployees(employeesList);
      } catch (error) {
        console.error('Error fetching employees:', error);
      } finally {
        setLoadingEmployees(false);
      }
    };

    fetchEmployees();
  }, [facilityId, organizationId, selectedWorkspace]);

  return { employees, loadingEmployees };
};

const fetchUserData = async (userId, employeesList, processedUserIds) => {
  if (!userId || processedUserIds.has(userId)) return;
  processedUserIds.add(userId);

  try {
    const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const userData = userSnap.data();
      employeesList.push({
        id: userId,
        name: `${userData.firstName || userData.identity?.firstName || ''} ${userData.lastName || userData.identity?.lastName || ''}`.trim() || userData.email || 'Unknown',
        email: userData.email || ''
      });
    }
  } catch (error) {
    console.error(`Error fetching user ${userId}:`, error);
  }
};

const fetchFacilityEmployees = async (facilityId, employeesList, processedUserIds) => {
  try {
    const facilityRef = doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, facilityId);
    const facilitySnap = await getDoc(facilityRef);
    if (facilitySnap.exists()) {
      const facilityData = facilitySnap.data();
      const employeesData = facilityData.employees || [];

      for (const emp of employeesData) {
        const userId = emp.user_uid || emp.uid;
        await fetchUserData(userId, employeesList, processedUserIds);
      }
    }
  } catch (error) {
    console.error(`Error fetching facility ${facilityId}:`, error);
  }
};

const fetchOrganizationEmployees = async (organizationId, employeesList, processedUserIds) => {
  try {
    const orgRef = doc(db, FIRESTORE_COLLECTIONS.ORGANIZATIONS, organizationId);
    const orgSnap = await getDoc(orgRef);
    if (orgSnap.exists()) {
      const orgData = orgSnap.data();

      const internalTeamEmployees = orgData.internalTeam?.employees || [];
      const sharedTeamEmployees = orgData.sharedTeam?.employees || [];
      const memberFacilityIds = orgData.memberFacilityIds || [];

      for (const emp of internalTeamEmployees) {
        const userId = emp.user_uid || emp.uid;
        await fetchUserData(userId, employeesList, processedUserIds);
      }

      for (const emp of sharedTeamEmployees) {
        const userId = emp.user_uid || emp.uid;
        await fetchUserData(userId, employeesList, processedUserIds);
      }

      for (const facilityId of memberFacilityIds) {
        await fetchFacilityEmployees(facilityId, employeesList, processedUserIds);
      }
    }
  } catch (error) {
    console.error(`Error fetching organization ${organizationId}:`, error);
  }
};

