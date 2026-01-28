# Enhanced Admin & Support Layer - Security & Isolation

## Masquerade (Impersonation) System

### Dual Identity Tracking

When an admin impersonates a user, the system maintains **two identities**:

1. **effectiveUser**: The user being impersonated (used for permissions and actions)
2. **realUser**: The admin who initiated the impersonation (for audit trail)

### Implementation

```typescript
interface MasqueradeContext extends ActionContext {
  userId: string;              // effectiveUser (target)
  facilityId: string;          // effectiveUser's facility
  userPermissions: Permission[];
  auditLogger: Function;
  
  // Masquerade-specific fields
  realUserId: string;          // The admin
  realUserEmail: string;
  isMasquerading: boolean;
  masqueradeStartedAt: Date;
  masqueradeReason: string;
}
```

### Usage

```typescript
// Admin starts masquerade
const { customToken, masqueradeContext } = await executeAction('admin.impersonate_user', {
  targetUserId: "usr_456",
  reason: "Debug missing payroll export button",
  durationMinutes: 15
});

// Sign in with custom token
await signInWithCustomToken(auth, customToken);

// All subsequent actions are executed as the target user
// BUT audit logs show: realUser: admin_123, effectiveUser: usr_456
```

### Audit Trail Example

```json
{
  "actionId": "payroll.export_data",
  "status": "SUCCESS",
  "timestamp": "2024-03-15T14:30:00Z",
  "masqueradeContext": {
    "realUser": "admin_william",
    "effectiveUser": "usr_marie_pharmacist",
    "severity": "CRITICAL",
    "warning": "ADMIN_MASQUERADE_ACTIVE"
  },
  "payload": {
    "period": "2024-03",
    "format": "SWISSDEC"
  }
}
```

---

## Tenant Isolation Rules

### Standard Users
**Rule**: Must stay within their assigned facility (`ctx.facilityId`)

```typescript
// Automatically enforced in action handler
if (ctx.facilityId !== targetFacilityId) {
  throw new Error('Tenant isolation violation');
}
```

### Admin Users
**Rule**: Can cross tenant boundaries, but **every action is logged**

```typescript
if (ctx.userPermissions.includes('admin.access')) {
  await ctx.auditLogger(actionId, 'START', {
    warning: 'CROSS_TENANT_ACCESS',
    adminUser: ctx.userId,
    targetFacility: targetFacilityId,
    currentFacility: ctx.facilityId,
  });
  // Allow action to proceed
}
```

### Fiduciary Users
**Rule**: Can access only facilities in their `linkedFacilities` array

```typescript
const userProfile = await getDoc(doc(db, 'users', ctx.userId));
const linkedFacilities = userProfile.data().linkedFacilities || [];

if (!linkedFacilities.includes(targetFacilityId)) {
  throw new Error('Fiduciary access denied: facility not in linkedFacilities array');
}
```

---

## Fiduciary Multi-Tenant Access

### User Profile Structure

```typescript
interface FiduciaryUser {
  id: string;
  email: string;
  role: 'FIDUCIARY';
  linkedFacilities: string[];  // Array of facility IDs they can access
}
```

### Example

```json
{
  "id": "fid_789",
  "email": "accountant@fiduciary.ch",
  "role": "FIDUCIARY",
  "linkedFacilities": [
    "fac_pharmacy_a",
    "fac_pharmacy_b",
    "fac_hospital_c"
  ]
}
```

### Dashboard Implementation

```typescript
// fiduciary.get_client_dashboard
export const getClientDashboardAction = {
  handler: async (input, ctx) => {
    // 1. Get user's linkedFacilities array
    const userRef = doc(db, 'users', ctx.userId);
    const userSnap = await getDoc(userRef);
    const linkedFacilities = userSnap.data().linkedFacilities || [];

    // 2. Return ONLY data for linked facilities
    const clients = [];
    for (const facilityId of linkedFacilities) {
      const facilityData = await getFacilityPayrollStatus(facilityId);
      clients.push(facilityData);
    }

    return { clients, linkedFacilities };
  }
};
```

### Bulk Export Validation

```typescript
// fiduciary.bulk_export
export const bulkExportAction = {
  handler: async (input, ctx) => {
    const { facilityIds } = input;
    
    // 1. Get linked facilities
    const linkedFacilities = await getLinkedFacilities(ctx.userId);

    // 2. Validate ALL requested facilities are in linkedFacilities
    const unauthorizedFacilities = facilityIds.filter(
      fid => !linkedFacilities.includes(fid)
    );

    if (unauthorizedFacilities.length > 0) {
      throw new Error(
        `Access denied to facilities: ${unauthorizedFacilities.join(', ')}`
      );
    }

    // 3. Proceed with export
    // ...
  }
};
```

---

## Support & CAPA Workflow

### AI-First Response

```typescript
// Step 1: User asks question
const { response } = await executeAction('support.ask_agent', {
  query: "How do I export payroll?",
  context: { currentPage: "PAYROLL" }
});

// Step 2: Check confidence
if (response.confidence >= 0.7) {
  // Show AI answer
  displayAnswer(response.answer);
} else {
  // Auto-suggest ticket creation
  showButton('Open Support Ticket');
}
```

### Escalation to Ticket

```typescript
// User clicks "Open Ticket"
const { ticketId, capaId } = await executeAction('support.create_ticket_with_capa', {
  description: "Payroll export not working",
  severity: "HIGH",
  isBug: true
});

// If severity is HIGH or isBug=true, CAPA is auto-created
if (capaId) {
  console.log('CAPA workflow initiated for quality assurance');
}
```

### CAPA Object Structure

```typescript
interface CapaEntry {
  id: string;
  ticketId: string;
  
  // Four-step process
  rootCauseAnalysis?: string;
  correction?: string;
  prevention?: string;
  verification?: string;
  
  status: 'INVESTIGATION' | 'IMPLEMENTATION' | 'VERIFICATION' | 'COMPLETED';
}
```

### Admin Workflow

```typescript
// Step 1: Investigation
await executeAction('support.manage_capa_workflow', {
  ticketId: "tkt_123",
  step: "INVESTIGATION",
  notes: {
    rootCauseAnalysis: "Missing validation for locked payroll periods"
  }
});

// Step 2: Implementation
await executeAction('support.manage_capa_workflow', {
  ticketId: "tkt_123",
  step: "IMPLEMENTATION",
  notes: {
    correction: "Added lockValidator check in export function",
    prevention: "Added automated test for locked period validation"
  }
});

// Step 3: Verification (auto-closes ticket)
await executeAction('support.manage_capa_workflow', {
  ticketId: "tkt_123",
  step: "VERIFICATION",
  notes: {
    verification: "Tested with locked period - export now properly blocked"
  }
});
// Ticket status automatically changes to RESOLVED
```

---

## Security Implementation Checklist

### Masquerade
- [ ] Custom token includes `masquerade: true` flag
- [ ] Custom token includes `realUserId` field
- [ ] All audit logs track both `realUser` and `effectiveUser`
- [ ] Masquerade sessions expire after 15 minutes
- [ ] Severity level: CRITICAL for all masquerade actions

### Tenant Isolation
- [ ] Standard users blocked from cross-tenant access
- [ ] Admin cross-tenant access logged with warning
- [ ] Fiduciary access validated against `linkedFacilities` array
- [ ] Validation runs before action execution

### Fiduciary Multi-Tenant
- [ ] User profile has `linkedFacilities` array
- [ ] Dashboard only queries linked facilities
- [ ] Bulk export validates all requested facilities
- [ ] Discrepancy flagging checks facility access

### Support & CAPA
- [ ] AI response always tried first
- [ ] Low confidence (<0.7) auto-suggests ticket
- [ ] High severity tickets auto-create CAPA
- [ ] CAPA workflow enforces four-step process
- [ ] Verification step auto-resolves ticket

---

## Example User Profiles

### Admin

```json
{
  "id": "admin_william",
  "email": "william@interimed.ch",
  "role": "PLATFORM_ADMIN",
  "permissions": ["admin.access", "admin.impersonate_user", "admin.provision_tenant"],
  "facilityId": null
}
```

### Fiduciary

```json
{
  "id": "fid_789",
  "email": "accountant@fiduciary.ch",
  "role": "FIDUCIARY",
  "permissions": ["fiduciary.access", "fiduciary.bulk_export"],
  "linkedFacilities": ["fac_a", "fac_b", "fac_c"],
  "facilityId": null
}
```

### Standard User

```json
{
  "id": "usr_456",
  "email": "marie@pharmacy.ch",
  "role": "MANAGER",
  "permissions": ["calendar.create_shift", "payroll.export_data"],
  "facilityId": "fac_pharmacy_a"
}
```

---

This enhanced layer ensures:
1. **Traceability**: Every admin action is audited with dual identity
2. **Isolation**: Users cannot accidentally cross tenant boundaries
3. **Compliance**: CAPA workflow ensures quality assurance for critical issues
4. **Multi-Tenant**: Fiduciaries can manage multiple clients securely

