# TESTING SCENARIOS FOR MARKETPLACE & ORGANIZATION ACCESS FIX

## SCENARIO 1: Professional User in Personal Workspace

**Setup:**
- User has `professionalProfile` document
- Currently in Personal workspace (`workspace.type === 'personal'`)
- Access level: 'team' or 'full'

**Expected Behavior:**

✅ **Sidebar:**
- [x] Messages tab VISIBLE
- [x] Contracts tab VISIBLE
- [x] Calendar tab VISIBLE
- [x] Profile tab VISIBLE
- [x] Marketplace tab VISIBLE ← **KEY TEST**
- [x] Organization tab HIDDEN
- [x] Payroll tab HIDDEN

✅ **Routing:**
- [x] `/dashboard/marketplace` → Marketplace page loads successfully
- [x] `/dashboard/organization` → Redirects to `/dashboard/overview`
- [x] `/dashboard/payroll` → Redirects to `/dashboard/overview`

✅ **Tutorial Access:**
- [x] `isSidebarItemAccessible('marketplace')` returns `true`
- [x] `isSidebarItemAccessible('organization')` returns `false`
- [x] `isSidebarItemAccessible('payroll')` returns `false`

---

## SCENARIO 2: Professional User in Facility/Team Workspace

**Setup:**
- User has `professionalProfile` AND `facilityMemberships`
- Currently in Team workspace (`workspace.type === 'team'`)
- Access level: 'team' or 'full'

**Expected Behavior:**

✅ **Sidebar:**
- [x] Messages tab VISIBLE
- [x] Contracts tab VISIBLE
- [x] Calendar tab VISIBLE
- [x] Profile tab VISIBLE
- [x] Organization tab VISIBLE ← **KEY TEST**
- [x] Payroll tab VISIBLE ← **KEY TEST**
- [x] Marketplace tab HIDDEN ← **KEY TEST**

✅ **Routing:**
- [x] `/dashboard/organization` → Organization page loads successfully
- [x] `/dashboard/payroll` → Payroll page loads successfully
- [x] `/dashboard/marketplace` → Redirects to `/dashboard/overview`

✅ **Tutorial Access:**
- [x] `isSidebarItemAccessible('organization')` returns `true`
- [x] `isSidebarItemAccessible('payroll')` returns `true`
- [x] `isSidebarItemAccessible('marketplace')` returns `false`

---

## SCENARIO 3: Workspace Switching (Professional → Facility)

**Setup:**
- User switches from Personal workspace to Team workspace
- User clicks workspace selector dropdown, selects a facility

**Expected Behavior:**

✅ **Before Switch (Personal):**
- [x] Marketplace VISIBLE in sidebar
- [x] Organization HIDDEN in sidebar

✅ **After Switch (Team):**
- [x] Marketplace HIDDEN in sidebar
- [x] Organization VISIBLE in sidebar
- [x] If user was on `/dashboard/marketplace`, redirects to `/dashboard/overview`
- [x] Page reloads or navigates to facility workspace default route

---

## SCENARIO 4: Workspace Switching (Facility → Professional)

**Setup:**
- User switches from Team workspace to Personal workspace
- User clicks workspace selector dropdown, selects "Personal Workspace"

**Expected Behavior:**

✅ **Before Switch (Team):**
- [x] Organization VISIBLE in sidebar
- [x] Marketplace HIDDEN in sidebar

✅ **After Switch (Personal):**
- [x] Organization HIDDEN in sidebar
- [x] Marketplace VISIBLE in sidebar
- [x] If user was on `/dashboard/organization`, redirects to `/dashboard/overview`
- [x] Page reloads or navigates to personal workspace default route

---

## SCENARIO 5: Professional with Team Access During Onboarding

**Setup:**
- New professional user going through onboarding
- Access level: 'team' (not yet 'full')
- In Personal workspace

**Expected Behavior:**

✅ **Tutorial Rules:**
- [x] Marketplace should be ACCESSIBLE (not locked)
- [x] Messages, Contracts, Calendar should be ACCESSIBLE
- [x] Organization should be LOCKED/HIDDEN
- [x] Tutorial can progress through marketplace steps

---

## SCENARIO 6: Facility Admin with Team Access During Onboarding

**Setup:**
- New facility representative going through onboarding
- Access level: 'team' (not yet 'full')
- In Team workspace

**Expected Behavior:**

✅ **Tutorial Rules:**
- [x] Organization should be ACCESSIBLE (not locked)
- [x] Payroll should be ACCESSIBLE
- [x] Messages, Contracts, Calendar should be ACCESSIBLE
- [x] Marketplace should be LOCKED/HIDDEN
- [x] Tutorial can progress through organization steps

---

## SCENARIO 7: Direct URL Access (Security Test)

**Setup:**
- User manually types URLs in browser address bar

**Expected Behavior for Professional (Personal Workspace):**
- [x] `/en/dashboard/marketplace` → Page loads successfully
- [x] `/en/dashboard/organization` → Redirects to `/en/dashboard/overview`
- [x] Navigation preserved with workspace ID query param

**Expected Behavior for Facility User (Team Workspace):**
- [x] `/en/dashboard/organization?workspace=facilityId` → Page loads successfully
- [x] `/en/dashboard/marketplace?workspace=facilityId` → Redirects to `/en/dashboard/overview?workspace=facilityId`
- [x] Navigation preserved with workspace ID query param

---

## SCENARIO 8: Shared Routes (Always Accessible)

**Setup:**
- Any user in any workspace type

**Expected Behavior:**

✅ **Always Accessible:**
- [x] `/dashboard/overview` - Accessible in all workspaces
- [x] `/dashboard/profile` - Accessible in all workspaces
- [x] `/dashboard/messages` - Accessible in Personal AND Team workspaces
- [x] `/dashboard/contracts` - Accessible in Personal AND Team workspaces
- [x] `/dashboard/calendar` - Accessible in Personal AND Team workspaces

---

## HOW TO TEST

### Manual Testing Steps:

1. **Login as Professional User:**
   - Go to `/dashboard`
   - Verify Personal workspace is selected
   - Check sidebar items (Scenario 1)
   - Try accessing routes directly (Scenario 7)

2. **Switch to Facility Workspace:**
   - Click workspace selector
   - Select a facility workspace
   - Verify sidebar updates (Scenario 3)
   - Check routes are enforced (Scenario 2, 7)

3. **Switch Back to Personal:**
   - Click workspace selector
   - Select "Personal Workspace"
   - Verify sidebar updates (Scenario 4)
   - Check routes work correctly

4. **Test Onboarding Flow:**
   - Create new professional account
   - Go through onboarding to "team" access level
   - Verify marketplace is accessible (Scenario 5)
   - Complete onboarding, verify "full" access unlocks everything

5. **Test Facility Onboarding:**
   - Create new facility account
   - Go through onboarding to "team" access level
   - Verify organization is accessible (Scenario 6)
   - Verify marketplace is not accessible

### Automated Testing (Unit Tests):

```javascript
// Test useTutorialRules.js
describe('useTutorialRules - isSidebarItemAccessible', () => {
  it('should allow marketplace in personal workspace with team access', () => {
    const result = isSidebarItemAccessible('/dashboard/marketplace');
    // With: access='team', selectedWorkspace.type='personal'
    expect(result).toBe(true); // ← FIXED
  });

  it('should block marketplace in facility workspace with team access', () => {
    const result = isSidebarItemAccessible('/dashboard/marketplace');
    // With: access='team', selectedWorkspace.type='team'
    expect(result).toBe(false); // ← FIXED
  });

  it('should allow organization in facility workspace with team access', () => {
    const result = isSidebarItemAccessible('/dashboard/organization');
    // With: access='team', selectedWorkspace.type='team'
    expect(result).toBe(true);
  });

  it('should block organization in personal workspace with team access', () => {
    const result = isSidebarItemAccessible('/dashboard/organization');
    // With: access='team', selectedWorkspace.type='personal'
    expect(result).toBe(false); // ← FIXED
  });
});

// Test canAccessRoute from routes.js
describe('canAccessRoute', () => {
  it('should allow marketplace only in personal workspace', () => {
    const marketplaceRoute = { access: ACCESS_TYPES.PERSONAL };
    expect(canAccessRoute(marketplaceRoute, WORKSPACE_TYPES.PERSONAL)).toBe(true);
    expect(canAccessRoute(marketplaceRoute, WORKSPACE_TYPES.TEAM)).toBe(false);
  });

  it('should allow organization only in team workspace', () => {
    const orgRoute = { access: ACCESS_TYPES.FACILITY };
    expect(canAccessRoute(orgRoute, WORKSPACE_TYPES.TEAM)).toBe(true);
    expect(canAccessRoute(orgRoute, WORKSPACE_TYPES.PERSONAL)).toBe(false);
  });
});
```

---

## REGRESSION TESTING

Ensure existing functionality still works:

✅ **Messages, Contracts, Calendar:**
- [x] Still accessible in both Personal and Team workspaces
- [x] No changes to their access rules

✅ **Profile:**
- [x] Still accessible in all workspace types
- [x] No changes to profile access

✅ **Admin Workspace:**
- [x] Admin routes still work correctly
- [x] Admin navigation unchanged

✅ **Workspace Switching:**
- [x] Still preserves user's navigation path where possible
- [x] Redirects correctly when route not available in new workspace

---

## EDGE CASES

### Edge Case 1: User with No Workspace Access
**Setup:** User with no professionalProfile and no facilityMemberships
**Expected:** Redirect to onboarding

### Edge Case 2: Facility Profile Not Found
**Setup:** User tries to access team workspace but facility document doesn't exist
**Expected:** Show "Facility Not Found" dialog, offer to leave facility

### Edge Case 3: Offline Mode
**Setup:** User switches workspace while offline
**Expected:** Session validation skipped, workspace switch proceeds with local data

### Edge Case 4: Deep Link with Wrong Workspace
**Setup:** User receives link to `/dashboard/marketplace?workspace=facilityId`
**Expected:** Redirect to overview or switch to personal workspace

---

## SUCCESS CRITERIA

✅ All scenarios pass
✅ No console errors related to routing
✅ Sidebar always reflects correct available tabs
✅ Routes enforce access control at all three layers (routing, sidebar, tutorial)
✅ Workspace switching updates available tabs immediately
✅ Deep links work correctly
✅ Onboarding flow not disrupted

