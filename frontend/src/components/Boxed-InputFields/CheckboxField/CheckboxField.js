import React from 'react';
import Checkbox from '../../../Checkbox/Checkbox';
import './CheckboxField.css';

const CheckboxField = ({ 
  label, 
  checked, 
  onChange, 
  marginBottom = '20px'
}) => {
  return (
    <div className="checkbox-field-container" style={{ marginBottom }}>
      <Checkbox
        label={label}
        checked={checked}
        onChange={onChange}
      />
    </div>
  );
};

export default CheckboxField; 