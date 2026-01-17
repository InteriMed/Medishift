import React, { useEffect } from 'react';
import './styles/CheckboxField.css';
import { useNotification } from '../../contexts/NotificationContext';

const Checkbox = ({
  label,
  checked = false,
  onChange,
  color,
  error = null,
  required = false,
  name = ''
}) => {
  const { showError } = useNotification();

  // Show notification error when error prop changes
  useEffect(() => {
    if (error) {
      showError(error);
    }
  }, [error, showError]);

  const handleChange = (e) => {
    if (error && onChange) {
      // Reset error when user interacts with checkbox
      onChange(e, null); // Pass null as second parameter to indicate error reset
    } else {
      onChange(e);
    }
  };

  return (
    <div className="checkbox-wrapper">
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
            backgroundColor: checked ? color : '#fff',
            borderColor: error ? 'var(--red-3)' : color,
            opacity: checked ? 1 : 0.5
          }}
        ></span>
        <span
          className={`checkbox-label ${error ? 'checkbox-label--error' : ''}`}
          style={{ opacity: checked ? 1 : 0.5 }}
        >
          {label}
          {required && <span className="checkbox-required">*</span>}
        </span>
      </label>
    </div>
  );
};

export default Checkbox;
