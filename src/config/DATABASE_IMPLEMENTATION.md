# Database Implementation & Context Access Rules

## Overview

The MediShift application uses a **dual-collection Firestore architecture** with a centralized database named `medishift`. The database structure directly determines user context, tutorial progression, and profile tab accessibility.

---

## Database Architecture

### Core Collections

#### 1. `users` Collection
**Purpose**: Core user identity and authentication linkage  
**Document ID**: `userId` (Firebase Auth UID)

**Key Fields**:
- `roles`: Array of role objects: `[{facility_uid: string, roles: string[]}]`
  - Professional workspace access: Determined by `professionalProfiles/{userId}` document existence
  - Facility workspace access: Determined by `roles` array containing entries with `facility_uid`
  - Admin workspace access: Determined by `admins/{userId}` document existence with `isActive !== false`
- `onboardingData`: Transient data stored during onboarding process (deleted after profile creation)
- `email`, `displayName`, `photoURL`, `createdAt`, `updatedAt`: Standard user fields

**Workspace Determination**:
- Use `hasProfessionalAccess(userId)` from `src/utils/workspaceAccess.js`
- Use `hasFacilityAccess(userData, facilityId)` from `src/utils/workspaceAccess.js`
- Use `hasAdminAccess(userId)` from `src/utils/workspaceAccess.js`

#### 2. `professionalProfiles` Collection
**Purpose**: Detailed professional profile data  
**Document ID**: `userId` (matches `users` document ID)

**Access Rule**: Document existence determines professional workspace access

**Key Fields**:
- `tutorialAccessMode`: `'enabled'` | `'disabled'` | `'loading'`
- `currentStepIndex`: Number (current tutorial step index)
- `subscriptionTier`: `'free'` | `'basic'` | `'premium'` | `'enterprise'` (default: `'free'`)
- Profile data fields (personal details, professional background, billing, documents)

#### 3. `facilityProfiles` Collection
**Purpose**: Facility/employer profile data  
**Document ID**: `facilityId`

**Access Rule**: User must have entry in `users.roles` array with matching `facility_uid`

**Key Fields**:
- `employees`: Array of employee objects: `[{user_uid: string, roles: string[]}]`
  - Roles defined centrally in `src/config/roleDefinitions.js`
  - Supports role presets and custom roles
- `facilityProfileId`: String
- `tutorialAccessMode`: `'enabled'` | `'disabled'` | `'loading'`
- `currentStepIndex`: Number (current tutorial step index)
- `subscriptionTier`: `'free'` | `'basic'` | `'premium'` | `'enterprise'` (default: `'free'`)

#### 4. `admins` Collection
**Purpose**: Admin user accounts  
**Document ID**: `userId`

**Key Fields**:
- `isActive`: Boolean (must not be `false` for access)
- `roles`: Array of admin roles (defined in `src/config/roleDefinitions.js`)

**Access Rule**: Document must exist with `isActive !== false`

---

## Context Determination

### Professional Context
**Trigger**: `professionalProfiles/{userId}` document EXISTS

**Database Operations**:
- Reads from: `users` + `professionalProfiles`
- Writes to: `users` + `professionalProfiles`
- Workspace Type: `WORKSPACE_TYPES.PERSONAL`

### Facility Context
**Trigger**: User has entry in `users.roles` array with `facility_uid` matching the facility

**Database Operations**:
- Reads from: `users` + `facilityProfiles`
- Writes to: `users` + `facilityProfiles`
- Workspace Type: `WORKSPACE_TYPES.FACILITY`

**Additional Rules**:
- Facility document must exist in `facilityProfiles`
- Employee roles in `facilityProfiles.employees[]` mirror `users.roles` structure

### Admin Context
**Trigger**: Document exists in `admins` collection with `isActive !== false`

**Database Operations**:
- Reads from: All collections (with security rules)
- Writes to: All collections (with security rules)
- Workspace Type: `WORKSPACE_TYPES.ADMIN`

**Bypass Rules**:
- Onboarding completion not required
- Profile creation not required
- Tutorial progression not enforced

---

## Tutorial System

### Tutorial Progress Storage

**Database**: Only `currentStepIndex` stored in profile collection  
**Local Storage**: Full tutorial state stored in `LOCALSTORAGE_KEYS.TUTORIAL_STATE`

**Profile Fields**:
```javascript
{
  tutorialAccessMode: 'enabled' | 'disabled' | 'loading',
  currentStepIndex: 0
}
```

### Tutorial Access Mode

**Values**:
- `'enabled'`: Tutorials active, all features accessible after completion
- `'disabled'`: Tutorials skipped, features accessible based on subscription
- `'loading'`: Pending user choice (temporary state)

**Impact on Features**:
- `'enabled'`: Complete tutorial flow → unlock all features
- `'disabled'`: Skip tutorial → features based on subscription tier
- `'loading'`: Blocks progression until choice made

### Tab Access During Tutorial

**During Tutorial** (`isTutorialActive === true`):
- User can only access tabs up to `maxAccessedProfileTab` (stored locally)
- Tab completion unlocks next tab in sequence
- Hardcoded sequence: Personal Details → Professional Background → Billing → Documents

**After Tutorial** (`tutorialAccessMode !== 'loading'`):
- Tab access based on subscription tier
- Feature access based on `subscriptionTier` field

---

## Subscription Tiers

**Defined in**: `src/config/subscriptionTiers.js`

**Tiers**:
- `free`: Basic access
- `basic`: Standard features
- `premium`: Advanced features (e.g., Organization tab in facility)
- `enterprise`: Full platform access

**Feature Restrictions**:
- Organization tab (facility): Requires `premium` tier
- Use `canAccessFeature(userTier, featureName)` for checks

---

## Role Definitions

**Defined in**: `src/config/roleDefinitions.js`

### Facility Roles
- `admin`: Full facility management
- `scheduler`: Schedule management
- `recruiter`: Position posting and hiring
- `employee`: Basic access

### Admin Roles
- `super_admin`: Full platform control
- `admin`: User and facility management
- `support`: Read access and support tools

**Permission Checks**: Use `hasPermission(userRoles, permission)` function

---

## Database Enforcement

### Profile Creation

**Rule**: Profile document can only be created if:
1. User has completed onboarding (onboardingData exists), OR
2. User is admin (`admins/{userId}` exists with `isActive !== false`)

**Enforced In**: `functions/database/index.js` → `updateUserProfile`

### Collection Selection

Profile collection determined by checking document existence:
```javascript
const professionalExists = await professionalProfileDoc.exists();
const facilityExists = await facilityProfileDoc.exists();
```

### Role Synchronization

**Trigger**: `functions/triggers/roleSync.js`

When `facilityProfiles.employees` changes:
- Adds/removes entries from `users.roles` array
- Maintains consistency between facility and user documents

---

## Session Validation

### Session Token Structure

**Cookie Name**: `medishift_session_{workspaceType}_{facilityId?}`

**Validation Rules**:

1. **Personal Workspace** (`workspaceType === 'personal'`):
   - `professionalProfiles/{userId}` must exist

2. **Facility Workspace** (`workspaceType === 'facility'`):
   - User must have entry in `users.roles` array with matching `facility_uid`
   - `facilityProfiles/{facilityId}` must exist

3. **Admin Workspace** (`workspaceType === 'admin'`):
   - `admins/{userId}` must exist with `isActive !== false`

---

## Key Constants

### Database Constants
**Location**: `src/config/keysDatabase.js` & `functions/config/keysDatabase.js`

```javascript
FIRESTORE_COLLECTIONS = {
  USERS: 'users',
  PROFESSIONAL_PROFILES: 'professionalProfiles',
  FACILITY_PROFILES: 'facilityProfiles',
  ADMINS: 'admins'
}

FIRESTORE_DATABASE_NAME = 'medishift'

WORKSPACE_TYPES = {
  PERSONAL: 'personal',
  FACILITY: 'facility',
  ADMIN: 'admin'
}
```

---

## Summary

The database structure enforces **single source of truth** through:

1. **Workspace Access**:
   - Professional: `professionalProfiles/{userId}` existence
   - Facility: `users.roles` array with `facility_uid`
   - Admin: `admins/{userId}` existence with `isActive !== false`

2. **Tutorial State**:
   - `tutorialAccessMode` in profile collection (single field)
   - `currentStepIndex` for progress tracking
   - Full state in localStorage (transient)

3. **Role Management**:
   - `users.roles`: `[{facility_uid, roles: []}]` for facility access
   - `facilityProfiles.employees`: `[{user_uid, roles: []}]` for facility permissions
   - Centralized definitions in `src/config/roleDefinitions.js`

4. **Subscription Gating**:
   - `subscriptionTier` in profile collections
   - Feature access via `src/config/subscriptionTiers.js`
