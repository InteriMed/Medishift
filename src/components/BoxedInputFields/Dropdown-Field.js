import React, { useState, useEffect, useRef } from 'react';
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

const SimpleDropdown = ({
  label,
  options = [],
  value,
  onChange,
  placeholder = 'Select...',
  required = false,
  error = null,
  marginBottom,
  marginTop,
  marginLeft,
  marginRight,
  searchable = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  // Get the display value
  const selectedOption = options.find(opt => String(opt.value) === String(value));
  const displayText = selectedOption ? selectedOption.label : placeholder;

  // Filter options based on search query
  const filteredOptions = searchable
    ? options.filter(opt =>
      opt.label.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : options;

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    // Add event listener when dropdown is open
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // Clean up event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Reset search query when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Debug options loading in development
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && options.length === 0) {
      console.warn(`SimpleDropdown: No options available for dropdown with label: ${typeof label === 'string' ? label : 'unknown'}`);
    }
  }, [options, label]);

  // Simple handler for selection
  const handleSelect = (option) => {
    // Call the onChange handler with just the value
    onChange(option.value);
    setIsOpen(false);
  };

  // Extract plain label text when a React element is provided to avoid duplicate asterisks
  let labelContent = label;
  if (React.isValidElement(label) && label.props && label.props.children) {
    const children = label.props.children;
    labelContent = Array.isArray(children) ? children[0] : children;
  }

  return (
    <div
      className="boxed-inputfield-wrapper"
      style={{ marginBottom, marginTop, marginLeft, marginRight }}
      ref={dropdownRef}
    >
      {label && (
        <label className={`boxed-date-label ${error ? 'boxed-date-label--error' : ''}`}>
          {labelContent}
          {required && !hasRequiredIndicator(labelContent) && <span className="boxed-inputfield-required">*</span>}
        </label>
      )}

      <div className={`boxed-dropdown-container ${error ? 'boxed-dropdown-container--error' : ''} ${isOpen ? 'boxed-dropdown-container--focused' : ''}`}>
        <div
          className={`boxed-dropdown-selected ${error ? 'boxed-dropdown-selected--error' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          {displayText}
        </div>

        <div
          className={`boxed-dropdown-arrow ${error ? 'boxed-dropdown-arrow--error' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {isOpen && (
          <div className="boxed-dropdown-options">
            {searchable && (
              <div className="boxed-dropdown-search-container">
                <input
                  type="text"
                  className="boxed-dropdown-search-input"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()} // Prevent closing dropdown when clicking input
                  autoFocus
                />
              </div>
            )}
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => (
                <div
                  key={option.value}
                  className={`boxed-dropdown-option ${String(option.value) === String(value) ? 'boxed-dropdown-option--selected' : ''}`}
                  onClick={() => handleSelect(option)}
                >
                  {option.label}
                </div>
              ))
            ) : (
              <div className="boxed-dropdown-no-options">
                No options found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleDropdown; 