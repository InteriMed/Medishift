# WORKSPACE INTEGRATION WITH FLOWS

## Overview

The Flows system is now integrated with workspace-based access control. This document explains how onboarding automatically creates workspaces and redirects users appropriately.

## Architecture

```
User Signs Up
    ↓
Onboarding Flow (Using Flows System)
    ↓
Complete Onboarding (completion.ts)
    ↓
Create Workspace (Professional/Facility)
    ↓
Auto-Redirect to Workspace Dashboard
```

## Workspace Types

### 1. Personal Workspace
- **Created when**: Professional worker completes onboarding (not belonging to facility)
- **Access**: Professional profile must exist
- **Redirect**: `/dashboard/personal/overview`

### 2. Facility Workspace
- **Created when**: Company completes facility onboarding
- **Access**: User must be in facility's employees array
- **Redirect**: `/dashboard/{facilityId}/overview`

### 3. Organization Workspace
- **Created when**: Chain completes organization onboarding
- **Access**: User must be org_admin
- **Redirect**: `/dashboard/{organizationId}/organization`

### 4. Admin Workspace
- **Created when**: Admin document exists
- **Access**: Admin document with isActive !== false
- **Redirect**: `/dashboard/admin/portal`

## Flow Integration

### Onboarding Completion

The `completeOnboarding()` function in `completion.ts` handles:

1. **Save onboarding progress** to user document
2. **Create workspace** (if applicable):
   - Professional worker → Create professional profile → Personal workspace
   - Company → Create facility profile → Facility workspace
   - Chain → Create organization → Organization workspace
3. **Return workspace info** for auto-redirect

### Usage in OnboardingPage.js

```javascript
import { completeOnboarding } from '../../services/flows/catalog/onboarding/completion';

const handleComplete = async () => {
  const result = await completeOnboarding(
    currentUser.uid,
    data,  // Flow data with role, phone, etc.
    onboardingType
  );

  if (result.workspaceCreated && result.workspaceId) {
    if (result.workspaceId === 'personal') {
      navigate(`/${lang}/dashboard/personal/overview`);
    } else {
      navigate(`/${lang}/dashboard/${result.workspaceId}/overview`);
    }
  }
};
```

## Workspace Guard

### Component: WorkspaceGuard.js

Protects routes that require workspace access:

```javascript
<WorkspaceGuard requiredWorkspaceType="facility">
  <FacilityDashboard />
</WorkspaceGuard>
```

**Behavior**:
- Checks if user has any workspaces
- If no workspaces → Redirect to `/onboarding`
- If has workspaces but not required type → Redirect to default workspace
- If has required workspace → Allow access

### Hook: useWorkspaceAccess.js

```javascript
const {
  workspaces,           // Array of available workspaces
  loading,              // Loading state
  needsOnboarding,      // True if no workspaces exist
  currentWorkspace,     // Currently active workspace
  switchWorkspace,      // Function to switch workspaces
  refreshWorkspaces,    // Refresh workspace list
  hasAnyWorkspace       // Boolean convenience flag
} = useWorkspaceAccess();
```

**Auto-redirect Logic**:
- When `needsOnboarding === true` → Auto-redirect to `/onboarding`
- Called on page load and after auth changes

## Route Configuration

### appRoutes.js Updates

```javascript
{
  id: 'onboarding',
  path: 'onboarding',
  component: OnboardingPage,
  requiresAuth: true,
  skipWorkspaceCheck: true  // ← NEW: Skip workspace check for onboarding
},
{
  id: 'dashboard',
  path: 'dashboard/*',
  component: DashboardRoot,
  requiresAuth: true,
  requiresWorkspace: true  // ← NEW: Require workspace for dashboard
}
```

## Workspace Actions

### 1. workspace.check_available

Check what workspaces user has access to:

```javascript
import { useAction } from '@/services/actions/hook';

const { execute } = useAction();

const result = await execute('workspace.check_available', {});

// Returns:
// {
//   workspaces: [
//     { id: 'personal', name: 'Personal Workspace', type: 'personal' },
//     { id: 'fac_123', name: 'My Pharmacy', type: 'facility', role: 'admin' }
//   ],
//   needsOnboarding: false,
//   hasAnyWorkspace: true
// }
```

### 2. workspace.switch

Switch to a specific workspace:

```javascript
const result = await execute('workspace.switch', {
  targetWorkspaceId: 'fac_123',
  workspaceType: 'facility'
});

// Returns:
// {
//   token: 'custom_firebase_token_with_claims',
//   workspace: {
//     id: 'fac_123',
//     name: 'My Pharmacy',
//     type: 'facility',
//     role: 'admin',
//     permissions: ['facility.manage_all', ...]
//   }
// }

// Then re-authenticate:
await firebase.auth().signInWithCustomToken(result.token);
```

## Permission System

### Facility Permissions

```typescript
const permissionMap = {
  'admin': [
    'facility.manage_all',
    'facility.manage_employees',
    'facility.manage_schedules',
    'facility.post_positions',
    'facility.manage_contracts',
    'facility.view_analytics'
  ],
  'scheduler': [
    'facility.manage_schedules',
    'facility.view_employees'
  ],
  'employee': [
    'facility.view_schedule',
    'facility.request_timeoff'
  ]
};
```

### Checking Permissions

```javascript
import { useWorkspaceAccess } from '@/hooks/useWorkspaceAccess';

const { currentWorkspace } = useWorkspaceAccess();

if (currentWorkspace?.permissions?.includes('facility.manage_employees')) {
  // Show employee management UI
}
```

## Flow Completion Logic

### Worker (Not Belonging to Facility)

```javascript
if (onboardingData.role === 'worker' && !onboardingData.belongsToFacility) {
  // Create professional profile
  // → Workspace: personal
  // → Redirect: /dashboard/personal/overview
}
```

### Worker (Belonging to Facility)

```javascript
if (onboardingData.role === 'worker' && onboardingData.belongsToFacility) {
  // Create professional profile with tutorialAccessMode: 'team'
  // → NO workspace created (waits for facility invitation)
  // → Redirect: /dashboard/profile
}
```

### Company

```javascript
if (onboardingData.role === 'company') {
  // Create facility profile
  // Add user to facility.employees with role: ['admin']
  // Add facility_uid to user.roles
  // → Workspace: facility (facilityId)
  // → Redirect: /dashboard/{facilityId}/overview
}
```

### Chain

```javascript
if (onboardingData.role === 'chain') {
  // Create organization
  // Add user to organization.internalTeam.admins
  // Add organization_uid to user.roles with role: ['org_admin']
  // → Workspace: organization (organizationId)
  // → Redirect: /dashboard/{organizationId}/organization
}
```

## Testing Checklist

### Onboarding Flow
- [ ] Professional worker (not in facility) → Personal workspace created
- [ ] Professional worker (in facility) → No workspace, shows profile page
- [ ] Company → Facility workspace created
- [ ] Chain → Organization workspace created

### Workspace Access
- [ ] User with no workspaces → Auto-redirect to onboarding
- [ ] User with 1 workspace → Auto-select and redirect
- [ ] User with multiple workspaces → Show workspace switcher
- [ ] Admin → Has access to all workspaces

### Guards
- [ ] WorkspaceGuard blocks access without workspace
- [ ] WorkspaceGuard allows access with correct workspace type
- [ ] Onboarding bypasses workspace check

## Migration Notes

### Before
```javascript
// Manual workspace checking in every component
const hasFacility = user.roles?.some(r => r.facility_uid);
if (!hasFacility) {
  // Redirect manually
}
```

### After
```javascript
// Automatic via WorkspaceGuard
<WorkspaceGuard requiredWorkspaceType="facility">
  <FacilityDashboard />
</WorkspaceGuard>

// Or via hook
const { hasAnyWorkspace, needsOnboarding } = useWorkspaceAccess();
// Auto-redirects handled automatically
```

## Best Practices

1. **Always use WorkspaceGuard** for protected routes
2. **Use useWorkspaceAccess hook** to check workspace status
3. **Call refreshWorkspaces()** after workspace-changing actions
4. **Check permissions** before showing UI elements
5. **Handle workspace switch** via actions system for audit trail

## Future Enhancements

- [ ] Workspace switching UI component
- [ ] Workspace invitation flow
- [ ] Multi-facility support for single user
- [ ] Workspace-level settings and preferences
- [ ] Workspace analytics dashboard

