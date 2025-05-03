import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './contractStatusBadge.module.css';

const ContractStatusBadge = ({ status }) => {
  const { t } = useTranslation();
  
  const getStatusLabel = () => {
    switch (status) {
      case 'draft':
        return t('dashboard.contracts.statusDraft');
      case 'sent':
        return t('dashboard.contracts.statusSent');
      case 'signed':
        return t('dashboard.contracts.statusSigned');
      case 'active':
        return t('dashboard.contracts.statusActive');
      case 'completed':
        return t('dashboard.contracts.statusCompleted');
      case 'cancelled':
        return t('dashboard.contracts.statusCancelled');
      default:
        return status;
    }
  };
  
  return (
    <div className={`${styles.badge} ${styles[status]}`}>
      {getStatusLabel()}
    </div>
  );
};

export default ContractStatusBadge; 