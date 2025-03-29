import React, { useState, useEffect } from 'react';
import '../combined_css.css';
function PersonnalizedInputField({ 
    label, 
    placeholder, 
    value, 
    onChange, 
    marginBottom, 
    marginLeft, 
    marginRight, 
    error, 
    onErrorReset,
    verification
}) {
    const [isFocused, setIsFocused] = useState(false);
    const [showPlaceholder, setShowPlaceholder] = useState(!label);
    const [showError, setShowError] = useState(false);

    const handleFocus = () => {
        setIsFocused(true);
        if (label) {
            setTimeout(() => {
                setShowPlaceholder(true);
            }, 100);
        }
        if (error && onErrorReset) {
            onErrorReset();
        }
    };

    const handleBlur = () => {
        setIsFocused(false);
        if (label && !value) {
            setShowPlaceholder(false);
        }
    };

    const handleChange = (e) => {
        if (onChange) {
            onChange(e);
        }
    };

    useEffect(() => {
        if (label && value) {
            setShowPlaceholder(true);
        }
    }, [label, value]);

    useEffect(() => {
        setShowError(error);
    }, [error]);

    return (
        <div className={`boxed-inputfield-container ${error ? 'boxed-inputfield-container--error' : ''}`} style={{ 
            marginBottom,
            marginLeft, 
            marginRight 
        }}>
            {label && (
                <label className={`boxed-inputfield-label ${(isFocused || value) ? 'boxed-inputfield-label--focused' : ''}`}>
                    {label}
                </label>
            )}
            <input
                className={`boxed-inputfield-input 
                    ${isFocused ? 'boxed-inputfield-input--focused' : ''} 
                    ${value ? 'boxed-inputfield-input--has-value' : ''} 
                    ${showPlaceholder ? 'boxed-inputfield-input--show-placeholder' : ''}`}
                type="text"
                placeholder={showPlaceholder ? placeholder : ''}
                value={value}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={{ outline: 'none' }}
            />
            {error && 
                <div className={`boxed-inputfield-error-message ${showError ? 'boxed-inputfield-error-message--visible' : ''}`}>
                    {error}
                </div>
            }
        </div>
    );
}

export default PersonnalizedInputField;