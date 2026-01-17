import { useCallback } from 'react';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, serverTimestamp, deleteField } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { WORKSPACE_TYPES } from '../../utils/sessionAuth';

const TUTORIAL_STORAGE_KEY = 'tutorial_state';

const getTutorialStorageKey = (userId, workspaceId) => {
    if (!userId) return TUTORIAL_STORAGE_KEY;
    const workspace = workspaceId ? `_${workspaceId}` : '';
    return `${TUTORIAL_STORAGE_KEY}_${userId}${workspace}`;
};

export const useTutorialPersistence = (currentUser, selectedWorkspace) => {
    // --- Local Storage Operations ---

    const saveLocalState = useCallback((state) => {
    }, [currentUser, selectedWorkspace]);

    const loadLocalState = useCallback(() => {
        return null;
    }, [currentUser, selectedWorkspace]);

    const clearLocalState = useCallback(() => {
    }, [currentUser, selectedWorkspace]);

    // --- New Onboarding Persistence Operations ---

    // Save a specific step as "reached"
    const saveOnboardingStep = useCallback(async (type, stepData) => {
        if (!currentUser) return;
        // type: 'professional' or 'facility'
        const fieldName = type === 'facility' ? 'onboardingFacility' : 'onboardingProfessional';
        const userDocRef = doc(db, 'users', currentUser.uid);

        try {
            const stepEntry = {
                ...stepData,
                reached: true,
                timestamp: Date.now() // utilizing client timestamp for now to avoid serverTimestamp issues in arrays if needed
            };

            await setDoc(userDocRef, {
                [fieldName]: {
                    steps: arrayUnion(stepEntry)
                }
            }, { merge: true });

        } catch (error) {
            console.error('[TutorialPersistence] Error saving onboarding step:', error);
        }
    }, [currentUser]);

    // Mark the entire onboarding flow as finished
    const markOnboardingFinished = useCallback(async (type) => {
        if (!currentUser) return;
        const fieldName = type === 'facility' ? 'onboardingFacility' : 'onboardingProfessional';
        const userDocRef = doc(db, 'users', currentUser.uid);

        try {
            await setDoc(userDocRef, {
                [fieldName]: {
                    finished: true
                }
            }, { merge: true });
        } catch (error) {
            console.error('[TutorialPersistence] Error marking onboarding finished:', error);
        }
    }, [currentUser]);

    // Fetch the onboarding progress
    const getOnboardingProgress = useCallback(async () => {
        if (!currentUser) return null;
        try {
            const userDocRef = doc(db, 'users', currentUser.uid);
            const snapshot = await getDoc(userDocRef);
            if (snapshot.exists()) {
                const data = snapshot.data();
                return {
                    professional: data.onboardingProfessional,
                    facility: data.onboardingFacility
                };
            }
        } catch (error) {
            console.error('[TutorialPersistence] Error fetching onboarding progress:', error);
        }
        return null;
    }, [currentUser]);

    // --- General Tutorial Persistence Operations ---

    const saveTutorialStep = useCallback(async (stepData) => {
        if (!currentUser) return;

        try {
            let docRef;
            if (selectedWorkspace?.type === WORKSPACE_TYPES.TEAM && selectedWorkspace?.facilityId) {
                docRef = doc(db, 'facilityProfiles', selectedWorkspace.facilityId);
            } else {
                docRef = doc(db, 'professionalProfiles', currentUser.uid);
            }

            const stepEntry = {
                ...stepData,
                reached: true,
                timestamp: Date.now()
            };

            await setDoc(docRef, {
                tutorial: {
                    steps: arrayUnion(stepEntry)
                }
            }, { merge: true });
        } catch (error) {
            console.error('[TutorialPersistence] Error saving tutorial step:', error);
        }
    }, [currentUser, selectedWorkspace]);

    const markGlobalTutorialFinished = useCallback(async () => {
        if (!currentUser) return;

        try {
            let docRef;
            if (selectedWorkspace?.type === WORKSPACE_TYPES.TEAM && selectedWorkspace?.facilityId) {
                docRef = doc(db, 'facilityProfiles', selectedWorkspace.facilityId);
            } else {
                docRef = doc(db, 'professionalProfiles', currentUser.uid);
            }

            await setDoc(docRef, {
                tutorial: {
                    finished: true
                }
            }, { merge: true });
        } catch (error) {
            console.error('[TutorialPersistence] Error marking tutorial finished:', error);
        }
    }, [currentUser, selectedWorkspace]);

    const getTutorialProgress = useCallback(async () => {
        if (!currentUser) return null;
        try {
            let docRef;
            if (selectedWorkspace?.type === WORKSPACE_TYPES.TEAM && selectedWorkspace?.facilityId) {
                docRef = doc(db, 'facilityProfiles', selectedWorkspace.facilityId);
            } else {
                docRef = doc(db, 'professionalProfiles', currentUser.uid);
            }

            const snapshot = await getDoc(docRef);
            if (snapshot.exists()) {
                const data = snapshot.data();
                return data.tutorial;
            }
        } catch (error) {
            console.error('[TutorialPersistence] Error fetching tutorial progress:', error);
        }
        return null;
    }, [currentUser, selectedWorkspace]);

    // --- Aggregated / Helper Operations (Connecting to Context) ---

    const saveRemoteProgress = useCallback(async (activeTutorial, currentStep, tutorialMode) => {
        if (!currentUser) return;

        // Save to specific breakdown if needed
        if (tutorialMode === 'onboarding') {
            const isFacility = selectedWorkspace?.type === WORKSPACE_TYPES.TEAM;
            const type = isFacility ? 'facility' : 'professional';
            await saveOnboardingStep(type, { tutorial: activeTutorial, stepIndex: currentStep });
        }

        // Also save to general tutorial progress for consistency or legacy support
        await saveTutorialStep({ tutorial: activeTutorial, stepIndex: currentStep, mode: tutorialMode });

        // Update basic state tracking in DB if needed (optional, implemented to match expected behavior)
        try {
            let docRef;
            if (selectedWorkspace?.type === WORKSPACE_TYPES.TEAM && selectedWorkspace?.facilityId) {
                docRef = doc(db, 'facilityProfiles', selectedWorkspace.facilityId);
            } else {
                docRef = doc(db, 'professionalProfiles', currentUser.uid);
            }

            await setDoc(docRef, {
                tutorial: {
                    activeTutorial,
                    currentStep,
                    lastUpdated: serverTimestamp()
                }
            }, { merge: true });
        } catch (error) {
            console.error('[TutorialPersistence] Error updating active tutorial state:', error);
        }

    }, [currentUser, selectedWorkspace, saveOnboardingStep, saveTutorialStep]);

    const fetchTutorialData = useCallback(async () => {
        const progress = await getTutorialProgress();
        return { tutorialProgress: progress || {} };
    }, [getTutorialProgress]);

    const markTutorialComplete = useCallback(async (tutorialName) => {
        if (!currentUser) return;
        try {
            let docRef;
            if (selectedWorkspace?.type === WORKSPACE_TYPES.TEAM && selectedWorkspace?.facilityId) {
                docRef = doc(db, 'facilityProfiles', selectedWorkspace.facilityId);
            } else {
                docRef = doc(db, 'professionalProfiles', currentUser.uid);
            }

            // arrayUnion only works with updateDoc, not setDoc
            // First ensure the tutorial object exists, then use arrayUnion
            const snapshot = await getDoc(docRef);
            if (!snapshot.exists()) {
                // Document doesn't exist, create it first
                await setDoc(docRef, {
                    tutorial: {
                        completedTutorials: [tutorialName]
                    }
                });
            } else {
                // Document exists, use updateDoc with arrayUnion
                await updateDoc(docRef, {
                    'tutorial.completedTutorials': arrayUnion(tutorialName)
                });
            }
            
            // Verify the save by reading back
            const verifySnapshot = await getDoc(docRef);
            const verifyData = verifySnapshot.exists() ? verifySnapshot.data() : {};
            const savedCompleted = verifyData?.tutorial?.completedTutorials || [];
            console.log('[TutorialPersistence] Marked tutorial complete:', tutorialName, 'Saved completed tutorials:', savedCompleted);
        } catch (error) {
            console.error('[TutorialPersistence] Error marking tutorial complete:', error);
            throw error;
        }
    }, [currentUser, selectedWorkspace]);

    const clearCompletedStatus = useCallback(async (tutorialName) => {
        if (!currentUser) return;
        try {
            let docRef;
            if (selectedWorkspace?.type === WORKSPACE_TYPES.TEAM && selectedWorkspace?.facilityId) {
                docRef = doc(db, 'facilityProfiles', selectedWorkspace.facilityId);
            } else {
                docRef = doc(db, 'professionalProfiles', currentUser.uid);
            }

            // For array-based deletion, we'd need arrayRemove but let's just update the whole field for now if it's simpler or use another approach.
            // Actually, for Firebase, let's just stick to the simplest way that works for the user's "string array" request.
            const snapshot = await getDoc(docRef);
            if (snapshot.exists()) {
                const data = snapshot.data();
                const completed = data?.tutorial?.completedTutorials || [];
                const updated = completed.filter(t => t !== tutorialName);
                await updateDoc(docRef, {
                    'tutorial.completedTutorials': updated
                });
            }
        } catch (error) {
            console.log('[TutorialPersistence] clearCompletedStatus failed', error);
        }
    }, [currentUser, selectedWorkspace]);

    const clearActiveTutorial = useCallback(async () => {
        if (!currentUser) return;
        try {
            let docRef;
            if (selectedWorkspace?.type === WORKSPACE_TYPES.TEAM && selectedWorkspace?.facilityId) {
                docRef = doc(db, 'facilityProfiles', selectedWorkspace.facilityId);
            } else {
                docRef = doc(db, 'professionalProfiles', currentUser.uid);
            }

            await setDoc(docRef, {
                tutorial: {
                    activeTutorial: null,
                    currentStep: 0
                }
            }, { merge: true });
        } catch (error) {
            console.error('[TutorialPersistence] Error clearing active tutorial:', error);
        }
    }, [currentUser, selectedWorkspace]);

    const saveAccessLevel = useCallback(async (accessLevel) => {
        if (!currentUser) return;
        try {
            let docRef;
            if (selectedWorkspace?.type === WORKSPACE_TYPES.TEAM && selectedWorkspace?.facilityId) {
                docRef = doc(db, 'facilityProfiles', selectedWorkspace.facilityId);
            } else {
                docRef = doc(db, 'professionalProfiles', currentUser.uid);
            }
            await setDoc(docRef, {
                tutorial: {
                    accessLevel: accessLevel
                }
            }, { merge: true });
        } catch (e) {
            console.error('[TutorialPersistence] Error saving access level:', e);
        }
    }, [currentUser, selectedWorkspace]);

    const getAccessLevel = useCallback(() => {
        return null;
    }, [currentUser]);


    return {
        saveLocalState,
        loadLocalState,
        clearLocalState,
        saveOnboardingStep,
        markOnboardingFinished,
        getOnboardingProgress,
        saveTutorialStep,
        markGlobalTutorialFinished,
        getTutorialProgress,
        saveRemoteProgress,
        fetchTutorialData,
        markTutorialComplete,
        clearCompletedStatus,
        markGlobalComplete: markGlobalTutorialFinished,
        clearActiveTutorial,
        saveAccessLevel,
        getAccessLevel
    };
};

export default useTutorialPersistence;
