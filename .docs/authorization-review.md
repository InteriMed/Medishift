# Authorization & Access Control Implementation Review
**MediShift Platform - Facilities and Employee Level Authorization**

## Table of Contents
1. [Overview](#overview)
2. [Authorization Architecture](#authorization-architecture)
3. [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
4. [Implementation Layers](#implementation-layers)
5. [Security Assessment](#security-assessment)
6. [Strengths](#strengths)
7. [Areas for Improvement](#areas-for-improvement)
8. [Recommendations](#recommendations)

---

## Overview

The MediShift platform implements a **multi-layered authorization system** that manages access rights for:
- **Professional users** (healthcare professionals)
- **Facility administrators** (facility owners/managers)
- **Facility employees** (team members within facilities)

The authorization is implemented across three main layers:
1. **Frontend Session Management** (`sessionAuth.js`)
2. **Firebase Security Rules** (`firestore.rules`)
3. **Backend Cloud Functions** (`functions/api/index.js`)

---

## Authorization Architecture

### Role System Design

The platform uses a **role-based access control (RBAC)** system with the following role types:

```javascript
// Base Roles
- professional              // Healthcare professional
- facility_admin_{facilityId}   // Admin of specific facility
- facility_employee_{facilityId} // Employee of specific facility
```

### User Document Structure

```javascript
// users/{userId}
{
  uid: string,
  email: string,
  roles: string[],  // Array of role strings
  facilityMemberships: [
    {
      facilityProfileId: string,
      facilityName: string,
      role: 'admin' | 'employee'
    }
  ],
  professionalProfileId: string,
  // ...other fields
}
```

### Facility Document Structure

```javascript
// facilityProfiles/{facilityId}
{
  admin: string[],      // Array of user UIDs with admin access
  employees: string[],  // Array of user UIDs with employee access
  // ...other fields
}
```

---

## Role-Based Access Control (RBAC)

### 1. Workspace-Based Access Model

The platform implements two workspace types:

#### **Personal Workspace**
- **Purpose**: Individual professional profile management, marketplace activities
- **Access Requirements**:
  - Must have `professional` role, OR
  - Must be in any facility's admin/employee list

```javascript
// sessionAuth.js - hasProfessionalAccess()
const hasProfessionalAccess = (userData) => {
  if (!userData || !userData.roles) return false;
  
  // Check professional role
  if (userData.roles.includes('professional')) return true;
  
  // Check facility roles
  const facilityRoles = userData.roles.filter(role => 
    role.startsWith('facility_admin_') || role.startsWith('facility_employee_')
  );
  
  return facilityRoles.length > 0;
};
```

#### **Team Workspace**
- **Purpose**: Internal facility management, team scheduling, time-off requests
- **Access Requirements**:
  - Must have `facility_admin_{facilityId}` OR `facility_employee_{facilityId}` role
  - Must be in facility's `admin` or `employees` array (double verification)

```javascript
// sessionAuth.js - hasTeamAccess()
const hasTeamAccess = (userData, facilityId) => {
  if (!userData || !userData.roles || !facilityId) return false;
  
  const hasAdminRole = userData.roles.includes(`facility_admin_${facilityId}`);
  const hasEmployeeRole = userData.roles.includes(`facility_employee_${facilityId}`);
  
  return hasAdminRole || hasEmployeeRole;
};
```

---

## Implementation Layers

### Layer 1: Frontend Session Management

**File**: `frontend/src/utils/sessionAuth.js`

**Purpose**: Client-side session token generation and validation for workspace access

**Key Features**:
- Time-limited session tokens (1 hour expiry)
- Workspace-specific authentication
- Cookie-based session storage
- Role verification before token issuance

**Workflow**:
```javascript
// 1. Create workspace session
createWorkspaceSession(userId, workspaceType, facilityId)
  ↓
// 2. Fetch user data from Firestore
// 3. Verify permissions (hasProfessionalAccess / hasTeamAccess)
// 4. For team workspace: verify user in facility's admin/employees array
// 5. Generate session token
// 6. Store in cookies
```

**Security Characteristics**:
- ✅ Double verification (role + facility membership)
- ✅ Time-limited tokens (1 hour)
- ✅ Workspace isolation
- ⚠️ Client-side token validation (can be bypassed)
- ⚠️ Tokens stored in non-httpOnly cookies (XSS vulnerability)

---

### Layer 2: Firestore Security Rules

**File**: `firestore.rules`

**Purpose**: Server-side database access control enforced by Firebase

**Key Security Functions**:

```javascript
// Helper functions
function isAuthenticated() {
  return request.auth != null;
}

function isOwner(userId) {
  return isAuthenticated() && request.auth.uid == userId;
}

function isFacilityAdmin(facilityProfileId) {
  return isAuthenticated() && 
    exists(/databases/$(database)/documents/facilityProfiles/$(facilityProfileId)) &&
    request.auth.uid in get(/databases/$(database)/documents/facilityProfiles/$(facilityProfileId)).data.admin;
}
```

**Permission Matrix**:

| Collection | Read | Create | Update | Delete |
|------------|------|--------|--------|--------|
| **users** | Owner only | Owner only | Owner only | ❌ Disabled |
| **professionalProfiles** | Owner only | Owner + validation | Owner + validation | ❌ Disabled |
| **facilityProfiles** | Owner only | Owner only | Owner only | ❌ Disabled |
| **contracts** | Participants only | Participants only | Participants (with status checks) | ❌ Disabled |
| **positions** | All authenticated | Facility admin only | Facility admin only | ❌ Disabled |
| **professionalAvailabilities** | All authenticated | Owner only | Owner only | Owner only |
| **conversations** | Participants only | Participants only | Participants only | ❌ Disabled |
| **calendar_events** | Owner only | Owner only | Owner only | Owner only |

**Key Authorization Checks**:

1. **Position Creation** (Marketplace):
```javascript
// Only facility admins can create positions
allow create: if isAuthenticated() 
  && request.resource.data.postedByUserId == request.auth.uid
  && isFacilityAdmin(request.resource.data.facilityProfileId);
```

2. **Position Applications**:
```javascript
allow read: if isAuthenticated() && (
  resource.data.userId == request.auth.uid ||
  isFacilityAdmin(get(/databases/$(database)/documents/positions/$(positionId)).data.facilityProfileId)
);
```

3. **Facility Messages**:
```javascript
// Verified through participantIds array and facility admin check
allow read: if isAuthenticated() && (
  resource.data.participantIds != null && request.auth.uid in resource.data.participantIds
);
```

---

### Layer 3: Backend Cloud Functions

**File**: `functions/api/index.js`

**Purpose**: Server-side business logic and additional authorization

**Key API Endpoints**:

#### **1. Contract API** (`contractAPI`)

**Authorization Checks**:
```javascript
// All operations require authentication
if (!context.auth) {
  throw new functions.https.HttpsError('unauthenticated', 'You must be logged in');
}

// User must be participant in contract
const isProfessional = contract.parties?.professional?.profileId === userId;
const isEmployer = contract.parties?.employer?.profileId === userId;
const isParticipant = contract.participants?.includes(userId);

if (!isProfessional && !isEmployer && !isParticipant) {
  throw new functions.https.HttpsError('permission-denied', 'Access denied');
}
```

#### **2. Marketplace API** (`marketplaceAPI`)

**Position Creation Authorization**:
```javascript
case 'createPosition': {
  // Verify user is admin of the facility
  const facilityDoc = await admin.firestore()
    .collection('facilityProfiles')
    .doc(facilityProfileId)
    .get();
  
  const facilityData = facilityDoc.data();
  if (!facilityData.admin || !facilityData.admin.includes(userId)) {
    throw new functions.https.HttpsError('permission-denied', 
      'Only facility admins can create positions');
  }
  // ...proceed with creation
}
```

**Application Retrieval Authorization**:
```javascript
case 'getPosition': {
  // Get applications only if user is facility admin
  if (position.facilityProfileId) {
    const facilityDoc = await admin.firestore()
      .collection('facilityProfiles')
      .doc(position.facilityProfileId)
      .get();
    
    const facilityData = facilityDoc.data();
    if (facilityData.admin && facilityData.admin.includes(userId)) {
      // User is admin - fetch applications
      const applicationsSnapshot = await admin.firestore()
        .collection('positions')
        .doc(positionId)
        .collection('applications')
        .get();
      // ...return applications
    }
  }
}
```

#### **3. Messages API** (`messagesAPI`)

**Facility Conversations Authorization**:
```javascript
case 'getConversations': {
  if (messageContext === 'facility' && facilityId) {
    // Verify user is admin of the facility
    const facilityDoc = await admin.firestore()
      .collection('facilityProfiles')
      .doc(facilityId)
      .get();
    
    const facilityData = facilityDoc.data();
    if (!facilityData.admin || !facilityData.admin.includes(userId)) {
      throw new functions.https.HttpsError('permission-denied',
        'You do not have permission to view this facility\'s conversations');
    }
    // ...fetch facility conversations
  }
}
```

#### **4. Calendar API** (`calendarFunctions`)

**Event Creation Authorization**:
```javascript
// Authorization: Verify user has permission to create this type of event
if (targetUserId !== decodedToken.uid) {
  // Additional checks for managers creating events for employees
  if (workspaceContext.type === 'team' && workspaceContext.facilityProfileId) {
    const facilityDoc = await db.collection('facilityProfiles')
      .doc(workspaceContext.facilityProfileId)
      .get();
    
    const facilityData = facilityDoc.data();
    if (!facilityData.admin.includes(decodedToken.uid)) {
      res.status(403).json({ error: 'Only facility admins can create events for employees' });
      return;
    }
  } else {
    res.status(403).json({ error: 'You can only create events for yourself' });
    return;
  }
}
```

---

## Security Assessment

### Defense-in-Depth Strategy

The platform implements **three layers of security**:

1. **Frontend Session Management** (Layer 1)
   - First line of defense
   - Prevents unauthorized UI access
   - Can be bypassed by determined attackers

2. **Firestore Security Rules** (Layer 2)
   - **Primary security enforcement**
   - Cannot be bypassed
   - Validated on every database operation
   - Trusted layer

3. **Backend Cloud Functions** (Layer 3)
   - Additional business logic validation
   - Complex authorization checks
   - Audit trail creation
   - Cannot be bypassed

**Security Principle**: Even if Layer 1 is bypassed, Layers 2 and 3 prevent unauthorized data access.

---

## Strengths

### ✅ **1. Multi-Layer Authorization**
- Defense-in-depth approach with three independent security layers
- Frontend session management + Firestore rules + Backend validation
- Provides redundancy and prevents single points of failure

### ✅ **2. Granular Role System**
- Facility-specific roles (`facility_admin_{facilityId}`)
- Prevents cross-facility privilege escalation
- Clear separation between admin and employee roles

### ✅ **3. Double Verification for Team Access**
- Checks both role string AND facility membership array
```javascript
// sessionAuth.js - createWorkspaceSession()
// 1. Check role
if (!hasTeamAccess(userData, facilityId)) return null;

// 2. Verify facility document membership
const facilityData = facilityDoc.data();
const isAdmin = facilityData.admin && facilityData.admin.includes(userId);
const isEmployee = facilityData.employees && facilityData.employees.includes(userId);

if (!isAdmin && !isEmployee) return null;
```

### ✅ **4. Comprehensive Firestore Rules**
- All collections have explicit read/write rules
- Helper functions (isFacilityAdmin) reduce code duplication
- Most sensitive operations require owner verification
- Data validation built into rules

### ✅ **5. Backend Authorization for Critical Operations**
- Position creation/management requires facility admin verification
- Application access controlled by facility admin status
- Facility conversations require admin role
- Cross-facility access properly restricted

### ✅ **6. Workspace Isolation**
- Clear separation between personal and team workspaces
- Session tokens are workspace-specific
- Prevents accidental cross-workspace data leakage

### ✅ **7. Disabled Deletions**
- Most collections disable delete operations
- Forces soft deletes via status fields
- Maintains audit trail

### ✅ **8. Participant-Based Access for Contracts & Messages**
- Contract access based on participant arrays
- Message access based on participantIds
- Prevents unauthorized third-party access

---

## Areas for Improvement

### ⚠️ **1. Session Security Concerns**

**Current Implementation**:
```javascript
// sessionAuth.js
Cookies.set(cookieName, sessionToken, {
  expires: SESSION_EXPIRY_HOURS / 24,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  httpOnly: false  // ⚠️ XSS vulnerability
});

// Token generation (not cryptographically secure)
return btoa(JSON.stringify(tokenData)); // ⚠️ Base64 encoding, not encryption
```

**Issues**:
- Tokens not httpOnly → vulnerable to XSS attacks
- Base64 encoding, not proper encryption or JWT
- No token signing → can be forged
- No token revocation mechanism

**Recommendation**:
- Use Firebase Auth ID tokens instead of custom tokens
- Enable httpOnly cookies in production
- Implement proper JWT with signing
- Add server-side session store (Redis) for revocation

---

### ⚠️ **2. Role Synchronization**

**Current State**:
- Roles stored in user document (`roles` array)
- Facility memberships stored in facility document (`admin`, `employees` arrays)
- **No automatic synchronization** between these two sources

**Potential Issues**:
```javascript
// Scenario: Admin removes user from facility
// 1. Remove from facilityProfiles/{id}/admin array ✅
// 2. Remove from user/roles array ❌ (manual step)
// 3. Remove from user/facilityMemberships ❌ (manual step)

// Result: Inconsistent state
```

**Recommendation**:
- Implement Firestore trigger to sync role changes
- When facility admin/employees array updates → update user roles
- Maintain single source of truth

---

### ⚠️ **3. Missing Role Hierarchy**

**Current Implementation**:
- Flat role structure
- Admins and employees have separate checks

**Issues**:
```javascript
// useMessagesData.js
const canAccessFacilityMessages = useMemo(() => {
  if (activeTab !== MESSAGE_CONTEXTS.FACILITY) return false;
  if (selectedWorkspace?.type !== WORKSPACE_TYPES.TEAM) return false;
  
  const role = selectedWorkspace.role;
  return role && role !== 'employee'; // ⚠️ Admin check is implicit
}, [activeTab, selectedWorkspace]);
```

**Recommendation**:
- Define explicit role hierarchy:
  - `facility_owner_{id}` (full access)
  - `facility_admin_{id}` (management access)
  - `facility_manager_{id}` (limited management)
  - `facility_employee_{id}` (basic access)
- Use permission sets instead of role checks
- Implement helper: `hasPermission(user, 'facility:messages:read', facilityId)`

---

### ⚠️ **4. Audit Logging**

**Current State**:
- Basic console logging
- Server timestamps on updates
- No comprehensive audit trail

**Missing**:
- Who made changes
- What was changed (before/after)
- When changes occurred
- IP address, user agent
- Failed authorization attempts

**Recommendation**:
```javascript
// Implement audit collection
match /audit_logs/{logId} {
  allow write: if false; // Only backend can write
  allow read: if isFacilityAdmin(...); // Admins can read
}

// Backend function to log
async function logAuditEvent(userId, action, resource, details) {
  await admin.firestore().collection('audit_logs').add({
    userId,
    action, // 'position:create', 'employee:remove'
    resource, // { type: 'position', id: 'pos123' }
    details, // before/after state
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });
}
```

---

### ⚠️ **5. Rate Limiting**

**Current State**:
- No rate limiting implementation
- Cloud Functions can be called unlimited times

**Risks**:
- Malicious users can spam position creation
- Application spam attacks
- Message bombing
- Resource exhaustion

**Recommendation**:
```javascript
// Implement rate limiting middleware
const rateLimit = require('express-rate-limit');

const createPositionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 positions per 15 minutes
  message: 'Too many positions created, please try again later'
});

app.post('/createPosition', createPositionLimiter, async (req, res) => {
  // ...
});
```

---

### ⚠️ **6. Permission Testing**

**Current State**:
- Single test file: `functions/tests/auth.test.js`
- Limited coverage of authorization scenarios

**Missing Tests**:
- Cross-facility access attempts
- Role escalation attempts
- Expired session handling
- Concurrent role modifications
- Edge cases (deleted facilities, removed users)

**Recommendation**:
```javascript
// Add comprehensive test suite
describe('Authorization Tests', () => {
  describe('Facility Admin Authorization', () => {
    it('should allow admin to create position', async () => {});
    it('should deny non-admin from creating position', async () => {});
    it('should deny admin of different facility', async () => {});
    it('should deny after admin removal', async () => {});
  });
  
  describe('Employee Authorization', () => {
    it('should allow employee to view team calendar', async () => {});
    it('should deny employee from viewing applications', async () => {});
    it('should deny employee from creating positions', async () => {});
  });
  
  describe('Cross-Facility Access', () => {
    it('should deny access to other facility data', async () => {});
    it('should isolate conversations by facility', async () => {});
  });
});
```

---

### ⚠️ **7. Employee Level Permissions**

**Current State**:
- Binary distinction: Admin vs Employee
- Employees have very limited access

**Issues**:
- Cannot delegate specific responsibilities
- No middle management roles
- All-or-nothing access model

**Recommendation**:
```javascript
// Implement granular permissions
const PERMISSIONS = {
  FACILITY_MANAGE_SETTINGS: 'facility:settings:manage',
  FACILITY_VIEW_APPLICATIONS: 'facility:applications:view',
  FACILITY_MANAGE_TEAM: 'facility:team:manage',
  FACILITY_APPROVE_TIMEOFF: 'facility:timeoff:approve',
  FACILITY_VIEW_MESSAGES: 'facility:messages:view',
  FACILITY_MANAGE_SCHEDULE: 'facility:schedule:manage'
};

// facilityProfiles document
{
  admin: ['user1'],
  employees: ['user2', 'user3'],
  permissions: {
    'user2': [
      PERMISSIONS.FACILITY_VIEW_APPLICATIONS,
      PERMISSIONS.FACILITY_VIEW_MESSAGES
    ],
    'user3': [
      PERMISSIONS.FACILITY_APPROVE_TIMEOFF,
      PERMISSIONS.FACILITY_MANAGE_SCHEDULE
    ]
  }
}
```

---

## Recommendations

### Priority 1: Critical Security

1. **Implement Proper JWT Tokens**
   - Replace base64 tokens with Firebase ID tokens
   - Add token signature verification
   - Enable httpOnly cookies

2. **Add Role Synchronization**
   - Create Firestore trigger on facility admin/employees updates
   - Automatically sync user roles array
   - Implement transaction-safe updates

3. **Implement Audit Logging**
   - Log all authorization decisions
   - Track failed access attempts
   - Store comprehensive event data

### Priority 2: Enhance Security

4. **Add Rate Limiting**
   - Implement per-user rate limits
   - Add IP-based throttling
   - Protect critical endpoints

5. **Expand Permission Testing**
   - Comprehensive test suite for all roles
   - Edge case testing
   - Security penetration testing

6. **Implement Fine-Grained Permissions**
   - Move from binary admin/employee to permission sets
   - Allow delegation of specific responsibilities
   - Support manager roles

### Priority 3: Operational Improvements

7. **Add Role Management UI**
   - Admin interface for managing team members
   - Permission assignment interface
   - Audit log viewer

8. **Implement Session Management Dashboard**
   - View active sessions
   - Force logout capabilities
   - Session history

9. **Add Authorization Documentation**
   - Document all permission checks
   - Create authorization flow diagrams
   - Maintain security runbook

---

## Summary

### Current State: **Good Foundation, Needs Hardening**

**Strengths**:
- ✅ Multi-layer security (3 layers)
- ✅ Granular facility-specific roles
- ✅ Comprehensive Firestore rules
- ✅ Double verification for team access
- ✅ Well-structured backend authorization

**Critical Gaps**:
- ⚠️ Session token security vulnerabilities
- ⚠️ No role synchronization mechanism
- ⚠️ Limited audit logging
- ⚠️ No rate limiting
- ⚠️ Binary admin/employee model

**Overall Assessment**: 
The authorization system has a **solid architectural foundation** with proper separation of concerns and defense-in-depth. However, it requires **security hardening** in session management, synchronization mechanisms, and audit capabilities before production deployment. The role system would benefit from more granular permissions to support real-world facility management scenarios.

**Production Readiness**: 6/10
- Suitable for MVP/beta testing
- Requires security improvements before full production
- Strong foundation for future enhancements
