import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiTrash2, FiAlertCircle } from 'react-icons/fi';
import styles from './deleteConfirmationDialog.module.css';

const DeleteConfirmationDialog = ({ 
  event, 
  onConfirm, 
  onCancel,
  isRecurring = false 
}) => {
  const { t } = useTranslation();
  const [deleteOption, setDeleteOption] = useState('single');
  
  const handleDeleteClick = () => {
    onConfirm(deleteOption);
  };
  
  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.dialog} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <FiAlertCircle className={styles.icon} />
          <h3 className={styles.title}>
            {t('dashboard.calendar.deleteEventConfirmation')}
          </h3>
        </div>
        
        <div className={styles.content}>
          <p className={styles.message}>
            {t('dashboard.calendar.deleteEventMessage', { eventTitle: event.title })}
          </p>
          
          {isRecurring && (
            <div className={styles.options}>
              <label className={styles.option}>
                <input 
                  type="radio"
                  name="deleteOption"
                  value="single"
                  checked={deleteOption === 'single'}
                  onChange={() => setDeleteOption('single')}
                />
                <span>{t('dashboard.calendar.deleteThisEvent')}</span>
              </label>
              
              <label className={styles.option}>
                <input 
                  type="radio"
                  name="deleteOption"
                  value="future"
                  checked={deleteOption === 'future'}
                  onChange={() => setDeleteOption('future')}
                />
                <span>{t('dashboard.calendar.deleteThisAndFutureEvents')}</span>
              </label>
              
              <label className={styles.option}>
                <input 
                  type="radio"
                  name="deleteOption"
                  value="all"
                  checked={deleteOption === 'all'}
                  onChange={() => setDeleteOption('all')}
                />
                <span>{t('dashboard.calendar.deleteAllOccurrences')}</span>
              </label>
            </div>
          )}
        </div>
        
        <div className={styles.actions}>
          <button 
            className={styles.cancelButton} 
            onClick={onCancel}
          >
            {t('common.cancel')}
          </button>
          <button 
            className={styles.deleteButton}
            onClick={handleDeleteClick}
          >
            <FiTrash2 />
            {t('common.delete')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationDialog; 