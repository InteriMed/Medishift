import {
  FiCalendar,
  FiMessageSquare,
  FiFileText,
  FiUser,
  FiBox
} from 'react-icons/fi';

export const pageConfig = {
  '/dashboard/calendar': {
    icon: FiCalendar,
    titleKey: 'dashboard.header.calendar.title',
    subtitleKey: 'dashboard.header.calendar.subtitle'
  },
  '/dashboard/messages': {
    icon: FiMessageSquare,
    titleKey: 'dashboard.header.messages.title',
    subtitleKey: 'dashboard.header.messages.subtitle'
  },
  '/dashboard/contracts': {
    icon: FiFileText,
    titleKey: 'dashboard.header.contracts.title',
    subtitleKey: 'dashboard.header.contracts.subtitle'
  },
  '/dashboard/profile': {
    icon: FiUser,
    titleKey: 'dashboard.header.profile.title',
    subtitleKey: 'dashboard.header.profile.subtitle'
  },
  '/dashboard/marketplace': {
    icon: FiBox,
    titleKey: 'dashboard.header.marketplace.title',
    subtitleKey: 'dashboard.header.marketplace.subtitle'
  }
};

export const getPageConfig = (pathname) => {
  const exactMatch = pageConfig[pathname];
  if (exactMatch) return exactMatch;

  for (const [path, config] of Object.entries(pageConfig)) {
    if (pathname.startsWith(path)) {
      return config;
    }
  }

  return null;
};

