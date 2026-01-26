import React, { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FiX, FiTrash2 } from 'react-icons/fi';
import '../../../../styles/variables.css';

const DeleteConfirmationDialog = ({ event, currentDate, onConfirm, onCancel }) => {
  const { t } = useTranslation(['calendar', 'common']);

  const hasRecurrenceId = event.recurrenceId != null;
  const isRecurringEvent = hasRecurrenceId;
  const recurrenceMetadata = event.recurrenceMetadata || {};
  const eventStart = new Date(event.start);
  const isPastEvent = eventStart < new Date();

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  }, [onCancel]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)'
      }}
      onClick={handleBackdropClick}
    >
      <div
        className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col transform transition-all duration-200 scale-100 animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--background-div-color)',
          borderColor: 'var(--red-2)',
          boxShadow: 'var(--box-shadow-md)'
        }}
      >
        <div
          className="flex items-center justify-between px-6 py-5 border-b"
          style={{
            borderBottomColor: 'var(--red-2)',
            backgroundColor: 'var(--red-1)'
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-full"
              style={{
                backgroundColor: 'var(--red-2)',
                color: 'var(--white)'
              }}
            >
              <FiTrash2 size={24} />
            </div>
            <h3
              className="text-xl font-semibold tracking-tight"
              style={{
                color: 'var(--red-2)',
                fontFamily: 'var(--font-family-headings)',
                fontSize: 'var(--font-size-large)'
              }}
            >
              {isRecurringEvent
                ? t('calendar:deleteRecurringEvent', 'Delete Recurring Event')
                : t('calendar:deleteEvent', 'Delete Event')}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="p-2 rounded-full transition-colors hover:bg-black/5"
            style={{
              color: 'var(--red-2)'
            }}
            aria-label="Close"
          >
            <FiX size={20} />
          </button>
        </div>

        <div
          className="p-6 flex-1"
          style={{
            color: 'var(--text-color)',
            fontFamily: 'var(--font-family-text)',
            fontSize: 'var(--font-size-medium)',
            lineHeight: '1.6'
          }}
        >
          <p style={{ marginBottom: 'var(--spacing-md)' }}>
            {isRecurringEvent
              ? t('calendar:deleteMessage', 'This is a recurring event. Which occurrences would you like to delete?')
              : t('calendar:deleteSingleMessage', 'Are you sure you want to delete this event? This action cannot be undone.')}
          </p>
          {isPastEvent && (
            <div
              className="p-4 rounded-lg mt-4"
              style={{
                backgroundColor: 'var(--grey-1-light)',
                border: '1px solid var(--grey-2)',
                color: 'var(--text-color)',
                fontSize: 'var(--font-size-small)'
              }}
            >
              <strong>{t('calendar:pastEventDeleteNote', 'Note: This is a past event.')}</strong>
            </div>
          )}
        </div>

        <div
          className="px-6 py-4 border-t flex justify-end gap-3"
          style={{
            borderTopColor: 'var(--grey-2)',
            backgroundColor: 'var(--grey-1-light)'
          }}
        >
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
          >
            {t('common:deleteConfirmation.cancel', 'Cancel')}
          </button>

          {isRecurringEvent ? (
            <>
              <button
                onClick={() => onConfirm('single')}
                className="px-4 py-2 text-sm font-medium rounded-md shadow-sm"
                style={{
                  backgroundColor: 'var(--red-1)',
                  border: '1px solid var(--red-2)',
                  color: 'var(--red-2)'
                }}
              >
                {t('calendar:deleteThisOnly', 'Delete Only This Event')}
              </button>
              <button
                onClick={() => onConfirm('future')}
                className="px-4 py-2 text-sm font-medium rounded-md shadow-sm"
                style={{
                  backgroundColor: 'var(--red-1)',
                  border: '1px solid var(--red-2)',
                  color: 'var(--red-2)'
                }}
              >
                {t('calendar:deleteAllFuture', 'Delete This & Future Events')}
              </button>
              <button
                onClick={() => onConfirm('all')}
                className="px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm transition-all hover:shadow-md active:scale-95"
                style={{
                  backgroundColor: 'var(--red-2)',
                  border: '1px solid var(--red-2)'
                }}
              >
                {t('calendar:deleteAllOccurrences', 'Delete All Occurrences')}
              </button>
            </>
          ) : (
            <button
              onClick={() => onConfirm('single')}
              className="px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm transition-all hover:shadow-md active:scale-95"
              style={{
                backgroundColor: 'var(--red-2)',
                border: '1px solid var(--red-2)'
              }}
            >
              {t('calendar:deleteEvent', 'Delete Event')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationDialog;

