# Bypass Tutorial Chaining Fix

## OVERVIEW

Fixes issues with tutorial chaining and feature access when users bypass GLN verification. Ensures that:
1. The `tutorialAccessMode` is properly set in the profile
2. Access mode loads at the right time (not just during profileTabs)
3. Tutorial completion is properly tracked
4. Marketplace tutorial is skipped for team access users
5. Messages and other features remain accessible during tutorials

## ISSUES IDENTIFIED

### 1. Missing tutorialAccessMode in Bypass Profile
**Problem:** When users bypass GLN, the profile was created without `tutorialAccessMode: 'team'`, causing:
- Feature access checks to fail
- Tutorial navigation issues
- Messages redirecting to dashboard

### 2. AccessMode Loading Too Restrictive
**Problem:** `accessMode` only loaded when `activeTutorial === 'profileTabs'`, but:
- After profile tutorial completes, active tutorial changes to 'messages'
- AccessMode was never loaded for subsequent tutorials
- Feature access checks failed

### 3. Tutorial Chaining Not Respecting Access Mode
**Problem:** After profile tutorial completion:
- System tried to chain to marketplace tutorial even for team access users
- Marketplace is locked for team access users
- No logic to skip inaccessible tutorials

## CHANGES IMPLEMENTED

### 1. ProfessionalGLNVerification Component
**File:** `src/dashboard/onboarding/components/ProfessionalGLNVerification.js`

#### Added tutorialAccessMode to Bypass Profile
**Before:**
```javascript
const profileData = {
  // ... other fields
  GLN_certified: false,
  verificationStatus: 'not_verified',
  bypassedGLN: true
};
```

**After:**
```javascript
const profileData = {
  // ... other fields
  GLN_certified: false,
  verificationStatus: 'not_verified',
  bypassedGLN: true,
  tutorialAccessMode: 'team'  // ✅ Added
};
```

### 2. TutorialContext - AccessMode Loading
**File:** `src/dashboard/contexts/TutorialContext.js`

#### Removed Restrictive Condition
**Before:**
```javascript
const loadAccessMode = async () => {
  if (!currentUser || !isTutorialActive || activeTutorial !== 'profileTabs') {
    return;  // ❌ Only loads during profileTabs
  }
  // ...
};
```

**After:**
```javascript
const loadAccessMode = async () => {
  if (!currentUser) {
    return;  // ✅ Loads anytime user is logged in
  }
  // ...
};
```

**Result:** AccessMode now loads:
- When component mounts
- When user changes
- When onboarding type changes
- Throughout ALL tutorials (not just profileTabs)

### 3. TutorialContext - Smart Tutorial Chaining
**File:** `src/dashboard/contexts/TutorialContext.js`

#### Added Access Mode Aware Chaining
**Before:**
```javascript
if (currentIndex !== -1 && currentIndex < mandatoryOnboardingTutorials.length - 1) {
  const nextFeature = mandatoryOnboardingTutorials[currentIndex + 1];
  console.log(`[TutorialContext] Chaining next tutorial: ${nextFeature}`);
  setTimeout(() => {
    startTutorialRef.current(nextFeature);
  }, 500);
}
```

**After:**
```javascript
if (currentIndex !== -1 && currentIndex < mandatoryOnboardingTutorials.length - 1) {
  let nextFeature = mandatoryOnboardingTutorials[currentIndex + 1];
  
  // Skip marketplace if user has team access (not full access)
  if (accessMode === 'team' && nextFeature === 'marketplace') {
    console.log(`[TutorialContext] Skipping marketplace tutorial (team access mode)`);
    const nextIndex = mandatoryOnboardingTutorials.indexOf('marketplace') + 1;
    if (nextIndex < mandatoryOnboardingTutorials.length) {
      nextFeature = mandatoryOnboardingTutorials[nextIndex];
    } else {
      nextFeature = null;
    }
  }
  
  if (nextFeature) {
    console.log(`[TutorialContext] Chaining next tutorial: ${nextFeature}`);
    setTimeout(() => {
      startTutorialRef.current(nextFeature);
    }, 500);
  }
}
```

**Added accessMode to dependency array:**
```javascript
}, [activeTutorial, isBusy, safelyUpdateTutorialState, currentUser, 
    onboardingType, setTutorialComplete, accessMode]);  // ✅ Added accessMode
```

## COMPLETE USER FLOW

### Bypass Flow with Tutorial Chaining:

1. **User Bypasses GLN**
   - Profile created with `tutorialAccessMode: 'team'`
   - `bypassedGLN: true`, `GLN_certified: false`

2. **Dashboard Tutorial Starts**
   - AccessMode loads: `'team'`
   - Tutorial progresses normally

3. **Dashboard Tutorial Completes**
   - Marked as complete in Firestore
   - Chains to `profileTabs` tutorial

4. **ProfileTabs Tutorial Starts**
   - User has team access
   - Can skip most profile tabs
   - AccessMode remains: `'team'`

5. **ProfileTabs Tutorial Completes**
   - Marked as complete in Firestore
   - `tutorialPassed: true` set
   - **Chains to `messages` tutorial** (not marketplace)

6. **Messages Tutorial Starts**
   - AccessMode still loaded: `'team'`
   - Messages accessible (team access allows it)
   - Tutorial displays properly

7. **Messages Tutorial Completes**
   - Marked as complete
   - Chains to `contracts`

8. **Contract Tutorial** → **Calendar Tutorial**
   - Continue normally

9. **When Marketplace Would Be Next**
   - System checks: `accessMode === 'team'`
   - **Skips marketplace tutorial**
   - Chains to `settings` instead

10. **Settings Tutorial Completes**
    - All tutorials done
    - Tutorial flow complete

## DATABASE STATE

### professionalProfiles/{userId}
**After Bypass:**
```javascript
{
  bypassedGLN: true,
  GLN_certified: false,
  tutorialAccessMode: 'team',  // ✅ Set during bypass
  professionalDetails: {
    profession: 'Selected Profession'
  },
  tutorialProgress: {
    professional: {
      activeTutorial: null,
      tutorials: {
        dashboard: { completed: true },
        profileTabs: { completed: true },
        messages: { completed: true },
        contracts: { completed: true },
        calendar: { completed: true },
        // marketplace: skipped (team access)
        settings: { completed: true }
      }
    }
  }
}
```

## ACCESS CONTROL MATRIX

### Team Access (Bypass) - Feature Availability:

| Feature      | During Tutorial | After Tutorial | Notes                           |
|--------------|----------------|----------------|---------------------------------|
| Dashboard    | ✅ Accessible   | ✅ Accessible  | Always accessible              |
| Profile      | ✅ Accessible   | ✅ Accessible  | Always accessible              |
| Messages     | ✅ Accessible   | ✅ Accessible  | Team access allows             |
| Contracts    | ✅ Accessible   | ✅ Accessible  | Team access allows             |
| Calendar     | ✅ Accessible   | ✅ Accessible  | Team access allows             |
| Settings     | ✅ Accessible   | ✅ Accessible  | Team access allows             |
| Marketplace  | ❌ Locked       | ❌ Locked      | Requires full access (GLN)     |

### Full Access (GLN Verified) - Feature Availability:

| Feature      | During Tutorial | After Tutorial | Notes                           |
|--------------|----------------|----------------|---------------------------------|
| Dashboard    | ✅ Accessible   | ✅ Accessible  | Always accessible              |
| Profile      | ✅ Accessible   | ✅ Accessible  | Always accessible              |
| Messages     | ✅ Accessible   | ✅ Accessible  | Full access                    |
| Contracts    | ✅ Accessible   | ✅ Accessible  | Full access                    |
| Calendar     | ✅ Accessible   | ✅ Accessible  | Full access                    |
| Settings     | ✅ Accessible   | ✅ Accessible  | Full access                    |
| Marketplace  | ✅ Accessible   | ✅ Accessible  | Full access includes all       |

## TUTORIAL COMPLETION TRACKING

### Profile Document Structure:
```javascript
tutorialProgress: {
  professional: {
    activeTutorial: 'messages',  // Current tutorial
    currentStep: 3,              // Current step
    tutorials: {
      dashboard: { 
        completed: true,
        completedAt: Timestamp
      },
      profileTabs: {
        completed: true,
        completedAt: Timestamp
      },
      messages: {
        completed: false,          // In progress
        currentStep: 3
      }
    },
    completed: false  // All tutorials not done yet
  }
}
```

### Completion Checks:
1. **Individual Tutorial:** `tutorials.{tutorialName}.completed === true`
2. **All Tutorials:** `tutorialProgress.professional.completed === true`
3. **Profile Passed:** `tutorialPassed === true` (set after profileTabs)

## LOGGING OUTPUT

**When profile tutorial completes and chains to messages:**
```
[TutorialContext] Profile tutorial finished, marking as tutorialPassed in DashboardContext
[TutorialContext] Chaining next tutorial: messages
[TutorialContext] Loaded accessMode from profile: team
[TutorialContext] Starting tutorial: messages
[TutorialContext] Tutorial active: messages, Step: 0
```

**When attempting to chain to marketplace (team access):**
```
[TutorialContext] Completing tutorial: calendar
[TutorialContext] Skipping marketplace tutorial (team access mode)
[TutorialContext] Chaining next tutorial: settings
[TutorialContext] Starting tutorial: settings
```

## VALIDATION CHECKS

### AccessMode Validation:
```javascript
// useTutorialRules.js
const platformFeatures = ['messages', 'contracts', 'calendar', 'marketplace', 'organization', 'settings', 'payroll'];

if (platformFeatures.includes(itemName)) {
  if (access === 'full') return true;  // Full access: everything
  
  if (access === 'team') {
    if (isFacilityWorkspace) return true;  // Facility: everything
    if (itemName === 'marketplace') return false;  // Professional + team: no marketplace
    return true;  // Professional + team: other features OK
  }
  
  return false;  // No access set: locked
}
```

## TESTING CHECKLIST

- [x] tutorialAccessMode set to 'team' during bypass
- [x] AccessMode loads throughout all tutorials (not just profileTabs)
- [x] Profile tutorial completes and marks tutorialPassed
- [x] Profile tutorial chains to messages tutorial
- [x] Messages tutorial starts properly with show me tooltip
- [x] Messages tab accessible (doesn't redirect to dashboard)
- [x] Tutorial completion tracked in Firestore
- [x] Marketplace tutorial skipped for team access users
- [x] Tutorial chain continues to settings after skipping marketplace
- [x] All tutorials marked as complete in profile document
- [x] No linter errors

## EXPECTED BEHAVIOR

### After Implementing Fixes:
1. ✅ Bypass creates profile with `tutorialAccessMode: 'team'`
2. ✅ AccessMode loads and persists throughout all tutorials
3. ✅ Profile tutorial completes normally
4. ✅ Messages tutorial starts automatically
5. ✅ "Show me" tooltip appears in messages tutorial
6. ✅ Messages tab remains accessible (no redirect)
7. ✅ Tutorial progression works correctly
8. ✅ Marketplace tutorial automatically skipped
9. ✅ Tutorial completion properly tracked
10. ✅ User can complete all accessible tutorials

---

**Implementation Date:** January 2026
**Version:** 1.2

