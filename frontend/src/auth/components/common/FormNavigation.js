import React from 'react';
import styles from './FormNavigation.module.css';

const FormNavigation = ({ 
  onBack, 
  onNext, 
  backLabel = 'Back', 
  nextLabel = 'Next', 
  isFirstStep = false,
  isLastStep = false,
  isSubmitting = false,
  canProceed = true 
}) => {
  return (
    <div className={styles.navigation}>
      {!isFirstStep && (
        <button 
          type="button" 
          onClick={onBack} 
          className={styles.backButton}
          disabled={isSubmitting}
        >
          {backLabel}
        </button>
      )}
      
      <button 
        type={isLastStep ? "submit" : "button"} 
        onClick={isLastStep ? undefined : onNext} 
        className={styles.nextButton}
        disabled={!canProceed || isSubmitting}
      >
        {isSubmitting ? 'Processing...' : (isLastStep ? 'Submit' : nextLabel)}
      </button>
    </div>
  );
};

export default FormNavigation; 