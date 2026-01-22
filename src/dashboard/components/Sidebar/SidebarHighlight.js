import React, { useEffect } from 'react';
import { useTutorial } from '../../contexts/TutorialContext';
import { useDashboard } from '../../contexts/DashboardContext';

const SIDEBAR_ORDER = ['profile', 'messages', 'contracts', 'calendar', 'marketplace', 'payroll', 'organization', 'settings'];

const SidebarHighlight = ({ highlightSidebarItem }) => {
  const { isTutorialActive, activeTutorial, stepData } = useTutorial();
  const { completedTutorials = [], profileComplete, tutorialPassed } = useDashboard();

  const getNextSidebarItem = () => {
    if (highlightSidebarItem) {
      return highlightSidebarItem;
    }

    if (tutorialPassed) {
      return null;
    }

    const isProfileTabsComplete = completedTutorials.includes('profileTabs') || completedTutorials.includes('facilityProfileTabs');
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

      const tutorialKey = item === 'messages' ? 'messages' :
        item === 'contracts' ? 'contracts' :
          item === 'calendar' ? 'calendar' :
            item === 'marketplace' ? 'marketplace' :
              item === 'payroll' ? 'payroll' :
                item === 'organization' ? 'organization' :
                  item === 'settings' ? 'settings' : null;

      if (tutorialKey && !completedTutorials.includes(tutorialKey)) {
        return item;
      }
    }

    return null;
  };

  const targetItem = getNextSidebarItem();

  useEffect(() => {
    if (!targetItem) return;
    
    const element = document.querySelector(`a[data-tutorial="${targetItem}-link"]`);
    if (element) {
      element.classList.add('tutorial-highlight');
    }
    return () => {
      if (element) {
        element.classList.remove('tutorial-highlight');
      }
    };
  }, [targetItem]);

  if (!targetItem) return null;

  return null;
};

export default SidebarHighlight;

