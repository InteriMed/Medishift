import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useTutorial } from '../../contexts/TutorialContext';
import { useDashboard } from '../../contexts/DashboardContext';
import { useNavigate } from 'react-router-dom';


const SidebarHighlighter = () => {
  const navigate = useNavigate();
  const {
    activeTutorial,
    currentStep,
    stepData,
    isTutorialActive,
    nextStep
  } = useTutorial();

  const [highlightBox, setHighlightBox] = useState(null);
  const [waitingForInteraction, setWaitingForInteraction] = useState(false);
  const [targetElement, setTargetElement] = useState(null);
  const positionTimeoutRef = useRef(null);
  const resizeListenerRef = useRef(null);
  const interactionListenerRef = useRef(null);
  const isOpeningMenuRef = useRef(false); // Prevent multiple menu opening attempts
  const isPositioningRef = useRef(false); // Prevent recursive positioning calls
  const sidebarCheckIntervalRef = useRef(null); // Store interval to clear it
  const sidebarOpenedForTutorialRef = useRef(false); // Track if sidebar was opened for tutorial

  // Clean up function to remove event listeners and timeouts
  const cleanup = useCallback(() => {
    // Force removal of highlight box immediately
    setHighlightBox(null);

    if (positionTimeoutRef.current) {
      clearTimeout(positionTimeoutRef.current);
      positionTimeoutRef.current = null;
    }

    if (resizeListenerRef.current) {
      window.removeEventListener('resize', resizeListenerRef.current);
      resizeListenerRef.current = null;
    }

    if (interactionListenerRef.current && targetElement) {
      targetElement.removeEventListener('click', interactionListenerRef.current);
      interactionListenerRef.current = null;
    }

    // Clear sidebar check interval if it exists
    if (sidebarCheckIntervalRef.current) {
      clearInterval(sidebarCheckIntervalRef.current);
      sidebarCheckIntervalRef.current = null;
    }

    // Reset flags
    isOpeningMenuRef.current = false;
    isPositioningRef.current = false;
    // Don't reset sidebarOpenedForTutorialRef here - it should persist across steps within the same session
    // But if tutorial actually ends (isTutorialActive becomes false), it will be reset in the effect below

    // Reset all sidebar links to normal state
    const allSidebarLinks = document.querySelectorAll('[data-tutorial$="-link"]');
    allSidebarLinks.forEach(link => {
      link.style.pointerEvents = '';
      link.style.opacity = '';
      link.style.cursor = '';
      link.style.position = '';
      link.style.zIndex = '';
      link.removeAttribute('data-tutorial-disabled');
      link.classList.remove('tutorial-highlight');
    });

    // Reset profile tabs pointer events only - DO NOT remove tutorial-highlight class
    // Profile tabs get their highlight class from React's className, not from SidebarHighlighter
    const allProfileTabs = document.querySelectorAll('[data-tab]');
    allProfileTabs.forEach(tab => {
      if (tab.dataset.originalPointerEvents !== undefined) {
        tab.style.pointerEvents = tab.dataset.originalPointerEvents;
        delete tab.dataset.originalPointerEvents;
      } else {
        tab.style.pointerEvents = '';
      }
      // DO NOT remove tutorial-highlight - it's managed by React component
    });

    setWaitingForInteraction(false);
    setTargetElement(null);
  }, [targetElement]);

  // Function to add click listener to the target element
  const addInteractionListener = useCallback((element) => {
    if (!element || !isTutorialActive) return;

    // Remove any existing listener
    if (interactionListenerRef.current && targetElement) {
      targetElement.removeEventListener('click', interactionListenerRef.current);
    }

    // Create a new click handler
    const handleTargetClick = (e) => {
      // Mark that we've completed the interaction
      setWaitingForInteraction(false);

      // Extract navigation path for sidebar links
      let navigationPath = null;

      // First check if navigationPath is directly specified in stepData
      if (stepData.navigationPath) {
        navigationPath = stepData.navigationPath;
      }
      // Otherwise check if this is a sidebar link and extract the path
      else if (stepData.highlightSidebarItem) {
        // Extract path from the actual element (more reliable)
        if (element.tagName === 'A') {
          navigationPath = element.getAttribute('href');
        } else if (element.closest('a')) {
          navigationPath = element.closest('a').getAttribute('href');
        }

        // If we couldn't get a path directly, construct one based on the sidebar item
        if (!navigationPath && stepData.highlightSidebarItem) {
          navigationPath = `/dashboard/${stepData.highlightSidebarItem.replace('-link', '')}`;
        }
      }

      // For Profile navigation, allow default behavior and let React Router handle it
      // The Profile component will detect the tutorial state and start the profile tutorial
      if (navigationPath && navigationPath.includes('/profile')) {
        // Don't prevent default - let the link navigate naturally
        // We do NOT call nextStep() here, ensuring "Save and Continue" is mandatory
        return; // Let the default navigation happen
      }

      // Check if this step should pause after click
      if (stepData?.pauseAfterClick) {
        // Don't call nextStep - tutorial will pause
        // The tutorial will resume when user manually continues or completes the action
        setWaitingForInteraction(false);
        return; // Let the click happen but don't advance
      }

      // For other links, prevent default and navigate programmatically
      e.preventDefault();
      e.stopPropagation();

      // Use setTimeout to allow state updates before navigation
      setTimeout(() => {
        // First navigate if needed
        if (navigationPath) {
          navigate(navigationPath);
        }

        // Advance to next step automatically since the user performed the correct action
        if (nextStep) {
          nextStep();
        }
      }, 100);
    };

    // Store the reference to the handler
    interactionListenerRef.current = handleTargetClick;

    // Add the listener to the element
    element.addEventListener('click', interactionListenerRef.current);

    // Store the target element
    setTargetElement(element);

    // Set waiting for interaction flag
    setWaitingForInteraction(true);

  }, [isTutorialActive, nextStep, targetElement, stepData, navigate]);

  // Position highlight box around target element - memoized to prevent unnecessary re-creation
  const positionHighlightBox = useCallback(() => {
    // Prevent recursive calls
    if (isPositioningRef.current) {
      return;
    }

    // Only attempt to highlight if tutorial is active
    if (!isTutorialActive) {
      setHighlightBox(null);
      cleanup();
      isPositioningRef.current = false;
      return;
    }

    if (!stepData) {
      setHighlightBox(null);
      cleanup();
      isPositioningRef.current = false;
      return;
    }

    isPositioningRef.current = true;

    // Check if we're on mobile - will be used for positioning adjustments
    const isMobile = window.innerWidth < 768;

    // Handle sidebar expansion if needed
    if (stepData.expandSidebar) {
      const sidebar = document.querySelector('aside[class*="fixed left-0"]');
      if (sidebar) {
        const isCollapsed = sidebar.classList.contains('w-[70px]') || window.getComputedStyle(sidebar).width === '70px';
        if (isCollapsed) {
          const collapseButton = sidebar.querySelector('button[title="Expand"], button[title="Collapse"]');
          if (collapseButton) {
            collapseButton.click();
            setTimeout(() => {
              isPositioningRef.current = false; // Reset before calling
              positionHighlightBox();
            }, 350);
            return;
          }
        }
      }
    }

    // Note: Sidebar item accessibility (locking/unlocking) is now handled natively by Sidebar.js
    // through conditional rendering (div vs NavLink). No inline style manipulation needed here.

    let targetSelector = null;
    let isProfileTab = false;
    let requiresInteraction = stepData.requiresInteraction !== undefined ? stepData.requiresInteraction : false;

    // Check if we should highlight the entire sidebar
    if (stepData.highlightSidebar) {
      targetSelector = 'aside[class*="fixed left-0"]';
      requiresInteraction = false;

      // On mobile, ensure the sidebar is open before highlighting (only check once)
      if (isMobile) {
        const sidebarElement = document.querySelector('aside[class*="fixed left-0"]');
        const isSidebarVisible = sidebarElement &&
          sidebarElement.offsetParent !== null &&
          window.getComputedStyle(sidebarElement).display !== 'none' &&
          window.getComputedStyle(sidebarElement).visibility !== 'hidden';

        // Only try to open once if not already opened
        if (!isSidebarVisible && !sidebarOpenedForTutorialRef.current) {
          const mobileMenuButton = document.querySelector('[aria-label="Toggle menu"]') ||
            document.querySelector('button[aria-label*="menu" i]');
          if (mobileMenuButton) {
            sidebarOpenedForTutorialRef.current = true;
            mobileMenuButton.click();

            // Wait once for sidebar to appear
            setTimeout(() => {
              isPositioningRef.current = false;
              positionHighlightBox();
            }, 500);
            return;
          }
        } else if (isSidebarVisible) {
          sidebarOpenedForTutorialRef.current = true;
        }
      }
    }
    // Check if we should highlight a sidebar item
    else if (stepData.highlightSidebarItem) {
      targetSelector = `[data-tutorial="${stepData.highlightSidebarItem}-link"]`;
      requiresInteraction = stepData.requiresInteraction !== undefined ? stepData.requiresInteraction : true;

      // On mobile, ensure the sidebar is open before highlighting sidebar items
      if (isMobile) {
        const mobileMenuButton = document.querySelector('[aria-label="Toggle menu"]') ||
          document.querySelector('button[aria-label*="menu" i]');

        // Check if sidebar is visible (mobile menu is open)
        const sidebarElement = document.querySelector('aside[class*="fixed left-0"]');
        const isSidebarVisible = sidebarElement &&
          sidebarElement.offsetParent !== null &&
          window.getComputedStyle(sidebarElement).display !== 'none' &&
          window.getComputedStyle(sidebarElement).visibility !== 'hidden';

        // Only try to open sidebar ONCE - if already marked as opened, just wait for it
        if (!isSidebarVisible) {
          // If we haven't tried to open it yet, do it once
          if (!sidebarOpenedForTutorialRef.current && !isOpeningMenuRef.current && mobileMenuButton) {
            isOpeningMenuRef.current = true;
            sidebarOpenedForTutorialRef.current = true;

            // Wait for sidebar transition to complete using transitionend event
            const handleSidebarTransition = (e) => {
              // Only respond to transform or opacity transitions on the sidebar itself
              if (e.target === sidebarElement &&
                (e.propertyName === 'transform' || e.propertyName === 'opacity')) {
                sidebarElement.removeEventListener('transitionend', handleSidebarTransition);

                isOpeningMenuRef.current = false;
                isPositioningRef.current = false;
                // Small delay to ensure DOM is fully updated
                requestAnimationFrame(() => {
                  positionHighlightBox();
                });
              }
            };

            if (sidebarElement) {
              sidebarElement.addEventListener('transitionend', handleSidebarTransition);

              // Fallback timeout in case transitionend doesn't fire
              setTimeout(() => {
                if (isOpeningMenuRef.current) {
                  sidebarElement.removeEventListener('transitionend', handleSidebarTransition);
                  isOpeningMenuRef.current = false;
                  isPositioningRef.current = false;
                  positionHighlightBox();
                }
              }, 600);
            }

            // Click the menu button to open sidebar
            mobileMenuButton.click();
            return; // Exit early, will be called again after sidebar opens
          } else if (sidebarOpenedForTutorialRef.current && !isOpeningMenuRef.current) {
            // Already marked as opened but not visible - just proceed (don't loop)
            isPositioningRef.current = false;
            // Continue to find and highlight the element
          } else {
            // Still opening, wait
            return;
          }
        } else {
          // Sidebar is visible, proceed normally
          isOpeningMenuRef.current = false;
          sidebarOpenedForTutorialRef.current = true;
        }
      }
    }
    // Check if we should highlight a profile tab
    else if (stepData.highlightTab) {
      targetSelector = `[data-tab="${stepData.highlightTab}"]`;
      requiresInteraction = stepData.requiresInteraction !== undefined ? stepData.requiresInteraction : true;
      isProfileTab = true;

      // Force immediate re-positioning for tab transitions
      if (isPositioningRef.current === false) {
        setTimeout(() => {
          const el = document.querySelector(targetSelector);
          if (el) {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              // Force update
              isPositioningRef.current = false;
              positionHighlightBox();
            }
          }
        }, 50);
      }
    }
    // Check if we should highlight the upload button
    else if (stepData.highlightUploadButton) {
      targetSelector = '[data-tutorial="profile-upload-button"]';
      requiresInteraction = false; // Upload button doesn't require click interaction (handled by custom buttons)
      // Note: Even though requiresInteraction is false, we still want to show the overlay
      // The overlay will be non-interactive but visible
    }
    // Otherwise use the targetSelector directly
    else if (stepData.targetSelector) {
      targetSelector = stepData.targetSelector;
      // Only require interaction if this is a sidebar or navigation element
      requiresInteraction =
        stepData.targetArea === 'sidebar' ||
        (stepData.targetSelector && (
          stepData.targetSelector.includes('link') ||
          stepData.targetSelector.includes('nav-') ||
          stepData.targetSelector.includes('toggle')
        ));
    }

    if (!targetSelector) {
      setHighlightBox(null);
      cleanup();
      isPositioningRef.current = false;
      return;
    }

    // Find the target element - try multiple selectors for sidebar items
    let targetElement = document.querySelector(targetSelector);

    // If not found and it's a sidebar item, try alternative selectors
    if (!targetElement && stepData.highlightSidebarItem) {
      // Try the direct href selector
      const hrefSelector = `a[href="/dashboard/${stepData.highlightSidebarItem}"]`;
      targetElement = document.querySelector(hrefSelector);
      if (targetElement) {
      } else {
        // Try finding by NavLink structure
        const navLinks = document.querySelectorAll('a[href*="/dashboard/"]');
        for (const link of navLinks) {
          if (link.getAttribute('href') === `/dashboard/${stepData.highlightSidebarItem}`) {
            targetElement = link;
            break;
          }
        }
      }
    }

    if (targetElement) {
      // Get the element's position and dimensions
      let rect = targetElement.getBoundingClientRect();

      // Verify element has valid dimensions before proceeding
      // This prevents positioning at (0,0) when DOM isn't fully ready
      if (rect.width === 0 || rect.height === 0 || (rect.top === 0 && rect.left === 0 && rect.width < 10)) {
        isPositioningRef.current = false;
        // Retry after DOM is ready
        setTimeout(() => positionHighlightBox(), 100);
        return;
      }

      // Reset positioning flag since we found the element
      isPositioningRef.current = false;

      // If this element requires interaction, add a click listener
      if (requiresInteraction) {
        addInteractionListener(targetElement);

        if (isProfileTab) {
          // No longer needed as we allow direct interaction
        } else {
          targetElement.style.position = 'relative';
          targetElement.style.zIndex = '1';
        }
      } else {
        // If not requiring interaction, clean up any existing listeners
        cleanup();
      }

      // Get the element's position and dimensions
      // For mobile sidebar items, ensure we wait a bit for the sidebar to be fully rendered
      // rect already declared above, reuse it here

      // If on mobile and highlighting sidebar item, ensure element is visible
      if (isMobile && stepData.highlightSidebarItem && rect.width === 0 && rect.height === 0) {
        const checkDimensions = () => {
          const updatedRect = targetElement.getBoundingClientRect();
          if (updatedRect.width > 0 && updatedRect.height > 0) {
            const highlightBoxValue = {
              top: updatedRect.top + 'px',
              left: updatedRect.left + 'px',
              width: updatedRect.width + 'px',
              height: updatedRect.height + 'px',
              borderRadius: '8px',
              position: 'fixed',
              zIndex: requiresInteraction ? 9999 : 2500,
              pointerEvents: requiresInteraction ? 'auto' : 'none'
            };
            setHighlightBox(highlightBoxValue);
            // Ensure waitingForInteraction is set if needed
            if (requiresInteraction) {
              setWaitingForInteraction(true);
            }
          } else {
            setTimeout(checkDimensions, 100);
          }
        };
        setTimeout(checkDimensions, 200);
        return;
      }

      // Create the highlight box position to match the element exactly
      // Use a very high z-index to ensure it's above everything, including mobile sidebar (z-50 = 500)
      // Sidebar is z-50 (500), backdrop is z-40 (400), we need to be above both
      const highlight = {
        top: rect.top + 'px',
        left: rect.left + 'px',
        width: rect.width + 'px',
        height: rect.height + 'px',
        borderRadius: isProfileTab ? '8px' : '8px', // Match profile tab rounded-lg
        position: 'fixed',
        zIndex: requiresInteraction ? 10000 : 2500, // Very high z-index to be above mobile sidebar (z-50 = 500)
        pointerEvents: requiresInteraction ? 'auto' : 'none', // Ensure overlay is clickable when needed
        isolation: 'isolate' // Create new stacking context to ensure z-index works
      };

      // For profile tabs, ensure exact match with no extra height
      if (isProfileTab) {
        // Use exact dimensions - no adjustments needed
        highlight.top = rect.top + 'px';
        highlight.left = rect.left + 'px';
        highlight.width = rect.width + 'px';
        highlight.height = rect.height + 'px';
      }

      // For mobile devices, adjust left position of tabs to ensure they're visible
      if (isMobile && isProfileTab) {
        // Ensure tabs are scrolled into view
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });

        // Force a repaint to ensure the scrollIntoView has completed
        setTimeout(() => {
          const updatedRect = targetElement.getBoundingClientRect();
          const updatedHighlight = {
            ...highlight,
            top: updatedRect.top + 'px',
            left: updatedRect.left + 'px',
            width: updatedRect.width + 'px',
            height: updatedRect.height + 'px',
            zIndex: requiresInteraction ? 9999 : 2500
          };
          setHighlightBox(updatedHighlight);
        }, 300);
      } else {
        // For mobile sidebar items, add a small delay to ensure sidebar is fully rendered
        if (isMobile && stepData.highlightSidebarItem) {
          // Double-check that element is visible before setting highlight
          const checkAndSet = () => {
            const updatedRect = targetElement.getBoundingClientRect();
            if (updatedRect.width > 0 && updatedRect.height > 0) {
              const updatedHighlight = {
                ...highlight,
                top: updatedRect.top + 'px',
                left: updatedRect.left + 'px',
                width: updatedRect.width + 'px',
                height: updatedRect.height + 'px',
                zIndex: requiresInteraction ? 9999 : 2500,
                pointerEvents: requiresInteraction ? 'auto' : 'none'
              };
              setHighlightBox(updatedHighlight);
            } else {
              setTimeout(checkAndSet, 100);
            }
          };
          setTimeout(checkAndSet, 100);
        } else {
          setHighlightBox(highlight);
        }
      }
    } else {
      setHighlightBox(null);
      cleanup();
      isPositioningRef.current = false;
      isOpeningMenuRef.current = false; // Also reset menu opening flag
    }
  }, [stepData, isTutorialActive, cleanup, addInteractionListener]);

  // Create a resize handler function
  const handleResize = useCallback(() => {
    positionHighlightBox();
  }, [positionHighlightBox]);

  // Note: Sidebar link accessibility is now managed by Sidebar.js through conditional rendering
  // (locked items render as divs, unlocked as NavLinks). No DOM manipulation needed here.

  // Set up and clean up effects
  useEffect(() => {
    // Only set up if tutorial is active
    if (!isTutorialActive) {
      cleanup();
      // Reset sidebar opened flag when tutorial ends
      sidebarOpenedForTutorialRef.current = false;
      return;
    }

    // Position the highlight box initially
    positionHighlightBox();

    // Also position after a short delay to handle any dynamic rendering
    positionTimeoutRef.current = setTimeout(() => {
      positionHighlightBox();
    }, 300);

    // Store the resize handler and add event listener
    resizeListenerRef.current = handleResize;
    window.addEventListener('resize', resizeListenerRef.current);

    // Clean up event listener and timeout on unmount or when deps change
    return cleanup;
  }, [activeTutorial, currentStep, stepData, positionHighlightBox, cleanup, isTutorialActive, handleResize]); // Removed isMainSidebarCollapsed - not needed here


  const isUploadButton = !!stepData?.highlightUploadButton;
  const isProfileTab = !!stepData?.highlightTab;
  const requiresInteraction = stepData?.requiresInteraction !== undefined ? stepData.requiresInteraction : false;

  if (!highlightBox) {
    return null;
  }

  // Early return for elements that handle their own highlighting (Profile Tabs)
  if (isProfileTab) {
    return null;
  }

  const shouldShowOverlay = highlightBox && requiresInteraction;

  const uploadButtonStyles = `
    [data-tutorial="profile-upload-button"] {
      color: #000000 !important;
    }
    [data-tutorial="profile-upload-button"] span {
      color: #000000 !important;
    }
    [data-tutorial="profile-upload-button"] svg {
      color: #000000 !important;
    }
  `;

  return (
    <>
      {isUploadButton && (
        <style dangerouslySetInnerHTML={{ __html: uploadButtonStyles }} />
      )}
      {shouldShowOverlay && (
        <div
          className="tutorial-highlight fixed-overlay"
          style={{
            ...highlightBox,
            pointerEvents: requiresInteraction ? 'auto' : 'none',
            zIndex: requiresInteraction ? 10000 : 2500
          }}
          data-testid="tutorial-highlight-box"
        />
      )}
    </>
  );
};

export default SidebarHighlighter;
