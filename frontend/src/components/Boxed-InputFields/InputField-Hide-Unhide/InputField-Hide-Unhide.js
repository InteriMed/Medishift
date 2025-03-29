import React, { useState, useEffect } from 'react';
import { BiShow, BiHide } from "react-icons/bi";
import '../combined_css.css';

function InputFieldHideUnhide({ label, placeholder, value, onChange, marginBottom, marginLeft, marginRight, error, onErrorReset, type }) {
    const [isFocused, setIsFocused] = useState(false);
    const [showPlaceholder, setShowPlaceholder] = useState(!label);
    const [showError, setShowError] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleFocus = () => {
        setIsFocused(true);
        if (label) {
            setTimeout(() => {
                setShowPlaceholder(true);
            }, 100);
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

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    // Determine the input type
    const inputType = type === 'password' 
        ? (showPassword ? 'text' : 'password')
        : type || 'text';

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
            <div className="boxed-inputfield-wrapper">
                <input
                    className={`boxed-inputfield-input 
                        ${isFocused ? 'boxed-inputfield-input--focused' : ''} 
                        ${value ? 'boxed-inputfield-input--has-value' : ''} 
                        ${showPlaceholder ? 'boxed-inputfield-input--show-placeholder' : ''}
                        ${type === 'password' ? 'boxed-inputfield-input--password' : ''}`}
                    type={inputType}
                    placeholder={showPlaceholder ? placeholder : ''}
                    value={value}
                    onChange={onChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                />
                {type === 'password' && (
                    <button 
                        type="button"
                        className="boxed-inputfield-password-toggle"
                        onClick={togglePasswordVisibility}
                    >
                        {showPassword ? <BiHide /> : <BiShow />}
                    </button>
                )}
            </div>
            {error && <div className={`boxed-inputfield-error-message ${showError ? 'boxed-inputfield-error-message--visible' : ''}`}>{error}</div>}
        </div>
    );
}

export default InputFieldHideUnhide;
