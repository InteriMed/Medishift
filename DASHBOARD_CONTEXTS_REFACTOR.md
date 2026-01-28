# DASHBOARD CONTEXTS REFACTORING

## Status: NEEDS MAJOR REFACTORING

### Files in `src/dashboard/contexts/`:

#### ✅ KEEP (Pure UI State)
- **SidebarContext.js** (33 lines) - Sidebar collapse state
- **PageMobileContext.js** (60 lines) - Mobile mode detection and back button state

#### ❌ LEGACY - NEEDS REFACTORING
- **DashboardContext.js** (1016 lines) - BLOATED with business logic

## Issues in DashboardContext.js

### 1. Direct Firestore Calls
```javascript
// BAD - Lines 6-7
import { db } from '../../services/firebase';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot, updateDoc } from 'firebase/firestore';
```
**Should use:** Action Catalog (`useAction()` hook)

### 2. Deprecated sessionAuth Utilities
```javascript
// BAD - Lines 10-14
import {
  createWorkspaceSession,
  clearWorkspaceSession,
  getAvailableWorkspaces,
  WORKSPACE_TYPES
} from '../../utils/sessionAuth';
```
**Should use:** 
- `workspace.switch` action
- `workspace.check_available` action
- `WORKSPACE_TYPES` from `src/config/workspaceDefinitions`

### 3. Cookie-Based Workspace Management
```javascript
// BAD - Line 8
import { setWorkspaceCookie, getWorkspaceCookie, clearWorkspaceCookie } from '../../utils/cookieUtils';
```
**Should use:** Token-based authentication via `workspace.switch` action

### 4. Manual Route Building
```javascript
// BAD - Line 16
import { buildDashboardUrl, getDefaultRouteForWorkspace, getRelativePathFromUrl, getWorkspaceIdForUrl, isPathValidForWorkspace } from '../../config/routeUtils';
```
**Should use:** Centralized route helpers from `src/config/routeHelpers` and `src/config/appRoutes`

## Refactoring Strategy

### Phase 1: Extract Business Logic to Actions ✅
Move workspace switching logic to action catalog:
- ✅ Already exists: `services/actions/catalog/workspace/switchWorkspace.ts`
- ✅ Already exists: `services/actions/catalog/workspace/checkWorkspaces.ts`

### Phase 2: Simplify DashboardContext
**Before:** 1016 lines mixing UI state + business logic
**After:** ~150 lines with ONLY dashboard UI state

**What to keep:**
```javascript
const DashboardContext = createContext(null);

export const DashboardProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const { workspaces, selectedWorkspace, switchWorkspace } = useWorkspaceAccess();
  
  // ONLY Dashboard UI State
  const [userPreferences, setUserPreferences] = useState(null);
  const [nextIncompleteProfileSection, setNextIncompleteProfileSection] = useState(null);
  
  // Remove all business logic - delegate to hooks and actions
  const value = {
    userPreferences,
    setUserPreferences,
    nextIncompleteProfileSection,
    setNextIncompleteProfileSection,
    selectedWorkspace, // Pass through from useWorkspaceAccess
    workspaces, // Pass through from useWorkspaceAccess
    switchWorkspace // Pass through from useWorkspaceAccess
  };
  
  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};
```

### Phase 3: Update Imports Throughout Dashboard
All dashboard components importing `DashboardContext` should instead use:
- `useWorkspaceAccess()` for workspace operations
- `useAction()` for backend operations
- Direct API calls only for dashboard-specific UI state

## Migration Path

### OLD (Current):
```javascript
import { useDashboard } from '../contexts/DashboardContext';

const { switchWorkspace, workspaces } = useDashboard();
await switchWorkspace(facilityId);
```

### NEW (After Refactor):
```javascript
import { useWorkspaceAccess } from '@/hooks/useWorkspaceAccess';

const { workspaces, switchWorkspace } = useWorkspaceAccess();
await switchWorkspace(facilityId); // Uses workspace.switch action internally
```

## Action Items

1. ✅ Keep SidebarContext.js and PageMobileContext.js as-is
2. ⏳ Refactor DashboardContext.js to remove business logic
3. ⏳ Update 6 files importing from dashboard/contexts
4. ⏳ Test workspace switching with new architecture
5. ⏳ Remove deprecated utils/sessionAuth.js
6. ⏳ Remove deprecated utils/cookieUtils.js (workspace-related)

## Files Importing dashboard/contexts (6 files):
- src/components/dashboard/header/header.js
- src/components/dashboard/header/tutorialHelpMenu/TutorialHelp.js
- src/components/modals/stopTutorialConfirmModal.js
- src/App.js
- src/contexts/workspaceAwareNavigate.js
- src/contexts/centralizedRoute.js

These need to be updated after DashboardContext refactoring.

