import React from 'react';
import styles from './LoadingAnimations.module.css';

const WaveLoader = ({ size = 'medium', color = 'primary' }) => {
  const sizeClass = size === 'small' ? styles['wave-small'] : size === 'large' ? styles['wave-large'] : styles['wave-medium'];
  const colorClass = color === 'secondary' ? styles['wave-secondary'] : styles['wave-primary'];
  
  return (
    <div className={`${styles.waveContainer} ${sizeClass} ${colorClass}`}>
      <div className={styles.waveBar}></div>
      <div className={styles.waveBar}></div>
      <div className={styles.waveBar}></div>
      <div className={styles.waveBar}></div>
      <div className={styles.waveBar}></div>
    </div>
  );
};

export default WaveLoader;

