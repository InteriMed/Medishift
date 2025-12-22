# 🇨🇭 Swiss Compliance Roadmap – Implementation Plan

**Project:** InteriMed Healthcare Staffing Platform  
**Compliance Territory:** Switzerland (GDPR + Swiss FADP)  
**Last Updated:** 2025-12-11

---

## 📋 TABLE OF CONTENTS

1. [Infrastructure & Compliance Audit](#1-infrastructure--compliance-audit)
2. [Phase 1: Interim Marketplace MVP](#2-phase-1-interim-marketplace-mvp)
3. [Phase 2: SaaS Scheduler & Chains](#3-phase-2-saas-scheduler--chains)
4. [Data Lifecycle Management](#4-data-lifecycle-management)
5. [Implementation Checklist](#5-implementation-checklist)

---

## 1. INFRASTRUCTURE & COMPLIANCE AUDIT

### 1.1 Current Status

**Firebase Project:** `medishift-620fd`

#### ✅ Completed
- Firestore rules deployed with `payroll_requests` collection
- Security rules for tutorials and user access in place
- Storage CORS configuration exists (`storage.cors.json`)

#### ⚠️ Needs Verification

| Component | Required Region | Current Status | Action Required |
|-----------|----------------|----------------|-----------------|
| Firebase Project | `europe-west6` (Zurich) | ❓ Unknown | Verify in Firebase Console |
| Storage Bucket | `europe-west6` | ❓ Unknown | Check bucket location |
| Firestore Database | `europe-west6` | ❓ Unknown | Verify database region |
| Cloud Functions | `europe-west6` | ⚠️ Likely mixed v1/v2 | Migrate all to v2 with region |
| Vision API (OCR) | `eu-vision.googleapis.com` | ❓ Not configured | Add endpoint override |
| Vertex AI (Gemini) | `europe-west3` (Frankfurt) | ❓ Not configured | Set location param |

### 1.2 Infrastructure Tasks

#### Task 1.1: Verify Firebase Project Region
```bash
# Manual check required in Firebase Console
# Navigate to: Project Settings → General → Default GCP resource location
# Expected: europe-west6 (Zurich)
```

**If incorrect:** You'll need to create a new Firebase project in the correct region and migrate data.

#### Task 1.2: Configure Cloud Functions for EU
**File:** `functions/config.js`

Add regional configuration:
```javascript
module.exports = {
  region: 'europe-west6',
  aiRegion: 'europe-west3', // For Gemini
  visionEndpoint: 'eu-vision.googleapis.com',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  loggingLevel: process.env.LOGGING_LEVEL,
};
```

#### Task 1.3: Update Legal Documents
**Files to Create/Update:**
- `frontend/public/privacy-policy.html`
- `frontend/public/terms-of-service.html`

**Required Clauses:**
1. **Privacy Policy:**
   - "Data storage: Switzerland (Zurich, europe-west6)"
   - "AI processing: Germany (Frankfurt, europe-west3)"
   - "OCR processing: EU (eu-vision.googleapis.com)"
   - Swiss FADP compliance statement
   - Right to data portability & deletion

2. **Terms of Service:**
   - **Non-Circumvention Clause:** "CHF 2,000 penalty for direct hiring within 12 months"
   - **Role Definition:** "InteriMed acts as an Intermediary, not Employer"
   - **PayrollPlus Partnership:** Staff leasing provider disclosure
   - Governing law: Swiss Code of Obligations

---

## 2. PHASE 1: INTERIM MARKETPLACE MVP

### 2.1 Legal & Financial Model

#### Entity Status
- **Current:** Sole Proprietorship (Level 0) ✅
- **License Strategy:**
  - Start as "Pilot" (Free)
  - Apply for **Private Placement License (Geneva)** upon first commission contract

#### Partner Integration: PayrollPlus
**Money Flow:**
```
Pharmacy → PayrollPlus (Invoice) 
         ↓
    Worker (Salary)
         ↓
    You (Commission)
```

**Contact:** partners@payrollplus.ch

### 2.2 Database Modifications

#### Task 2.1: Add Billing Fields to `facilityProfiles`

**File:** Create migration script or update Cloud Function

**New Required Fields:**
```javascript
facilityProfiles/{facilityId} {
  // Existing fields...
  
  // NEW: Billing Information
  billing: {
    companyName: string,        // Legal entity name
    address: {
      street: string,
      postalCode: string,
      city: string,
      canton: string
    },
    uidNumber: string,          // Swiss VAT/UID (e.g., CHE-123.456.789)
    invoiceEmail: string,       // Billing contact
    glnNumber: string           // Swiss Health GLN
  }
}
```

**Implementation:**
1. Update Firestore schema
2. Add validation in security rules
3. Update frontend profile forms
4. Create migration for existing facilities

#### Task 2.2: Create `payroll_requests` Collection

**Status:** ✅ Already in `firestore.rules` (lines 232-236)

**Schema to implement:**
```javascript
payroll_requests/{requestId} {
  // Request Metadata
  requestId: string,
  createdAt: timestamp,
  status: 'pending' | 'sent' | 'confirmed' | 'paid',
  
  // Parties
  pharmacyUid: string,          // Firestore UID
  pharmacyProfile: {
    companyName: string,
    glnNumber: string,
    billingEmail: string
  },
  
  workerUid: string,
  workerProfile: {
    fullName: string,
    glnNumber: string,          // Optional
    email: string
  },
  
  // Shift Details
  shiftDetails: {
    date: timestamp,
    startTime: string,          // HH:mm
    endTime: string,
    duration: number,           // hours
    role: string,               // "Pharmacist", "PTA", etc.
    hourlyRate: number          // CHF
  },
  
  // Financial
  financials: {
    workerGrossPay: number,     // What worker receives
    totalCost: number,          // What pharmacy pays
    commission: number,         // Your markup
    markup: number              // Percentage (e.g., 15)
  },
  
  // PayrollPlus Integration
  payrollData: {
    emailSentAt: timestamp,
    csvExportPath: string,      // Storage path
    confirmationReceived: boolean
  }
}
```

**Security Rule:** ✅ Already deployed

### 2.3 Critical Features

#### Task 2.3: Safe OCR Onboarding

**Goal:** Verify pharmacy address using bill/letterhead (NO patient data)

**File:** `functions/api/verifyDocument.js` (or create new)

**AI Prompt Guardrail:**
```javascript
const SAFE_OCR_PROMPT = `
Extract ONLY business information from this document:
- Company/Pharmacy Name
- Business Address (Street, Postal Code, City)
- GLN Number (if visible)
- UID/VAT Number (if visible)

CRITICAL: 
- DO NOT extract any patient names
- DO NOT extract any medical information
- DO NOT extract any prescription data
- ONLY extract company letterhead/invoice header information

If you detect patient data, return: { error: "Patient data detected, cannot process" }

Return JSON format:
{
  "companyName": "...",
  "address": {
    "street": "...",
    "postalCode": "...",
    "city": "..."
  },
  "gln": "...",
  "uid": "..."
}
`;
```

**Implementation Steps:**
1. Create Cloud Function `verifyPharmacyDocument`
2. Configure Vision API endpoint: `eu-vision.googleapis.com`
3. Configure Gemini location: `europe-west3`
4. Add prompt guardrail
5. Update frontend onboarding flow

#### Task 2.4: Payroll Email Integration (MVP)

**File:** Create `functions/services/payrollService.js`

**Function:** Send structured email to PayrollPlus

```javascript
const functions = require('firebase-functions/v2');
const { defineSecret } = require('firebase-functions/params');
const nodemailer = require('nodemailer');

const SENDGRID_API_KEY = defineSecret('SENDGRID_API_KEY');

exports.sendPayrollRequest = functions
  .region('europe-west6')
  .firestore
  .onDocumentCreated('payroll_requests/{requestId}', async (event) => {
    const data = event.data.data();
    
    // Generate CSV
    const csvContent = generatePayrollCSV(data);
    
    // Send email to PayrollPlus
    const transporter = nodemailer.createTransport({
      service: 'SendGrid',
      auth: {
        user: 'apikey',
        pass: SENDGRID_API_KEY.value()
      }
    });
    
    await transporter.sendMail({
      from: 'billing@interimed.ch',
      to: 'partners@payrollplus.ch',
      subject: `New Staff Request - ${data.pharmacyProfile.companyName}`,
      text: `Please find attached staff request for ${data.workerProfile.fullName}`,
      attachments: [{
        filename: `payroll-${data.requestId}.csv`,
        content: csvContent
      }]
    });
  });
```

#### Task 2.5: Pilot Mode (0 CHF Fees)

**File:** `frontend/src/components/PricingDisplay.js` (or relevant)

**Implementation:**
```javascript
const PILOT_MODE = {
  enabled: true,
  endDate: '2025-02-28', // 8 weeks from now
  message: 'Pilot Program: 0% commission until Feb 28, 2025'
};

function calculateFees(baseAmount) {
  if (PILOT_MODE.enabled && new Date() < new Date(PILOT_MODE.endDate)) {
    return {
      commission: 0,
      total: baseAmount,
      message: PILOT_MODE.message
    };
  }
  
  // Normal pricing
  return {
    commission: baseAmount * 0.15,
    total: baseAmount * 1.15,
    message: null
  };
}
```

---

## 3. PHASE 2: SaaS SCHEDULER & CHAINS

### 3.1 Architecture Upgrades (Chains)

#### Task 3.1: Create `organizations` Collection

**Schema:**
```javascript
organizations/{organizationId} {
  // Basic Info
  name: string,                 // "Amavita Geneva Group"
  type: 'chain' | 'group',
  createdAt: timestamp,
  
  // Facilities
  memberFacilityIds: string[],  // Array of facilityProfile IDs
  
  // Administration
  admins: string[],             // Array of user UIDs (Chain-level admins)
  
  // Settings
  settings: {
    consolidatedBilling: boolean,
    sharedStaffPool: boolean,
    crossFacilityScheduling: boolean,
    billingEmail: string,
    invoiceConsolidation: 'monthly' | 'per-shift'
  },
  
  // Metadata
  status: 'active' | 'inactive',
  updatedAt: timestamp
}
```

#### Task 3.2: Update `facilityProfiles` with Organization Link

**Add field:**
```javascript
facilityProfiles/{facilityId} {
  // Existing fields...
  
  organizationId: string | null,  // Links to organizations/{id}
  
  // Role in organization
  organizationRole: 'headquarters' | 'branch' | null
}
```

#### Task 3.3: Firestore Security Rules for Organizations

**Add to `firestore.rules`:**
```javascript
// Organizations collection
match /organizations/{organizationId} {
  function isOrgAdmin() {
    return isAuthenticated() && 
           request.auth.uid in resource.data.admins;
  }
  
  function isMemberFacilityAdmin() {
    return isAuthenticated() && 
           exists(/databases/$(database)/documents/facilityProfiles/$(request.auth.uid)) &&
           get(/databases/$(database)/documents/facilityProfiles/$(request.auth.uid)).data.organizationId == organizationId;
  }
  
  allow read: if isOrgAdmin() || isMemberFacilityAdmin();
  allow create: if isAuthenticated(); // Platform creates
  allow update: if isOrgAdmin();
  allow delete: if false; // Soft delete only
}
```

#### Task 3.4: Chain Admin Sync Function

**File:** Create `functions/triggers/organizationSync.js`

```javascript
const functions = require('firebase-functions/v2');
const admin = require('firebase-admin');

// Sync chain admins to all member facilities
exports.syncChainAdmins = functions
  .region('europe-west6')
  .firestore
  .onDocumentUpdated('organizations/{orgId}', async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    
    // Check if admins changed
    if (JSON.stringify(before.admins) === JSON.stringify(after.admins)) {
      return null;
    }
    
    const db = admin.firestore();
    const batch = db.batch();
    
    // Update all member facilities
    for (const facilityId of after.memberFacilityIds) {
      const facilityRef = db.collection('facilityProfiles').doc(facilityId);
      batch.update(facilityRef, {
        'chainAdmins': after.admins,
        'updatedAt': admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    await batch.commit();
    console.log(`Synced ${after.memberFacilityIds.length} facilities`);
  });
```

### 3.2 Scheduler Data Layer

#### Task 3.5: Create `staffing_requirements` Collection

**Schema:**
```javascript
staffing_requirements/{requirementId} {
  facilityId: string,
  organizationId: string | null,
  
  // Schedule Pattern (The "Perfect Week")
  schedule: {
    monday: {
      pharmacists: { min: 2, ideal: 3 },
      pta: { min: 1, ideal: 2 },
      shifts: [
        { start: '08:00', end: '12:00', role: 'Pharmacist' },
        { start: '13:00', end: '18:30', role: 'Pharmacist' }
      ]
    },
    tuesday: { /* ... */ },
    // ... other days
  },
  
  // Analytics
  analytics: {
    avgWeeklyHours: number,
    peakDays: string[],
    understaffingRisk: 'low' | 'medium' | 'high'
  },
  
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### Task 3.6: Create `shifts` Collection

**Schema:**
```javascript
shifts/{shiftId} {
  // Location
  facilityId: string,
  organizationId: string | null,
  
  // Timing
  date: timestamp,
  startTime: string,           // HH:mm
  endTime: string,
  duration: number,            // hours
  
  // Staffing
  role: string,                // "Pharmacist", "PTA"
  assignedUserId: string | null,
  userType: 'internal_employee' | 'internal_interim' | 'external_freelancer',
  
  // Status
  status: 'open' | 'filled' | 'confirmed' | 'completed' | 'cancelled',
  
  // Financial
  estimatedCost: number,       // CHF
  actualCost: number | null,
  
  // Metadata
  createdBy: string,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### Task 3.7: Create `leaves` Collection

**Schema:**
```javascript
leaves/{leaveId} {
  // Employee
  userId: string,
  facilityId: string,
  organizationId: string | null,
  
  // Leave Details
  type: 'sick' | 'vacation' | 'unpaid' | 'maternity' | 'other',
  startDate: timestamp,
  endDate: timestamp,
  totalDays: number,
  
  // Status
  status: 'pending' | 'approved' | 'rejected',
  approvedBy: string | null,
  
  // Documentation
  documentUrl: string | null,   // Sick note, etc.
  notes: string,
  
  // Metadata
  requestedAt: timestamp,
  processedAt: timestamp | null
}
```

#### Task 3.8: Firestore Rules for Scheduler Collections

**Add to `firestore.rules`:**
```javascript
// Staffing Requirements
match /staffing_requirements/{requirementId} {
  allow read: if isAuthenticated();
  allow write: if isAuthenticated() && 
                  isFacilityAdmin(resource.data.facilityId);
}

// Shifts
match /shifts/{shiftId} {
  allow read: if isAuthenticated();
  allow create: if isAuthenticated() && 
                   isFacilityAdmin(request.resource.data.facilityId);
  allow update: if isAuthenticated() && (
    isFacilityAdmin(resource.data.facilityId) ||
    resource.data.assignedUserId == request.auth.uid
  );
  allow delete: if isAuthenticated() && 
                   isFacilityAdmin(resource.data.facilityId);
}

// Leaves
match /leaves/{leaveId} {
  allow read: if isAuthenticated() && (
    resource.data.userId == request.auth.uid ||
    isFacilityAdmin(resource.data.facilityId)
  );
  allow create: if isAuthenticated() && 
                   request.resource.data.userId == request.auth.uid;
  allow update: if isAuthenticated() && (
    resource.data.userId == request.auth.uid ||
    isFacilityAdmin(resource.data.facilityId)
  );
  allow delete: if false;
}
```

### 3.3 Internal Interim Feature

#### Task 3.9: Smart Staffing Algorithm

**File:** Create `functions/services/staffingAlgorithm.js`

```javascript
/**
 * Smart staffing search:
 * 1. Check internal employees (same facility)
 * 2. Check internal interims (same organization)
 * 3. Check external freelancers
 */
async function findAvailableStaff(shiftData) {
  const db = admin.firestore();
  const results = {
    internal_employees: [],
    internal_interims: [],
    external_freelancers: []
  };
  
  // 1. Search same facility employees
  const facilityEmployees = await db
    .collection('professionalProfiles')
    .where('currentEmployer.facilityId', '==', shiftData.facilityId)
    .where('status', '==', 'active')
    .get();
  
  for (const doc of facilityEmployees.docs) {
    if (await isAvailable(doc.id, shiftData.date, shiftData.startTime)) {
      results.internal_employees.push({
        ...doc.data(),
        uid: doc.id,
        cost: 0, // No extra cost
        priority: 1
      });
    }
  }
  
  // 2. Search organization interims
  if (shiftData.organizationId) {
    const orgInterims = await db
      .collection('professionalProfiles')
      .where('organizations', 'array-contains', shiftData.organizationId)
      .where('availableForInterim', '==', true)
      .get();
    
    for (const doc of orgInterims.docs) {
      if (await isAvailable(doc.id, shiftData.date, shiftData.startTime)) {
        results.internal_interims.push({
          ...doc.data(),
          uid: doc.id,
          cost: calculateInternalInterimCost(doc.data(), shiftData),
          priority: 2
        });
      }
    }
  }
  
  // 3. Search external freelancers
  const freelancers = await db
    .collection('professionalProfiles')
    .where('accountType', '==', 'freelancer')
    .where('status', '==', 'active')
    .get();
  
  for (const doc of freelancers.docs) {
    if (await isAvailable(doc.id, shiftData.date, shiftData.startTime)) {
      results.external_freelancers.push({
        ...doc.data(),
        uid: doc.id,
        cost: calculateExternalCost(doc.data(), shiftData),
        priority: 3
      });
    }
  }
  
  return results;
}
```

#### Task 3.10: Cross-Facility Billing Report

**File:** Create `functions/api/reports.js`

```javascript
exports.generateCrossFacilityReport = functions
  .region('europe-west6')
  .https
  .onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated');
    }
    
    const { organizationId, startDate, endDate } = data;
    
    // Get all internal interim shifts
    const shiftsSnapshot = await admin.firestore()
      .collection('shifts')
      .where('organizationId', '==', organizationId)
      .where('userType', '==', 'internal_interim')
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .where('status', '==', 'completed')
      .get();
    
    // Group by facility pairs
    const report = {};
    shiftsSnapshot.forEach(doc => {
      const shift = doc.data();
      const key = `${shift.homeFacilityId} → ${shift.facilityId}`;
      
      if (!report[key]) {
        report[key] = {
          totalHours: 0,
          totalCost: 0,
          shifts: []
        };
      }
      
      report[key].totalHours += shift.duration;
      report[key].totalCost += shift.actualCost || shift.estimatedCost;
      report[key].shifts.push(shift);
    });
    
    return report;
  });
```

---

## 4. DATA LIFECYCLE MANAGEMENT

### 4.1 Firing/Termination Workflow

#### Task 4.1: Create Termination Function

**File:** Create `functions/services/employeeTermination.js`

```javascript
const functions = require('firebase-functions/v2');
const admin = require('firebase-admin');

exports.terminateEmployee = functions
  .region('europe-west6')
  .https
  .onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated');
    }
    
    const { userId, facilityId, reason, effectiveDate } = data;
    const db = admin.firestore();
    
    // Verify caller is facility admin
    const facilityDoc = await db.collection('facilityProfiles').doc(facilityId).get();
    if (!facilityDoc.data().admins.includes(context.auth.uid)) {
      throw new functions.https.HttpsError('permission-denied');
    }
    
    // 1. Remove from facility
    await db.collection('facilityProfiles').doc(facilityId).update({
      employees: admin.firestore.FieldValue.arrayRemove(userId),
      admins: admin.firestore.FieldValue.arrayRemove(userId)
    });
    
    // 2. Update professional profile
    await db.collection('professionalProfiles').doc(userId).update({
      'currentEmployer.facilityId': null,
      'currentEmployer.endDate': effectiveDate,
      'currentEmployer.status': 'terminated',
      'employmentHistory': admin.firestore.FieldValue.arrayUnion({
        facilityId,
        endDate: effectiveDate,
        reason
      })
    });
    
    // 3. Revoke auth token (force logout)
    await admin.auth().revokeRefreshTokens(userId);
    
    // 4. Cancel future shifts
    const futureShifts = await db.collection('shifts')
      .where('assignedUserId', '==', userId)
      .where('facilityId', '==', facilityId)
      .where('date', '>', new Date(effectiveDate))
      .get();
    
    const batch = db.batch();
    futureShifts.forEach(doc => {
      batch.update(doc.ref, {
        status: 'cancelled',
        assignedUserId: null,
        cancellationReason: 'Employee terminated',
        cancelledAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });
    await batch.commit();
    
    // 5. Create audit log
    await db.collection('audit_logs').add({
      type: 'employee_termination',
      userId,
      facilityId,
      performedBy: context.auth.uid,
      effectiveDate,
      reason,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return { success: true, shiftsUnassigned: futureShifts.size };
  });
```

### 4.2 Soft Delete (Anonymization)

#### Task 4.2: Account Deletion with Legal Retention

**File:** Create `functions/services/accountDeletion.js`

```javascript
const functions = require('firebase-functions/v2');
const admin = require('firebase-admin');

/**
 * Swiss Code of Obligations: Keep financial records for 10 years
 */
exports.deleteAccount = functions
  .region('europe-west6')
  .https
  .onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated');
    }
    
    const userId = context.auth.uid;
    const db = admin.firestore();
    
    // 1. Anonymize personal data
    const anonymizedData = {
      fullName: `DELETED_USER_${userId.substring(0, 8)}`,
      email: `deleted_${userId}@anonymized.local`,
      phone: null,
      dateOfBirth: null,
      address: null,
      
      // Keep for legal compliance
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      deletionReason: data.reason || 'user_request',
      accountStatus: 'deleted',
      
      // Retain flags for audit
      hadContracts: false,
      hadPayments: false,
      retentionUntil: null  // Will be set below
    };
    
    // 2. Check if user has financial records
    const contracts = await db.collection('contracts')
      .where('parties.professional.profileId', '==', userId)
      .get();
    
    const payrollRequests = await db.collection('payroll_requests')
      .where('workerUid', '==', userId)
      .get();
    
    if (!contracts.empty || !payrollRequests.empty) {
      // Must retain for 10 years (Swiss law)
      const retentionDate = new Date();
      retentionDate.setFullYear(retentionDate.getFullYear() + 10);
      
      anonymizedData.hadContracts = !contracts.empty;
      anonymizedData.hadPayments = !payrollRequests.empty;
      anonymizedData.retentionUntil = retentionDate;
      
      // Keep anonymized profile
      await db.collection('professionalProfiles').doc(userId).update(anonymizedData);
      
    } else {
      // No financial records, can fully delete
      await db.collection('professionalProfiles').doc(userId).delete();
      await db.collection('users').doc(userId).delete();
    }
    
    // 3. Delete Auth account
    await admin.auth().deleteUser(userId);
    
    // 4. Create audit log (permanent)
    await db.collection('audit_logs').add({
      type: 'account_deletion',
      userId,
      deletionType: anonymizedData.hadContracts ? 'anonymized' : 'full',
      retentionUntil: anonymizedData.retentionUntil,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return {
      success: true,
      deletionType: anonymizedData.hadContracts ? 'anonymized_retained' : 'full_delete',
      retentionUntil: anonymizedData.retentionUntil
    };
  });
```

#### Task 4.3: Automated Cleanup (After 10 Years)

**File:** Create `functions/scheduled/cleanup.js`

```javascript
const functions = require('firebase-functions/v2');
const admin = require('firebase-admin');

exports.cleanupExpiredRecords = functions
  .region('europe-west6')
  .scheduler
  .onSchedule('0 2 * * 0', async (event) => {  // Every Sunday at 2 AM
    const db = admin.firestore();
    const now = new Date();
    
    // Find profiles past retention period
    const expiredProfiles = await db.collection('professionalProfiles')
      .where('accountStatus', '==', 'deleted')
      .where('retentionUntil', '<=', now)
      .get();
    
    console.log(`Found ${expiredProfiles.size} expired profiles`);
    
    const batch = db.batch();
    let count = 0;
    
    expiredProfiles.forEach(doc => {
      batch.delete(doc.ref);
      count++;
      
      if (count >= 500) {  // Firestore batch limit
        return;
      }
    });
    
    if (count > 0) {
      await batch.commit();
    }
    
    // Log cleanup
    await db.collection('audit_logs').add({
      type: 'automated_cleanup',
      recordsDeleted: count,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return { deletedProfiles: count };
  });
```

---

## 5. IMPLEMENTATION CHECKLIST

### 🟢 Part 1: Infrastructure & Compliance

- [ ] **1.1** Verify Firebase project region (europe-west6)
- [ ] **1.2** Verify Storage bucket region (europe-west6)
- [ ] **1.3** Verify Firestore region (europe-west6)
- [ ] **1.4** Update `functions/config.js` with EU regions
- [ ] **1.5** Configure Vision API endpoint (`eu-vision.googleapis.com`)
- [ ] **1.6** Configure Vertex AI location (`europe-west3`)
- [ ] **1.7** Create Privacy Policy with data location disclosure
- [ ] **1.8** Create Terms of Service with Non-Circumvention Clause
- [ ] **1.9** Migrate all Cloud Functions to v2 with region specification
- [ ] **1.10** Deploy updated firestore.rules

### 🟡 Part 2: Phase 1 (Marketplace MVP)

- [ ] **2.1** Add billing fields to `facilityProfiles` schema
- [ ] **2.2** Update frontend profile forms for billing info
- [ ] **2.3** Create data migration for existing facilities
- [ ] **2.4** Implement `payroll_requests` collection schema
- [ ] **2.5** Create Safe OCR document verification function
- [ ] **2.6** Configure AI prompt guardrails (no patient data)
- [ ] **2.7** Implement PayrollPlus email integration
- [ ] **2.8** Create CSV export function for payroll data
- [ ] **2.9** Implement Pilot Mode (0 CHF fees) in frontend
- [ ] **2.10** Test end-to-end shift → payroll flow
- [ ] **2.11** Apply for Geneva Private Placement License

### 🔵 Part 3: Phase 2 (Scheduler & Chains)

- [ ] **3.1** Create `organizations` collection schema
- [ ] **3.2** Add `organizationId` field to `facilityProfiles`
- [ ] **3.3** Update firestore.rules for organizations
- [ ] **3.4** Implement chain admin sync function
- [ ] **3.5** Create `staffing_requirements` collection
- [ ] **3.6** Create `shifts` collection schema
- [ ] **3.7** Create `leaves` collection schema
- [ ] **3.8** Update firestore.rules for scheduler collections
- [ ] **3.9** Implement smart staffing algorithm
- [ ] **3.10** Build cross-facility billing report
- [ ] **3.11** Create frontend scheduler UI
- [ ] **3.12** Test internal interim workflow

### 🔴 Part 4: Data Lifecycle

- [ ] **4.1** Implement employee termination function
- [ ] **4.2** Test termination workflow (shifts, auth, audit)
- [ ] **4.3** Implement soft delete with anonymization
- [ ] **4.4** Create 10-year retention logic
- [ ] **4.5** Implement automated cleanup scheduler
- [ ] **4.6** Test full account deletion flow
- [ ] **4.7** Document data retention policies

---

## 📊 PRIORITY MATRIX

### Week 1: Foundation
1. Infrastructure audit (1.1-1.6)
2. Legal documents (1.7-1.8)
3. Functions migration to v2 (1.9)

### Week 2-3: Phase 1 Core
1. Billing schema (2.1-2.3)
2. Payroll collection (2.4)
3. Safe OCR (2.5-2.6)
4. Email integration (2.7-2.8)

### Week 4-5: Phase 1 Polish
1. Pilot mode (2.9)
2. End-to-end testing (2.10)
3. License application (2.11)

### Week 6-8: Phase 2 Foundation
1. Organizations schema (3.1-3.4)
2. Scheduler collections (3.5-3.8)

### Week 9-10: Phase 2 Features
1. Staffing algorithm (3.9)
2. Cross-facility billing (3.10)

### Week 11-12: Data Lifecycle
1. Termination workflow (4.1-4.2)
2. Deletion policies (4.3-4.7)

---

## 🚨 CRITICAL WARNINGS

1. **Region Lock-In**: Firebase project region CANNOT be changed after creation. If incorrect, you MUST migrate to a new project.

2. **GDPR Compliance**: All AI processing MUST stay in EU. Never allow fallback to US regions.

3. **Financial Records**: 10-year retention is MANDATORY under Swiss law. Cannot be shortened.

4. **PayrollPlus Partnership**: Get written confirmation of API/email integration before launch.

5. **License Requirement**: Operating without license = illegal. Apply IMMEDIATELY upon first paid contract.

---

**Next Steps:** Review this roadmap and confirm which phase to start with. I recommend beginning with **Infrastructure Audit (Part 1)** to ensure compliance foundation before building features.
