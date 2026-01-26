import React, { useState, useEffect } from 'react';
import './styles/SwitchField.css';
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

function BoxedSwitchField({
    label,
    checked = false,
    onChange,
    marginBottom,
    marginLeft,
    marginRight,
    error,
    onErrorReset,
    required,
    disabled = false,
    name
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

    const handleChange = (e) => {
        if (onChange) {
            onChange(e.target.checked);
        }

        if (error && onErrorReset) {
            onErrorReset();
        }
    };

    const handleContainerClick = (e) => {
        if (!disabled) {
            const isInsideSwitch = e.target.closest('.boxed-switchfield-switch-label');
            if (e.target.type !== 'checkbox' && !isInsideSwitch) {
                const newChecked = !checked;
                if (onChange) {
                    onChange(newChecked);
                }
                if (error && onErrorReset) {
                    onErrorReset();
                }
            }
            setIsFocused(true);
        }
    };

    const handleSwitchClick = (e) => {
        e.stopPropagation();
        if (!disabled) {
            const newChecked = !checked;
            if (onChange) {
                onChange(newChecked);
            }
            if (error && onErrorReset) {
                onErrorReset();
            }
            setIsFocused(true);
        }
    };

    const hasValue = checked;

    return (
        <div
            className="boxed-switchfield-wrapper"
            style={{ marginBottom, marginLeft, marginRight }}
        >
            <div
                className={`boxed-switchfield-container ${error ? 'boxed-switchfield-container--error' : ''} ${hasValue ? 'has-value' : ''} ${disabled ? 'boxed-switchfield-container--disabled' : ''} ${isFocused ? 'boxed-switchfield-container--focused' : ''}`}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onClick={handleContainerClick}
                tabIndex={disabled ? -1 : 0}
            >
                {label && (
                    <label className={`boxed-switchfield-label ${(isFocused || hasValue) ? 'boxed-switchfield-label--focused' : ''} ${error ? 'boxed-switchfield-label--error' : ''}`}>
                        {label}
                        {required && !hasRequiredIndicator(label) && <span className="boxed-switchfield-required">*</span>}
                    </label>
                )}

                <div className="boxed-switchfield-content">
                    <div className="boxed-switchfield-switch-label" onClick={handleSwitchClick}>
                        <input
                            type="checkbox"
                            name={name}
                            checked={checked}
                            onChange={handleChange}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                            disabled={disabled}
                            className="boxed-switchfield-switch-input"
                            onClick={(e) => e.stopPropagation()}
                        />
                        <span className={`boxed-switchfield-slider round ${checked ? 'boxed-switchfield-slider--checked' : ''} ${error ? 'boxed-switchfield-slider--error' : ''}`}></span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default BoxedSwitchField;

