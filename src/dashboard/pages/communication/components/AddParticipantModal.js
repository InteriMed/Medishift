import React from 'react';

const AddParticipantModal = ({ isOpen, onClose, onAdd }) => {
  if (!isOpen) return null;

  return (
    <div>
      <h3>Add Participant</h3>
    </div>
  );
};

export default AddParticipantModal;

