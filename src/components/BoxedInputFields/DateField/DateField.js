import React from 'react';
import '../styles/boxedInputFields.css';
import './DateField.css';

const DateField = ({ 
  label, 
  value, 
  onChange, 
  marginBottom = '20px', 
  disabled = false,
  required = false,
  error = null,
  onErrorReset,
  min,
  max
}) => {
  // Format date for input[type="date"] which expects YYYY-MM-DD format
  const formatDateForInput = (date) => {
    if (!date) return '';
    
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return '';
      
      // Return in YYYY-MM-DD format
      return dateObj.toISOString().split('T')[0];
    } catch (e) {
      console.error("Error formatting date:", e);
      return '';
    }
  };

  // Handle date change from input
  const handleDateChange = (e) => {
    const dateValue = e.target.value;
    
    if (dateValue) {
      // Convert string date to Date object
      const dateObj = new Date(dateValue);
      onChange(dateObj);
    } else {
      onChange(null);
    }
    
    // Reset error on interaction
    if (error && onErrorReset) {
      onErrorReset();
    }
  };

  const hasValue = value && !isNaN(new Date(value).getTime());

  return (
    <div 
      className={`boxed-inputfield-wrapper ${hasValue ? 'has-value' : ''}`} 
      style={{ marginBottom }}
    >
      <div className={`boxed-inputfield-container ${error ? 'boxed-inputfield-container--error' : ''} ${disabled ? 'boxed-inputfield-container--disabled' : ''}`}>
        <input
          type="date"
          className={`boxed-inputfield-input ${error ? 'boxed-inputfield-input--error' : ''}`}
          value={formatDateForInput(value)}
          onChange={handleDateChange}
          disabled={disabled}
          min={min}
          max={max}
          required={required}
        />
        
        {label && (
          <label className={`boxed-inputfield-label ${hasValue ? 'boxed-inputfield-label--focused' : ''} ${error ? 'boxed-inputfield-label--error' : ''}`}>
            {label}
            {required && <span className="boxed-inputfield-required">*</span>}
          </label>
        )}
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