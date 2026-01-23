import { useCallback } from 'react';
import { saveTutorialStep, saveTutorialAccessMode } from '../utils/tutorialStorage';
import { getProfileCollection } from '../utils/tutorialHelpers';
import { TUTORIAL_IDS, getTutorialSteps } from '../../../../config/tutorialSystem';

const tutorialSteps = {};
Object.keys(TUTORIAL_IDS).forEach(key => {
    const id = TUTORIAL_IDS[key];
    tutorialSteps[id] = getTutorialSteps(id);
});

/**
 * Tutorial action hooks
 * Contains all tutorial-related actions (start, complete, next, prev, etc.)
 */
export const useTutorialActions = ({
    currentUser,
    onboardingType,
    isBusy,
    setIsBusy,
    completedTutorials,
    setCompletedTutorials,
    activeTutorial,
    setActiveTutorial,
    currentStep,
    setCurrentStep,
    setIsTutorialActive,
    setShowFirstTimeModal,
    setTutorialComplete,
    safelyUpdateTutorialState,
    lastRestoredStateRef,
    startTutorialRef,
    completingTutorialRef,
    setIsPaused,
    showError
}) => {

    const saveTutorialProgressAction = useCallback(async (tutorialName, stepIndex) => {
        if (!currentUser) return;
        const profileCollection = getProfileCollection(onboardingType);
        await saveTutorialStep(profileCollection, currentUser.uid, stepIndex);
    }, [currentUser, onboardingType]);

    /**
     * Start tutorial for a specific feature
     */
    const startTutorial = useCallback(async (feature) => {
        // Clear restoration ref to allow fresh start
        lastRestoredStateRef.current = { tutorial: null, step: null };

        if (isBusy) {
            return;
        }

        setIsBusy(true);

        // Clear from completed list if restarting
        if (completedTutorials[feature]) {
            setCompletedTutorials(prev => {
                const updated = { ...prev };
                delete updated[feature];
                return updated;
            });

            // Also clear from Firestore
            if (currentUser) {
                try {
                    const profileCollection = getProfileCollection(onboardingType);
                    const profileDocRef = doc(db, profileCollection, currentUser.uid);
                    await updateDoc(profileDocRef, {
                        [`completedTutorials.${feature}`]: null
                    });
                } catch (error) {
                    // Error clearing completed tutorial status
                }
            }
        }

        // Load saved progress
        let startStep = 0;
        if (currentUser) {
            try {
                const profileCollection = getProfileCollection(onboardingType);
                const profileDocRef = doc(db, profileCollection, currentUser.uid);
                const profileDoc = await getDoc(profileDocRef);

                if (profileDoc.exists()) {
                    const profileData = profileDoc.data();
                    const typeProgress = profileData.tutorialProgress?.[onboardingType] || {};

                    if (typeProgress.activeTutorial === feature) {
                        const savedStepIndex = typeProgress.currentStepIndex || 0;
                        const isCompleted = typeProgress.tutorials?.[feature]?.completed;

                        if ((feature === TUTORIAL_IDS.PROFILE_TABS || feature === TUTORIAL_IDS.FACILITY_PROFILE_TABS) && !isCompleted && typeProgress.currentStepIndex === undefined) {
                            startStep = 0;
                        } else {
                            startStep = savedStepIndex;
                        }
                    }
                }
            } catch (error) {
                // Error loading tutorial progress
            }
        }

        // Start the tutorial
        safelyUpdateTutorialState([
            [setActiveTutorial, feature],
            [setCurrentStep, startStep],
            [setIsTutorialActive, true],
            [setShowFirstTimeModal, false]
        ], async () => {
            await saveTutorialProgressAction(feature, startStep);
        });
        setIsBusy(false);
    }, [
        isBusy, currentUser, onboardingType, completedTutorials,
        safelyUpdateTutorialState, saveTutorialProgressAction,
        lastRestoredStateRef, setIsBusy, setCompletedTutorials,
        setActiveTutorial, setCurrentStep, setIsTutorialActive, setShowFirstTimeModal
    ]);

    /**
     * Complete current tutorial
     */
    const completeTutorial = useCallback(async () => {
        if (isBusy) {
            return;
        }

        const previousTutorial = activeTutorial;
        lastRestoredStateRef.current = { tutorial: null, step: null };
        completingTutorialRef.current = previousTutorial;

        try {
            await safelyUpdateTutorialState([
                [setIsTutorialActive, false],
                [setActiveTutorial, TUTORIAL_IDS.DASHBOARD]
            ], async () => {
                if (currentUser) {
                    try {
                        const profileCollection = getProfileCollection(onboardingType);
                        const profileDocRef = doc(db, profileCollection, currentUser.uid);

                        const progressPath = `tutorialProgress.${onboardingType}.tutorials.${previousTutorial}`;

                        await updateDoc(profileDocRef, {
                            [`${progressPath}.completed`]: true,
                            [`tutorialProgress.${onboardingType}.activeTutorial`]: null,
                            updatedAt: serverTimestamp()
                        });

                        setCompletedTutorials(prev => ({
                            ...prev,
                            [previousTutorial]: true
                        }));

                        // If finishing profile tabs, mark as tutorialPassed
                        if (previousTutorial === TUTORIAL_IDS.PROFILE_TABS || previousTutorial === TUTORIAL_IDS.FACILITY_PROFILE_TABS) {
                            await setTutorialComplete(true);
                        }

                        // Chain next tutorial
                        const { getMandatoryTutorials } = require('../../../../config/tutorialSystem');
                        const mandatoryTutorials = getMandatoryTutorials(onboardingType);
                        const currentIndex = mandatoryTutorials.indexOf(previousTutorial);

                        if (currentIndex !== -1 && currentIndex < mandatoryTutorials.length - 1) {
                            const nextFeature = mandatoryTutorials[currentIndex + 1];
                            setTimeout(() => {
                                if (startTutorialRef.current) {
                                    startTutorialRef.current(nextFeature);
                                }
                            }, 500);
                        } else {
                            // Check if all tutorials are done
                            const profileDoc = await getDoc(profileDocRef);
                            if (profileDoc.exists()) {
                                const typeData = profileDoc.data().tutorialProgress?.[onboardingType] || {};
                                const tutorials = typeData.tutorials || {};
                                const allDone = mandatoryTutorials.every(f => tutorials[f]?.completed);

                                if (allDone) {
                                    await updateDoc(profileDocRef, {
                                        [`tutorialProgress.${onboardingType}.completed`]: true
                                    });
                                }
                            }
                        }
                    } catch (error) {
                        // Error updating tutorial completion status
                    }
                }
            });
        } finally {
            setTimeout(() => {
                completingTutorialRef.current = null;
            }, 1000);
        }
    }, [
        activeTutorial, isBusy, currentUser, onboardingType,
        safelyUpdateTutorialState, setTutorialComplete,
        lastRestoredStateRef, completingTutorialRef, startTutorialRef,
        setCompletedTutorials, setIsTutorialActive, setActiveTutorial
    ]);

    /**
     * Move to next step
     */
    const nextStep = useCallback(() => {
        if (isBusy) {
            return;
        }

        const totalSteps = tutorialSteps[activeTutorial]?.length || 0;

        if (currentStep < totalSteps - 1) {
            lastRestoredStateRef.current = { tutorial: null, step: null };
            const newStep = currentStep + 1;

            safelyUpdateTutorialState([
                [setCurrentStep, newStep]
            ], async () => {
                await saveTutorialProgressAction(activeTutorial, newStep);
            });
        } else {
            completeTutorial();
        }
    }, [
        isBusy, activeTutorial, currentStep,
        safelyUpdateTutorialState, saveTutorialProgressAction,
        completeTutorial, lastRestoredStateRef, setCurrentStep
    ]);

    /**
     * Move to previous step
     */
    const prevStep = useCallback(() => {
        if (isBusy) {
            return;
        }

        if (currentStep > 0) {
            lastRestoredStateRef.current = { tutorial: null, step: null };
            const newStep = currentStep - 1;

            safelyUpdateTutorialState([
                [setCurrentStep, newStep]
            ], async () => {
                await saveTutorialProgressAction(activeTutorial, newStep);
            });
        }
    }, [
        isBusy, currentStep, activeTutorial,
        safelyUpdateTutorialState, saveTutorialProgressAction,
        lastRestoredStateRef, setCurrentStep
    ]);

    /**
     * Skip entire tutorial
     */
    const skipTutorial = useCallback(() => {
        if (isBusy) {
            return;
        }

        // MANDATORY: Can only skip once profile tutorial is complete
        const isProfileTutorialComplete = completedTutorials?.profileTabs === true || completedTutorials?.facilityProfileTabs === true;
        if (!isProfileTutorialComplete) {
            showError?.("Please complete your profile configuration before skipping the tutorial.");
            return;
        }

        safelyUpdateTutorialState([
            [setIsTutorialActive, false],
            [setShowFirstTimeModal, false]
        ], async () => {
            if (currentUser) {
                try {
                    const profileCollection = getProfileCollection(onboardingType);
                    const profileDocRef = doc(db, profileCollection, currentUser.uid);

                    await setTutorialComplete(true);

                    await updateDoc(profileDocRef, {
                        [`tutorialProgress.${onboardingType}.completed`]: true,
                        [`tutorialProgress.${onboardingType}.activeTutorial`]: null,
                        tutorialPassed: true,
                        updatedAt: serverTimestamp()
                    });
                } catch (error) {
                    // Error updating tutorial status
                }
            }
        });
    }, [
        isBusy, currentUser, onboardingType, completedTutorials,
        safelyUpdateTutorialState, setTutorialComplete, showError,
        setIsTutorialActive, setShowFirstTimeModal
    ]);

    /**
     * Pause tutorial
     */
    const pauseTutorial = useCallback(() => {
        setIsPaused(true);
    }, [setIsPaused]);

    /**
     * Resume tutorial
     */
    const resumeTutorial = useCallback(() => {
        if (isBusy) {
            return;
        }

        safelyUpdateTutorialState([
            [setIsPaused, false]
        ], async () => {
            if (currentUser) {
                try {
                    const profileCollection = getProfileCollection(onboardingType);
                    const profileDocRef = doc(db, profileCollection, currentUser.uid);
                    const profileDoc = await getDoc(profileDocRef);

                    if (profileDoc.exists()) {
                        const profileData = profileDoc.data();
                        const onboardingCompleted = profileData.profileCompleted || (profileData.onboardingProgress && profileData.onboardingProgress.completed);

                        if (onboardingCompleted) {
                            setTimeout(() => {
                                if (startTutorialRef.current) {
                                    startTutorialRef.current(activeTutorial || 'dashboard');
                                }
                            }, 100);
                        }
                    }
                } catch (error) {
                    // Error resuming tutorial
                }
            }
        });
    }, [
        isBusy, currentUser, onboardingType, activeTutorial,
        safelyUpdateTutorialState, startTutorialRef, setIsPaused
    ]);

    return {
        startTutorial,
        completeTutorial,
        nextStep,
        prevStep,
        skipTutorial,
        pauseTutorial,
        resumeTutorial,
        saveTutorialProgress: saveTutorialProgressAction
    };
};
