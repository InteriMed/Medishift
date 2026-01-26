import { useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import {
    isProfileTutorial,
    isProfilePath,
    normalizePathForComparison,
    TUTORIAL_IDS,
    PROFILE_TAB_IDS,
    getProfileTutorialForType,
    getTabOrder,
    isProfileTabAccessible
} from '../config/tutorialSystem';
import { isTabCompleted } from '../../../pages/profile/utils/profileUtils';

export const useProfileSection = (state, actions) => {
    const {
        currentUser,
        user,
        onboardingType,
        accessLevelChoice, setAccessLevelChoice,
        maxAccessedProfileTab, setMaxAccessedProfileTab,
        activeTutorial,
        isTutorialActive,
        currentStep, setCurrentStep,
        stepData,
        isBusy,
        syncTimestampRef,
        isMainSidebarCollapsed, setIsMainSidebarCollapsed,
        completedTutorials,
        showAccessLevelModal, setShowAccessLevelModal,
        setAllowAccessLevelModalClose,
        setIsWaitingForSave,
        tutorialSteps,
        navigate,
        location,
        safelyUpdateTutorialState
    } = state;

    const {
        saveTutorialProgress,
        completeTutorial,
        nextStep,
        pauseTutorial, // Need to make sure this is available in actions
        showWarning
    } = actions;

    // 1. Load Access Mode
    useEffect(() => {
        const loadAccessMode = async () => {
            if (!currentUser) return;

            try {
                const profileCollection = onboardingType === 'facility' ? 'facilityProfiles' : 'professionalProfiles';
                const profileRef = doc(db, profileCollection, currentUser.uid);
                const profileDoc = await getDoc(profileRef);

                if (profileDoc.exists()) {
                    const profileData = profileDoc.data();
                    const savedAccessMode = profileData.tutorialAccessMode;

                    if (savedAccessMode === 'team' || savedAccessMode === 'full') {
                        if (savedAccessMode !== accessLevelChoice) {
                            setAccessLevelChoice(savedAccessMode);
                        }
                    } else if (savedAccessMode === 'enabled' || savedAccessMode === 'disabled') {
                        // Legacy handling or default
                        setAccessLevelChoice(null); // Or loading?
                    } else if (!savedAccessMode) {
                        setAccessLevelChoice(null);
                    }
                } else {
                    setAccessLevelChoice(null);
                }
            } catch (error) {
                console.error("[ProfileSection] Error loading accessLevelChoice:", error);
            }
        };

        loadAccessMode();
    }, [currentUser, onboardingType]);

    // 2. Set Access Mode
    const setAccessMode = useCallback(async (mode) => {
        if (!currentUser) return;

        if (accessLevelChoice === 'full' && mode !== 'full') {
            console.warn('[ProfileSection] Attempted to change full access - this is not allowed.');
            return;
        }

        setAccessLevelChoice(mode);
        setShowAccessLevelModal(false);
        setAllowAccessLevelModalClose(false);

        try {
            const profileCollection = onboardingType === 'facility' ? 'facilityProfiles' : 'professionalProfiles';
            const profileRef = doc(db, profileCollection, currentUser.uid);

            await updateDoc(profileRef, {
                accessLevelChoice: mode,
                tutorialAccessMode: mode,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error('[ProfileSection] Error saving access mode:', error);
        }
    }, [currentUser, onboardingType, accessLevelChoice, setShowAccessLevelModal, setAllowAccessLevelModalClose, setAccessLevelChoice]);

    // 3. Handle Tab Completion
    const onTabCompleted = useCallback((tabId, isComplete) => {
        // Track tab progress in state
        state.setTabsProgress(prev => ({
            ...prev,
            [tabId]: isComplete
        }));

        const isInProfileTutorial = isProfileTutorial(activeTutorial);
        if (!isTutorialActive || !isInProfileTutorial) {
            return;
        }

        if (isComplete) {
            console.log('[ProfileSection] Tab completed:', tabId);

            const tabOrder = getTabOrder(onboardingType);

            // Sequential unlocking logic (Progressive Mode only)
            if (accessLevelChoice !== 'full') {
                const tabIndex = tabOrder.indexOf(tabId);
                const currentMaxIndex = tabOrder.indexOf(maxAccessedProfileTab);

                // Unlock next tab
                if (tabIndex !== -1 && (tabIndex === currentMaxIndex || tabId === 'account' || tabId === 'marketplace') && tabIndex < tabOrder.length - 1) {
                    const nextTab = tabOrder[tabIndex + 1];
                    console.log('[ProfileSection] Unlocking next tab:', nextTab);
                    setMaxAccessedProfileTab(nextTab);
                }

                // Critical Progress Check
                const isCriticalTabComplete =
                    (tabId === 'documentUploads' && onboardingType === 'professional') ||
                    (tabId === 'facilityLegalBilling' && onboardingType === 'facility');

                if (isCriticalTabComplete || (tabId === 'account' && isInProfileTutorial)) {
                    console.log('[ProfileSection] Critical tab completed - granting FULL access permanently');
                    setAccessLevelChoice('full');

                    if (currentUser) {
                        const profileCollection = onboardingType === 'facility' ? 'facilityProfiles' : 'professionalProfiles';
                        const profileDocRef = doc(db, profileCollection, currentUser.uid);

                        updateDoc(profileDocRef, {
                            accessLevelChoice: 'full',
                            tutorialAccessMode: 'enabled',
                            updatedAt: serverTimestamp()
                        }).catch(err => console.error('[ProfileSection] Error granting full access:', err));
                    }
                }

                if (onboardingType === 'professional' && activeTutorial === TUTORIAL_IDS.PROFILE_TABS && tabId === PROFILE_TAB_IDS.PERSONAL_DETAILS) {
                    // Mode upgrade logic removed to prevent locking
                }
            }

            setIsWaitingForSave(false);

            // Auto-advance
            if (stepData?.highlightTab === tabId && nextStep) {
                console.log('[ProfileSection] Auto-advancing tutorial step for tab completion:', tabId);
                setTimeout(() => {
                    nextStep();
                }, 300);
            }
        }
    }, [
        isTutorialActive, activeTutorial, onboardingType, maxAccessedProfileTab, stepData,
        nextStep, currentUser, accessLevelChoice, setAccessMode, setMaxAccessedProfileTab,
        setAccessLevelChoice, setIsWaitingForSave, state.setTabsProgress
    ]);

    // 4. Auto-Sync Logic (Specific to Profile)
    // 4. Auto-Sync Logic (Specific to Profile) - REMOVED to prevent forced redirects
    // Users can navigate freely without tutorial interfering with routing.



    // 5. Highlight Tab Effect
    const previousHighlightTabRef = useRef(null);
    useEffect(() => {
        if (!isTutorialActive) return;
        if (!isProfileTutorial(activeTutorial)) return;

        const highlightTab = stepData?.highlightTab || null;
        const previousHighlightTab = previousHighlightTabRef.current;
        previousHighlightTabRef.current = highlightTab;

        if (!highlightTab) return;
        if (previousHighlightTab === highlightTab) return;

        if (showAccessLevelModal) {
            setShowAccessLevelModal(false);
            setAllowAccessLevelModalClose(false);
        }

        const tabOrder = getTabOrder(onboardingType);

        const targetIndex = tabOrder.indexOf(highlightTab);
        const maxIndex = tabOrder.indexOf(maxAccessedProfileTab);

        if (targetIndex !== -1 && maxIndex !== -1 && targetIndex > maxIndex) {
            setMaxAccessedProfileTab(highlightTab);
        }
    }, [isTutorialActive, activeTutorial, stepData?.highlightTab, showAccessLevelModal, maxAccessedProfileTab, onboardingType, setAllowAccessLevelModalClose, setMaxAccessedProfileTab, setShowAccessLevelModal]);


    // 6. Check Protected Route (The Route Guard Logic)
    // 6. Check Protected Route (The Route Guard Logic)
    useEffect(() => {
        if (!isTutorialActive || !isProfileTutorial(activeTutorial)) return;

        // Logic for checking matches
        const steps = tutorialSteps[activeTutorial];
        if (steps) {
            try {
                const currentPath = location.pathname;
                const normalizedCurrentPath = normalizePathForComparison(currentPath);
                const matchingStepIndex = steps.findIndex(step =>
                    step.navigationPath && normalizedCurrentPath.includes(step.navigationPath)
                );

                // Check if the matching step targets an accessible tab
                const matchingStep = matchingStepIndex !== -1 ? steps[matchingStepIndex] : null;

                const canAccessMatchingTab = matchingStep?.highlightTab
                    ? isProfileTabAccessible(matchingStep.highlightTab, {
                        isTutorialActive,
                        maxAccessedProfileTab,
                        onboardingType,
                        accessMode: accessLevelChoice,
                        highlightTab: matchingStep.highlightTab // Use the target highlightTab for the check
                    })
                    : true;

                if (matchingStep?.highlightTab && canAccessMatchingTab) {
                    const extTabOrder = getTabOrder(onboardingType);
                    const targetTabIndex = extTabOrder.indexOf(matchingStep.highlightTab);
                    const maxTabIndex = extTabOrder.indexOf(maxAccessedProfileTab);
                    if (targetTabIndex > maxTabIndex) {
                        setMaxAccessedProfileTab(matchingStep.highlightTab);
                    }
                }

                // Only sync if:
                // 1. There's a matching step
                // 2. It's different from current step
                // 3. We're not busy
                // 4. We haven't just synced to this step in the last 500ms (prevent rapid cycles)
                // 5. The tab is accessible
                const now = Date.now();
                const lastSyncKey = `${matchingStepIndex}_${currentPath}`;
                const lastSyncTime = syncTimestampRef.current[lastSyncKey] || 0;
                const timeSinceLastSync = now - lastSyncTime;

                if (matchingStepIndex !== -1 &&
                    matchingStepIndex !== currentStep &&
                    !isBusy &&
                    timeSinceLastSync > 500 &&
                    canAccessMatchingTab) {

                    // Prevent reverting if current step is a continuation on the same page
                    if (matchingStepIndex < currentStep) {
                        let isContinuation = true;
                        // Check if any step between matchingStepIndex+1 and currentStep has a navigationPath
                        // If so, it means we should have navigated, so we are not in a continuation
                        for (let k = matchingStepIndex + 1; k <= currentStep; k++) {
                            if (steps[k] && steps[k].navigationPath) {
                                isContinuation = false;
                                break;
                            }
                        }
                        if (isContinuation) {
                            console.log('[TutorialContext] Skipping auto-sync backwards: step is continuation', { matchingStepIndex, currentStep });
                            return;
                        }
                    }

                    syncTimestampRef.current[lastSyncKey] = now;
                    safelyUpdateTutorialState([
                        [setCurrentStep, matchingStepIndex]
                    ], async () => {
                        await saveTutorialProgress(activeTutorial, matchingStepIndex);
                    });
                    return;
                } else if (matchingStepIndex !== -1 && timeSinceLastSync <= 500) {
                }
            } catch (err) {
                console.error('[TutorialContext] Error syncing tutorial step:', err);
            }
        }

        const path = location.pathname;
        // Logic for leaving profile area (Access Level Modal) - REMOVED for simplification
        // Users are now free to navigate away from the profile section even during the tutorial.


    }, [isTutorialActive, activeTutorial, location.pathname, accessLevelChoice, currentStep, stepData, showAccessLevelModal, state.selectedWorkspace, navigate, setAllowAccessLevelModalClose, setShowAccessLevelModal, tutorialSteps]);


    const syncProfileInitialState = useCallback((formData, profileConfig) => {
        if (!isTutorialActive || !isProfileTutorial(activeTutorial) || !formData || !profileConfig) return;
        if (accessLevelChoice === 'full') return;

        const tabOrder = getTabOrder(onboardingType);
        let firstIncompleteTab = null;

        for (const tabId of tabOrder) {
            if (!isTabCompleted(formData, tabId, profileConfig)) {
                firstIncompleteTab = tabId;
                break;
            }
        }

        if (firstIncompleteTab) {
            console.log('[ProfileSection] Initial sync - first incomplete tab:', firstIncompleteTab);

            // 1. Ensure it's unlocked
            if (maxAccessedProfileTab !== firstIncompleteTab) {
                const currentIndex = tabOrder.indexOf(maxAccessedProfileTab);
                const targetIndex = tabOrder.indexOf(firstIncompleteTab);
                if (targetIndex > currentIndex) {
                    setMaxAccessedProfileTab(firstIncompleteTab);
                }
            }

            // 2. Sync tutorial step if needed
            const steps = tutorialSteps[activeTutorial] || [];
            const targetStepIndex = steps.findIndex(s => s.highlightTab === firstIncompleteTab);

            if (targetStepIndex !== -1 && targetStepIndex > currentStep) {
                console.log('[ProfileSection] Jumping to first incomplete step:', targetStepIndex);
                safelyUpdateTutorialState([[setCurrentStep, targetStepIndex]], async () => {
                    await saveTutorialProgress(activeTutorial, targetStepIndex);
                });
            }
        }
    }, [isTutorialActive, activeTutorial, onboardingType, accessLevelChoice, maxAccessedProfileTab, tutorialSteps, currentStep, setMaxAccessedProfileTab, setCurrentStep, safelyUpdateTutorialState, saveTutorialProgress]);

    return {
        onTabCompleted,
        setAccessMode,
        syncProfileInitialState
    };
};
