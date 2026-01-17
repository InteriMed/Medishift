import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDashboard } from '../contexts/DashboardContext';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { WORKSPACE_TYPES } from '../../utils/sessionAuth';
import { useNotification } from '../../contexts/NotificationContext';

const useContractsData = () => {
  const { t } = useTranslation();
  const { user, selectedWorkspace } = useDashboard();
  const { showError, showSuccess } = useNotification();

  const [contracts, setContracts] = useState([]);
  const [filteredContracts, setFilteredContracts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    dateRange: null,
    searchTerm: '',
  });

  // Helper function to check if user is facility admin for a specific facility
  const isFacilityAdmin = useMemo(() => {
    return (facilityId) => {
      if (!user || !user.roles) return false;
      return user.roles.includes(`facility_admin_${facilityId}`);
    };
  }, [user]);

  // Helper function to check if user has any facility admin role
  const hasAnyFacilityAdminRole = useMemo(() => {
    if (!user || !user.roles) return false;
    return user.roles.some(role => role.startsWith('facility_admin_'));
  }, [user]);

  // Helper function to get user's facility memberships
  const getUserFacilityIds = useMemo(() => {
    if (!user || !user.facilityMemberships) return [];
    return user.facilityMemberships.map(membership => membership.facilityProfileId);
  }, [user]);

  // Load contracts based on workspace and user permissions
  useEffect(() => {
    if (!user || !selectedWorkspace) {
      setContracts([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    console.log('[useContractsData] Loading contracts for workspace:', selectedWorkspace.type);

    let contractsQuery;
    const contractsRef = collection(db, 'contracts');

    try {
      if (selectedWorkspace.type === WORKSPACE_TYPES.PERSONAL) {
        // Personal workspace: Check for contracts where user is the professional
        contractsQuery = query(
          contractsRef,
          where('parties.professional.profileId', '==', user.uid),
          orderBy('statusLifecycle.timestamps.createdAt', 'desc')
        );
      } else if (selectedWorkspace.type === WORKSPACE_TYPES.TEAM) {
        // Team workspace logic
        const facilityId = selectedWorkspace.facilityId;

        if (isFacilityAdmin(facilityId)) {
          // Facility admin in team workspace: show contracts the facility is involved with
          contractsQuery = query(
            contractsRef,
            where('parties.employer.profileId', '==', facilityId),
            orderBy('statusLifecycle.timestamps.createdAt', 'desc')
          );
        } else {
          // Regular facility employee: show only their own contracts
          contractsQuery = query(
            contractsRef,
            where('parties.professional.profileId', '==', user.uid),
            orderBy('statusLifecycle.timestamps.createdAt', 'desc')
          );
        }
      } else {
        // Fallback: show user's own contracts
        contractsQuery = query(
          contractsRef,
          where('parties.professional.profileId', '==', user.uid),
          orderBy('statusLifecycle.timestamps.createdAt', 'desc')
        );
      }

      // Set up real-time listener
      const unsubscribe = onSnapshot(
        contractsQuery,
        (snapshot) => {
          const contractsList = [];

          snapshot.forEach((doc) => {
            const contractData = doc.data();
            contractsList.push({
              id: doc.id,
              ...contractData,
              // Add computed fields for easier filtering and display
              title: contractData.terms?.jobTitle || 'Untitled Contract',
              status: contractData.statusLifecycle?.currentStatus || 'unknown',
              createdAt: contractData.statusLifecycle?.timestamps?.createdAt || new Date(),
              startDate: contractData.terms?.startDate || null,
              endDate: contractData.terms?.endDate || null,
              companyName: contractData.parties?.employer?.legalCompanyName || 'Unknown Company',
              workerName: `${contractData.parties?.professional?.legalFirstName || ''} ${contractData.parties?.professional?.legalLastName || ''}`.trim() || 'Unknown Professional',
              // Add workspace context
              workspaceType: selectedWorkspace.type,
              facilityId: selectedWorkspace.type === WORKSPACE_TYPES.TEAM ? selectedWorkspace.facilityId : null
            });
          });

          console.log(`[useContractsData] Found ${contractsList.length} contracts`);
          setContracts(contractsList);
          setIsLoading(false);
        },
        (err) => {
          console.error('Error listening to contracts:', err);
          setError(err);
          showError(t('dashboard.contracts.errorLoadingContracts', 'Failed to load contracts'));
          setIsLoading(false);
        }
      );

      // Return cleanup function
      return unsubscribe;
    } catch (err) {
      console.error('Error setting up contracts listener:', err);
      setError(err);
      showError(t('dashboard.contracts.errorLoadingContracts', 'Failed to load contracts'));
      setIsLoading(false);
    }
  }, [user, selectedWorkspace, hasAnyFacilityAdminRole, isFacilityAdmin, t, showError]);

  // Apply filters to contracts
  useEffect(() => {
    if (!contracts.length) {
      setFilteredContracts([]);
      return;
    }

    let result = [...contracts];

    // Filter by status
    if (filters.status !== 'all') {
      result = result.filter(contract => contract.status === filters.status);
    }

    // Filter by date range
    if (filters.dateRange && filters.dateRange.startDate && filters.dateRange.endDate) {
      const startDate = new Date(filters.dateRange.startDate).getTime();
      const endDate = new Date(filters.dateRange.endDate).getTime();

      result = result.filter(contract => {
        const contractDate = contract.startDate?.toDate?.()
          ? contract.startDate.toDate().getTime()
          : new Date(contract.startDate).getTime();

        return contractDate >= startDate && contractDate <= endDate;
      });
    }

    // Filter by search term
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      result = result.filter(contract =>
        contract.title?.toLowerCase().includes(searchLower) ||
        contract.companyName?.toLowerCase().includes(searchLower) ||
        contract.workerName?.toLowerCase().includes(searchLower) ||
        contract.terms?.workLocation?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredContracts(result);
  }, [filters, contracts]);

  // Update contract status
  const updateContractStatus = useCallback(async (contractId, newStatus, notes = '') => {
    if (!user) return false;

    try {
      const contractRef = doc(db, 'contracts', contractId);

      await updateDoc(contractRef, {
        'statusLifecycle.currentStatus': newStatus,
        'statusLifecycle.timestamps.updatedAt': serverTimestamp(),
        ...(notes && { 'statusLifecycle.notes': notes })
      });

      showSuccess(t('dashboard.contracts.statusUpdated', 'Contract status updated successfully'));
      return true;
    } catch (err) {
      console.error('Error updating contract status:', err);
      showError(t('dashboard.contracts.errorUpdatingStatus', 'Failed to update contract status'));
      return false;
    }
  }, [user, t, showError, showSuccess]);

  // Get contract permissions for current user and workspace
  const getContractPermissions = useCallback((contract) => {
    if (!user || !selectedWorkspace || !contract) {
      return {
        canView: false,
        canEdit: false,
        canApprove: false,
        canCancel: false
      };
    }

    const isContractProfessional = contract.parties?.professional?.profileId === user.uid;
    const isContractFacility = selectedWorkspace.type === WORKSPACE_TYPES.TEAM &&
      contract.parties?.employer?.profileId === selectedWorkspace.facilityId;
    const isFacilityAdminForContract = selectedWorkspace.type === WORKSPACE_TYPES.TEAM &&
      isFacilityAdmin(selectedWorkspace.facilityId);

    return {
      canView: isContractProfessional || isContractFacility,
      canEdit: (isContractProfessional && contract.status === 'draft') ||
        (isFacilityAdminForContract && ['draft', 'pending_professional_approval'].includes(contract.status)),
      canApprove: (isContractProfessional && contract.status === 'pending_professional_approval') ||
        (isFacilityAdminForContract && contract.status === 'pending_facility_approval'),
      canCancel: isContractProfessional || isFacilityAdminForContract
    };
  }, [user, selectedWorkspace, isFacilityAdmin]);

  // Get workspace-appropriate empty state message
  const getEmptyStateMessage = useCallback(() => {
    if (!selectedWorkspace) return { title: 'No Contracts', description: 'No contracts found.' };

    if (selectedWorkspace.type === WORKSPACE_TYPES.PERSONAL) {
      return {
        title: 'No Personal Contracts',
        description: 'You don\'t have any contracts in your personal workspace yet.'
      };
    } else if (selectedWorkspace.type === WORKSPACE_TYPES.TEAM) {
      const isAdmin = isFacilityAdmin(selectedWorkspace.facilityId);
      return {
        title: isAdmin
          ? 'No Facility Contracts'
          : 'No Personal Contracts',
        description: isAdmin
          ? 'This facility doesn\'t have any contracts yet.'
          : 'You don\'t have any contracts with this facility yet.'
      };
    }

    return {
      title: 'No Contracts',
      description: 'No contracts found.'
    };
  }, [selectedWorkspace, isFacilityAdmin]);

  // Filter management
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      status: 'all',
      dateRange: null,
      searchTerm: '',
    });
  }, []);

  // Manual refresh function
  const refreshContracts = useCallback(() => {
    if (user && selectedWorkspace) {
      setIsLoading(true);
      // The useEffect will handle the actual loading
    }
  }, [user, selectedWorkspace]);

  return {
    contracts,
    filteredContracts,
    isLoading,
    error,
    filters,
    // Actions
    refreshContracts,
    updateContractStatus,
    updateFilters,
    clearFilters,
    // Utils
    getContractPermissions,
    getEmptyStateMessage,
    // Workspace info
    currentWorkspace: selectedWorkspace,
    userPermissions: {
      isFacilityAdmin: selectedWorkspace?.type === WORKSPACE_TYPES.TEAM ?
        isFacilityAdmin(selectedWorkspace.facilityId) : false,
      hasAnyFacilityAdminRole: hasAnyFacilityAdminRole,
      facilityIds: getUserFacilityIds
    }
  };
};

export default useContractsData;