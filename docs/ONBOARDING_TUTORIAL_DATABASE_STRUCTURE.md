# Onboarding & Tutorial Database Structure and Validation

## Overview

The system tracks onboarding progress and tutorial completion separately for **users** and **facilities** using a nested structure in the `users` collection. Both onboarding types can be completed independently, allowing users to have both professional and facility profiles.

## Database Structure

### Users Collection (`users/{userId}`)

The onboarding and tutorial data is stored in the following structure:

```javascript
{
  // ONBOARDING PROGRESS (Nested by type)
  onboardingProgress: {
    professional: {
      step: 4,                    // Current step (1-5)
      role: 'worker',              // 'worker', 'chain', 'company'
      isEmployed: true,            // Whether user is employed
      accessTeam: true,            // Whether user wants team access
      selectedCompany: {           // Company selected if accessTeam is true
        id: 1,
        name: "Acme Healthcare"
      },
      hasGLN: true,               // Whether user has GLN number
      legalConsiderationsConfirmed: true,
      generalWorkingLawsConfirmed: true,
      phonePrefix: '+41',
      phoneNumber: '123456789',
      phoneVerified: true,
      chainPhonePrefix: '+41',     // For chain role
      chainPhoneNumber: '987654321',
      completed: false,            // Whether onboarding is completed
      completedAt: Timestamp,      // When completed
      updatedAt: Timestamp
    },
    facility: {
      step: 3,
      role: 'company',
      completed: false,
      completedAt: Timestamp,
      updatedAt: Timestamp
    }
  },
  
  // LEGACY FIELDS (for backward compatibility)
  onboardingCompleted: true,      // Legacy: professional onboarding completed
  GLN_certified: true,            // Whether GLN verification is complete
  
  // TUTORIAL PROGRESS
  tutorialProgress: {
    activeTutorial: 'dashboard',   // Currently active tutorial (null if none)
    currentStep: 2                 // Current step in active tutorial
  },
  
  // TUTORIAL COMPLETION STATUS
  completedTutorials: {
    dashboard: true,               // Dashboard tutorial completed
    profileTabs: true,             // Profile tabs tutorial completed
    messages: false,               // Messages tutorial not completed
    calendar: false                // Calendar tutorial not completed
  },
  
  // GLOBAL TUTORIAL STATUS
  tutorialPassed: true,            // Whether main tutorial is passed
  isProfessionalProfileComplete: true,  // Whether professional profile is complete
  
  // OTHER FIELDS
  roles: ['professional', 'facility'],  // User roles array
  role: 'professional',                // Primary role (legacy)
  updatedAt: Timestamp
}
```

## Onboarding Flow

### Professional Onboarding

**Location**: `frontend/src/dashboard/onboarding/components/FirstTimeModal.js`

**Steps**:
1. **Step 1**: GLN Verification (mandatory)
2. **Step 2**: Role Selection (worker, chain, company)
3. **Step 3**: Employment Status
4. **Step 4**: Team Access (if employed)
5. **Step 5**: Legal Confirmations

**Completion Criteria**:
- `onboardingProgress.professional.completed === true`
- OR legacy: `onboardingCompleted === true`
- OR `GLN_certified === true` (verification status)

**Storage**:
```javascript
// Saved incrementally at each step
await updateDoc(userDocRef, {
  [`onboardingProgress.professional`]: {
    step: currentStep,
    role: selectedRole,
    isEmployed: isEmployed,
    accessTeam: accessTeam,
    selectedCompany: selectedCompany,
    hasGLN: hasGLN,
    // ... other fields
    updatedAt: new Date()
  },
  updatedAt: new Date()
});

// Marked as completed when finished
await updateDoc(userDocRef, {
  [`onboardingProgress.professional`]: {
    completed: true,
    completedAt: new Date(),
    // ... all previous fields
  },
  onboardingCompleted: true,  // Legacy field
  updatedAt: new Date()
});
```

### Facility Onboarding

**Steps**:
1. **Step 1**: GLN Verification (mandatory)
2. **Step 2**: Role Selection
3. **Step 3**: Legal Confirmations

**Completion Criteria**:
- `onboardingProgress.facility.completed === true`

**Storage**:
```javascript
// Similar structure to professional
await updateDoc(userDocRef, {
  [`onboardingProgress.facility`]: {
    step: currentStep,
    role: 'company',
    completed: true,
    completedAt: new Date(),
    updatedAt: new Date()
  },
  updatedAt: new Date()
});
```

## Tutorial System

### Tutorial Progress Tracking

**Location**: `frontend/src/dashboard/contexts/TutorialContext.js`

**Active Tutorial State**:
```javascript
tutorialProgress: {
  activeTutorial: 'dashboard',  // Current tutorial name
  currentStep: 2                // Current step (0-indexed)
}
```

**Saved on Step Change**:
```javascript
await updateDoc(userDocRef, {
  'tutorialProgress.activeTutorial': activeTutorial,
  'tutorialProgress.currentStep': currentStep,
  updatedAt: serverTimestamp()
});
```

**Cleared on Completion**:
```javascript
await updateDoc(userDocRef, {
  [`completedTutorials.${tutorialName}`]: true,
  'tutorialProgress.activeTutorial': null,  // Clear active tutorial
  updatedAt: serverTimestamp()
});
```

### Tutorial Completion Status

**Individual Tutorials**:
- Stored in `completedTutorials.{tutorialName}` as boolean
- Examples: `dashboard`, `profileTabs`, `messages`, `calendar`

**Global Tutorial Status**:
- `tutorialPassed`: Boolean indicating if main tutorial flow is complete
- Set to `true` when all required tutorials are completed

**Storage**:
```javascript
// Mark tutorial as completed
await updateDoc(userDocRef, {
  [`completedTutorials.${tutorialName}`]: true,
  'tutorialProgress.activeTutorial': null,
  tutorialPassed: true,  // Set when all required tutorials done
  updatedAt: serverTimestamp()
});
```

## Validation Logic

### Onboarding Validation

**Location**: `frontend/src/utils/sessionAuth.js`

**Professional Access Check**:
```javascript
const hasProfessionalAccess = (userData) => {
  const onboardingProgress = userData.onboardingProgress || {};
  const professionalProgress = onboardingProgress.professional || {};
  
  // Check if professional onboarding is completed
  const professionalCompleted = professionalProgress.completed === true;
  
  // Legacy check
  const legacyCompleted = userData.onboardingCompleted || 
                          onboardingProgress.completed === true;
  
  // GLN verification check
  const isVerified = !!userData.GLN_certified;
  
  return professionalCompleted || legacyCompleted || isVerified;
};
```

**Facility Access Check**:
```javascript
const hasTeamAccess = (userData, facilityId) => {
  // Check facility onboarding
  const onboardingProgress = userData.onboardingProgress || {};
  const facilityProgress = onboardingProgress.facility || {};
  const facilityCompleted = facilityProgress.completed === true;
  
  // Check facility membership
  const memberships = userData.facilityMemberships || [];
  const hasMembership = memberships.some(m => 
    m.facilityProfileId === facilityId
  );
  
  return facilityCompleted && hasMembership;
};
```

**Workspace Session Validation**:
```javascript
// During onboarding, allow access even if not fully completed
const isInOnboarding = userData.onboardingProgress &&
  (!userData.onboardingProgress.professional?.completed && 
   !userData.onboardingProgress.facility?.completed);

if (!hasProfessionalAccess(userData) && !isInOnboarding) {
  return null;  // Deny access
}
```

### Tutorial Validation

**Location**: `frontend/src/dashboard/contexts/TutorialContext.js`

**Tutorial Status Check**:
```javascript
// Load user data
const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
const userData = userDoc.data();

// Check completed tutorials
if (userData.completedTutorials) {
  setCompletedTutorials(userData.completedTutorials);
}

// Check onboarding completion
const onboardingProgress = userData.onboardingProgress || {};
const professionalProgress = onboardingProgress.professional || {};
const professionalCompleted = professionalProgress.completed === true;

// Check if tutorial should be shown
if (!professionalCompleted && !userData.GLN_certified) {
  // Force onboarding modal
  setShowFirstTimeModal(true);
  return;
}

// Check for in-progress tutorial
if (userData.tutorialProgress?.activeTutorial) {
  const savedTutorial = userData.tutorialProgress.activeTutorial;
  const savedStep = userData.tutorialProgress.currentStep || 0;
  
  // Restore tutorial state
  setActiveTutorial(savedTutorial);
  setCurrentStep(savedStep);
  setIsTutorialActive(true);
}
```

**Tutorial Completion Check**:
```javascript
// Check if tutorial is already completed
if (completedTutorials[tutorialName] === true) {
  // Skip tutorial
  return;
}

// Check if tutorial is in progress
if (tutorialProgress.activeTutorial === tutorialName) {
  // Resume tutorial
  return;
}
```

## Key Validation Points

### 1. Onboarding Completion

**For Professional**:
- ✅ `onboardingProgress.professional.completed === true`
- ✅ OR `onboardingCompleted === true` (legacy)
- ✅ OR `GLN_certified === true` (verification status)

**For Facility**:
- ✅ `onboardingProgress.facility.completed === true`

### 2. Tutorial Completion

**Individual Tutorial**:
- ✅ `completedTutorials.{tutorialName} === true`

**Global Tutorial**:
- ✅ `tutorialPassed === true`

### 3. Profile Completion

**Professional Profile**:
- ✅ `isProfessionalProfileComplete === true`
- ✅ OR calculated from required fields in profile

**Facility Profile**:
- ✅ Checked via `facilityProfiles` collection completeness

## Data Flow

### Onboarding Flow

1. **User starts onboarding** → `FirstTimeModal` opens
2. **Progress saved incrementally** → `onboardingProgress.{type}.step` updated
3. **GLN verification** → `GLN_certified` set to `true`
4. **Onboarding completed** → `onboardingProgress.{type}.completed = true`
5. **Tutorial starts** → `tutorialProgress.activeTutorial` set

### Tutorial Flow

1. **Tutorial starts** → `tutorialProgress.activeTutorial` set
2. **Step changes** → `tutorialProgress.currentStep` updated
3. **Tutorial completed** → `completedTutorials.{name} = true`
4. **Active tutorial cleared** → `tutorialProgress.activeTutorial = null`
5. **All tutorials done** → `tutorialPassed = true`

## Important Notes

1. **Dual Onboarding Support**: Users can complete both professional and facility onboarding independently
2. **Legacy Compatibility**: System checks both new nested structure and legacy flat fields
3. **GLN Verification**: Mandatory step that must be completed before proceeding
4. **Tutorial Restoration**: In-progress tutorials are restored on page reload
5. **Cookie Caching**: Tutorial/onboarding status is cached in cookies for faster access
6. **Workspace Context**: Onboarding validation considers workspace type (personal vs team)

## Related Files

- `frontend/src/dashboard/onboarding/components/FirstTimeModal.js` - Onboarding UI
- `frontend/src/dashboard/contexts/TutorialContext.js` - Tutorial management
- `frontend/src/utils/sessionAuth.js` - Access validation
- `frontend/src/dashboard/contexts/DashboardContext.js` - Status tracking
- `frontend/src/contexts/AuthContext.js` - Initial status check







