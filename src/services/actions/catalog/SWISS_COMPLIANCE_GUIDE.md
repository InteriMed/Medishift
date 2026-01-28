# Swiss-Specific Compliance & Risk Management

## Overview
Complete Swiss labor law compliance, continuing education tracking (FPH), audit readiness (SECO), and risk management (CIRS).

---

## 1. ⏰ On-Call Management ("Piquet")

### TIME.DECLARE_PIQUET_INTERVENTION
**Purpose**: Switch from on-call to active work (Swiss healthcare requirement)  
**Input**: `date`, `startTime`, `endTime`, `patientCaseId`, `travelTimeMinutes`, `comment`  
**Output**: `interventionId`, `compensationRate` (150%), `totalHours`  

**Swiss Context**:
- On-call: ~5 CHF/hr to hold phone
- Intervention: 150% rate + travel time
- **Resets 11h rest clock**

```typescript
const { interventionId, compensationRate } = await executeAction('time.declare_piquet_intervention', {
  date: "2024-03-15",
  startTime: "23:30",
  endTime: "01:45",
  travelTimeMinutes: 30,
  comment: "Emergency dispensing"
});
// Returns: compensationRate: 1.5, totalHours: 2.75
```

---

## 2. 🕵️ SECO Audit Compliance

### TIME.GENERATE_SECO_REPORT
**Purpose**: PDF formatted for Swiss labor inspection  
**Input**: `userId`, `dateRange`  
**Output**: `reportUrl`, `entriesIncluded`  

**Shows**:
- Start/End times
- Break duration
- Rest time (11h rule compliance)

**Hides**:
- Salary
- Patient info
- Chat logs

```typescript
const { reportUrl } = await executeAction('time.generate_seco_report', {
  dateRange: {
    start: "2024-01-01",
    end: "2024-03-31"
  }
});
```

---

### TIME.GRANT_AUDITOR_ACCESS
**Purpose**: Create temporary guest account for inspector  
**Input**: `email`, `expiryHours` (default 24), `auditorName`  
**Output**: `auditorId`, `temporaryPassword`, `expiresAt`  

**Access**:
- Routes: `/time/audit`, `/docs/compliance` only
- Permissions: `time.audit_view`, `docs.compliance_view`
- Auto-expires after 24 hours

**Risk Level**: HIGH (creates system access)

```typescript
const { temporaryPassword, expiresAt } = await executeAction('time.grant_auditor_access', {
  email: "inspector@seco.admin.ch",
  auditorName: "Hans Müller",
  expiryHours: 24
});
```

---

## 3. 🎓 Education & Licenses (FPH)

### EDUCATION.LOG_FPH_CREDITS
**Purpose**: Add continuing education points to pharmacist's digital wallet  
**Input**: `userId`, `points`, `date`, `topic`, `category`, `proofFileUrl`  

**Categories**:
- `CLINICAL_PHARMACY` (min 15 points required)
- `PHARMACEUTICAL_CARE`
- `MANAGEMENT`
- `OTHER`

```typescript
await executeAction('education.log_fph_credits', {
  userId: "usr_123",
  points: 5,
  date: "2024-03-10",
  topic: "New Anticoagulation Guidelines",
  category: "CLINICAL_PHARMACY",
  proofFileUrl: "https://storage.example.com/certs/cert_123.pdf"
});
```

---

### EDUCATION.CHECK_COMPLIANCE_STATUS
**Purpose**: Verify pharmacist license status  
**Input**: `userId`  
**Output**: `status`, `totalPoints`, `requiredPoints`, `categoryBreakdown`, `message`  

**Status Levels**:
- `SAFE`: ≥50 points, ≥15 clinical pharmacy
- `WARNING`: ≥35 points (70%)
- `NON_COMPLIANT`: <35 points (cannot be Responsible Pharmacist)

**Scheduler Integration**: Non-compliant pharmacists cannot be assigned as "Resp. Pharma"

```typescript
const { status, totalPoints, message } = await executeAction('education.check_compliance_status', {
  userId: "usr_123"
});

if (status === 'NON_COMPLIANT') {
  console.warn('License at risk - cannot be Responsible Pharmacist');
}
```

---

### EDUCATION.MANAGE_APPRENTICESHIP
**Purpose**: Lock school days in scheduler for CFC (Swiss vocational training)  
**Input**: `userId`, `schoolDays[]`, `schoolName`, `cfcStartDate`, `cfcEndDate`  

**Action**:
- Permanently blocks school days (e.g., Mondays & Tuesdays)
- Prevents manager from accidentally booking apprentices on school days

```typescript
await executeAction('education.manage_apprenticeship', {
  userId: "usr_456",
  schoolDays: [1, 2],
  schoolName: "École de Pharmacie Genève",
  cfcStartDate: "2024-08-01",
  cfcEndDate: "2027-07-31"
});
```

---

## 4. 🛡️ Risk & Crisis Management

### RISK.BLOCK_USER
**Purpose**: Instant ban + scheduler purge (theft, misconduct)  
**Input**: `targetUserId`, `scope`, `reason`, `severity`  

**Scope**:
- `THIS_FACILITY`: Banned from single pharmacy
- `ENTIRE_ORG`: Network-wide blacklist

**Actions**:
1. Blocks user from seeing missions
2. Deletes all future shifts
3. Sets user status to `BLOCKED`

**Risk Level**: HIGH

```typescript
await executeAction('risk.block_user', {
  targetUserId: "usr_789",
  scope: "ENTIRE_ORG",
  reason: "Theft of controlled substances",
  severity: "CRITICAL"
});
```

---

### RISK.TRIGGER_CRISIS_ALERT
**Purpose**: Emergency broadcast (bypasses DND settings)  
**Input**: `message`, `title`, `channel`, `targetAudience`, `facilityId`, `role`  

**Channels**:
- `SMS_BLAST`: Bulk SMS
- `PUSH`: Push notifications
- `EMAIL`: Email blast
- `ALL`: All channels

**Use Cases**:
- "Recall of Batch X"
- "Cyberattack - Do not open emails"
- "Immediate lockdown"

**Bypasses**: User "Do Not Disturb" settings

```typescript
const { recipientCount } = await executeAction('risk.trigger_crisis_alert', {
  title: "URGENT: Product Recall",
  message: "Batch XYZ-123 recalled immediately. Remove from shelves.",
  channel: "ALL",
  targetAudience: "ALL_STAFF"
});
```

---

### RISK.REPORT_INCIDENT
**Purpose**: Critical Incident Reporting System (CIRS - Swiss hospitals)  
**Input**: `type`, `description`, `isAnonymous`, `severity`, `locationFacilityId`, `dateOccurred`  

**Types**:
- `MEDICATION_ERROR`
- `NEAR_MISS`
- `PATIENT_FALL`
- `DATA_BREACH`
- `THEFT`
- `OTHER`

**Anonymity**: Strictly anonymous but aggregated for Quality Officer

```typescript
const { incidentId, isAnonymous } = await executeAction('risk.report_incident', {
  type: "NEAR_MISS",
  description: "Almost dispensed 10mg instead of 1mg due to similar packaging",
  isAnonymous: true,
  severity: "HIGH",
  dateOccurred: "2024-03-15"
});
```

---

## Key Swiss Compliance Features

### 1. **Piquet (On-Call) Management**
- Tracks transition from on-call (5 CHF/hr) to active work (150%)
- Includes travel time compensation
- **Resets 11h rest rule clock**

### 2. **SECO Readiness**
- Generate inspector-ready PDFs
- Temporary auditor accounts (24h expiry)
- Privacy protection (hides salary, patient data)

### 3. **FPH License Tracking**
- 50 points required annually
- 15 points in Clinical Pharmacy category
- Scheduler integration (blocks non-compliant as Resp. Pharma)

### 4. **CFC Apprenticeship**
- Permanent school day locks
- Prevents accidental scheduling on education days

### 5. **CIRS Integration**
- Anonymous incident reporting
- Quality management aggregation
- Swiss hospital standard compliance

---

## Firestore Collections

```
piquet_interventions/
  {interventionId}/
    - userId
    - activeMinutes
    - travelTimeMinutes
    - compensationRate: 1.5
    - lastInterventionType: "PIQUET"

fph_credits/
  {creditId}/
    - userId
    - points
    - category
    - proofFileUrl

fph_wallets/
  {userId}/
    - totalPoints
    - categoryPoints
      - CLINICAL_PHARMACY
      - PHARMACEUTICAL_CARE

apprenticeships/
  {userId}/
    - schoolDays: [1, 2]
    - cfcStartDate
    - cfcEndDate

user_blocklist/
  {userId}/
    - scope: 'ENTIRE_ORG'
    - reason
    - severity

cirs_incidents/
  {incidentId}/
    - type
    - reportedBy: 'ANONYMOUS'
    - reportedByHash (for safety tracking)
```

---

## Security Rules

```javascript
// SECO reports: Admin only
match /seco_reports/{reportId} {
  allow read: if request.auth.token.role == 'admin';
  allow write: if request.auth.token.role == 'admin';
}

// Temporary auditors: Restricted routes
match /temporary_auditors/{auditorId} {
  allow read: if request.auth.uid == auditorId 
    && resource.data.expiresAt > request.time;
}

// FPH wallets: User + manager
match /fph_wallets/{userId} {
  allow read: if request.auth.uid == userId 
    || request.auth.token.role in ['admin', 'manager'];
  allow write: if request.auth.token.role in ['admin', 'hr_admin'];
}

// CIRS incidents: Strictly anonymous
match /cirs_incidents/{incidentId} {
  allow read: if request.auth.token.role == 'quality_officer';
  allow create: if request.auth != null;
}
```

---

## React Hooks

```typescript
// Check FPH compliance before assigning
const usePharmacistCompliance = (userId) => {
  const { status, message } = useAction('education.check_compliance_status', { userId });
  
  if (status === 'NON_COMPLIANT') {
    alert('Cannot assign as Responsible Pharmacist: ' + message);
  }
  
  return { status, message };
};

// Piquet intervention tracker
const usePiquetIntervention = () => {
  const [declaring, setDeclaring] = useState(false);
  
  const declare = async (date, startTime, endTime, travelTime) => {
    setDeclaring(true);
    const result = await executeAction('time.declare_piquet_intervention', {
      date, startTime, endTime, travelTimeMinutes: travelTime
    });
    setDeclaring(false);
    return result;
  };

  return { declare, declaring };
};
```

---

## Cloud Functions

```javascript
// Auto-check FPH compliance monthly
exports.checkMonthlyFphCompliance = functions.pubsub
  .schedule('0 0 1 * *')
  .onRun(async (context) => {
    const usersQuery = await db.collection('users')
      .where('role', '==', 'pharmacist')
      .get();

    for (const userDoc of usersQuery.docs) {
      const { status } = await checkComplianceStatus(userDoc.id);
      
      if (status === 'NON_COMPLIANT') {
        await sendNotification(userDoc.id, 
          'FPH Credits Required: Your license is at risk'
        );
      }
    }
  });

// Auto-expire auditor accounts
exports.cleanupExpiredAuditors = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async (context) => {
    const expiredQuery = await db.collection('temporary_auditors')
      .where('expiresAt', '<', new Date())
      .get();

    for (const auditorDoc of expiredQuery.docs) {
      await auth.deleteUser(auditorDoc.data().uid);
      await auditorDoc.ref.delete();
    }
  });
```

---

## Testing

```typescript
// Test piquet intervention with rest rule reset
const { interventionId } = await executeAction('time.declare_piquet_intervention', {
  date: '2024-03-15',
  startTime: '23:00',
  endTime: '01:00',
  travelTimeMinutes: 20
});

const restTracker = await getDoc(doc(db, 'rest_tracking', userId));
assert(restTracker.data().lastInterventionType === 'PIQUET');

// Test FPH compliance blocking
await executeAction('education.log_fph_credits', { points: 10 });
const { status } = await executeAction('education.check_compliance_status', { userId });
assert(status === 'WARNING');

// Test SECO report generation
const { reportUrl } = await executeAction('time.generate_seco_report', {
  dateRange: { start: '2024-01-01', end: '2024-03-31' }
});
assert(reportUrl.includes('seco_report'));
```

---

## Migration Checklist

- [ ] Deploy Swiss-specific actions to registry
- [ ] Configure FPH point requirements (50 total, 15 clinical)
- [ ] Set up piquet compensation rates (1.5x + travel)
- [ ] Create SECO report template PDF
- [ ] Configure auditor auto-expiry cron job
- [ ] Test CFC school day locks in scheduler
- [ ] Set up CIRS anonymous reporting workflow
- [ ] Configure crisis alert bypass logic
- [ ] Train staff on incident reporting (CIRS)
- [ ] Document FPH compliance check for managers

