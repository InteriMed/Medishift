import React from 'react';
import './styles/LoadingSpinner.css';

const LoadingSpinner = ({ size = 'medium', color = 'primary' }) => {
  const spinnerClassName = `spinner loading-spinner--${size} loading-spinner--${color}`;
  
  return (
    <div className={spinnerClassName}>
      <div className="circle"></div>
      <div className="loading-spinner__inner"></div>
      <div className="loading-spinner__inner"></div>
      <div className="loading-spinner__inner"></div>
    </div>
  );
};

export default LoadingSpinner; 