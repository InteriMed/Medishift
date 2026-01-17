import React from 'react';
import styles from './LoadingAnimations.module.css';

const PulseDotLoader = ({ size = 'medium', color = 'primary' }) => {
  const sizeClass = size === 'small' ? styles['pulseDot-small'] : size === 'large' ? styles['pulseDot-large'] : styles['pulseDot-medium'];
  const colorClass = color === 'secondary' ? styles['pulseDot-secondary'] : styles['pulseDot-primary'];
  
  return (
    <div className={`${styles.pulseDotContainer} ${sizeClass} ${colorClass}`}>
      <div className={styles.pulseDot}></div>
      <div className={styles.pulseDot}></div>
      <div className={styles.pulseDot}></div>
    </div>
  );
};

export default PulseDotLoader;

