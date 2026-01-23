# CENTRALIZED ROUTE MANAGEMENT SYSTEM

## Overview
This codebase uses a **single source of truth** for all route definitions. All routes are centralized in configuration files, and helper utilities provide consistent path building across the application.

## Route Configuration Files

### 1. Main App Routes
**File:** `src/config/appRoutes.js`

Defines all main application routes:
- **PUBLIC_ROUTES**: Public pages (home, about, blog, etc.)
- **AUTH_ROUTES**: Authentication pages (login, signup, etc.)
- **PROTECTED_ROUTES**: Protected pages (onboarding, dashboard)
- **TEST_ROUTES**: Development test pages

### 2. Dashboard Routes
**File:** `src/dashboard/config/routes.js`

Defines all dashboard-specific routes:
- **SHARED_ROUTES**: Accessible from all workspaces
- **PROFESSIONAL_ROUTES**: Personal workspace routes
- **FACILITY_ROUTES**: Team workspace routes
- **ADMIN_ROUTES**: Admin workspace routes

### 3. Route Helpers
**File:** `src/config/routeHelpers.js`

Provides utility functions for:
- Building localized paths with language prefixes
- Building dashboard paths with workspace support
- Route ID constants for type-safe route references
- Route validation and lookup functions

## Usage

### Building Routes

```javascript
import { buildLocalizedPath, ROUTE_IDS } from '../config/routeHelpers';

// Build a localized path
const homePath = buildLocalizedPath(ROUTE_IDS.HOME, 'fr');
// Returns: "/fr/home"

// Build with parameters
const blogPath = buildLocalizedPath(ROUTE_IDS.BLOG_POST, 'en', { slug: 'my-post' });
// Returns: "/en/blog/my-post"
```

### Dashboard Routes

```javascript
import { buildDashboardPath, DASHBOARD_ROUTE_IDS } from '../config/routeHelpers';

// Build a dashboard path
const profilePath = buildDashboardPath(DASHBOARD_ROUTE_IDS.PROFILE, 'fr');
// Returns: "/fr/dashboard/profile"
```

### Route Constants

```javascript
import { ROUTE_IDS, DASHBOARD_ROUTE_IDS } from '../config/routeHelpers';

// Use constants instead of hardcoded strings
navigate(buildLocalizedPath(ROUTE_IDS.LOGIN, lang));
navigate(buildDashboardPath(DASHBOARD_ROUTE_IDS.OVERVIEW, lang));
```

## Route IDs

### Main App Route IDs
- `HOME`, `ABOUT`, `PROFESSIONALS`, `FACILITIES`
- `FAQ`, `CONTACT`, `BLOG`, `BLOG_POST`
- `PRIVACY_POLICY`, `TERMS_OF_SERVICE`, `SITEMAP`
- `LOGIN`, `SIGNUP`, `FORGOT_PASSWORD`, `VERIFICATION_SENT`
- `ONBOARDING`, `DASHBOARD`, `NOT_FOUND`, `LOADING`

### Dashboard Route IDs
- `OVERVIEW`, `PROFILE`, `CALENDAR`, `MESSAGES`, `CONTRACTS`
- `MARKETPLACE`, `PAYROLL`, `ORGANIZATION`
- `ADMIN_PORTAL`, `ADMIN_VERIFICATION`, `ADMIN_CRM`, etc.

## Important Rules

1. **NEVER hardcode route paths** - Always use route helpers
2. **NEVER define routes outside config files** - All routes must be in:
   - `src/config/appRoutes.js` (main app)
   - `src/dashboard/config/routes.js` (dashboard)
3. **ALWAYS use route constants** - Use `ROUTE_IDS` and `DASHBOARD_ROUTE_IDS`
4. **ALWAYS use helper functions** - Use `buildLocalizedPath()` and `buildDashboardPath()`

## Route Structure

### Main App Routes
Routes are defined relative to `/:lang` prefix:
- Path: `home` → Full path: `/:lang/home`
- Path: `blog/:slug` → Full path: `/:lang/blog/:slug`

### Dashboard Routes
Routes are defined relative to `/dashboard`:
- Path: `overview` → Full path: `/:lang/dashboard/overview`
- Path: `profile/*` → Full path: `/:lang/dashboard/profile/*`

## Adding New Routes

1. **Main App Route:**
   - Add to appropriate array in `src/config/appRoutes.js`
   - Add route ID to `ROUTE_IDS` in `src/config/routeHelpers.js`
   - Use `buildLocalizedPath()` to build paths

2. **Dashboard Route:**
   - Add to appropriate array in `src/dashboard/config/routes.js`
   - Add route ID to `DASHBOARD_ROUTE_IDS` in `src/dashboard/config/routes.js`
   - Use `buildDashboardPath()` to build paths

## Migration Guide

If you find hardcoded routes:
1. Check if route exists in config files
2. If not, add it to appropriate config file
3. Replace hardcoded path with helper function
4. Use route constants instead of strings

Example:
```javascript
// ❌ BAD
navigate('/fr/login');

// ✅ GOOD
import { buildLocalizedPath, ROUTE_IDS } from '../config/routeHelpers';
navigate(buildLocalizedPath(ROUTE_IDS.LOGIN, 'fr'));
```

