import React, { useState, useEffect } from 'react';
import '../combined_css.css';

function InputField({ label, placeholder, value, onChange, marginBottom, marginLeft, marginRight, error, onErrorReset }) {
    const [isFocused, setIsFocused] = useState(false);
    const [showPlaceholder, setShowPlaceholder] = useState(!label);
    const [showError, setShowError] = useState(false);

    const handleFocus = () => {
        setIsFocused(true);
        if (label) {
            setShowPlaceholder(true);
        }
        if (error && onErrorReset) {
            onErrorReset(); // Reset the error when the input is clicked
        }
    };

    const handleBlur = () => {
        setIsFocused(false);
        if (label && !value) {
            setShowPlaceholder(false);
        }
    };

    useEffect(() => {
        if (label && value) {
            setShowPlaceholder(true);
        }
    }, [label, value]);

    useEffect(() => {
        if (error) {
            setShowError(true);
        } else {
            setShowError(false);
        }
    }, [error]);

    const adjustHeight = (e) => {
        const textarea = e.target;
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
        setTimeout(() => {
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        }, 0);
    };

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
            <textarea
                className={`boxed-inputfield-input 
                    ${isFocused ? 'boxed-inputfield-input--focused' : ''} 
                    ${value ? 'boxed-inputfield-input--has-value' : ''} 
                    ${showPlaceholder ? 'boxed-inputfield-input--show-placeholder' : ''}`}
                placeholder={showPlaceholder ? placeholder : ''}
                value={value}
                onChange={(e) => {
                    onChange(e);
                    adjustHeight(e);
                }}
                onFocus={handleFocus}
                onBlur={handleBlur}
                style={{ outline: 'none' }}
                rows={1}
            />
            {error && <div className={`boxed-inputfield-error-message ${showError ? 'boxed-inputfield-error-message--visible' : ''}`}>{error}</div>}
        </div>
    );
}

export default InputField;
