# DASHBOARD CONTEXTS - FINAL STRUCTURE

## 📁 Location: `src/dashboards/contexts/`

Clean, lean UI state management contexts for the dashboard system.

## Files

### 1. **dashboardContext.js** (106 lines)
**Purpose:** Dashboard-level state and workspace integration

**Provides:**
- `currentUser` - Current authenticated user
- `workspaces` - Available workspaces (from useWorkspaceAccess)
- `currentWorkspace` - Currently active workspace
- `workspacesLoading` - Workspace loading state
- `switchWorkspace(workspaceId)` - Switch to different workspace
- `refreshWorkspaces()` - Reload available workspaces
- `userPreferences` - User dashboard preferences
- `updateUserPreferences(prefs)` - Update preferences
- `nextIncompleteProfileSection` - Profile completion tracking
- `setNextIncompleteProfileSection(section)` - Set next profile section

**Usage:**
```javascript
import { useDashboard } from '@/dashboards/contexts';

const MyComponent = () => {
  const {
    currentUser,
    workspaces,
    currentWorkspace,
    switchWorkspace,
    userPreferences,
    updateUserPreferences
  } = useDashboard();
  
  return <div>...</div>;
};
```

---

### 2. **sidebarContext.js** (52 lines)
**Purpose:** Sidebar collapse/expand state management

**Provides:**
- `isMainSidebarCollapsed` - Main sidebar collapse state
- `setIsMainSidebarCollapsed(boolean)` - Set main sidebar state
- `toggleMainSidebar()` - Toggle main sidebar
- `isSecondarySidebarCollapsed` - Secondary sidebar state
- `setIsSecondarySidebarCollapsed(boolean)` - Set secondary sidebar state
- `toggleSecondarySidebar()` - Toggle secondary sidebar

**Usage:**
```javascript
import { useSidebar } from '@/dashboards/contexts';

const Sidebar = () => {
  const { isMainSidebarCollapsed, toggleMainSidebar } = useSidebar();
  
  return (
    <aside className={isMainSidebarCollapsed ? 'collapsed' : 'expanded'}>
      <button onClick={toggleMainSidebar}>Toggle</button>
    </aside>
  );
};
```

---

### 3. **responsiveContext.js** (111 lines) ⭐ NEW
**Purpose:** Centralized responsive design and mobile UI state

**Breakpoints:**
```javascript
{
  mobile: 480,   // < 480px
  tablet: 768,   // 480px - 768px
  desktop: 1024, // 768px - 1024px
  wide: 1440     // > 1440px
}
```

**Provides:**
- `windowWidth` - Current window width (px)
- `windowHeight` - Current window height (px)
- `isMobile` - Is mobile viewport (< 768px)
- `isTablet` - Is tablet viewport (768px - 1024px)
- `isDesktop` - Is desktop viewport (>= 1024px)
- `isWideScreen` - Is wide screen (>= 1440px)
- `breakpoints` - Breakpoint constants
- `showBackButton` - Mobile back button visibility
- `onBackButtonClick` - Mobile back button callback
- `setPageMobileState(show, callback)` - Set mobile page state
- `clearPageMobileState()` - Clear mobile page state

**Usage:**
```javascript
import { useResponsive } from '@/dashboards/contexts';

const ResponsiveComponent = () => {
  const {
    isMobile,
    isDesktop,
    windowWidth,
    setPageMobileState
  } = useResponsive();
  
  useEffect(() => {
    if (isMobile) {
      setPageMobileState(true, () => navigate(-1));
    }
    return () => clearPageMobileState();
  }, [isMobile]);
  
  return (
    <div>
      {isMobile ? <MobileView /> : <DesktopView />}
      <p>Window width: {windowWidth}px</p>
    </div>
  );
};
```

**Backward Compatibility:**
```javascript
// Old API still works
import { usePageMobile } from '@/dashboards/contexts';
const { isMobileMode, setPageMobileState } = usePageMobile();
```

---

### 4. **index.js** (3 lines)
**Purpose:** Centralized exports

```javascript
export { DashboardProvider, useDashboard } from './dashboardContext';
export { SidebarProvider, useSidebar } from './sidebarContext';
export { ResponsiveProvider, useResponsive, usePageMobile } from './responsiveContext';
```

## Architecture Improvements

### ✅ What Changed:

1. **Massive Size Reduction:**
   - Old DashboardContext: 1016 lines
   - New DashboardContext: 106 lines
   - **90% reduction** by removing business logic

2. **Separation of Concerns:**
   - Business logic → Actions & Hooks
   - UI state → Contexts
   - Routing → Config

3. **New Responsive Context:**
   - Replaces old PageMobileContext
   - Adds comprehensive responsive utilities
   - Window resize tracking
   - Multiple breakpoint detection
   - Backward compatible API

4. **Clean Dependencies:**
   - Uses `useWorkspaceAccess()` hook
   - Uses `useAuth()` context
   - Lazy imports for Firebase
   - No direct Firestore calls

5. **Type Safety:**
   - PropTypes validation
   - Error boundaries
   - Memoized values

## Usage Patterns

### Provider Setup

```javascript
import {
  DashboardProvider,
  SidebarProvider,
  ResponsiveProvider
} from '@/dashboards/contexts';

function App() {
  return (
    <ResponsiveProvider>
      <SidebarProvider>
        <DashboardProvider>
          <YourDashboard />
        </DashboardProvider>
      </SidebarProvider>
    </ResponsiveProvider>
  );
}
```

### Component Usage

```javascript
import { useDashboard, useSidebar, useResponsive } from '@/dashboards/contexts';

const DashboardPage = () => {
  const { currentWorkspace, switchWorkspace } = useDashboard();
  const { isMainSidebarCollapsed, toggleMainSidebar } = useSidebar();
  const { isMobile, windowWidth } = useResponsive();
  
  return (
    <div className={isMobile ? 'mobile-layout' : 'desktop-layout'}>
      {/* Your dashboard content */}
    </div>
  );
};
```

## Migration Notes

### Old → New

**Old PageMobileContext:**
```javascript
import { usePageMobile } from '../dashboard/contexts/PageMobileContext';
const { isMobileMode } = usePageMobile();
```

**New ResponsiveContext:**
```javascript
import { useResponsive } from '@/dashboards/contexts';
const { isMobile } = useResponsive();
// OR use backward-compatible alias:
const { isMobile: isMobileMode } = usePageMobile();
```

**Old DashboardContext workspace logic:**
```javascript
import { useDashboard } from '../dashboard/contexts/DashboardContext';
const { switchWorkspace } = useDashboard();
```

**New (same API, cleaner implementation):**
```javascript
import { useDashboard } from '@/dashboards/contexts';
const { switchWorkspace } = useDashboard();
```

## Benefits

✅ **Performance:** Memoized values prevent unnecessary re-renders
✅ **Clean:** Pure UI state, no business logic
✅ **Testable:** Small, focused contexts
✅ **Responsive:** Comprehensive responsive design utilities
✅ **Maintainable:** Clear separation of concerns
✅ **Extensible:** Easy to add new UI state
✅ **Backward Compatible:** Old APIs still work

## Next Steps

- [ ] Update dashboard components to use new contexts
- [ ] Remove old `src/dashboard/contexts` (if any remain)
- [ ] Test responsive breakpoints across devices
- [ ] Document any custom breakpoint needs

