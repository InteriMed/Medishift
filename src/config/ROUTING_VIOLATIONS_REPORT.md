# ROUTING VIOLATIONS REPORT

## EXECUTIVE SUMMARY

This report identifies all hardcoded routing paths found in the dashboard code that should instead use the centralized route management system defined in:
- `src/config/appRoutes.js` (main app routes)
- `src/dashboard/config/routes.js` (dashboard routes)  
- `src/config/routeHelpers.js` (route building helpers)
- `src/dashboard/utils/pathUtils.js` (dashboard path utilities)

**Current State:**
- Central route management system EXISTS and is partially implemented
- `ROUTES_README.md` documents the correct approach
- Many components still use hardcoded paths instead of centralized constants

---

## VIOLATIONS BY CATEGORY

### CATEGORY 1: Direct navigate() calls with hardcoded paths

#### 1.1 Header Component
**File:** `src/dashboard/components/Header/Header.js`
```javascript
// Line 165
navigate('/login');

// Line 507
navigate('/dashboard/profile');

// Line 510  
navigate('/dashboard/profile/settings');
```
**Impact:** High - User profile navigation
**Fix Required:** Use `buildDashboardUrl()` with route constants

---

#### 1.2 DashboardContext
**File:** `src/dashboard/contexts/DashboardContext.js`
```javascript
// Line 488
navigate(`/${lang}/onboarding?type=professional`, { replace: true });

// Line 504
navigate(`/${lang}/onboarding?type=facility`, { replace: true });

// Line 880
navigate(`/${lang}/onboarding?type=${onboardingType}`, { replace: true });
```
**Impact:** High - Onboarding flow navigation
**Fix Required:** Use `buildLocalizedPath()` from routeHelpers

---

#### 1.3 Tutorial Navigation Hooks
**File:** `src/dashboard/contexts/TutorialContext/hooks/useTutorialNavigation.js`
```javascript
// Line 158-160
const profileUrl = selectedWorkspace?.id
    ? `/dashboard/profile?workspace=${selectedWorkspace.id}`
    : '/dashboard/profile';
navigate(profileUrl);

// Line 183-186, 193-195
const dashboardUrl = selectedWorkspace?.id
    ? `/dashboard?workspace=${selectedWorkspace.id}`
    : '/dashboard';
navigate(dashboardUrl);
```
**Impact:** High - Tutorial system navigation
**Fix Required:** Use `buildDashboardUrl()` with `DASHBOARD_ROUTE_IDS.PROFILE`

---

#### 1.4 Tutorial Context (Main)
**File:** `src/dashboard/contexts/TutorialContext.js`
```javascript
// Lines 449, 467, 611, 623, 729
navigate(`/${lang}/onboarding`);
navigate(`/${lang}/onboarding?type=${type}`);

// Lines 1760-1762
const profileUrl = selectedWorkspace?.id
    ? `/dashboard/profile?workspace=${selectedWorkspace.id}`
    : '/dashboard/profile';
navigate(profileUrl);

// Lines 1793, 1804
const dashboardUrl = selectedWorkspace?.id
    ? `/dashboard?workspace=${selectedWorkspace.id}`
    : '/dashboard';
navigate(dashboardUrl);
```
**Impact:** High - Tutorial navigation system
**Fix Required:** Use route builder functions consistently

---

#### 1.5 UserCRM Admin Page
**File:** `src/dashboard/admin/pages/operations/UserCRM.js`
```javascript
// Line 376
navigate('/dashboard');
```
**Impact:** Medium - Admin navigation
**Fix Required:** Use `buildDashboardUrl()` with workspace context

---

#### 1.6 Organization Pages
**File:** `src/dashboard/pages/organization/components/Organigram.js`
```javascript
// Line 376
navigate(`/dashboard/profile?userId=${selectedEmployee.uid}`);
```
**Impact:** Medium - Employee profile navigation
**Fix Required:** Use `buildDashboardUrl()` with proper params

---

#### 1.7 Calendar Resource Grid
**File:** `src/dashboard/pages/calendar/components/ResourceGrid.js`
```javascript
// Lines 263, 275
navigate('/dashboard/organization?tab=organigram');
```
**Impact:** Medium - Organization view navigation
**Fix Required:** Use route constants with `buildDashboardUrl()`

---

#### 1.8 Facility Roles
**File:** `src/dashboard/pages/profile/facilities/components/FacilityRoles.js`
```javascript
// Line 143
navigate('/dashboard/calendar?view=team');
```
**Impact:** Medium - Calendar navigation with query params
**Fix Required:** Use route builder with params object

---

#### 1.9 Personal Dashboard
**File:** `src/dashboard/pages/personalDashboard/PersonalDashboard.js`
```javascript
// Line 66
onClick={() => navigate('/dashboard/profile')}
```
**Impact:** Medium - Profile navigation
**Fix Required:** Use `buildDashboardUrl()` with route constant

---

#### 1.10 Access Level Choice Popup
**File:** `src/dashboard/pages/profile/components/AccessLevelChoicePopup.js`
```javascript
// Line 44
navigate(`/${lang}/onboarding?type=${onboardingType}&restart=true`);
```
**Impact:** Medium - Onboarding restart
**Fix Required:** Use `buildLocalizedPath()`

---

#### 1.11 Settings Button
**File:** `src/dashboard/components/Header/SettingsButton.js`
```javascript
// Line 10
navigate('/dashboard/settings');
```
**Impact:** Low - Settings navigation (NOTE: 'settings' route doesn't exist in routes.js!)
**Fix Required:** Add route to config, use route constant

---

#### 1.12 Onboarding Components
**File:** `src/dashboard/onboarding/components/HighlightTooltip.js`
```javascript
// Lines 519, 556
navigate(targetPath);
```
**Impact:** Medium - Uses dynamic targetPath from tutorial steps
**Fix Required:** Ensure targetPath comes from route builders

**File:** `src/dashboard/onboarding/components/SidebarHighlighter.js`
```javascript
// Line 159
navigate(navigationPath);

// Line 401
const hrefSelector = `a[href="/dashboard/${stepData.highlightSidebarItem}"]`;
```
**Impact:** High - Tutorial highlighting system
**Fix Required:** Build paths from route constants

---

### CATEGORY 2: Hardcoded href attributes

#### 2.1 Admin Dashboard Quick Actions
**File:** `src/dashboard/pages/admin/AdminDashboard.js`
```javascript
// Line 157
href="/dashboard/admin/verification"

// Line 168
href="/dashboard/admin/shifts"

// Line 179
href="/dashboard/admin/email"
```
**Impact:** Medium - Admin quick links
**Fix Required:** Use `buildRouteUrl()` from dashboard config

**File:** `src/dashboard/admin/AdminDashboard.js`
```javascript
// Line 151
href="/dashboard/admin/verification"

// Line 162
href="/dashboard/admin/shifts"

// Line 173
href="/dashboard/admin/debug/account-creation"
```
**Impact:** Medium - Duplicate quick links (older version?)
**Fix Required:** Same as above

---

#### 2.2 Terms of Service Link
**File:** `src/dashboard/pages/marketplace/components/detailed_card/DetailedCard.js`
```javascript
// Line 288
href="/${i18n.language}/terms-of-service"
```
**Impact:** Low - Legal link in agreement text
**Fix Required:** Use `buildLocalizedPath(ROUTE_IDS.TERMS_OF_SERVICE, i18n.language)`

---

### CATEGORY 3: Hardcoded paths in configuration

#### 3.1 Navigation Items (Legacy?)
**File:** `src/dashboard/constants/navigationItems.js`
```javascript
export const navigationItems = [
  { id: 'overview', path: '/dashboard/overview', ... },
  { id: 'calendar', path: '/dashboard/calendar', ... },
  { id: 'messages', path: '/dashboard/messages', ... },
  { id: 'contracts', path: '/dashboard/contracts', ... },
  { id: 'profile', path: '/dashboard/profile', ... },
  { id: 'settings', path: '/dashboard/settings', ... }
];
```
**Impact:** HIGH - This appears to be a legacy/duplicate configuration
**Fix Required:** This should either:
- Be removed entirely (use `src/dashboard/config/routes.js` instead)
- OR be generated from the routes config
- NOTE: File appears unused by Sidebar.js which has its own inline items

---

#### 3.2 Admin Sidebar
**File:** `src/dashboard/admin/components/AdminSidebar.js`
```javascript
// Lines 89-180 - All hardcoded paths:
{ path: '/dashboard/admin/portal', ... },
{ path: '/dashboard/admin/operations/users', ... },
{ path: '/dashboard/admin/verification', ... },
{ path: '/dashboard/admin/operations/shifts', ... },
{ path: '/dashboard/admin/operations/job-scraper', ... },
{ path: '/dashboard/admin/finance/revenue', ... },
{ path: '/dashboard/admin/finance/spendings', ... },
{ path: '/dashboard/admin/finance/ar', ... },
{ path: '/dashboard/admin/finance/balance-sheet', ... },
{ path: '/dashboard/admin/system/audit', ... },
{ path: '/dashboard/admin/system/notifications', ... },
{ path: '/dashboard/admin/system/gln-test', ... },
{ path: '/dashboard/admin/payroll/export', ... },
{ path: '/dashboard/admin/management/employees', ... }
```
**Impact:** HIGH - All admin navigation paths hardcoded
**Fix Required:** Import and use `ADMIN_ROUTES` and `buildRouteUrl()` from config

---

#### 3.3 Main Sidebar
**File:** `src/dashboard/components/Sidebar/Sidebar.js`
```javascript
// Lines 50-170 - All hardcoded paths:
{ path: '/dashboard/messages', ... },
{ path: '/dashboard/contracts', ... },
{ path: '/dashboard/calendar', ... },
{ path: '/dashboard/profile', ... },
{ path: '/dashboard/marketplace', ... },
{ path: '/dashboard/payroll', ... },
{ path: '/dashboard/organization', ... },
// Plus all admin paths
```
**Impact:** HIGH - Main navigation uses hardcoded paths
**Fix Required:** Import route config and build paths dynamically
**Note:** Already imports `buildDashboardUrl` but doesn't use it for initial path definitions

---

### CATEGORY 4: Tutorial Step Configurations

#### 4.1 Tutorial Steps (Main)
**File:** `src/dashboard/tutorial/tutorialSteps.js`
```javascript
// All targetSelectors use hardcoded paths:
targetSelector: 'a[href="/dashboard/profile"]',  // Lines 43, 203, 230, etc.
targetSelector: 'a[href="/dashboard/contracts"]',
targetSelector: 'a[href="/dashboard/messages"]',
targetSelector: 'a[href="/dashboard/calendar"]',
// ... and many more

// All navigationPath entries:
navigationPath: '/dashboard/profile/personalDetails',  // Line 62
navigationPath: '/dashboard/profile/professionalBackground',  // Line 80
// ... and many more

// All requiredPage entries:
requiredPage: '/dashboard/contracts',
requiredPage: '/dashboard/messages',
// ... and many more
```
**Impact:** CRITICAL - Tutorial system depends on hardcoded paths
**Fix Required:** Generate paths from route constants OR use path patterns

---

#### 4.2 Tutorial Steps Config (Duplicate?)
**File:** `src/dashboard/contexts/TutorialContext/config/tutorialSteps.js`
```javascript
// Same as above - appears to be duplicate configuration
// Lines 42-472 contain all the same hardcoded paths
```
**Impact:** CRITICAL - Duplicate configuration with same issues
**Fix Required:** Consolidate with main tutorial steps, use route builders

---

### CATEGORY 5: Path comparison/validation logic

#### 5.1 Tutorial Rules Hook
**File:** `src/dashboard/contexts/TutorialContext/hooks/useTutorialRules.js`
```javascript
// Line 92-98
if (normalizedRequiredPath === '/dashboard/overview') {
  if (normalizedCurrentPath === '/dashboard/' ||
      normalizedCurrentPath.startsWith('/dashboard/overview')) { ... }
}

if (normalizedRequiredPath.includes('/dashboard/profile') && 
    normalizedCurrentPath.includes('/dashboard/profile')) { ... }

if (normalizedCurrentPath === '/dashboard/profile' && 
    requiredTab === 'personalDetails') { ... }
```
**Impact:** Medium - Path matching logic
**Fix Required:** Use route constants for comparisons

---

#### 5.2 Tutorial Rules (Duplicate)
**File:** `src/dashboard/contexts/tutorial/useTutorialRules.js`
```javascript
// Lines 88-102 - Same as above
// Appears to be duplicate file
```
**Impact:** Medium - Duplicate logic
**Fix Required:** Consolidate and use route constants

---

#### 5.3 DashboardContext Path Checks
**File:** `src/dashboard/contexts/DashboardContext.js`
```javascript
// Line 678
if (location.pathname.includes('/dashboard/profile')) { ... }

// Line 802
if (!location.pathname.includes('/dashboard') && 
    !location.pathname.includes('/onboarding')) { ... }

// Line 899
if (location.pathname.includes('/dashboard/profile')) { ... }
```
**Impact:** Medium - Route detection logic
**Fix Required:** Create helper functions that use route constants

---

### CATEGORY 6: Fallback/default paths

#### 6.1 WorkspaceAwareNavigate
**File:** `src/dashboard/components/WorkspaceAwareNavigate.js`
```javascript
// Line 10
const defaultRoute = fallbackTo || '/dashboard/personal/overview';

// Line 25
return <Navigate to="/dashboard/personal/overview" replace />;
```
**Impact:** Medium - Already uses `buildDashboardUrl()` for main logic
**Fix Required:** Import constant for fallback path

---

#### 6.2 Dashboard Index
**File:** `src/dashboard/index.js`
```javascript
// Line 37
return <WorkspaceAwareNavigate to="/dashboard/overview" />;

// Line 137
<WorkspaceAwareNavigate to="/dashboard/overview" />
```
**Impact:** Medium - Default redirect paths
**Fix Required:** Use route constant

---

#### 6.3 Admin Protected Route
**File:** `src/dashboard/admin/components/ProtectedRoute.js`
```javascript
// Line 15
return <Navigate to="/dashboard/overview" replace />;

// Line 21
return <Navigate to="/dashboard/admin" replace />;
```
**Impact:** Medium - Auth redirect paths
**Fix Required:** Use route constants

---

#### 6.4 Dashboard Config Routes
**File:** `src/dashboard/config/routes.js`
```javascript
// These are OK as they're THE source of truth, but for consistency:
// Lines 339-341, 356, 369, 372
return defaultAdminRoute ? `/dashboard/admin/${defaultAdminRoute.path}` : '/dashboard/admin/portal';
return '/dashboard/overview';
const cleanPath = path.replace('/dashboard/', '').replace('/dashboard', '');
if (!route) return '/dashboard/overview';
const basePath = isAdminRoute ? `/dashboard/admin/${route.path}` : `/dashboard/${route.path}`;
```
**Impact:** LOW - These are in the route builder functions themselves
**Status:** ACCEPTABLE as part of route management system

---

## SUMMARY OF ISSUES

### By Severity

**CRITICAL (Must Fix):**
1. Tutorial step configurations (2 files with 100+ hardcoded paths each)
2. Sidebar navigation items (2 files: main + admin)
3. Navigation items constants file (legacy/duplicate config)

**HIGH Priority:**
1. Header navigation (login, profile)
2. DashboardContext navigation (onboarding flows)
3. Tutorial navigation hooks
4. Onboarding component navigation

**MEDIUM Priority:**
1. Admin page quick links
2. Organization/Calendar cross-navigation
3. Path comparison logic in tutorial rules
4. Fallback routes in components

**LOW Priority:**
1. Settings button (route doesn't exist yet)
2. Terms of service link
3. Path utilities (mostly OK)

---

## RECOMMENDED FIXES

### Phase 1: Critical Infrastructure
1. **Remove/deprecate duplicate config:**
   - Remove `src/dashboard/constants/navigationItems.js` (appears unused)
   - Consolidate tutorial steps into one file

2. **Update Sidebar components:**
   - Import route configs: `SHARED_ROUTES, PROFESSIONAL_ROUTES, FACILITY_ROUTES, ADMIN_ROUTES`
   - Build navigation items from config using `buildRouteUrl()`
   - Remove all hardcoded path definitions

3. **Update tutorial configurations:**
   - Create helper to generate tutorial steps from route config
   - Use route constants for all path references
   - Build targetSelectors dynamically

### Phase 2: Navigation Components
1. **Update Header.js:**
   - Import `buildLocalizedPath`, `ROUTE_IDS`
   - Import `buildDashboardUrl`, `DASHBOARD_ROUTE_IDS`
   - Replace all hardcoded navigate() calls

2. **Update DashboardContext.js:**
   - Import route helpers
   - Replace onboarding navigation with `buildLocalizedPath(ROUTE_IDS.ONBOARDING, lang)`

3. **Update tutorial hooks:**
   - Use `buildDashboardUrl()` consistently
   - Import `DASHBOARD_ROUTE_IDS`

### Phase 3: Individual Pages
1. Update all page components to use route builders
2. Add any missing routes (e.g., 'settings') to route config
3. Update path comparison logic to use constants

### Phase 4: Documentation
1. Update `ROUTES_README.md` with:
   - Examples of sidebar integration
   - Tutorial step configuration patterns
   - Path comparison best practices

---

## ROUTE CONSTANTS THAT SHOULD BE ADDED

Missing from current config:

1. **DASHBOARD_ROUTE_IDS.SETTINGS** - Used but not defined in routes
2. Sub-routes for profile tabs:
   - `PROFILE_TABS.PERSONAL_DETAILS`
   - `PROFILE_TABS.PROFESSIONAL_BACKGROUND`
   - `PROFILE_TABS.BILLING_INFORMATION`
   - `PROFILE_TABS.DOCUMENT_UPLOADS`
   - `PROFILE_TABS.SETTINGS`
   - `PROFILE_TABS.FACILITY_CORE_DETAILS`
   - `PROFILE_TABS.FACILITY_LEGAL_BILLING`

3. Route query param constants:
   - `QUERY_PARAMS.WORKSPACE`
   - `QUERY_PARAMS.TAB`
   - `QUERY_PARAMS.VIEW`
   - `QUERY_PARAMS.TYPE`

---

## FILES THAT ARE CORRECTLY USING ROUTE MANAGEMENT

✅ **Good Examples:**
- `src/dashboard/pages/profile/Profile.js` - Uses `buildDashboardUrl()` with workspace
- `src/dashboard/pages/profile/hooks/useProfileFormHandlers.js` - Uses path builders
- `src/dashboard/utils/pathUtils.js` - Core utility functions
- `src/dashboard/components/WorkspaceAwareNavigate.js` - Uses `buildDashboardUrl()`
- `src/dashboard/admin/AdminRoute.js` - Uses `buildDashboardUrl()`

---

## ESTIMATED EFFORT

- **Phase 1 (Critical):** 8-12 hours
- **Phase 2 (High):** 6-8 hours  
- **Phase 3 (Medium):** 4-6 hours
- **Phase 4 (Documentation):** 2-3 hours

**Total:** ~20-29 hours of development work

---

## TESTING CHECKLIST

After implementing fixes, verify:
- [ ] All sidebar navigation works with workspace switching
- [ ] Tutorial system navigates correctly
- [ ] Onboarding flow navigation works
- [ ] Admin panel navigation works
- [ ] Profile navigation with tabs works
- [ ] Calendar/Organization cross-navigation works
- [ ] Language switching preserves correct paths
- [ ] Query parameters are properly maintained
- [ ] Fallback routes work for auth failures
- [ ] No console errors about undefined routes

