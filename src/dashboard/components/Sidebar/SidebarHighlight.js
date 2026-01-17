import React from 'react';
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
  if (!targetItem) return null;

  return (
    <>
      <style>{`
        @keyframes pulse-sidebar-highlight {
          0%, 100% {
            box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.3), 0 0 0 4px rgba(37, 99, 235, 0.2), 0 0 20px rgba(37, 99, 235, 0.4);
            border-color: rgba(37, 99, 235, 0.5);
            background-color: rgba(37, 99, 235, 0.08);
          }
          50% {
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.4), 0 0 0 6px rgba(37, 99, 235, 0.3), 0 0 30px rgba(37, 99, 235, 0.5);
            border-color: rgba(37, 99, 235, 0.7);
            background-color: rgba(37, 99, 235, 0.12);
          }
        }
        a[data-tutorial="${targetItem}-link"] {
          position: relative;
        }
        a[data-tutorial="${targetItem}-link"]::before {
          content: '';
          position: absolute;
          top: -4px;
          left: -4px;
          right: -4px;
          bottom: -4px;
          border-radius: 12px;
          background-color: rgba(37, 99, 235, 0.08);
          border: 2px solid rgba(37, 99, 235, 0.5);
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.3), 0 0 0 4px rgba(37, 99, 235, 0.2), 0 0 20px rgba(37, 99, 235, 0.4);
          animation: pulse-sidebar-highlight 2s ease-in-out infinite;
          pointer-events: none;
          z-index: 1;
        }
      `}</style>
    </>
  );
};

export default SidebarHighlight;

