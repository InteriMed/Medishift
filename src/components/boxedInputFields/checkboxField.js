import React, { useEffect } from 'react';
import './styles/boxedInputFields.css';
import { useNotification } from '../../contexts/notificationContext';

/**
 * Premium Checkbox component
 * @param {Object} props
 * @param {string} props.label - Text to display next to checkbox
 * @param {boolean} props.checked - Checked state
 * @param {Function} props.onChange - Change handler
 * @param {string} props.color - Custom color for the checkmark background
 * @param {string} props.error - Error message to display (via notification)
 * @param {boolean} props.required - Whether the field is required
 * @param {string} props.name - Input name attribute
 * @param {string} props.className - Additional class names for wrapper
 */
const Checkbox = ({
  label,
  checked = false,
  onChange,
  color,
  error = null,
  required = false,
  name = '',
  className = ''
}) => {
  const { showError } = useNotification();

  // Show notification error when error prop changes
  useEffect(() => {
    if (error) {
      showError(error);
    }
  }, [error, showError]);

  const handleChange = (e) => {
    // Only call onChange if it exists
    if (onChange) {
      if (error) {
        // Reset error when user interacts with checkbox if needed by parent logic
        onChange(e, null);
      } else {
        onChange(e);
      }
    }
  };

  return (
    <div className={`checkbox-wrapper ${className}`}>
      <label className={`checkbox-container ${error ? 'checkbox-container--error' : ''}`}>
        <input
          type="checkbox"
          name={name}
          checked={checked}
          onChange={handleChange}
          required={required}
        />
        <span
          className="checkmark"
          style={{
            backgroundColor: checked && color ? color : undefined,
            borderColor: checked && color ? color : (error ? 'var(--red-3)' : undefined),
          }}
        ></span>
        {label && (
          <span
            className={`checkbox-label ${error ? 'checkbox-label--error' : ''}`}
          >
            {label}
            {required && <span className="checkbox-required">*</span>}
          </span>
        )}
      </label>
    </div>
  );
};

export default Checkbox;
