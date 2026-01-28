import React from 'react';

const StartNewCommunicationModal = ({ isOpen, onClose, onCreate }) => {
  if (!isOpen) return null;

  return (
    <div>
      <h3>Start New Communication</h3>
    </div>
  );
};

export default StartNewCommunicationModal;

