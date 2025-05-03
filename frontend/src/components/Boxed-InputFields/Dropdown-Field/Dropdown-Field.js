import React, { useState, useEffect, useRef } from 'react';
import '../combined_css.css';
import { BiNoEntry } from 'react-icons/bi';

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
    showErrors = false,
    clearFilter,
    showClearButton = true,
    maxHeight = '150px'
}) {
    const [isFocused, setIsFocused] = useState(false);
    const [showPlaceholder, setShowPlaceholder] = useState(!label);
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef(null);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [defaultError, setDefaultError] = useState(required ? "Required" : "");
    const [filteredOptions, setFilteredOptions] = useState(options);
    const inputRef = useRef(null); 
    const selectingOption = useRef(false); // Flag for mouse-based selection

    // Sync internal searchTerm with external value prop changes
    useEffect(() => {
        // Prevent this effect from running if a selection is actively being made via click
        if (selectingOption.current) return; 

        let displayValue = '';
        let shouldHidePlaceholder = false;

        console.log('Dropdown received value:', value, 'type:', typeof value);

        if (value !== undefined && value !== null && value !== '') {
            let foundOption = null;
            // Priority 1: Match by value
            foundOption = options.find(opt => (typeof opt === 'string' ? opt : opt.value) === value);
            // Priority 2: Match by label (if not found by value)
            if (!foundOption) {
                foundOption = options.find(opt => typeof opt !== 'string' && opt.label === value);
            }

            if (foundOption) {
                displayValue = typeof foundOption === 'string' ? foundOption : foundOption.label;
                shouldHidePlaceholder = true;
            } else {
                // Value exists but doesn't match any known option value or label
                console.log('Value does not match any option:', value);
                displayValue = ''; // Clear search term 
                shouldHidePlaceholder = false;
            }
        } else {
            console.log('Empty or null value received:', value);
            displayValue = '';
            shouldHidePlaceholder = false;
        }
        
        console.log('Setting searchTerm to:', displayValue);
        setSearchTerm(displayValue);
        setShowPlaceholder(!label && !shouldHidePlaceholder);

    }, [value, options, label]);

    const handleFocus = () => {
        setIsFocused(true);
        if (label) setShowPlaceholder(false);
        // Restore error reset on focus
        if (error && onErrorReset) onErrorReset();
        setFilteredOptions(options);
    };

    const handleBlur = (e) => {
        // Use a minimal timeout to allow click events on options to potentially set the flag first
        setTimeout(() => {
            // If a mouse selection is in progress, let handleOptionSelect manage the state
            if (selectingOption.current) {
                // Reset flag here just in case handleOptionSelect didn't fire correctly (fallback)
                // selectingOption.current = false; 
                return; 
            }

            const relatedTarget = e.relatedTarget;
            // If focus moves completely outside the component
            if (!dropdownRef.current || !dropdownRef.current.contains(relatedTarget)) {
                setIsFocused(false);
                setIsOpen(false);
                setSelectedIndex(-1);

                // Reset search term based on the *committed* value prop using the same logic as useEffect
                let displayValue = '';
                let shouldHidePlaceholder = false;
                
                console.log('Dropdown blur with value:', value, 'type:', typeof value);
                
                if (value !== undefined && value !== null && value !== '') {
                    let foundOption = options.find(opt => (typeof opt === 'string' ? opt : opt.value) === value);
                    if (!foundOption) {
                        foundOption = options.find(opt => typeof opt !== 'string' && opt.label === value);
                    }
                    if (foundOption) {
                        displayValue = typeof foundOption === 'string' ? foundOption : foundOption.label;
                        shouldHidePlaceholder = true;
                    }
                }
                
                console.log('Setting searchTerm on blur to:', displayValue);
                setSearchTerm(displayValue);
                setShowPlaceholder(!label && !shouldHidePlaceholder);

                // Trigger error display check on blur if required and empty
                if (required && (value === undefined || value === null || value === '')) {
                  // Report required field is empty on blur
                  console.log('Required field is empty on blur:', required, value);
                }
            }
        }, 0); // 0ms timeout yields to the event loop
    };

    // Called when mouse button is pressed down *on an option*
    const handleOptionMouseDown = () => {
        selectingOption.current = true;
    };

    // Called when an option is clicked
    const handleOptionSelect = (option) => {
        if (!option) {
            console.log('handleOptionSelect called with no option');
            selectingOption.current = false; // Reset flag even on failure
            return;
        }
        
        const optionValue = typeof option === 'string' ? option : option.value || option.label;
        const optionLabel = typeof option === 'string' ? option : option.label;
        
        console.log('Option selected:', option, 'value:', optionValue, 'label:', optionLabel);
        
        // --- State Update Order --- 
        setSearchTerm(optionLabel); // 1. Set display text
        setIsOpen(false);           // 2. Close dropdown 
        setSelectedIndex(-1);       // 3. Reset keyboard index
        setIsFocused(false);        // 4. Update focus state
        setShowPlaceholder(false);  // 5. Hide placeholder
        
        onChange?.(optionValue);    // 6. Trigger parent update
        console.log('Triggered onChange with value:', optionValue);
        
        // 7. Reset the flag *synchronously* after potentially triggering parent updates
        selectingOption.current = false; 

        // 8. Manually blur the input to remove focus state visually
        inputRef.current?.blur(); 

        // 9. ALWAYS reset error state when a valid option is selected
        if (onErrorReset) {
            console.log('Calling onErrorReset after option select');
            onErrorReset();
        }
    };

    // Handles typing in the input field
    const handleInputChange = (e) => {
        const newValue = String(e.target.value);
        console.log('Input changed to:', newValue);
        setSearchTerm(newValue);
        setIsOpen(true); 

        const filtered = options.filter(option => {
            const label = typeof option === 'string' ? option : option.label;
            return label.toLowerCase().includes(newValue.toLowerCase());
        });
        setFilteredOptions(filtered);
        setSelectedIndex(-1); 
        setShowPlaceholder(!label);

        // If user clears input, clear parent value
        if (newValue === '' && value !== '') {
            console.log('Input cleared, calling onChange with empty string');
            onChange?.('');
        }
        // Always reset error when user types
        if (error && onErrorReset) {
            console.log('Calling onErrorReset on input change');
            onErrorReset();
        }
    };

    // Handles clicking the dropdown arrow
    const handleArrowClick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (!inputRef.current) return;

        if (isOpen) {
            setIsOpen(false);
        } else {
            setIsOpen(true);
            setIsFocused(true);
            inputRef.current.focus();
            setFilteredOptions(options);
            setShowPlaceholder(!label);
            // Always reset error when dropdown is opened via arrow
            if (error && onErrorReset) {
                onErrorReset();
            }
        }
    };
    
    // Handles clicking directly on the input field itself
    const handleInputClick = () => {
         if (!isOpen) {
            setIsOpen(true);
            setIsFocused(true); 
            setFilteredOptions(options);
            setShowPlaceholder(!label);
            // Always reset error when dropdown is opened via input click
            if (error && onErrorReset) {
                onErrorReset();
            }
         }
    };

    // Handles keyboard navigation and selection
    const handleKeyDown = (e) => {
        // Reset error on relevant key presses if user interacts
        if (['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key) || !e.key.startsWith('Arrow')) {
          if (error && onErrorReset) {
            onErrorReset();
          }
        }
        
        if (!isOpen) {
            if (e.key === 'ArrowDown' || e.key === 'Enter') {
                e.preventDefault();
                setIsOpen(true);
                setIsFocused(true); 
                setSelectedIndex(0); 
                setFilteredOptions(options); 
                return;
            }
            return; 
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (filteredOptions.length > 0) {
                    setSelectedIndex(prev => (prev + 1) % filteredOptions.length);
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                 if (filteredOptions.length > 0) {
                    setSelectedIndex(prev => (prev - 1 + filteredOptions.length) % filteredOptions.length);
                 }
                break;
            case 'Tab':
                if (selectedIndex >= 0 && selectedIndex < filteredOptions.length) {
                     e.preventDefault(); 
                     handleOptionSelect(filteredOptions[selectedIndex]);
                } else {
                    // Allow natural tab out, which triggers blur handler
                    setIsOpen(false);
                }
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && selectedIndex < filteredOptions.length) {
                    handleOptionSelect(filteredOptions[selectedIndex]);
                } else {
                    // If user presses Enter on their own input (not a selection)
                    // Check if the input matches an option label exactly
                    const exactMatch = options.find(opt => (typeof opt === 'string' ? opt : opt.label).toLowerCase() === searchTerm.toLowerCase());
                    if (exactMatch) {
                      handleOptionSelect(exactMatch);
                    } else {
                      // Close dropdown if Enter pressed with no match or keyboard selection
                      setIsOpen(false);
                    }
                }
                break;
            case 'Escape':
                e.preventDefault();
                setIsOpen(false);
                setIsFocused(false); 
                setSelectedIndex(-1);
                // Reset search term to committed value on Escape
                const selectedOption = options.find(opt => (typeof opt === 'string' ? opt : opt.value) === value || (typeof opt !== 'string' && opt.label === value));
                if (selectedOption) {
                    setSearchTerm(typeof selectedOption === 'string' ? selectedOption : selectedOption.label);
                    setShowPlaceholder(false);
                } else {
                    setSearchTerm('');
                    setShowPlaceholder(!label);
                }
                inputRef.current?.blur(); 
                break;
            default:
                // For other keys (typing), error reset is handled in handleInputChange
                break;
        }
    };

    // Handles clicks outside the dropdown component
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                if (isOpen) { 
                    setIsOpen(false);
                    setIsFocused(false); 
                    setSelectedIndex(-1);
                     // Reset search term based on committed value
                    const selectedOption = options.find(opt => (typeof opt === 'string' ? opt : opt.value) === value || (typeof opt !== 'string' && opt.label === value));
                    if (selectedOption) {
                        setSearchTerm(typeof selectedOption === 'string' ? selectedOption : selectedOption.label);
                        setShowPlaceholder(false);
                    } else {
                        setSearchTerm('');
                        setShowPlaceholder(!label);
                    }
                }
            }
        };
        document.addEventListener('mousedown' , handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            selectingOption.current = false; // Cleanup flag on unmount
        };
    }, [isOpen, value, options, label]); 

    // Determines if an option matching the current value is selected
    const isOptionSelected = () => {
        if (value === undefined || value === null || value === '') {
            console.log('No value selected:', value);
            return false;
        }
        if (!Array.isArray(options)) {
            console.log('Options is not an array');
            return false;
        }
        const hasMatch = options.some(option => {
             const optValue = typeof option === 'string' ? option : option.value;
             const optLabel = typeof option === 'string' ? option : option.label;
             return optValue === value || optLabel === value;
        });
        console.log('Option selected check:', hasMatch);
        return hasMatch;
    };

    // Handles browser autofill
    useEffect(() => {
        const input = inputRef.current;
        if (!input) return;
        const handleAnimationStart = (e) => {
            if (e.animationName.includes('webkit-autofill')) {
                setIsFocused(true); 
                setShowPlaceholder(false); 
                 // Reset error state in parent when autofill occurs
                 if (error && onErrorReset) {
                   onErrorReset();
                 }
                setTimeout(() => {
                     if (input.value !== value) onChange?.(input.value);
                }, 50);
            }
        };
        input.addEventListener('animationstart', handleAnimationStart);
        return () => input.removeEventListener('animationstart', handleAnimationStart);
    }, [label, value, onChange, error, onErrorReset]);

    useEffect(() => {
        // Update default error message if 'required' prop changes
        setDefaultError(required ? "Required" : "");
    }, [required]);

    // Variable determines if error message should be displayed based on props
    const shouldShowErrorMessage = error && showErrors;

    // Handles clicking the clear button
    const handleClear = (e) => {
        e.preventDefault();
        e.stopPropagation();

        console.log('Dropdown clear button clicked');
        
        // 1. Explicitly inform parent that value is cleared with empty string
        onChange?.('');
        console.log('Dropdown onChange called with empty string');

        // 2. Reset parent error state on clear
        if (error && onErrorReset) {
            console.log('Dropdown onErrorReset called');
            onErrorReset(); 
        }

        // 3. Reset local component state
        setSearchTerm('');
        setIsOpen(false);
        setIsFocused(false);
        setShowPlaceholder(!label);
        setFilteredOptions(options); // Reset options list
        
        // 4. Ensure input loses focus after clearing
        inputRef.current?.blur();
    };

    // Scrolls the highlighted option into view during keyboard navigation
    useEffect(() => {
        if (isOpen && selectedIndex >= 0) {
            const optionElement = dropdownRef.current?.querySelector(`#option-${selectedIndex}`);
            optionElement?.scrollIntoView?.({
                behavior: 'auto', // Use 'auto' for less disruptive scrolling
                block: 'nearest'
            });
        } 
    }, [selectedIndex, isOpen]);


    return (
        <div 
            className="boxed-inputfield-wrapper" 
            style={{ marginBottom, marginLeft, marginRight }}
            ref={dropdownRef}
        >
            <div 
                className={`boxed-inputfield-container ${error && showErrors ? 'boxed-inputfield-container--error' : ''} ${isOptionSelected() ? 'has-value' : ''} ${isFocused ? 'boxed-inputfield-focused' : ''}`}
            >
                {label && (
                    <label className={`boxed-inputfield-label ${(isFocused || searchTerm || isOptionSelected()) ? 'boxed-inputfield-label--focused' : ''}`}>
                        {label}{required ? '*' : ''}
                    </label>
                )}
                
                <input
                    ref={inputRef} 
                    className="boxed-inputfield-input"
                    type="text"
                    placeholder={(isFocused || isOptionSelected()) ? '' : (label ? '' : placeholder)} 
                    value={searchTerm}
                    onChange={handleInputChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur} 
                    onKeyDown={handleKeyDown}
                    onClick={handleInputClick} // Open dropdown on input click
                    role="combobox"
                    aria-expanded={isOpen}
                    aria-controls="dropdown-options"
                    aria-activedescendant={selectedIndex >= 0 ? `option-${selectedIndex}` : undefined}
                    aria-autocomplete="list" 
                    required={required}
                />
                
                {value && showClearButton && (
                    <button 
                        className="boxed-inputfield-clear" 
                        onClick={handleClear}
                        type="button"
                        aria-label="Clear input"
                        tabIndex={-1} 
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
                    role="button" 
                    aria-label={isOpen ? "Close dropdown" : "Open dropdown"} 
                    tabIndex={-1} 
                >
                    ▼
                </span>
            </div>
            
            <div 
                id="dropdown-options"
                className={`boxed-inputfield-options ${isOpen ? 'boxed-inputfield-options--visible' : ''}`}
                role="listbox"
                style={{ maxHeight: maxHeight}} 
            >
                {filteredOptions.map((option, index) => {
                    const optionValue = typeof option === 'string' ? option : option.value;
                    const optionLabel = typeof option === 'string' ? option : option.label;
                    // Refined selection logic: Check value first, then label
                    const isSelected = (optionValue !== undefined && optionValue === value) || 
                                       (optionLabel !== undefined && optionLabel === value && !options.some(o => (typeof o === 'string' ? o : o.value) === value)); // Select by label only if value doesn't match any option's value
                    const isHighlighted = index === selectedIndex;
                    
                    return (
                        <div
                            key={optionValue || optionLabel || index} // More stable key
                            id={`option-${index}`}
                            className={`boxed-inputfield-option ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''}`}
                            onClick={() => handleOptionSelect(option)} // Click triggers selection
                            onMouseDown={handleOptionMouseDown} // Mouse down flags selection start
                            role="option"
                            aria-selected={isSelected}
                        >
                            {optionLabel}
                        </div>
                    );
                })}
                {filteredOptions.length === 0 && searchTerm && (
                     <div className="boxed-inputfield-option no-results">
                         No results found
                     </div>
                )}
            </div>
            
            {shouldShowErrorMessage && ( 
                <div className={`boxed-inputfield-error-message ${shouldShowErrorMessage ? 'boxed-inputfield-error-message--visible' : ''}`}>
                    {error || defaultError} 
                </div>
            )}
        </div>
    );
}

export default DropdownField;
