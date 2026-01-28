import React from 'react';
import { useTranslation } from 'react-i18next';
import { FiTrash2, FiAlertTriangle } from 'react-icons/fi';
import modal from '../../../../components/basemodal/modal';

const DeleteConfirmationmodal = ({ event, currentDate, onConfirm, onCancel }) => {
  const { t } = useTranslation(['calendar', 'common']);

  const hasRecurrenceId = event.recurrenceId != null;
  const isRecurringEvent = hasRecurrenceId;
  const eventStart = new Date(event.start);
  const isPastEvent = eventStart < new Date();

  return (
    <modal
      isOpen={true}
      onClose={onCancel}
      title={isRecurringEvent ? t('calendar:deleteRecurringEvent', 'Delete Recurring Event') : t('calendar:deleteEvent', 'Delete Event')}
      size="small"
      actions={
        <div className="flex items-center justify-end w-full gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
          >
            {t('common:deleteConfirmation.cancel', 'Cancel')}
          </button>
          {isRecurringEvent ? (
            <div className="flex gap-2">
              <button
                onClick={() => onConfirm('single')}
                className="px-4 py-2 text-sm font-medium text-destructive border border-destructive/20 hover:bg-destructive/10 rounded-lg transition-colors"
              >
                {t('calendar:deleteThisOnly', 'This Only')}
              </button>
              <button
                onClick={() => onConfirm('future')}
                className="px-4 py-2 text-sm font-medium text-destructive border border-destructive/20 hover:bg-destructive/10 rounded-lg transition-colors"
              >
                {t('calendar:deleteAllFuture', 'Future')}
              </button>
              <button
                onClick={() => onConfirm('all')}
                className="px-4 py-2 text-sm font-medium text-primary-foreground bg-destructive hover:bg-destructive/90 rounded-lg shadow-sm transition-all"
              >
                {t('calendar:deleteAllOccurrences', 'All')}
              </button>
            </div>
          ) : (
            <button
              onClick={() => onConfirm('single')}
              className="px-6 py-2 text-sm font-medium text-primary-foreground bg-destructive hover:bg-destructive/90 rounded-lg shadow-sm transition-all hover:shadow-md active:scale-95 flex items-center gap-2"
            >
              <FiTrash2 className="w-4 h-4" />
              {t('calendar:deleteEvent', 'Delete Event')}
            </button>
          )}
        </div>
      }
    >
      <div className="p-4 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4 ring-8 ring-destructive/5">
          <FiAlertTriangle className="w-8 h-8 text-destructive" />
        </div>

        <h4 className="text-lg font-bold text-foreground mb-2">
          {t('calendar:confirmDeleteTitle', 'Are you sure?')}
        </h4>

        <p className="text-sm text-muted-foreground mb-4 max-w-[280px]">
          {isRecurringEvent
            ? t('calendar:deleteMessage', 'This is a recurring event. Which occurrences would you like to delete?')
            : t('calendar:deleteSingleMessage', 'Are you sure you want to delete this event? This action cannot be undone.')}
        </p>

        {isPastEvent && (
          <div className="w-full p-3 rounded-lg bg-orange-50 border border-orange-100 flex items-center gap-2 text-orange-800 text-xs font-medium">
            <FiAlertTriangle className="w-4 h-4 shrink-0" />
            {t('calendar:pastEventDeleteNote', 'Note: This is a past event.')}
          </div>
        )}
      </div>
    </modal>
  );
};

export default DeleteConfirmationmodal;

