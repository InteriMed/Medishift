import {
  FiHome,
  FiUser,
  FiSettings,
  FiBarChart2,
  FiCalendar,
  FiMail,
  FiUsers,
  FiFileText,
  FiDollarSign
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
    title: 'Calendar',
    path: 'calendar',
    icon: FiCalendar,
  },
  {
    title: 'Communications',
    path: 'communications',
    icon: FiMail,
    badge: 3
  },
  {
    title: 'Entity',
    path: 'entity',
    icon: FiUsers,
  },
  {
    title: 'Payroll',
    path: 'payroll',
    icon: FiDollarSign,
  },
  {
    title: 'Settings',
    path: 'settings',
    icon: FiSettings,
  }
];
