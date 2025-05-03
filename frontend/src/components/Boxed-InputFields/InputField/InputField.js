import React, { useState } from 'react';

const InputField = ({
    label,
    name,
    type = 'text',
    value,
    onChange,
    onBlur,
    error,
    placeholder,
    disabled = false,
    required = false,
    className = '',
    labelClassName = '',
    inputClassName = '',
    errorClassName = '',
    clearFilter,
    isFocused,
    setIsFocused,
    ...props
}) => {
    const [showPlaceholder, setShowPlaceholder] = useState(!label);

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

    return (
        <div className={`relative ${className}`}>
            {label && (
                <label
                    htmlFor={name}
                    className={`block text-sm font-medium text-gray-700 mb-1 ${labelClassName}`}
                >
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <div className="relative">
                <input
                    id={name}
                    name={name}
                    type={type}
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    placeholder={showPlaceholder ? placeholder : ''}
                    disabled={disabled}
                    required={required}
                    className={`
                        w-full px-3 py-2 border rounded-md
                        ${error ? 'border-red-500' : 'border-gray-300'}
                        ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                        ${inputClassName}
                    `}
                    {...props}
                />
                {value && !disabled && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                )}
            </div>
            {error && (
                <p className={`mt-1 text-sm text-red-500 ${errorClassName}`}>
                    {error}
                </p>
            )}
        </div>
    );
};

export default InputField; 