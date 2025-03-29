import React, { useState, useEffect, useRef } from 'react';
import '../combined_css.css';

function DropdownField({ 
    label, 
    placeholder, 
    options = [], 
    value, 
    onChange, 
    marginBottom, 
    marginLeft, 
    marginRight, 
    error, 
    onErrorReset,
    required = false,
    showErrors = false
}) {
    const [isFocused, setIsFocused] = useState(false);
    const [showPlaceholder, setShowPlaceholder] = useState(!label);
    const [showError, setShowError] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef(null);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [defaultError, setDefaultError] = useState(required ? "Required" : "");

    const filteredOptions = options.filter(option => {
        const optionLabel = typeof option === 'string' ? option : option.label;
        const searchTermString = String(searchTerm || '');
        return optionLabel.toLowerCase().includes(searchTermString.toLowerCase());
    });

    const handleFocus = () => {
        setIsFocused(true);
        setIsOpen(true);
        if (label) {
            setShowPlaceholder(false);
        }
        if (error && onErrorReset) {
            onErrorReset();
        }
    };

    const handleBlur = (e) => {
        if (e.relatedTarget?.classList.contains('boxed-inputfield-arrow')) {
            return;
        }

        setTimeout(() => {
            const activeElement = document.activeElement;
            const isDropdownOption = activeElement?.classList.contains('boxed-inputfield-option');
            const isArrow = activeElement?.classList.contains('boxed-inputfield-arrow');
            
            if (!dropdownRef.current?.contains(activeElement) && !isDropdownOption && !isArrow) {
                setIsFocused(false);
                setIsOpen(false);
                // Only show placeholder when there's no label or when there's no value
                setShowPlaceholder(!label || !searchTerm);
                
                // Restore full option text when losing focus if there's a value
                if (value) {
                    const selectedOption = options.find(opt => 
                        (typeof opt === 'string' ? opt : opt.value || opt.label) === value
                    );
                    if (selectedOption) {
                        const displayValue = typeof selectedOption === 'string' ? 
                            selectedOption : selectedOption.label;
                        setSearchTerm(displayValue);
                    }
                }
            }
        }, 200);
    };

    const handleOptionSelect = (option) => {
        if (!option) return;
        
        const optionValue = typeof option === 'string' ? option : option.value || option.label;
        const optionLabel = typeof option === 'string' ? option : option.label;
        
        setSearchTerm(optionLabel);
        onChange?.(optionValue);
        setIsOpen(false);
        setIsFocused(false);
        // Don't show placeholder when there's a label and a value
        setShowPlaceholder(!label);
        setSelectedIndex(-1);
    };

    const handleInputChange = (e) => {
        const newValue = String(e.target.value);
        setSearchTerm(newValue);
        setShowPlaceholder(true);
        setIsOpen(true);
        
        // Clear the selection if input is completely erased
        if (newValue === '') {
            // Pass empty string instead of null to avoid null reference errors
            onChange?.('');
            // Display error if needed
            if (error) {
                setShowError(true);
            }
        }
    };

    const handleArrowClick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        setIsOpen(!isOpen);
        
        if (isOpen) {
            setIsFocused(false);
            dropdownRef.current.querySelector('.boxed-inputfield-input').blur();
            // When closing dropdown, only show placeholder if no label or no value
            setShowPlaceholder(!label || !searchTerm);
        } else {
            setIsFocused(true);
            dropdownRef.current.querySelector('.boxed-inputfield-input').focus();
            // When opening dropdown, hide placeholder if label is present
            setShowPlaceholder(!label);
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
                setSearchTerm(value || '');
                // Only show placeholder when there's no label or no value selected
                setShowPlaceholder(!label || !value);
                break;
            default:
                break;
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                setIsFocused(false);
                setShowPlaceholder(true);
                if (!value) {
                    setSearchTerm('');
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [searchTerm, value]);

    useEffect(() => {
        if (value) {
            const selectedOption = options.find(opt => 
                (typeof opt === 'string' ? opt : opt.value || opt.label) === value
            );
            if (selectedOption) {
                const displayValue = typeof selectedOption === 'string' ? 
                    selectedOption : selectedOption.label;
                setSearchTerm(displayValue);
            } else {
                setSearchTerm(value);
            }
            // Don't show placeholder when there's a label
            setShowPlaceholder(!label);
        } else {
            setSearchTerm('');
            // Show placeholder only when there's no label
            setShowPlaceholder(!label);
        }
    }, [value, options, label]);

    const isOptionSelected = () => {
        if (!value) return false;
        if (!Array.isArray(options)) return false;
        return options.some(option => 
            (typeof option === 'string' ? option : option.value || option.label) === value
        );
    };

    // Add this effect to handle autofill
    useEffect(() => {
        const input = dropdownRef.current?.querySelector('.boxed-inputfield-input');
        if (!input) return;

        const handleAnimationStart = (e) => {
            if (e.animationName.includes('webkit-autofill')) {
                setIsFocused(true);
                setShowPlaceholder(true);
            }
        };

        input.addEventListener('animationstart', handleAnimationStart);
        return () => input.removeEventListener('animationstart', handleAnimationStart);
    }, []);

    // Update error display when error prop or showErrors changes
    useEffect(() => {
        if (error || (required && !value && showErrors)) {
            setShowError(true);
        } else if (!error) {
            setShowError(false);
        }
    }, [error, showErrors, required, value]);

    // Update defaultError when required prop changes
    useEffect(() => {
        setDefaultError(required ? "Required" : "");
    }, [required]);

    // Determine if we should show an error
    const shouldShowError = error || (required && !value && showErrors);

    return (
        <div 
            ref={dropdownRef}
            className={`boxed-inputfield-container 
                ${shouldShowError ? 'boxed-inputfield-error' : ''} 
                ${isOptionSelected() ? 'has-value' : ''}`
            } 
            style={{ marginBottom, marginLeft, marginRight }}
        >
            {label && (
                <label className={`boxed-inputfield-label ${(isFocused || searchTerm) ? 'boxed-inputfield-label--focused' : ''}`}>
                    {label}{required ? ' *' : ''}
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
                required={required}
            />
            <span 
                className={`boxed-inputfield-arrow ${isOpen ? 'boxed-inputfield-arrow--open' : ''}`}
                onClick={handleArrowClick}
            >
                ▼
            </span>
            
            <div 
                id="dropdown-options"
                className={`boxed-inputfield-options ${isOpen ? 'boxed-inputfield-options--visible' : ''}`}
                role="listbox"
            >
                {filteredOptions.map((option, index) => (
                    <div
                        key={index}
                        id={`option-${index}`}
                        className={`boxed-inputfield-option ${selectedIndex === index ? 'selected' : ''}`}
                        onClick={() => handleOptionSelect(option)}
                        role="option"
                        aria-selected={selectedIndex === index}
                    >
                        {typeof option === 'string' ? option : option.label}
                    </div>
                ))}
            </div>
            
            {shouldShowError && (
                <div className={`boxed-inputfield-error-message ${showError ? 'show-error' : ''}`}>
                    {error || defaultError}
                </div>
            )}
        </div>
    );
}

export default DropdownField;
