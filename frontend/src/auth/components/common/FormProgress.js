import React from 'react';
import styles from './FormProgress.module.css';

const FormProgress = ({ currentStep, totalSteps, stepLabels = [] }) => {
  return (
    <div className={styles.progressContainer}>
      <div className={styles.progressBar}>
        <div 
          className={styles.progressFill} 
          style={{ width: `${(currentStep / (totalSteps - 1)) * 100}%` }}
        ></div>
      </div>
      
      <div className={styles.steps}>
        {Array.from({ length: totalSteps }, (_, i) => (
          <div 
            key={i} 
            className={`${styles.step} ${i <= currentStep ? styles.active : ''}`}
          >
            {stepLabels[i] ? (
              <span className={styles.stepLabel}>{stepLabels[i]}</span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FormProgress; 