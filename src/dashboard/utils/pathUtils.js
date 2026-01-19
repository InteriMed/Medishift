const SUPPORTED_LANGUAGES = ['en', 'fr', 'de', 'it'];

export const normalizePathname = (pathname) => {
  if (!pathname) return '/';
  
  const segments = pathname.split('/').filter(Boolean);
  
  if (segments.length === 0) return '/';
  
  const firstSegment = segments[0];
  
  if (SUPPORTED_LANGUAGES.includes(firstSegment)) {
    const remainingPath = segments.slice(1).join('/');
    return remainingPath ? `/${remainingPath}` : '/';
  }
  
  return pathname.startsWith('/') ? pathname : `/${pathname}`;
};

export const buildDashboardUrl = (path, workspaceId) => {
  const cleanPath = path.startsWith('/dashboard') ? path.replace('/dashboard', '') : path;
  const finalPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
  const searchParams = new URLSearchParams();
  if (workspaceId) {
    searchParams.set('workspace', workspaceId);
  }
  const queryString = searchParams.toString();
  return `/dashboard${finalPath}${queryString ? `?${queryString}` : ''}`;
};

export const getDefaultRouteForWorkspace = (workspaceType) => {
  if (workspaceType === 'admin') {
    return '/dashboard/admin/portal';
  }
  return '/dashboard/overview';
};

