import { useEffect } from 'react';
import { TUTORIAL_IDS, isProfilePath } from '../../../../config/tutorialSystem';

export const useDashboardSection = (state, actions) => {
    const {
        activeTutorial,
        isTutorialActive,
        currentStep,
        isBusy,
        selectedWorkspace,
        navigate,
        location
    } = state;

    const {
        completeTutorial,
        showWarning
    } = actions;

    useEffect(() => {
        // Only run for Dashboard Tutorial
        if (activeTutorial !== TUTORIAL_IDS.DASHBOARD || !isTutorialActive || isBusy) return;

        const path = location.pathname;
        const isOverview = path.includes('/overview');
        const isProfile = isProfilePath(path);
        const isSharedFeature = path.includes('/messages') || path.includes('/calendar') || path.includes('/contracts');

        // Allow profile and shared features (messages, calendar, contracts) during dashboard tutorial
        // This check must happen FIRST to prevent unwanted redirects
        if (isProfile || isSharedFeature) {
            // If user navigates to profile, complete the dashboard tutorial since that's the goal
            if (isProfile && currentStep >= 3) {
                completeTutorial();
            }
            return;
        }

        // Steps before "Navigate to Profile" (Step 3) -> Must stay on Overview
        if (currentStep < 3) {
            if (!isOverview) {
                // Workspace is already in the path or we default to personal
                const workspaceId = selectedWorkspace?.id || 'personal';
                const dashboardUrl = `/dashboard/${workspaceId}/overview`;
                navigate(dashboardUrl);
            }
        } else {
            // Step 3+ but not on profile, overview, or shared features - redirect to dashboard
            if (!isOverview && !isProfile && !isSharedFeature) {
                const workspaceId = selectedWorkspace?.id || 'personal';
                const dashboardUrl = `/dashboard/${workspaceId}/overview`;
                navigate(dashboardUrl);
            }
        }
    }, [isTutorialActive, activeTutorial, currentStep, isBusy, location.pathname, selectedWorkspace, completeTutorial, navigate]);
};
