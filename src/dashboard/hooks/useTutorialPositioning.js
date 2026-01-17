import { useState, useEffect, useCallback, useRef } from 'react';
import { debounce } from '../../utils/debounce';

export const useTutorialPositioning = (stepData, sidebarWidth, location) => {
    const [elementPosition, setElementPosition] = useState(null);
    const updateElementPositionRef = useRef(null);

    // Get element position for highlighting
    useEffect(() => {
        if (!stepData) {
            setElementPosition(null);
            return;
        }

        const updateElementPosition = () => {
            let targetSelector = null;

            // Determine the target selector based on step data
            if (stepData.highlightSidebarItem) {
                targetSelector = `[data-tutorial="${stepData.highlightSidebarItem}-link"]`;
            } else if (stepData.highlightTab) {
                targetSelector = `[data-tab="${stepData.highlightTab}"]`;
            } else if (stepData.targetSelector) {
                targetSelector = stepData.targetSelector;
            }

            if (targetSelector) {
                // Check if we are on the required tab (if specified)
                if (stepData.requiredTab) {
                    const currentTab = location.pathname.split('/').pop();
                    if (currentTab !== stepData.requiredTab) {
                        console.log(`[TutorialPositioning] Tooltip hidden: Incorrect tab (Active: ${currentTab}, Required: ${stepData.requiredTab})`);
                        setElementPosition(null);
                        return;
                    }
                }

                // On mobile, ensure sidebar is open before finding elements
                const isMobile = window.innerWidth < 768;
                if (isMobile && stepData.highlightSidebarItem) {
                    const sidebar = document.querySelector('.sidebar');
                    const isSidebarVisible = sidebar &&
                        window.getComputedStyle(sidebar).display !== 'none' &&
                        window.getComputedStyle(sidebar).visibility !== 'hidden';

                    if (!isSidebarVisible) {
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
                        return;
                    }
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

        // Store updateElementPosition in ref so it can be called externally
        updateElementPositionRef.current = updateElementPosition;

        // Initial position update - use requestAnimationFrame to ensure DOM is ready
        // This is especially important after save operations that change the step
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                updateElementPosition();
            });
        });

        // Set up ResizeObserver for the target element
        const targetSelector = stepData.highlightSidebarItem
            ? `[data-tutorial="${stepData.highlightSidebarItem}-link"]`
            : stepData.highlightTab
                ? `[data-tab="${stepData.highlightTab}"]`
                : stepData.targetSelector;

        let resizeObserver = null;
        const targetElement = targetSelector ? document.querySelector(targetSelector) : null;

        if (targetElement && window.ResizeObserver) {
            resizeObserver = new ResizeObserver(() => {
                // Use requestAnimationFrame for smooth updates
                requestAnimationFrame(updateElementPosition);
            });
            resizeObserver.observe(targetElement);
        }

        // Debounced window resize handler
        const debouncedResize = debounce(updateElementPosition, 150);
        window.addEventListener('resize', debouncedResize);

        // Sidebar transition handler (listen for transitionend instead of setTimeout)
        const sidebar = document.querySelector('aside[class*="fixed left-0"]');
        const handleSidebarTransition = (e) => {
            if (e.propertyName === 'width' || e.propertyName === 'transform') {
                requestAnimationFrame(updateElementPosition);
            }
        };

        if (sidebar) {
            sidebar.addEventListener('transitionend', handleSidebarTransition);
        }

        return () => {
            // Cleanup
            if (resizeObserver) {
                resizeObserver.disconnect();
            }
            window.removeEventListener('resize', debouncedResize);
            if (sidebar) {
                sidebar.removeEventListener('transitionend', handleSidebarTransition);
            }
        };
    }, [stepData, sidebarWidth, location.pathname]);

    // Function to force immediate position update
    const forceUpdateElementPosition = useCallback(() => {
        if (updateElementPositionRef.current) {
            console.log('[TutorialPositioning] Force updating element position');
            updateElementPositionRef.current();
        }
    }, []);

    return {
        elementPosition,
        forceUpdateElementPosition
    };
};

export default useTutorialPositioning;
