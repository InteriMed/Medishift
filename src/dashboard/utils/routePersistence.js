const DASHBOARD_ROUTE_KEY = 'medishift_dashboard_route';

export const saveDashboardRoute = (pathname) => {
  if (!pathname || !pathname.startsWith('/dashboard')) {
    return;
  }

  try {
    const routeData = {
      path: pathname,
      timestamp: Date.now()
    };
    localStorage.setItem(DASHBOARD_ROUTE_KEY, JSON.stringify(routeData));
  } catch (error) {
    console.error('[RoutePersistence] Error saving route:', error);
  }
};

export const getSavedDashboardRoute = () => {
  try {
    const saved = localStorage.getItem(DASHBOARD_ROUTE_KEY);
    if (!saved) {
      return null;
    }

    const routeData = JSON.parse(saved);
    
    if (!routeData.path || !routeData.path.startsWith('/dashboard')) {
      return null;
    }

    const MAX_AGE = 24 * 60 * 60 * 1000;
    const age = Date.now() - routeData.timestamp;
    
    if (age > MAX_AGE) {
      localStorage.removeItem(DASHBOARD_ROUTE_KEY);
      return null;
    }

    return routeData.path;
  } catch (error) {
    console.error('[RoutePersistence] Error reading saved route:', error);
    localStorage.removeItem(DASHBOARD_ROUTE_KEY);
    return null;
  }
};

export const clearSavedDashboardRoute = () => {
  try {
    localStorage.removeItem(DASHBOARD_ROUTE_KEY);
  } catch (error) {
    console.error('[RoutePersistence] Error clearing saved route:', error);
  }
};










