import React from 'react';
import './loadingSpinner.css';

const LoadingSpinner = ({ size = 'small', color = 'primary' }) => {
  const sizeClass = size === 'small' ? 'loading-spinner--small' : 
                    size === 'large' ? 'loading-spinner--large' : '';
  const colorClass = color === 'primary' ? 'loading-spinner--primary' : 
                     color === 'secondary' ? 'loading-spinner--secondary' : 'loading-spinner--primary';

  return (
    <div className="loading-spinner-container">
      <div className={`loading-spinner ${sizeClass} ${colorClass}`}>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
    </div>
  );
};

export default LoadingSpinner; 