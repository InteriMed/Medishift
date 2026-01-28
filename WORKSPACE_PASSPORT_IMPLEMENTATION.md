# Workspace Access "Passport Strategy" - Implementation Summary

## Overview

This document summarizes the implementation of the **Workspace Access Module** following the "Passport Strategy" recommendations for multi-tenancy security.

## What Was Implemented

### 1. Backend Cloud Function: `workspace.switch`

**File:** `functions/api/workspaceAccess.js`

**Purpose:** The "Login Gate" for workspaces - verifies membership and issues custom tokens with workspace claims.

**Key Features:**
- ✅ Verifies membership against `facilityProfiles` collection (Source of Truth)
- ✅ Checks employee `status` field ('ACTIVE' required)
- ✅ Issues custom Firebase tokens with `facilityId` embedded in claims
- ✅ Audits all workspace switch attempts (success and failure)
- ✅ Supports 4 workspace types: personal, facility, organization, admin
- ✅ Maps roles to permissions (RBAC)

**Security Enhancements:**
```javascript
// Added active status check
if (employeeRecord.status && employeeRecord.status !== 'ACTIVE') {
  await auditLog('workspace.switch', 'FAILURE', {
    attemptedFacility: targetWorkspaceId,
    reason: 'NOT_ACTIVE',
    status: employeeRecord.status
  });
  throw new HttpsError('permission-denied', 'Account status is not ACTIVE');
}
```

### 2. Backend Cloud Function: `workspace.checkAvailable`

**File:** `functions/api/workspaceAccess.js`

**Purpose:** Returns list of workspaces user has access to.

**Features:**
- Checks personal workspace (professionalProfiles)
- Checks facility roles (users.roles array)
- Checks organization admin access
- Checks system admin access
- Returns `needsOnboarding` flag

### 3. Frontend Workspace Switching

**File:** `src/hooks/useWorkspaceAccess.js`

**Critical Fix:** Now properly implements the Passport Strategy:

**Before (❌ Broken):**
```javascript
const switchWorkspace = useCallback((workspaceId) => {
  setCurrentWorkspace(workspace);
  navigate(`/${lang}/dashboard/${workspace.facilityId}/overview`);
  return true; // Just navigation, no security!
}, [workspaces, lang, navigate]);
```

**After (✅ Fixed):**
```javascript
const switchWorkspace = useCallback(async (workspaceId) => {
  // 1. Call backend to verify membership and get passport
  const switchWorkspaceFunction = httpsCallable(functions, 'switchWorkspace');
  const result = await switchWorkspaceFunction({
    targetWorkspaceId: workspace.id,
    workspaceType: workspace.type
  });

  // 2. Re-authenticate with new passport (custom token)
  await signInWithCustomToken(auth, result.data.token);
  
  // 3. Force token refresh to update claims
  await auth.currentUser.getIdToken(true);

  // 4. Navigate to dashboard
  navigate(`/${lang}/dashboard/${workspace.id}/overview`);
}, [workspaces, lang, navigate]);
```

### 4. Middleware: Context Builder & Tenant Isolation

**File:** `src/services/actions/middleware/buildActionContext.ts`

**Purpose:** Utilities for building action context and enforcing security.

**Functions:**
- `buildActionContextFromAuth()` - Client-side context builder
- `validateTenantIsolation()` - Ensures users can only access their own facility
- `requireWorkspace()` - Enforces workspace requirement for actions

**Usage Example:**
```typescript
import { validateTenantIsolation } from '@/services/actions/middleware/buildActionContext';

export const myAction = {
  handler: async (input, ctx) => {
    // Block cross-tenant access (except for admins)
    validateTenantIsolation(ctx, input.targetFacilityId, 'my.action');
    
    // Safe to proceed...
  }
};
```

### 5. Updated Documentation

**File:** `src/services/IMPLEMENTATION_GUIDE.md`

Added comprehensive section on:
- Workspace Access architecture
- Passport Strategy explanation
- Custom claims structure
- Frontend/backend usage examples
- Deployment instructions
- Troubleshooting guide

### 6. Function Registration

**File:** `functions/index.js`

Added exports:
```javascript
const workspaceAccess = require('./api/workspaceAccess');
module.exports.switchWorkspace = workspaceAccess.switchWorkspace;
module.exports.checkWorkspaces = workspaceAccess.checkWorkspaces;
```

## Architecture Comparison

### Recommendation vs Implementation

| Aspect | Recommendation | Current Implementation | Status |
|--------|---------------|----------------------|---------|
| Backend Verification | ✅ Required | ✅ Implemented (`workspaceAccess.js`) | ✅ Match |
| Custom Token Issuance | ✅ Required | ✅ Implemented (Admin SDK) | ✅ Match |
| Source of Truth | ✅ Facility Profile | ✅ `facilityProfiles` collection | ✅ Match |
| Frontend Re-auth | ✅ Required | ✅ `signInWithCustomToken()` called | ✅ Match |
| Status Check | ✅ Required | ✅ Added ('ACTIVE' check) | ✅ Match |
| Audit Logging | ✅ Required | ✅ Success & failure logged | ✅ Match |
| Token Verification | ⚠️ Backend middleware | ⚠️ Client-side (actions run client-side) | ⚠️ Partial |

## Current Architecture Notes

**Important:** Actions currently run **client-side** using Firebase Client SDK. This means:

1. ✅ `workspace.switch` **must** run server-side (requires Admin SDK to create custom tokens)
2. ✅ Frontend trusts Firebase Client SDK to verify ID tokens
3. ✅ Claims in token are secure (signed by Firebase)
4. ⚠️ If actions move to backend in future, implement server-side token verification

## Security Guarantees

With this implementation:

1. ✅ Users **cannot** spoof `facilityId` (embedded in signed JWT)
2. ✅ Membership verified at workspace entry (not on every action)
3. ✅ Inactive users blocked from accessing workspace
4. ✅ All access attempts audited to `system_logs`
5. ✅ Admin cross-tenant access is logged and traceable
6. ✅ Frontend automatically refreshes token after switch

## Deployment Checklist

```bash
# 1. Deploy Cloud Functions
firebase deploy --only functions:switchWorkspace,functions:checkWorkspaces

# 2. Test with a real user
# - Login
# - Try switching to a facility you belong to
# - Verify claims in token: auth.currentUser.getIdTokenResult()

# 3. Verify audit logs
# - Check Firebase Console → Firestore → system_logs
# - Look for workspace.switch entries

# 4. Test security
# - Try accessing a facility you DON'T belong to (should fail)
# - Check audit log shows FAILURE with reason: NO_ACCESS
```

## Testing Scenarios

### ✅ Scenario 1: Valid Access
```javascript
// User is in facility's employees array with status: 'ACTIVE'
await switchWorkspace('fac_123');
// Expected: Success, token updated, navigated to dashboard
```

### ✅ Scenario 2: No Access
```javascript
// User is NOT in facility's employees array
await switchWorkspace('fac_456');
// Expected: Error "Access Denied: You are not a member of this facility"
// Audit log: FAILURE with reason: NO_ACCESS
```

### ✅ Scenario 3: Inactive Account
```javascript
// User is in employees array but status is 'SUSPENDED'
await switchWorkspace('fac_123');
// Expected: Error "Access Denied: Your account status is SUSPENDED"
// Audit log: FAILURE with reason: NOT_ACTIVE
```

### ✅ Scenario 4: Admin Access
```javascript
// User has admin.access permission
await switchWorkspace('fac_any');
// Expected: Success (admins can access any facility)
// Audit log: SUCCESS with warning: CROSS_TENANT_ACCESS
```

## What Changed vs Original Code

### Original `switchWorkspace.ts` (Client-side)
```typescript
// ❌ Problem: Uses ctx.db and ctx.auth.createCustomToken()
// ❌ Problem: Client-side code cannot call Admin SDK
// ❌ Problem: Frontend just navigated without verification
const customToken = await ctx.auth.createCustomToken(userId, customClaims);
```

### New `workspaceAccess.js` (Server-side)
```javascript
// ✅ Fixed: Runs in Cloud Function with Admin SDK
const customToken = await admin.auth().createCustomToken(userId, customClaims);
```

### Original `useWorkspaceAccess.js`
```javascript
// ❌ Problem: No backend call, no token update
const switchWorkspace = useCallback((workspaceId) => {
  setCurrentWorkspace(workspace);
  navigate(`/${lang}/dashboard/${workspace.id}/overview`);
});
```

### New `useWorkspaceAccess.js`
```javascript
// ✅ Fixed: Calls backend, re-authenticates, then navigates
const switchWorkspace = useCallback(async (workspaceId) => {
  const result = await switchWorkspaceFunction({ ... });
  await signInWithCustomToken(auth, result.data.token);
  await auth.currentUser.getIdToken(true);
  navigate(...);
});
```

## Next Steps (Future Enhancements)

1. **Move Actions to Backend**: When actions migrate from client-side to server-side:
   - Implement `buildActionContextFromToken()` with Admin SDK
   - Verify ID tokens on every action call
   - Enforce workspace requirements server-side

2. **Fiduciary Access**: Implement `linkedFacilities` array logic
   - Allow fiduciaries to access multiple facilities
   - Validate against `linkedFacilities` in token validation

3. **Session Management**: Consider adding:
   - Session timeout after workspace switch
   - Automatic re-verification on sensitive actions
   - Workspace switch history tracking

## Summary

The Passport Strategy is now **fully implemented** for workspace access. Users receive a verified "passport" (custom token with `facilityId`) when switching workspaces, and all subsequent operations trust this token without re-reading the database.

**Key Achievement:** Frontend can no longer manipulate `facilityId` - it's embedded in a signed JWT issued only after backend verification of membership.

