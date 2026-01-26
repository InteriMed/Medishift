import React, { useState, useEffect, useRef } from 'react';
import './styles/boxedInputFields.css';

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

function DropdownField({
    label,
    options = [],
    value = [],
    onChange,
    marginBottom,
    marginLeft,
    marginRight,
    error,
    onErrorReset,
    disableList = false,
    required = false,
    clearFilter,
    showClearButton = true,
    maxHeight = '150px',
    placeholder = 'Select...'
}) {
    const [isFocused, setIsFocused] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isOptionHovered, setIsOptionHovered] = useState(false);
    const dropdownRef = useRef(null);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [selectedValues, setSelectedValues] = useState(value || []);

    // Sync selectedValues with external value prop when it changes
    useEffect(() => {
        if (Array.isArray(value)) {
            setSelectedValues(value);
        }
    }, [value]);

    // Reset hover state when dropdown closes
    useEffect(() => {
        if (!isOpen) {
            setIsOptionHovered(false);
        }
    }, [isOpen]);


    // Filter options based on the search term
    const filteredOptions = options.filter(option => {
        const optionLabel = typeof option === 'string' ? option : option.label;
        return optionLabel.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const handleFocus = () => {
        setIsFocused(true);
        setIsOpen(true);
        if (error && onErrorReset) {
            onErrorReset();
        }
    };

    const handleBlur = (e) => {
        // Use a timeout to allow click events on dropdown options to complete first
        setTimeout(() => {
            const activeElement = document.activeElement;
            const isDropdownOption = activeElement?.classList.contains('boxed-inputfield-option');

            if (!dropdownRef.current?.contains(activeElement) && !isDropdownOption) {
                setIsFocused(false);
                setIsOpen(false);
            }
        }, 200);
    };

    const handleOptionSelect = (option) => {
        if (!option) return;

        const optionValue = typeof option === 'string' ? option : option.value || option.label;
        const optionLabel = typeof option === 'string' ? option : option.label;

        const existingIndex = selectedValues.findIndex(item =>
            item.value === optionValue || item.label === optionLabel
        );

        if (existingIndex !== -1) {
            const newSelectedValues = selectedValues.filter((_, index) => index !== existingIndex);
            setSelectedValues(newSelectedValues);
            onChange?.(newSelectedValues);
            // Removed success message set

        } else {
            const newSelectedValues = [...selectedValues, { value: optionValue, label: optionLabel }];
            setSelectedValues(newSelectedValues);
            onChange?.(newSelectedValues);
            // Added success message set


            if (required && error && onErrorReset) {
                onErrorReset();
            }
        }

        setSearchTerm('');
        setSelectedIndex(-1);
        setIsOpen(false);

        dropdownRef.current?.querySelector('.boxed-inputfield-input')?.focus();
    };

    const removeSelectedValue = (indexToRemove) => {
        const newSelectedValues = selectedValues.filter((_, index) => index !== indexToRemove);
        setSelectedValues(newSelectedValues);
        if (onChange) {
            onChange(newSelectedValues);
        }
    };

    const handleInputChange = (e) => {
        const newValue = String(e.target.value);
        setSearchTerm(newValue);
        setIsOpen(true);

        // Reset error on typing
        if (error && onErrorReset) {
            onErrorReset();
        }
    };

    const handleArrowClick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (isOpen) {
            setIsOpen(false);
            setIsFocused(false);
        } else {
            setIsFocused(true);
            setIsOpen(true);
            dropdownRef.current.querySelector('.boxed-inputfield-input').focus();
        }
        if (error && onErrorReset) {
            onErrorReset();
        }
    };

    const handleKeyDown = (e) => {
        if (!isOpen) {
            if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                setIsOpen(true);
                setSelectedIndex(0);
                return;
            }
        }

        if (filteredOptions.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev < filteredOptions.length - 1 ? prev + 1 : 0);
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev > 0 ? prev - 1 : filteredOptions.length - 1);
                break;
            case 'Tab':
                if (isOpen) {
                    e.preventDefault();
                    setSelectedIndex(prev =>
                        prev < filteredOptions.length - 1 ? prev + 1 : 0);
                }
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0) {
                    handleOptionSelect(filteredOptions[selectedIndex]);
                }
                break;
            case 'Escape':
                e.preventDefault();
                setIsOpen(false);
                setIsFocused(false);
                setSelectedIndex(-1);
                setSearchTerm('');
                break;
            default:
                break;
        }
    };

    const handleClear = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (clearFilter) {
            clearFilter();
        } else {
            onChange?.([]);
        }
        setIsFocused(false);
        setIsOpen(false);
        setSearchTerm('');
        setSelectedValues([]);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                setIsFocused(false);
                setSearchTerm('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleContainerClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const target = e.target;
        const currentTarget = e.currentTarget;
        if (target === currentTarget || currentTarget.contains(target)) {
            setIsOpen(true);
            setIsFocused(true);
        }
    };

    return (
        <div
            className="boxed-inputfield-wrapper"
            style={{ marginBottom, marginLeft, marginRight }}
            ref={dropdownRef}
        >
            <div
                className={`boxed-inputfield-container ${error ? 'boxed-inputfield-error' : ''} ${selectedValues.length > 0 ? 'has-value' : ''} ${isOptionHovered ? 'boxed-inputfield-container--option-hovered' : ''}`}
                onClick={handleContainerClick}
                style={{ cursor: 'pointer' }}
            >
                {label && (
                    <label className={`boxed-inputfield-label ${(isFocused || searchTerm || selectedValues.length > 0) ? 'boxed-inputfield-label--focused' : ''} ${error ? 'boxed-inputfield-label--error' : ''}`}>
                        {label}
                        {required && !hasRequiredIndicator(label) && <span className="boxed-inputfield-required">*</span>}
                    </label>
                )}

                <input
                    className={`boxed-inputfield-input ${isFocused ? 'boxed-inputfield-input--show-placeholder' : ''}`}
                    type="text"
                    value={searchTerm}
                    onChange={handleInputChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    role="combobox"
                    aria-expanded={isOpen}
                    aria-controls="dropdown-options"
                    aria-activedescendant={selectedIndex >= 0 ? `option-${selectedIndex}` : undefined}
                    placeholder={error && typeof error === 'string' ? error : placeholder}
                />

                {selectedValues.length > 0 && showClearButton && (
                    <button
                        className="boxed-inputfield-clear"
                        onClick={handleClear}
                        type="button"
                        aria-label="Clear all selections"
                        style={{
                            right: '40px',
                        }}
                        tabIndex={-1}
                    >
                        x
                    </button>
                )}

                <span
                    className={`boxed-inputfield-arrow ${isOpen ? 'boxed-inputfield-arrow--open' : ''}`}
                    onClick={handleArrowClick}
                >
                    ▼
                </span>

                {isOpen && (
                    <div
                        id="boxed-inputfield-options"
                        className="boxed-inputfield-options boxed-inputfield-options--visible"
                        role="listbox"
                        style={{ maxHeight: maxHeight }}
                    >
                        {filteredOptions.map((option, index) => {
                            const optionValue = typeof option === 'string' ? option : option.value || option.label;
                            const optionLabel = typeof option === 'string' ? option : option.label;
                            const isSelected = selectedValues.some(item =>
                                item.value === optionValue || item.label === optionLabel
                            );

                            return (
                                <div
                                    key={index}
                                    id={`option-${index}`}
                                    className={`boxed-inputfield-option ${selectedIndex === index ? 'selected' : ''}`}
                                    onClick={() => handleOptionSelect(option)}
                                    onMouseEnter={() => setIsOptionHovered(true)}
                                    onMouseLeave={() => setIsOptionHovered(false)}
                                    role="option"
                                    aria-selected={selectedIndex === index}
                                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                >
                                    <span>{typeof option === 'string' ? option : option.label}</span>
                                    <span className={`option-tick ${isSelected ? 'visible' : ''}`}>✓</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {selectedValues.length > 0 && (
                <div className={`selected-values-container ${disableList ? 'disabled' : ''}`}>
                    {selectedValues.map((item, index) => (
                        <div key={index} className="selected-value-tag">
                            <span>{item.label}</span>
                            {!disableList && (
                                <span
                                    className="remove-tag-button"
                                    onClick={(e) => removeSelectedValue(index)}
                                    role="button"
                                    tabIndex={0}
                                >
                                    ✕
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default DropdownField;
