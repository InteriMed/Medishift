import React from 'react';
import styles from './LoadingAnimations.module.css';

const RippleLoader = ({ size = 'medium', color = 'primary' }) => {
  const sizeClass = size === 'small' ? styles['ripple-small'] : size === 'large' ? styles['ripple-large'] : styles['ripple-medium'];
  const colorClass = color === 'secondary' ? styles['ripple-secondary'] : styles['ripple-primary'];
  
  return (
    <div className={`${styles.rippleContainer} ${sizeClass} ${colorClass}`}>
      <div className={styles.ripple}></div>
      <div className={styles.ripple}></div>
      <div className={styles.ripple}></div>
    </div>
  );
};

export default RippleLoader;

