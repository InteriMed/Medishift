import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import tutorialCache from './tutorialCache';

export const saveTutorialStep = async (profileCollection, userId, stepIndex) => {
    if (!userId || !profileCollection) return;

    try {
        const profileDocRef = doc(db, profileCollection, userId);
        const profileDoc = await getDoc(profileDocRef);
        const updates = {
            currentStepIndex: stepIndex,
            updatedAt: serverTimestamp()
        };
        if (profileDoc.exists()) {
            await updateDoc(profileDocRef, updates);
        } else {
            await setDoc(profileDocRef, updates, { merge: true });
        }
    } catch (error) {
    }
};

export const saveAccessLevelChoice = async (profileCollection, userId, accessLevel) => {
    if (!userId || !profileCollection || !accessLevel) return;

    try {
        const profileDocRef = doc(db, profileCollection, userId);
        const profileDoc = await getDoc(profileDocRef);
        const updates = {
            accessLevelChoice: accessLevel,
            updatedAt: serverTimestamp()
        };
        if (profileDoc.exists()) {
            await updateDoc(profileDocRef, updates);
        } else {
            await setDoc(profileDocRef, updates, { merge: true });
        }
    } catch (error) {
    }
};

export const saveLocalState = (state) => {
    return tutorialCache.save.state(state);
};

export const loadLocalState = () => {
    return tutorialCache.get.state();
};

export const clearLocalState = () => {
    return tutorialCache.clean();
};
