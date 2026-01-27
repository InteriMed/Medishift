import { useEffect } from 'react';
import { debounce } from '../../../../utils/debounce';
import { isProfileTutorial } from '../config/tutorialSystem';

export const useTutorialUI = (state) => {
    const {
        isTutorialActive,
        activeTutorial,
        currentStep,
        stepData,
        setStepData,
        setElementPosition,
        tutorialSteps,
        location,
        sidebarWidth,
        isMainSidebarCollapsed,
        setIsMainSidebarCollapsed,
        updateElementPositionRef,
        maxAccessedProfileTab
    } = state;

    // 1. Force sidebar open
    useEffect(() => {
        if (isTutorialActive && isMainSidebarCollapsed) {
            const isMobile = window.innerWidth < 768;
            if (!isMobile) {
                setIsMainSidebarCollapsed(false);
            }
        }
    }, [isTutorialActive, isMainSidebarCollapsed, setIsMainSidebarCollapsed]);

    // 2. Update Step Data
    useEffect(() => {
        if (isTutorialActive && tutorialSteps[activeTutorial]) {
            const steps = tutorialSteps[activeTutorial];
            if (steps && steps[currentStep]) {
                let currentStepData = { ...steps[currentStep] };

                // STOP CHECK: If step targets an inaccessible tab, stop tutorial completely
                // This logic is specifically for profile tutorial safety
                if (isProfileTutorial(activeTutorial) && currentStepData.highlightTab) {
                    const fullTabOrder = ['personalDetails', 'professionalBackground', 'billingInformation', 'documentUploads', 'marketplace', 'account'];
                    const targetTabIndex = fullTabOrder.indexOf(currentStepData.highlightTab);
                    const maxTabIndex = fullTabOrder.indexOf(maxAccessedProfileTab);

                    if (targetTabIndex !== -1 && maxTabIndex !== -1) {
                        if (targetTabIndex > maxTabIndex) {
                            console.log('[TutorialUI] Stopping tutorial: target tab locked', { targetTabIndex, maxTabIndex });
                            if (state.pauseTutorial) state.pauseTutorial();
                            return;
                        }
                    }
                }

                setStepData(currentStepData);
            } else {
                setStepData(null);
            }
        } else {
            setStepData(null);
        }
    }, [currentStep, activeTutorial, isTutorialActive, tutorialSteps, maxAccessedProfileTab, setStepData, state]);

    // 3. Element Positioning
    useEffect(() => {
        if (!stepData) {
            setElementPosition(null);
            return;
        }

        const updateElementPosition = () => {
            let targetSelector = null;

            if (stepData.highlightSidebarItem) {
                targetSelector = `[data-tutorial="${stepData.highlightSidebarItem}-link"]`;
            } else if (stepData.highlightTab) {
                targetSelector = `[data-tab="${stepData.highlightTab}"]`;
            } else if (stepData.targetSelector) {
                targetSelector = stepData.targetSelector;
            }

            if (targetSelector) {
                // Check if we are on the required tab
                if (stepData.requiredTab) {
                    const currentTab = location.pathname.split('/').pop();
                    if (currentTab !== stepData.requiredTab) {
                        setElementPosition(null);
                        return;
                    }
                }

                const isMobile = window.innerWidth < 768;
                if (isMobile && stepData.highlightSidebarItem) {
                    // Mobile logic handling
                    // ...
                }

                const targetElement = document.querySelector(targetSelector);
                if (targetElement) {
                    const rect = targetElement.getBoundingClientRect();
                    setElementPosition({
                        top: rect.top,
                        left: rect.left,
                        width: rect.width,
                        height: rect.height
                    });
                } else {
                    setElementPosition(null);
                }
            } else {
                setElementPosition(null);
            }
        };

        updateElementPositionRef.current = updateElementPosition;

        // Initial position update with retries
        let retryCount = 0;
        const maxRetries = 20;

        const initialPositioning = () => {
            updateElementPosition();
            const targetSelector = stepData.highlightSidebarItem
                ? `[data-tutorial="${stepData.highlightSidebarItem}-link"]`
                : stepData.highlightTab
                    ? `[data-tab="${stepData.highlightTab}"]`
                    : stepData.targetSelector;

            if (targetSelector && !document.querySelector(targetSelector) && retryCount < maxRetries) {
                retryCount++;
                setTimeout(() => requestAnimationFrame(initialPositioning), 100);
            } else if (targetSelector && document.querySelector(targetSelector)) {
                setupObserver(document.querySelector(targetSelector));
            }
        };

        let resizeObserver = null;
        const setupObserver = (element) => {
            if (element && window.ResizeObserver && !resizeObserver) {
                resizeObserver = new ResizeObserver(() => requestAnimationFrame(updateElementPosition));
                resizeObserver.observe(element);
            }
        };

        requestAnimationFrame(initialPositioning);

        const debouncedResize = debounce(updateElementPosition, 150);
        window.addEventListener('resize', debouncedResize);

        const sidebar = document.querySelector('aside[class*="fixed left-0"]');
        const handleSidebarTransition = (e) => {
            if (e.propertyName === 'width' || e.propertyName === 'transform') {
                requestAnimationFrame(updateElementPosition);
            }
        };
        if (sidebar) sidebar.addEventListener('transitionend', handleSidebarTransition);

        return () => {
            if (resizeObserver) resizeObserver.disconnect();
            window.removeEventListener('resize', debouncedResize);
            if (sidebar) sidebar.removeEventListener('transitionend', handleSidebarTransition);
        };
    }, [stepData, sidebarWidth, location.pathname, setElementPosition, updateElementPositionRef]);

    const forceUpdateElementPosition = () => {
        if (updateElementPositionRef.current) {
            updateElementPositionRef.current();
        }
    };

    return {
        forceUpdateElementPosition
    };
};
