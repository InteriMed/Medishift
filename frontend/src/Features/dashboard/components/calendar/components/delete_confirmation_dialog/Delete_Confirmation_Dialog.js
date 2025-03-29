import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import './Delete_Confirmation_Dialog.css';

const DeleteConfirmationDialog = ({ 
  event, 
  onConfirm, 
  onCancel, 
  isRecurring = false,
  currentDate 
}) => {
  const { t, i18n } = useTranslation();
  const dialogRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target)) {
        onCancel();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onCancel]);

  const handleDelete = (deleteType) => {
    if (deleteType === 'all') {
      onConfirm('future');
    } else {
      onConfirm(deleteType);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString(i18n.language, {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="delete-confirmation-overlay">
      <div ref={dialogRef} className="delete-confirmation-dialog">
        {!isRecurring ? (
          <>
            <h3>{t('dashboard.calendar.deleteConfirmation.title')}</h3>
            <p>{formatDate(currentDate)}</p>
            <p>{t('dashboard.calendar.deleteConfirmation.message')}</p>
            <div className="delete-confirmation-actions">
              <button className="cancel-button" onClick={onCancel}>{t('dashboard.calendar.deleteConfirmation.cancel')}</button>
              <button 
                className="delete-button-confirm" 
                onClick={() => handleDelete('single')}
              >
                {t('dashboard.calendar.deleteConfirmation.delete')}
              </button>
            </div>
          </>
        ) : (
          <>
            <h3>{t('dashboard.calendar.deleteConfirmation.title')}</h3>
            <p>{formatDate(currentDate)}</p>
            <p>{t('dashboard.calendar.deleteConfirmation.message')}</p>
            <div className="delete-confirmation-actions">
              <button onClick={onCancel}>{t('dashboard.calendar.deleteConfirmation.cancel')}</button>
              <button 
                className="delete-button-single-confirm" 
                onClick={() => handleDelete('single')}
              >
                {t('dashboard.calendar.deleteConfirmation.deleteThisOnly')}
              </button><button 
                className="delete-button-all-confirm" 
                onClick={() => handleDelete('all')}
              >
                {t('dashboard.calendar.deleteConfirmation.deleteAllFuture')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DeleteConfirmationDialog; 