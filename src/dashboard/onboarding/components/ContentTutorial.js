import React from 'react';
import { useTutorial } from '../../contexts/TutorialContext';
import styles from '../Tutorial.module.css';

/**
 * ContentTutorial Component
 * Renders an overlay that highlights content area elements during the tutorial
 */
const ContentTutorial = () => {
  const { 
    currentStep, 
    stepData, 
    nextStep, 
    prevStep, 
    skipTutorial, 
    navigateToFeature,
    elementPosition
  } = useTutorial();
  
  // Only render if the current step targets the content area
  if (!stepData || stepData.targetArea !== 'content') return null;
  
  return (
    <div className={styles.contentOverlay}>
      {/* Highlight box positioned around the target element (if any) */}
      {elementPosition && (
        <div 
          className={styles.highlightBox}
          style={{
            top: `${elementPosition.top}px`,
            left: `${elementPosition.left}px`,
            width: `${elementPosition.width}px`,
            height: `${elementPosition.height}px`
          }}
        />
      )}
      
      {/* Tooltip positioned either relative to target element or at a fixed position */}
      <div 
        className={styles.tutorialTooltip}
        style={stepData.tooltipPosition}
      >
        <h3 className={styles.tooltipTitle}>{stepData.title}</h3>
        <p className={styles.tooltipContent}>{stepData.content}</p>
        
        {/* Action button (Show me) if available */}
        {stepData.actionButton && (
          <button 
            onClick={navigateToFeature} 
            className={styles.actionButton}
          >
            {stepData.actionButton.text}
          </button>
        )}
        
        {/* Navigation buttons */}
        <div className={styles.actionButtons}>
          {currentStep > 0 && (
            <button 
              onClick={prevStep} 
              className={styles.prevButton}
            >
              Previous
            </button>
          )}
          <button 
            onClick={skipTutorial} 
            className={styles.skipButton}
          >
            Skip Tutorial
          </button>
          <button 
            onClick={nextStep} 
            className={styles.nextButton}
          >
            {currentStep === (stepData.isLastStep ? true : false) ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContentTutorial; 