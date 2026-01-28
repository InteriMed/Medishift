# Admin & Support Layer - SaaS Management

## Overview
Complete admin and support infrastructure with AI-powered support (CAPA workflow), God Mode admin tools, and fiduciary multi-tenant interface.

---

## 1. 🤖 AI Support & CAPA

### SUPPORT.ASK_AGENT
**Purpose**: Level 1 AI automation with RAG search  
**Input**: `query`, `context` (currentUrl, currentPage)  
**Output**: `answer`, `confidence`, `suggestedActions[]`, `sources[]`  

**AI Behavior**:
- RAG search through `/docs` (SOPs) and action catalog
- Context-aware (prioritizes payroll docs if on payroll page)
- Auto-suggests "Open Ticket" if confidence < 0.7

```typescript
const { response } = await executeAction('support.ask_agent', {
  query: "How do I export payroll data?",
  context: {
    currentUrl: "/payroll",
    currentPage: "PAYROLL"
  }
});

console.log(response.answer);
console.log(`Confidence: ${response.confidence}`);

if (response.confidence < 0.7) {
  // Show "Open Ticket" button
}
```

---

### SUPPORT.CREATE_TICKET_WITH_CAPA
**Purpose**: Create support ticket with automatic CAPA for bugs/high severity  
**Input**: `description`, `severity`, `isBug`, `category`, `attachments[]`  
**Output**: `ticketId`, `capaId`  

**CAPA Initialization**:
- Automatic for `isBug: true` or `severity: HIGH/CRITICAL`
- Creates CAPA entry with fields: Root Cause, Correction, Prevention, Verification

```typescript
const { ticketId, capaId } = await executeAction('support.create_ticket_with_capa', {
  description: "Payroll export crashes when including overtime",
  severity: "HIGH",
  isBug: true,
  category: "PAYROLL"
});

if (capaId) {
  console.log('CAPA workflow initiated');
}
```

---

### SUPPORT.MANAGE_CAPA_WORKFLOW
**Purpose**: Admin-only CAPA workflow management  
**Input**: `ticketId`, `step` (INVESTIGATION/IMPLEMENTATION/VERIFICATION), `notes`  
**Access**: Platform Admin Only  

**Workflow Steps**:
1. **INVESTIGATION**: Root cause analysis
2. **IMPLEMENTATION**: Correction applied
3. **VERIFICATION**: Prevention validated (auto-resolves ticket)

```typescript
await executeAction('support.manage_capa_workflow', {
  ticketId: "tkt_123",
  step: "IMPLEMENTATION",
  notes: {
    rootCauseAnalysis: "Missing null check in overtime calculation",
    correction: "Added validation in calculatePeriodVariables",
    prevention: "Added unit test to catch null overtime values"
  }
});
```

---

### SUPPORT.ANALYZE_TRENDS
**Purpose**: Identify top issues for feature prioritization  
**Input**: `dateRange`  
**Output**: `topIssues[]`, `totalTickets`, `averageResolutionTime`  

```typescript
const { trends } = await executeAction('support.analyze_trends', {
  dateRange: {
    start: "2024-01-01",
    end: "2024-03-31"
  }
});

console.log('Top 3 issues:');
trends.topIssues.forEach(issue => {
  console.log(`${issue.category}: ${issue.count} (${issue.percentage}%)`);
});
```

---

## 2. 👑 Platform Admin ("God Mode")

### ADMIN.PROVISION_TENANT
**Purpose**: Set up new facility with default settings  
**Input**: `facilityName`, `ownerEmail`, `plan`, `modules[]`, `address`  
**Output**: `facilityId`, `invitationSent`  

**Actions**:
1. Creates facility document
2. Seeds default config (break rules, overtime threshold)
3. Initializes billing status
4. Sends owner invitation

**Risk Level**: HIGH

```typescript
const { facilityId } = await executeAction('admin.provision_tenant', {
  facilityName: "Pharmacie Centrale",
  ownerEmail: "manager@pharmacie-centrale.ch",
  plan: "PRO",
  modules: ["calendar", "payroll", "marketplace"],
  address: {
    street: "Rue de la Gare 10",
    city: "Lausanne",
    zip: "1003",
    canton: "VD"
  }
});
```

---

### ADMIN.MANAGE_BILLING
**Purpose**: Activate, suspend, or cancel facility access  
**Input**: `facilityId`, `status` (ACTIVE/SUSPENDED/OVERDUE/CANCELLED), `reason`  

**Suspension Logic**:
- `SUSPENDED`: Read-only mode (hook.ts middleware blocks write actions)
- `OVERDUE`: Warning banners, limited functionality
- `CANCELLED`: Complete access revocation

**Risk Level**: HIGH

```typescript
await executeAction('admin.manage_billing', {
  facilityId: "fac_123",
  status: "SUSPENDED",
  reason: "Payment overdue for 30 days"
});
```

---

### ADMIN.IMPERSONATE_USER
**Purpose**: Debug tool to generate short-lived user token  
**Input**: `targetUserId`, `reason`, `durationMinutes` (default 15)  
**Output**: `customToken`, `expiresAt`  

**Security**:
- **CRITICAL AUDIT**: Heavily logged with severity: CRITICAL
- Use case: "I can't see the button!" → Admin logs in as user to debug

**Risk Level**: HIGH

```typescript
const { customToken, expiresAt } = await executeAction('admin.impersonate_user', {
  targetUserId: "usr_456",
  reason: "Debug missing button on payroll page",
  durationMinutes: 15
});

// Use customToken to sign in as user
```

---

### ADMIN.BROADCAST_SYSTEM_ALERT
**Purpose**: Global banner for all facilities  
**Input**: `message`, `title`, `type` (INFO/WARNING/DOWNTIME), `maintenanceWindow`, `targetFacilities[]`  
**Output**: `alertId`, `recipientCount`  

**Use Cases**:
- System maintenance announcements
- Feature updates
- Critical security alerts

```typescript
const { recipientCount } = await executeAction('admin.broadcast_system_alert', {
  title: "Scheduled Maintenance",
  message: "System will be unavailable tonight 02:00-03:00 CET",
  type: "DOWNTIME",
  maintenanceWindow: {
    start: "2024-03-15T02:00:00Z",
    end: "2024-03-15T03:00:00Z"
  }
});
```

---

## 3. 💼 Payroll Collaborators (Fiduciary Interface)

### FIDUCIARY.GET_CLIENT_DASHBOARD
**Purpose**: Unified view of all linked facilities  
**Input**: `fiduciaryId`  
**Output**: `clients[]` (facilityId, name, payrollStatus, lastExportDate, pendingCorrections)  

**Display**:
- Row: Pharmacy A | Status: LOCKED | Action: Export
- Row: Hospital B | Status: DRAFT | Action: Remind Manager

```typescript
const { clients } = await executeAction('fiduciary.get_client_dashboard', {
  fiduciaryId: "fid_789"
});

clients.forEach(client => {
  console.log(`${client.facilityName}: ${client.payrollStatus}`);
  if (client.pendingCorrections > 0) {
    console.warn(`${client.pendingCorrections} corrections needed`);
  }
});
```

---

### FIDUCIARY.BULK_EXPORT
**Purpose**: Generate ZIP with payroll data for multiple clients  
**Input**: `facilityIds[]`, `period`, `format` (SWISSDEC/ABACUS/CSV_GENERIC)  
**Output**: `zipUrl`, `filesIncluded`  

```typescript
const { zipUrl, filesIncluded } = await executeAction('fiduciary.bulk_export', {
  facilityIds: ["fac_123", "fac_456", "fac_789"],
  period: "2024-03",
  format: "SWISSDEC"
});

console.log(`Download ZIP: ${zipUrl}`);
console.log(`${filesIncluded} files included`);
```

---

### FIDUCIARY.FLAG_DISCREPANCY
**Purpose**: Reopen payroll period and send correction request  
**Input**: `facilityId`, `userId`, `period`, `note`  
**Output**: `discrepancyId`, `ticketId`  

**Actions**:
1. Reopens payroll period for specific user
2. Creates correction request ticket
3. Notifies facility manager

**Risk Level**: HIGH (modifies locked payroll data)

```typescript
const { discrepancyId, ticketId } = await executeAction('fiduciary.flag_discrepancy', {
  facilityId: "fac_123",
  userId: "usr_456",
  period: "2024-03",
  note: "Missing Child Allowance form - please provide documentation"
});
```

---

## Key Features

### 1. **AI-Powered Support (RAG)**
- Context-aware responses
- Confidence scoring
- Auto-escalation to human support
- Action suggestions

### 2. **CAPA Workflow**
- Automatic initialization for bugs/high severity
- Four-step process: Investigation → Implementation → Verification → Completion
- Quality assurance integration

### 3. **God Mode Admin**
- Tenant provisioning
- Billing management (suspend → read-only mode)
- User impersonation (15min tokens)
- System-wide alerts

### 4. **Fiduciary Multi-Tenant**
- Unified dashboard across clients
- Bulk export (ZIP with multiple formats)
- Correction requests with period reopening

---

## Firestore Collections

```
support_tickets/
  {ticketId}/
    - userId
    - facilityId
    - description
    - severity
    - isBug
    - status
    - capaId

capa_entries/
  {capaId}/
    - ticketId
    - rootCauseAnalysis
    - correction
    - prevention
    - verification
    - status

facility_profiles/
  {facilityId}/
    - name
    - plan
    - modules
    - status

billing_status/
  {facilityId}/
    - status: 'SUSPENDED'
    - suspendedAt
    - suspensionReason

fiduciary_client_links/
  {linkId}/
    - fiduciaryId
    - facilityId

payroll_discrepancies/
  {discrepancyId}/
    - facilityId
    - userId
    - period
    - note
    - status
```

---

## Security Rules

```javascript
// Support tickets: User + admin
match /support_tickets/{ticketId} {
  allow read: if request.auth.uid == resource.data.userId
    || request.auth.token.role == 'admin';
  allow create: if request.auth != null;
}

// CAPA entries: Admin only
match /capa_entries/{capaId} {
  allow read, write: if request.auth.token.role == 'admin';
}

// Billing status: Admin only
match /billing_status/{facilityId} {
  allow read: if request.auth.token.facilityId == facilityId
    || request.auth.token.role == 'admin';
  allow write: if request.auth.token.role == 'admin';
}

// Fiduciary access: Linked clients only
match /fiduciary_client_links/{linkId} {
  allow read: if request.auth.token.role == 'fiduciary'
    && request.auth.uid == resource.data.fiduciaryId;
}
```

---

## React Hooks

```typescript
// AI Support Agent
const useSupportAgent = () => {
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  const ask = async (query, context) => {
    setLoading(true);
    const { response } = await executeAction('support.ask_agent', { query, context });
    setResponse(response);
    setLoading(false);
  };

  return { ask, response, loading };
};

// Admin impersonation
const useImpersonate = () => {
  const impersonate = async (targetUserId, reason) => {
    const { customToken } = await executeAction('admin.impersonate_user', {
      targetUserId,
      reason
    });
    
    await signInWithCustomToken(auth, customToken);
  };

  return { impersonate };
};

// Fiduciary dashboard
const useFiduciaryDashboard = (fiduciaryId) => {
  const { clients } = useAction('fiduciary.get_client_dashboard', { fiduciaryId });
  
  return { clients };
};
```

---

## Middleware Integration

```typescript
// hook.ts - Block writes for suspended facilities
export async function executeAction(actionId, input, context) {
  const billingRef = doc(db, 'billing_status', context.facilityId);
  const billingSnap = await getDoc(billingRef);

  if (billingSnap.exists() && billingSnap.data().status === 'SUSPENDED') {
    const action = ActionRegistry[actionId];
    
    if (action.requiredPermission.includes('write')) {
      throw new Error('Facility suspended - read-only mode');
    }
  }

  // Continue with normal execution
}
```

---

## Testing

```typescript
// Test AI agent with low confidence
const { response } = await executeAction('support.ask_agent', {
  query: "How do I fix the flux capacitor?"
});
assert(response.confidence < 0.7);
assert(response.suggestedActions[0].actionId === 'support.create_ticket_with_capa');

// Test CAPA workflow
const { ticketId, capaId } = await executeAction('support.create_ticket_with_capa', {
  description: "Critical bug",
  severity: "CRITICAL",
  isBug: true
});
assert(capaId !== undefined);

// Test billing suspension
await executeAction('admin.manage_billing', {
  facilityId: 'fac_test',
  status: 'SUSPENDED'
});

try {
  await executeAction('calendar.create_shift', { /* ... */ });
} catch (error) {
  assert(error.message.includes('read-only mode'));
}

// Test fiduciary bulk export
const { zipUrl, filesIncluded } = await executeAction('fiduciary.bulk_export', {
  facilityIds: ['fac_1', 'fac_2'],
  period: '2024-03',
  format: 'SWISSDEC'
});
assert(filesIncluded === 2);
```

