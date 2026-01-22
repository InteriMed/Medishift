// Re-export everything from the original TutorialContext for backward compatibility
// This allows existing imports to continue working without changes

export { TutorialProvider, useTutorial } from './TutorialProvider';
export { tutorialSteps } from './config/tutorialSteps';
export { TUTORIAL_MODES, ACCESS_MODES, ONBOARDING_TYPES, TUTORIAL_FEATURES } from './constants';

// Also export individual hooks for advanced use cases
export { useTutorialState } from './hooks/useTutorialState';
export { useTutorialActions } from './hooks/useTutorialActions';
export { useTutorialNavigation } from './hooks/useTutorialNavigation';
export { useTutorialLifecycle } from './hooks/useTutorialLifecycle';
export { useTutorialRules } from './hooks/useTutorialRules';
