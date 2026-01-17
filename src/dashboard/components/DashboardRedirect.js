import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getSavedDashboardRoute } from '../utils/routePersistence';
import { useDashboard } from '../contexts/DashboardContext';

const DashboardRedirect = () => {
  const [targetRoute, setTargetRoute] = useState(null);
  const [isChecking, setIsChecking] = useState(true);
  const { isLoading, selectedWorkspace, user, userProfile } = useDashboard();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const savedRoute = getSavedDashboardRoute();
    
    if (savedRoute) {
      const pathAndSearch = savedRoute.replace('/dashboard', '');
      let relativePath = pathAndSearch.split('?')[0];
      const search = pathAndSearch.includes('?') ? pathAndSearch.substring(pathAndSearch.indexOf('?')) : '';
      
      if (!relativePath || relativePath === '/' || relativePath === '') {
        relativePath = 'overview';
      } else {
        relativePath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
      }

      if (relativePath.startsWith('organization')) {
        if (!selectedWorkspace || (!user && !userProfile)) {
          return;
        }
      }
      
      setTargetRoute(relativePath + search);
      setIsChecking(false);
    } else {
      setTargetRoute('overview');
      setIsChecking(false);
    }
  }, [isLoading, selectedWorkspace, user, userProfile]);

  if (isChecking || isLoading) {
    return null;
  }

  return <Navigate to={targetRoute} replace />;
};

export default DashboardRedirect;

