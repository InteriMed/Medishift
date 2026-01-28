import React from 'react';

const EmployeePopup = ({ isOpen, onClose, employee }) => {
  if (!isOpen) return null;

  return (
    <div>
      <h3>Employee Details</h3>
    </div>
  );
};

export default EmployeePopup;

