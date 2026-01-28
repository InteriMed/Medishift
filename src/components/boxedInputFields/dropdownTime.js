import React, { useState, useEffect } from 'react';
import DropdownField from './dropdownField';
import './styles/boxedInputFields.css';

const DropdownTime = ({
  label,
  value,
  onChange,
  required = false,
  error = null,
  onErrorReset,
  disabled = false,
  minuteStep = 15,
  is24Hour = false,
  marginBottom,
  marginTop,
  marginLeft,
  marginRight
}) => {
  // Parse initial time value if provided (format: "HH:MM" or "HH:MM AM/PM")
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('');
  const [period, setPeriod] = useState(is24Hour ? null : 'AM');

  // Generate options for hours, minutes, and period
  const hourOptions = [];
  const minuteOptions = [];
  const periodOptions = [
    { value: 'AM', label: 'AM' },
    { value: 'PM', label: 'PM' }
  ];

  // Generate hour options (1-12 for 12-hour format, 0-23 for 24-hour format)
  if (is24Hour) {
    for (let i = 0; i < 24; i++) {
      const value = i.toString().padStart(2, '0');
      hourOptions.push({ value, label: value });
    }
  } else {
    for (let i = 1; i <= 12; i++) {
      const value = i.toString();
      hourOptions.push({ value, label: value });
    }
  }

  // Generate minute options based on step
  for (let i = 0; i < 60; i += minuteStep) {
    const value = i.toString().padStart(2, '0');
    minuteOptions.push({ value, label: value });
  }

  // Parse initial value
  useEffect(() => {
    if (value) {
      try {
        // Handle different time formats
        let timeComponents;
        if (value.includes('AM') || value.includes('PM')) {
          // 12-hour format: "HH:MM AM/PM"
          const [timePart, periodPart] = value.split(' ');
          timeComponents = timePart.split(':');
          setPeriod(periodPart);
        } else {
          // 24-hour format: "HH:MM"
          timeComponents = value.split(':');
          
          if (!is24Hour) {
            // Convert from 24-hour to 12-hour
            let hourNum = parseInt(timeComponents[0], 10);
            const newPeriod = hourNum >= 12 ? 'PM' : 'AM';
            
            if (hourNum > 12) hourNum -= 12;
            if (hourNum === 0) hourNum = 12;
            
            timeComponents[0] = hourNum.toString();
            setPeriod(newPeriod);
          }
        }
        
        setHour(timeComponents[0]);
        setMinute(timeComponents[1]);
      } catch (error) {
        console.error('Error parsing time value:', error);
      }
    }
  }, [value, is24Hour]);

  // Handle changes to hour, minute, or period
  const handleHourChange = (newHour) => {
    setHour(newHour);
    updateTime(newHour, minute, period);
    
    // Reset error on change
    if (error && onErrorReset) {
      onErrorReset();
    }
  };

  const handleMinuteChange = (newMinute) => {
    setMinute(newMinute);
    updateTime(hour, newMinute, period);
    
    // Reset error on change
    if (error && onErrorReset) {
      onErrorReset();
    }
  };

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
    updateTime(hour, minute, newPeriod);
    
    // Reset error on change
    if (error && onErrorReset) {
      onErrorReset();
    }
  };

  // Update the combined time value and call the parent onChange
  const updateTime = (h, m, p) => {
    if (!h || !m) return; // Don't update if we don't have all needed values
    
    try {
      if (is24Hour) {
        onChange(`${h}:${m}`);
      } else {
        if (!p) return; // Need period for 12-hour format
        
        // Convert to standard 12-hour format
        onChange(`${h}:${m} ${p}`);
      }
    } catch (err) {
      console.error('Error updating time:', err);
    }
  };

  return (
    <div className="boxed-inputfield-wrapper" style={{ marginBottom, marginTop, marginLeft, marginRight }}>
      {label && (
        <label className="boxed-date-label">
          {label}
          {required && <span className="boxed-inputfield-required">*</span>}
        </label>
      )}
      
      <div className="time-dropdown-container">
        <div className="time-dropdown-item">
          <DropdownField
            placeholder="Hour"
            options={hourOptions}
            value={hour}
            onChange={handleHourChange}
            disabled={disabled}
            error={error}
            onErrorReset={onErrorReset}
          />
        </div>
        
        <div className="time-dropdown-item">
          <DropdownField
            placeholder="Minute"
            options={minuteOptions}
            value={minute}
            onChange={handleMinuteChange}
            disabled={disabled}
            error={error}
            onErrorReset={onErrorReset}
          />
        </div>
        
        {!is24Hour && (
          <div className="time-dropdown-item">
            <DropdownField
              placeholder="AM/PM"
              options={periodOptions}
              value={period}
              onChange={handlePeriodChange}
              disabled={disabled}
              error={error}
              onErrorReset={onErrorReset}
            />
          </div>
        )}
      </div>
      
      {error && <div className="boxed-inputfield-error-message">{error}</div>}
    </div>
  );
};

export default DropdownTime;
