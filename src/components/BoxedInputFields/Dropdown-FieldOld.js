import React, { useState, useRef, useEffect } from 'react';
import './styles/boxedInputFields.css';

const DropdownField = ({
  label,
  options = [],
  value,
  onChange,
  placeholder = 'Select...',
  required = false,
  error = null,
  onErrorReset,
  disabled = false,
  icon = null,
  marginBottom,
  marginTop,
  marginLeft,
  marginRight
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  // Find the selected option label
  const selectedOption = value ? options.find(option => {
    if (option.value === value) return true;
    if (String(option.value) === String(value)) return true;
    return false;
  }) : null;
  
  const displayValue = selectedOption ? selectedOption.label : placeholder;

  // Filter options based on the search term
  const filteredOptions = options.filter(option => {
    const optionLabel = option.label || '';
    return optionLabel.toLowerCase().includes((searchTerm || '').toLowerCase());
  });

  // Handle clicks outside the dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle selecting an option
  const handleSelectOption = (option) => {
    onChange(option);
    setIsOpen(false);
    setSearchTerm('');
    
    if (error && onErrorReset) {
      onErrorReset();
    }
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
    
    if (error && onErrorReset) {
      onErrorReset();
    }
  };

  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      
      if (error && onErrorReset) {
        onErrorReset();
      }
    }
  };

  return (
    <div 
      className="boxed-inputfield-wrapper"
      style={{ marginBottom, marginTop, marginLeft, marginRight }}
      ref={dropdownRef}
    >
      {label && (
        <label className={`boxed-date-label ${error ? 'boxed-date-label--error' : ''}`}>
          {label}
          {required && <span className="boxed-inputfield-required">*</span>}
        </label>
      )}

      <div 
        className={`boxed-dropdown-container ${error ? 'boxed-dropdown-container--error' : ''} ${isOpen ? 'boxed-dropdown-container--focused' : ''} ${disabled ? 'boxed-dropdown-container--disabled' : ''}`}
      >
        {icon && <span className="boxed-dropdown-icon">{icon}</span>}
        
        {isOpen ? (
          <input
            type="text"
            className="boxed-dropdown-search"
            value={searchTerm}
            onChange={handleInputChange}
            placeholder="Type to search..."
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        ) : (
          <div className={`boxed-dropdown-selected ${!selectedOption && error ? 'boxed-dropdown-selected--error' : ''}`} onClick={toggleDropdown}>
            {displayValue}
          </div>
        )}
        
        <div className="boxed-dropdown-arrow" onClick={toggleDropdown}>
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        
        {isOpen && (
          <div className="boxed-dropdown-options">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => (
                <div 
                  key={option.value} 
                  className={`boxed-dropdown-option ${selectedOption && (option.value === selectedOption.value) ? 'boxed-dropdown-option--selected' : ''}`}
                  onClick={() => handleSelectOption(option)}
                >
                  {option.label}
                </div>
              ))
            ) : (
              <div className="boxed-dropdown-no-options">
                No options available
              </div>
            )}
          </div>
        )}
      </div>
      
      {error && <div className="boxed-inputfield-error-message">{error}</div>}
    </div>
  );
};

export default DropdownField;
