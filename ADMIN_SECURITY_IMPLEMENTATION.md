# Admin Portal Security Implementation

**Date**: 2026-01-28  
**Priority**: 🔴 **CRITICAL**  
**Status**: In Progress

---

## Executive Summary

The Admin Portal provides MediShift internal team members with access to sensitive operations including:
- User verification and impersonation
- Financial data and margin analysis
- System-wide operations and billing
- Platform administration

**Critical Security Requirement**: Admin access must be **strictly limited to MediShift employees only**. Professionals, facilities, and organization users must **never** have access to the admin portal, even if they somehow obtain admin-related data or tokens.

---

## Current Security Analysis

### ✅ **What's Currently Secure**

1. **Frontend Route Protection** (`AdminRoute.js`)
   - Checks `isAdmin()` from both AuthContext and DashboardContext
   - Verifies workspace type is `WORKSPACE_TYPES.ADMIN`
   - Redirects unauthorized users

2. **RBAC System** (`admin/utils/rbac.js`)
   - Role-based access control with 5 admin roles
   - Permission-based feature access (18 permissions)
   - Granular right checking

3. **Workspace Isolation** (`workspaceDefinitions.js`)
   - Admin workspace only available if `admins/{userId}` document exists
   - Workspace switching enforces admin status check

4. **Firestore Rules** (`firestore.rules`)
   - `admins` collection requires authentication
   - `isAdmin()` and `isSuperAdminUser()` helper functions
   - Admin bypass for facility/organization access

### ⚠️ **Security Gaps Identified**

#### 1. **CLIENT-SIDE ADMIN ACTIONS** (🔴 CRITICAL)
**Issue**: Admin actions currently run client-side, which means:
- User can manipulate browser code
- Financial calculations done in browser
- No server-side verification of admin status
- Vulnerable to token manipulation

**Affected Actions**:
- `admin.provision_tenant` - Create new tenants
- `admin.manage_billing` - Billing operations
- `admin.impersonate_user` - User impersonation
- `admin.broadcast_system_alert` - System alerts

#### 2. **MISSING BACKEND VERIFICATION** (🔴 CRITICAL)
**Issue**: No middleware to verify admin status on backend operations

**Impact**:
- If a user obtains an admin token (through social engineering, leaked credentials, etc.), they could:
  - Call Cloud Functions directly
  - Bypass frontend checks
  - Manipulate backend operations

**Currently Vulnerable Functions**:
- `impersonation.js` - Has some admin checks but incomplete
- Other Cloud Functions lack admin verification

#### 3. **ADMIN COLLECTION ACCESS** (🟡 MEDIUM)
**Issue**: Firestore security rules for admin collections are basic

```javascript
// Current rule
match /admins/{adminId} {
  allow read: if isAuthenticated() && (request.auth.uid == adminId || isAdmin());
  allow write: if false;
}
```

**Gap**: Rule checks `isAdmin()` which reads from Firestore, but doesn't verify:
- IP whitelisting
- Rate limiting
- Session validity
- 2FA requirements for critical operations

#### 4. **NO AUDIT LOGGING FOR ADMIN ACTIONS** (🟡 MEDIUM)
**Issue**: Admin actions not consistently logged

**Missing**:
- Who provisioned a tenant
- Who changed billing status
- Who impersonated a user
- IP addresses and session data

---

## Security Implementation Roadmap

### Phase 1: Immediate Security Hardening (Week 1)

#### Task 1.1: Backend Admin Verification Middleware ✅

Create `functions/middleware/verifyAdminAccess.js`:

```javascript
const admin = require('firebase-admin');
const { HttpsError } = require('firebase-functions/v2/https');
const { logAuditEvent, AUDIT_EVENT_TYPES } = require('../services/auditLog');

const ADMIN_ROLES = {
  SUPER_ADMIN: 'superAdmin',
  OPS_MANAGER: 'ops_manager',
  FINANCE: 'finance',
  RECRUITER: 'recruiter',
  SUPPORT: 'support'
};

const ADMIN_PERMISSIONS = {
  VIEW_DASHBOARD: 'view_dashboard',
  VIEW_FINANCE: 'view_finance',
  VIEW_BALANCE_SHEET: 'view_balance_sheet',
  VERIFY_USERS: 'verify_users',
  MANAGE_SHIFTS: 'manage_shifts',
  FORCE_ASSIGN_SHIFTS: 'force_assign_shifts',
  EDIT_PAY_RATES: 'edit_pay_rates',
  VIEW_USER_PROFILES: 'view_user_profiles',
  IMPERSONATE_USERS: 'impersonate_users',
  VIEW_AUDIT_LOGS: 'view_audit_logs',
  MANAGE_EMPLOYEES: 'manage_employees',
  SEND_NOTIFICATIONS: 'send_notifications',
  VIEW_REVENUE: 'view_revenue',
  EXPORT_DATA: 'export_data',
  DELETE_DATA: 'delete_data',
  MANAGE_SYSTEM: 'manage_system',
  PROVISION_TENANT: 'provision_tenant',
  MANAGE_BILLING: 'manage_billing'
};

const ROLE_PERMISSIONS = {
  [ADMIN_ROLES.SUPER_ADMIN]: Object.values(ADMIN_PERMISSIONS),
  [ADMIN_ROLES.OPS_MANAGER]: [
    ADMIN_PERMISSIONS.VIEW_DASHBOARD,
    ADMIN_PERMISSIONS.VERIFY_USERS,
    ADMIN_PERMISSIONS.MANAGE_SHIFTS,
    ADMIN_PERMISSIONS.VIEW_USER_PROFILES,
    ADMIN_PERMISSIONS.VIEW_AUDIT_LOGS,
  ],
  [ADMIN_ROLES.FINANCE]: [
    ADMIN_PERMISSIONS.VIEW_DASHBOARD,
    ADMIN_PERMISSIONS.VIEW_FINANCE,
    ADMIN_PERMISSIONS.VIEW_BALANCE_SHEET,
    ADMIN_PERMISSIONS.VIEW_REVENUE,
    ADMIN_PERMISSIONS.EXPORT_DATA,
  ],
  [ADMIN_ROLES.RECRUITER]: [
    ADMIN_PERMISSIONS.VIEW_DASHBOARD,
    ADMIN_PERMISSIONS.VERIFY_USERS,
    ADMIN_PERMISSIONS.MANAGE_SHIFTS,
    ADMIN_PERMISSIONS.VIEW_USER_PROFILES,
  ],
  [ADMIN_ROLES.SUPPORT]: [
    ADMIN_PERMISSIONS.VIEW_DASHBOARD,
    ADMIN_PERMISSIONS.VIEW_USER_PROFILES,
    ADMIN_PERMISSIONS.IMPERSONATE_USERS,
    ADMIN_PERMISSIONS.VIEW_AUDIT_LOGS,
  ],
};

/**
 * Verify that the request is from a valid MediShift admin
 * This is the ONLY way to verify admin access on the backend
 * 
 * @param {Object} request - Cloud Function request object
 * @param {string|Array<string>} requiredPermissions - Required permission(s)
 * @returns {Promise<Object>} Admin data object
 * @throws {HttpsError} If not authorized
 */
async function verifyAdminAccess(request, requiredPermissions = null) {
  // 1. Verify authentication
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required');
  }

  const userId = request.auth.uid;
  const db = admin.firestore();

  try {
    // 2. Fetch admin document (SINGLE SOURCE OF TRUTH)
    const adminDoc = await db.collection('admins').doc(userId).get();

    if (!adminDoc.exists()) {
      // Log unauthorized access attempt
      await logAuditEvent({
        eventType: AUDIT_EVENT_TYPES.ADMIN_ACCESS_DENIED,
        userId,
        metadata: {
          reason: 'NO_ADMIN_DOCUMENT',
          requestedPermissions: requiredPermissions,
          ipAddress: request.rawRequest.ip,
          userAgent: request.rawRequest.headers['user-agent']
        }
      });

      throw new HttpsError(
        'permission-denied',
        'Admin access required. This incident has been logged.'
      );
    }

    const adminData = adminDoc.data();

    // 3. Check if admin account is active
    if (adminData.isActive === false) {
      await logAuditEvent({
        eventType: AUDIT_EVENT_TYPES.ADMIN_ACCESS_DENIED,
        userId,
        metadata: {
          reason: 'ACCOUNT_INACTIVE',
          ipAddress: request.rawRequest.ip
        }
      });

      throw new HttpsError(
        'permission-denied',
        'Admin account is inactive'
      );
    }

    // 4. Extract admin roles
    const adminRoles = Array.isArray(adminData.roles) ? adminData.roles : [];
    const isSuperAdmin = adminRoles.includes(ADMIN_ROLES.SUPER_ADMIN) || 
                         adminRoles.includes('super_admin');

    // 5. Super admins bypass permission checks
    if (isSuperAdmin) {
      return {
        userId,
        adminData,
        role: ADMIN_ROLES.SUPER_ADMIN,
        permissions: Object.values(ADMIN_PERMISSIONS),
        isSuperAdmin: true
      };
    }

    // 6. Check required permissions
    if (requiredPermissions) {
      const requiredPermsArray = Array.isArray(requiredPermissions) 
        ? requiredPermissions 
        : [requiredPermissions];

      // Get all permissions for this admin's roles
      const adminPermissions = new Set();
      for (const role of adminRoles) {
        const rolePerms = ROLE_PERMISSIONS[role] || [];
        rolePerms.forEach(perm => adminPermissions.add(perm));
      }

      // Add custom permissions from adminData.rights
      if (Array.isArray(adminData.rights)) {
        adminData.rights.forEach(right => adminPermissions.add(right));
      }

      // Check if admin has all required permissions
      const hasAllPermissions = requiredPermsArray.every(perm => 
        adminPermissions.has(perm)
      );

      if (!hasAllPermissions) {
        await logAuditEvent({
          eventType: AUDIT_EVENT_TYPES.ADMIN_ACCESS_DENIED,
          userId,
          metadata: {
            reason: 'INSUFFICIENT_PERMISSIONS',
            requiredPermissions: requiredPermsArray,
            adminPermissions: Array.from(adminPermissions),
            ipAddress: request.rawRequest.ip
          }
        });

        throw new HttpsError(
          'permission-denied',
          `Missing required permissions: ${requiredPermsArray.join(', ')}`
        );
      }

      return {
        userId,
        adminData,
        role: adminRoles[0],
        permissions: Array.from(adminPermissions),
        isSuperAdmin: false
      };
    }

    // 7. If no specific permissions required, just verify admin status
    return {
      userId,
      adminData,
      role: adminRoles[0],
      permissions: [],
      isSuperAdmin: false
    };

  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }

    // Log unexpected errors
    console.error('[verifyAdminAccess] Unexpected error:', error);
    throw new HttpsError('internal', 'Admin verification failed');
  }
}

/**
 * Express middleware version for HTTP functions
 */
function verifyAdminMiddleware(requiredPermissions = null) {
  return async (req, res, next) => {
    try {
      const adminData = await verifyAdminAccess(req, requiredPermissions);
      req.admin = adminData;
      next();
    } catch (error) {
      res.status(error.httpErrorCode.status).json({
        error: error.message
      });
    }
  };
}

module.exports = {
  verifyAdminAccess,
  verifyAdminMiddleware,
  ADMIN_ROLES,
  ADMIN_PERMISSIONS,
  ROLE_PERMISSIONS
};
```

#### Task 1.2: Update Impersonation Function

Update `functions/api/impersonation.js` to use new middleware:

```javascript
const { verifyAdminAccess, ADMIN_PERMISSIONS } = require('../middleware/verifyAdminAccess');

exports.startImpersonation = onCall(async (request) => {
  // Verify admin access with specific permission
  const adminData = await verifyAdminAccess(request, ADMIN_PERMISSIONS.IMPERSONATE_USERS);
  
  // Rest of impersonation logic...
});
```

#### Task 1.3: Enhanced Firestore Security Rules

Update `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ADMIN ACCESS VERIFICATION
    function isValidAdmin() {
      return request.auth != null &&
             exists(/databases/$(database)/documents/admins/$(request.auth.uid)) &&
             get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.isActive != false;
    }
    
    function isSuperAdmin() {
      return isValidAdmin() &&
             ('super_admin' in get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.roles ||
              'superAdmin' in get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.roles);
    }
    
    // Admins collection - STRICT ACCESS CONTROL
    match /admins/{adminId} {
      // Only the admin themselves or super admins can read
      allow read: if isValidAdmin() && (request.auth.uid == adminId || isSuperAdmin());
      
      // Only super admins can create/update/delete admins
      allow write: if isSuperAdmin();
    }
    
    // Admin-specific collections
    match /adminAuditLogs/{logId} {
      allow read: if isValidAdmin();
      allow create: if isValidAdmin(); // Admins can log their actions
      allow update, delete: if false; // Logs are immutable
    }
    
    // System-wide operations (super admin only)
    match /systemConfig/{configId} {
      allow read: if isValidAdmin();
      allow write: if isSuperAdmin();
    }
    
    // All users collection - admins have read-all access
    match /users/{userId} {
      allow read: if request.auth != null && 
                     (request.auth.uid == userId || isValidAdmin());
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Professional profiles - admins have read-all access
    match /professionalProfiles/{profileId} {
      allow read: if request.auth != null && 
                     (request.auth.uid == profileId || isValidAdmin());
      allow write: if request.auth != null && request.auth.uid == profileId;
    }
    
    // Facility profiles - admins have full access
    match /facilityProfiles/{facilityId} {
      allow read, write: if isValidAdmin();
    }
    
    // Organizations - admins have full access
    match /organizations/{orgId} {
      allow read, write: if isValidAdmin();
    }
    
    // Remaining rules...
  }
}
```

---

### Phase 2: Backend Migration (Weeks 2-3)

#### Task 2.1: Create Backend Action Executor

Create `functions/api/adminActions.js`:

```javascript
const { onCall } = require('firebase-functions/v2/https');
const { verifyAdminAccess, ADMIN_PERMISSIONS } = require('../middleware/verifyAdminAccess');
const { logAuditEvent, AUDIT_EVENT_TYPES } = require('../services/auditLog');

// Import action handlers
const { provisionTenant } = require('./actions/provisionTenant');
const { manageBilling } = require('./actions/manageBilling');
const { broadcastSystemAlert } = require('./actions/broadcastSystemAlert');

const ADMIN_ACTION_HANDLERS = {
  'admin.provision_tenant': {
    handler: provisionTenant,
    permission: ADMIN_PERMISSIONS.PROVISION_TENANT
  },
  'admin.manage_billing': {
    handler: manageBilling,
    permission: ADMIN_PERMISSIONS.MANAGE_BILLING
  },
  'admin.broadcast_system_alert': {
    handler: broadcastSystemAlert,
    permission: ADMIN_PERMISSIONS.SEND_NOTIFICATIONS
  },
  // Add more handlers...
};

exports.executeAdminAction = onCall(async (request) => {
  const { actionId, input } = request.data;
  
  // Lookup action handler
  const actionConfig = ADMIN_ACTION_HANDLERS[actionId];
  if (!actionConfig) {
    throw new HttpsError('not-found', `Action ${actionId} not found`);
  }
  
  // Verify admin access with specific permission
  const adminData = await verifyAdminAccess(request, actionConfig.permission);
  
  // Log action start
  await logAuditEvent({
    eventType: AUDIT_EVENT_TYPES.ADMIN_ACTION_START,
    userId: adminData.userId,
    metadata: {
      actionId,
      input,
      ipAddress: request.rawRequest.ip,
      userAgent: request.rawRequest.headers['user-agent']
    }
  });
  
  try {
    // Execute handler
    const result = await actionConfig.handler(input, {
      userId: adminData.userId,
      adminData: adminData.adminData,
      permissions: adminData.permissions,
      isSuperAdmin: adminData.isSuperAdmin,
      ipAddress: request.rawRequest.ip
    });
    
    // Log success
    await logAuditEvent({
      eventType: AUDIT_EVENT_TYPES.ADMIN_ACTION_SUCCESS,
      userId: adminData.userId,
      metadata: {
        actionId,
        resultId: result?.id,
        ipAddress: request.rawRequest.ip
      }
    });
    
    return result;
  } catch (error) {
    // Log error
    await logAuditEvent({
      eventType: AUDIT_EVENT_TYPES.ADMIN_ACTION_ERROR,
      userId: adminData.userId,
      metadata: {
        actionId,
        error: error.message,
        ipAddress: request.rawRequest.ip
      }
    });
    
    throw error;
  }
});
```

#### Task 2.2: Update Frontend to Call Backend Actions

Update `src/hooks/useAction.js`:

```typescript
import { httpsCallable } from 'firebase/functions';
import { functions } from '../services/firebase';

export function useAction() {
  const execute = async (actionId: string, input: any) => {
    // Check if action should run on backend
    const BACKEND_ADMIN_ACTIONS = [
      'admin.provision_tenant',
      'admin.manage_billing',
      'admin.broadcast_system_alert',
      'admin.impersonate_user'
    ];
    
    if (BACKEND_ADMIN_ACTIONS.includes(actionId)) {
      // BACKEND EXECUTION (SECURE)
      const executeAdminActionFn = httpsCallable(functions, 'executeAdminAction');
      const result = await executeAdminActionFn({ actionId, input });
      return result.data;
    }
    
    // Client-side execution (existing code)
    // ...
  };
  
  return { execute, loading, error };
}
```

---

### Phase 3: Enhanced Security (Week 4)

#### Task 3.1: Rate Limiting

Create `functions/middleware/rateLimit.js`:

```javascript
const admin = require('firebase-admin');
const { HttpsError } = require('firebase-functions/v2/https');

const RATE_LIMITS = {
  'admin.provision_tenant': { maxCalls: 10, windowMinutes: 60 },
  'admin.impersonate_user': { maxCalls: 20, windowMinutes: 60 },
  'admin.broadcast_system_alert': { maxCalls: 5, windowMinutes: 60 }
};

async function checkRateLimit(userId, actionId) {
  const limit = RATE_LIMITS[actionId];
  if (!limit) return; // No limit for this action
  
  const db = admin.firestore();
  const now = Date.now();
  const windowStart = now - (limit.windowMinutes * 60 * 1000);
  
  // Query recent calls
  const recentCalls = await db.collection('adminActionLogs')
    .where('userId', '==', userId)
    .where('actionId', '==', actionId)
    .where('timestamp', '>=', windowStart)
    .count()
    .get();
  
  if (recentCalls.data().count >= limit.maxCalls) {
    throw new HttpsError(
      'resource-exhausted',
      `Rate limit exceeded for ${actionId}. Max ${limit.maxCalls} calls per ${limit.windowMinutes} minutes.`
    );
  }
}

module.exports = { checkRateLimit };
```

#### Task 3.2: 2FA Requirement for Critical Actions

Add to `verifyAdminAccess.js`:

```javascript
const CRITICAL_ACTIONS_REQUIRE_2FA = [
  'admin.provision_tenant',
  'admin.manage_billing',
  'admin.impersonate_user'
];

async function verify2FA(request, actionId) {
  if (!CRITICAL_ACTIONS_REQUIRE_2FA.includes(actionId)) {
    return; // 2FA not required
  }
  
  const { twoFactorCode } = request.data;
  
  if (!twoFactorCode) {
    throw new HttpsError('failed-precondition', '2FA code required for this action');
  }
  
  // Verify 2FA code
  const is2FAValid = await verify2FACode(request.auth.uid, twoFactorCode);
  
  if (!is2FAValid) {
    throw new HttpsError('permission-denied', 'Invalid 2FA code');
  }
}
```

---

## Testing Plan

### 1. **Access Control Tests**

```javascript
describe('Admin Access Control', () => {
  it('should deny non-admin users from admin portal', async () => {
    const professionalUser = createMockUser({ roles: ['professional'] });
    const result = await attemptAdminAccess(professionalUser);
    expect(result).toThrow('permission-denied');
  });
  
  it('should deny facility users from admin portal', async () => {
    const facilityUser = createMockUser({ 
      roles: [{ facility_uid: 'fac_123', roles: ['admin'] }] 
    });
    const result = await attemptAdminAccess(facilityUser);
    expect(result).toThrow('permission-denied');
  });
  
  it('should allow valid admin users', async () => {
    const adminUser = createMockAdmin({ role: 'super_admin' });
    const result = await attemptAdminAccess(adminUser);
    expect(result).not.toThrow();
  });
});
```

### 2. **Backend Verification Tests**

```javascript
describe('Backend Admin Verification', () => {
  it('should verify admin document exists', async () => {
    const mockRequest = createMockRequest({ uid: 'user_123' });
    await expect(verifyAdminAccess(mockRequest)).rejects.toThrow();
  });
  
  it('should check admin account is active', async () => {
    await createAdminDoc('user_123', { isActive: false });
    const mockRequest = createMockRequest({ uid: 'user_123' });
    await expect(verifyAdminAccess(mockRequest)).rejects.toThrow('inactive');
  });
  
  it('should verify required permissions', async () => {
    await createAdminDoc('user_123', { 
      roles: ['support'], 
      isActive: true 
    });
    const mockRequest = createMockRequest({ uid: 'user_123' });
    await expect(
      verifyAdminAccess(mockRequest, ADMIN_PERMISSIONS.PROVISION_TENANT)
    ).rejects.toThrow('permission');
  });
});
```

### 3. **Rate Limiting Tests**

```javascript
describe('Rate Limiting', () => {
  it('should block excessive admin action calls', async () => {
    const adminUser = createMockAdmin();
    
    // Make 10 calls (within limit)
    for (let i = 0; i < 10; i++) {
      await executeAdminAction('admin.provision_tenant', {});
    }
    
    // 11th call should be blocked
    await expect(
      executeAdminAction('admin.provision_tenant', {})
    ).rejects.toThrow('rate limit');
  });
});
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] Backup all admin-related Firestore collections
- [ ] Test admin verification middleware with mock data
- [ ] Verify all admin actions route through backend
- [ ] Test rate limiting with production-like load
- [ ] Verify Firestore security rules in emulator

### Deployment

- [ ] Deploy updated Firestore security rules
- [ ] Deploy admin verification middleware
- [ ] Deploy admin action executor Cloud Function
- [ ] Update frontend to call backend admin actions
- [ ] Monitor error logs for unexpected access denials

### Post-Deployment

- [ ] Verify existing admin users can still access portal
- [ ] Test admin action execution end-to-end
- [ ] Review audit logs for suspicious activity
- [ ] Monitor rate limiting effectiveness
- [ ] Performance testing (backend execution latency)

---

## Monitoring & Alerts

### Metrics to Track

1. **Admin Access Attempts**
   - Successful logins
   - Failed login attempts
   - Access denials (with reasons)

2. **Admin Action Execution**
   - Action success rate
   - Action execution time
   - Rate limit violations

3. **Security Incidents**
   - Unauthorized access attempts
   - Token manipulation attempts
   - Suspicious IP addresses

### Alert Rules

```javascript
// Example alert configuration
{
  "adminAccessDenied": {
    "condition": "count > 5 per 10 minutes",
    "severity": "HIGH",
    "notification": "security-team@medishift.ch"
  },
  "rateLimitViolation": {
    "condition": "count > 3 per hour",
    "severity": "MEDIUM",
    "notification": "ops-team@medishift.ch"
  },
  "criticalActionExecution": {
    "condition": "action in ['provision_tenant', 'manage_billing']",
    "severity": "INFO",
    "notification": "admin-audit-log"
  }
}
```

---

## Security Best Practices

### For Developers

1. **NEVER** check admin status client-side without backend verification
2. **ALWAYS** use `verifyAdminAccess()` middleware for admin operations
3. **NEVER** expose admin tokens in frontend code or logs
4. **ALWAYS** log admin actions to audit trail
5. **NEVER** bypass admin checks even in development

### For Admins

1. **NEVER** share admin credentials
2. **ALWAYS** log out after admin sessions
3. **NEVER** access admin portal from public networks without VPN
4. **ALWAYS** use 2FA for critical operations
5. **NEVER** impersonate users without business justification (all logged)

---

## Compliance & Audit

### Swiss Data Protection (FADP)

- Admin access logs retained for 12 months
- All data exports logged with justification
- User impersonation requires documented reason
- Regular audit reviews (quarterly)

### ISO 27001 Requirements

- Role-based access control (RBAC)
- Least privilege principle
- Regular access reviews
- Incident response procedures

---

**Status**: 🟡 **In Progress**  
**Next Review**: 2026-02-28  
**Owner**: Security Team

---

## Quick Reference

### Verify Admin Status (Backend)

```javascript
const { verifyAdminAccess, ADMIN_PERMISSIONS } = require('../middleware/verifyAdminAccess');

exports.myAdminFunction = onCall(async (request) => {
  const adminData = await verifyAdminAccess(request, ADMIN_PERMISSIONS.MY_PERMISSION);
  // adminData.userId, adminData.isSuperAdmin, adminData.permissions available
});
```

### Check Admin Status (Frontend)

```javascript
import { isAdminSync } from '@/config/workspaceDefinitions';
import { useAuth } from '@/contexts/authContext';

const { userProfile } = useAuth();
const hasAdminAccess = isAdminSync(userProfile);
```

### Execute Admin Action (Frontend)

```typescript
import { useAction } from '@/hooks/useAction';

const { execute } = useAction();

const result = await execute('admin.provision_tenant', {
  organizationName: 'Example Org',
  plan: 'enterprise'
});
```

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-28

