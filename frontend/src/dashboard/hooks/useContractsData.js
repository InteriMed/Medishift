import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDashboard } from '../context/DashboardContext';
import contractsService from '../../services/contractsService';
import { showNotification } from '../utils/notifications';

const useContractsData = () => {
  const { t } = useTranslation();
  const { workspaceId, isLoading: isDashboardLoading } = useDashboard();
  
  const [contracts, setContracts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Load contracts
  const loadContracts = useCallback(async () => {
    if (!workspaceId) return;
    
    setIsLoading(true);
    try {
      const contractsData = await contractsService.getContracts();
      setContracts(contractsData);
      setError(null);
    } catch (err) {
      console.error('Error loading contracts:', err);
      setError(err);
      showNotification(t('dashboard.contracts.errorLoadingContracts'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, t]);

  // Initial load
  useEffect(() => {
    if (!isDashboardLoading) {
      loadContracts();
    }
  }, [isDashboardLoading, loadContracts]);
  
  // Create contract
  const createContract = async (contractData) => {
    try {
      const newContract = await contractsService.createContract({
        ...contractData,
        workspaceId
      });
      setContracts(prev => [...prev, newContract]);
      showNotification(t('dashboard.contracts.contractCreated'), 'success');
      return newContract;
    } catch (err) {
      console.error('Error creating contract:', err);
      showNotification(t('dashboard.contracts.errorCreatingContract'), 'error');
      throw err;
    }
  };
  
  // Update contract
  const updateContract = async (contractId, contractData) => {
    try {
      const updatedContract = await contractsService.updateContract(contractId, contractData);
      setContracts(prev => prev.map(contract => 
        contract.id === contractId ? updatedContract : contract
      ));
      showNotification(t('dashboard.contracts.contractUpdated'), 'success');
      return updatedContract;
    } catch (err) {
      console.error('Error updating contract:', err);
      showNotification(t('dashboard.contracts.errorUpdatingContract'), 'error');
      throw err;
    }
  };
  
  // Delete contract
  const deleteContract = async (contractId) => {
    try {
      await contractsService.deleteContract(contractId);
      setContracts(prev => prev.filter(contract => contract.id !== contractId));
      showNotification(t('dashboard.contracts.contractDeleted'), 'success');
    } catch (err) {
      console.error('Error deleting contract:', err);
      showNotification(t('dashboard.contracts.errorDeletingContract'), 'error');
      throw err;
    }
  };
  
  return {
    contracts,
    isLoading,
    error,
    loadContracts,
    createContract,
    updateContract,
    deleteContract
  };
};

export default useContractsData; 