import React, { useState, useRef, useEffect } from 'react';
import { FiCalendar } from 'react-icons/fi';
import DropdownDate from './Dropdown-Date';
import './styles/boxedInputFields.css';

const DateField = ({ 
  label, 
  value, 
  onChange, 
  marginBottom = '20px', 
  disabled = false,
  required = false,
  error = null,
  onErrorReset
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  
  // Format date for display
  const formatDate = (date) => {
    if (!date) return '';
    
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return '';
      
      return dateObj.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      console.error("Error formatting date:", e);
      return '';
    }
  };
  
  // Toggle dropdown visibility
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };
  
  // Handle clicks outside of the component to close the dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Handle date change
  const handleDateChange = (newDate) => {
    onChange(newDate);
    setIsOpen(false);
  };
  
  return (
    <div className="date-field-container" style={{ marginBottom }} ref={containerRef}>
      <div 
        className="date-field-display" 
        onClick={toggleDropdown}
        style={{ 
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px',
          cursor: 'pointer',
          border: '1px solid var(--grey-1, #e0e0e0)',
          borderRadius: '8px',
          justifyContent: 'space-between',
          backgroundColor: 'var(--background-div-color, #ffffff)',
          fontSize: 'var(--font-size-small)',
          maxWidth: '150px'
        }}
      >
        <div 
          className="date-field-value"
          style={{
            fontWeight: '500',
            color: 'var(--text-color, #333)'
          }}
        >
          {formatDate(value) || 'Select a date'}
        </div>
        <FiCalendar 
          style={{ 
            marginLeft: '8px',
            color: 'var(--grey-2, #666)'
          }} 
        />
      </div>
      
      {isOpen && (
        <div 
          className="date-field-dropdown"
          style={{ 
            position: 'absolute',
            zIndex: 99999,
            marginTop: '4px',
            backgroundColor: 'var(--background-div-color, #ffffff)',
            boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
            borderRadius: '8px',
            padding: '12px',
            border: '1px solid var(--grey-1, #e0e0e0)'
          }}
        >
          <DropdownDate
            value={value}
            onChange={handleDateChange}
            disabled={disabled}
            required={required}
            error={error}
            onErrorReset={onErrorReset}
            minYear={2000}
            maxYear={new Date().getFullYear() + 10}
          />
        </div>
      )}
      
      {label && (
        <label 
          style={{ 
            display: 'block', 
            marginBottom: '6px',
            fontSize: '14px',
            color: error ? 'var(--color-danger, #e53935)' : 'var(--text-color, #333)'
          }}
        >
          {label} {required && <span style={{ color: 'var(--color-danger, #e53935)' }}>*</span>}
        </label>
      )}
      
      {error && (
        <div 
          style={{ 
            color: 'var(--color-danger, #e53935)', 
            fontSize: '12px', 
            marginTop: '4px' 
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
};

export default DateField; 