/**
 * Check if user has platform admin privileges
 */
export const isPlatformAdmin = (user) => {
    if (!user) return false;
    return !!(user.adminData && user.adminData.isActive !== false);
};

/**
 * Safely update tutorial state with busy flag and timeout protection
 */
export const createSafeStateUpdater = (setIsBusy) => {
    return async (stateUpdates, asyncCallback) => {
        console.log("[TutorialHelpers] Setting busy flag");
        setIsBusy(true);

        const timeout = setTimeout(() => {
            console.error('[TutorialHelpers] Operation timeout - clearing busy flag');
            setIsBusy(false);
        }, 10000);

        try {
            // Apply all state updates
            for (const [setter, value] of stateUpdates) {
                setter(value);
            }

            // Run async callback if provided
            if (asyncCallback) {
                await asyncCallback();
            }

            clearTimeout(timeout);
            console.log("[TutorialHelpers] Clearing busy flag (success)");
            setIsBusy(false);
        } catch (error) {
            clearTimeout(timeout);
            console.error("[TutorialHelpers] Error updating state:", error);
            // Always clear busy flag on error
            console.log("[TutorialHelpers] Clearing busy flag (error)");
            setIsBusy(false);
            throw error;
        }
    };
};

/**
 * Get profile collection name based on onboarding type
 */
export const getProfileCollection = (onboardingType) => {
    return onboardingType === 'facility' ? 'facilityProfiles' : 'professionalProfiles';
};

/**
 * Check profile completeness from profile data
 */
export const checkProfileCompleteness = (profileData, onboardingType) => {
    if (!profileData) return false;

    // Check workspace-specific completion
    if (onboardingType === 'facility') {
        return !!profileData.facilityName && !!profileData.facilityType;
    }

    // Professional profile checks
    const hasIdentity = profileData.identity?.legalFirstName && profileData.identity?.legalLastName;
    const hasContact = profileData.contact?.email;
    const hasBasicInfo = hasIdentity && hasContact;

    return hasBasicInfo;
};
