# Dashboard Tutorial System Review

## Current State Analysis

### Pages Using Tutorial System

| Page | File | Imports | Usage |
|------|------|---------|-------|
| **Profile** | `pages/profile/Profile.js` | `useProfileTutorial` hook | `isTutorialActive`, `activeTutorial`, `stepData`, `onTabCompleted`, `maxAccessedProfileTab` |
| **Messages** | `pages/messages/Messages.js` | `useTutorial` from TutorialContext | `isTutorialActive`, `activeTutorial` + mock data |
| **Contracts** | `pages/contracts/Contracts.js` | `useTutorial` from TutorialContext | `isTutorialActive`, `activeTutorial` + mock data |
| **Calendar** | `pages/calendar/Calendar.js` | `useTutorial` from TutorialContext | `isTutorialActive`, `activeTutorial` |
| **Marketplace** | `pages/marketplace/Marketplace.js` | `useTutorial` from TutorialContext | `isTutorialActive`, `activeTutorial` |

### Components Using Tutorial System

| Component | File | Usage |
|-----------|------|-------|
| **Header** | `components/Header/Header.js` | Tutorial restarts, access mode, selection modal |
| **Sidebar** | `components/Sidebar/Sidebar.js` | Item accessibility, tutorial highlighting |
| **ProfileHeader** | `pages/profile/components/ProfileHeader.js` | Tab highlighting, access level popups |
| **AccessLevelChoicePopup** | `pages/profile/components/AccessLevelChoicePopup.js` | Access mode selection |

---

## Hardcoded References Found

### 1. Tutorial ID Strings (71 occurrences)

```
'profileTabs' - 35 occurrences
'facilityProfileTabs' - 27 occurrences  
'dashboard' - 9 occurrences
```

**Locations:**
- `TutorialContext.js` - 25+ references
- `Header.js` - 5 references
- `Sidebar.js` - 4 references
- `useTutorialRules.js` - 4 references (x2 files)
- `useProfileFormHandlers.js` - 2 references

### 2. Hardcoded Tutorial Sequences

**Location: `TutorialContext.js:1073-1081`**
```javascript
const mandatoryOnboardingTutorials = ['dashboard', 'profileTabs', 'facilityProfileTabs', 
  'messages', 'contracts', 'calendar', 'marketplace', 'settings']
  .filter(tutorial => {
    if (onboardingType === 'professional' && tutorial === 'facilityProfileTabs') return false;
    if (onboardingType === 'facility' && tutorial === 'profileTabs') return false;
    return true;
  });
```

### 3. Hardcoded Path References

**Location: Multiple files**
```javascript
// tutorialSteps.js - 100+ hardcoded paths
navigationPath: '/dashboard/profile/personalDetails'
targetSelector: 'a[href="/dashboard/profile"]'
requiredPage: '/dashboard/contracts'
```

---

## New Central System Created

### Files in `src/config/`

| File | Purpose | Status |
|------|---------|--------|
| `tutorialConfig.js` | Tutorial IDs, step definitions, constants | ✅ Created |
| `tutorialSequences.js` | Tutorial ordering, chaining logic | ✅ Created |
| `tutorialAccessRules.js` | Feature access, sidebar rules | ✅ Created |
| `tutorialRoutes.js` | Path builders, route mapping | ✅ Created |
| `tutorialSystem.js` | Central export | ✅ Created |

### Translations

| File | Location | Status |
|------|----------|--------|
| `tutorial.json` | `public/locales/en/config/` | ✅ Created |
| i18n namespace | `src/i18n.js` | ✅ Registered |

---

## Integration Status

### ❌ NOT YET INTEGRATED

The new central system is **created but not connected** to the existing dashboard code.

**Current flow:**
```
Dashboard Pages → TutorialContext.js → tutorialSteps.js (old)
                       ↓
              useTutorialRules.js (duplicated)
```

**Target flow:**
```
Dashboard Pages → TutorialContext.js → tutorialSystem.js (new central)
                                            ↓
                               tutorialConfig.js
                               tutorialSequences.js
                               tutorialAccessRules.js
                               tutorialRoutes.js
```

---

## Migration Required

### Phase 1: Update TutorialContext.js

Replace hardcoded references with central imports:

```javascript
// OLD
import { tutorialSteps } from '../tutorial/tutorialSteps';
const mandatoryOnboardingTutorials = ['dashboard', 'profileTabs', ...];

// NEW  
import { 
  TUTORIAL_IDS,
  getMandatoryTutorials,
  getNextTutorial,
  getTutorialSteps
} from '../../config/tutorialSystem';
```

### Phase 2: Update Access Control

Replace duplicated `useTutorialRules.js` files with central rules:

```javascript
// OLD (in useTutorialRules.js)
if (itemName === 'profile') {
  return activeTutorial === 'profileTabs' || ...
}

// NEW
import { evaluateFeatureAccess, isSidebarItemAccessible } from '../../config/tutorialSystem';
const canAccess = evaluateFeatureAccess('profile', context);
```

### Phase 3: Update Components

Replace hardcoded checks in Header, Sidebar, ProfileHeader:

```javascript
// OLD
if (activeTutorial === 'profileTabs' || activeTutorial === 'facilityProfileTabs')

// NEW
import { isProfileTutorial } from '../../config/tutorialSystem';
if (isProfileTutorial(activeTutorial))
```

### Phase 4: Remove Duplicates

Delete redundant files:
- `dashboard/tutorial/tutorialSteps.js`
- `dashboard/contexts/TutorialContext/config/tutorialSteps.js`
- `dashboard/contexts/tutorial/useTutorialRules.js`

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Breaking tutorial flow | HIGH | Test all tutorial sequences before/after |
| Access control regression | HIGH | Verify sidebar locking behavior |
| Translation missing | MEDIUM | Fallback to step.title/content |
| State sync issues | MEDIUM | Keep TutorialContext state management intact |

---

## Recommended Next Steps

1. **Keep existing TutorialContext.js** as the state manager
2. **Replace imports** in TutorialContext.js to use central config
3. **Update one page at a time** starting with Messages (simplest)
4. **Test thoroughly** after each change
5. **Remove duplicates** only after full migration verified

---

## Quick Reference: What to Import Where

### In TutorialContext.js
```javascript
import {
  TUTORIAL_IDS,
  getTutorialSteps,
  getMandatoryTutorials,
  getNextTutorial,
  getProfileTutorialForType,
  isProfileTutorial
} from '../../config/tutorialSystem';
```

### In Sidebar/Header Components
```javascript
import {
  evaluateFeatureAccess,
  isSidebarItemAccessible,
  isProfileTutorial
} from '../../config/tutorialSystem';
```

### In Page Components
```javascript
import {
  TUTORIAL_IDS,
  isProfileTutorial
} from '../../config/tutorialSystem';
```

