import React from 'react';
import { useTutorial } from '../../contexts/TutorialContext';
import styles from '../Tutorial.module.css';

/**
 * SidebarTutorial Component
 * Renders an overlay that highlights sidebar items during the tutorial
 */
const SidebarTutorial = () => {
  const { 
    currentStep, 
    stepData, 
    nextStep, 
    prevStep, 
    skipTutorial, 
    navigateToFeature,
    elementPosition
  } = useTutorial();
  
  // Only render if the current step targets the sidebar
  if (!stepData || stepData.targetArea !== 'sidebar' || !elementPosition) return null;
  
  return (
    <div className={styles.sidebarOverlay}>
      {/* Highlight box positioned around the target element */}
      <div 
        className={styles.highlightBox}
        style={{
          top: `${elementPosition.top}px`,
          left: `${elementPosition.left}px`,
          width: `${elementPosition.width}px`,
          height: `${elementPosition.height}px`
        }}
      />
      
      {/* Tooltip positioned relative to the target element */}
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

export default SidebarTutorial; 