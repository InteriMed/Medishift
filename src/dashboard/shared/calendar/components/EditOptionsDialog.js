import React, { useEffect, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiX, FiEdit } from 'react-icons/fi';
import WeekDaySelector from '../../../../components/colorPicker/weekDaySelector';
import '../../../../styles/variables.css';

const EditOptionsmodal = ({ event, onConfirm, onCancel }) => {
  const { t } = useTranslation();
  const [selectedDays, setSelectedDays] = useState([false, false, false, false, false, false, false]);
  const [showDaySelection, setShowDaySelection] = useState(false);

  const hasRecurrenceId = event.recurrenceId != null;
  const isRecurringEvent = hasRecurrenceId;
  const recurrenceMetadata = event.recurrenceMetadata || {};
  const isWeeklyRepeat = recurrenceMetadata.repeatValue === 'Every Week';
  const eventStart = new Date(event.start);
  const isPastEvent = eventStart < new Date();

  useEffect(() => {
    if (recurrenceMetadata.weeklyDays) {
      setSelectedDays(recurrenceMetadata.weeklyDays);
    }
  }, [recurrenceMetadata]);

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

  if (isPastEvent) {
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
            borderColor: 'var(--grey-2)',
            boxShadow: 'var(--box-shadow-md)'
          }}
        >
          <div
            className="flex items-center justify-between px-6 py-5 border-b"
            style={{
              borderBottomColor: 'var(--grey-2)',
              backgroundColor: 'var(--grey-1-light)'
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="p-2 rounded-full"
                style={{
                  backgroundColor: 'var(--grey-2)',
                  color: 'var(--text-color)'
                }}
              >
                <FiEdit size={24} />
              </div>
              <h3
                className="text-xl font-semibold tracking-tight"
                style={{
                  color: 'var(--text-color)',
                  fontFamily: 'var(--font-family-headings)',
                  fontSize: 'var(--font-size-large)'
                }}
              >
                {t('calendar:editEvent', 'Edit Event')}
              </h3>
            </div>
            <button
              onClick={onCancel}
              className="p-2 rounded-full transition-colors hover:bg-black/5"
              style={{
                color: 'var(--text-color)'
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
            <div
              className="p-4 rounded-lg"
              style={{
                backgroundColor: 'var(--grey-1-light)',
                border: '1px solid var(--grey-2)',
                color: 'var(--text-color)',
                fontSize: 'var(--font-size-small)'
              }}
            >
              <strong>{t('calendar:pastEventCannotEdit', 'This is a past event. Past events cannot be edited.')}</strong>
            </div>
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
              {t('common:close', 'Close')}
            </button>
          </div>
        </div>
      </div>
    );
  }

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
          borderColor: 'var(--grey-2)',
          boxShadow: 'var(--box-shadow-md)'
        }}
      >
        <div
          className="flex items-center justify-between px-6 py-5 border-b"
          style={{
            borderBottomColor: 'var(--primary-color)',
            backgroundColor: 'var(--primary-light)'
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-full"
              style={{
                backgroundColor: 'var(--primary-color)',
                color: 'var(--white)'
              }}
            >
              <FiEdit size={24} />
            </div>
            <h3
              className="text-xl font-semibold tracking-tight"
              style={{
                color: 'var(--primary-color)',
                fontFamily: 'var(--font-family-headings)',
                fontSize: 'var(--font-size-large)'
              }}
            >
              {isRecurringEvent
                ? t('calendar:editRecurringEvent', 'Edit Recurring Event')
                : t('calendar:editEvent', 'Edit Event')}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="p-2 rounded-full transition-colors hover:bg-black/5"
            style={{
              color: 'var(--primary-color)'
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
              ? t('calendar:editMessage', 'This is a recurring event. Which occurrences would you like to edit?')
              : t('calendar:editSingleMessage', 'Edit this event?')}
          </p>
          {showDaySelection && isWeeklyRepeat && (
            <div className="mt-4 space-y-2">
              <label className="text-sm font-medium">
                {t('calendar:selectDaysToEdit', 'Select days of the week to edit (future events only):')}
              </label>
              <WeekDaySelector
                selectedDays={selectedDays}
                onChange={setSelectedDays}
              />
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
                className="px-4 py-2 text-sm font-medium rounded-md shadow-sm btn-yellow"
              >
                {t('calendar:editThisOnly', 'Edit Only This Event')}
              </button>
              {isWeeklyRepeat && (
                <button
                  onClick={() => setShowDaySelection(!showDaySelection)}
                  className="px-4 py-2 text-sm font-medium rounded-md shadow-sm btn-yellow"
                >
                  {showDaySelection 
                    ? t('calendar:hideDaySelection', 'Hide Day Selection')
                    : t('calendar:selectDays', 'Select Days of Week')}
                </button>
              )}
              <button
                onClick={() => {
                  if (isWeeklyRepeat && showDaySelection && selectedDays.some(d => d)) {
                    onConfirm('days', selectedDays);
                  } else {
                    onConfirm('future');
                  }
                }}
                className="px-4 py-2 text-sm font-medium rounded-md shadow-sm btn-yellow"
              >
                {isWeeklyRepeat && showDaySelection
                  ? t('calendar:editSelectedDays', 'Edit Selected Days')
                  : t('calendar:editAllFuture', 'Edit This & Future Events')}
              </button>
              <button
                onClick={() => onConfirm('all')}
                className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md shadow-sm transition-all hover:shadow-md active:scale-95"
              >
                {t('calendar:editAllOccurrences', 'Edit All Occurrences')}
              </button>
            </>
          ) : (
            <button
              onClick={() => onConfirm('single')}
              className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md shadow-sm transition-all hover:shadow-md active:scale-95"
            >
              {t('calendar:editEvent', 'Edit Event')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditOptionsmodal;









