# GLN Bypass Implementation

## OVERVIEW

Users who select "Team Access" during onboarding can now bypass GLN verification and create a professional profile without providing GLN credentials. This allows faster onboarding for users who only need team workspace access.

## CHANGES IMPLEMENTED

### 1. ProfessionalGLNVerification Component
**File:** `src/dashboard/onboarding/components/ProfessionalGLNVerification.js`

**Changes:**
- Added `allowBypass` prop to enable bypass mode when user has selected team access
- Added `bypassMode` state to track if user is in bypass mode
- Created `handleBypassVerification()` function to create profile without GLN
- Added toggle UI to enable/disable bypass mode
- Conditionally shows/hides GLN input and document upload fields based on bypass mode
- When bypassing: Only profession selection is required

**Profile Data Created in Bypass Mode:**
```javascript
{
  role: 'professional',
  profileType: 'professional',
  identity: { firstName, lastName, legalFirstName, legalLastName },
  contact: { primaryEmail, residentialAddress (empty) },
  professionalDetails: { 
    profession: <user selected>,
    education: [],
    workExperience: [],
    qualifications: []
  },
  verification: {
    identityStatus: 'not_verified',
    overallVerificationStatus: 'not_verified',
    verificationDocuments: []
  },
  GLN_certified: false,
  verificationStatus: 'not_verified',
  bypassedGLN: true
}
```

### 2. FirstTimeModal Component
**File:** `src/dashboard/onboarding/components/FirstTimeModal.js`

**Changes:**
- Passes `allowBypass={accessTeam === true}` to ProfessionalGLNVerification
- Enables bypass option only when user has selected team access in step 2

### 3. Session Authentication
**File:** `src/utils/sessionAuth.js`

**Changes:**
- Updated `hasProfessionalAccess()` function to grant access when:
  - `userData.bypassedGLN === true` AND
  - `userData.GLN_certified === false`
- This allows bypassed users to access the professional workspace

### 4. Cloud Function - updateUserProfile
**File:** `functions/database/index.js`

**Changes:**
- Updated onboarding completion check to accept bypassed profiles:
```javascript
onboardingCompleted = professionalProgress.completed === true || 
                     currentUserData.onboardingCompleted === true || 
                     currentUserData.GLN_certified === true ||
                     (currentUserData.bypassedGLN === true && currentUserData.GLN_certified === false);
```
- Allows profile creation when `bypassedGLN === true` and `GLN_certified === false`

### 5. Tutorial Context
**File:** `src/dashboard/contexts/TutorialContext.js`

**Changes:**
- Added bypass check to `isVerifiedProfile`:
```javascript
const bypassedGLN = userData.bypassedGLN === true && userData.GLN_certified === false;
const isVerifiedProfile = !!userData.GLN_certified || !!userData.isVerified || bypassedGLN;
```
- Updated professional completion check to include bypassed users

### 6. Tutorial Lifecycle Hook
**File:** `src/dashboard/contexts/TutorialContext/hooks/useTutorialLifecycle.js`

**Changes:**
- Added bypass check to onboarding completion validation:
```javascript
const bypassedGLN = userData.bypassedGLN === true && userData.GLN_certified === false;
onboardingCompleted = professionalProgress.completed === true ||
    userData.onboardingCompleted === true ||
    userData.GLN_certified === true ||
    bypassedGLN;
```

## DATABASE STRUCTURE

### users/{userId}
```javascript
{
  GLN_certified: false,
  bypassedGLN: true,
  roles: ['professional'],
  // ... other fields
}
```

### professionalProfiles/{userId}
```javascript
{
  role: 'professional',
  profileType: 'professional',
  GLN_certified: false,
  bypassedGLN: true,
  verificationStatus: 'not_verified',
  professionalDetails: {
    profession: 'User Selected Profession',
    // ... minimal data
  },
  verification: {
    identityStatus: 'not_verified',
    overallVerificationStatus: 'not_verified',
    verificationDocuments: []
  }
}
```

## USER FLOW

1. User starts onboarding (FirstTimeModal)
2. User selects "Worker" role
3. User indicates they want "Team Access" (accessTeam = true)
4. User reaches verification step (step 4)
5. **NEW:** Toggle appears: "Skip GLN Verification (Team Access)"
6. User enables bypass toggle
7. User selects profession from dropdown
8. User clicks "Complete & Start Tutorial"
9. Profile is created with:
   - `GLN_certified: false`
   - `bypassedGLN: true`
   - `profession: <selected>`
   - Minimal profile data
10. User proceeds to tutorial phase

## ACCESS CONTROL

**Team Access (Bypassed GLN):**
- ✅ Dashboard access
- ✅ Profile management
- ✅ Messages, Contracts, Calendar, Settings
- ❌ Marketplace (locked until full profile completion)

**Full Access (GLN Verified):**
- ✅ All features including Marketplace

## VALIDATION LOGIC

The system now recognizes THREE states for professional access:

1. **GLN_certified === true**: Full verification completed
2. **GLN_certified === false && bypassedGLN === true**: Team access bypass
3. **GLN_certified === false && bypassedGLN === undefined/false**: No access

## SECURITY CONSIDERATIONS

- Bypass is only available when `accessTeam === true` in onboarding
- Profile is marked with `verificationStatus: 'not_verified'`
- Bypassed users have limited feature access (no Marketplace)
- All checks validate both `GLN_certified` AND `bypassedGLN` flags
- Cloud function enforces onboarding completion including bypass path

## TESTING CHECKLIST

- [ ] User can enable bypass toggle when team access is selected
- [ ] GLN and document fields hide when bypass is enabled
- [ ] Profile creates successfully with GLN_certified: false
- [ ] User document gets bypassedGLN: true flag
- [ ] Tutorial starts after bypass profile creation
- [ ] Dashboard access granted to bypassed users
- [ ] Marketplace remains locked for bypassed users
- [ ] Session auth accepts bypassed users
- [ ] Cloud function allows profile creation for bypassed users

---

**Implementation Date:** January 2026
**Version:** 1.0

