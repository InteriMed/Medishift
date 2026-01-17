import React from 'react';
import styles from './LoadingAnimations.module.css';

const SpinnerLoader = ({ size = 'medium', color = 'primary' }) => {
  const sizeClass = size === 'small' ? styles['spinner-small'] : size === 'large' ? styles['spinner-large'] : styles['spinner-medium'];
  const colorClass = color === 'secondary' ? styles['spinner-secondary'] : styles['spinner-primary'];
  
  return (
    <div className={`${styles.spinnerContainer} ${sizeClass} ${colorClass}`}>
      <div className={styles.spinner}></div>
    </div>
  );
};

export default SpinnerLoader;

