import React, { useState, useEffect } from 'react';
import './styles/boxedInputFields.css';

import { useNotification } from '../../contexts/NotificationContext';

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

const InputFieldParagraph = ({
  label,
  value = '',
  onChange,
  placeholder = '',
  required = false,
  error = null,
  disabled = false,
  rows = 4,
  maxLength,
  showCharacterCount = false,
  marginBottom,
  marginTop,
  marginLeft,
  marginRight,
  name,
  onErrorReset
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const { showError } = useNotification();

  // Update internal state when the external value changes
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  // Show notification error when error prop changes
  useEffect(() => {
    if (error) {
      showError(error);
    }
  }, [error, showError]);

  const handleFocus = () => {
    setIsFocused(true);

    // Reset error on focus
    if (error && onErrorReset) {
      onErrorReset();
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const handleChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Create a synthetic event to match the expected structure
    const syntheticEvent = {
      target: {
        name: name,
        value: newValue
      }
    };

    onChange(syntheticEvent);

    // Reset error on typing
    if (error && onErrorReset) {
      onErrorReset();
    }
  };

  // Determine container class names
  const containerClassNames = [
    'boxed-paragraph-container',
    isFocused ? 'boxed-paragraph-container--focused' : '',
    error ? 'boxed-paragraph-container--error' : '',
    disabled ? 'boxed-paragraph-container--disabled' : '',
    inputValue ? 'has-value' : ''
  ].filter(Boolean).join(' ');

  return (
    <div
      className="boxed-inputfield-wrapper"
      style={{ marginBottom, marginTop, marginLeft, marginRight }}
    >
      <div className={containerClassNames}>
        {label && (
          <label
            className={`boxed-paragraph-label ${(isFocused || inputValue) ? 'boxed-paragraph-label--active' : ''}`}
          >
            {label}
            {required && !hasRequiredIndicator(label) && <span className="boxed-inputfield-required">*</span>}
          </label>
        )}

        <textarea
          className="boxed-paragraph-input"
          value={inputValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          maxLength={maxLength}
          required={required}
        />

        {showCharacterCount && maxLength && (
          <div className="boxed-paragraph-character-count">
            {inputValue.length}/{maxLength}
          </div>
        )}
      </div>
    </div>
  );
};

export default InputFieldParagraph;
