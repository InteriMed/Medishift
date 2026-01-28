# ENTITY SECTION REFACTORING PLAN
## Comprehensive Analysis & Action Plan

---

## 📋 **EXECUTIVE SUMMARY**

The entity section (`src/dashboard/pages/entity`) requires refactoring to use the action catalog as the single source of truth. This is **more complex** than the calendar refactoring because:

1. **Multiple modules** are involved (employees, contracts, admin, organigram, float pool, hiring, agency spend)
2. **Some actions don't exist yet** in the action catalog
3. **Complex permission systems** need to be mapped to action permissions
4. **Firebase Functions** are being called directly in some places
5. **Nested data structures** (facility employees, organization hierarchy)

---

## 🔍 **CURRENT STATE ANALYSIS**

### Files with Direct Firebase Calls

**Component Files Using Firebase SDK**:
1. ✅ `components/teamEmployees.js` - Employee management (lines 13-14, 93-165)
2. ✅ `components/adminManagementSystem.js` - Admin/role management (lines 3-4, 79-300+)
3. ✅ `components/teamOrganigramView.js` - Organization chart (likely has Firebase calls)
4. ✅ `modals/publicEmployeeProfileModal.js` - Employee profile (likely has Firebase calls)

**Direct Firebase Operations Found**:
- `collection()`, `query()`, `where()`, `getDocs()` - List queries
- `doc()`, `getDoc()` - Single document reads
- `updateDoc()`, `serverTimestamp()` - Updates
- Manual employee invitation (lines 79-165 in teamEmployees.js)
- Manual admin management (lines 79-300+ in adminManagementSystem.js)
- Role/permission management (manual Firestore updates)

---

## 📊 **ACTION CATALOG COVERAGE**

### ✅ **Actions That EXIST** (Can Use Immediately)

#### Team/Employee Management
- `team.invite_user` - Invite employee to facility
- `team.directory.list_employees` - List all employees
- `team.directory.get_profile_full` - Get employee details
- `team.directory.assign_secondary_facility` - Assign to multiple facilities
- `team.lifecycle.terminate_user` - Remove employee
- `team.lifecycle.reactivate_user` - Reactivate employee
- `team.skills.add_skill` - Add skills to employee
- `team.skills.search_by_skill` - Search employees by skill

#### Contracts
- `contracts.generate_draft` - Generate contract draft
- `contracts.send_for_signature` - Send for e-signature
- `contracts.sign_digital` - Sign contract digitally
- `contracts.create_amendment` - Create contract amendment
- `contracts.terminate_employment` - Terminate employment contract

#### Facility/Profile
- `profile.facility.get_data` - Get facility data (already created)
- `profile.facility.get_team_members` - Get team members (already created)
- `profile.facility.update_settings` - Update facility settings
- `profile.facility.update_config` - Update facility config
- `profile.facility.manage_whitelist` - IP/geofencing whitelist

#### Organization
- `org.get_hierarchy` - Get organization hierarchy
- `org.update_branding` - Update branding
- `org.manage_subscription` - Manage subscription
- `org.configure_sso` - Configure SSO

### ❌ **Actions That DON'T EXIST** (Need to Create)

#### Employee Management (Missing)
- `team.employee.add_to_facility` - Add existing user as employee
- `team.employee.update_role` - Update employee role/rights
- `team.employee.remove_from_facility` - Remove from facility
- `team.employee.update_status` - Change employee status
- `team.employee.bulk_import` - Import multiple employees

#### Admin/Role Management (Missing)
- `facility.admin.add_admin` - Add facility admin
- `facility.admin.remove_admin` - Remove facility admin
- `facility.admin.list_admins` - List all admins
- `facility.roles.create_role` - Create custom role
- `facility.roles.update_role` - Update role permissions
- `facility.roles.delete_role` - Delete custom role
- `facility.roles.assign_role` - Assign role to employee
- `org.admin.manage_org_admin` - Manage organization admins

#### Contract Management (Missing)
- `contracts.list_contracts` - List contracts with filters
- `contracts.get_contract_details` - Get single contract
- `contracts.update_contract` - Update contract details
- `contracts.archive_contract` - Archive old contracts
- `contracts.export_contracts` - Export contracts data

#### Float Pool (Missing)
- `pool.list_pool_members` - List float pool members
- `pool.add_to_pool` - Add member to float pool
- `pool.remove_from_pool` - Remove from pool
- `pool.request_coverage` - Request coverage from pool (exists in `organization/pool/`)
- `pool.dispatch_staff` - Dispatch staff (exists in `organization/pool/`)

#### Organigram (Missing)
- `org.organigram.get_structure` - Get org chart structure
- `org.organigram.update_structure` - Update org structure
- `org.organigram.add_position` - Add position to org chart
- `org.organigram.remove_position` - Remove position

#### Hiring (Missing)
- `hiring.list_positions` - List open positions
- `hiring.create_position` - Create hiring position
- `hiring.update_position` - Update position details
- `hiring.close_position` - Close position
- Note: Recruitment actions exist, but specific to ATS module

#### Agency Spend (Missing)
- `analytics.agency_spend.get_data` - Get agency spend analytics
- `analytics.agency_spend.compare_periods` - Compare spend periods
- `analytics.agency_spend.export_report` - Export spend report

---

## 🎯 **REFACTORING STRATEGY**

### Phase 1: CREATE MISSING ACTIONS (Priority Order)

#### **A. Employee Management Actions** (HIGH PRIORITY)
**Location**: `src/services/actions/catalog/team/employees/`

**Create these actions**:
1. `addEmployeeToFacility.ts` - Replace manual employee addition
2. `updateEmployeeRole.ts` - Replace manual role updates
3. `removeEmployeeFromFacility.ts` - Replace manual removal
4. `updateEmployeeStatus.ts` - Update employee status
5. `searchEmployees.ts` - Enhanced employee search

**Usage**: Replace lines 79-165 in `teamEmployees.js`

---

#### **B. Admin & Role Management Actions** (HIGH PRIORITY)
**Location**: `src/services/actions/catalog/team/admin/`

**Create these actions**:
1. `addFacilityAdmin.ts` - Add admin to facility
2. `removeFacilityAdmin.ts` - Remove admin
3. `listFacilityAdmins.ts` - List all admins
4. `createCustomRole.ts` - Create custom role (already partially exists in `facility.update_settings`)
5. `updateRolePermissions.ts` - Update role permissions
6. `deleteCustomRole.ts` - Delete role
7. `assignRoleToEmployee.ts` - Assign role to employee

**Usage**: Replace lines 79-300+ in `adminManagementSystem.js`

---

#### **C. Contract Management Actions** (MEDIUM PRIORITY)
**Location**: `src/services/actions/catalog/contracts/`

**Create these actions**:
1. `listContracts.ts` - List all contracts with filtering
2. `getContractDetails.ts` - Get single contract
3. `updateContractDetails.ts` - Update contract
4. `archiveContract.ts` - Archive contract

**Note**: Contract creation/signing actions already exist

**Usage**: Replace data fetching in `contracts.js` and `useContractsData` hook

---

#### **D. Organigram Actions** (LOW PRIORITY)
**Location**: `src/services/actions/catalog/org/organigram/`

**Create these actions**:
1. `getOrgStructure.ts` - Get organization chart
2. `updateOrgStructure.ts` - Update structure
3. `addPosition.ts` - Add position to chart
4. `removePosition.ts` - Remove position

**Usage**: `teamOrganigramView.js`, `teamOrganigramGraphBuilder.js`

---

#### **E. Float Pool Actions** (LOW PRIORITY)
**Location**: `src/services/actions/catalog/pool/` OR use existing `organization/pool/`

**Actions needed**:
1. `listPoolMembers.ts` - List all pool members
2. `addToPool.ts` - Add to float pool
3. `removeFromPool.ts` - Remove from pool

**Note**: Some pool actions already exist in `organization/pool/` - evaluate if they can be reused

**Usage**: `floatPoolManager.js`

---

#### **F. Hiring Actions** (LOW PRIORITY)
**Location**: `src/services/actions/catalog/hiring/` OR use `recruitment/`

**Actions needed**:
1. `listHiringPositions.ts` - List open positions
2. `createPosition.ts` - Create position
3. `updatePosition.ts` - Update position
4. `closePosition.ts` - Close position

**Note**: Evaluate if `recruitment` module actions can be reused

**Usage**: `teamHiring.js`

---

#### **G. Agency Spend Analytics** (LOW PRIORITY)
**Location**: `src/services/actions/catalog/analytics/spend/`

**Actions needed**:
1. `getAgencySpend.ts` - Get spend data
2. `compareSpendPeriods.ts` - Compare periods
3. `exportSpendReport.ts` - Export report

**Usage**: `agencySpendDashboard.js`

---

### Phase 2: UPDATE FRONTEND COMPONENTS

#### **Step 1: Update teamEmployees.js**
**File**: `components/teamEmployees.js`

**Changes**:
```javascript
// ❌ OLD - Remove
import { collection, query, where, getDocs, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../services/firebase';

const userQuery = query(
  collection(db, FIRESTORE_COLLECTIONS.USERS),
  where('email', '==', inviteData.email.trim().toLowerCase())
);
const userSnapshot = await getDocs(userQuery);

// ✅ NEW - Add
import { useAction } from '../../../../services/actions/hook';

const { execute } = useAction();
const result = await execute('team.employee.add_to_facility', {
  email: inviteData.email,
  facilityId: inviteData.facilityId,
  role: inviteData.role
});
```

**Lines to refactor**: 13-14, 79-165

---

#### **Step 2: Update adminManagementSystem.js**
**File**: `components/adminManagementSystem.js`

**Changes**:
```javascript
// ❌ OLD - Remove all Firebase imports
import { doc, getDoc, updateDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../services/firebase';

// ✅ NEW - Add
import { useAction } from '../../../../services/actions/hook';

// Replace all admin operations
await execute('team.admin.add_facility_admin', { userId, facilityId });
await execute('team.admin.remove_facility_admin', { userId, facilityId });
await execute('facility.roles.create_role', { name, permissions });
await execute('facility.roles.update_role', { roleId, permissions });
```

**Lines to refactor**: 3-4, 79-300+

---

#### **Step 3: Update contracts.js**
**File**: `components/contracts.js`

**Changes**:
```javascript
// ❌ OLD - Remove
import { createContract } from '../../../services/cloudFunctions';

// ✅ NEW - Add
import { useAction } from '../../../../services/actions/hook';

// Replace contract operations
await execute('contracts.list_contracts', { status, facilityId });
await execute('contracts.get_contract_details', { contractId });
await execute('contracts.generate_draft', { parties, terms });
```

**Lines to refactor**: 18 (createContract import), data fetching logic

---

#### **Step 4: Update teamOrganigramView.js**
**File**: `components/teamOrganigramView.js`

**Changes**:
```javascript
// ✅ NEW - Use action catalog
const orgData = await execute('org.organigram.get_structure', { facilityId });
```

---

#### **Step 5: Update publicEmployeeProfileModal.js**
**File**: `modals/publicEmployeeProfileModal.js`

**Changes**:
```javascript
// ✅ NEW - Use existing action
const employee = await execute('team.directory.get_profile_full', { userId });
```

---

#### **Step 6: Update floatPoolManager.js**
**File**: `components/floatPoolManager.js`

**Changes**:
```javascript
// ✅ NEW - Use pool actions
const poolMembers = await execute('pool.list_pool_members', { facilityId });
await execute('pool.add_to_pool', { userId, facilityId });
```

---

#### **Step 7: Update teamHiring.js**
**File**: `components/teamHiring.js`

**Changes**:
```javascript
// ✅ NEW - Use hiring actions OR recruitment actions
const positions = await execute('hiring.list_positions', { facilityId });
// OR reuse recruitment module
const positions = await execute('recruitment.list_jobs', { facilityId });
```

---

#### **Step 8: Update agencySpendDashboard.js**
**File**: `components/agencySpendDashboard.js`

**Changes**:
```javascript
// ✅ NEW - Use analytics actions
const spendData = await execute('analytics.agency_spend.get_data', { 
  facilityId, 
  startDate, 
  endDate 
});
```

---

### Phase 3: UPDATE HOOKS

#### **Update useEmployeesData Hook**
**Location**: `src/dashboard/hooks/useEmployeesData.js` (if exists)

**Changes**:
- Replace Firebase listeners with action catalog calls
- Use `team.directory.list_employees` action
- Implement polling or event-driven updates

---

#### **Update useContractsData Hook**
**Location**: `src/dashboard/hooks/useContractsData.js`

**Changes**:
- Replace Firebase listeners with `contracts.list_contracts`
- Implement filtering logic
- Add real-time update polling

---

### Phase 4: REGISTER NEW ACTIONS

**File**: `src/services/actions/registry.ts`

Add all new actions:
```typescript
// Employee actions
import { addEmployeeToFacilityAction } from "./catalog/team/employees/addEmployeeToFacility";
import { updateEmployeeRoleAction } from "./catalog/team/employees/updateEmployeeRole";
// ... etc

// Admin actions
import { addFacilityAdminAction } from "./catalog/team/admin/addFacilityAdmin";
// ... etc

// Contract actions
import { listContractsAction } from "./catalog/contracts/listContracts";
// ... etc

export const ActionRegistry = {
  // ... existing actions
  [addEmployeeToFacilityAction.id]: addEmployeeToFacilityAction,
  [updateEmployeeRoleAction.id]: updateEmployeeRoleAction,
  // ... add all new actions
} as const;
```

---

## 🚨 **SPECIAL CONSIDERATIONS**

### 1. **Complex Permission System**
**Challenge**: Admin management has complex permission hierarchies

**Solution**:
- Map existing permission structure to action catalog permissions
- Create granular permissions: `team.manage_employees`, `team.manage_admins`, `facility.manage_roles`
- Use permission inheritance (org admin → facility admin → employee)

### 2. **Organization Hierarchy**
**Challenge**: Multi-facility organizations with nested structures

**Solution**:
- Use `org.get_hierarchy` action to fetch tree structure
- Implement facility access control in actions
- Handle organization-level vs facility-level permissions

### 3. **Firebase Functions Still Needed**
**Note**: Some operations might still call Firebase Functions (like `inviteUser`) but through action catalog

**Approach**:
- Action catalog wraps Firebase Function calls
- Adds permission checking, audit logging, schema validation
- Frontend only calls action catalog, never Firebase Functions directly

### 4. **Organigram Visualization**
**Challenge**: Complex graph visualization with custom rendering

**Solution**:
- Keep visualization logic in frontend
- Only data fetching goes through action catalog
- `org.organigram.get_structure` returns data in format needed by visualization

### 5. **Float Pool Cross-Facility Logic**
**Challenge**: Float pool members can work across facilities

**Solution**:
- Use existing `organization/pool/` actions if they fit
- Or create specialized `pool/` actions for facility-level float pools
- Handle both organization-level and facility-level pools

---

## 📈 **EFFORT ESTIMATION**

| Phase | Actions to Create | Files to Modify | Estimated Effort | Priority |
|-------|-------------------|-----------------|------------------|----------|
| **Phase 1A** | 5 actions (Employee) | - | 4-6 hours | HIGH |
| **Phase 1B** | 7 actions (Admin/Role) | - | 6-8 hours | HIGH |
| **Phase 1C** | 4 actions (Contracts) | - | 3-4 hours | MEDIUM |
| **Phase 1D** | 4 actions (Organigram) | - | 3-4 hours | LOW |
| **Phase 1E** | 3 actions (Float Pool) | - | 2-3 hours | LOW |
| **Phase 1F** | 4 actions (Hiring) | - | 3-4 hours | LOW |
| **Phase 1G** | 3 actions (Agency Spend) | - | 2-3 hours | LOW |
| **Phase 2** | - | 8 components | 6-8 hours | HIGH |
| **Phase 3** | - | 2 hooks | 2-3 hours | HIGH |
| **Phase 4** | - | 1 registry | 1 hour | HIGH |

**Total Estimated Effort**: 32-46 hours

**Recommended Approach**: Do HIGH priority phases first (1A, 1B, 2, 3, 4), then iterate on MEDIUM/LOW

---

## ✅ **SUCCESS CRITERIA**

After refactoring, the entity section should have:

1. ✅ **Zero direct Firebase SDK imports** in components
2. ✅ **All database operations** go through action catalog
3. ✅ **30+ entity-related actions** registered
4. ✅ **Automatic permission checking** on all operations
5. ✅ **Audit logging** for all sensitive operations
6. ✅ **Type safety** with Zod schemas
7. ✅ **Single source of truth** for entity management
8. ✅ **Consistent error handling** across all operations

---

## 🎯 **QUICK START IMPLEMENTATION ORDER**

### **Week 1: Core Employee Management**
1. Create employee actions (1A)
2. Update teamEmployees.js (2.1)
3. Update useEmployeesData hook (3.1)
4. Register actions (4)

### **Week 2: Admin & Role Management**
1. Create admin/role actions (1B)
2. Update adminManagementSystem.js (2.2)
3. Test admin operations

### **Week 3: Contracts & Polish**
1. Create contract actions (1C)
2. Update contracts.js (2.3)
3. Update useContractsData hook (3.2)
4. Test end-to-end flows

### **Week 4+: Optional Enhancements**
1. Organigram actions (1D)
2. Float pool actions (1E)
3. Hiring actions (1F)
4. Agency spend actions (1G)

---

## 📝 **NOTES FOR IMPLEMENTATION**

### Existing Actions to Leverage
- `team.invite_user` - Already handles employee onboarding
- `team.directory.list_employees` - Can replace manual queries
- `profile.facility.get_team_members` - Already created for calendar
- Contract actions - Most contract lifecycle already exists

### Action Catalog Advantages
Once implemented:
- Frontend, chat, and AI can all manage entities
- Consistent permission enforcement
- Complete audit trail
- Type-safe operations
- Easier testing (test actions, not components)

### Migration Strategy
- **Incremental**: Migrate one component at a time
- **Backward compatible**: Keep old code until action is tested
- **Feature flags**: Use flags to toggle between old/new implementations
- **Parallel testing**: Run both systems in parallel initially

---

## 🔚 **CONCLUSION**

The entity section refactoring is more complex than calendar but follows the same principles:

1. **Identify all Firebase operations**
2. **Create corresponding actions** in action catalog
3. **Replace direct calls** with `useAction()` hook
4. **Register actions** in registry
5. **Test thoroughly**

**Key Difference**: Many actions don't exist yet, so Phase 1 (creating actions) is the bulk of the work.

**Estimated Total**: **~40 hours** for complete refactoring

**Recommended**: Start with HIGH priority items (employee & admin management) and iterate from there.

