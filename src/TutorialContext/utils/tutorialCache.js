import { LOCALSTORAGE_KEYS } from '../../../../config/keysDatabase';

const TUTORIAL_CACHE_KEYS = {
    STATE: LOCALSTORAGE_KEYS.TUTORIAL_STATE,
    MAX_ACCESSED_PROFILE_TAB: LOCALSTORAGE_KEYS.TUTORIAL_MAX_ACCESSED_PROFILE_TAB
};

const getAllTutorialCacheKeys = () => {
    return Object.values(TUTORIAL_CACHE_KEYS);
};

export const tutorialCache = {
    save: {
        state: (state) => {
            try {
                localStorage.setItem(TUTORIAL_CACHE_KEYS.STATE, JSON.stringify(state));
                return true;
            } catch (error) {
                console.error('[TutorialCache] Error saving tutorial state:', error);
                return false;
            }
        },
        maxAccessedProfileTab: (tab) => {
            try {
                const valueToPersist = tab === 'settings' ? 'marketplace' : tab;
                localStorage.setItem(TUTORIAL_CACHE_KEYS.MAX_ACCESSED_PROFILE_TAB, valueToPersist);
                return true;
            } catch (error) {
                console.error('[TutorialCache] Error saving maxAccessedProfileTab:', error);
                return false;
            }
        }
    },
    get: {
        state: () => {
            try {
                const stored = localStorage.getItem(TUTORIAL_CACHE_KEYS.STATE);
                return stored ? JSON.parse(stored) : null;
            } catch (error) {
                console.error('[TutorialCache] Error loading tutorial state:', error);
                return null;
            }
        },
        maxAccessedProfileTab: () => {
            try {
                const saved = localStorage.getItem(TUTORIAL_CACHE_KEYS.MAX_ACCESSED_PROFILE_TAB);
                if (saved === 'settings') return 'marketplace';
                return saved || 'personalDetails';
            } catch (error) {
                console.error('[TutorialCache] Error loading maxAccessedProfileTab:', error);
                return 'personalDetails';
            }
        }
    },
    edit: {
        state: (updates) => {
            try {
                const currentState = tutorialCache.get.state();
                if (!currentState) {
                    return tutorialCache.save.state(updates);
                }
                const updatedState = { ...currentState, ...updates };
                return tutorialCache.save.state(updatedState);
            } catch (error) {
                console.error('[TutorialCache] Error editing tutorial state:', error);
                return false;
            }
        },
        maxAccessedProfileTab: (tab) => {
            return tutorialCache.save.maxAccessedProfileTab(tab);
        }
    },
    delete: {
        state: () => {
            try {
                localStorage.removeItem(TUTORIAL_CACHE_KEYS.STATE);
                return true;
            } catch (error) {
                console.error('[TutorialCache] Error deleting tutorial state:', error);
                return false;
            }
        },
        maxAccessedProfileTab: () => {
            try {
                localStorage.removeItem(TUTORIAL_CACHE_KEYS.MAX_ACCESSED_PROFILE_TAB);
                return true;
            } catch (error) {
                console.error('[TutorialCache] Error deleting maxAccessedProfileTab:', error);
                return false;
            }
        }
    },
    clean: () => {
        try {
            const keys = getAllTutorialCacheKeys();
            let allSuccess = true;
            keys.forEach(key => {
                try {
                    localStorage.removeItem(key);
                } catch (error) {
                    console.error(`[TutorialCache] Error removing key ${key}:`, error);
                    allSuccess = false;
                }
            });
            return allSuccess;
        } catch (error) {
            console.error('[TutorialCache] Error cleaning tutorial cache:', error);
            return false;
        }
    }
};

export default tutorialCache;


