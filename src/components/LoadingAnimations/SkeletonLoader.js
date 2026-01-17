import React from 'react';
import styles from './LoadingAnimations.module.css';

const SkeletonLoader = ({ size = 'medium', color = 'primary' }) => {
  const sizeClass = size === 'small' ? styles['skeleton-small'] : size === 'large' ? styles['skeleton-large'] : styles['skeleton-medium'];
  const colorClass = color === 'secondary' ? styles['skeleton-secondary'] : styles['skeleton-primary'];
  
  return (
    <div className={`${styles.skeletonContainer} ${sizeClass} ${colorClass}`}>
      <div className={styles.skeletonLine}></div>
      <div className={styles.skeletonLine}></div>
      <div className={styles.skeletonLine}></div>
    </div>
  );
};

export default SkeletonLoader;

