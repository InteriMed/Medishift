# Action Catalog - Complete Implementation State

**Last Updated**: January 2026  
**Total Actions Registered**: 94  
**Action Files Found**: 168+  
**Architecture**: Client-side execution with Firebase Client SDK

---

## Executive Summary

The Action Catalog is a centralized registry of all business operations, designed for:
- ✅ Type-safe execution via `useAction()` React hook
- ✅ Automatic permission checking
- ✅ Built-in audit logging
- ✅ AI-compatible (MCP tools via Zod schemas)
- ✅ Centralized business logic

**Current State**: Client-side execution model with **partial registration**. Many action files exist but are not registered in the central registry.

---

## Architecture

### Execution Model
- **Location**: Client-side (browser)
- **SDK**: Firebase Client SDK (not Admin SDK)
- **Context**: Built from Firebase auth state via `useSmartAuth()`
- **Security**: Firebase security rules + client-side permission checks

### Key Files
- **Registry**: `src/services/actions/registry.ts` (94 registered actions)
- **Hook**: `src/services/actions/hook.ts` (`useAction()` React hook)
- **Types**: `src/services/actions/types.ts` (ActionContext, ActionDefinition)
- **Middleware**: `src/services/actions/middleware/buildActionContext.ts`

---

## Complete Action Inventory

### 1. COMMUNICATION (17 actions)

**Registered (17/17)**:
- `thread.create` - Create message/announcement/policy thread
- `thread.reply` - Reply to thread
- `thread.fetch` - Get thread details
- `thread.list` - List threads with filters
- `thread.mark_read` - Mark as read
- `thread.mark_acknowledge` - Acknowledge message
- `thread.get_stats` - Get communication statistics
- `thread.archive` - Archive thread
- `thread.flag_priority` - Set priority level
- `thread.compile_text` - Compile thread to text
- `thread.compile_url_map` - Generate URL map
- `thread.pin` - Pin thread
- `announcement.get_poll_results` - Get poll results
- `announcement.vote_poll` - Vote in poll
- `reporting.reveal_identity` - Reveal anonymous reporter
- `reporting.add_private_note` - Add HR note
- `thread.rag_query` - RAG search through threads

**Files**: `catalog/communication/*.ts`

---

### 2. PROFILE MANAGEMENT (15 actions)

#### Me Profile (6/6)
- `profile.get_me` - Get current user profile
- `profile.update_me` - Update profile
- `profile.set_preferences` - Update preferences
- `profile.upload_avatar` - Upload profile photo
- `profile.leave_facility` - Leave facility
- `profile.get_facility_memberships` - List facility memberships

#### Facility Profile (5/5)
- `facility.update_settings` - Update facility settings
- `facility.update_config` - Update facility configuration
- `facility.manage_whitelist` - Manage IP whitelist
- `facility.get_facility_data` - Get facility data
- `facility.get_team_members` - Get team members

#### Organization Profile (4/4)
- `org.update_branding` - Update white-label branding
- `org.manage_subscription` - Manage subscription
- `org.configure_sso` - Configure SSO
- `org.get_hierarchy` - Get organization hierarchy

**Files**: `catalog/profile/**/*.ts`

---

### 3. MARKETPLACE (12 actions)

#### Facility Side (4/4)
- `marketplace.post_mission` - Post mission/shift
- `marketplace.search_talent` - Search talent pool
- `marketplace.invite_talent` - Invite professional
- `marketplace.hire_candidate` - Hire candidate

#### Professional Side (5/5)
- `marketplace.browse_missions` - Browse missions
- `marketplace.apply` - Apply to mission
- `marketplace.negotiate` - Negotiate offer
- `marketplace.set_alert` - Set job alerts
- `marketplace.toggle_open_to_work` - Toggle availability

#### Transaction (3/3)
- `marketplace.validate_timesheet` - Validate timesheet
- `marketplace.rate` - Rate party after mission
- `finance.simulate_income` - Simulate mission income

**Files**: `catalog/marketplace/**/*.ts`

---

### 4. RECRUITMENT / ATS (8 actions)

**Registered (8/8)**:
- `recruitment.create_job` - Create job posting
- `recruitment.archive_job` - Archive job
- `recruitment.apply` - Submit application
- `recruitment.parse_cv` - AI CV parsing
- `recruitment.compare_applicants` - Side-by-side comparison
- `recruitment.score_questions` - AI scoring of open questions
- `recruitment.schedule_interview` - Schedule interview
- `recruitment.log_interview_feedback` - Log feedback

**Files**: `catalog/recruitment/**/*.ts`

---

### 5. CALENDAR / SCHEDULING (22 actions)

#### Planning (5/5)
- `calendar.create_shift` - Create shift
- `calendar.update_shift` - Update shift
- `calendar.delete_shift` - Delete shift
- `calendar.publish_roster` - Publish schedule
- `calendar.apply_pattern` - Apply scheduling pattern

#### Requests (4/4)
- `calendar.request_leave` - Request time off
- `calendar.set_availability` - Set availability
- `calendar.post_swap_request` - Request shift swap
- `calendar.accept_swap` - Accept swap request

#### Engine (4/4)
- `calendar.validate_move` - Validate shift move
- `calendar.get_coverage_status` - Check coverage
- `calendar.resolve_gap` - Resolve staffing gap
- `calendar.assign_floater` - Assign floating staff

#### Export (2/2)
- `calendar.export_ical_link` - Generate iCal link
- `calendar.export_timesheet` - Export timesheet

#### Events (5/5)
- `calendar.create_event` - Create event
- `calendar.update_event` - Update event
- `calendar.delete_event` - Delete event
- `calendar.list_events` - List events
- `calendar.create_recurring_events` - Create recurring events

**Files**: `catalog/calendar/**/*.ts`

---

### 6. TEAM MANAGEMENT (16 actions)

#### Directory (6/6)
- `team.list_employees` - List employees
- `team.get_profile_full` - Get full profile
- `team.assign_secondary_facility` - Assign secondary facility
- `team.add_employee_to_facility` - Add employee
- `team.update_employee_role` - Update employee role
- `team.remove_employee_from_facility` - Remove employee

#### Lifecycle (3/3)
- `team.invite_user` - Invite new user
- `team.terminate_user` - Terminate employment
- `team.reactivate_user` - Reactivate user

#### Roles (4/4)
- `team.create_role` - Create custom role
- `team.update_role` - Update role
- `team.delete_role` - Delete role
- `team.list_roles` - List roles

#### Skills (2 files, NOT registered)
- `addSkill.ts`
- `searchBySkill.ts`

#### Compliance (3 files, NOT registered)
- `manageCertification.ts`
- `updateContractTerms.ts`
- `verifyIdentity.ts`

#### Finance (2 files, NOT registered)
- `downloadPayslip.ts`
- `updateIban.ts`

**Files**: `catalog/team/**/*.ts`

---

### 7. CONTRACTS (8 actions)

**Registered (8/8)**:
- `contracts.generate_draft` - Generate contract draft
- `contracts.send_for_signature` - Send for signature
- `contracts.sign_digital` - Digital signature
- `contracts.create_amendment` - Create amendment
- `contracts.terminate_employment` - Terminate contract
- `contracts.create_contract` - Create contract
- `contracts.list_contracts` - List contracts
- `contracts.get_contract` - Get contract

**Files**: `catalog/contracts/*.ts`

---

### 8. PAYROLL (8 files, NONE registered ❌)

**Files Found (8)**:
- `calculatePeriodVariables.ts`
- `addManualEntry.ts`
- `lockPeriod.ts`
- `approveGlobal.ts`
- `exportData.ts`
- `uploadPayslipBundle.ts`
- `publishPayslips.ts`
- `lockValidator.ts`

**Status**: ❌ **NOT REGISTERED** - Actions exist but not in registry

---

### 9. TIME TRACKING (10 files, NONE registered ❌)

#### Clock (4 files)
- `clockIn.ts`
- `clockOut.ts`
- `recordBreak.ts`
- `approveCorrection.ts`

#### Bank (3 files)
- `getBalances.ts`
- `compensateOvertime.ts`
- `requestTimeOff.ts`

#### Piquet (1 file)
- `declarePiquetIntervention.ts`

#### Audit (2 files)
- `generateSecoReport.ts`
- `exportAuditLog.ts`

**Status**: ❌ **NOT REGISTERED**

---

### 10. ORGANIZATION (11 files, NONE registered ❌)

#### Pool (4 files)
- `enrollMember.ts`
- `requestCoverage.ts`
- `searchNetworkAvailability.ts`
- `dispatchStaff.ts`

#### Finance (2 files)
- `generateCrossChargeReport.ts`
- `setTransferPricing.ts`

#### Governance (3 files)
- `broadcastPolicy.ts`
- `standardizeRoles.ts`
- `auditComplianceScore.ts`

#### Analytics (2 files)
- `compareEfficiency.ts`
- `predictNetworkLoad.ts`

**Status**: ❌ **NOT REGISTERED**

---

### 11. EDUCATION (3 files, NONE registered ❌)

**Files Found**:
- `logFphCredits.ts` - Log FPH continuing education credits
- `checkComplianceStatus.ts` - Check FPH compliance
- `manageApprenticeship.ts` - Manage CFC apprenticeship

**Status**: ❌ **NOT REGISTERED**

---

### 12. RISK MANAGEMENT (3 files, NONE registered ❌)

**Files Found**:
- `blockUser.ts` - Block user from platform
- `reportIncident.ts` - Report CIRS incident
- `triggerCrisisAlert.ts` - Trigger crisis mode

**Status**: ❌ **NOT REGISTERED**

---

### 13. SUPPORT (5 files, NONE registered ❌)

**Files Found**:
- `askAgent.ts` - AI support agent (RAG)
- `createTicketWithCapa.ts` - Create support ticket with CAPA
- `manageCapaWorkflow.ts` - Manage CAPA workflow
- `analyzeTrends.ts` - Analyze support trends
- `logAiFeedback.ts` - Log AI feedback

**Status**: ❌ **NOT REGISTERED**

---

### 14. ADMIN (4 files, NONE registered ❌)

**Files Found**:
- `provisionTenant.ts` - Provision new tenant
- `manageBilling.ts` - Manage billing
- `impersonateUser.ts` - God mode impersonation
- `broadcastSystemAlert.ts` - Broadcast system alert

**Status**: ❌ **NOT REGISTERED**

---

### 15. FIDUCIARY (3 files, NONE registered ❌)

**Files Found**:
- `getClientDashboard.ts` - Get multi-tenant dashboard
- `bulkExport.ts` - Bulk export payroll data
- `flagDiscrepancy.ts` - Flag payroll discrepancy

**Status**: ❌ **NOT REGISTERED**

---

### 16. AI / DOCUMENT PROCESSING (4 files, NONE registered ❌)

**Files Found**:
- `parseDocument.ts` - AI document parsing
- `verifyDocument.ts` - Verify document authenticity
- `extractText.ts` - OCR text extraction
- `index.ts`

**Status**: ❌ **NOT REGISTERED**

---

### 17. VERIFICATION (3 files, NONE registered ❌)

**Files Found**:
- `verifyGLN.ts` - Verify GLN number (Swiss health registry)
- `verifyUID.ts` - Verify UID number (Swiss business registry)
- `index.ts`

**Status**: ❌ **NOT REGISTERED**

---

### 18. WORKSPACE (3 files, NONE registered ❌)

**Files Found**:
- `switchWorkspace.ts` - Switch workspace (client-side stub)
- `checkWorkspaces.ts` - Check available workspaces
- `index.ts`

**Status**: ⚠️ **Backend implementation exists** (`functions/api/workspaceAccess.js`) but client-side stubs not registered

---

## Registration Status Summary

| Category | Files Found | Registered | % Complete |
|----------|-------------|------------|------------|
| Communication | 17 | 17 | 100% ✅ |
| Profile | 15 | 15 | 100% ✅ |
| Marketplace | 12 | 12 | 100% ✅ |
| Recruitment | 8 | 8 | 100% ✅ |
| Calendar | 22 | 22 | 100% ✅ |
| Team (core) | 13 | 13 | 100% ✅ |
| Team (skills) | 2 | 0 | 0% ❌ |
| Team (compliance) | 3 | 0 | 0% ❌ |
| Team (finance) | 2 | 0 | 0% ❌ |
| Contracts | 8 | 8 | 100% ✅ |
| **Payroll** | **8** | **0** | **0% ❌** |
| **Time Tracking** | **10** | **0** | **0% ❌** |
| **Organization** | **11** | **0** | **0% ❌** |
| **Education** | **3** | **0** | **0% ❌** |
| **Risk** | **3** | **0** | **0% ❌** |
| **Support** | **5** | **0** | **0% ❌** |
| **Admin** | **4** | **0** | **0% ❌** |
| **Fiduciary** | **3** | **0** | **0% ❌** |
| **AI/Docs** | **4** | **0** | **0% ❌** |
| **Verification** | **3** | **0** | **0% ❌** |
| **Workspace** | **3** | **0** | **0% ❌** |
| **TOTAL** | **168+** | **94** | **56%** |

---

## Permission System

**Total Permissions Defined**: 39  
**Location**: `src/services/types/context.ts`

### Permission Categories
1. **Basic Operations**: `shift.create`, `shift.view`, `user.write`, `docs.read`
2. **Communication**: `thread.*`, `announcement.*`, `reporting.*`
3. **Calendar**: `calendar.*` (15 permissions)
4. **Team**: `team.*` (11 permissions)
5. **Profile**: `profile.*`, `facility.*`, `org.*` (11 permissions)
6. **Marketplace**: `marketplace.*` (9 permissions)
7. **Contracts**: `contracts.*` (6 permissions)
8. **Payroll**: `payroll.*` (7 permissions)
9. **Time**: `time.*` (7 permissions)
10. **Organization**: `pool.*`, `org.*` (11 permissions)
11. **Education**: `education.*` (3 permissions)
12. **Risk**: `risk.*` (3 permissions)
13. **Support**: `support.*` (4 permissions)
14. **Admin**: `admin.*` (4 permissions)
15. **Fiduciary**: `fiduciary.*` (2 permissions)
16. **Recruitment**: `recruitment.*` (7 permissions)

---

## Security Implementation

### Current Model
```typescript
// 1. Frontend builds context from auth state
const auth = useSmartAuth(); // Gets claims from Firebase ID token

// 2. Permission check before execution
if (!auth.claims.userPermissions?.includes(action.requiredPermission)) {
  throw new Error("Unauthorized");
}

// 3. Action executes with client SDK
const result = await action.handler(input, context);
```

### Workspace Security
- ✅ **Backend verification**: `workspace.switch` Cloud Function verifies membership
- ✅ **Custom tokens**: Issues tokens with `facilityId` in claims
- ✅ **Frontend re-auth**: `signInWithCustomToken()` updates auth state
- ✅ **Audit logging**: All switches logged to `system_logs`

---

## Known Limitations

### 1. Client-Side Execution
**Issue**: Actions run in browser, not on secure backend  
**Impact**: 
- Limited to Firebase Client SDK capabilities
- Cannot use Admin SDK functions (e.g., `createCustomToken()`)
- Relies on Firestore security rules for data protection

**Mitigation**:
- Critical actions (workspace.switch) run as Cloud Functions
- Firestore security rules enforce server-side validation
- All actions audit logged

### 2. Partial Registration
**Issue**: 74 action files (44%) not registered  
**Impact**: 
- Actions exist but cannot be called via `useAction()`
- AI agent cannot discover or use these actions
- Code duplication risk

**Affected Categories**:
- Payroll (8 actions)
- Time Tracking (10 actions)
- Organization (11 actions)
- Education (3 actions)
- Risk (3 actions)
- Support (5 actions)
- Admin (4 actions)
- Fiduciary (3 actions)
- AI/Docs (4 actions)
- Verification (3 actions)
- Workspace (3 actions)

### 3. Missing Middleware
**Issue**: No server-side token verification for actions  
**Impact**: Actions trust client-provided context  
**Mitigation**: Firebase SDK verifies ID token automatically

---

## Cloud Functions Integration

### Workspace Access (✅ Implemented)
- `switchWorkspace` - Verifies membership, issues custom token
- `checkWorkspaces` - Returns available workspaces

### Legacy APIs (Existing)
- `contractAPI` - Contract operations
- `messagesAPI` - Message operations
- `marketplaceAPI` - Marketplace operations
- `healthRegistryAPI` - BAG health registry
- Various triggers and scheduled functions

---

## Frontend Integration

### Usage Pattern
```typescript
import { useAction } from '@/services/actions/hook';

function MyComponent() {
  const { execute, loading, error } = useAction();

  const handleAction = async () => {
    try {
      const result = await execute('thread.create', {
        collectionType: 'messages',
        content: 'Hello',
        participants: ['user1']
      });
      console.log('Success:', result);
    } catch (err) {
      console.error('Failed:', err);
    }
  };

  return <button onClick={handleAction} disabled={loading}>Create Thread</button>;
}
```

### AI Integration
```typescript
// Get AI-compatible tool catalog
import { getAiToolsCatalog } from '@/services/actions/registry';

const tools = getAiToolsCatalog();
// Returns array of MCP-compatible tool definitions
```

---

## Documentation Files

### Comprehensive Guides
- `THREAD_SERVICE_GUIDE.md` - Communication system
- `RECRUITMENT_GUIDE.md` - ATS module
- `MARKETPLACE_GUIDE.md` - Marketplace module
- `CALENDAR_GUIDE.md` - Scheduling system
- `PROFILE_GUIDE.md` - Profile management
- `SWISS_COMPLIANCE_GUIDE.md` - Swiss regulations
- `ADMIN_SUPPORT_GUIDE.md` - Admin & support
- `ADMIN_SECURITY_GUIDE.md` - Security patterns
- `IMPLEMENTATION_GUIDE.md` - Core infrastructure

---

## File Structure

```
src/services/actions/
├── types.ts                    # Core type definitions
├── hook.ts                     # useAction() React hook
├── registry.ts                 # Action registry (94 actions)
├── tools.ts                    # AI agent tools
├── middleware/
│   └── buildActionContext.ts  # Context builder & validators
└── catalog/
    ├── communication/          # 17 files ✅
    ├── profile/                # 15 files ✅
    ├── marketplace/            # 12 files ✅
    ├── recruitment/            # 8 files ✅
    ├── calendar/               # 22 files ✅
    ├── team/                   # 20 files (13 registered)
    ├── contracts/              # 8 files ✅
    ├── payroll/                # 8 files ❌
    ├── time/                   # 10 files ❌
    ├── organization/           # 11 files ❌
    ├── education/              # 3 files ❌
    ├── risk/                   # 3 files ❌
    ├── support/                # 5 files ❌
    ├── admin/                  # 4 files ❌
    ├── fiduciary/              # 3 files ❌
    ├── ai/                     # 4 files ❌
    ├── verification/           # 3 files ❌
    └── workspace/              # 3 files ❌
```

---

## Deployment Status

### Production Ready ✅
- Communication (17 actions)
- Profile Management (15 actions)
- Marketplace (12 actions)
- Recruitment (8 actions)
- Calendar/Scheduling (22 actions)
- Team Management Core (13 actions)
- Contracts (8 actions)

### Needs Registration ❌
- Payroll (8 actions)
- Time Tracking (10 actions)
- Organization (11 actions)
- Education (3 actions)
- Risk Management (3 actions)
- Support/CAPA (5 actions)
- Admin (4 actions)
- Fiduciary (3 actions)
- AI/Document Processing (4 actions)
- Verification (3 actions)
- Team Skills/Compliance/Finance (7 actions)

---

## Next Steps

1. **Complete Registration**: Add 74 unregistered actions to registry
2. **Backend Migration**: Move critical actions to Cloud Functions
3. **Permission Mapping**: Ensure all actions have correct permissions
4. **Testing**: Integration tests for all 168 actions
5. **Documentation**: Update guides for unregistered actions
6. **AI Integration**: Make all actions available to AI agent

---

**Document Version**: 1.0  
**Last Review**: January 2026  
**Maintained By**: Development Team

