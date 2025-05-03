import {
  FiHome,
  FiCalendar,
  FiMessageSquare,
  FiFileText,
  FiUser,
  FiSettings
} from 'react-icons/fi';

export const navigationItems = [
  {
    id: 'overview',
    title: 'dashboard.sidebar.overview',
    path: '/dashboard/overview',
    icon: FiHome
  },
  {
    id: 'calendar',
    title: 'dashboard.sidebar.calendar',
    path: '/dashboard/calendar',
    icon: FiCalendar
  },
  {
    id: 'messages',
    title: 'dashboard.sidebar.messages',
    path: '/dashboard/messages',
    icon: FiMessageSquare,
    badge: 'unreadMessages'
  },
  {
    id: 'contracts',
    title: 'dashboard.sidebar.contracts',
    path: '/dashboard/contracts',
    icon: FiFileText
  },
  {
    id: 'profile',
    title: 'dashboard.sidebar.profile',
    path: '/dashboard/profile',
    icon: FiUser
  },
  {
    id: 'settings',
    title: 'dashboard.sidebar.settings',
    path: '/dashboard/settings',
    icon: FiSettings
  }
]; 