import React, { useState } from 'react';
import './styles/boxedInputFields.css';

const hasRequiredIndicator = (label) => {
    if (!label) return false;
    if (typeof label === 'string') {
        return label.includes('*');
    }
    if (React.isValidElement(label)) {
        const checkElement = (element) => {
            if (!element) return false;
            if (typeof element === 'string') {
                return element.includes('*');
            }
            if (React.isValidElement(element)) {
                const props = element.props || {};
                const className = props.className || '';
                if (className.includes('boxed-inputfield-required') ||
                    className.includes('mandatoryMark') ||
                    className.includes('date-field-required') ||
                    className.includes('required')) {
                    return true;
                }
                const children = props.children;
                if (children) {
                    if (Array.isArray(children)) {
                        return children.some(child => checkElement(child));
                    }
                    return checkElement(children);
                }
            }
            return false;
        };
        return checkElement(label);
    }
    return false;
};

const DateField = ({ 
  label, 
  value, 
  onChange, 
  marginBottom = '20px',
  marginLeft,
  marginRight,
  disabled = false,
  readOnly = false,
  required = false,
  error = null,
  onErrorReset,
  clearFilter,
  showClearButton = true,
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

  const handleClear = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(null);
    setIsFocused(false);
    if (clearFilter) {
      clearFilter();
    }
  };

  const hasValue = value && !isNaN(new Date(value).getTime());

  return (
    <div 
      className="boxed-inputfield-wrapper"
      style={{ marginBottom: marginBottom || 0, marginLeft, marginRight }}
    >
      <div 
        className={`boxed-inputfield-container ${error ? 'boxed-inputfield-container--error' : ''} ${hasValue ? 'has-value' : ''} ${disabled || readOnly ? 'boxed-inputfield-container--disabled' : ''}`}
      >
        {label && (
          <label 
            className={`boxed-inputfield-label ${(isFocused || hasValue) ? 'boxed-inputfield-label--focused' : ''} ${error ? 'boxed-inputfield-label--error' : ''}`}
          >
            {label}
            {required && !hasRequiredIndicator(label) && <span className="boxed-inputfield-required">*</span>}
          </label>
        )}
        
        <input
          type="date"
          className={`boxed-inputfield-input 
            ${isFocused ? 'boxed-inputfield-input--focused' : ''} 
            ${hasValue ? 'boxed-inputfield-input--has-value' : ''} 
            ${error ? 'boxed-inputfield-input--error' : ''}
            ${disabled || readOnly ? 'boxed-inputfield-input--disabled' : ''}`}
          value={formatDateForInput(value)}
          onChange={handleDateChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          readOnly={readOnly}
          min={min}
          max={max}
          required={required}
          style={{ outline: 'none' }}
        />

        {hasValue && showClearButton && !disabled && !readOnly && (
          <button
            className="boxed-inputfield-clear"
            onClick={handleClear}
            type="button"
            aria-label="Clear input"
            tabIndex={-1}
          >
            x
          </button>
        )}
      </div>
    </div>
  );
};

export default DateField; 