import React, { useState, useEffect, useRef } from 'react';
import '../combined_css.css';
import { BiNoEntry } from 'react-icons/bi';

function DropdownField({ 
    label, 
    placeholder, 
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
    maxHeight = '150px'
}) {
    const [isFocused, setIsFocused] = useState(false);
    const [showPlaceholder, setShowPlaceholder] = useState(!label);
    const [showError, setShowError] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef(null);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [selectedValues, setSelectedValues] = useState(value || []);
    const [successMessage, setSuccessMessage] = useState('');

    // Sync selectedValues with external value prop when it changes
    useEffect(() => {
        if (Array.isArray(value)) {
            setSelectedValues(value);
        }
    }, [value]);

    // Show error when error prop is passed
    useEffect(() => {
        if (error) {
            setShowError(true);
        } else {
            setShowError(false);
        }
    }, [error]);

    const filteredOptions = options.filter(option => {
        const optionLabel = typeof option === 'string' ? option : option.label;
        const searchTermString = String(searchTerm || '');
        return optionLabel.toLowerCase().includes(searchTermString.toLowerCase());
    });

    const handleFocus = () => {
        setIsFocused(true);
        setIsOpen(true);
        if (label) {
            setShowPlaceholder(true);
        }
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
                setShowPlaceholder(selectedValues.length === 0 && !label);
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
            setSuccessMessage(`Removed ${optionLabel}`);
        } else {
            const newSelectedValues = [...selectedValues, { value: optionValue, label: optionLabel }];
            setSelectedValues(newSelectedValues);
            onChange?.(newSelectedValues);
            setSuccessMessage(`Added ${optionLabel}`);
            
            if (required && error && onErrorReset) {
                onErrorReset();
            }
        }
        
        setTimeout(() => setSuccessMessage(''), 1000);
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
        setShowPlaceholder(true);
        setIsOpen(true);
    };

    const handleArrowClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (isOpen) {
            setIsOpen(false);
            setIsFocused(false);
            setShowPlaceholder(selectedValues.length === 0 && !label);
        } else {
            setIsFocused(true);
            setIsOpen(true);
            setShowPlaceholder(true);
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
                setShowPlaceholder(selectedValues.length === 0 && !label);
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
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                setIsFocused(false);
                setShowPlaceholder(selectedValues.length === 0 && !label);
                setSearchTerm('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [label, selectedValues]);

    const handleContainerClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(true);
        setIsFocused(true);
        setShowPlaceholder(selectedValues.length === 0 && !label);
    };

    return (
        <div 
            className="boxed-inputfield-wrapper" 
            style={{ marginBottom, marginLeft, marginRight }}
            ref={dropdownRef}
        >
            <div 
                className={`boxed-inputfield-container ${error ? 'boxed-inputfield-error' : ''} ${selectedValues.length > 0 ? 'has-value' : ''}`}
                onClick={handleContainerClick}
                style={{ cursor: 'pointer' }}
            >
                {label && (
                    <label className={`boxed-inputfield-label ${(isFocused || searchTerm || selectedValues.length > 0) ? 'boxed-inputfield-label--focused' : ''}`}>
                        {label}
                    </label>
                )}
                
                <input
                    className="boxed-inputfield-input"
                    type="text"
                    placeholder={showPlaceholder ? placeholder : ''}
                    value={searchTerm}
                    onChange={handleInputChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    role="combobox"
                    aria-expanded={isOpen}
                    aria-controls="dropdown-options"
                    aria-activedescendant={selectedIndex >= 0 ? `option-${selectedIndex}` : undefined}
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
                
                <div 
                    id="boxed-inputfield-options"
                    className={`boxed-inputfield-options ${isOpen ? 'boxed-inputfield-options--visible' : ''}`}
                    role="listbox"
                    style={{ maxHeight: maxHeight}}
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
            </div>

            {selectedValues.length > 0 && (
                <div className={`selected-values-container ${disableList ? 'disabled' : ''}`}>
                    {selectedValues.map((item, index) => (
                        <div key={index} className="selected-value-tag">
                            <span>{item.label}</span>
                            {!disableList && (
                                <span 
                                    className="remove-tag-button"
                                    onClick={() => removeSelectedValue(index)}
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
            
            {error && <div className={`boxed-inputfield-error-message ${showError ? 'show-error' : ''}`}>{error}</div>}
        </div>
    );
}

export default DropdownField;
