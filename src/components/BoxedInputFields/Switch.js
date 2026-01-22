import React from 'react';
import './styles/Switch.css';

const Switch = ({ 
  label, 
  checked = false, 
  onChange, 
  labelColor = '#333', 
  switchColor = '#4CAF50',
  marginTop = '0', 
  marginRight = '0', 
  marginBottom = '20px', 
  marginLeft = '0' 
}) => {
  const handleWrapperClick = (e) => {
    if (e.target.type !== 'checkbox' && onChange) {
      onChange(!checked);
    }
  };

  return (
    <div 
      className="switch-wrapper" 
      style={{ marginTop, marginRight, marginBottom, marginLeft }}
      onClick={handleWrapperClick}
    >
    <span className="switch-label" style={{ color: labelColor }}>{label}</span>
    <label className="switch">
      <input 
        type="checkbox" 
        checked={checked} 
        onChange={(e) => onChange(e.target.checked)} 
      />
      <span className="slider round" style={{ 
        backgroundColor: checked ? switchColor : '#ccc' 
      }}></span>
    </label>
    </div>
  );
};

export default Switch;
