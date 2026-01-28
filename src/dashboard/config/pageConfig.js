export const PAGE_CONFIG = {
  dashboard: {
    id: 'dashboard',
    title: 'Dashboard',
    path: '/dashboard'
  },
  overview: {
    id: 'overview',
    title: 'Overview',
    path: '/dashboard/overview'
  },
  calendar: {
    id: 'calendar',
    title: 'Calendar',
    path: '/dashboard/calendar'
  },
  communications: {
    id: 'communications',
    title: 'Communications',
    path: '/dashboard/communications'
  },
  profile: {
    id: 'profile',
    title: 'Profile',
    path: '/dashboard/profile'
  },
  marketplace: {
    id: 'marketplace',
    title: 'Marketplace',
    path: '/dashboard/marketplace'
  },
  organization: {
    id: 'organization',
    title: 'Organization',
    path: '/dashboard/organization'
  },
  entity: {
    id: 'entity',
    title: 'Entity',
    path: '/dashboard/entity'
  },
  support: {
    id: 'support',
    title: 'Support',
    path: '/dashboard/support'
  }
};

export const getPageConfig = (pageId) => {
  return PAGE_CONFIG[pageId] || null;
};

export default PAGE_CONFIG;

