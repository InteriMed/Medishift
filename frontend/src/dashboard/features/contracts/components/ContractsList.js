import React from 'react';
import { format } from 'date-fns';
import { FiFileText } from 'react-icons/fi';
import styles from './contractsList.module.css';

const ContractsList = ({ contracts, selectedContractId, onSelectContract }) => {
  if (!contracts.length) {
    return (
      <div className={styles.emptyList}>
        <p>No contracts found</p>
      </div>
    );
  }

  return (
    <div className={styles.contractsList}>
      {contracts.map(contract => (
        <div
          key={contract.id}
          className={`${styles.contractItem} ${
            contract.id === selectedContractId ? styles.active : ''
          }`}
          onClick={() => onSelectContract(contract.id)}
        >
          <div className={styles.contractIcon}>
            <FiFileText />
          </div>
          
          <div className={styles.contractInfo}>
            <h3 className={styles.contractTitle}>{contract.title}</h3>
            <div className={styles.contractMeta}>
              <span className={styles.contractDate}>
                {format(new Date(contract.createdAt), 'MMM d, yyyy')}
              </span>
              <span className={`${styles.contractStatus} ${styles[contract.status]}`}>
                {contract.status}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ContractsList; 