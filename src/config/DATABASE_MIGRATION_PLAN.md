# Database Migration Implementation Plan

## Overview

This plan implements a **single source of truth** architecture, removing all legacy fields and backward compatibility. The migration focuses on profile-based access control, simplified tutorial management, and centralized role definitions.

---

## Phase 1: Core Database Schema Changes

### 1.1 Remove Legacy Fields from `users` Collection

**Remove**:
- `role` (string)
- `profileType` (string)
- `onboardingProgress.{type}.completed` (boolean)
- `tutorialProgress` (entire nested object)
- `facilityMemberships` (array)
- `profileCompleted` (boolean)
- `tutorialPassed` (boolean)

**Add**:
- `roles`: Array of maps `[{facility_uid: string, roles: string[]}]`
- `onboardingData`: Transient object (deleted after profile creation)

**Files to Update**:
- `functions/database/index.js` - Remove role-based logic
- `src/dashboard/hooks/useProfileData.js` - Use profile existence checks
- `src/utils/sessionAuth.js` - Update workspace validation
- `src/dashboard/contexts/DashboardContext.js` - Remove role checks

### 1.2 Restructure `roles` Array

**New Structure**:
```javascript
roles: [
  {
    facility_uid: "facility123",
    roles: ["admin", "scheduler", "recruiter"]
  },
  {
    facility_uid: "facility456", 
    roles: ["employee"]
  }
]
```

**Implementation**:
- Create `src/config/roleDefinitions.js` - Central role definitions
- Create `src/config/subscriptionTiers.js` - Subscription tier constants
- Update `functions/database/index.js` - Handle new roles structure
- Update `src/utils/sessionAuth.js` - Validate facility access via roles array

### 1.3 Update Profile Collections

**`professionalProfiles` Changes**:
- Remove: `profileCompleted`, `profileCompletedAt`
- Add: `currentStepIndex` (number, e.g., 1.3)
- Add: `subscriptionTier` (string)
- Keep: `tutorialAccessMode` ('full' | 'loading')

**`facilityProfiles` Changes**:
- Remove: `profileCompleted`, `profileCompletedAt`
- Remove: `employees[].rights` (string)
- Add: `employees[].roles` (array of strings)
- Add: `currentStepIndex` (number)
- Add: `subscriptionTier` (string)
- Change: `tutorialAccessMode` ('full' | 'loading') - remove 'team'

**Files to Update**:
- `functions/database/index.js` - Update profile creation/update logic
- `src/dashboard/pages/profile/Profile.js` - Remove profileCompleted checks
- `src/dashboard/contexts/TutorialContext.js` - Use currentStepIndex only

---

## Phase 2: Context Determination Refactor

### 2.1 Professional Context

**Old Logic**: `users.role === 'professional'`

**New Logic**: `professionalProfiles/{userId}` exists

**Implementation**:
```javascript
// src/utils/workspaceAccess.js (NEW)
export const hasProfessionalAccess = async (userId) => {
  const profileDoc = await getDoc(doc(db, FIRESTORE_COLLECTIONS.PROFESSIONAL_PROFILES, userId));
  return profileDoc.exists();
};
```

**Files to Update**:
- `src/utils/sessionAuth.js` - Replace role checks
- `src/dashboard/contexts/DashboardContext.js` - Use profile existence
- `functions/database/index.js` - Remove role parameter

### 2.2 Facility Context

**Old Logic**: `users.role === 'facility' || users.role === 'company'`

**New Logic**: Check `users.roles` array for facility entries

**Implementation**:
```javascript
// src/utils/workspaceAccess.js (NEW)
export const hasFacilityAccess = (userData, facilityId) => {
  const roles = userData.roles || [];
  return roles.some(r => r.facility_uid === facilityId);
};

export const getFacilityRoles = (userData, facilityId) => {
  const facilityRole = userData.roles?.find(r => r.facility_uid === facilityId);
  return facilityRole?.roles || [];
};
```

**Files to Update**:
- `src/utils/sessionAuth.js` - Use roles array
- `src/dashboard/contexts/DashboardContext.js` - Update workspace detection
- `functions/database/index.js` - Update facility membership logic

### 2.3 Admin Context

**Keep**: `admins/{userId}` existence check

**Add**: `admins.roles` array (similar structure to users.roles)

**Implementation**:
- Create `src/config/adminRoleDefinitions.js` - Admin role definitions
- Update `src/utils/sessionAuth.js` - Check admin roles array
- Update `functions/database/index.js` - Handle admin roles

### 2.4 Workspace Type Rename

**Change**: `WORKSPACE_TYPES.TEAM` → `WORKSPACE_TYPES.FACILITY`

**Files to Update**:
- `src/config/keysDatabase.js` - Update constant
- `src/utils/sessionAuth.js` - Update references
- All files using `WORKSPACE_TYPES.TEAM`

---

## Phase 3: Tutorial System Simplification

### 3.1 Tutorial Progress Storage

**Old**: Complex nested structure in `users.tutorialProgress`

**New**: 
- **localStorage**: All tutorial state (deleted when inactive)
- **Database**: Only `{profileCollection}.currentStepIndex` (e.g., 1.3)
- **Database**: Only `{profileCollection}.tutorialAccessMode` on update

**Implementation**:
```javascript
// src/dashboard/contexts/TutorialContext/utils/tutorialStorage.js (REFACTOR)
export const saveTutorialStep = async (profileCollection, userId, stepIndex) => {
  // Only save currentStepIndex to database
  await updateDoc(doc(db, profileCollection, userId), {
    currentStepIndex: stepIndex, // e.g., 1.3
    updatedAt: serverTimestamp()
  });
};

export const saveTutorialAccessMode = async (profileCollection, userId, accessMode) => {
  // Only save when user makes choice
  await updateDoc(doc(db, profileCollection, userId), {
    tutorialAccessMode: accessMode,
    updatedAt: serverTimestamp()
  });
};
```

**Files to Update**:
- `src/dashboard/contexts/TutorialContext.js` - Use localStorage only
- `src/dashboard/contexts/TutorialContext/utils/tutorialStorage.js` - Simplify
- Remove all `tutorialProgress` nested structure logic

### 3.2 Tutorial Access Mode as Single Source

**Remove**: `profileCompleted`, `tutorialPassed`, `onboardingProgress.completed`

**Use**: `tutorialAccessMode` as single source of truth

**Logic**:
- `'loading'`: Tutorial active, tabs locked except Personal Details
- `'full'`: Tutorial complete, all features unlocked (subject to subscription tier)

**Files to Update**:
- `src/dashboard/pages/profile/Profile.js` - Check tutorialAccessMode only
- `src/dashboard/contexts/TutorialContext.js` - Remove completion flags
- `functions/database/index.js` - Remove profileCompleted logic

### 3.3 Hardcoded Tutorial Steps

**Implementation**: Use centralized tutorial steps from `src/config/tutorialSystem.js`

**Tab Progression**: Sequential based on hardcoded step order

**Files to Update**:
- `src/dashboard/pages/profile/Profile.js` - Use hardcoded step sequence
- `src/dashboard/contexts/TutorialContext.js` - Remove dynamic step calculation

---

## Phase 4: Onboarding Data Management

### 4.1 Onboarding Data Cleanup

**Requirement**: Delete all onboarding data after profile creation

**Implementation**:
```javascript
// functions/database/index.js
const cleanupOnboardingData = async (userId, profileType) => {
  const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId);
  
  // Delete onboarding fields
  await updateDoc(userRef, {
    onboardingData: null,
    onboardingProgress: null,
    // Transfer any remaining data to profile first
  });
  
  // Delete onboarding documents if they exist
  // Delete GLN extraction data
  // Delete OCR document data
};
```

**Files to Update**:
- `functions/database/index.js` - Add cleanup after profile creation
- `src/pages/Onboarding/OnboardingPage.js` - Transfer all data to profile

### 4.2 Onboarding Step 1 Restriction

**Requirement**: Block professional selection if professional profile exists

**Implementation**:
```javascript
// src/pages/Onboarding/OnboardingPage.js
const checkProfessionalProfileExists = async (userId) => {
  const profileDoc = await getDoc(doc(db, FIRESTORE_COLLECTIONS.PROFESSIONAL_PROFILES, userId));
  return profileDoc.exists();
};

// Save flag in localStorage
localStorage.setItem('professionalProfileExists', exists);
```

**Files to Update**:
- `src/pages/Onboarding/OnboardingPage.js` - Add check and flag

---

## Phase 5: Role System Centralization

### 5.1 Create Role Definitions

**File**: `src/config/roleDefinitions.js`

**Structure**:
```javascript
export const ROLE_DEFINITIONS = {
  FACILITY: {
    ADMIN: {
      name: 'Admin',
      permissions: ['manage_employees', 'manage_schedules', 'post_positions', ...]
    },
    SCHEDULER: {
      name: 'Scheduler',
      permissions: ['manage_schedules', 'view_employees', ...]
    },
    RECRUITER: {
      name: 'Recruiter',
      permissions: ['post_positions', 'view_applications', ...]
    },
    EMPLOYEE: {
      name: 'Employee',
      permissions: ['view_schedule', 'request_timeoff', ...]
    }
  },
  ADMIN: {
    SUPER_ADMIN: {
      name: 'Super Admin',
      permissions: ['manage_all', 'manage_admins', ...]
    },
    // ... other admin roles
  }
};

export const ROLE_SETUP_PRESETS = {
  FACILITY: [
    { name: 'Full Admin', roles: ['admin'] },
    { name: 'HR Manager', roles: ['scheduler', 'recruiter'] },
    { name: 'Team Lead', roles: ['scheduler', 'employee'] },
    { name: 'Staff Member', roles: ['employee'] }
  ]
};
```

**Files to Create**:
- `src/config/roleDefinitions.js`
- `src/config/adminRoleDefinitions.js`
- `src/utils/roleHelpers.js` - Role validation and permission checks

### 5.2 Update Employees Structure

**Old**: `employees: [{uid: string, rights: 'admin' | 'employee'}]`

**New**: `employees: [{user_uid: string, roles: string[]}]`

**Files to Update**:
- `functions/database/index.js` - Update employee structure
- `src/dashboard/pages/profile/facilities/components/Organization.js` - Update UI
- `src/dashboard/admin/utils/rbac.js` - Use new structure

---

## Phase 6: Subscription Tier System

### 6.1 Create Subscription Tier Config

**File**: `src/config/subscriptionTiers.js`

**Structure**:
```javascript
export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  BASIC: 'basic',
  PREMIUM: 'premium',
  ENTERPRISE: 'enterprise'
};

export const FEATURE_TIER_REQUIREMENTS = {
  ORGANIZATION_TAB: SUBSCRIPTION_TIERS.PREMIUM
};

export const checkSubscriptionAccess = (userTier, requiredTier) => {
  const tierOrder = [SUBSCRIPTION_TIERS.FREE, SUBSCRIPTION_TIERS.BASIC, 
                     SUBSCRIPTION_TIERS.PREMIUM, SUBSCRIPTION_TIERS.ENTERPRISE];
  return tierOrder.indexOf(userTier) >= tierOrder.indexOf(requiredTier);
};
```

**Files to Create**:
- `src/config/subscriptionTiers.js`
- `src/utils/subscriptionHelpers.js` - Subscription management functions

### 6.2 Add Subscription Tier to Profiles

**Add Field**: `subscriptionTier` to both `professionalProfiles` and `facilityProfiles`

**Files to Update**:
- `functions/database/index.js` - Add subscriptionTier field
- `src/dashboard/pages/profile/Profile.js` - Check subscription tier for tab access

### 6.3 Organization Tab Access Control

**Requirement**: Organization tab requires PREMIUM tier, but accessible during tutorial

**Implementation**:
- Show "Discover Premium Access" option in tutorial popup menu
- Style with global subscription color
- Allow access during tutorial (read-only preview)

**Files to Update**:
- `src/dashboard/components/Header/Header.js` - Add premium option to tutorial menu
- `src/dashboard/pages/profile/facilities/components/Organization.js` - Check tier

---

## Phase 7: Migration Scripts

### 7.1 Data Migration Script

**File**: `scripts/migrateDatabase.js`

**Tasks**:
1. Migrate `users.role` → Check profile existence, create if needed
2. Migrate `users.facilityMemberships` → `users.roles` array
3. Migrate `facilityProfiles.employees[].rights` → `employees[].roles`
4. Remove deprecated fields
5. Set default `subscriptionTier` to 'free'
6. Migrate `tutorialProgress` → `currentStepIndex` (if applicable)

### 7.2 Validation Script

**File**: `scripts/validateMigration.js`

**Tasks**:
- Verify no `role` or `profileType` fields remain
- Verify all facilities have proper `roles` array structure
- Verify tutorial progress simplified
- Verify subscription tiers set

---

## Phase 8: Code Cleanup

### 8.1 Remove Legacy References

**Search and Remove**:
- All `users.role` checks → Replace with profile existence
- All `onboardingProgress.{type}.completed` → Remove
- All `profileCompleted` checks → Use `tutorialAccessMode`
- All `tutorialPassed` checks → Use `tutorialAccessMode`
- All `tutorialProgress` nested access → Use `currentStepIndex`
- All `facilityMemberships` → Use `roles` array
- All `employees[].rights` → Use `employees[].roles`

### 8.2 Update Constants

**Files**:
- `src/config/keysDatabase.js` - Remove deprecated field references
- `functions/config/keysDatabase.js` - Remove deprecated field references
- Update all workspace type references (TEAM → FACILITY)

---

## Implementation Order

1. **Phase 1.1-1.2**: Remove legacy fields, add new structures
2. **Phase 5**: Create role definitions (needed for Phase 1.2)
3. **Phase 6**: Create subscription tier system (needed for profiles)
4. **Phase 2**: Refactor context determination
5. **Phase 3**: Simplify tutorial system
6. **Phase 4**: Implement onboarding cleanup
7. **Phase 7**: Run migration scripts
8. **Phase 8**: Code cleanup and validation

---

## Breaking Changes

⚠️ **No Backward Compatibility** - This migration removes all legacy support:

1. `users.role` field completely removed
2. `tutorialProgress` nested structure removed
3. `profileCompleted` and `tutorialPassed` removed
4. `facilityMemberships` replaced with `roles` array
5. `employees[].rights` replaced with `employees[].roles`
6. Workspace type `TEAM` renamed to `FACILITY`

**Migration Required**: All existing data must be migrated before deployment.

---

## Testing Checklist

- [ ] Professional workspace access via profile existence
- [ ] Facility workspace access via roles array
- [ ] Admin workspace access unchanged
- [ ] Tutorial progress in localStorage only
- [ ] `currentStepIndex` saves to database correctly
- [ ] `tutorialAccessMode` as single source of truth
- [ ] Onboarding data cleanup after profile creation
- [ ] Role-based access control working
- [ ] Subscription tier checks for organization tab
- [ ] No legacy field references remain

