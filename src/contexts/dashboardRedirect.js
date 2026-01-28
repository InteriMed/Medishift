import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useWorkspaceAccess } from '../hooks/useWorkspaceAccess';

const DashboardRedirect = () => {
  const [targetRoute, setTargetRoute] = useState(null);
  const [isChecking, setIsChecking] = useState(true);
  const { workspaces, loading, currentWorkspace } = useWorkspaceAccess();
  const location = useLocation();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (location.pathname.includes('/profile')) {
      return;
    }

    if (workspaces.length === 0) {
      setTargetRoute('overview');
      setIsChecking(false);
      return;
    }

    if (currentWorkspace) {
      switch (currentWorkspace.type) {
        case 'admin':
          setTargetRoute('portal');
          break;
        case 'organization':
          setTargetRoute('organization');
          break;
        default:
          setTargetRoute('overview');
      }
    } else {
      setTargetRoute('overview');
    }
    
    setIsChecking(false);
  }, [loading, workspaces, currentWorkspace, location.pathname]);

  if (isChecking || loading) {
    return null;
  }

  if (location.pathname.includes('/profile')) {
    return null;
  }

  return <Navigate to={targetRoute} replace />;
};

export default DashboardRedirect;

