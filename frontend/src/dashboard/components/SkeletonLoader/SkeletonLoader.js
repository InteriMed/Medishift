import React from 'react';
import styles from './skeletonLoader.module.css';

export const ListingCardSkeleton = () => (
  <div className={styles.skeletonCard}>
    <div className={styles.skeletonImage}></div>
    <div className={styles.skeletonContent}>
      <div className={styles.skeletonTitle}></div>
      <div className={styles.skeletonText}></div>
      <div className={styles.skeletonText}></div>
      <div className={styles.skeletonTags}>
        <div className={styles.skeletonTag}></div>
        <div className={styles.skeletonTag}></div>
      </div>
    </div>
  </div>
);

export const DetailedCardSkeleton = () => (
  <div className={styles.skeletonDetailed}>
    <div className={styles.skeletonHeader}>
      <div className={styles.skeletonTitle}></div>
    </div>
    <div className={styles.skeletonBody}>
      <div className={styles.skeletonMainInfo}>
        <div className={styles.skeletonImage}></div>
        <div className={styles.skeletonInfo}>
          <div className={styles.skeletonText}></div>
          <div className={styles.skeletonText}></div>
          <div className={styles.skeletonText}></div>
        </div>
      </div>
      <div className={styles.skeletonSection}></div>
      <div className={styles.skeletonSection}></div>
    </div>
    <div className={styles.skeletonFooter}>
      <div className={styles.skeletonButton}></div>
      <div className={styles.skeletonButton}></div>
    </div>
  </div>
); 