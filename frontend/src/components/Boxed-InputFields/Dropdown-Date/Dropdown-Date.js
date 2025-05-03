import React, { useState, useRef, useEffect } from 'react';
import '../combined_css.css';
import { BiNoEntry } from 'react-icons/bi';

function DropdownDate({ 
  label,
  placeholder,
  value,
  onChange,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  error,
  onErrorReset,
  required = false,
  clearDateFilter,
  showClearButton = true,
  showErrors = false
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  const handleFocus = () => {
    setIsFocused(true);
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
  
  const handleContainerClick = (e) => {
    // Don't trigger if clicking on the input element or clear button
    if (e.target.classList.contains('boxed-inputfield-input') || 
        e.target.classList.contains('boxed-inputfield-clear')) {
      return;
    }
    
    setIsOpen(true);
    setIsFocused(true);
    
    if (error && onErrorReset) {
      onErrorReset();
    }
  };

  const handleArrowClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(true);
    setIsFocused(true);
  };
  
  const handleClearDate = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (clearDateFilter) {
      clearDateFilter();
    } else {
      onChange?.('');
    }
    setIsFocused(false);
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
  
  // Variable determines if error message should be displayed based on props
  const shouldShowErrorMessage = error && showErrors;
  
  return (
    <div 
      className="boxed-inputfield-wrapper" 
      style={{ marginBottom, marginLeft, marginRight, marginTop }}
      ref={dropdownRef}
    >
      <div 
        className={`boxed-inputfield-container ${error && showErrors ? 'boxed-inputfield-container--error' : ''} ${isFocused ? 'focused' : ''} ${value ? 'has-value' : ''}`}
        onClick={handleContainerClick}
        style={{ cursor: 'pointer' }}
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
          style={{ cursor: 'text' }}
        />
        
        {value && showClearButton && (
          <button 
            className="boxed-inputfield-clear" 
            onClick={handleClearDate}
            type="button"
            aria-label="Clear date"
            style={{
              right: '40px',
            }}
          >
            x
          </button>
        )}
      </div>
      
      {shouldShowErrorMessage && <div className={`boxed-inputfield-error-message ${shouldShowErrorMessage ? 'boxed-inputfield-error-message--visible' : ''}`}>{error}</div>}
    </div>
  );
}

export default DropdownDate;
