import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './Datetime_Dropdown.css';

export const generateYears = () => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 10 }, (_, i) => currentYear - 2 + i);
};

export const generateMonths = () => {
  return Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: new Date(2000, i, 1).toLocaleString('default', { month: 'short' })
  }));
};

export const generateDays = (year, month) => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => i + 1);
};

export const generateHours = () => {
  return Array.from({ length: 24 }, (_, i) => ({
    value: i,
    label: i.toString().padStart(2, '0')
  }));
};

export const generateMinutes = () => {
  return Array.from({ length: 60 }, (_, i) => ({
    value: i,
    label: i.toString().padStart(2, '0')
  }));
};

export const formatDateTimePart = (date, part) => {
  switch (part) {
    case 'month':
      return date.toLocaleString('default', { month: 'short' });
    case 'day':
      return date.getDate();
    case 'year':
      return date.getFullYear();
    case 'hour':
      return date.getHours().toString().padStart(2, '0');
    case 'minute':
      return date.getMinutes().toString().padStart(2, '0');
    default:
      return '';
  }
};

const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const ChevronIcon = () => (
  <svg viewBox="0 0 10 6" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
  </svg>
);

const DateTimeValue = ({ date, type, part, onDateTimeChange, inputDisabled }) => {
  const { t, i18n } = useTranslation();
  const [showDropdown, setShowDropdown] = useState(false);
  const [isClosingDropdown, setIsClosingDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const containerRef = useRef(null);
  const searchTimeout = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!showDropdown) return;
      
      if (e.key === 'Escape') {
        handleDropdownClose();
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const options = getOptions();
        const direction = e.key === 'ArrowDown' ? 1 : -1;
        setSelectedIndex(prev => {
          const newIndex = prev + direction;
          if (newIndex >= options.length) return 0;
          if (newIndex < 0) return options.length - 1;
          return newIndex;
        });
        return;
      }

      if (e.key === 'Enter' && selectedIndex !== -1) {
        const options = getOptions();
        handleOptionSelect(options[selectedIndex].value);
        return;
      }

      // Handle alphanumeric input
      if (e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
        const newSearchTerm = searchTerm + e.key.toLowerCase();
        setSearchTerm(newSearchTerm);

        // Find matching option
        const options = getOptions();
        const matchingIndex = options.findIndex(option => 
          option.label.toString().toLowerCase().startsWith(newSearchTerm)
        );

        if (matchingIndex !== -1) {
          setSelectedIndex(matchingIndex);
          // Ensure the matched item is visible in the dropdown
          const element = dropdownRef.current?.children[matchingIndex];
          element?.scrollIntoView({ block: 'nearest' });
        }

        // Reset search term after a delay
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => {
          setSearchTerm('');
        }, 1000);
      }
    };

    if (showDropdown) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [showDropdown, selectedIndex, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        handleDropdownClose();
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleDropdownClose = () => {
    setIsClosingDropdown(true);
    setSelectedIndex(-1);
    setSearchTerm('');
    setTimeout(() => {
      setShowDropdown(false);
      setIsClosingDropdown(false);
    }, 150);
  };

  const handleOptionSelect = (value) => {
    onDateTimeChange(type, part, value);
    handleDropdownClose();
  };

  const handleClick = (e) => {
    e.stopPropagation();
    if (showDropdown) {
      handleDropdownClose();
    } else {
      setShowDropdown(true);
      // Set initial selected index based on current value
      const options = getOptions();
      const currentValue = part === 'month' ? date.getMonth() :
        part === 'day' ? date.getDate() :
        part === 'year' ? date.getFullYear() :
        part === 'hour' ? date.getHours() :
        date.getMinutes();
      const index = options.findIndex(opt => opt.value === currentValue);
      setSelectedIndex(index);
    }
  };

  const getFormattedValue = () => {
    switch (part) {
      case 'month':
        return date.toLocaleString(i18n.language, { month: 'short' });
      case 'day':
        return date.getDate();
      case 'year':
        return date.getFullYear();
      case 'hour':
        return date.getHours().toString().padStart(2, '0');
      case 'minute':
        return date.getMinutes().toString().padStart(2, '0');
      default:
        return '';
    }
  };

  const getLabel = () => {
    return t(`dashboard.calendar.datetime.${part}`);
  };

  const getOptions = () => {
    switch (part) {
      case 'month':
        return generateMonths();
      case 'day':
        return generateDays(date.getFullYear(), date.getMonth()).map(day => ({
          value: day,
          label: day.toString()
        }));
      case 'year':
        return generateYears().map(year => ({
          value: year,
          label: year.toString()
        }));
      case 'hour':
        return generateHours();
      case 'minute':
        return generateMinutes();
      default:
        return [];
    }
  };

  return (
    <div ref={containerRef} className="datetime-part" data-part={part} onClick={handleClick}>
      <div className="datetime-value-display">
        {getFormattedValue()}
      </div>
      <div className="datetime-arrow">
        <i className="fas fa-chevron-down"></i>
      </div>
      {showDropdown && (
        <div 
          ref={dropdownRef}
          className="datetime-options-dropdown"
        >
          {getOptions().map((option, index) => (
            <div
              key={option.value}
              className={`datetime-option ${
                option.value === (part === 'month' ? date.getMonth() :
                  part === 'day' ? date.getDate() :
                  part === 'year' ? date.getFullYear() :
                  part === 'hour' ? date.getHours() :
                  date.getMinutes()) ? 'selected' : ''
              } ${index === selectedIndex ? 'highlighted' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                handleOptionSelect(option.value);
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DateTimeValue;
