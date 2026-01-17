import React from 'react';
import styles from './LoadingAnimations.module.css';

const ProgressLoader = ({ size = 'medium', color = 'primary' }) => {
  const sizeClass = size === 'small' ? styles['progress-small'] : size === 'large' ? styles['progress-large'] : styles['progress-medium'];
  const colorClass = color === 'secondary' ? styles['progress-secondary'] : styles['progress-primary'];
  
  return (
    <div className={`${styles.progressContainer} ${sizeClass} ${colorClass}`}>
      <div className={styles.progressBar}></div>
    </div>
  );
};

export default ProgressLoader;

