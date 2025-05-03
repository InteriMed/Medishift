import React, { useState, useEffect } from 'react';
import '../combined_css.css';
import { BiNoEntry } from 'react-icons/bi';

function InputFieldParagraph({ label, placeholder, value, onChange, marginBottom, marginLeft, marginRight, error, onErrorReset, clearFilter, showClearButton = true, rows = 1, showErrors = false }) {
    const [isFocused, setIsFocused] = useState(false);
    const [showPlaceholder, setShowPlaceholder] = useState(!label);

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

    const handleClear = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (clearFilter) {
            clearFilter();
        } else {
            onChange?.('');
        }
        setIsFocused(false);
    };

    useEffect(() => {
        if (label && value) {
            setShowPlaceholder(true);
        }
    }, [label, value]);

    // Check if error message should be displayed
    const shouldShowErrorMessage = error && showErrors;

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
        <div 
            className="boxed-inputfield-wrapper" 
            style={{ marginBottom, marginLeft, marginRight }}
        >
            <div 
                className={`boxed-inputfield-container boxed-inputfield-container--paragraph ${error && showErrors ? 'boxed-inputfield-container--error' : ''} ${value ? 'has-value' : ''}`}
            >
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
                        onChange?.(e.target.value);
                        adjustHeight(e);
                    }}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    style={{ outline: 'none', resize: 'none', overflowY: 'hidden' }}
                    rows={rows}
                />
                
                {value && showClearButton && (
                    <button 
                        className="boxed-inputfield-clear" 
                        onClick={handleClear}
                        type="button"
                        aria-label="Clear input"
                    >
                        x
                    </button>
                )}
            </div>
            {shouldShowErrorMessage && <div className={`boxed-inputfield-error-message ${shouldShowErrorMessage ? 'boxed-inputfield-error-message--visible' : ''}`}>{error}</div>}
        </div>
    );
}

export default InputFieldParagraph;
