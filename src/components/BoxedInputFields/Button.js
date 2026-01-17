import React from 'react';
import './styles/Button.css';

const Button = ({ children, onClick, type = 'button', variant = 'primary', disabled = false, className = '', ...props }) => {
  // Map variants to the correct CSS classes
  const variantClass = variant === 'confirmation' ? 'confirmation' : variant;

  // Add healthcare theme support
  const isHealthcareTheme = className.includes('actionButton') ||
    className.includes('closeButton') ||
    className.includes('mobileBackButton') ||
    className.includes('mobilePdfButton') ||
    className.includes('addButton') ||
    className.includes('removeButton') ||
    className.includes('clear-');

  return (
    <button
      className={`button ${variantClass} ${className} ${isHealthcareTheme ? 'healthcare-theme' : ''}`}
      onClick={onClick}
      type={type}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
