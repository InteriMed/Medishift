import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { FIRESTORE_COLLECTIONS } from '../../../config/keysDatabase';

export const saveTutorialStep = async (profileCollection, userId, stepIndex) => {
    if (!userId || !profileCollection) return;

    try {
        const profileDocRef = doc(db, profileCollection, userId);
        await updateDoc(profileDocRef, {
            currentStepIndex: stepIndex,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        // Error saving tutorial step
    }
};

export const saveAccessLevelChoice = async (profileCollection, userId, accessLevel) => {
    if (!userId || !profileCollection || !accessLevel) return;

    try {
        const profileDocRef = doc(db, profileCollection, userId);
        await updateDoc(profileDocRef, {
            accessLevelChoice: accessLevel,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        // Error saving access level choice
    }
};

const STORAGE_KEY = LOCALSTORAGE_KEYS.TUTORIAL_STATE;

export const saveLocalState = (state) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
        // Error saving local state
    }
};

export const loadLocalState = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : null;
    } catch (error) {
        // Error loading local state
        return null;
    }
};

export const clearLocalState = () => {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        // Error clearing local state
    }
};
