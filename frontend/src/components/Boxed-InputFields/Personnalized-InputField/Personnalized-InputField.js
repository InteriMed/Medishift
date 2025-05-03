import React, { useState, useEffect } from 'react';
import '../combined_css.css';
import { BiNoEntry } from 'react-icons/bi';

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
    verification,
    clearFilter,
    showClearButton = true,
    showErrors = false
}) {
    const [isFocused, setIsFocused] = useState(false);
    const [showPlaceholder, setShowPlaceholder] = useState(!label);

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

    const shouldShowErrorMessage = error && showErrors;

    return (
        <div 
            className="boxed-inputfield-wrapper" 
            style={{ marginBottom, marginLeft, marginRight }}
        >
            <div 
                className={`boxed-inputfield-container ${error && showErrors ? 'boxed-inputfield-container--error' : ''} ${value ? 'has-value' : ''}`}
            >
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
            {shouldShowErrorMessage && 
                <div className={`boxed-inputfield-error-message ${shouldShowErrorMessage ? 'boxed-inputfield-error-message--visible' : ''}`}>
                    {error}
                </div>
            }
        </div>
    );
}

export default PersonnalizedInputField;