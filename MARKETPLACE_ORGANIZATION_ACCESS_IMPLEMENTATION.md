# MARKETPLACE & ORGANIZATION ACCESS POPUP IMPLEMENTATION

## SUMMARY
Implemented access level popup display for Marketplace and Organization tabs when users with tutorial/team access (not full access) click on these tabs outside of the tutorial context.

## IMPLEMENTATION DETAILS

### 1. Sidebar.js Updates

**File**: `src/dashboard/components/Sidebar/Sidebar.js`

#### Added Workspace Type Detection (Lines 349-350)
```javascript
const isPersonalWorkspace = selectedWorkspace?.type === WORKSPACE_TYPES.PERSONAL;
const isTeamWorkspace = selectedWorkspace?.type === WORKSPACE_TYPES.TEAM;
```

#### Enhanced Locked Item Detection (Lines 352-353)
```javascript
const isMarketplaceTeamLocked = itemKey === 'marketplace' && !isAccessible && isPersonalWorkspace && !isTutorialActive && (accessMode === 'team' || accessMode === 'loading');
const isOrganizationTeamLocked = itemKey === 'organization' && !isAccessible && isTeamWorkspace && !isTutorialActive && (accessMode === 'team' || accessMode === 'loading');
```

**Logic**:
- **Marketplace**: Locked when in Personal workspace with team/loading access **AND NOT in active tutorial**
- **Organization**: Locked when in Team/Facility workspace with team/loading access **AND NOT in active tutorial**
- **Key Condition**: `!isTutorialActive` ensures popup only shows **outside of tutorial**

#### Updated Conditional Rendering (Lines 355, 370)
```javascript
if (!isAccessible && !isMarketplaceTeamLocked && !isOrganizationTeamLocked) {
  // Render as standard locked item
}

if (isMarketplaceTeamLocked || isOrganizationTeamLocked) {
  // Render as clickable item that shows AccessLevelChoicePopup
}
```

#### Unified Click Handler (Lines 375-389)
```javascript
onClick={(e) => {
  e.preventDefault();
  e.stopPropagation();
  console.log(`[Sidebar] ${itemDisplayName} locked for team access, showing AccessLevelChoicePopup`);
  if (typeof setAllowAccessLevelModalClose === 'function') {
    setAllowAccessLevelModalClose(true);
  }
  if (typeof setShowAccessLevelModal === 'function') {
    setShowAccessLevelModal(true);
  }
}}
```

### 2. LockedMenuItem.js Updates

**File**: `src/dashboard/components/Sidebar/LockedMenuItem.js`

#### Enhanced Team Access Detection (Lines 16-19)
```javascript
const itemName = item.path.split('/').pop();
const isMarketplaceTeamAccess = itemName === 'marketplace' && accessMode === 'team' && !isTutorialActive;
const isOrganizationTeamAccess = itemName === 'organization' && accessMode === 'team' && !isTutorialActive;
const isTeamAccessLocked = isMarketplaceTeamAccess || isOrganizationTeamAccess;
```

**Key Condition**: `!isTutorialActive` ensures this only triggers **outside of tutorial**

#### Updated Click Handler (Lines 27-32)
```javascript
if (isTeamAccessLocked) {
    console.log(`[LockedMenuItem] Showing AccessLevelChoicePopup for ${itemName} with team access`);
    setAllowAccessLevelModalClose(true);
    setShowAccessLevelModal(true);
    return;
}
```

#### Updated UI Attributes
- `aria-disabled={!isTeamAccessLocked}`
- `cursor: isTeamAccessLocked ? 'pointer' : 'not-allowed'`
- Hover styling: `isTeamAccessLocked ? "cursor-pointer hover:bg-amber-50..." : ""`

## BEHAVIOR

### Scenario 1: Professional User with Tutorial/Team Access
**Context**: User in Personal workspace, has `accessMode === 'team'` or `'loading'`

**Marketplace Tab**:
- ✅ Tab visible in sidebar (grayed out with lock icon)
- ✅ Clicking tab shows `AccessLevelChoicePopup`
- ✅ Modal allows user to upgrade to full access or continue with team access

**Organization Tab**:
- ❌ Tab NOT visible (only shows in Team workspace)

### Scenario 2: Professional User in Facility Workspace with Tutorial/Team Access
**Context**: User in Team/Facility workspace, has `accessMode === 'team'` or `'loading'`

**Organization Tab**:
- ✅ Tab visible in sidebar (grayed out with lock icon)
- ✅ Clicking tab shows `AccessLevelChoicePopup`
- ✅ Modal allows user to upgrade to full access or continue with team access

**Marketplace Tab**:
- ❌ Tab NOT visible (only shows in Personal workspace)

### Scenario 3: User with Full Access
**Context**: User has `accessMode === 'full'` or `tutorialPassed === true`

- ✅ All tabs fully accessible (no locks)
- ✅ No popups shown when clicking tabs
- ✅ Direct navigation to features

## ACCESS MODE LOGIC

| Access Mode | Marketplace (Personal WS) | Organization (Team WS) |
|-------------|---------------------------|------------------------|
| `'full'` | ✅ Unlocked | ✅ Unlocked |
| `'team'` | 🔒 Shows popup | 🔒 Shows popup |
| `'loading'` | 🔒 Shows popup | 🔒 Shows popup |
| Tutorial passed | ✅ Unlocked | ✅ Unlocked |

## TESTING CHECKLIST

### Test 1: Marketplace with Team Access (Personal Workspace) - OUTSIDE TUTORIAL
- [ ] User has `accessMode === 'team'` or `'loading'`
- [ ] User is NOT in active tutorial (`isTutorialActive === false`)
- [ ] Marketplace tab visible but locked (grayed out with lock icon)
- [ ] Clicking Marketplace tab shows AccessLevelChoicePopup
- [ ] Modal has "Continue Onboarding" and "Team Access" options
- [ ] Modal can be closed (allowClose = true)
- [ ] Console logs show: `[Sidebar] Marketplace locked for team access, showing AccessLevelChoicePopup`

### Test 2: Organization with Team Access (Facility Workspace) - OUTSIDE TUTORIAL
- [ ] User has `accessMode === 'team'` or `'loading'`
- [ ] User is NOT in active tutorial (`isTutorialActive === false`)
- [ ] Organization tab visible but locked (grayed out with lock icon)
- [ ] Clicking Organization tab shows AccessLevelChoicePopup
- [ ] Modal has "Continue Onboarding" and "Team Access" options
- [ ] Modal can be closed (allowClose = true)
- [ ] Console logs show: `[Sidebar] Organization locked for team access, showing AccessLevelChoicePopup`

### Test 3: During Active Tutorial - NO POPUP
- [ ] User is IN active tutorial (`isTutorialActive === true`)
- [ ] Locked tabs remain locked but do NOT show popup
- [ ] Normal tutorial flow continues
- [ ] Standard locked item behavior (shake animation, tooltip)

### Test 4: Full Access Verification
- [ ] User with `accessMode === 'full'` sees both tabs unlocked
- [ ] No popups appear when clicking tabs
- [ ] Direct navigation works

## RELATED FILES

### Modified Files
1. `src/dashboard/components/Sidebar/Sidebar.js` - Main sidebar logic
2. `src/dashboard/components/Sidebar/LockedMenuItem.js` - Locked item component

### Related Context Files
1. `src/dashboard/tutorial/Tutorial.js` - Renders AccessLevelChoicePopup
2. `src/dashboard/pages/profile/components/AccessLevelChoicePopup.js` - The actual popup component
3. `src/dashboard/contexts/TutorialContext.js` - Manages tutorial state and access modes
4. `src/dashboard/contexts/TutorialContext/hooks/useTutorialRules.js` - Access rules logic
5. `src/config/tutorialAccessRules.js` - Centralized access rules

## NOTES

1. **Outside of Tutorial**: The implementation specifically handles clicks "outside of the tutorial" context, meaning when `isTutorialActive === false` or user is not in the tutorial flow.

2. **Access Mode States**:
   - `'full'`: Complete profile access, all tabs unlocked
   - `'team'`: Quick team access, limited features
   - `'loading'`: Intermediate state, treated same as 'team'

3. **Workspace Types**:
   - `WORKSPACE_TYPES.PERSONAL`: Professional personal workspace
   - `WORKSPACE_TYPES.TEAM`: Facility/team workspace
   - `WORKSPACE_TYPES.ADMIN`: Admin workspace (separate logic)

4. **Consistency**: Both Marketplace and Organization now follow the exact same pattern for team access restrictions, just in different workspace contexts.

