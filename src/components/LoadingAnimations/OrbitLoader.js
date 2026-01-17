import React from 'react';
import styles from './LoadingAnimations.module.css';

const OrbitLoader = ({ size = 'medium', color = 'primary' }) => {
  const sizeClass = size === 'small' ? styles['orbit-small'] : size === 'large' ? styles['orbit-large'] : styles['orbit-medium'];
  const colorClass = color === 'secondary' ? styles['orbit-secondary'] : styles['orbit-primary'];
  
  return (
    <div className={`${styles.orbitContainer} ${sizeClass} ${colorClass}`}>
      <div className={styles.orbitCenter}></div>
      <div className={styles.orbitDot}></div>
      <div className={styles.orbitDot}></div>
      <div className={styles.orbitDot}></div>
    </div>
  );
};

export default OrbitLoader;

