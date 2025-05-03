import { lazy } from 'react';
import { FiCalendar, FiClipboard, FiGrid, FiMessageSquare, FiSettings, FiUsers } from 'react-icons/fi';

// Lazy load components
const Dashboard = lazy(() => import('../pages/Dashboard'));
const Calendar = lazy(() => import('../features/calendar/Calendar'));
const Tasks = lazy(() => import('../features/tasks/Tasks'));
const Chat = lazy(() => import('../features/chat/Chat'));
const Projects = lazy(() => import('../features/projects/Projects'));
const Team = lazy(() => import('../features/team/Team'));
const Settings = lazy(() => import('../features/settings/Settings'));

// Define routes with a nested structure
export const routes = [
  {
    path: '',
    element: <Dashboard />,
    title: 'dashboard.overview',
    icon: <FiGrid />,
    exact: true
  },
  {
    path: 'calendar',
    element: <Calendar />,
    title: 'dashboard.calendar.title',
    icon: <FiCalendar />
  },
  {
    path: 'tasks',
    element: <Tasks />,
    title: 'dashboard.tasks.title',
    icon: <FiClipboard />
  },
  {
    path: 'chat',
    element: <Chat />,
    title: 'dashboard.chat.title',
    icon: <FiMessageSquare />
  },
  {
    path: 'projects',
    element: <Projects />,
    title: 'dashboard.projects.title',
    icon: <FiGrid />
  },
  {
    path: 'team',
    element: <Team />,
    title: 'dashboard.team.title',
    icon: <FiUsers />
  },
  {
    path: 'settings',
    element: <Settings />,
    title: 'dashboard.settings.title',
    icon: <FiSettings />
  }
];

// Export flattened routes for use in the router
export const flattenedRoutes = routes.flatMap(route => {
  if (route.children) {
    return [
      { path: route.path, element: route.element, exact: route.exact },
      ...route.children.map(child => ({
        path: `${route.path}/${child.path}`,
        element: child.element,
        exact: child.exact
      }))
    ];
  }
  return [route];
}); 