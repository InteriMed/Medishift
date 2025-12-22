# Workspace Selection and Role Separation Analysis

## 1. Problem Description
**User Report:**
- Issues with workspace selector after login are persisting.
- The selector exhibits "blinking" behavior, switching between Professional and Facility states or showing "Select Workspace".
- There is ambiguity in which workspace is active when a user holds multiple roles (e.g., a User account linked to both a Facility account and a Professional account).

**Objective:**
- Review the current system.
- Create a Root Cause Analysis (RCA).
- Define Corrective and Preventive Actions (CAPA).
- Clarify role separation requirements:
    - Professional Profile.
    - Facility Profile with administrative rights.
    - Dual access (Professional accessing Facility, or Vice Versa).

## 2. Root Cause Analysis (RCA)

### 2.1. Logic Flaw in `getAvailableWorkspaces` (Critical Bug)
- **Observation:** In `frontend/src/utils/sessionAuth.js`, the function `getAvailableWorkspaces` constructs the list of available workspaces.
- **The Bug:** It attempts to add a default "Facility Workspace" for facility users, but **only if the workspace list is empty**.
  ```javascript
  // src/utils/sessionAuth.js
  if ((userData.role === 'facility' || userData.role === 'company') && workspaces.length === 0) {
      // Add Facility Workspace
  }
  ```
- **The Conflict:** Prior to this check, the function checks `hasProfessionalAccess`. Currently, `hasProfessionalAccess` returns `true` for users with the `facility` role.
  ```javascript
  // src/utils/sessionAuth.js
  const hasProfessionalAccess = (userData) => {
    if (userData.role === 'professional' || userData.role === 'facility' || ...) return true;
  }
  ```
- **Result:**
  1. A `facility` user is granted a "Personal Workspace" first.
  2. The `workspaces` array now has length 1.
  3. The fallback block to add "Facility Workspace" is **skipped** because `workspaces.length !== 0`.
  4. **Impact:** A facility owner sees *only* a "Personal Workspace" unless they have explicit `facilityMemberships` entries. This forces the UI to default to Professional, causing confusion and incorrect context.

### 2.2. Ambiguous Role Definitions
- **Observation:** The system conflates "Account Role" (e.g., `facility`) with "Profile Access". Grouping `facility` users under `hasProfessionalAccess` implies every facility admin is also a practicing professional with a personal workspace, which may not be true.
- **Impact:** Leads to clutter in the workspace selector and defaults the user to an irrelevant workspace.

### 2.3. Default Selection & Race Conditions
- **Observation:** `DashboardContext` defaults to the first available workspace (`workspaces[0]`) if no valid session cookie is found.
- **Impact:** Since "Personal Workspace" is always added first, the system aggressively defaults to it. If the user intends to manage their facility, they are constantly fighting this default. The "blink" occurs when the system renders the default (Professional) before potentially validating a session or if the session validation fails/resets.

## 3. Corrective and Preventive Actions (CAPA)

### 3.1. Corrective Actions (Immediate Implementation)
1.  **Refine `hasProfessionalAccess`**: Update `sessionAuth.js` to strictly separate roles. A `facility` role should *not* automatically imply `professional` access unless explicitly specified (e.g., via a dual-role flag or separate `isProfessional` boolean). *For now, we will ensure it doesn't block Facility Workspace creation.*
2.  **Fix `getAvailableWorkspaces` Logic**: Remove the `&& workspaces.length === 0` constraint when adding the Facility Workspace. If a user is a `facility` admin, they **must** have their Facility Workspace available, regardless of whether they also have a Personal Workspace.
3.  **Reorder Workspace Priority**: In `getAvailableWorkspaces`, if the user's primary role is `facility`, push the "Facility Workspace" to the list/top *before* or alongside the Personal Workspace, or ensure `DashboardContext` prioritizes it.

### 3.2. Preventive Actions (Long-term)
1.  **Explicit Profile Management**: Transition from checking `role` strings to checking existence of profile documents (`professionalProfiles/{uid}`, `facilityProfiles/{uid}`). This is more robust than relying on the `users/{uid}.role` field.
2.  **Session Persistence**: Enhance cookie logic to robustly remember the *last active workspace* across logins, minimizing reliance on default fallback logic.

## 4. Proposed Solution for Role Separation
To satisfy the user requirement: *"You can be a professional and have access to the facility profile..."*

**New Logic:**
1.  **Personal Workspace**: Available if `role === 'professional'` OR `userData.hasProfessionalProfile === true`.
2.  **Facility Workspace (Team)**: Available if `role === 'facility'` (Owner) OR `userData.facilityMemberships` includes the facility.
3.  **Selector Behavior**:
    - Display ALL available workspaces.
    - Do NOT mutually exclude them.
    - Default to the workspace matching the `role` field (Primary context), but verify cookie for last choice.

## 5. Next Steps
I will proceed to patch `frontend/src/utils/sessionAuth.js` to fix the critical bug in `getAvailableWorkspaces`, ensuring Facility users always see their Facility Workspace.
