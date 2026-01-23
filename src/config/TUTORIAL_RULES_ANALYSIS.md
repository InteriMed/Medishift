# TUTORIAL RULES CENTRALIZATION ANALYSIS

## EXECUTIVE SUMMARY
The dashboard currently implements tutorial rules across **47+ files** with scattered logic for:
- Tutorial visibility rules
- Navigation access control
- Feature gating based on tutorial progress
- Tab completion validation
- Tutorial sequencing and chaining
- Access mode determination (full vs team)

**RECOMMENDATION**: Consolidate all tutorial business rules into a **Central Tutorial Management System**.

---

## IDENTIFIED SCATTERED RULES

### 1. TUTORIAL SEQUENCING & CHAINING RULES

#### Location: `contexts/TutorialContext/hooks/useTutorialActions.js` (Lines 172-202)
```javascript
const mandatoryTutorials = ['dashboard', 'profileTabs', 'facilityProfileTabs', 'messages', 'contracts', 'calendar', 'marketplace', 'settings'];
const currentIndex = mandatoryTutorials.indexOf(previousTutorial);

if (currentIndex !== -1 && currentIndex < mandatoryTutorials.length - 1) {
    const nextTutorial = mandatoryTutorials[currentIndex + 1];
    if (!completedTutorials[nextTutorial]) {
        setTimeout(() => startTutorial(nextTutorial), 300);
        return;
    }
}
```
**ISSUE**: Hardcoded tutorial sequence logic embedded in action handler. Should be configuration-driven.

#### Location: `contexts/TutorialContext.js` (Lines 550-571)
```javascript
if (!completedInType.dashboard?.completed) {
    startTutorial('dashboard');
} else if (!completedInType.profileTabs?.completed && !completedInType.facilityProfileTabs?.completed) {
    const userRole = user?.role;
    const tutorialName = (userRole === 'facility' || userRole === 'company') ? 'facilityProfileTabs' : 'profileTabs';
    startTutorial(tutorialName);
} else {
    const nextFeature = ['messages', 'contracts', 'calendar', 'marketplace', 'settings'].find(f => !completedInType[f]?.completed);
    if (nextFeature) {
        startTutorial(nextFeature);
    }
}
```
**ISSUE**: Duplicate hardcoded sequencing logic in lifecycle management.

---

### 2. SIDEBAR ACCESS CONTROL RULES

#### Location: `contexts/TutorialContext/hooks/useTutorialRules.js` (Lines 25-76)
```javascript
const isSidebarItemAccessible = useCallback((itemPath) => {
    const itemName = itemPath.split('/').pop();
    const isFacilityWorkspace = selectedWorkspace?.type === 'team';

    if (itemName === 'overview' || itemName === 'dashboard') {
        return true;
    }

    if (itemName === 'profile') {
        return activeTutorial === 'profileTabs' ||
            activeTutorial === 'facilityProfileTabs' ||
            (activeTutorial === 'dashboard' && currentStep >= 2) ||
            !isTutorialActive ||
            tutorialPassed;
    }

    const platformFeatures = ['messages', 'contracts', 'calendar', 'marketplace', 'organization', 'settings', 'payroll'];

    if (platformFeatures.includes(itemName)) {
        if (access === 'full' || tutorialPassed) {
            return true;
        }

        if (access === 'team') {
            if (isFacilityWorkspace) {
                return itemName !== 'marketplace';
            } else {
                return itemName !== 'organization' && itemName !== 'payroll';
            }
        }
        return false;
    }

    return true;
}, [tutorialPassed, isTutorialActive, activeTutorial, currentStep, access, selectedWorkspace]);
```
**ISSUE**: Complex hardcoded access rules mixing tutorial state, workspace type, and access mode.

#### Duplicate Location: `contexts/TutorialContext/hooks/useTutorialNavigation.js` (Lines 35-87)
**ISSUE**: Nearly identical `isSidebarItemAccessible` function with slight variations.

#### Used In: `components/Sidebar/Sidebar.js` (Lines 190-285)
```javascript
const isItemAccessible = (item) => {
    if (tutorialPassed) return true;
    if (isTutorialActive) {
        return isSidebarItemAccessible(item.path);
    }
    return true;
};
```
**ISSUE**: Components directly querying tutorial state for access decisions.

---

### 3. TAB COMPLETION & ACCESS VALIDATION RULES

#### Location: `pages/profile/utils/profileUtils.js`
```javascript
export const isTabCompleted = (formData, tabId, profileConfig) => {
    // Complex validation logic
};

export const isTabAccessible = (formData, tabId, profileConfig) => {
    // Sequential tab access logic
};
```
**USED IN**: 
- `pages/profile/Profile.js` (Lines 97, 420, 627)
- `pages/profile/hooks/useProfileFormHandlers.js` (Lines 77, 90, 126)
- `contexts/TutorialContext/hooks/useTutorialRules.js` (Line 2, 128)

**ISSUE**: Tab completion rules scattered across profile logic and tutorial context.

---

### 4. ACCESS MODE DETERMINATION RULES

#### Location: `pages/profile/components/ProfileHeader.js` (Lines 97-111)
```javascript
if (isTutorialActive && tabId === 'professionalBackground' && maxAccessedProfileTab === 'personalDetails') {
    console.log('[ProfileHeader] Tutorial active - showing local AccessLevelChoicePopup');
    setPendingTabId(tabId);
    setShowLocalAccessLevelModal(true);
    wasShown = true;
    return;
}

if ((accessMode === 'team' || accessMode === 'loading') && !isTutorialActive && lockedTabsForTeam.includes(tabId)) {
    console.log('[ProfileHeader] Tab locked for Team/Loading Access');
    setPendingTabId(tabId);
    setShowLocalAccessLevelModal(true);
    return;
}
```
**ISSUE**: UI component making tutorial progression decisions based on hardcoded rules.

---

### 5. FEATURE-SPECIFIC TUTORIAL ACTIVATION RULES

#### Location: `pages/profile/hooks/useProfileTutorial.js` (Lines 18-32)
```javascript
const shouldStartProfileTutorial =
    formData &&
    !tutorialPassed &&
    !isTutorialComplete &&
    !isInTutorial &&
    !profileTutorialStartedRef.current &&
    (activeTutorial === 'dashboard' || location.pathname.includes('/profile'));

if (shouldStartProfileTutorial) {
    const timer = setTimeout(() => {
        profileTutorialStartedRef.current = true;
        startTutorial(tutorialName);
    }, 500);
    return () => clearTimeout(timer);
}
```
**ISSUE**: Page-level hooks determining when to auto-start tutorials.

#### Similar Pattern In:
- `pages/messages/Messages.js` (Lines 181, 223, 317)
- `pages/contracts/Contracts.js` (Lines 45, 166, 189, 401)
- `pages/calendar/Calendar.js` (Line 646)
- `pages/marketplace/Marketplace.js` (Lines 46-49)

**ISSUE**: Each feature page has its own tutorial activation logic and mock data handling.

---

### 6. TUTORIAL STEP NAVIGATION RULES

#### Location: `contexts/TutorialContext/hooks/useTutorialRules.js` (Lines 118-138)
```javascript
const getNextIncompleteTabStep = useCallback((currentTabId, steps) => {
    if (!profileConfig || !userProfile) return -1;

    const tabOrder = profileConfig.tabs?.map(t => t.id).filter(id => id !== 'deleteAccount') || [];
    const currentTabIndex = tabOrder.indexOf(currentTabId);
    let nextTabIndex = currentTabIndex + 1;

    while (nextTabIndex < tabOrder.length) {
        const nextTabId = tabOrder[nextTabIndex];
        if (nextTabId === 'professionalBackground' || !isTabCompleted(userProfile, nextTabId, profileConfig)) {
            const targetStepIndex = steps.findIndex(step =>
                step.requiredTab === nextTabId || step.highlightTab === nextTabId
            );
            if (targetStepIndex !== -1) return targetStepIndex;
        }
        nextTabIndex++;
    }

    return -1;
}, [profileConfig, userProfile]);
```
**ISSUE**: Smart skip logic hardcoded with special cases (e.g., `professionalBackground`).

---

### 7. TUTORIAL RESTORATION & LIFECYCLE RULES

#### Location: `contexts/TutorialContext.js` (Lines 504-541)
```javascript
if (typeProgress.completed) {
    console.log(`[TutorialContext] Tutorial for ${onboardingType} already completed, skipping restoration.`);
    if (savedTutorial) {
        const profileCollection = onboardingType === 'facility' ? 'facilityProfiles' : 'professionalProfiles';
        const profileRef = doc(db, profileCollection, currentUser.uid);
        updateDoc(profileRef, {
            [`tutorialProgress.${onboardingType}.activeTutorial`]: null
        }).catch(err => console.error("Error clearing stale activeTutorial:", err));
    }
    return;
}

if (lastRestoredStateRef.current.tutorial === savedTutorial &&
    lastRestoredStateRef.current.step === savedStep) {
    console.log(`[TutorialContext] Already restored ${savedTutorial}:${savedStep}, skipping redundant restoration.`);
    return;
}
```
**ISSUE**: Complex state restoration logic with hardcoded Firestore paths and business rules.

---

### 8. TUTORIAL-BASED MOCK DATA RULES

#### Location: Multiple Pages
- `pages/messages/Messages.js` (Lines 180-219) - Mock conversations
- `pages/contracts/Contracts.js` (Lines 44-91) - Mock contracts
- `pages/calendar/utils/eventDatabase.js` (Lines 757-837) - Mock events
- `pages/marketplace/Marketplace.js` (Lines 46-49) - Mock listings

**Pattern**:
```javascript
const getMockConversations = useCallback(() => {
    if (!isTutorialActive || activeTutorial !== 'messages') return [];
    // Generate mock data...
}, [isTutorialActive, activeTutorial]);
```
**ISSUE**: Each page independently implements mock data logic based on tutorial state.

---

### 9. TUTORIAL STEP CONFIGURATION RULES

#### Location: Duplicated in TWO places
1. `contexts/TutorialContext/config/tutorialSteps.js` (476 lines)
2. `tutorial/tutorialSteps.js` (451 lines)

**Sample Step Configuration**:
```javascript
{
    id: 'professional-background-tab',
    title: 'Step 2: Professional Background',
    content: '...',
    targetSelector: 'button[data-tab="professionalBackground"]',
    targetArea: 'content',
    highlightTab: 'professionalBackground',
    highlightUploadButton: true,
    navigationPath: '/dashboard/profile/professionalBackground',
    requiresInteraction: true,
    requiresFullAccess: true,  // ← ACCESS RULE
    customButtons: [...]
}
```
**ISSUE**: 
- Step definitions include embedded access/gating rules
- Duplicated across two files
- No single source of truth for tutorial configuration

---

### 10. HARDCODED CONSTANTS & TUTORIAL FEATURES

#### Location: `contexts/TutorialContext/constants.js`
```javascript
export const MANDATORY_TUTORIALS = [
    TUTORIAL_FEATURES.DASHBOARD,
    TUTORIAL_FEATURES.PROFILE_TABS,
    TUTORIAL_FEATURES.FACILITY_PROFILE_TABS,
    TUTORIAL_FEATURES.MESSAGES,
    TUTORIAL_FEATURES.CONTRACTS,
    TUTORIAL_FEATURES.CALENDAR,
    TUTORIAL_FEATURES.MARKETPLACE,
    TUTORIAL_FEATURES.SETTINGS
];
```
**ISSUE**: Constants defined but not consistently used. Duplicate hardcoded arrays exist in:
- `useTutorialActions.js` (Line 172)
- `TutorialContext.js` (Line 561)

---

## SCATTERED RULE CATEGORIES SUMMARY

| Rule Category | Locations | Files Affected |
|--------------|-----------|----------------|
| **Tutorial Sequencing** | 3 locations | TutorialContext.js, useTutorialActions.js, constants.js |
| **Sidebar Access Control** | 4 implementations | useTutorialRules.js (×2), useTutorialNavigation.js, Sidebar.js |
| **Tab Validation** | 5 locations | profileUtils.js, Profile.js, useProfileFormHandlers.js, useTutorialRules.js (×2) |
| **Access Mode Logic** | 8 locations | ProfileHeader.js, TutorialContext.js, useTutorialRules.js (×2), Header.js, etc. |
| **Auto-Start Rules** | 6 locations | useProfileTutorial.js, Messages.js, Contracts.js, Calendar.js, Marketplace.js, eventDatabase.js |
| **Step Navigation** | 3 locations | useTutorialRules.js, useTutorialNavigation.js, TutorialContext.js |
| **Mock Data Logic** | 4 locations | Messages.js, Contracts.js, Calendar.js, Marketplace.js |
| **Step Configuration** | 2 duplicate files | tutorialSteps.js (×2) |

---

## PROPOSED CENTRAL TUTORIAL MANAGEMENT SYSTEM

### Architecture

```
src/dashboard/tutorial/
├── TutorialManager.js                  # CENTRAL ORCHESTRATOR
├── config/
│   ├── tutorialSteps.js               # Single source of step definitions
│   ├── tutorialSequences.js           # Tutorial ordering & chaining rules
│   ├── accessRules.js                 # Feature gating & access control
│   └── mockDataConfig.js              # Tutorial mock data specifications
├── rules/
│   ├── NavigationRules.js             # Sidebar & route access logic
│   ├── ProgressionRules.js            # When to advance/complete tutorials
│   ├── ValidationRules.js             # Tab completion & prerequisites
│   └── WorkspaceRules.js              # Workspace-specific tutorial behavior
├── services/
│   ├── TutorialStateService.js        # State management & persistence
│   ├── TutorialNavigationService.js   # Navigation & routing
│   └── MockDataService.js             # Centralized mock data generation
└── hooks/
    ├── useTutorialManager.js          # Main consumer hook
    ├── useTutorialAccess.js           # Access control queries
    └── useTutorialMockData.js         # Mock data for feature pages
```

### Key Principles

1. **Single Source of Truth**: All tutorial rules in one location
2. **Configuration-Driven**: Rules defined as data, not code
3. **Separation of Concerns**: Business logic separate from UI components
4. **Testability**: Rules can be unit tested independently
5. **Maintainability**: Changes to rules in one place propagate everywhere

### Example: Centralized Access Rule

**BEFORE** (Scattered across 4 files):
```javascript
// In useTutorialRules.js
if (itemName === 'profile') {
    return activeTutorial === 'profileTabs' || ...;
}
const platformFeatures = ['messages', 'contracts', ...];
if (platformFeatures.includes(itemName)) {
    if (access === 'full' || tutorialPassed) return true;
    // More complex logic...
}
```

**AFTER** (Centralized):
```javascript
// tutorial/config/accessRules.js
export const FEATURE_ACCESS_RULES = {
    overview: { alwaysAccessible: true },
    dashboard: { alwaysAccessible: true },
    profile: {
        requiresAny: [
            { tutorialActive: ['profileTabs', 'facilityProfileTabs'] },
            { tutorialStep: { min: 2, tutorial: 'dashboard' } },
            { tutorialPassed: true }
        ]
    },
    messages: {
        requiresAll: [
            { accessMode: ['full', 'tutorialPassed'] },
            { OR: [
                { workspaceType: 'personal' },
                { workspaceType: 'team' }
            ]}
        ]
    },
    marketplace: {
        requiresAll: [
            { accessMode: ['full', 'tutorialPassed'] },
            { workspaceType: 'personal' }
        ]
    }
};

// tutorial/rules/NavigationRules.js
export class NavigationRules {
    static canAccessFeature(featureName, context) {
        const rule = FEATURE_ACCESS_RULES[featureName];
        return this.evaluateRule(rule, context);
    }
    
    static evaluateRule(rule, context) {
        // Declarative rule evaluation engine
    }
}
```

### Example: Centralized Tutorial Sequence

**BEFORE** (Hardcoded in 3 places):
```javascript
const mandatoryTutorials = ['dashboard', 'profileTabs', ...];
const currentIndex = mandatoryTutorials.indexOf(previousTutorial);
if (currentIndex !== -1 && currentIndex < mandatoryTutorials.length - 1) {
    const nextTutorial = mandatoryTutorials[currentIndex + 1];
    // ...
}
```

**AFTER** (Centralized):
```javascript
// tutorial/config/tutorialSequences.js
export const TUTORIAL_SEQUENCES = {
    professional: {
        mandatory: [
            { id: 'dashboard', skippable: false },
            { 
                id: 'profileTabs', 
                skippable: false,
                completionTriggers: ['allTabsComplete', 'manualComplete']
            },
            { id: 'messages', skippable: true },
            { id: 'contracts', skippable: true },
            { id: 'calendar', skippable: true },
            { id: 'marketplace', skippable: true },
            { id: 'settings', skippable: true }
        ],
        optional: []
    },
    facility: {
        mandatory: [
            { id: 'dashboard', skippable: false },
            { id: 'facilityProfileTabs', skippable: false },
            // ...
        ]
    }
};

// tutorial/services/TutorialStateService.js
export class TutorialStateService {
    static getNextTutorial(currentTutorial, onboardingType, completedTutorials) {
        const sequence = TUTORIAL_SEQUENCES[onboardingType].mandatory;
        const currentIndex = sequence.findIndex(t => t.id === currentTutorial);
        
        for (let i = currentIndex + 1; i < sequence.length; i++) {
            const tutorial = sequence[i];
            if (!completedTutorials[tutorial.id]) {
                return tutorial.id;
            }
        }
        return null;
    }
}
```

---

## MIGRATION PLAN

### Phase 1: Create Central System (Week 1)
1. Create `tutorial/config/` structure
2. Consolidate all tutorial steps into single file
3. Extract all access rules into `accessRules.js`
4. Extract all sequences into `tutorialSequences.js`
5. Create rule evaluation engine

### Phase 2: Implement Services (Week 2)
1. Build `TutorialStateService`
2. Build `NavigationRules` class
3. Build `MockDataService`
4. Create `useTutorialManager` hook

### Phase 3: Migrate Consumers (Week 3-4)
1. Update `TutorialContext` to use central system
2. Update sidebar to query central access rules
3. Update profile pages to use central validation
4. Update feature pages (messages, contracts, etc.)
5. Remove duplicate tutorial hooks

### Phase 4: Cleanup (Week 5)
1. Delete redundant rule implementations
2. Delete duplicate `tutorialSteps.js`
3. Remove scattered tutorial logic from components
4. Update documentation

---

## BENEFITS

1. **Maintainability**: Change tutorial rules in ONE place
2. **Consistency**: Guaranteed uniform behavior across all features
3. **Testability**: Rules can be unit tested independently
4. **Debuggability**: Single place to debug tutorial issues
5. **Scalability**: Easy to add new tutorials without touching existing code
6. **Documentation**: Rules are self-documenting when centralized
7. **Performance**: Cached rule evaluations vs. scattered calculations

---

## RISKS & MITIGATION

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing functionality | HIGH | Comprehensive test suite before migration |
| Performance degradation | MEDIUM | Implement rule caching and memoization |
| Complex refactoring | MEDIUM | Incremental migration, feature-by-feature |
| State synchronization issues | HIGH | Maintain backward compatibility during transition |

---

## CONCLUSION

The current tutorial implementation has **47+ files** with **scattered, duplicated, and hardcoded rules**. This creates:
- Maintenance nightmares
- Inconsistent behavior
- Difficult debugging
- High risk of bugs

**RECOMMENDATION**: Implement a **Central Tutorial Management System** to consolidate all rules into a single, testable, maintainable source of truth.

**ESTIMATED EFFORT**: 4-5 weeks for full migration
**PRIORITY**: HIGH - Technical debt is accumulating rapidly

