import React from 'react';
import DropdownDate from '../Dropdown-Date/Dropdown-Date';
import './DateField.css';

const DateField = ({ 
  label, 
  value, 
  onChange, 
  marginBottom = '20px', 
  disabled = false,
  required = false
}) => {
  return (
    <div className="date-field-container" style={{ marginBottom }}>
      <DropdownDate
        label={label}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
      />
    </div>
  );
};

export default DateField; 