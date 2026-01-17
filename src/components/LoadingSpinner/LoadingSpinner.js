import React from 'react';
import BarsLoader from '../LoadingAnimations/BarsLoader';
import './LoadingSpinner.css';

const LoadingSpinner = ({ size = 'small', color = 'primary' }) => {
  return (
    <div className="loading-spinner-container">
      <BarsLoader size={size} color={color} />
    </div>
  );
};

export default LoadingSpinner; 