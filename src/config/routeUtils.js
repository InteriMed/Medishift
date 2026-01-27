import { WORKSPACE_TYPES } from './keysDatabase';

const SUPPORTED_LANGUAGES = ['en', 'fr', 'de', 'it'];

export const normalizePathname = (pathname) => {
  if (!pathname) return '/';

  let segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return '/';

  if (SUPPORTED_LANGUAGES.includes(segments[0])) {
    segments = segments.slice(1);
  }

  if (segments.length === 0) return '/';

  if (segments[0] === 'dashboard' && segments.length > 2) {
    const wsId = segments[1];
    if (wsId === 'personal' || wsId === 'admin' || wsId.length > 15) {
      const remainingParts = segments.slice(2);
      return `/dashboard/${remainingParts.join('/')}`;
    }
  }

  const result = segments.join('/');
  return `/${result}`;
};

export const buildDashboardUrl = (path, workspaceId) => {
  if (!path) {
    const wsId = workspaceId || 'personal';
    return `/dashboard/${wsId}`;
  }
  
  const queryIndex = path.indexOf('?');
  const queryString = queryIndex !== -1 ? path.substring(queryIndex) : '';
  const pathWithoutQuery = queryIndex !== -1 ? path.substring(0, queryIndex) : path;
  
  let cleanPath = pathWithoutQuery.startsWith('/dashboard') ? pathWithoutQuery.replace('/dashboard', '') : pathWithoutQuery;
  cleanPath = cleanPath.startsWith('/') ? cleanPath.substring(1) : cleanPath;
  const parts = cleanPath.split('/').filter(Boolean);

  const firstPart = parts[0];
  const isKnownWorkspacePart = firstPart === 'personal' ||
    firstPart === 'admin' ||
    (firstPart && (firstPart.startsWith('facility_') || firstPart.length > 20));

  const finalPathParts = isKnownWorkspacePart ? parts.slice(1) : parts;
  const subPath = finalPathParts.join('/');

  const wsId = workspaceId || 'personal';
  return `/dashboard/${wsId}${subPath ? `/${subPath}` : ''}${queryString}`;
};

export const getDefaultRouteForWorkspace = (workspaceType) => {
  switch (workspaceType) {
    case WORKSPACE_TYPES.ADMIN:
    case 'admin':
      return 'portal';
    case WORKSPACE_TYPES.TEAM:
    case 'facility':
    case 'team':
      return 'overview';
    case WORKSPACE_TYPES.PERSONAL:
    case 'personal':
    default:
      return 'overview';
  }
};

export const getWorkspaceIdForUrl = (workspace) => {
  if (!workspace) return 'personal';

  switch (workspace.type) {
    case WORKSPACE_TYPES.ADMIN:
      return 'admin';
    case WORKSPACE_TYPES.PERSONAL:
      return 'personal';
    case WORKSPACE_TYPES.TEAM:
      return workspace.facilityId || workspace.id;
    default:
      return workspace.id;
  }
};

export const getWorkspaceFromUrl = (searchString, pathname) => {
  if (pathname) {
    const parts = pathname.split('/').filter(Boolean);
    const dashboardIndex = parts.indexOf('dashboard');
    if (dashboardIndex !== -1 && parts.length > dashboardIndex + 1) {
      const wsId = parts[dashboardIndex + 1];
      if (wsId === 'personal' || wsId === 'admin' || wsId.length > 10) {
        return wsId;
      }
    }
  }

  const params = new URLSearchParams(searchString);
  return params.get('workspace');
};

export const buildUrlWithWorkspace = (basePath, currentSearch, workspaceId) => {
  if (basePath.includes('/dashboard/')) {
    return buildDashboardUrl(basePath, workspaceId);
  }

  const params = new URLSearchParams(currentSearch);
  if (workspaceId) {
    params.set('workspace', workspaceId);
  }
  const queryString = params.toString();
  return `${basePath}${queryString ? `?${queryString}` : ''}`;
};

export const isAdminPath = (pathname) => {
  return pathname.includes('/dashboard/admin');
};

export const isFacilityPath = (pathname) => {
  const parts = pathname.split('/').filter(Boolean);
  const dashboardIndex = parts.indexOf('dashboard');
  if (dashboardIndex !== -1 && parts.length > dashboardIndex + 1) {
    const wsId = parts[dashboardIndex + 1];
    return wsId !== 'personal' && wsId !== 'admin';
  }
  return false;
};

export const getWorkspaceTypeFromPath = (pathname) => {
  if (isAdminPath(pathname)) {
    return WORKSPACE_TYPES.ADMIN;
  }
  const parts = pathname.split('/').filter(Boolean);
  const dashboardIndex = parts.indexOf('dashboard');
  if (dashboardIndex !== -1 && parts.length > dashboardIndex + 1) {
    const wsId = parts[dashboardIndex + 1];
    if (wsId === 'personal') return WORKSPACE_TYPES.PERSONAL;
    if (wsId === 'admin') return WORKSPACE_TYPES.ADMIN;
    return WORKSPACE_TYPES.TEAM;
  }
  return WORKSPACE_TYPES.PERSONAL;
};

export const getRelativePathFromUrl = (pathname) => {
  if (!pathname) return '';
  
  let segments = pathname.split('/').filter(Boolean);
  
  const dashboardIndex = segments.indexOf('dashboard');
  if (dashboardIndex === -1) return '';
  
  if (segments.length <= dashboardIndex + 1) return '';
  
  const workspaceId = segments[dashboardIndex + 1];
  const isKnownWorkspace = workspaceId === 'personal' || 
    workspaceId === 'admin' || 
    workspaceId.length > 15;
  
  if (!isKnownWorkspace) return '';
  
  const remainingParts = segments.slice(dashboardIndex + 2);
  return remainingParts.join('/');
};

export const buildRelativeUrl = (path) => {
  if (!path) return '';
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  return cleanPath.startsWith('dashboard/') ? cleanPath.replace('dashboard/', '') : cleanPath;
};

export const getOrganizationBasePath = (workspace) => {
  if (!workspace) return 'facility';
  const isOrganizationWorkspace = workspace.type === 'organization';
  return isOrganizationWorkspace ? 'organization' : 'facility';
};

export const isPathValidForWorkspace = (relativePath, workspaceType) => {
  if (!relativePath || !workspaceType) return false;
  
  if (workspaceType === WORKSPACE_TYPES.ADMIN) {
    return true;
  }
  
  return true;
};

