# Central Tutorial Management System

## Overview

This folder contains the **centralized tutorial management system** - a single source of truth for all tutorial-related configuration, rules, and logic in the MediShift dashboard.

## Files

| File | Purpose |
|------|---------|
| `tutorialConfig.js` | Core tutorial definitions, step configurations, constants |
| `tutorialSequences.js` | Tutorial ordering, chaining rules, progression logic |
| `tutorialAccessRules.js` | Feature gating, sidebar access, tab accessibility |
| `tutorialRoutes.js` | Path generation, route mapping, selectors |
| `tutorialSystem.js` | Central export + translation helpers |

## Translations

All tutorial text is stored in:
```
src/locales/en/config/tutorial.json
```

## Usage

### Import the central system

```javascript
import {
    // Constants
    TUTORIAL_IDS,
    ACCESS_MODES,
    ONBOARDING_TYPES,
    
    // Sequences
    getNextTutorial,
    getMandatoryTutorials,
    
    // Access Rules
    evaluateFeatureAccess,
    isSidebarItemAccessible,
    
    // Routes
    buildDashboardPath,
    buildProfileTabPath
} from '../../config/tutorialSystem';
```

### Check feature access

```javascript
const canAccessMessages = evaluateFeatureAccess('messages', {
    tutorialPassed: false,
    isTutorialActive: true,
    activeTutorial: 'profileTabs',
    accessMode: 'full',
    workspaceType: 'personal'
});
```

### Get next tutorial in sequence

```javascript
const nextTutorial = getNextTutorial(
    'dashboard',           // current tutorial
    'professional',        // onboarding type
    { dashboard: true }    // completed tutorials
);
// Returns: 'profileTabs'
```

### Get translated step content

```javascript
import { getTutorialStepsWithTranslations } from '../../config/tutorialSystem';

const steps = getTutorialStepsWithTranslations('dashboard', t);
```

## Architecture

```
tutorialSystem.js (Central Export)
    │
    ├── tutorialConfig.js
    │   ├── TUTORIAL_IDS
    │   ├── TUTORIAL_STEP_DEFINITIONS
    │   └── Step utilities
    │
    ├── tutorialSequences.js
    │   ├── TUTORIAL_SEQUENCES
    │   ├── getNextTutorial()
    │   └── Progression utilities
    │
    ├── tutorialAccessRules.js
    │   ├── FEATURE_ACCESS_RULES
    │   ├── evaluateFeatureAccess()
    │   └── Access utilities
    │
    └── tutorialRoutes.js
        ├── DASHBOARD_PATHS
        ├── PROFILE_TAB_PATHS
        └── Path utilities
```

## Migration Guide

### Before (Scattered)

```javascript
// OLD: Hardcoded in useTutorialActions.js
const mandatoryTutorials = ['dashboard', 'profileTabs', ...];

// OLD: Hardcoded in useTutorialRules.js
if (itemName === 'profile') {
    return activeTutorial === 'profileTabs' || ...;
}

// OLD: Hardcoded paths in tutorialSteps.js
navigationPath: '/dashboard/profile/personalDetails'
```

### After (Centralized)

```javascript
// NEW: From central config
import { getMandatoryTutorials } from '../../config/tutorialSystem';
const mandatoryTutorials = getMandatoryTutorials('professional');

// NEW: Central access evaluation
import { evaluateFeatureAccess } from '../../config/tutorialSystem';
const canAccess = evaluateFeatureAccess('profile', context);

// NEW: Central path generation
import { buildProfileTabPath } from '../../config/tutorialSystem';
const path = buildProfileTabPath('personalDetails');
```

## Constants Reference

### TUTORIAL_IDS
```javascript
DASHBOARD: 'dashboard'
PROFILE_TABS: 'profileTabs'
FACILITY_PROFILE_TABS: 'facilityProfileTabs'
MESSAGES: 'messages'
CONTRACTS: 'contracts'
CALENDAR: 'calendar'
MARKETPLACE: 'marketplace'
PAYROLL: 'payroll'
ORGANIZATION: 'organization'
SETTINGS: 'settings'
PROFILE: 'profile'
```

### ACCESS_MODES
```javascript
FULL: 'full'
TEAM: 'team'
LOADING: 'loading'
```

### ONBOARDING_TYPES
```javascript
PROFESSIONAL: 'professional'
FACILITY: 'facility'
```

### PROFILE_TAB_IDS
```javascript
PERSONAL_DETAILS: 'personalDetails'
PROFESSIONAL_BACKGROUND: 'professionalBackground'
BILLING_INFORMATION: 'billingInformation'
DOCUMENT_UPLOADS: 'documentUploads'
SETTINGS: 'settings'
FACILITY_CORE_DETAILS: 'facilityCoreDetails'
FACILITY_LEGAL_BILLING: 'facilityLegalBilling'
ACCOUNT: 'account'
DELETE_ACCOUNT: 'deleteAccount'
```

## Key Functions

### Sequences

| Function | Description |
|----------|-------------|
| `getMandatoryTutorials(type)` | Get array of mandatory tutorial IDs |
| `getNextTutorial(current, type, completed)` | Get next tutorial in sequence |
| `getFirstIncompleteTutorial(type, completed)` | Get first incomplete tutorial |
| `areAllMandatoryComplete(type, completed)` | Check if all mandatory done |
| `getCompletionPercentage(type, completed)` | Get % complete |

### Access Rules

| Function | Description |
|----------|-------------|
| `evaluateFeatureAccess(feature, context)` | Check if feature is accessible |
| `isSidebarItemAccessible(path, context)` | Check sidebar item access |
| `isProfileTabAccessible(tabId, context)` | Check profile tab access |
| `canNavigateDuringTutorial(path, context)` | Check navigation permission |

### Routes

| Function | Description |
|----------|-------------|
| `buildDashboardPath(feature)` | Build `/dashboard/{feature}` path |
| `buildProfileTabPath(tabId)` | Build profile tab path |
| `buildSidebarSelector(feature)` | Build sidebar item selector |
| `isOnCorrectPage(current, required)` | Check page alignment |

## Benefits

1. **Single Source of Truth** - All rules in one location
2. **Configuration-Driven** - Easy to modify without code changes
3. **Type-Safe** - Constants prevent typos
4. **Testable** - Rules can be unit tested
5. **Documented** - Self-documenting structure
6. **Maintainable** - One place to update

