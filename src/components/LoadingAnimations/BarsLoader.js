import React from 'react';
import styles from './LoadingAnimations.module.css';

const BarsLoader = ({ size = 'medium', color = 'primary' }) => {
  const sizeClass = size === 'small' ? styles['bars-small'] : size === 'large' ? styles['bars-large'] : styles['bars-medium'];
  const colorClass = color === 'secondary' ? styles['bars-secondary'] : styles['bars-primary'];
  
  return (
    <div className={`${styles.barsContainer} ${sizeClass} ${colorClass}`}>
      <div className={styles.bar}></div>
      <div className={styles.bar}></div>
      <div className={styles.bar}></div>
      <div className={styles.bar}></div>
    </div>
  );
};

export default BarsLoader;

