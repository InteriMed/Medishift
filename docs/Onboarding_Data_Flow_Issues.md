# Onboarding Information Extraction and Workspace Selection Issues

**Date:** 2025-12-15  
**Scope:** Professional/Facility Onboarding & Workspace Selection Behavior

---

## Executive Summary

Critical inconsistencies found in:
1. **Information extraction and saving** during onboarding for both professionals and facilities
2. **Workspace selection** logic creating confusing defaults and "blinking" behavior
3. **Role separation** between professional and facility profiles
4. **Data structure misalignment** between frontend collection and backend storage

---

## Issue 1: Professional Onboarding - Data Extraction and Storage Misalignment

### Problem Description

**Location:** `GLNVerificationStep.js` → `saveWorkerProfile()` (Lines 412-520)

The professional onboarding flow extracts comprehensive data from identity documents via AI but **only saves a subset** of this data to the backend, leading to data loss.

### Data Flow Analysis

#### What AI Extracts (from `processDocumentWithAI`):
```javascript
{
  personalDetails: {
    identity: {
      firstName, lastName, legalFirstName, legalLastName,
      dateOfBirth, placeOfBirth, gender, nationality
    },
    address: {
      street, city, postalCode, canton, country
    },
    contact: {
      primaryEmail, primaryPhone, primaryPhonePrefix
    }
  },
  additionalInfo: {
    documentType, documentNumber, dateOfIssue, dateOfExpiry,
    issuingAuthority, cantonalReference
  }
}
```

#### What Gets Saved to Backend (Line 438-500):
- ✅ Identity information (mapped correctly)
- ✅ Address (mapped correctly)
- ✅ Contact (partially - only if not in `extracted` data)
- ✅ Residency permit info (correctly extracted from `additionalInfo`)
- ✅ Document metadata in `verification.verificationDocuments`
- ❌ **Missing:** Professional background details
- ❌ **Missing:** Employment history
- ❌ **Missing:** Education/qualifications (except GLN-derived CET titles)

### Specific Issues

1. **Incomplete Contact Information:**
   ```javascript
   // Line 459-463
   contact: {
     primaryEmail: contact.primaryEmail || currentUser?.email || '',
     primaryPhone: contact.primaryPhone || '',
     primaryPhonePrefix: contact.primaryPhonePrefix || ''
   }
   ```
   **Issue:** Falls back to `currentUser.email` if AI didn't extract email, but this might not match the verified document. Should warn user if mismatch detected.

2. **Residency Permit Determination:**
   ```javascript
   // Lines 428-436
   if (additionalInfo.documentType) {
     const docType = additionalInfo.documentType.toUpperCase();
     if (docType.includes('PERMIT_B')) residencyPermit = 'B';
     // ... etc
   }
   ```
   **Issue:** Relies on string matching which is fragile. AI should return structured `permitType` field directly.

3. **Professional Details Discarded:**
   ```javascript
   // Line 474
   professionalDetails: extracted.professionalBackground || {},
   ```
   **Issue:** `extracted.professionalBackground` is likely `null` or `{}` since AI was called with `documentType = 'identity'`, not configured to extract professional details from ID cards.

### Recommended Fixes

1. **Frontend (`GLNVerificationStep.js`):**
   - Add validation to warn if document email differs from user's current email
   - Request AI to extract professional background if document type is Professional ID/Authorization Card
   - Show user a review screen of extracted data before submission

2. **Backend (`updateUserProfile` in `database/index.js`):**
   - Add validation to ensure critical fields are present
   - Log warnings when expected fields are missing

---

## Issue 2: Facility Onboarding - Data Extraction and Storage Consistency

### Problem Description

**Location:** `GLNVerificationStep.js` → `saveFacilityProfile()` (Lines 525-639)

Facility onboarding combines data from two documents (responsible person ID + billing doc) but has **inconsistent field mapping** and **potential data overwrites**.

### Data Flow Analysis

#### Input Sources:
1. **Responsible Person ID Document** → `idResult.data`
2. **Billing/Tax Document** → `billResult.data`
3. **GLN Company Data** → `glnData` (if provided)

#### Field Mapping Conflicts:

```javascript
// Line 553: Facility Name Logic
facilityDetails: {
  name: bag.name || invoiceDetails.companyName || invoiceDetails.legalName || idPersonalDetails.identity?.legalFirstName || ''
}
```

**Issues:**
- Falls back to `idPersonalDetails.identity.legalFirstName` (person's first name) if no company name found
- This creates nonsensical facility names like "John" instead of "John's Pharmacy"

```javascript
// Line 565-567: Legal Name Duplication
identityLegal: {
  legalCompanyName: invoiceDetails.legalName || billingInfo.legalName || bag.name || ''
},
billingInformation: {
  legalName: invoiceDetails.legalName || billingInfo.legalName || bag.name
}
```

**Issue:** Same data stored in two places with slightly different fallback chains. Single source of truth principle violated.

### Specific Issues

1. **Address Ambiguity:**
   ```javascript
   // Lines 571-576
   billingAddress: {
     street: invoiceAddress.street || idAddress.street || '',
     city: invoiceAddress.city || idAddress.city || '',
     // ...
   }
   ```
   **Issue:** Billing address falls back to responsible person's home address. These should be separate fields:
   - `facilityDetails.operatingAddress` (physical location)
   - `billingInformation.billingAddress` (invoice address)
   - `responsiblePersonIdentity.address` (person's home)

2. **Responsible Person Data Structure:**
   ```javascript
   // Lines 538-547
   responsiblePersonIdentity: {
     firstName: idIdentity.firstName || idIdentity.legalFirstName || '',
     // ...
     documentType: idAdditionalInfo.documentType || null
   }
   ```
   **Issue:** Mixes identity information with document metadata. Should separate:
   - `responsiblePersons` (array of verified persons)
   - `verificationDocuments` (document metadata)

3. **UID Number Extraction:**
   ```javascript
   // Line 301
   uidNumber: extractedBill.uid || extractedBill.vatNumber || extractedBill.taxId || extractedBill.registrationNumber
   ```
   **Issue:** Swiss UID format is `CHE-XXX.XXX.XXX`. Should validate format and show warning if multiple identifiers found.

### Recommended Fixes

1. **Separate Address Types:**
   ```javascript
   facilityDetails: {
     operatingAddress: { /* from GLN or user input */ },
   },
   billingInformation: {
     billingAddress: { /* from bill doc */ }
   },
   responsiblePersons: [{
     identity: { /* from ID */ },
     residentialAddress: { /* from ID if available */ }
   }]
   ```

2. **Validate Business Identifiers:**
   - UID format: `CHE-\d{3}\.\d{3}\.\d{3}`
   - Show warning if billing doc UID ≠ GLN company UID

3. **Add Review Step:**
   - Show user extracted data from both documents
   - Allow manual correction before submission

---

## Issue 3: Workspace Selection Logic (Critical Bug)

### Problem Description  
**As documented in `Workspace_Role_Analysis.md`:**

**Location:** `sessionAuth.js` → `getAvailableWorkspaces()` (Lines 253-298)

The workspace detection logic has a **critical ordering bug** that prevents facility users from seeing their Facility Workspace.

### The Bug

```javascript
// Lines 259-268: Facility Workspace (FIRST)
if (userData.role === 'facility' || userData.role === 'company') {
  workspaces.push({
    id: userData.uid,
    name: userData.companyName || userData.displayName || 'Facility Workspace',
    type: WORKSPACE_TYPES.TEAM,
    facilityId: userData.uid,
    role: 'admin',
    description: 'Manage your facility profile and operations'
  });
}

// Lines 271-278: Personal Workspace (SECOND)
if (hasProfessionalAccess(userData)) {
  workspaces.push({
    id: 'personal',
    name: 'Personal Workspace',
    type: WORKSPACE_TYPES.PERSONAL,
    description: 'Manage your professional profile and marketplace activities'
  });
}
```

**Combined with:**

```javascript
// Lines 59-77: hasProfessionalAccess check
const hasProfessionalAccess = (userData) => {
  if (!userData) return false;
  if (userData.role === 'professional') return true; // ✅
  
  if (!userData.roles) return false;
  if (userData.roles.includes('professional')) return true;
  
  // BUG: Returns true for facility admins/employees
  const facilityRoles = userData.roles.filter(role =>
    role.startsWith('facility_admin_') || role.startsWith('facility_employee_')
  );
  return facilityRoles.length > 0; // ❌ Returns TRUE for facility users
};
```

### Bug Impact

For a user with `role: 'facility'`:
1. **Line 259-268:** Facility Workspace added ✅
2. **Line 271:** `hasProfessionalAccess(userData)` returns `true` ❌ (because `userData.roles` includes `facility_admin_xyz`)
3. **Line 272-278:** Personal Workspace ALSO added ❌
4. **Result:** User sees BOTH workspaces even though they only have a facility profile

### Auto-Selection Bug

**Location:** `DashboardContext.js` → Lines 556-559

```javascript
} else if (availableWorkspaces.length > 0) {
  // Auto-select first available workspace if none saved
  console.log('[DashboardContext] Auto-selecting first available workspace');
  switchWorkspace(availableWorkspaces[0]); // ❌ Always selects first
}
```

**Issue:**  
Since Facility Workspace is added first (line 259), but Personal Workspace might be more relevant for dual-role users, the auto-selection doesn't consider the user's **primary role** or **last active workspace**.

### "Blinking" Behavior Root Cause

The workspace selector "blinks" because:

1. **Initial Render:** No workspace selected → Shows "Select Workspace"
2. **First Effect Run:** `availableWorkspaces` populated → Auto-selects `[0]` (Facility)
3. **Cookie Restoration:** Saved workspace (Professional) found → Switches to Professional
4. **Session Validation:** If session expired → Switches back to Facility
5. **Result:** Rapid switching creates visual "blink"

### Recommended Fixes

1. **Fix `hasProfessionalAccess` Logic:**
   ```javascript
   const hasProfessionalAccess = (userData) => {
     if (!userData) return false;
     
     // Check singular role (primary indicator)
     if (userData.role === 'professional') return true;
     
     // Check multi-role array for professional role
     if (userData.roles && userData.roles.includes('professional')) return true;
     
     // DON'T grant professional access just because user admins a facility
     return false;
   };
   ```

2. **Explicit Dual-Role Support:**
   ```javascript
   const hasDualRoleAccess = (userData) => {
     const hasProRole = userData.role === 'professional' || 
                        (userData.roles && userData.roles.includes('professional'));
     
     const hasFacRole = userData.role === 'facility' || 
                        (userData.roles && userData.roles.includes('facility')) ||
                        (userData.roles && userData.roles.some(r => r.startsWith('facility_')));
     
     return hasProRole && hasFacRole;
   };
   ```

3. **Prioritize Workspace Selection:**
   ```javascript
   // In DashboardContext.js
   else if (availableWorkspaces.length > 0) {
     // Prioritize based on user's primary role
     const primaryWorkspace = availableWorkspaces.find(w => 
       (user.role === 'facility' && w.type === WORKSPACE_TYPES.TEAM) ||
       (user.role === 'professional' && w.type === WORKSPACE_TYPES.PERSONAL)
     ) || availableWorkspaces[0];
     
     switchWorkspace(primaryWorkspace);
   }
   ```

4. **Prevent Blinking:**
   ```javascript
   // Add loading state in workspace selector
   const [isInitializing, setIsInitializing] = useState(true);
   
   useEffect(() => {
     if (user && workspaces.length > 0 && selectedWorkspace) {
       setIsInitializing(false);
     }
   }, [user, workspaces, selectedWorkspace]);
   
   // Hide selector until initialized
   if (isInitializing) return <div>Loading workspace...</div>;
   ```

---

## Issue 4: Backend Profile Update Function

### Problem Description

**Location:** `functions/database/index.js` → `updateUserProfile()` (Lines 144-245)

The backend function ONLY updates `users` collection and role-specific profile collections (`professionalProfiles` or `facilityProfiles`), but **onboarding may need to create additional documents** such as:

- `facilityMemberships` for professionals joining a team
- `availabilitySettings` for new professionals
- `billingAccounts` for new facilities

### Specific Issues

1. **No Transaction Support:**
   ```javascript
   // Lines 202-209: Update users collection
   await db.collection('users').doc(userId).update(userFieldsToUpdate);
   
   // Lines 217-228: Update profile collection
   await profileDocRef.update(profileFieldsToUpdate);
   ```
   **Issue:** If second update fails, first update succeeds → **partial data state**.

2. **No Workspace Membership Creation:**
   - Professional onboarding with "Join Team" selected saves `selectedCompany` to `onboardingProgress` but **doesn't create `facilityMemberships` entry**
   - Facility can't add the professional until they manually create the link

3. **Role Field Ambiguity:**
   ```javascript
   // Lines 196-197
   userFieldsToUpdate.role = currentRole;
   userFieldsToUpdate.profileType = currentProfileType;
   ```
   **Issue:** 
   - `role: 'facility'` stored in `users` collection
   - But workspace logic also checks `userData.roles` (array)
   - Which is authoritative?

### Recommended Fixes

1. **Use Firestore Transactions:**
   ```javascript
   await db.runTransaction(async (transaction) => {
     transaction.update(userDocRef, userFieldsToUpdate);
     transaction.set(profileDocRef, profileFieldsToUpdate, { merge: true });
     // Additional writes as needed
   });
   ```

2. **Create Supporting Documents:**
   ```javascript
   // For professional onboarding
   if (data.role === 'professional' && !profileDoc.exists) {
     // Create availability settings
     await db.collection('availabilitySettings').doc(userId).set({
       defaultAvailability: [],
       autoApprove: false,
       createdAt: FieldValue.serverTimestamp()
     });
   }
   
   // For facility onboarding
   if (data.role === 'facility' && !profileDoc.exists) {
     // Initialize facility members array
     await db.collection('facilityProfiles').doc(userId).set({
       ...profileFieldsToUpdate,
       admin: [userId],
       employees: [],
       pendingInvites: []
     });
   }
   ```

3. **Standardize Role Representation:**
   - **Single Role Users:** `role: 'professional'` OR `role: 'facility'`
   - **Dual Role Users:** `role: 'professional'` + `roles: ['professional', 'facility']`
   - **Workspace Logic:** Check `roles` array if exists, otherwise check singular `role`

---

## Issue 5: Onboarding Progress Persistence

### Problem Description

**Location:** `FirstTimeModal.js` → `saveOnboardingProgress()` (Lines 192-212)

Onboarding progress is saved to `users.onboardingProgress.{onboardingType}`, but:
- Progress for GLN verification step is NOT saved incrementally
- If user refreshes during document upload in Step 4, **all uploads lost**

### Data Structure

```javascript
{
  onboardingProgress: {
    professional: {
      step: 4,
      role: 'worker',
      isEmployed: true,
      accessTeam: true,
      selectedCompany: { id: 1, name: "Acme Healthcare" },
      hasGLN: true,
      completed: false,
      updatedAt: Timestamp
    },
    facility: {
      step: 3,
      role: 'company',
      completed: false,
      updatedAt: Timestamp
    }
  }
}
```

**Missing:**
- `glnValue` (the GLN being verified)
- `documentUploadStatus` (which documents have been uploaded)
- `verificationAttempts` (how many times they tried)

### Specific Issues

1. **Document Upload Not Persisted:**
   ```javascript
   // GLNVerificationStep.js Line 332-349
   const path = isFacilityUpload
     ? `documents/facilities/${userId}/${subfolder}/${normalizedFileName}`
     : `documents/${userId}/${subfolder}/${normalizedFileName}`;
   
   const downloadURL = await uploadFile(file, path, (progress) => {
     if (onProgress) onProgress(progress);
   });
   ```
   **Issue:** File uploaded to storage but **no database record created** until `updateUserProfile` called at end. If browser crashes, file orphaned in storage.

2. **No Recovery from Partial Completion:**
   - User uploads documents → AI processing fails → Error shown
   - User refreshes page → Back to Step 4 start → Must re-upload documents
   - Previous uploads remain in storage but unreferenced

### Recommended Fixes

1. **Persist Uploaded Documents Immediately:**
   ```javascript
   const uploadDocument = async (file, userId, subfolder, onProgress, isFacilityUpload = false) => {
     // ... existing upload logic ...
     
     // Save reference to database immediately
     await db.collection('users').doc(userId).update({
       [`temporaryUploads.${subfolder}`]: {
         downloadURL,
         storagePath: path,
         fileName: file.name,
         uploadedAt: FieldValue.serverTimestamp(),
         verified: false
       }
     });
     
     return { downloadURL, storagePath: path };
   };
   ```

2. **Resume Onboarding from Partial State:**
   ```javascript
   useEffect(() => {
     const loadPreviousUploads = async () => {
       const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
       const tempUploads = userDoc.data()?.temporaryUploads || {};
       
       if (tempUploads.identity && !documentFile) {
         // Show "Resume previous upload?" prompt
         setDocumentFile({ /* reconstruct from tempUploads */ });
       }
     };
     
     if (step === 4 && currentUser) {
       loadPreviousUploads();
     }
   }, [step, currentUser]);
   ```

3. **Cleanup Temporary Uploads on Completion:**
   ```javascript
   // In saveWorkerProfile and saveFacilityProfile
   await profileDocRef.set(profileData);
   
   // Move temp uploads to verified documents
   await db.collection('users').doc(userId).update({
     temporaryUploads: FieldValue.delete()
   });
   ```

---

## Issue 6: Data Validation and Error Handling

### Missing Validations

1. **No GLN Format Validation:**
   ```javascript
   // GLNVerificationStep.js Lines 100-105
   if (isGLNProvided) {
     if (!/^\d{13}$/.test(glnString)) {
       setVerificationError("GLN must be exactly 13 digits.");
       return;
     }
   }
   ```
   **Missing:** Checksum validation for GLN (uses Luhn algorithm)

2. **No Document-GLN Cross-Validation:**
   ```javascript
   // Lines 208-222: Name matching logic
   const nameMatch = bagName.includes(extractedLastName) || extractedLastName.includes(bagName);
   ```
   **Issue:** Too permissive. "Smith" matches "Smithson". Should use fuzzy matching with confidence score.

3. **No Date Validation:**
   - Document expiry date not checked against current date
   - User could upload expired passport/permit

### Missing Error Recovery

1. **AI Processing Failure:**
   - If `processDocumentWithAI` fails, user forced to re-upload
   - Should offer manual data entry fallback

2. **Network Failure:**
   - If `updateUserProfile` call fails after documents uploaded, no retry mechanism
   - User sees error but doesn't know if data was saved

### Recommended Fixes

1. **Add GLN Checksum Validation:**
   ```javascript
   const validateGLN = (gln) => {
     if (!/^\d{13}$/.test(gln)) return false;
     
     // Luhn algorithm checksum
     let sum = 0;
     for (let i = 0; i < 12; i++) {
       let digit = parseInt(gln[i]);
       if ((12 - i) % 2 === 0) {
         digit *= 2;
         if (digit > 9) digit -= 9;
       }
       sum += digit;
     }
     const checkDigit = (10 - (sum % 10)) % 10;
     return checkDigit === parseInt(gln[12]);
   };
   ```

2. **Validate Document Dates:**
   ```javascript
   if (additionalInfo.dateOfExpiry) {
     const expiryDate = new Date(additionalInfo.dateOfExpiry);
     const now = new Date();
     
     if (expiryDate < now) {
       throw new Error('Document has expired. Please upload a valid document.');
     }
     
     // Warn if expiring within 3 months
     const threeMonthsFromNow = new Date();
     threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
     if (expiryDate < threeMonthsFromNow) {
       setWarning('Your document will expire soon. Please renew it.');
     }
   }
   ```

3. **Manual Data Entry Fallback:**
   ```javascript
   const handleAIProcessingError = (error) => {
     setShowManualEntryOption(true);
     setVerificationError(
       'Automatic document processing failed. You can enter data manually or try uploading again.'
     );
   };
   ```

---

## Summary of Recommendations

### High Priority (P0)

1. ✅ **Fix `hasProfessionalAccess` logic** in `sessionAuth.js` → Prevents workspace confusion
2. ✅ **Implement workspace priority selection** in `DashboardContext.js` → Eliminates blinking
3. ✅ **Add transaction support** to `updateUserProfile` → Prevents partial data states
4. ✅ **Persist document uploads immediately** → Allows recovery from failures

### Medium Priority (P1)

5. ✅ **Separate address types in facility profile** → Improves data accuracy
6. ✅ **Add GLN checksum validation** → Prevents invalid entries
7. ✅ **Validate document expiry dates** → Ensures compliance
8. ✅ **Add manual data entry fallback** → Improves user experience

### Low Priority (P2)

9. ✅ **Add data review step before submission** → Reduces errors
10. ✅ **Improve name matching algorithm** → Reduces false rejections
11. ✅ **Create supporting documents on onboarding completion** → Reduces manual setup

---

## Implementation Plan

### Phase 1: Critical Workspace Fixes (Immediate)
- [ ] Update `sessionAuth.js` → `hasProfessionalAccess` logic
- [ ] Update `DashboardContext.js` → Workspace prioritization
- [ ] Test workspace selection for all role combinations

### Phase 2: Data Persistence (Week 1)
- [ ] Add transaction support to `updateUserProfile`
- [ ] Implement temporary upload persistence
- [ ] Add resume-from-partial-completion logic

### Phase 3: Validation & Error Handling (Week 2)
- [ ] Add GLN checksum validation
- [ ] Add document date validation
- [ ] Implement manual data entry fallback
- [ ] Add data review step

### Phase 4: Data Structure Refinement (Week 3)
- [ ] Separate facility address types
- [ ] Create supporting documents on completion
- [ ] Add facility membership auto-creation

### Phase 5: Testing & QA (Week 4)
- [ ] End-to-end test: Professional onboarding → GLN + Document → Launch dashboard
- [ ] End-to-end test: Facility onboarding → 2 documents → Launch dashboard
- [ ] Edge case test: Network failure during upload
- [ ] Edge case test: Expired document upload
- [ ] Edge case test: GLN mismatch with document

---

**Last Updated:** 2025-12-15  
**Next Review:** After Phase 1 completion
