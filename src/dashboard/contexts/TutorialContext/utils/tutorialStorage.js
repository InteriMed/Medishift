import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../services/firebase';

/**
 * Save tutorial progress to Firestore (profile collection)
 */
export const saveTutorialProgress = async (currentUser, onboardingType, tutorialName, stepIndex, tutorialSteps) => {
    if (!currentUser) return;

    try {
        // Use profile collection instead of users
        const profileCollection = onboardingType === 'facility' ? 'facilityProfiles' : 'professionalProfiles';
        const profileDocRef = doc(db, profileCollection, currentUser.uid);

        const steps = tutorialSteps[tutorialName] || [];
        const currentStepId = steps[stepIndex]?.id;

        if (!currentStepId) return;

        const progressPath = `tutorialProgress.${onboardingType}.tutorials.${tutorialName}`;

        const updates = {
            [`tutorialProgress.${onboardingType}.activeTutorial`]: tutorialName,
            [`tutorialProgress.${onboardingType}.currentStepIndex`]: stepIndex,
            [`${progressPath}.steps.${currentStepId}.completed`]: true,
            [`${progressPath}.lastActiveStepId`]: currentStepId,
            [`${progressPath}.updatedAt`]: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        await updateDoc(profileDocRef, updates);
        console.log(`[TutorialStorage] Saved progress for ${tutorialName}:${currentStepId} in ${profileCollection}`);
    } catch (error) {
        console.error('Error saving tutorial progress:', error);
    }
};

/**
 * Local storage helpers for tutorial state
 */
const STORAGE_KEY = 'tutorialState';

export const saveLocalState = (state) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
        console.error('[TutorialStorage] Error saving local state:', error);
    }
};

export const loadLocalState = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : null;
    } catch (error) {
        console.error('[TutorialStorage] Error loading local state:', error);
        return null;
    }
};

export const clearLocalState = () => {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.error('[TutorialStorage] Error clearing local state:', error);
    }
};
