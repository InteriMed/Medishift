import React, { createContext, useContext, useState, useCallback } from 'react';

const TutorialContext = createContext();

export const TutorialProvider = ({ children }) => {
  const [showTutorial, setShowTutorial] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [tutorialType, setTutorialType] = useState(null);

  const startTutorial = useCallback((type) => {
    setTutorialType(type);
    setCurrentStep(0);
    setShowTutorial(true);
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => prev + 1);
  }, []);

  const previousStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  const endTutorial = useCallback(() => {
    setShowTutorial(false);
    setCurrentStep(0);
    setTutorialType(null);
  }, []);

  const value = {
    showTutorial,
    currentStep,
    tutorialType,
    startTutorial,
    nextStep,
    previousStep,
    endTutorial
  };

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
};

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within TutorialProvider');
  }
  return context;
};

export default TutorialContext;

