import React, { useEffect } from 'react';
import { useTutorial } from '../../../../TutorialContext/TutorialContext';
import { useDashboard } from '../../../contexts/dashboardContext';
import { TUTORIAL_IDS } from '../../../../TutorialContext/config/tutorialSystem';

const SIDEBAR_ORDER = ['profile', 'messages', 'contracts', 'calendar', 'marketplace', 'payroll', 'organization', 'settings'];

const SidebarHighlight = ({ highlightSidebarItem }) => {
  const { isTutorialActive, activeTutorial, stepData, completedTutorials } = useTutorial();
  const { profileComplete, tutorialPassed } = useDashboard();

  const getNextSidebarItem = () => {
    // Only highlight items when tutorial is active
    if (!isTutorialActive) {
      return null;
    }

    if (highlightSidebarItem) {
      return highlightSidebarItem;
    }

    if (tutorialPassed) {
      return null;
    }

    const isProfileTabsComplete = completedTutorials?.[TUTORIAL_IDS.PROFILE_TABS] === true || completedTutorials?.[TUTORIAL_IDS.FACILITY_PROFILE_TABS] === true;
    const isProfileComplete = profileComplete === true;

    if (!isProfileTabsComplete && !isProfileComplete) {
      return 'profile';
    }

    for (const item of SIDEBAR_ORDER) {
      if (item === 'profile') {
        if (!isProfileTabsComplete && !isProfileComplete) {
          return 'profile';
        }
        continue;
      }

      const tutorialKey = item === 'messages' ? TUTORIAL_IDS.MESSAGES :
        item === 'contracts' ? TUTORIAL_IDS.CONTRACTS :
          item === 'calendar' ? TUTORIAL_IDS.CALENDAR :
            item === 'marketplace' ? TUTORIAL_IDS.MARKETPLACE :
              item === 'payroll' ? TUTORIAL_IDS.PAYROLL :
                item === 'organization' ? TUTORIAL_IDS.ORGANIZATION :
                  item === 'settings' ? TUTORIAL_IDS.ACCOUNT : null;

      if (tutorialKey && completedTutorials?.[tutorialKey] !== true) {
        return item;
      }
    }

    return null;
  };

  const targetItem = getNextSidebarItem();

  useEffect(() => {
    if (!targetItem || !isTutorialActive) return;

    const element = document.querySelector(`a[data-tutorial="${targetItem}-link"]`);
    if (element) {
      element.classList.add('tutorial-highlight');
    }
    return () => {
      if (element) {
        element.classList.remove('tutorial-highlight');
      }
    };
  }, [targetItem, isTutorialActive]);

  if (!targetItem) return null;

  return null;
};

export default SidebarHighlight;

