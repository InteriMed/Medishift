import React, { useState, useRef, useEffect } from 'react';
import '../combined_css.css';

function DropdownDate({ 
  label,
  placeholder,
  value,
  onChange,
  marginBottom,
  marginLeft,
  marginRight,
  error,
  onErrorReset,
  required = false
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showError, setShowError] = useState(!!error);
  const dropdownRef = useRef(null);
  
  const handleFocus = () => {
    setIsFocused(true);
    setIsOpen(true);
    if (error && onErrorReset) {
      onErrorReset();
    }
  };
  
  const handleBlur = (e) => {
    if (e.relatedTarget?.classList.contains('boxed-inputfield-arrow')) {
      return;
    }
    
    setTimeout(() => {
      const activeElement = document.activeElement;
      const isArrow = activeElement?.classList.contains('boxed-inputfield-arrow');
      
      if (!dropdownRef.current?.contains(activeElement) && !isArrow) {
        setIsFocused(false);
        setIsOpen(false);
      }
    }, 200);
  };
  
  const handleDateChange = (e) => {
    const newValue = e.target.value;
    onChange?.(newValue);
    
    // Clear error when a value is selected and it's required
    if (required && error && onErrorReset) {
      onErrorReset();
    }
  };
  
  const handleArrowClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isOpen) {
      setIsOpen(false);
      setIsFocused(false);
      dropdownRef.current.querySelector('.boxed-inputfield-input').blur();
    } else {
      setIsOpen(true);
      setIsFocused(true);
      dropdownRef.current.querySelector('.boxed-inputfield-input').focus();
    }
    
    if (error && onErrorReset) {
      onErrorReset();
    }
  };
  
  const handleClearDate = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onChange?.('');
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setIsFocused(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Update error display
  useEffect(() => {
    setShowError(!!error);
  }, [error]);
  
  // Add this effect to handle autofill
  useEffect(() => {
    const input = dropdownRef.current?.querySelector('.boxed-inputfield-input');
    if (!input) return;

    const handleAnimationStart = (e) => {
      if (e.animationName.includes('webkit-autofill')) {
        setIsFocused(true);
      }
    };

    input.addEventListener('animationstart', handleAnimationStart);
    return () => input.removeEventListener('animationstart', handleAnimationStart);
  }, []);
  
  return (
    <div 
      className="boxed-inputfield-wrapper" 
      style={{ marginBottom, marginLeft, marginRight }}
      ref={dropdownRef}
    >
      <div 
        className={`boxed-inputfield-container ${error ? 'boxed-inputfield-error' : ''} ${isFocused ? 'focused' : ''} ${value ? 'has-value' : ''}`}
      >
        {label && (
          <label 
            className={`boxed-inputfield-label ${isFocused || value ? 'boxed-inputfield-label--focused' : ''}`}
          >
            {label}
            {required && <span className="required-asterisk">*</span>}
          </label>
        )}
        
        <input
          type="date"
          className="boxed-inputfield-input"
          value={value || ''}
          onChange={handleDateChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
        />
        
        <span 
          className={`boxed-inputfield-arrow ${isOpen ? 'boxed-inputfield-arrow--open' : ''}`}
          onClick={handleArrowClick}
        >
          ▼
        </span>
        
        {value && (
          <button 
            className="boxed-inputfield-clear" 
            onClick={handleClearDate}
            type="button"
          >
            ✕
          </button>
        )}
      </div>
      
      {error && <div className={`date-error-message ${showError ? 'show-error' : ''}`}>{error}</div>}
    </div>
  );
}

export default DropdownDate;
