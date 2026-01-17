import React, { useState, useEffect } from 'react';
import './styles/boxedInputFields.css';
import dropdownTranslations from '../../locales/en/dropdowns.json';

const DropdownDate = ({ 
  label, 
  value, 
  onChange, 
  error, 
  onErrorReset,
  required = false,
  minYear = 1900,
  maxYear = new Date().getFullYear(),
  disabled = false
}) => {
  // Parse the date value if it exists
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  
  // Initialize the date components when the value changes
  useEffect(() => {
    if (value) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          setDay(date.getDate().toString());
          setMonth((date.getMonth() + 1).toString());
          setYear(date.getFullYear().toString());
        }
      } catch (e) {
        console.error("Error parsing date:", e);
      }
    }
  }, [value]);
  
  // Generate options for day, month, and year
  const days = Array.from({ length: 31 }, (_, i) => ({
    value: (i + 1).toString(),
    label: (i + 1).toString().padStart(2, '0')
  }));
  
  const months = Object.entries(dropdownTranslations.months || {}).map(([key, value]) => ({
    value: key,
    label: value
  }));
  
  const years = Array.from(
    { length: maxYear - minYear + 1 },
    (_, i) => ({
      value: (maxYear - i).toString(),
      label: (maxYear - i).toString()
    })
  );
  
  const handleDayChange = (e) => {
    const newDay = e.target.value;
    setDay(newDay);
    updateDate(newDay, month, year);
    
    // Reset error on interaction
    if (error && onErrorReset) {
      onErrorReset();
    }
  };
  
  const handleMonthChange = (e) => {
    const newMonth = e.target.value;
    setMonth(newMonth);
    updateDate(day, newMonth, year);
    
    // Reset error on interaction
    if (error && onErrorReset) {
      onErrorReset();
    }
  };
  
  const handleYearChange = (e) => {
    const newYear = e.target.value;
    setYear(newYear);
    updateDate(day, month, newYear);
    
    // Reset error on interaction
    if (error && onErrorReset) {
      onErrorReset();
    }
  };
  
  const updateDate = (d, m, y) => {
    if (d && m && y) {
      // Create a date object and pass it to the onChange handler
      try {
        const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        if (!isNaN(date.getTime())) {
          onChange(date); // Pass the Date object directly
        } else {
          onChange(null); // Handle invalid date
        }
      } catch (err) {
        console.error('Error creating date:', err);
        onChange(null);
      }
    } else {
      // If any part is missing, pass null
      onChange(null);
    }
  };
  
  // Extract plain string content if label is a React element
  let labelContent = label;
  
  // Check if the label is a React element containing nested text
  // This prevents double asterisks by using only the text content
  if (React.isValidElement(label) && label.props && label.props.children) {
    const children = label.props.children;
    if (Array.isArray(children)) {
      // Only use the first child (the text content) and ignore the asterisk span
      labelContent = children[0];
    } else {
      labelContent = children;
    }
  }
  
  return (
    <div className="boxed-date-wrapper">
      {label && (
        <label className={`boxed-date-label ${error ? 'boxed-date-label--error' : ''}`}>
          {labelContent}
          {required && <span className="boxed-inputfield-required">*</span>}
        </label>
      )}
      
      <div className={`boxed-date-selects ${error ? 'boxed-date-selects--error' : ''}`}>
        <select
          className={`boxed-date-select ${error ? 'boxed-date-select--error' : ''}`}
          value={day}
          onChange={handleDayChange}
          disabled={disabled}
          aria-label="Day"
        >
          <option value="" className={required ? 'required' : ''}>Day</option>
          {days.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        
        <select
          className={`boxed-date-select ${error ? 'boxed-date-select--error' : ''}`}
          value={month}
          onChange={handleMonthChange}
          disabled={disabled}
          aria-label="Month"
        >
          <option value="" className={required ? 'required' : ''}>Month</option>
          {months.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        
        <select
          className={`boxed-date-select ${error ? 'boxed-date-select--error' : ''}`}
          value={year}
          onChange={handleYearChange}
          disabled={disabled}
          aria-label="Year"
        >
          <option value="" className={required ? 'required' : ''}>Year</option>
          {years.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      
      {error && <div className="boxed-inputfield-error-message show-error">{error}</div>}
    </div>
  );
};

export default DropdownDate;
