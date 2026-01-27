import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { saveDashboardRoute } from '../../config/routePersistence';

const RouteTracker = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname.startsWith('/dashboard')) {
      const fullPath = location.pathname + (location.search || '');
      saveDashboardRoute(fullPath);
    }
  }, [location.pathname, location.search]);

  return null;
};

export default RouteTracker;

