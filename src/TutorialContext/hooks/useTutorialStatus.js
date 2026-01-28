import { useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../../services/firebase';

export const useTutorialStatus = (state, actions) => {
    const {
        currentUser,
        user,
        tutorialPassed,
        profileComplete,
        isTutorialActive,
        showFirstTimeModal,
        isBusy,
        isDashboardLoading,
        onboardingType,
        activeTutorial,
        currentStep,
        lastRestoredStateRef,
        completingTutorialRef,
        tutorialStoppedRef,
        completedTutorials,
        setIsReady,
        setShowFirstTimeModal,
        setIsTutorialActive,
        setActiveTutorial,
        setCurrentStep,
        safelyUpdateTutorialState
    } = state;
    const location = window.location;
    const isInDashboard = location.pathname.includes('/dashboard');

    useEffect(() => {
        const checkTutorialStatus = async () => {
            if (isBusy) return;
            if (tutorialStoppedRef.current) {
                setIsReady(true);
                return;
            }
            if (!isInDashboard) {
                setIsReady(true);
                return;
            }
            if (!currentUser) {
                setIsReady(true);
                return;
            }
            if (isDashboardLoading) return;

            try {
                const userData = user;
                if (userData) {
                    // Update completed tutorials
                    if (userData.completedTutorials) {
                        state.setCompletedTutorials(prev => {
                            const merged = { ...userData.completedTutorials };
                            Object.keys(prev).forEach(key => {
                                if (prev[key] === true) merged[key] = true;
                            });
                            return merged;
                        });
                    }

                    const bypassedGLN = userData.bypassedGLN === true && userData.GLN_certified === false;
                    const isVerifiedProfile = !!userData.GLN_certified || !!userData.isVerified || bypassedGLN;
                    const isAdmin = !!(userData.adminData && userData.adminData.isActive !== false);

                    const hasProfessionalProfile = userData.hasProfessionalProfile || userData._professionalProfileExists;
                    const hasFacilityProfile = userData.hasFacilityProfile;
                    const hasEstablishedWorkspace = hasProfessionalProfile === true || hasFacilityProfile === true || isAdmin || isVerifiedProfile;

                    if (isAdmin) {
                        setIsReady(true);
                        return;
                    }

                    if (!hasEstablishedWorkspace && (typeof hasProfessionalProfile !== 'boolean' || typeof hasFacilityProfile !== 'boolean')) {
                        return;
                    }

                    if (!hasEstablishedWorkspace) {
                        // Tutorial redirects disabled - allow access
                        setIsReady(true);
                        return;
                    }

                    // Tutorial redirects disabled - always set ready
                    setIsReady(true);
                    return;

                } else {
                    // Tutorial redirects disabled
                    setIsReady(true);
                }

            } catch (error) {
                // Tutorial redirects disabled - always set ready
                setIsReady(true);
            } finally {
                setIsReady(true);
            }
        };

        checkTutorialStatus();
    }, [currentUser, tutorialPassed, isInDashboard, profileComplete, showFirstTimeModal, isTutorialActive, isBusy, user, isDashboardLoading, safelyUpdateTutorialState, completedTutorials, onboardingType, activeTutorial, currentStep, completingTutorialRef, lastRestoredStateRef, tutorialStoppedRef, setIsReady, setShowFirstTimeModal, setIsTutorialActive, setActiveTutorial, setCurrentStep]);
};
