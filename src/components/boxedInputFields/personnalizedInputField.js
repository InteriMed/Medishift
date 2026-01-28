import React, { useState, useEffect } from 'react';
import './styles/boxedInputFields.css';
import { useNotification } from '../../contexts/notificationContext';


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

function PersonnalizedInputField({
    label,
    value,
    onChange,
    marginBottom,
    marginLeft,
    marginRight,
    error,
    onErrorReset,
    verification,
    clearFilter,
    showClearButton = true,
    type = "text",
    name,
    required,
    disabled = false,
    readOnly = false,
    placeholder
}) {
    const [isFocused, setIsFocused] = useState(false);
    const { showError } = useNotification();

    useEffect(() => {
        if (error) {
            showError(error);
        }
    }, [error, showError]);

    const handleFocus = () => {
        setIsFocused(true);
        if (error && onErrorReset) {
            onErrorReset();
        }
    };

    const handleBlur = () => {
        setIsFocused(false);
    };

    const handleClear = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const syntheticEvent = {
            target: {
                name: name,
                value: ''
            }
        };
        onChange?.(syntheticEvent);
        setIsFocused(false);
    };

    const handleChange = (e) => {
        if (onChange) {
            onChange(e);
        }

        // Reset error on typing
        if (error && onErrorReset) {
            onErrorReset();
        }
    };

    return (
        <div
            className="boxed-inputfield-wrapper"
            style={{ marginBottom, marginLeft, marginRight }}
        >
            <div
                className={`boxed-inputfield-container ${error ? 'boxed-inputfield-container--error' : ''} ${value ? 'has-value' : ''} ${disabled || readOnly ? 'boxed-inputfield-container--disabled' : ''}`}
            >
                {label && (
                    <label className={`boxed-inputfield-label ${(isFocused || value) ? 'boxed-inputfield-label--focused' : ''} ${error ? 'boxed-inputfield-label--error' : ''}`}>
                        {label}
                        {required && !hasRequiredIndicator(label) && <span className="boxed-inputfield-required">*</span>}
                    </label>
                )}

                <input
                    className={`boxed-inputfield-input 
                        ${isFocused ? 'boxed-inputfield-input--focused' : ''} 
                        ${value ? 'boxed-inputfield-input--has-value' : ''} 
                        ${error ? 'boxed-inputfield-input--error' : ''}
                        ${disabled || readOnly ? 'boxed-inputfield-input--disabled' : ''}`}
                    type={type}
                    name={name}
                    required={required}
                    value={value}
                    autoComplete={type === 'email' ? 'email' : type === 'password' ? 'current-password' : undefined}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    style={{ outline: 'none' }}
                    disabled={disabled}
                    readOnly={readOnly}
                    placeholder={label ? (isFocused ? placeholder : '') : placeholder}
                />

                {value && showClearButton && !disabled && !readOnly && (
                    <button
                        className="boxed-inputfield-clear"
                        onClick={handleClear}
                        type="button"
                        aria-label="Clear input"
                        tabIndex={-1}
                    >
                        x
                    </button>
                )}
            </div>
        </div>
    );
}

export default PersonnalizedInputField;