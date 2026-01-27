import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDashboard } from '../contexts/DashboardContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { FIRESTORE_COLLECTIONS } from '../../config/keysDatabase';
import { useNotification } from '../../contexts/NotificationContext';

const useEmployeesData = () => {
  const { t } = useTranslation();
  const { user, selectedWorkspace } = useDashboard();
  const { showError } = useNotification();

  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    role: 'all',
    facility: 'all',
    searchTerm: '',
  });

  const memberFacilities = useMemo(() => {
    if (!selectedWorkspace || (selectedWorkspace.type !== 'team' && selectedWorkspace.type !== 'organization' && selectedWorkspace.type !== 'facility')) return [];
    const facilityId = selectedWorkspace.facilityId || selectedWorkspace.organizationId;
    if (!facilityId) return [];
    return [{ 
      id: facilityId, 
      facilityName: selectedWorkspace.facilityName || selectedWorkspace.companyName,
      companyName: selectedWorkspace.companyName,
      ...selectedWorkspace 
    }];
  }, [selectedWorkspace]);

  useEffect(() => {
    if (!user || !selectedWorkspace || (selectedWorkspace.type !== 'team' && selectedWorkspace.type !== 'organization' && selectedWorkspace.type !== 'facility')) {
      setEmployees([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const loadEmployees = async () => {
      try {
        const allEmployees = [];
        const processedUserIds = new Set();

        for (const facility of memberFacilities) {
          const facilityId = facility.id;
          try {
            const facilityRef = doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, facilityId);
            const facilitySnap = await getDoc(facilityRef);

            if (facilitySnap.exists()) {
              const facilityData = facilitySnap.data();
              const employeesList = facilityData.employees || [];
              const adminsList = facilityData.admins || [];

              for (const emp of employeesList) {
                const userId = emp.user_uid || emp.uid;
                if (!userId || processedUserIds.has(userId)) continue;
                processedUserIds.add(userId);

                try {
                  const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId);
                  const userSnap = await getDoc(userRef);
                  const professionalRef = doc(db, FIRESTORE_COLLECTIONS.PROFESSIONAL_PROFILES, userId);
                  const professionalSnap = await getDoc(professionalRef);

                  let userData = {};
                  if (userSnap.exists()) {
                    userData = userSnap.data();
                  }
                  if (professionalSnap.exists()) {
                    userData = { ...userData, ...professionalSnap.data() };
                  }

                  const roles = emp.roles || ['employee'];
                  const isAdmin = adminsList.includes(userId) || roles.includes('admin');

                  allEmployees.push({
                    id: userId,
                    email: userData.email || '',
                    firstName: userData.firstName || userData.identity?.firstName || '',
                    lastName: userData.lastName || userData.identity?.lastName || '',
                    photoURL: userData.photoURL || userData.profileDisplay?.profilePictureUrl || '',
                    roles: roles,
                    isAdmin: isAdmin,
                    rights: emp.rights || [],
                    facilityId: facilityId,
                    facilityName: facility.facilityName || facility.companyName || 'Unknown Facility',
                    hireDate: emp.hireDate?.toDate?.() || emp.hireDate || null,
                    contractId: emp.contractId || null,
                    status: emp.status || 'active',
                    createdAt: emp.hireDate?.toDate?.() || emp.hireDate || new Date()
                  });
                } catch (error) {
                  console.error(`Error loading employee ${userId}:`, error);
                }
              }
            }
          } catch (error) {
            console.error(`Error loading facility ${facilityId}:`, error);
          }
        }

        setEmployees(allEmployees);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading employees:', err);
        setError(err);
        showError(t('dashboard.employees.errorLoadingEmployees', 'Failed to load employees'));
        setIsLoading(false);
      }
    };

    loadEmployees();
  }, [user, selectedWorkspace, memberFacilities, t, showError]);

  useEffect(() => {
    if (!employees.length) {
      setFilteredEmployees([]);
      return;
    }

    let result = [...employees];

    if (filters.status !== 'all') {
      result = result.filter(emp => emp.status === filters.status);
    }

    if (filters.role !== 'all') {
      result = result.filter(emp => emp.roles?.includes(filters.role));
    }

    if (filters.facility !== 'all') {
      result = result.filter(emp => emp.facilityId === filters.facility);
    }

    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      result = result.filter(emp => {
        const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
        const email = (emp.email || '').toLowerCase();
        const facilityName = (emp.facilityName || '').toLowerCase();
        const roles = (emp.roles || []).join(' ').toLowerCase();
        return fullName.includes(searchLower) || email.includes(searchLower) || facilityName.includes(searchLower) || roles.includes(searchLower);
      });
    }

    setFilteredEmployees(result);
  }, [filters, employees]);

  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      status: 'all',
      role: 'all',
      facility: 'all',
      searchTerm: '',
    });
  }, []);

  const refreshEmployees = useCallback(() => {
    if (user && selectedWorkspace) {
      setIsLoading(true);
    }
  }, [user, selectedWorkspace]);

  return {
    employees,
    filteredEmployees,
    isLoading,
    error,
    filters,
    refreshEmployees,
    updateFilters,
    clearFilters,
    memberFacilities
  };
};

export default useEmployeesData;

