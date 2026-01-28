import React, { useEffect } from 'react';
import { useDashboard } from '../../../contexts/dashboardContext';

const SIDEBAR_ORDER = ['profile', 'messages', 'contracts', 'calendar', 'marketplace', 'payroll', 'organization', 'settings'];

const SidebarHighlight = ({ highlightSidebarItem }) => {
  const { profileComplete, tutorialPassed } = useDashboard();

  return null;
};

export default SidebarHighlight;

