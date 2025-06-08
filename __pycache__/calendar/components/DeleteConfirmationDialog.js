import React from 'react';
import { useTranslation } from 'react-i18next';
import Dialog from '../../../../components/Dialog/Dialog';
import Button from '../../../../components/BoxedInputFields/Button';

const DeleteConfirmationDialog = ({ event, currentDate, onConfirm, onCancel, isRecurring }) => {
  const { t } = useTranslation();

  // Check if event has recurrenceId or is recurring
  const hasRecurrenceId = event.recurrenceId != null;
  const isRecurringEvent = isRecurring || hasRecurrenceId;

  const actions = (
    <>
      <Button
        variant="secondary"
        onClick={onCancel}
      >
        Cancel
      </Button>
      
      {isRecurringEvent ? (
        <>
          <Button
            variant="warning"
            onClick={() => onConfirm('single')}
          >
            Delete Only This Event
          </Button>
          <Button
            variant="warning"
            onClick={() => onConfirm('future')}
          >
            Delete This & Future Events
          </Button>
        </>
      ) : (
        <Button
          variant="warning"
          onClick={() => onConfirm('single')}
        >
          Delete Event
        </Button>
      )}
    </>
  );

  return (
    <Dialog
      isOpen={true}
      onClose={onCancel}
      title="Delete Event"
      size="small"
      messageType="warning"
      actions={actions}
    >
      <p>Are you sure you want to delete this event?</p>
    </Dialog>
  );
};

export default DeleteConfirmationDialog; 