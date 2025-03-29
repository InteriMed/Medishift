import React from 'react';
import './Checkbox.css';

const Checkbox = ({ label, checked = false, onChange, color }) => {
  return (
    <label className="checkbox-container">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
      />
      <span 
        className="checkmark" 
        style={{ 
          backgroundColor: checked ? color : '#fff', 
          borderColor: color,
          opacity: checked ? 1 : 0.5 
        }}
      ></span>
      <span 
        className="checkbox-label"
        style={{ opacity: checked ? 1 : 0.5 }}
      >
        {label}
      </span>
    </label>
  );
};

export default Checkbox;
