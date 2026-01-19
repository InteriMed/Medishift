import React, { useState } from 'react';
import '../styles/boxedInputFields.css';
import './DateField.css';

const DateField = ({ 
  label, 
  value, 
  onChange, 
  marginBottom = '20px',
  marginLeft,
  marginRight,
  disabled = false,
  required = false,
  error = null,
  onErrorReset,
  min,
  max
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const formatDateForInput = (date) => {
    if (!date) return '';
    
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return '';
      
      return dateObj.toISOString().split('T')[0];
    } catch (e) {
      console.error("Error formatting date:", e);
      return '';
    }
  };

  const handleDateChange = (e) => {
    const dateValue = e.target.value;
    
    if (dateValue) {
      const dateObj = new Date(dateValue);
      onChange(dateObj);
    } else {
      onChange(null);
    }
    
    if (error && onErrorReset) {
      onErrorReset();
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (error && onErrorReset) {
      onErrorReset();
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const hasValue = value && !isNaN(new Date(value).getTime());

  return (
    <div 
      className={`boxed-inputfield-wrapper ${hasValue ? 'has-value' : ''}`} 
      style={{ marginBottom, marginLeft, marginRight }}
    >
      <div 
        className={`boxed-inputfield-container ${error ? 'boxed-inputfield-container--error' : ''} ${disabled ? 'boxed-inputfield-container--disabled' : ''} ${hasValue ? 'has-value' : ''}`}
      >
        {label && (
          <label 
            className={`boxed-inputfield-label ${(isFocused || hasValue) ? 'boxed-inputfield-label--focused' : ''} ${error ? 'boxed-inputfield-label--error' : ''}`}
          >
            {label}
            {required && <span className="boxed-inputfield-required">*</span>}
          </label>
        )}
        
        <input
          type="date"
          className={`boxed-inputfield-input 
            ${isFocused ? 'boxed-inputfield-input--focused' : ''} 
            ${hasValue ? 'boxed-inputfield-input--has-value' : ''} 
            ${error ? 'boxed-inputfield-input--error' : ''}`}
          value={formatDateForInput(value)}
          onChange={handleDateChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          min={min}
          max={max}
          required={required}
          style={{ outline: 'none' }}
        />
      </div>
      
      {error && (
        <div className="boxed-inputfield-error-message show-error">
          {error}
        </div>
      )}
    </div>
  );
};

export default DateField; 