import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiPlus, FiSearch, FiFilter } from 'react-icons/fi';
import useContractsData from '../../hooks/useContractsData';
import LoadingSpinner from '../../components/LoadingSpinner/LoadingSpinner';
import ErrorMessage from '../../components/ErrorMessage/ErrorMessage';
import ContractsList from './components/ContractsList';
import ContractDetails from './components/ContractDetails';
import ContractForm from './components/ContractForm';
import ContractFilters from './components/ContractFilters';
import styles from './contracts.module.css';

const Contracts = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    dateRange: null,
    type: 'all',
  });
  const [selectedContractId, setSelectedContractId] = useState(null);
  const [showContractForm, setShowContractForm] = useState(false);
  const [editingContract, setEditingContract] = useState(null);
  
  const {
    contracts,
    isLoading,
    error,
    createContract,
    updateContract,
    deleteContract
  } = useContractsData();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={t('dashboard.contracts.errorLoadingContracts')} />;

  const selectedContract = contracts.find(c => c.id === selectedContractId);

  const handleCreateContract = (contractData) => {
    createContract(contractData).then(() => {
      setShowContractForm(false);
    });
  };

  const handleUpdateContract = (contractId, contractData) => {
    updateContract(contractId, contractData).then(() => {
      setShowContractForm(false);
      setEditingContract(null);
    });
  };

  const handleEditContract = (contract) => {
    setEditingContract(contract);
    setShowContractForm(true);
  };

  const filteredContracts = contracts
    .filter(contract => 
      contract.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter(contract => {
      if (filters.status === 'all') return true;
      return contract.status === filters.status;
    })
    .filter(contract => {
      if (filters.type === 'all') return true;
      return contract.type === filters.type;
    })
    .filter(contract => {
      if (!filters.dateRange) return true;
      const contractDate = new Date(contract.createdAt);
      return contractDate >= filters.dateRange[0] && contractDate <= filters.dateRange[1];
    });

  return (
    <div className={styles.contractsContainer}>
      <div className={styles.toolbar}>
        <div className={styles.searchContainer}>
          <FiSearch className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder={t('dashboard.contracts.searchContracts')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <button 
          className={styles.filterButton}
          onClick={() => setShowFilters(!showFilters)}
        >
          <FiFilter />
          <span>{t('dashboard.contracts.filter')}</span>
        </button>
        
        <button 
          className={styles.createButton}
          onClick={() => {
            setEditingContract(null);
            setShowContractForm(true);
          }}
        >
          <FiPlus />
          <span>{t('dashboard.contracts.createContract')}</span>
        </button>
      </div>
      
      {showFilters && (
        <ContractFilters
          filters={filters}
          onFilterChange={setFilters}
          onClose={() => setShowFilters(false)}
        />
      )}
      
      <div className={styles.content}>
        <div className={styles.contractsList}>
          <ContractsList
            contracts={filteredContracts}
            selectedContractId={selectedContractId}
            onSelectContract={setSelectedContractId}
          />
        </div>
        
        <div className={styles.contractDetails}>
          {selectedContract ? (
            <ContractDetails
              contract={selectedContract}
              onEdit={handleEditContract}
              onDelete={deleteContract}
            />
          ) : (
            <div className={styles.emptyState}>
              <p>{t('dashboard.contracts.selectContract')}</p>
            </div>
          )}
        </div>
      </div>
      
      {showContractForm && (
        <ContractForm
          contract={editingContract}
          onSubmit={editingContract 
            ? (data) => handleUpdateContract(editingContract.id, data)
            : handleCreateContract
          }
          onCancel={() => {
            setShowContractForm(false);
            setEditingContract(null);
          }}
        />
      )}
    </div>
  );
};

export default Contracts; 