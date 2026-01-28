import React from 'react';
import LoadingSpinner from '../components/loadingSpinner/loadingSpinner';

const LoadingPage = () => {
  return (
    <div className="loading-page">
      <LoadingSpinner size="large" color="primary" />
    </div>
  );
};

export default LoadingPage; 