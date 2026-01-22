import { useCallback } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import { saveTutorialProgress } from '../utils/tutorialStorage';
import { getProfileCollection } from '../utils/tutorialHelpers';
import { tutorialSteps } from '../config/tutorialSteps';

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

    /**
     * Save tutorial progress to Firestore
     */
    const saveTutorialProgressAction = useCallback(async (tutorialName, stepIndex) => {
        await saveTutorialProgress(currentUser, onboardingType, tutorialName, stepIndex, tutorialSteps);
    }, [currentUser, onboardingType]);

    /**
     * Start tutorial for a specific feature
     */
    const startTutorial = useCallback(async (feature) => {
        // Clear restoration ref to allow fresh start
        lastRestoredStateRef.current = { tutorial: null, step: null };

        if (isBusy) {
            console.log('[useTutorialActions] Tutorial is busy, ignoring start request');
            return;
        }

        setIsBusy(true);
        console.log('[useTutorialActions] Starting tutorial for:', feature);

        // Clear from completed list if restarting
        if (completedTutorials[feature]) {
            console.log(`[useTutorialActions] Clearing completed status for ${feature} to allow restart`);
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
                    console.error('Error clearing completed tutorial status:', error);
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

                        if (feature === 'profileTabs' && !isCompleted && typeProgress.currentStepIndex === undefined) {
                            startStep = 0;
                            console.log('[useTutorialActions] Starting fresh profileTabs tutorial at step 0');
                        } else {
                            startStep = savedStepIndex;
                            console.log(`[useTutorialActions] Resuming ${feature} at step ${startStep}`);
                        }
                    }
                }
            } catch (error) {
                console.error('Error loading tutorial progress:', error);
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
        console.log("[useTutorialActions] Completing tutorial:", activeTutorial);

        if (isBusy) {
            console.log("[useTutorialActions] Cannot complete tutorial: system busy");
            return;
        }

        const previousTutorial = activeTutorial;
        lastRestoredStateRef.current = { tutorial: null, step: null };
        completingTutorialRef.current = previousTutorial;
        console.log("[useTutorialActions] Set completingTutorialRef to:", previousTutorial);

        try {
            await safelyUpdateTutorialState([
                [setIsTutorialActive, false],
                [setActiveTutorial, 'dashboard']
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
                        if (previousTutorial === 'profileTabs' || previousTutorial === 'facilityProfileTabs') {
                            console.log("[useTutorialActions] Profile tutorial finished, marking as tutorialPassed");
                            await setTutorialComplete(true);
                        }

                        // Chain next tutorial
                        const mandatoryTutorials = ['dashboard', 'profileTabs', 'facilityProfileTabs', 'messages', 'contracts', 'calendar', 'marketplace', 'settings'];
                        const currentIndex = mandatoryTutorials.indexOf(previousTutorial);

                        if (currentIndex !== -1 && currentIndex < mandatoryTutorials.length - 1) {
                            const nextFeature = mandatoryTutorials[currentIndex + 1];
                            console.log(`[useTutorialActions] Chaining next tutorial: ${nextFeature}`);
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
                        console.error('Error updating tutorial completion status:', error);
                    }
                }
            });
        } finally {
            setTimeout(() => {
                completingTutorialRef.current = null;
                console.log("[useTutorialActions] Cleared completingTutorialRef");
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
            console.log("[useTutorialActions] Cannot advance: system busy");
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
            console.log("[useTutorialActions] Cannot go back: system busy");
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
        console.log("[useTutorialActions] Skipping entire tutorial");

        if (isBusy) {
            console.log("[useTutorialActions] Cannot skip tutorial: system busy");
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
                    console.error('Error updating tutorial status:', error);
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
        console.log("[useTutorialActions] Pausing tutorial");
        setIsPaused(true);
    }, [setIsPaused]);

    /**
     * Resume tutorial
     */
    const resumeTutorial = useCallback(() => {
        console.log("[useTutorialActions] Resuming tutorial");

        if (isBusy) {
            console.log("[useTutorialActions] Cannot resume tutorial: system busy");
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
                    console.error('[useTutorialActions] Error resuming tutorial:', error);
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
