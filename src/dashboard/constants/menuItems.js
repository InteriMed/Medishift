// Dashboard menu items configuration
import {
  FiHome,
  FiUser,
  FiSettings,
  FiBarChart2,
  FiCalendar,
  FiMail,
  FiUsers,
  FiFileText
} from 'react-icons/fi';

export const menuItems = [
  {
    title: 'Overview',
    path: 'overview',
    icon: FiHome,
  },
  {
    title: 'Profile',
    path: 'profile',
    icon: FiUser,
  },
  {
    title: 'Analytics',
    path: 'analytics',
    icon: FiBarChart2,
  },
  {
    title: 'Calendar',
    path: 'calendar',
    icon: FiCalendar,
  },
  {
    title: 'Messages',
    path: 'communications',
    icon: FiMail,
    badge: 3
  },
  {
    title: 'Settings',
    path: 'settings',
    icon: FiSettings,
  },
  {
    title: 'Contracts',
    path: 'contracts',
    icon: FiFileText,
  },
  {
    title: 'Team',
    path: 'team',
    icon: FiUsers,
  }
]; 