import React, { useState, useEffect } from 'react';
import { BiShow, BiHide } from "react-icons/bi";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
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

function InputFieldHideUnhide({ label, placeholder, value, onChange, marginTop, marginBottom, marginLeft, marginRight, error, onErrorReset, type, clearFilter, showClearButton = true, showErrors = true, required = false, name }) {
    const [isFocused, setIsFocused] = useState(false);
    const [showPlaceholder, setShowPlaceholder] = useState(!label);
    const [showPassword, setShowPassword] = useState(false);
    const [internalError, setInternalError] = useState(error);
    const { showError } = useNotification();

    useEffect(() => {
        setInternalError(error);
        if (error) {
            showError(error);
        }
    }, [error, showError]);

    const handleFocus = () => {
        setIsFocused(true);
        if (label) {
            setTimeout(() => {
                setShowPlaceholder(true);
            }, 100);
        }

        // Reset error states when input is focused
        setInternalError(null);

        if (onErrorReset) {
            onErrorReset();
        }
    };

    const handleBlur = () => {
        setIsFocused(false);
        if (label && !value) {
            setShowPlaceholder(false);
        }
    };

    const handleClear = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (clearFilter) {
            clearFilter();
        } else {
            const syntheticEvent = {
                target: {
                    name: e.target.name,
                    value: ''
                }
            };
            onChange?.(syntheticEvent);
        }
        setIsFocused(false);
        if (label) {
            setShowPlaceholder(false);
        }

        // Reset error states when input is cleared
        setInternalError(null);

        if (onErrorReset) {
            onErrorReset();
        }
    };

    useEffect(() => {
        if (label && value) {
            setShowPlaceholder(true);
        }
    }, [label, value]);

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    // Determine the input type
    const inputType = type === 'password' ? (showPassword ? 'text' : 'password') : type;

    return (
        <div
            className="boxed-inputfield-wrapper"
            style={{ marginTop, marginBottom, marginLeft, marginRight }}
        >
            <div
                className={`boxed-inputfield-container ${internalError ? 'boxed-inputfield-container--error' : ''} ${value ? 'has-value' : ''}`}
            >
                {label && (
                    <label className={`boxed-inputfield-label ${(isFocused || value) ? 'boxed-inputfield-label--focused' : ''} ${internalError ? 'boxed-inputfield-label--error' : ''}`}>
                        {label}{required && !hasRequiredIndicator(label) && <span className="boxed-inputfield-required">*</span>}
                    </label>
                )}

                <input
                    className={`boxed-inputfield-input 
                        ${isFocused ? 'boxed-inputfield-input--focused' : ''} 
                        ${value ? 'boxed-inputfield-input--has-value' : ''} 
                        ${showPlaceholder ? 'boxed-inputfield-input--show-placeholder' : ''}
                        ${type === 'password' ? 'boxed-inputfield-input--password' : ''}
                        ${internalError ? 'boxed-inputfield-input--error' : ''}`}
                    type={inputType}
                    name={name}
                    required={required}
                    placeholder={showPlaceholder ? placeholder : ''}
                    value={value}
                    autoComplete={type === 'password' ? 'current-password' : type === 'email' ? 'email' : undefined}
                    onChange={(e) => {
                        // Reset error state when user types
                        setInternalError(null);
                        if (onErrorReset) {
                            onErrorReset();
                        }
                        onChange(e);
                    }}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                />

                {internalError && (
                    <div className="boxed-inputfield-error-message">
                        {internalError}
                    </div>
                )}

                {value && showClearButton && (
                    <button
                        className={`boxed-inputfield-clear ${internalError ? 'boxed-inputfield-clear--error' : ''}`}
                        onClick={handleClear}
                        type="button"
                        aria-label="Clear input"
                        style={{
                            right: '40px',
                        }}
                        tabIndex={-1}
                    >
                        x
                    </button>
                )}

                {type === 'password' && (
                    <button
                        type="button"
                        className={`boxed-inputfield-password-toggle ${internalError ? 'boxed-inputfield-password-toggle--error' : ''}`}
                        onClick={togglePasswordVisibility}
                        style={{
                            color: internalError ? 'var(--red-3)' : 'inherit',
                            right: '30px'
                        }}
                        tabIndex={-1}
                    >
                        {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
                    </button>
                )}
            </div>
        </div>
    );
}

export default InputFieldHideUnhide;
