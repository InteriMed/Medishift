import React from 'react';
import styles from './LoadingAnimations.module.css';

const SpinningRingLoader = ({ size = 'medium', color = 'primary' }) => {
  const sizeClass = size === 'small' ? styles['ring-small'] : size === 'large' ? styles['ring-large'] : styles['ring-medium'];
  const colorClass = color === 'secondary' ? styles['ring-secondary'] : styles['ring-primary'];
  
  return (
    <div className={`${styles.ringContainer} ${sizeClass} ${colorClass}`}>
      <div className={styles.ring}></div>
      <div className={styles.ring}></div>
      <div className={styles.ring}></div>
    </div>
  );
};

export default SpinningRingLoader;

