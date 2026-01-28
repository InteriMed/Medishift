import React from 'react';
import './styles/button.css';

const Button = ({ children, onClick, type = 'button', variant = 'primary', disabled = false, className = '', ...props }) => {
  return (
    <button
      className={`ms-btn ms-btn-${variant} ${className}`}
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
