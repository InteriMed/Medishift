# GLN_certified Completion Fix

## OVERVIEW

Ensures that when users complete onboarding with GLN verification, the `GLN_certified` field is properly set to `true` in both the `users` and `professionalProfiles` collections. Also updates the AccessLevelChoicePopup UI to improve usability.

## CHANGES IMPLEMENTED

### 1. Profile Saving Service
**File:** `src/dashboard/onboarding/services/profileSavingService.js`

#### Professional Profile - saveWorkerProfile()
**Changes:**
- Set `GLN_certified: true` in professionalProfile document (was using dynamic `glnValue`)
- Set `GLN_certified: true` in users document after profile creation
- Added logging for better tracking

**Before:**
```javascript
profileData = {
  // ...
  GLN_certified: glnValue, // Could be any value
  verificationStatus: 'verified'
};

await updateUserProfile(profileData);
await updateDoc(doc(db, 'users', currentUser.uid), {
  temporaryUploads: deleteField()
});
```

**After:**
```javascript
profileData = {
  // ...
  GLN_certified: true, // Always true on completion
  verificationStatus: 'verified'
};

await updateUserProfile(profileData);
await updateDoc(doc(db, 'users', currentUser.uid), {
  GLN_certified: true, // Ensure users doc is updated
  temporaryUploads: deleteField()
});
console.log('[GLNVerification] Set GLN_certified: true in users document');
```

#### Facility Profile - saveFacilityProfile()
**Changes:**
- Set `GLN_certified: true` in users document after facility profile creation
- Consistent with professional profile handling

**After:**
```javascript
await updateUserProfile(facilityData);
await updateDoc(doc(db, 'users', currentUser.uid), {
  GLN_certified: true,
  temporaryUploads: deleteField()
});
console.log('[GLNVerification] Set GLN_certified: true in users document');
```

### 2. AccessLevelChoicePopup Component
**File:** `src/dashboard/pages/profile/components/AccessLevelChoicePopup.js`

#### Changes Made:

**1. Removed `onClick` from Container Divs**
- Team Access div: Removed `onClick={handleSelectTeamAccess}`
- Full Access div: Removed `onClick={glnVerified ? handleContinueOnboarding : undefined}`
- Removed `cursor-pointer` class from Full Access div
- **Result:** Only buttons are clickable, not the entire card

**2. Updated Button Event Handlers**
- Team Access button: Changed from `onClick={(e) => { e.stopPropagation(); handleSelectTeamAccess(); }}` to `onClick={handleSelectTeamAccess}`
- Full Access button (not verified): Simplified to `onClick={handleBackToOnboarding}`
- Full Access button (verified): Simplified to `onClick={handleContinueOnboarding}`

**3. Changed Button Text When GLN is Verified**
- **Before:** `{t('accessLevelChoice.continueTutorial', 'Continue Tutorial')}`
- **After:** `{t('accessLevelChoice.continueProfile', 'Continue Profile')}`

**4. Removed Unused State**
- Removed `isFullAccessHovered` state
- Removed `onMouseEnter` and `onMouseLeave` handlers
- Simplified button styling (removed conditional hover state logic)

#### Before vs After:

**Before (Team Access):**
```javascript
<div onClick={handleSelectTeamAccess}>
  {/* ... content ... */}
  <button onClick={(e) => { e.stopPropagation(); handleSelectTeamAccess(); }}>
    Select Team Access
  </button>
</div>
```

**After (Team Access):**
```javascript
<div> {/* No onClick */}
  {/* ... content ... */}
  <button onClick={handleSelectTeamAccess}>
    Select Team Access
  </button>
</div>
```

**Before (Full Access - Not Verified):**
```javascript
<div onClick={glnVerified ? handleContinueOnboarding : undefined}>
  <button onClick={(e) => { e.stopPropagation(); handleBackToOnboarding(); }}>
    Back to Onboarding
  </button>
</div>
```

**After (Full Access - Not Verified):**
```javascript
<div> {/* No onClick */}
  <button onClick={handleBackToOnboarding}>
    Back to Onboarding
  </button>
</div>
```

**Before (Full Access - Verified):**
```javascript
<div onClick={handleContinueOnboarding}>
  <button onClick={(e) => { e.stopPropagation(); handleContinueOnboarding(); }}>
    Continue Tutorial
  </button>
</div>
```

**After (Full Access - Verified):**
```javascript
<div> {/* No onClick */}
  <button onClick={handleContinueOnboarding}>
    Continue Profile
  </button>
</div>
```

## DATABASE STRUCTURE

### users/{userId}
**After GLN Verification Completion:**
```javascript
{
  GLN_certified: true,  // Set to true on completion
  roles: ['professional'],
  onboardingCompleted: true,
  // ... other fields
}
```

### professionalProfiles/{userId}
**After GLN Verification Completion:**
```javascript
{
  GLN_certified: true,  // Always true (not dynamic)
  verificationStatus: 'verified',
  verification: {
    identityStatus: 'verified',
    overallVerificationStatus: 'verified',
    verificationDocuments: [ /* ... */ ]
  },
  // ... other fields
}
```

### facilityProfiles/{facilityId}
**After GLN Verification Completion:**
```javascript
{
  GLN_certified: true,
  verificationStatus: 'verified',
  // ... other fields
}
```

## USER FLOW

### Professional Onboarding
1. User completes onboarding steps
2. User provides GLN and uploads documents
3. GLN verification succeeds
4. **Profile created with `GLN_certified: true`**
5. **Users document updated with `GLN_certified: true`**
6. User proceeds to tutorial

### Profile Access Level Choice
1. User reaches profile section
2. AccessLevelChoicePopup appears
3. **GLN_certified check determines button text:**
   - If `GLN_certified === false`: Shows "Back to Onboarding" button
   - If `GLN_certified === true`: Shows "Continue Profile" button
4. **Only buttons are clickable** (not the entire card)
5. User selects access level via button click

## VALIDATION LOGIC

### GLN_certified Checks

**Location:** Multiple files check `GLN_certified`

**sessionAuth.js:**
```javascript
const hasProfessionalAccess = (userData) => {
  // ... other checks
  if (userData.GLN_certified === true) return true;
  // ... bypass check
};
```

**TutorialContext.js:**
```javascript
const isVerifiedProfile = !!userData.GLN_certified || !!userData.isVerified || bypassedGLN;
```

**AccessLevelChoicePopup.js:**
```javascript
glnVerified ? 'Continue Profile' : 'Back to Onboarding'
```

## UI/UX IMPROVEMENTS

### Before:
- ❌ Entire card divs were clickable (confusing)
- ❌ Button had `e.stopPropagation()` to prevent parent click
- ❌ Hover states on parent divs competed with button hover
- ❌ Button text said "Continue Tutorial" (confusing in profile context)

### After:
- ✅ Only buttons are clickable (clear intent)
- ✅ No need for `stopPropagation()`
- ✅ Cleaner, simpler code
- ✅ Button text says "Continue Profile" (contextually accurate)
- ✅ Better accessibility (clear click targets)

## TESTING CHECKLIST

- [x] GLN verification sets `GLN_certified: true` in users document
- [x] GLN verification sets `GLN_certified: true` in professionalProfiles document
- [x] Facility verification sets `GLN_certified: true` in users document
- [x] AccessLevelChoicePopup divs are not clickable
- [x] Only buttons in AccessLevelChoicePopup are clickable
- [x] Button text changes to "Continue Profile" when GLN verified
- [x] Button text shows "Back to Onboarding" when GLN not verified
- [x] No linter errors in modified files

## FILES MODIFIED

1. `src/dashboard/onboarding/services/profileSavingService.js`
   - Updated `saveWorkerProfile()` function
   - Updated `saveFacilityProfile()` function

2. `src/dashboard/pages/profile/components/AccessLevelChoicePopup.js`
   - Removed div `onClick` handlers
   - Simplified button event handlers
   - Changed button text for verified users
   - Removed unused hover state

---

**Implementation Date:** January 2026
**Version:** 1.1

