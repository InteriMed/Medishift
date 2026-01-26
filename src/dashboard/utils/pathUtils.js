import { WORKSPACE_TYPES } from '../../utils/sessionAuth';

const SUPPORTED_LANGUAGES = ['en', 'fr', 'de', 'it'];

/**
 * Normalize pathname by removing language prefix and workspace ID for logical matching
 */
export const normalizePathname = (pathname) => {
  if (!pathname) return '/';

  let segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return '/';

  // Remove language prefix
  if (SUPPORTED_LANGUAGES.includes(segments[0])) {
    segments = segments.slice(1);
  }

  if (segments.length === 0) return '/';

  // Remove workspace ID from dashboard paths for logical matching (e.g., active states)
  if (segments[0] === 'dashboard' && segments.length > 2) {
    const wsId = segments[1];
    // Check if second segment is a known workspace type or ID
    if (wsId === 'personal' || wsId === 'admin' || wsId.length > 15) {
      // Return /dashboard/remaining/parts
      const remainingParts = segments.slice(2);
      return `/dashboard/${remainingParts.join('/')}`;
    }
  }

  const result = segments.join('/');
  return `/${result}`;
};

/**
 * Build a dashboard URL with workspace ID in the path
 */
export const buildDashboardUrl = (path, workspaceId) => {
  const cleanPath = path.startsWith('/dashboard') ? path.replace('/dashboard', '') : path;
  const parts = cleanPath.split('/').filter(Boolean);

  // If the first part is already a workspace ID, remove it to re-add later
  const firstPart = parts[0];
  const isKnownWorkspacePart = firstPart === 'personal' ||
    firstPart === 'admin' ||
    (firstPart && (firstPart.startsWith('facility_') || firstPart.length > 20));

  const finalPathParts = isKnownWorkspacePart ? parts.slice(1) : parts;
  const subPath = finalPathParts.join('/');

  const wsId = workspaceId || 'personal';
  return `/dashboard/${wsId}${subPath ? `/${subPath}` : ''}`;
};

/**
 * Get the default route for a workspace type
 */
export const getDefaultRouteForWorkspace = (workspaceType) => {
  switch (workspaceType) {
    case WORKSPACE_TYPES.ADMIN:
    case 'admin':
      return 'portal'; // Relative to /dashboard/:workspaceId/
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

/**
 * Get workspace ID for URL based on workspace object
 */
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

/**
 * Parse workspace from URL (supports both path and legacy query param)
 */
export const getWorkspaceFromUrl = (searchString, pathname) => {
  // Try path first
  if (pathname) {
    const parts = pathname.split('/').filter(Boolean);
    const dashboardIndex = parts.indexOf('dashboard');
    if (dashboardIndex !== -1 && parts.length > dashboardIndex + 1) {
      const wsId = parts[dashboardIndex + 1];
      // Basic validation for workspace ID
      if (wsId === 'personal' || wsId === 'admin' || wsId.length > 10) {
        return wsId;
      }
    }
  }

  // Fallback to query param
  const params = new URLSearchParams(searchString);
  return params.get('workspace');
};

/**
 * Build URL with workspace parameter preserved
 */
export const buildUrlWithWorkspace = (basePath, currentSearch, workspaceId) => {
  // If basePath already includes /dashboard/, we can injected workspaceId
  if (basePath.includes('/dashboard/')) {
    return buildDashboardUrl(basePath, workspaceId);
  }

  // Otherwise fallback to legacy query param style if it's not a dashboard route
  const params = new URLSearchParams(currentSearch);
  if (workspaceId) {
    params.set('workspace', workspaceId);
  }
  const queryString = params.toString();
  return `${basePath}${queryString ? `?${queryString}` : ''}`;
};

/**
 * Check if current path is within admin section
 */
export const isAdminPath = (pathname) => {
  return pathname.includes('/dashboard/admin');
};

/**
 * Check if current path is within facility section
 */
export const isFacilityPath = (pathname) => {
  // For path-based, we check if it's not personal and not admin
  const parts = pathname.split('/').filter(Boolean);
  const dashboardIndex = parts.indexOf('dashboard');
  if (dashboardIndex !== -1 && parts.length > dashboardIndex + 1) {
    const wsId = parts[dashboardIndex + 1];
    return wsId !== 'personal' && wsId !== 'admin';
  }
  return false;
};

/**
 * Get the workspace type from URL path
 */
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
