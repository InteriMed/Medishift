import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import { isProfilePath, WORKSPACE_TYPES, getProfileTutorialForType } from '../config/tutorialSystem';
import i18n from '../../../../i18n';

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
        selectedWorkspace,
        onboardingType,
        activeTutorial,
        currentStep, // needed for restoration check
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

    const {
        startTutorial
    } = actions; // Note: startTutorial is not used in the effect directly, logic handles restoration manually to avoid recursion

    const navigate = useNavigate();
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
                    const onboardingCompleted = userData._professionalProfileExists || userData.hasProfessionalProfile || isVerifiedProfile;
                    const isAdmin = !!(userData.adminData && userData.adminData.isActive !== false);

                    const hasProfessionalProfile = userData.hasProfessionalProfile || userData._professionalProfileExists;
                    const hasFacilityProfile = userData.hasFacilityProfile;
                    const hasEstablishedWorkspace = hasProfessionalProfile === true || hasFacilityProfile === true || isAdmin || isVerifiedProfile;
                    const isProfilePage = isProfilePath(location.pathname);

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

                    // Restoration Logic
                    const typeProgress = userData.tutorialProgress?.[onboardingType] || {};
                    if (typeProgress.activeTutorial) {
                        const savedTutorial = typeProgress.activeTutorial;
                        if (tutorialStoppedRef.current) return;

                        if (isTutorialActive && activeTutorial === savedTutorial) {
                            const savedStep = typeProgress.currentStepIndex || 0;
                            if (currentStep >= savedStep) return;
                        }

                        if (completingTutorialRef.current === savedTutorial) return;
                        if (completedTutorials[savedTutorial] === true || typeProgress.tutorials?.[savedTutorial]?.completed) {
                            if (isTutorialActive) {
                                await safelyUpdateTutorialState([
                                    [setIsTutorialActive, false]
                                ]);
                            }
                            return;
                        }

                        if (typeProgress.completed) {
                            try {
                                const profileCollection = onboardingType === 'facility' ? 'facilityProfiles' : 'professionalProfiles';
                                const profileRef = doc(db, profileCollection, currentUser.uid);
                                updateDoc(profileRef, {
                                    [`tutorialProgress.${onboardingType}.activeTutorial`]: null
                                });
                            } catch (e) { }
                            return;
                        }

                        const savedStep = typeProgress.currentStepIndex || 0;
                        if (lastRestoredStateRef.current.tutorial === savedTutorial && lastRestoredStateRef.current.step === savedStep) {
                            return;
                        }

                        lastRestoredStateRef.current = { tutorial: savedTutorial, step: savedStep };
                        safelyUpdateTutorialState([
                            [setActiveTutorial, savedTutorial],
                            [setCurrentStep, savedStep],
                            [setIsTutorialActive, true],
                            [setShowFirstTimeModal, false]
                        ]);
                        return;
                    }

                    // Tutorial logic disabled - no checks needed

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
    }, [currentUser, tutorialPassed, isInDashboard, profileComplete, showFirstTimeModal, isTutorialActive, isBusy, user, isDashboardLoading, safelyUpdateTutorialState, completedTutorials, onboardingType, activeTutorial, currentStep]);
};
