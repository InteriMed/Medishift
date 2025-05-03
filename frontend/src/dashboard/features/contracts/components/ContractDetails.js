import React from 'react';
import { format } from 'date-fns';
import { FiEdit, FiTrash2, FiDownload, FiClock } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import ContractStatusBadge from './ContractStatusBadge';
import styles from './contractDetails.module.css';

const ContractDetails = ({ contract, onEdit, onDelete }) => {
  const { t } = useTranslation();
  
  const handleDelete = () => {
    if (window.confirm(t('dashboard.contracts.confirmDelete'))) {
      onDelete(contract.id);
    }
  };
  
  return (
    <div className={styles.contractDetails}>
      <div className={styles.header}>
        <h2 className={styles.title}>{contract.title}</h2>
        
        <div className={styles.actions}>
          <button 
            className={styles.actionButton} 
            onClick={() => onEdit(contract)}
            title={t('dashboard.contracts.edit')}
          >
            <FiEdit />
          </button>
          
          <button 
            className={styles.actionButton} 
            onClick={handleDelete}
            title={t('dashboard.contracts.delete')}
          >
            <FiTrash2 />
          </button>
          
          <button 
            className={styles.actionButton}
            onClick={() => window.open(`/api/contracts/${contract.id}/pdf`, '_blank')}
            title={t('dashboard.contracts.download')}
          >
            <FiDownload />
          </button>
        </div>
      </div>
      
      <div className={styles.status}>
        <ContractStatusBadge status={contract.status} />
        <span className={styles.statusDate}>
          {t('dashboard.contracts.created')}: {format(new Date(contract.createdAt), 'MMM d, yyyy')}
        </span>
      </div>
      
      <div className={styles.content}>
        {contract.description && (
          <>
            <h3 className={styles.sectionTitle}>{t('dashboard.contracts.description')}</h3>
            <p className={styles.description}>{contract.description}</p>
          </>
        )}
        
        {contract.parties && (
          <>
            <h3 className={styles.sectionTitle}>{t('dashboard.contracts.parties')}</h3>
            <div className={styles.parties}>
              {contract.parties.map((party, index) => (
                <div key={index} className={styles.party}>
                  <h4 className={styles.partyName}>{party.name}</h4>
                  <p className={styles.partyDetails}>
                    {party.role && <span>{party.role}</span>}
                    {party.email && <span>{party.email}</span>}
                    {party.phone && <span>{party.phone}</span>}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
        
        {contract.terms && (
          <>
            <h3 className={styles.sectionTitle}>{t('dashboard.contracts.terms')}</h3>
            <div className={styles.terms}>
              {contract.terms.map((term, index) => (
                <div key={index} className={styles.term}>
                  <h4 className={styles.termTitle}>{term.title}</h4>
                  <p className={styles.termContent}>{term.content}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      
      <div className={styles.history}>
        <h3 className={styles.sectionTitle}>
          <FiClock className={styles.historyIcon} />
          {t('dashboard.contracts.history')}
        </h3>
        
        {contract.history ? (
          <div className={styles.historyList}>
            {contract.history.map((item, index) => (
              <div key={index} className={styles.historyItem}>
                <div className={styles.historyAction}>{item.action}</div>
                <div className={styles.historyMeta}>
                  <span className={styles.historyUser}>{item.user}</span>
                  <span className={styles.historyDate}>
                    {format(new Date(item.timestamp), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.emptyHistory}>{t('dashboard.contracts.noHistory')}</p>
        )}
      </div>
    </div>
  );
};

export default ContractDetails; 