import {
  FiHome,
  FiCalendar,
  FiMessageSquare,
  FiUsers,
  FiUser,
  FiSettings,
  FiDollarSign
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
    id: 'communications',
    title: 'dashboard.sidebar.communication',
    path: '/dashboard/communications',
    icon: FiMessageSquare,
    badge: 'unreadMessages'
  },
  {
    id: 'entity',
    title: 'dashboard.sidebar.entity',
    path: '/dashboard/entity',
    icon: FiUsers
  },
  {
    id: 'payroll',
    title: 'dashboard.sidebar.payroll',
    path: '/dashboard/payroll',
    icon: FiDollarSign
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
