# Action Catalog - Quick Reference

**Quick access guide for the complete action implementation documentation.**

---

## 📚 Documentation Files

### 1. **ACTION_CATALOG_STATE.md** (Current Implementation)
**Purpose**: Complete inventory of all actions  
**Contents**:
- 94 registered actions (detailed list)
- 168+ total action files found
- Registration status by category
- Permission system overview
- Architecture explanation
- File structure

**Use When**: Need to know what actions exist and their status

---

### 2. **ACTION_CATALOG_REVIEW.md** (Improvements & Roadmap)
**Purpose**: Architecture review and recommendations  
**Contents**:
- Critical gaps analysis
- Missing actions list
- Backend migration strategy
- Security enhancements
- Performance optimizations
- 8-month deployment roadmap

**Use When**: Planning improvements or migrations

---

### 3. **WORKSPACE_PASSPORT_IMPLEMENTATION.md** (Workspace Access)
**Purpose**: Workspace access "Passport Strategy" implementation  
**Contents**:
- Before/after comparison
- Security improvements
- Testing scenarios
- Deployment checklist

**Use When**: Working on workspace access or multi-tenancy

---

## 🎯 Quick Stats

| Metric | Value |
|--------|-------|
| **Registered Actions** | 94 / 168 (56%) |
| **Complete Categories** | 8 / 18 (44%) |
| **Execution Model** | Client-side (Firebase Client SDK) |
| **Backend Actions** | 2 (workspace.switch, checkWorkspaces) |
| **Permissions Defined** | 39 |
| **Unregistered Files** | 74 (44%) |

---

## ⚠️ Critical Issues

### 1. Unregistered Actions (44%)
**Impact**: 🔴 CRITICAL  
**Categories Affected**: Payroll, Time, Organization, Admin, Support  
**Fix**: Register in `registry.ts` (1 week effort)

### 2. Client-Side Payroll
**Impact**: 🔴 CRITICAL SECURITY RISK  
**Issue**: Financial calculations in browser  
**Fix**: Migrate to Cloud Functions (6 weeks effort)

### 3. Missing Backend Migration
**Impact**: 🔴 HIGH  
**Issue**: Cannot use Admin SDK features  
**Fix**: Implement backend execution (8 weeks effort)

---

## ✅ What Works Well

1. **Core Workflows** (100% registered)
   - Communication (17 actions)
   - Profile Management (15 actions)
   - Calendar/Scheduling (22 actions)
   - Marketplace (12 actions)
   - Recruitment (8 actions)
   - Contracts (8 actions)
   - Team Core (13 actions)

2. **Architecture**
   - Type-safe execution
   - Automatic audit logging
   - Permission checking
   - AI-compatible (MCP tools)

3. **Security**
   - Workspace "Passport Strategy" implemented
   - Custom token issuance
   - Tenant isolation enforced

---

## 📋 Missing Actions Summary

### Critical Missing (Priority 🔴)
- **Payroll**: 8 actions (calculate, export, publish, lock)
- **Time Tracking**: 10 actions (clock in/out, breaks, approvals)
- **Admin**: 4 actions (provision, billing, impersonate)
- **Fiduciary**: 3 actions (bulk export, dashboard, discrepancy)

### High Priority (Priority 🟡)
- **Organization**: 11 actions (pool, finance, governance, analytics)
- **Support/CAPA**: 5 actions (AI agent, tickets, CAPA workflow)
- **Education**: 3 actions (FPH credits, compliance, apprenticeship)
- **Risk**: 3 actions (CIRS, crisis, block user)

### Medium Priority (Priority 🟢)
- **AI/Documents**: 4 actions (parse, verify, extract)
- **Verification**: 3 actions (GLN, UID registries)
- **Team Extended**: 7 actions (skills, compliance, finance)
- **Notifications**: 6 actions (NEW - completely missing)
- **Reporting**: 4 actions (NEW - completely missing)
- **Documents**: 5 actions (NEW - partially implemented)

---

## 🚀 Recommended Actions

### Immediate (This Week)
1. ✅ Register all 74 missing actions → `registry.ts`
2. ✅ Add missing permissions → `context.ts`
3. ✅ Document unregistered actions

### Short Term (This Month)
1. ✅ Migrate payroll actions to backend
2. ✅ Migrate admin actions to backend
3. ✅ Implement rate limiting
4. ✅ Add integration tests

### Medium Term (Next Quarter)
1. ✅ Complete backend migration (time, org, support)
2. ✅ Implement missing actions (notifications, reporting)
3. ✅ Performance optimizations
4. ✅ Security audit

### Long Term (6+ Months)
1. ✅ AI agent enhancements
2. ✅ Complete test coverage (80%+)
3. ✅ Advanced features (auto-scheduling, predictions)

---

## 🔧 Common Tasks

### Register a New Action

```typescript
// 1. Create action file
// catalog/myCategory/myAction.ts
import { z } from 'zod';
import { ActionDefinition } from '../../types';

const MyActionSchema = z.object({
  input: z.string()
});

export const myAction: ActionDefinition = {
  id: 'my.action',
  label: 'My Action',
  description: 'Does something',
  schema: MyActionSchema,
  permissions: ['some.permission'],
  handler: async (input, ctx) => {
    // Implementation
    return { result: 'success' };
  }
};

// 2. Register in registry.ts
import { myAction } from './catalog/myCategory/myAction';

export const ActionRegistry = {
  // ... existing actions
  [myAction.id]: myAction
};

// 3. Add permission to context.ts (if new)
export type Permission = 
  | /* existing */
  | 'some.permission';
```

### Call an Action (Frontend)

```typescript
import { useAction } from '@/services/actions/hook';

function MyComponent() {
  const { execute, loading } = useAction();

  const handleClick = async () => {
    const result = await execute('my.action', { input: 'test' });
    console.log(result);
  };

  return <button onClick={handleClick} disabled={loading}>Do Action</button>;
}
```

### Add Backend Action

```javascript
// functions/actions/myAction.js
const { onCall } = require('firebase-functions/v2/https');

exports.myAction = onCall(async (request) => {
  // Verify auth
  if (!request.auth) throw new HttpsError('unauthenticated', 'Not logged in');
  
  // Check permission
  const permissions = request.auth.token.permissions || [];
  if (!permissions.includes('my.permission')) {
    throw new HttpsError('permission-denied', 'No permission');
  }
  
  // Execute
  const { input } = request.data;
  // ... implementation
  
  return { result: 'success' };
});

// functions/index.js
const { myAction } = require('./actions/myAction');
module.exports.myAction = myAction;
```

---

## 📖 Related Documentation

### Implementation Guides
- `src/services/IMPLEMENTATION_GUIDE.md` - Core infrastructure
- `src/services/actions/THREAD_SERVICE_GUIDE.md` - Communication
- `src/services/actions/catalog/RECRUITMENT_GUIDE.md` - ATS
- `src/services/actions/catalog/MARKETPLACE_GUIDE.md` - Marketplace
- `src/services/actions/catalog/CALENDAR_GUIDE.md` - Scheduling
- `src/services/actions/catalog/SWISS_COMPLIANCE_GUIDE.md` - Swiss rules
- `src/services/actions/catalog/ADMIN_SUPPORT_GUIDE.md` - Admin/Support
- `src/services/actions/catalog/ADMIN_SECURITY_GUIDE.md` - Security

### Architecture Docs
- `WORKSPACE_PASSPORT_IMPLEMENTATION.md` - Workspace access
- `FRONTEND_REFACTORING_GUIDE.md` - Overall architecture
- `DASHBOARD_CONTEXTS_REFACTOR.md` - Dashboard structure

---

## 🔗 Key Files

### Source Code
- `src/services/actions/registry.ts` - Action registry (94 actions)
- `src/services/actions/hook.ts` - useAction() React hook
- `src/services/actions/types.ts` - Type definitions
- `src/services/actions/middleware/buildActionContext.ts` - Context builder
- `src/services/types/context.ts` - Permissions (39 defined)

### Backend
- `functions/api/workspaceAccess.js` - Workspace switch (backend)
- `functions/index.js` - Function exports
- `functions/database/db.js` - Database config

### Frontend
- `src/hooks/useWorkspaceAccess.js` - Workspace hook
- `src/services/services/auth.ts` - Smart auth
- `src/services/services/audit.ts` - Audit logger

---

## ❓ FAQ

**Q: Why are some actions not registered?**  
A: Actions were created but not added to `ActionRegistry`. They exist as files but cannot be called.

**Q: Can I add a new action without backend?**  
A: Yes, for non-sensitive operations. Use client-side execution with Firebase Client SDK.

**Q: When should I use backend execution?**  
A: For financial operations, admin tasks, bulk operations, or anything requiring Admin SDK.

**Q: How do I test an action?**  
A: Use `useAction()` hook in a test component or write integration tests.

**Q: What's the workspace "Passport Strategy"?**  
A: Backend verifies membership once, issues custom token with `facilityId` in claims. All subsequent actions trust the token.

---

**Last Updated**: January 2026  
**Status**: Current  
**Maintained By**: Development Team

