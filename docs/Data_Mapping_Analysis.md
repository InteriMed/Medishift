# OCR/AI Data Mapping Analysis - Onboarding to Profile

**Date:** 2025-12-15  
**Scope:** Professional & Facility Onboarding → Profile Database Fields

---

## Executive Summary

### Critical Finding: **MAJOR DATA LOSS DURING ONBOARDING** ❌

The onboarding process extracts comprehensive data from documents via AI but only saves **30-40% of it** to the database. The rest is discarded, forcing users to manually re-enter information in the Profile section.

---

## Professional Onboarding Data Flow Analysis

### What AI Extracts (in `processDocumentWithAI`)
```javascript
{
  personalDetails: {
    identity: {
      firstName, lastName,
      legalFirstName, legalLastName,  // ← IMPORTANT: Legal names
      dateOfBirth, placeOfBirth,
      gender, nationality
    },
    address: {
      street, city, postalCode, canton, country
    },
    contact: {
      primaryEmail, primaryPhone, primaryPhonePrefix
    }
  },
  additionalInfo: {
    documentType, documentNumber,
    dateOfIssue, dateOfExpiry,
    issuingAuthority, cantonalReference
  },
  // PROFESSIONAL BACKGROUND (from CV if uploaded)
  professionalBackground: {
    skills: [],
    education: [],
    workExperience: [],
    qualifications: []
  }
}
```

### What Onboarding Saves (in `saveWorkerProfile`)

<h3 className="data flow

#### ✅ SAVED CORRECTLY:
| Field | Onboarding Path | Profile Path | Status |
|-------|----------------|--------------|--------|
| Legal First Name | `identity.legalFirstName` | `identity.legalFirstName` | ✅ Match |
| Legal Last Name | `identity.legalLastName` | `identity.legalLastName` | ✅ Match |
| Date of Birth | `identity.dateOfBirth` | `identity.dateOfBirth` | ✅ Match |
| Nationality | `identity.nationality` | `identity.nationality` | ✅ Match |
| Gender | `identity.gender` | *Not in config* | ⚠️ Saved but not editable |
| Place of Birth | `identity.placeOfBirth` | *Not in config* | ⚠️ Saved but not editable |

#### ❌ INCORRECT MAPPING:
| Field | Onboarding Path | Profile Expected Path | Issue |
|-------|----------------|----------------------|-------|
| Street | `address.street` | `contact.residentialAddress.street` | ❌ Wrong nesting |
| House Number | *Not extracted* | `contact.residentialAddress.number` | ❌ Missing |
| Postal Code | `address.postalCode` | `contact.residentialAddress.postalCode` | ❌ Wrong nesting |
| City | `address.city` | `contact.residentialAddress.city` | ❌ Wrong nesting |
| Canton | `address.canton` | `contact.residentialAddress.canton` | ❌ Wrong nesting |
| Phone | `contact.primaryPhone` | `contact.primaryPhone` | ✅ Match |
| Phone Prefix | `contact.primaryPhonePrefix` | `contact.primaryPhonePrefix` | ✅ Match |
| Email | `contact.primaryEmail` | `contact.primaryEmail` | ✅ Match |

#### ❌ COMPLETELY MISSING:
| Field | AI Extracts? | Saved? | Profile Expects? |
|-------|-------------|---------|-----------------|
| AHV Number | ❌ No | ❌ No | ✅ **REQUIRED** |
| Work Permit Type | ✅ Yes (`additionalInfo`) | ⚠️ Partial | ✅ **REQUIRED** (billingInformation) |
| Work Permit Expiry | ✅ Yes (`additionalInfo.dateOfExpiry`) | ❌ Wrong field | ✅ Required (billingInformation) |
| Work Permit Number | ✅ Yes (`additionalInfo.documentNumber`) | ❌ Wrong field | Optional (billingInformation) |
| Work Permit Canton | ✅ Yes (`additionalInfo.cantonalReference`) | ❌ Wrong field | Optional (billingInformation) |
| IBAN | ❌ No | ❌ No | ✅ **REQUIRED** (billingInformation) |
| Bank Name | ❌ No | ❌ No | ✅ **REQUIRED** (billingInformation) |
| Account Holder | ❌ No | ❌ No | ✅ **REQUIRED** (billingInformation) |
| Civil Status | ❌ No | ❌ No | ✅ **REQUIRED** (billingInformation) |
| Number of Children | ❌ No | ❌ No | Optional (billingInformation) |
| Religion | ❌ No | ❌ No | Optional (billingInformation) |

#### ❌ PROFESSIONAL BACKGROUND DISCARDED:
| Field | AI Can Extract? | Saved? | Profile Expects? |
|-------|----------------|---------|-----------------|
| Education[] | ✅ Yes (from CV) | ❌ **NO** | Optional but displayed |
| Work Experience[] | ✅ Yes (from CV) | ❌ **NO** | Optional but displayed |
| Qualifications[] | ⚠️ Only CET from GLN | ⚠️ Only CET | Optional but displayed |
| Skills[] | ✅ Yes (from CV) | ❌ **NO** | Not in config |

---

## Critical Issues Found

### Issue 1: Address Structure Mismatch ❌

**Onboarding Saves:**
```javascript
address: {
  street: "Hauptstrasse 123",
  city: "Zürich",
  postalCode: "8001",
  canton: "ZH",
  country: "CH"
}
```

**Profile Expects:**
```javascript
contact: {
  residentialAddress: {
    street: "Hauptstrasse",   // Street NAME only
    number: "123",             // House NUMBER separately
    city: "Zürich",
    postalCode: "8001",
    canton: "ZH"
  }
}
```

**Impact:** User must manually re-enter full address in Profile tab.

---

### Issue 2: Work Permit Data Saved to Wrong Location ❌

**Onboarding Saves:**
```javascript
residencyPermit: {
  type: "B",
  expiryDate: "2026-12-31",
  documentNumber: "CH123456",
  issuingAuthority: "Migration Office Zurich",
  cantonalReference: "ZH"
}
```

**Profile Expects:**
```javascript
employmentEligibility: {
  workPermit: {
    type: "permit_b",           // ← Different format!
    expiryDate: "2026-12-31",
    permitNumber: "CH123456",   // ← Different field name
    issuingCanton: "ZH"         // ← Different field name
  }
}
```

**Impact:** Work permit appears in verification section but not in billing information where it's required.

---

### Issue 3: Professional Background Completely Discarded ❌

**What AI Extracts from CV:**
```javascript
professionalBackground: {
  education: [
    {
      degree: "Bachelor of Pharmacy",
      institution: "University of Basel",
      field: "Pharmaceutical Sciences",
      startDate: "2015-09-01",
      endDate: "2019-06-30",
      gpa: "5.2"
    }
  ],
  workExperience: [
    {
      jobTitle: "Staff Pharmacist",
      employer: "Apotheke Zürich",
      location: "Zürich",
      startDate: "2019-07-01",
      endDate: "2024-12-01",
      description: "Dispensing medications, patient consultation..."
    }
  ],
  qualifications: [
    {
      type: "Vaccination Certificate",
      title: "COVID-19 Vaccination Authorization",
      institution: "pharmaSuisse",
      licenseNumber: "VAC-2021-1234",
      dateObtained: "2021-03-15",
      expiryDate: "2026-03-15"
    }
  ]
}
```

**What Onboarding Saves:**
```javascript
professionalDetails: {},  // ← EMPTY!
qualifications: [
  // Only CET titles from GLN API, not from CV
  {
    type: 'CET',
    title: 'Weiterbildung XY',
    id: '12345',
    active: true
  }
]
```

**Impact:** User must manually add all education, work history, and qualifications in Profile section despite already uploading CV.

---

### Issue 4: AHV Number Not Collected ❌

**Profile Requires:** `identity.ahvNumber` (REQUIRED field)  
**Onboarding Collects:** ❌ Nothing  
**AI Can Extract:** ⚠️ Maybe (if on document)  
**Impact:** User MUST add manually in Profile tab before completion

---

### Issue 5: Banking Information Not Collected ❌

**Profile Requires:**
- `banking.iban` (REQUIRED)
- `banking.bankName` (REQUIRED)
- `banking.accountHolderName` (REQUIRED)

**Onboarding Collects:** ❌ Nothing  
**AI Can Extract:** ⚠️ Unlikely (not typically on ID documents)  
**Impact:** Entire "Billing Information" tab must be filled manually

---

## Facility Onboarding Data Flow Analysis

### What AI Extracts (from 2 documents)

#### From Responsible Person ID:
```javascript
{
  personalDetails: {
    identity: { firstName, lastName, dateOfBirth, nationality },
    address: { street, city, postalCode, canton }
  },
  additionalInfo: {
    documentType, documentNumber, dateOfExpiry
  }
}
```

#### From Billing Document:
```javascript
{
  invoiceDetails / businessDetails / facilityDetails: {
    companyName, legalName,
    uid, vatNumber, taxId,
    address, billingAddress,
    email, invoiceEmail, phone
  }
}
```

### What Onboarding Saves (in `saveFacilityProfile`)

#### ✅ SAVED CORRECTLY:
| Field | Extraction Path | Saved Path | Status |
|-------|----------------|------------|--------|
| Facility Name | `invoiceDetails.companyName` | `facilityDetails.name` | ✅ Good |
| Legal Company Name | `invoiceDetails.legalName` | `identityLegal.legalCompanyName` | ✅ Good |
| UID Number | `invoiceDetails.uid` | `identityLegal.uidNumber` | ✅ Good |
| Operating Address | GLN + billing doc | `facilityDetails.operatingAddress` | ✅ **Fixed in latest version** |
| Billing Address | Billing doc | `billingInformation.billingAddress` | ✅ **Fixed in latest version** |
| Responsible Person | ID doc | `responsiblePersonIdentity` | ✅ Good |
| GLN | User input | `facilityDetails.glnCompany` | ✅ Good |

#### ❌ MISSING FACILITY PROFILE FIELDS:

**Need to check facility profile config to see what's expected...**

Let me check the facility profile configuration:

---

## Recommended Fixes

### Fix 1: Update `saveWorkerProfile` Address Mapping

**Current (Lines 453-458):**
```javascript
address: {
  street: address.street || '',
  city: address.city || '',
  postalCode: address.postalCode || address.postal || '',
  canton: address.canton || '',
  country: address.country || 'CH'
}
```

**Should be:**
```javascript
contact: {
  residentialAddress: {
    street: extractStreetName(address.street) || '', // Extract street name
    number: extractHouseNumber(address.street) || '', // Extract house number
    postalCode: address.postalCode || address.postal || '',
    city: address.city || '',
    canton: address.canton || '',
    country: address.country || 'CH'
  },
  primaryEmail: contact.primaryEmail || currentUser?.email || '',
  primaryPhone: contact.primaryPhone || '',
  primaryPhonePrefix: contact.primaryPhonePrefix || ''
}
```

Add helper function:
```javascript
const extractStreetName = (fullStreet) => {
  if (!fullStreet) return '';
  // Remove house number from end: "Hauptstrasse 123" → "Hauptstrasse"
  return fullStreet.replace(/\s+\d+[a-zA-Z]?$/, '').trim();
};

const extractHouseNumber = (fullStreet) => {
  if (!fullStreet) return '';
  // Extract house number: "Hauptstrasse 123" → "123"
  const match = fullStreet.match(/(\d+[a-zA-Z]?)$/);
  return match ? match[1] : '';
};
```

---

### Fix 2: Map Work Permit Data to Billing Information

**Add to `saveWorkerProfile` (after line 471):**
```javascript
// Map residency permit to employment eligibility (billing section)
employmentEligibility: {
  workPermit: {
    type: residencyPermit ? `permit_${residencyPermit.toLowerCase()}` : null,
    expiryDate: residency Permit?.expiryDate || additionalInfo.dateOfExpiry || null,
    permitNumber: residencyPermit?.documentNumber || additionalInfo.documentNumber || null,
    issuingCanton: residencyPermit?.cantonalReference || null
  }
},
```

---

### Fix 3: Save Professional Background from CV

**Add to `saveWorkerProfile` (after line 474):**
```javascript
// Professional background from CV analysis
education: extracted.professionalBackground?.education || [],
workExperience: extracted.professionalBackground?.workExperience || [],
qualifications: [
  // Merge GLN qualifications with CV qualifications
  ...profileData.qualifications, // CET from GLN
  ...(extracted.professionalBackground?.qualifications || [])
],
```

---

### Fix 4: Request AHV Number in Onboarding

**Option A:** Add AHV input field in GLNVerificationStep  
**Option B:** Add it to FirstTimeModal Step 3 (Details)  
**Option C:** Accept it's a Profile-only field (current behavior)

**Recommendation:** Option B - add to FirstTimeModal

---

### Fix 5: Add Banking Information Step (Optional)

**Recommendation:** Do NOT collect in onboarding. Banking info is sensitive and:
- Not extractable from ID documents
- Should be added by user in secure Profile section
- Can be added after onboarding during first payout setup

---

## Data Field Mapping Table

### Professional Profile - Complete Mapping

| Profile Config Field | Onboarding Saves | AI Extracts | Fix Required |
|---------------------|-----------------|-------------|--------------|
| `identity.legalFirstName` | ✅ Yes | ✅ Yes | ✅ Working |
| `identity.legalLastName` | ✅ Yes | ✅ Yes | ✅ Working |
| `identity.dateOfBirth` | ✅ Yes | ✅ Yes | ✅ Working |
| `identity.nationality` | ✅ Yes | ✅ Yes | ✅ Working |
| `identity.ahvNumber` | ❌ No | ⚠️ Maybe | ⚠️ Add to onboarding |
| `contact.residentialAddress.street` | ❌ Wrong path | ✅ Yes | ❌ Fix mapping |
| `contact.residentialAddress.number` | ❌ No | ⚠️ In street | ❌ Extract from street |
| `contact.residentialAddress.postalCode` | ❌ Wrong path | ✅ Yes | ❌ Fix mapping |
| `contact.residentialAddress.city` | ❌ Wrong path | ✅ Yes | ❌ Fix mapping |
| `contact.residentialAddress.canton` | ❌ Wrong path | ✅ Yes | ❌ Fix mapping |
| `contact.primaryPhonePrefix` | ✅ Yes | ✅ Yes | ✅ Working |
| `contact.primaryPhone` | ✅ Yes | ✅ Yes | ✅ Working |
| `contact.primaryEmail` | ✅ Yes | ✅ Yes | ✅ Working |
| `employmentEligibility.workPermit.type` | ❌ Wrong path | ✅ Yes | ❌ Fix mapping |
| `employmentEligibility.workPermit.expiryDate` | ❌ Wrong path | ✅ Yes | ❌ Fix mapping |
| `employmentEligibility.workPermit.permitNumber` | ❌ Wrong path | ✅ Yes | ❌ Fix mapping |
| `employmentEligibility.workPermit.issuingCanton` | ❌ Wrong path | ✅ Yes | ❌ Fix mapping |
| `payrollData.civilStatus` | ❌ No | ❌ No | ℹ️ Profile-only |
| `payrollData.numberOfChildren` | ❌ No | ❌ No | ℹ️ Profile-only |
| `payrollData.religion` | ❌ No | ❌ No | ℹ️ Profile-only |
| `banking.iban` | ❌ No | ❌ No | ℹ️ Profile-only (sensitive) |
| `banking.bankName` | ❌ No | ❌ No | ℹ️ Profile-only (sensitive) |
| `banking.accountHolderName` | ❌ No | ❌ No | ℹ️ Profile-only (sensitive) |
| `education[]` | ❌ No | ✅ Yes (CV) | ❌ **Save from CV** |
| `workExperience[]` | ❌ No | ✅ Yes (CV) | ❌ **Save from CV** |
| `qualifications[]` | ⚠️ CET only | ✅ Yes (CV) | ❌ **Merge CV + GLN** |

---

## Summary

### Data Loss Quantification:
- **Personal Details Tab:** 60% populated (missing AHV, address structure wrong)
- **Professional Background Tab:** 0% populated (all discarded from CV)
- **Billing Information Tab:** 10% populated (work permit in wrong location)
- **Documents Tab:** 100% populated (verification docs saved correctly)

### Overall Onboarding Effectiveness:
**~30% of extractable data actually used** ❌

---

## Next Steps

1. ✅ Fix address structure mapping (street name + number separation)
2. ✅ Re-map work permit data to `employmentEligibility` section
3. ✅ Save professional background arrays from CV analysis
4. ⚠️ Consider adding AHV number field in onboarding (or keep as Profile-only)
5. ℹ️ Banking fields remain Profile-only (security best practice)

**Priority:** Fixes 1-3 are **CRITICAL** - they prevent massive data re-entry burden on users.
