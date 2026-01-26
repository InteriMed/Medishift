import { getRouteById, getRouteByPath, buildRoutePath, ALL_ROUTES } from './appRoutes';
import { getRouteById as getDashboardRouteById, buildRouteUrl as buildDashboardRouteUrl } from '../dashboard/config/routes';
import { getLocalizedRoute } from '../i18n';

export const DEFAULT_LANGUAGE = 'fr';
export const SUPPORTED_LANGUAGES = ['en', 'fr', 'de', 'it'];

export const buildLocalizedPath = (routeId, lang = DEFAULT_LANGUAGE, params = {}) => {
  const route = getRouteById(routeId);
  if (!route) {
    console.warn(`[RouteHelpers] Route not found: ${routeId}`);
    return `/${lang}/home`;
  }

  let path = route.path;
  Object.keys(params).forEach(key => {
    path = path.replace(`:${key}`, params[key]);
  });

  return `/${lang}/${path}`;
};

export const buildDashboardPath = (routeId, lang = DEFAULT_LANGUAGE, workspaceId = null, params = {}) => {
  const route = getDashboardRouteById(routeId);
  if (!route) {
    console.warn(`[RouteHelpers] Dashboard route not found: ${routeId}`);
    return `/${lang}/dashboard/overview`;
  }

  const basePath = buildDashboardRouteUrl(routeId, workspaceId, params);
  return `/${lang}${basePath}`;
};

export const getRoutePath = (routeId, lang = DEFAULT_LANGUAGE) => {
  const route = getRouteById(routeId);
  if (!route) return null;
  return `/${lang}/${route.path}`;
};

export const getDashboardRoutePath = (routeId, lang = DEFAULT_LANGUAGE) => {
  const route = getDashboardRouteById(routeId);
  if (!route) return null;
  const basePath = buildDashboardRouteUrl(routeId, null, {});
  return `/${lang}${basePath}`;
};

export const isRouteProtected = (routeId) => {
  const route = getRouteById(routeId);
  return route?.requiresAuth === true;
};

export const isDashboardRoute = (path) => {
  return path.includes('/dashboard');
};

export const getRouteFromPath = (path, lang = DEFAULT_LANGUAGE) => {
  const cleanPath = path.replace(`/${lang}/`, '').replace(/^\//, '');
  return getRouteByPath(cleanPath);
};

export const ROUTE_IDS = {
  HOME: 'home',
  ABOUT: 'about',
  PROFESSIONALS: 'professionals',
  FACILITIES: 'facilities',
  FAQ: 'faq',
  CONTACT: 'contact',
  BLOG: 'blog',
  BLOG_POST: 'blog-post',
  PRIVACY_POLICY: 'privacy-policy',
  TERMS_OF_SERVICE: 'terms-of-service',
  SITEMAP: 'sitemap',
  LOADING: 'loading',
  NOT_FOUND: 'not-found',
  LOGIN: 'login',
  SIGNUP: 'signup',
  SIGNUP_STEP: 'signup-step',
  FORGOT_PASSWORD: 'forgot-password',
  VERIFICATION_SENT: 'verification-sent',
  ONBOARDING: 'onboarding',
  DASHBOARD: 'dashboard'
};

export const DASHBOARD_ROUTE_IDS = {
  OVERVIEW: 'overview',
  PROFILE: 'profile',
  CALENDAR: 'calendar',
  MESSAGES: 'messages',
  ANNOUNCEMENTS: 'announcements',
  CONTRACTS: 'contracts',
  MARKETPLACE: 'marketplace',
  PAYROLL: 'payroll',
  ORGANIZATION: 'organization',
  ADMIN_PORTAL: 'admin-portal',
  ADMIN_VERIFICATION: 'admin-verification',
  ADMIN_CRM: 'admin-crm'
};

export default {
  buildLocalizedPath,
  buildDashboardPath,
  getRoutePath,
  getDashboardRoutePath,
  isRouteProtected,
  isDashboardRoute,
  getRouteFromPath,
  ROUTE_IDS,
  DASHBOARD_ROUTE_IDS,
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES
};

