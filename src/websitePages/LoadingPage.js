import React from 'react';
import LoadingSpinner from '../components/LoadingSpinner/LoadingSpinner';

const LoadingPage = () => {
  return (
    <div className="loading-page">
      <LoadingSpinner size="large" color="primary" />
    </div>
  );
};

export default LoadingPage; 