# Action Catalog - Architecture Review & Improvement Roadmap

**Document Type**: Technical Review & Recommendations  
**Last Updated**: January 2026  
**Status**: For Implementation Planning

---

## Executive Summary

The Action Catalog implements a solid foundation with 94 registered actions covering core workflows. However, **44% of action files remain unregistered**, and the client-side execution model presents security and scalability limitations.

### Quick Stats
- ✅ **Strengths**: Type-safe, auditable, AI-compatible
- ⚠️ **Gaps**: 74 actions unregistered, client-side execution, missing backend migration
- 🎯 **Priority**: Backend migration, complete registration, enhance security

---

## Critical Gaps & Recommendations

### 1. ❌ CRITICAL: Unregistered Actions (44% of codebase)

**Problem**: 74 action files exist but are not in `ActionRegistry`

**Impact**:
- Actions cannot be called via `useAction()`
- AI agent cannot discover these capabilities
- Code maintenance risk (orphaned files)
- Inconsistent architecture

**Missing Categories**:
| Category | Files | Priority | Business Impact |
|----------|-------|----------|-----------------|
| Payroll | 8 | 🔴 CRITICAL | Cannot process payroll |
| Time Tracking | 10 | 🔴 CRITICAL | Cannot track hours |
| Organization | 11 | 🟡 HIGH | Multi-facility features broken |
| Support/CAPA | 5 | 🟡 HIGH | No support system |
| Admin | 4 | 🟡 HIGH | No SaaS management |
| Education (FPH) | 3 | 🟢 MEDIUM | Swiss compliance |
| Risk/CIRS | 3 | 🟢 MEDIUM | Swiss compliance |
| Fiduciary | 3 | 🟢 MEDIUM | Multi-tenant billing |
| AI/Docs | 4 | 🟢 LOW | Document automation |
| Verification | 3 | 🟢 LOW | Swiss registries |
| Team (extended) | 7 | 🟢 LOW | Skills, compliance |

**Recommendation**:

```typescript
// 1. Register all actions in registry.ts
import { clockInAction } from "./catalog/time/clock/clockIn";
import { calculatePayrollAction } from "./catalog/payroll/calculatePeriodVariables";
// ... import all 74 missing actions

export const ActionRegistry = {
  // ... existing 94 actions
  [clockInAction.id]: clockInAction,
  [calculatePayrollAction.id]: calculatePayrollAction,
  // ... add remaining 74 actions
} as const;
```

**Effort**: 2-3 days  
**Risk**: Low (existing code, just registration)

---

### 2. 🔴 CRITICAL: Client-Side Execution Model

**Problem**: Actions run in browser using Firebase Client SDK

**Limitations**:
- ❌ Cannot use Admin SDK (no `createCustomToken()`, `setCustomUserClaims()`, etc.)
- ❌ Limited to Firestore security rules for data protection
- ❌ Cannot securely access third-party APIs (keys exposed)
- ❌ No server-side rate limiting
- ❌ Performance issues with large data operations
- ❌ Cannot enforce complex business rules server-side

**Security Risks**:
- User can manipulate client-side code
- Firestore rules become complex and error-prone
- Sensitive operations (billing, payroll) vulnerable

**Recommendation**: **Backend Migration Strategy**

#### Phase 1: Migrate Critical Actions (Priority 🔴)
Move these to Cloud Functions immediately:

**Payroll Actions (8)**:
- `payroll.calculate_period_variables` - Money calculations
- `payroll.approve_global` - Financial approval
- `payroll.export_data` - Sensitive data export
- `payroll.publish_payslips` - Legal document distribution
- `payroll.lock_period` - Immutable record creation
- `payroll.add_manual_entry` - Financial adjustment
- `payroll.upload_payslip_bundle` - Bulk processing
- ALL payroll operations

**Admin Actions (4)**:
- `admin.provision_tenant` - Resource provisioning
- `admin.manage_billing` - Financial operations
- `admin.impersonate_user` - Security-critical
- `admin.broadcast_system_alert` - System-wide operations

**Fiduciary Actions (3)**:
- `fiduciary.bulk_export` - Bulk sensitive data
- `fiduciary.flag_discrepancy` - Financial reporting
- `fiduciary.get_client_dashboard` - Multi-tenant data aggregation

**Team Actions (3)**:
- `team.update_iban` - Financial data
- `team.download_payslip` - Legal document access
- `team.update_contract_terms` - Legal modifications

**Implementation Pattern**:

```javascript
// functions/actions/actionExecutor.js
const { onCall } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const db = require('../database/db');
const { createAuditLogger } = require('../services/audit');

exports.executeAction = onCall(async (request) => {
  // 1. VERIFY TOKEN (The "Passport")
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Not authenticated');
  }

  const { actionId, input } = request.data;
  const decodedToken = request.auth.token;

  // 2. BUILD SECURE CONTEXT
  const context = {
    userId: request.auth.uid,
    facilityId: decodedToken.facilityId,
    userPermissions: decodedToken.permissions || [],
    auditLogger: createAuditLogger(request.auth.uid, decodedToken.facilityId),
    ipAddress: request.rawRequest.ip,
    db: admin.firestore(),
    auth: admin.auth()
  };

  // 3. LOAD ACTION HANDLER
  const ActionHandlers = {
    'payroll.calculate_period_variables': require('./payroll/calculatePeriodVariables').handler,
    'admin.provision_tenant': require('./admin/provisionTenant').handler,
    // ... register backend actions
  };

  const handler = ActionHandlers[actionId];
  if (!handler) {
    throw new HttpsError('not-found', `Action ${actionId} not found`);
  }

  // 4. CHECK PERMISSION
  const action = handler.metadata;
  if (!context.userPermissions.includes(action.requiredPermission)) {
    await context.auditLogger(actionId, 'ERROR', { reason: 'Access Denied' });
    throw new HttpsError('permission-denied', 'Insufficient permissions');
  }

  // 5. EXECUTE
  try {
    await context.auditLogger(actionId, 'START', { input });
    const result = await handler(input, context);
    await context.auditLogger(actionId, 'SUCCESS', { resultId: result?.id });
    return result;
  } catch (error) {
    await context.auditLogger(actionId, 'ERROR', { error: error.message });
    throw new HttpsError('internal', error.message);
  }
});
```

**Frontend Update**:

```typescript
// src/services/actions/hook.ts
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

export function useAction() {
  const execute = async (actionId, input) => {
    // Check if action should run on backend
    const backendActions = [
      'payroll.*',
      'admin.*',
      'fiduciary.*',
      'team.update_iban',
      'team.download_payslip'
    ];

    const isBackendAction = backendActions.some(pattern => 
      actionId.match(new RegExp(pattern.replace('*', '.*')))
    );

    if (isBackendAction) {
      // BACKEND EXECUTION
      const executeActionFn = httpsCallable(functions, 'executeAction');
      const result = await executeActionFn({ actionId, input });
      return result.data;
    } else {
      // CLIENT-SIDE EXECUTION (existing code)
      const action = ActionRegistry[actionId];
      return await action.handler(input, context);
    }
  };

  return { execute, loading, error };
}
```

**Effort**: 4-6 weeks  
**Risk**: Medium (requires testing, migration strategy)

#### Phase 2: Migrate Remaining Actions (Priority 🟡)
- Time tracking (10 actions)
- Organization (11 actions)
- Support (5 actions)
- Education (3 actions)
- Risk (3 actions)

**Effort**: 6-8 weeks  
**Risk**: Medium

---

### 3. 🟡 HIGH: Missing Backend Token Verification

**Problem**: No server-side middleware to verify workspace tokens

**Current**: Actions built context from client-side `useSmartAuth()`  
**Risk**: If actions move to backend, no verification layer

**Recommendation**: Implement middleware (template provided in `buildActionContext.ts`)

```typescript
// functions/middleware/verifyWorkspace.js
async function verifyWorkspaceAccess(idToken, targetFacilityId) {
  const decodedToken = await admin.auth().verifyIdToken(idToken);
  
  // Extract workspace passport
  const { facilityId, workspaceId, permissions } = decodedToken;
  
  // Enforce workspace requirement
  if (!workspaceId || workspaceId === 'UNASSIGNED') {
    throw new Error('User must switch to workspace first');
  }
  
  // Validate facility access
  if (facilityId !== targetFacilityId && !permissions.includes('admin.access')) {
    throw new Error('Tenant isolation violation');
  }
  
  return decodedToken;
}
```

**Effort**: 1 week  
**Risk**: Low

---

### 4. 🟡 HIGH: Missing Actions

Based on the guides and typical HR platform needs, these actions are missing:

#### Payroll Enhancements
- `payroll.preview_period` - Preview payroll before finalization
- `payroll.generate_sepa_file` - Generate SEPA XML for bank transfer
- `payroll.reconcile_period` - Reconcile payroll vs time tracking
- `payroll.create_correction` - Create corrective payroll entry

#### Time Tracking Enhancements
- `time.reject_correction` - Reject time correction request
- `time.approve_bulk` - Approve multiple corrections at once
- `time.export_raw_data` - Export raw clock data for audit
- `time.lock_period` - Lock time period (immutable)

#### Calendar Enhancements
- `calendar.clone_roster` - Clone schedule to next period
- `calendar.import_external` - Import shifts from external system
- `calendar.auto_schedule` - AI-powered auto-scheduling
- `calendar.optimize_roster` - Optimize existing schedule

#### Team Enhancements
- `team.bulk_invite` - Invite multiple users at once
- `team.import_csv` - Import employees from CSV
- `team.export_hr_report` - Export HR report
- `team.manage_emergency_contacts` - Update emergency contacts

#### Contracts Enhancements
- `contracts.bulk_generate` - Generate multiple contracts
- `contracts.remind_signature` - Send signature reminder
- `contracts.expire` - Handle contract expiration
- `contracts.renew` - Renew expiring contract

#### Notification System (Missing entirely)
- `notification.send_push` - Send FCM push notification
- `notification.send_sms` - Send SMS notification
- `notification.send_email` - Send email notification
- `notification.schedule` - Schedule notification
- `notification.get_user_notifications` - Get user's notifications
- `notification.mark_read` - Mark notification as read

#### Reporting System (Missing entirely)
- `reporting.generate_dashboard` - Generate dashboard metrics
- `reporting.export_analytics` - Export analytics data
- `reporting.schedule_report` - Schedule automated report
- `reporting.compare_periods` - Compare time periods

#### Document Management (Partial)
- `documents.upload` - Upload document
- `documents.categorize` - Categorize document
- `documents.share` - Share document with team
- `documents.archive` - Archive document
- `documents.search` - Search documents

**Effort**: 8-12 weeks  
**Risk**: Low (new development)

---

### 5. 🟢 MEDIUM: Permission System Gaps

**Problem**: Some actions missing from permission definitions

**Missing Permissions**:
```typescript
// Add to src/services/types/context.ts
export type Permission = 
  | /* existing permissions */
  
  // Workspace
  | 'workspace.switch' | 'workspace.check'
  
  // Notifications
  | 'notification.send' | 'notification.read' | 'notification.manage'
  
  // Reporting
  | 'reporting.view' | 'reporting.export' | 'reporting.create'
  
  // Documents
  | 'documents.read' | 'documents.write' | 'documents.delete' | 'documents.share'
  
  // AI
  | 'ai.parse_document' | 'ai.extract_text' | 'ai.verify_document'
  
  // Verification
  | 'verification.check_gln' | 'verification.check_uid';
```

**Recommendation**: Audit all actions and ensure permissions are defined

**Effort**: 1-2 days  
**Risk**: Low

---

### 6. 🟢 MEDIUM: Inconsistent Action Metadata

**Problem**: Some actions missing metadata fields

**Missing Fields**:
- `fileLocation` - For debugging/refactoring
- `keywords` - For AI agent search
- `icon` - For UI components
- `riskLevel` - For confirmation dialogs
- `route` - For navigation

**Recommendation**: Add linter/validator

```typescript
// scripts/validate-actions.ts
import { ActionRegistry } from '../src/services/actions/registry';

const requiredFields = ['id', 'label', 'description', 'schema', 'handler', 'permissions'];
const recommendedFields = ['keywords', 'icon', 'fileLocation'];

Object.entries(ActionRegistry).forEach(([key, action]) => {
  requiredFields.forEach(field => {
    if (!(field in action)) {
      console.error(`❌ Action ${key} missing required field: ${field}`);
    }
  });
  
  recommendedFields.forEach(field => {
    if (!(field in action)) {
      console.warn(`⚠️ Action ${key} missing recommended field: ${field}`);
    }
  });
});
```

**Effort**: 2-3 days  
**Risk**: Low

---

### 7. 🟢 LOW: AI Agent Integration Gaps

**Problem**: AI agent can only discover registered actions (56%)

**Impact**: AI cannot help with:
- Payroll operations
- Time tracking
- Organization management
- Support tickets
- Admin operations

**Recommendation**: Complete registration + enhance AI tool descriptions

```typescript
// Enhance action descriptions for AI
export const clockInAction = {
  id: 'time.clock_in',
  label: 'Clock In',
  description: `
    Records employee clock-in time for shift tracking.
    
    USE WHEN:
    - Employee arrives for work
    - Starting a scheduled shift
    - Beginning piquet intervention
    
    VALIDATION:
    - Must be within 30 minutes of scheduled start
    - Cannot clock in twice without clocking out
    - Checks geofencing if enabled
    
    OUTPUTS:
    - Clock entry ID
    - Actual clock-in time
    - Early/late warning if applicable
  `,
  keywords: ['clock', 'arrival', 'start shift', 'check in', 'attendance'],
  schema: ClockInSchema,
  handler: clockInHandler
};
```

**Effort**: 1-2 weeks  
**Risk**: Low

---

## Architecture Recommendations

### Hybrid Execution Model (Recommended)

```
┌─────────────────────────────────────────────────────────┐
│                      FRONTEND                           │
│  ┌──────────────────────────────────────────────────┐  │
│  │            useAction() Hook                      │  │
│  │                                                  │  │
│  │  Decision Logic:                                │  │
│  │  - Check action.executionMode                   │  │
│  │  - Route to client or backend                   │  │
│  └──────────────────────────────────────────────────┘  │
│           │                               │             │
│           │                               │             │
│     [Client-Side]                   [Server-Side]       │
│           │                               │             │
│           ▼                               ▼             │
│  ┌─────────────────┐           ┌──────────────────┐   │
│  │ Client Actions  │           │  Cloud Function   │   │
│  │                 │           │  executeAction()  │   │
│  │ - Communication │           │                   │   │
│  │ - UI/UX         │           │  - Payroll       │   │
│  │ - Read-only     │           │  - Admin         │   │
│  │                 │           │  - Financial     │   │
│  └─────────────────┘           └──────────────────┘   │
│           │                               │             │
│           └───────────────┬───────────────┘             │
│                           │                             │
└───────────────────────────┼─────────────────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │   FIREBASE       │
                  │                  │
                  │  - Firestore     │
                  │  - Auth          │
                  │  - Storage       │
                  └──────────────────┘
```

### Action Classification

**Client-Side (Fast, UI-focused)**:
- ✅ Read operations (list, get, fetch)
- ✅ UI state changes (pin, archive, mark read)
- ✅ Simple writes (create thread, update profile)
- ✅ Real-time features (calendar drag-drop)

**Server-Side (Secure, Complex)**:
- ✅ Financial operations (payroll, billing)
- ✅ Admin operations (provision, impersonate)
- ✅ Bulk operations (export, import)
- ✅ Third-party API calls
- ✅ Complex calculations
- ✅ Legal documents (contracts, payslips)

**Metadata Flag**:

```typescript
export interface ActionDefinition {
  id: string;
  executionMode: 'client' | 'server' | 'hybrid'; // NEW
  // ... other fields
}
```

---

## Performance Optimizations

### 1. Lazy Loading Actions

**Problem**: All 168 actions imported on app load

**Recommendation**:

```typescript
// src/services/actions/registry.ts
export const ActionRegistry = {
  // Core actions (eager load)
  [getMeAction.id]: getMeAction,
  [listThreadsAction.id]: listThreadsAction,
  
  // Lazy load modules
  get payrollActions() {
    return import('./catalog/payroll').then(m => m.default);
  },
  
  get adminActions() {
    return import('./catalog/admin').then(m => m.default);
  }
};
```

**Benefit**: Faster initial load  
**Effort**: 1 week

### 2. Action Caching

**Problem**: Action handlers reconstructed on every call

**Recommendation**: Implement action result caching

```typescript
const actionCache = new Map();

export function useAction() {
  const execute = async (actionId, input) => {
    const cacheKey = `${actionId}:${JSON.stringify(input)}`;
    
    if (action.metadata?.cacheable) {
      const cached = actionCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 60000) {
        return cached.result;
      }
    }
    
    const result = await action.handler(input, context);
    
    if (action.metadata?.cacheable) {
      actionCache.set(cacheKey, { result, timestamp: Date.now() });
    }
    
    return result;
  };
}
```

**Benefit**: Reduced redundant operations  
**Effort**: 2-3 days

---

## Testing Recommendations

### 1. Integration Tests (Missing)

```typescript
// tests/actions/payroll.test.ts
describe('Payroll Actions', () => {
  it('should calculate period variables correctly', async () => {
    const result = await executeAction('payroll.calculate_period_variables', {
      facilityId: 'test_facility',
      period: '2024-01'
    }, mockContext);
    
    expect(result.totalHours).toBe(160);
    expect(result.overtimeHours).toBe(10);
  });
  
  it('should reject if period is locked', async () => {
    await expect(
      executeAction('payroll.add_manual_entry', {
        period: '2024-01',
        entry: { amount: 100 }
      }, mockContext)
    ).rejects.toThrow('Period is locked');
  });
});
```

**Recommendation**: 80% test coverage for all actions  
**Effort**: 4-6 weeks

### 2. E2E Tests

```typescript
// e2e/workflows/payroll.spec.ts
test('Complete payroll workflow', async ({ page }) => {
  // 1. Calculate period
  await page.click('[data-testid="calculate-payroll"]');
  await expect(page.locator('.payroll-summary')).toBeVisible();
  
  // 2. Add manual entry
  await page.click('[data-testid="add-entry"]');
  await page.fill('[name="amount"]', '100');
  await page.click('[data-testid="save"]');
  
  // 3. Lock period
  await page.click('[data-testid="lock-period"]');
  await expect(page.locator('.period-locked')).toBeVisible();
  
  // 4. Export data
  const downloadPromise = page.waitForEvent('download');
  await page.click('[data-testid="export"]');
  const download = await downloadPromise;
  
  expect(download.suggestedFilename()).toMatch(/payroll.*\.csv/);
});
```

**Effort**: 3-4 weeks

---

## Security Enhancements

### 1. Rate Limiting (Missing)

```javascript
// functions/middleware/rateLimit.js
const rateLimits = new Map();

function checkRateLimit(userId, actionId) {
  const key = `${userId}:${actionId}`;
  const limit = ACTION_RATE_LIMITS[actionId] || 100; // per hour
  
  const current = rateLimits.get(key) || [];
  const hourAgo = Date.now() - 3600000;
  const recentCalls = current.filter(t => t > hourAgo);
  
  if (recentCalls.length >= limit) {
    throw new HttpsError('resource-exhausted', 'Rate limit exceeded');
  }
  
  recentCalls.push(Date.now());
  rateLimits.set(key, recentCalls);
}
```

**Effort**: 1 week

### 2. Input Validation (Enhance)

```typescript
// Use Zod's advanced features
const PayrollPeriodSchema = z.object({
  facilityId: z.string().uuid(),
  period: z.string().regex(/^\d{4}-\d{2}$/),
  entries: z.array(z.object({
    userId: z.string().uuid(),
    amount: z.number().positive().max(100000), // Max 100k per entry
    type: z.enum(['SALARY', 'BONUS', 'DEDUCTION'])
  })).max(1000) // Max 1000 entries per batch
});
```

**Effort**: 1-2 weeks

### 3. Audit Log Enhancement

```typescript
// Add more context to audit logs
interface EnhancedAuditLog {
  userId: string;
  facilityId: string;
  actionId: string;
  timestamp: Timestamp;
  ipAddress: string;
  userAgent: string;
  status: 'START' | 'SUCCESS' | 'ERROR';
  duration: number; // ms
  metadata: Record<string, any>;
  
  // NEW
  workspaceId: string;
  sessionId: string;
  riskScore: number; // 0-100
  dataAccessed: string[]; // List of collections read
  dataModified: string[]; // List of collections written
}
```

**Effort**: 1 week

---

## Deployment Roadmap

### Phase 1: Foundation (4 weeks)
- [ ] Register all 74 missing actions
- [ ] Add missing permissions
- [ ] Implement action validator
- [ ] Setup integration tests

### Phase 2: Critical Migration (6 weeks)
- [ ] Migrate payroll actions to backend
- [ ] Migrate admin actions to backend
- [ ] Migrate fiduciary actions to backend
- [ ] Implement backend token verification

### Phase 3: Enhanced Security (4 weeks)
- [ ] Implement rate limiting
- [ ] Enhance input validation
- [ ] Improve audit logging
- [ ] Security audit

### Phase 4: Remaining Migration (8 weeks)
- [ ] Migrate time tracking actions
- [ ] Migrate organization actions
- [ ] Migrate support actions
- [ ] Migrate education/risk actions

### Phase 5: New Features (12 weeks)
- [ ] Implement missing actions (notifications, reporting, documents)
- [ ] AI agent enhancements
- [ ] Performance optimizations
- [ ] Complete testing coverage

**Total Timeline**: 34 weeks (~8 months)

---

## Cost-Benefit Analysis

### Backend Migration Costs
- Development: 20 weeks @ $150/hour = $120,000
- Testing: 8 weeks @ $100/hour = $32,000
- Migration: 4 weeks @ $150/hour = $24,000
- **Total**: $176,000

### Backend Migration Benefits
- **Security**: Prevents client-side manipulation of financial data
- **Compliance**: Meets Swiss banking/audit requirements
- **Performance**: Bulk operations 10x faster
- **Scalability**: No browser memory limits
- **Reliability**: Server-side retry logic
- **ROI**: Prevents one payroll error = project pays for itself

### Registration Costs
- Development: 1 week @ $100/hour = $4,000

### Registration Benefits
- **AI Coverage**: 100% action discovery
- **Maintainability**: Consistent architecture
- **User Experience**: All features accessible
- **ROI**: Immediate

---

## Risk Assessment

### High Risk (Must Address)
1. **Client-side payroll** - Financial liability
2. **Unregistered actions** - Incomplete product
3. **No rate limiting** - DDoS vulnerability

### Medium Risk (Should Address)
4. **Missing backend verification** - Security gaps
5. **Incomplete testing** - Production bugs
6. **Missing actions** - Feature gaps

### Low Risk (Nice to Have)
7. **Performance optimizations** - UX improvements
8. **AI enhancements** - Better assistance
9. **Action caching** - Minor speedup

---

## Conclusion

The Action Catalog has a **solid foundation** with well-designed architecture and comprehensive coverage of core workflows. However, **critical gaps in registration and security** must be addressed before production deployment, especially for financial operations.

### Priority Actions:
1. ✅ **Register all actions** (1 week, low risk)
2. ✅ **Migrate payroll to backend** (6 weeks, critical)
3. ✅ **Implement rate limiting** (1 week, high impact)
4. ✅ **Add integration tests** (4 weeks, essential)

With these improvements, the Action Catalog will provide a **secure, scalable, and maintainable** foundation for the Swiss Healthcare HR Platform.

---

**Document Version**: 1.0  
**Review Date**: January 2026  
**Next Review**: March 2026

