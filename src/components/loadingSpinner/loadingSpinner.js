import React from 'react';
import PropTypes from 'prop-types';
import './loadingSpinner.css';

const LoadingSpinner = ({ size = 'small', color = 'primary', fullScreen = true }) => {
  const sizeClass = size === 'large' ? 'loading-spinner--large' : 
                    size === 'small' ? 'loading-spinner--small' : '';
  const colorClass = color === 'secondary' ? 'loading-spinner--secondary' : 
                     color === 'primary' ? 'loading-spinner--primary' : '';

  const spinnerClasses = `loading-spinner ${sizeClass} ${colorClass}`.trim();

  const spinner = (
    <div className={spinnerClasses}>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="loading-spinner-container">
        {spinner}
      </div>
    );
  }

  return spinner;
};

LoadingSpinner.propTypes = {
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  color: PropTypes.oneOf(['primary', 'secondary']),
  fullScreen: PropTypes.bool
};

export default LoadingSpinner;
