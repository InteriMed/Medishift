# ACCESS LEVEL CHOICE SYSTEM - UNIFIED IMPLEMENTATION

## OVERVIEW

This document describes the unified access level choice system that controls what features users can access based on their onboarding choice.

## SINGLE VARIABLE SYSTEM

### State Variable: `accessLevelChoice`

**Location**: `TutorialContext` state  
**Type**: `'team' | 'full' | 'loading' | null`  
**Purpose**: Tracks user's access level choice throughout the application

#### Values:
- `'team'`: Quick team access (skip profile completion, limited features)
- `'full'`: Full access (complete profile, all features unlocked)
- `'loading'`: Pending choice (user needs to decide)
- `null`: Not initialized yet

### Database Field: `accessLevelChoice`

**Collection**: `professionalProfiles` or `facilityProfiles`  
**Type**: String  
**Values**: Same as state variable

**Migration**: For backward compatibility, the system also reads the old `tutorialAccessMode` field and migrates values:
- `'enabled'` or `'disabled'` → migrated to `'loading'`
- `'team'`, `'full'`, `'loading'` → used as-is

## FEATURE ACCESS CONTROL

### Marketplace (Personal Workspace)

**Access Rules:**
- `accessLevelChoice === 'full'` → ✅ Unlocked, full access
- `accessLevelChoice === 'team'` → 🔒 Locked, shows popup on click
- `accessLevelChoice === 'loading'` → 🔒 Locked, shows popup on click
- `tutorialPassed === true` AND `accessLevelChoice !== 'team'/'loading'` → ✅ Unlocked

**Behavior when locked:**
- Tab visible in sidebar with lock icon
- Clicking shows `AccessLevelChoicePopup`
- No navigation occurs
- User can upgrade to full access or continue with team access

### Organization (Team/Facility Workspace)

**Access Rules:**
- `accessLevelChoice === 'full'` → ✅ Unlocked, full access
- `accessLevelChoice === 'team'` → 🔒 Locked, shows popup on click
- `accessLevelChoice === 'loading'` → 🔒 Locked, shows popup on click
- `tutorialPassed === true` AND `accessLevelChoice !== 'team'/'loading'` → ✅ Unlocked

**Behavior when locked:**
- Tab visible in sidebar with lock icon (when in team workspace)
- Clicking shows `AccessLevelChoicePopup`
- No navigation occurs
- User can upgrade to full access

## IMPLEMENTATION FILES

### Core Context
- **`src/dashboard/contexts/TutorialContext.js`**
  - Main context provider
  - Manages `accessLevelChoice` state
  - Loads from DB on mount
  - Provides `setAccessLevelChoice()` function

### State Management
- **`src/dashboard/contexts/TutorialContext/hooks/useTutorialState.js`**
  - Declares `accessLevelChoice` state
  - Initial value: `null`

### Storage
- **`src/dashboard/contexts/TutorialContext/utils/tutorialStorage.js`**
  - `saveAccessLevelChoice(profileCollection, userId, accessLevel)`
  - Saves to Firestore field: `accessLevelChoice`

### Access Rules
- **`src/dashboard/contexts/TutorialContext/hooks/useTutorialRules.js`**
  - `isSidebarItemAccessible(itemPath)` 
  - Checks `access` param (which is `accessLevelChoice` value)
  - Returns `false` for marketplace/organization when `access === 'team'` or `'loading'`

### UI Components
- **`src/dashboard/components/Sidebar/Sidebar.js`**
  - Uses `accessLevelChoice` from context
  - Renders locked button when `isMarketplaceTeamLocked` or `isOrganizationTeamLocked`
  - Shows popup on click

- **`src/dashboard/components/Sidebar/LockedMenuItem.js`**
  - Uses `accessLevelChoice` to determine if item should show popup
  - `isTeamAccessLocked` checks for marketplace/organization with team access

- **`src/dashboard/pages/profile/components/ProfileHeader.js`**
  - Uses `accessLevelChoice` to control profile tab access
  - Shows `AccessLevelChoicePopup` when needed

## ACCESS LEVEL CHOICE POPUP

**Component**: `src/dashboard/pages/profile/components/AccessLevelChoicePopup.js`

**Trigger Conditions:**
1. User with `accessLevelChoice === 'team'` or `'loading'` clicks locked feature
2. User tries to navigate away from profile during onboarding

**Options:**
1. **"Team Access" (Quick Start)**
   - Sets `accessLevelChoice = 'team'`
   - Skips profile completion
   - Locks certain features (marketplace for personal, organization for team workspace)

2. **"Continue Onboarding" (Full Access)**
   - Sets `accessLevelChoice = 'loading'` (or keeps it)
   - User continues filling profile
   - Upon profile completion, automatically upgrades to `'full'`

## SETTER FUNCTION

```javascript
const setAccessLevelChoice = useCallback(async (choice) => {
  if (!currentUser) return;

  console.log("[TutorialContext] Setting access level choice:", choice);
  setAccessLevelChoice(choice);
  setShowAccessLevelModal(false);
  setAllowAccessLevelModalClose(false);

  // Save to Firestore
  const onboardingType = selectedWorkspace?.type === WORKSPACE_TYPES.TEAM ? 'facility' : 'professional';
  const profileCollection = getProfileCollection(onboardingType);
  
  await saveAccessLevelChoice(profileCollection, currentUser.uid, choice);
}, [currentUser, selectedWorkspace]);
```

## LOADING SEQUENCE

1. **App loads** → `accessLevelChoice = null`
2. **Context mounts** → Fetches from Firestore
3. **DB has value** → Sets `accessLevelChoice` from DB
4. **DB has old value** (`'enabled'/'disabled'`) → Migrates to `'loading'`
5. **User makes choice** → Updates state and DB
6. **Profile completion** → Auto-upgrades to `'full'`

## TESTING

### Test Scenario 1: New User
- DB: No `accessLevelChoice` field
- Expected: `accessLevelChoice = 'loading'`
- Marketplace/Organization: 🔒 Locked

### Test Scenario 2: Team Access User
- DB: `accessLevelChoice = 'team'`
- Expected: Loads as `'team'`
- Marketplace (personal): 🔒 Locked
- Organization (team): 🔒 Locked

### Test Scenario 3: Full Access User
- DB: `accessLevelChoice = 'full'`
- Expected: Loads as `'full'`
- All features: ✅ Unlocked

### Test Scenario 4: Legacy User
- DB: `tutorialAccessMode = 'enabled'`
- Expected: Migrates to `accessLevelChoice = 'loading'`
- Marketplace/Organization: 🔒 Locked
- Prompts for access level choice

## CONSOLE DEBUGGING

Enable logs with tag `[TutorialContext]`:

```javascript
// Loading from DB
[TutorialContext] Loading accessLevelChoice - saved: 'team', current: null
[TutorialContext] Loaded accessLevelChoice from profile: 'team'

// Migration
[TutorialContext] OLD SCHEMA DETECTED - migrating to 'loading'

// Setting choice
[TutorialContext] Setting access level choice: full
[TutorialStorage] Saved accessLevelChoice full to professionalProfiles

// Access checks
[Sidebar] marketplace conditions: {
  accessLevelChoice: 'team',
  isAccessible: false,
  isMarketplaceTeamLocked: true
}
```

## MIGRATION NOTES

### Old Field: `tutorialAccessMode`
- **Old Purpose**: Mixed usage - both tutorial on/off AND access level
- **Old Values**: `'enabled'`, `'disabled'`, `'team'`, `'full'`, `'loading'`
- **Status**: Deprecated but still read for migration

### New Field: `accessLevelChoice`
- **New Purpose**: ONLY access level choice
- **New Values**: `'team'`, `'full'`, `'loading'`
- **Status**: Current standard

### Migration Strategy
The system reads both fields with priority:
1. Try to read `accessLevelChoice` (new field)
2. Fall back to `tutorialAccessMode` (old field)
3. Migrate old values as needed
4. Save to new field on next update

This ensures backward compatibility while transitioning to the new schema.

## RELATED SYSTEMS

- **Tutorial System**: Uses `isTutorialActive` (separate from access level)
- **Profile Completion**: Triggers upgrade to `'full'` access
- **Workspace Types**: Determines which features to lock (personal vs team)
- **Routing**: Does NOT block routes, only UI interaction

## SUMMARY

✅ **Single variable**: `accessLevelChoice`  
✅ **Clear purpose**: User's chosen access level  
✅ **Consistent usage**: Throughout all components  
✅ **Backward compatible**: Migrates old schema  
✅ **Well-tested**: Multiple scenarios covered

