# WORKSPACE ACCESS & ROUTING ANALYSIS

## ISSUE IDENTIFIED

There was an inconsistency in access control rules between marketplace and organization tabs across different workspace contexts (Professional Personal vs Facility Team workspaces).

---

## ACCESS CONTROL LAYERS

The application has **THREE LAYERS** of access control that must be aligned:

### 1. ROUTING LAYER (`src/dashboard/config/routes.js`)
Defines which routes are accessible from which workspace types:

- **Marketplace**: `ACCESS_TYPES.PERSONAL` - Only accessible in Personal workspace
- **Organization**: `ACCESS_TYPES.FACILITY` - Only accessible in Facility/Team workspace
- **Messages/Contracts/Calendar**: `ACCESS_TYPES.PERSONAL_OR_FACILITY` - Accessible in both

### 2. SIDEBAR LAYER (`src/dashboard/components/Sidebar/Sidebar.js`)
Controls visibility of navigation items in the sidebar:

- **facilityOnly** flag: Shows only in Team workspace (Organization, Payroll)
- **personalOnly** flag: Shows only in Personal workspace (Marketplace)
- **Shared items**: Always visible (Messages, Contracts, Calendar, Profile)

### 3. TUTORIAL/ACCESS LAYER (`src/dashboard/contexts/TutorialContext/hooks/useTutorialRules.js`)
Controls access during tutorial/onboarding flow based on user's access level:

- **Full access**: All features unlocked
- **Team access**: Workspace-dependent restrictions
- **No access**: Platform features locked

---

## THE PROBLEM

### Before Fix:

**In useTutorialRules.js (Line 54-62):**
```javascript
if (access === 'team') {
    if (isFacilityWorkspace) {
        // Facility: Everything unlocked at Team access
        return true;
    } else {
        // Professional: Everything unlocked EXCEPT Marketplace
        if (itemName === 'marketplace') return false;
        return true;
    }
}
```

**This was INVERTED logic:**
- In **Personal workspace** (where marketplace SHOULD be accessible), it was BLOCKED
- In **Facility workspace** (where marketplace SHOULD NOT be accessible), the logic would allow it if sidebar showed it

### Root Cause:
The comment said "Professional: Everything unlocked EXCEPT Marketplace" but this applies to the ELSE branch, which is the Personal Workspace context, not the facility context. The logic blocked marketplace access in the wrong workspace type.

---

## THE FIX

### 1. Fixed Tutorial Access Rules

**File**: `src/dashboard/contexts/TutorialContext/hooks/useTutorialRules.js`

**Changed Lines 49-68:**
```javascript
if (platformFeatures.includes(itemName)) {
    // TUTORIALPASSED OR FULL ACCESS: Unlocks everything
    if (access === 'full' || tutorialPassed) return true;

    // Team Access Logic
    if (access === 'team') {
        if (isFacilityWorkspace) {
            // FACILITY WORKSPACE: Everything unlocked EXCEPT Marketplace (facility-only features)
            if (itemName === 'marketplace') return false;
            return true;
        } else {
            // PERSONAL WORKSPACE: Everything unlocked EXCEPT Organization/Payroll (personal workspace features)
            if (itemName === 'organization' || itemName === 'payroll') return false;
            return true;
        }
    }

    // Otherwise, platform features are locked
    return false;
}
```

**Reasoning:**
- **Facility workspace**: Block marketplace (it's personal-only), allow organization/payroll
- **Personal workspace**: Allow marketplace, block organization/payroll (they're facility-only)
- **Tutorial passed users**: Bypass access mode check - they have completed onboarding and should have full access
- **Critical fix**: Added `|| tutorialPassed` check to handle users who completed onboarding but have `accessMode` as `null` or `'loading'`

### 2. Made Sidebar Configuration Explicit

**File**: `src/dashboard/components/Sidebar/Sidebar.js`

**Added `personalOnly` flag to marketplace item:**
```javascript
{
    title: 'dashboard.sidebar.marketplace',
    icon: FiBox,
    path: '/dashboard/marketplace',
    personalOnly: true  // ADDED THIS
},
```

**Updated filtering logic (Lines 302-329):**
- Removed hard-coded `professionalOnlyItems` array
- Added explicit check: `if (item.personalOnly) return isPersonalWorkspace;`
- Now uses declarative flags instead of item name matching

### 3. Applied Same Fix to Duplicate File

**File**: `src/dashboard/contexts/tutorial/useTutorialRules.js`

Applied identical fix to ensure consistency (appears to be a legacy/backup copy).

---

## WORKSPACE ACCESS RULES (FINAL)

### PERSONAL WORKSPACE (Professionals)
**Accessible Features:**
- ✅ Overview/Dashboard
- ✅ Profile
- ✅ Messages
- ✅ Contracts  
- ✅ Calendar
- ✅ **Marketplace** ← FIXED
- ❌ Organization (blocked)
- ❌ Payroll (blocked)

### FACILITY/TEAM WORKSPACE (Facilities)
**Accessible Features:**
- ✅ Overview/Dashboard
- ✅ Profile
- ✅ Messages
- ✅ Contracts
- ✅ Calendar
- ✅ **Organization** ← CORRECT
- ✅ **Payroll** ← CORRECT
- ❌ Marketplace (blocked) ← FIXED

### ADMIN WORKSPACE
**Accessible Features:**
- ✅ All admin-specific routes (portal, CRM, revenue, etc.)
- Uses separate routing and permission system

---

## VALIDATION POINTS

### Route Level (`canAccessRoute()` in routes.js)
- ✅ Marketplace: Only returns true for `WORKSPACE_TYPES.PERSONAL`
- ✅ Organization: Only returns true for `WORKSPACE_TYPES.TEAM`
- ✅ Redirects to `/dashboard/overview` if route not accessible

### Sidebar Level (Filtering in Sidebar.js)
- ✅ Marketplace: Only shown when `isPersonalWorkspace === true`
- ✅ Organization: Only shown when `isTeamWorkspace === true`
- ✅ Shared items always visible in both workspaces

### Tutorial Level (`isSidebarItemAccessible()` in useTutorialRules.js)
- ✅ Marketplace: Returns `false` in facility workspace, `true` in personal workspace (with team access)
- ✅ Organization: Returns `false` in personal workspace, `true` in facility workspace (with team access)
- ✅ Full access bypasses all restrictions

---

## TESTING CHECKLIST

To verify the fix works correctly:

### For Professional Users (Personal Workspace):
1. ✅ Marketplace tab should be visible in sidebar
2. ✅ Marketplace route should be accessible
3. ✅ Organization tab should NOT be visible
4. ✅ Attempting to access `/dashboard/organization` should redirect to overview
5. ✅ During onboarding with "team" access, marketplace should be accessible

### For Facility Users (Team Workspace):
1. ✅ Organization tab should be visible in sidebar
2. ✅ Organization route should be accessible
3. ✅ Marketplace tab should NOT be visible
4. ✅ Attempting to access `/dashboard/marketplace` should redirect to overview
5. ✅ During onboarding with "team" access, organization should be accessible

### For Users with Both Access Types:
1. ✅ Switching from Personal → Team workspace should hide marketplace, show organization
2. ✅ Switching from Team → Personal workspace should show marketplace, hide organization
3. ✅ Shared features (messages, contracts, calendar) always visible in both

---

## FILES MODIFIED

1. ✅ `src/dashboard/contexts/TutorialContext/hooks/useTutorialRules.js`
2. ✅ `src/dashboard/contexts/tutorial/useTutorialRules.js` (duplicate)
3. ✅ `src/dashboard/components/Sidebar/Sidebar.js`

---

## RELATED FILES (For Reference)

- `src/dashboard/config/routes.js` - Route definitions and access types
- `src/dashboard/index.js` - Main routing logic with RouteElement component
- `src/config/workspaceDefinitions.js` - Workspace type definitions and access checks
- `src/utils/sessionAuth.js` - Session validation and workspace switching
- `firestore.rules` - Database-level security rules

---

## SUMMARY

**The issue was an inverted logic condition** in the tutorial access rules that blocked marketplace in personal workspace (where it should be accessible) and would have allowed it in facility workspace (where it should be blocked).

**The fix corrects the workspace-specific restrictions** to match the routing layer:
- Personal workspace: Allow marketplace, block organization/payroll
- Facility workspace: Allow organization/payroll, block marketplace

This ensures **consistency across all three access control layers** (routing, sidebar, tutorial).

