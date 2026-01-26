import React, { lazy } from 'react';
import {
  LoginPage,
  SignupPage,
  ForgotPasswordPage
} from '../pages/Auth';
import {
  HomePage,
  AboutPage,
  FacilitiesPage,
  ProfessionalsPage,
  FAQPage,
  ContactPage,
  BlogPage,
  PrivacyPolicyPage,
  TermsOfServicePage,
  SitemapPage,
  NotFoundPage,
  OnboardingPage
} from '../pages';
import VerificationSentPage from '../pages/Auth/VerificationSentPage';
import LoadingPage from '../pages/LoadingPage';

/**
 * CENTRALIZED APP ROUTE CONFIGURATION
 * Single source of truth for all main application routes
 * 
 * This file centralizes:
 * - Public routes (home, about, blog, etc.)
 * - Authentication routes (login, signup, etc.)
 * - Protected routes (onboarding, dashboard)
 * - Test routes (development only)
 * 
 * IMPORTANT: All route definitions MUST be in this file.
 * Use routeHelpers.js for building paths with language prefixes.
 * Use dashboard/config/routes.js for dashboard-specific routes.
 */

const GLNTestVerifPage = lazy(() => import('../pages/GLNTestVerifPage'));

export const ROUTE_TYPES = {
  PUBLIC: 'public',
  PROTECTED: 'protected',
  AUTH: 'auth',
  TEST: 'test'
};

export const PUBLIC_ROUTES = [
  {
    id: 'home',
    path: 'home',
    component: HomePage,
    type: ROUTE_TYPES.PUBLIC,
    label: 'Home'
  },
  {
    id: 'about',
    path: 'about',
    component: AboutPage,
    type: ROUTE_TYPES.PUBLIC,
    label: 'About'
  },
  {
    id: 'professionals',
    path: 'professionals',
    component: ProfessionalsPage,
    type: ROUTE_TYPES.PUBLIC,
    label: 'Professionals'
  },
  {
    id: 'facilities',
    path: 'facilities',
    component: FacilitiesPage,
    type: ROUTE_TYPES.PUBLIC,
    label: 'Facilities'
  },
  {
    id: 'faq',
    path: 'faq',
    component: FAQPage,
    type: ROUTE_TYPES.PUBLIC,
    label: 'FAQ'
  },
  {
    id: 'contact',
    path: 'contact',
    component: ContactPage,
    type: ROUTE_TYPES.PUBLIC,
    label: 'Contact'
  },
  {
    id: 'blog',
    path: 'blog',
    component: BlogPage,
    type: ROUTE_TYPES.PUBLIC,
    label: 'Blog'
  },
  {
    id: 'blog-post',
    path: 'blog/:slug',
    component: lazy(() => import('../pages/Blog/BlogPost').catch(() => ({ default: () => <div>Blog post not found</div> }))),
    type: ROUTE_TYPES.PUBLIC,
    label: 'Blog Post',
    hidden: true
  },
  {
    id: 'privacy-policy',
    path: 'privacy-policy',
    component: PrivacyPolicyPage,
    type: ROUTE_TYPES.PUBLIC,
    label: 'Privacy Policy'
  },
  {
    id: 'terms-of-service',
    path: 'terms-of-service',
    component: TermsOfServicePage,
    type: ROUTE_TYPES.PUBLIC,
    label: 'Terms of Service'
  },
  {
    id: 'sitemap',
    path: 'sitemap',
    component: SitemapPage,
    type: ROUTE_TYPES.PUBLIC,
    label: 'Sitemap'
  },
  {
    id: 'loading',
    path: 'loading',
    component: LoadingPage,
    type: ROUTE_TYPES.PUBLIC,
    label: 'Loading',
    hidden: true
  },
  {
    id: 'not-found',
    path: 'not-found',
    component: NotFoundPage,
    type: ROUTE_TYPES.PUBLIC,
    label: 'Not Found',
    hidden: true
  }
];

export const AUTH_ROUTES = [
  {
    id: 'login',
    path: 'login',
    component: LoginPage,
    type: ROUTE_TYPES.AUTH,
    label: 'Login',
    requiresAuth: false
  },
  {
    id: 'signup',
    path: 'signup',
    component: SignupPage,
    type: ROUTE_TYPES.AUTH,
    label: 'Sign Up',
    requiresAuth: false
  },
  {
    id: 'signup-step',
    path: 'signup/:step',
    component: SignupPage,
    type: ROUTE_TYPES.AUTH,
    label: 'Sign Up Step',
    requiresAuth: false,
    hidden: true
  },
  {
    id: 'forgot-password',
    path: 'forgot-password',
    component: ForgotPasswordPage,
    type: ROUTE_TYPES.AUTH,
    label: 'Forgot Password',
    requiresAuth: false
  },
  {
    id: 'verification-sent',
    path: 'verification-sent',
    component: VerificationSentPage,
    type: ROUTE_TYPES.AUTH,
    label: 'Verification Sent',
    requiresAuth: false,
    hidden: true
  }
];

export const PROTECTED_ROUTES = [
  {
    id: 'onboarding',
    path: 'onboarding',
    component: OnboardingPage,
    type: ROUTE_TYPES.PROTECTED,
    label: 'Onboarding',
    requiresAuth: true
  },
  {
    id: 'dashboard',
    path: 'dashboard/*',
    component: lazy(() => import('../dashboard/DashboardRoot')),
    type: ROUTE_TYPES.PROTECTED,
    label: 'Dashboard',
    requiresAuth: true,
    hidden: true
  }
];

export const TEST_ROUTES = [
  {
    id: 'glntestverif',
    path: 'glntestverif',
    component: GLNTestVerifPage,
    type: ROUTE_TYPES.TEST,
    label: 'GLN Test Verification',
    hidden: true
  }
];

export const SPECIAL_ROUTES = {
  ROOT: {
    id: 'root',
    path: '/',
    type: 'special',
    label: 'Root'
  },
  LANG_ROOT: {
    id: 'lang-root',
    path: '/:lang',
    type: 'special',
    label: 'Language Root'
  },
  CATCH_ALL: {
    id: 'catch-all',
    path: '*',
    type: 'special',
    label: 'Catch All'
  },
  DASHBOARD_DIRECT: {
    id: 'dashboard-direct',
    path: '/dashboard/*',
    type: 'special',
    label: 'Dashboard Direct'
  }
};

export const ALL_ROUTES = [
  ...PUBLIC_ROUTES,
  ...AUTH_ROUTES,
  ...PROTECTED_ROUTES,
  ...TEST_ROUTES
];

export const getRouteById = (routeId) => {
  return ALL_ROUTES.find(route => route.id === routeId);
};

export const getRouteByPath = (path) => {
  const cleanPath = path.replace(/^\/[a-z]{2}\//, '').replace(/^\//, '');
  return ALL_ROUTES.find(route => {
    if (route.path.includes(':')) {
      const routePattern = route.path.replace(/:[^/]+/g, '[^/]+');
      const regex = new RegExp(`^${routePattern}$`);
      return regex.test(cleanPath);
    }
    return route.path === cleanPath || cleanPath.startsWith(route.path);
  });
};

export const getRoutesByType = (type) => {
  return ALL_ROUTES.filter(route => route.type === type);
};

export const buildRoutePath = (routeId, params = {}) => {
  const route = getRouteById(routeId);
  if (!route) return '/';
  
  let path = route.path;
  Object.keys(params).forEach(key => {
    path = path.replace(`:${key}`, params[key]);
  });
  
  return path;
};

export default {
  ROUTE_TYPES,
  PUBLIC_ROUTES,
  AUTH_ROUTES,
  PROTECTED_ROUTES,
  TEST_ROUTES,
  ALL_ROUTES,
  getRouteById,
  getRouteByPath,
  getRoutesByType,
  buildRoutePath
};

