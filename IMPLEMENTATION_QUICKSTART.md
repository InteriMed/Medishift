# 🚀 Quick Start Implementation Guide

Based on your roadmap and current codebase analysis.

## ✅ ALREADY DONE

1. **Regional Configuration:** `europe-west6` set globally in `functions/index.js`
2. **BAG Admin Functions:** Already migrated to v2 syntax
3. **Firestore Rules:** `payroll_requests` collection rules deployed
4. **Security Rules:** Tutorial and user access rules in place

---

## 🔥 IMMEDIATE ACTIONS (This Week)

### Priority 1: Infrastructure Verification

**Run these checks manually:**

```bash
# 1. Check Firebase project region
firebase projects:list
# Then go to Firebase Console → Project Settings → General
# Verify: Default GCP resource location = europe-west6

# 2. Check Firestore region
# Go to: Firebase Console → Firestore Database
# Look for: "Region: eur3 (europe-west)" or "europe-west6"

# 3. Check Storage bucket
# Go to: Firebase Console → Storage
# Click on bucket → Verify location shows "EUR" or "europe-west6"
```

**If ANY region is wrong → STOP and discuss migration strategy**

### Priority 2: Add EU AI Configuration

Update your config to enforce EU processing:

**File:** `functions/config.js`

```javascript
const functions = require('firebase-functions');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables based on the environment
const env = process.env.NODE_ENV || 'development';
const configPath = path.resolve(__dirname, `.env.${env}`);

dotenv.config({
  path: configPath
});

// Export configuration 
module.exports = {
  // Existing
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  loggingLevel: process.env.LOGGING_LEVEL,
  
  // NEW: Swiss Compliance
  region: 'europe-west6',            // Zurich - Cloud Functions
  aiRegion: 'europe-west3',          // Frankfurt - Vertex AI/Gemini
  visionEndpoint: 'eu-vision.googleapis.com', // EU OCR
  
  // PayrollPlus Integration
  payrollEmail: 'partners@payrollplus.ch',
  
  // Pilot Mode
  pilot: {
    enabled: true,
    endDate: '2025-02-28',
    feePercentage: 0  // 0% during pilot
  },
  
  // Add other configuration variables as needed
};
```

### Priority 3: Create Legal Documents

**Create these files:**

1. `frontend/public/legal/privacy-policy.html`
2. `frontend/public/legal/terms-of-service.html`

**Key clauses to include:**

- Data storage: Zurich (europe-west6)
- AI processing: Frankfurt (europe-west3)  
- OCR: EU endpoints
- Non-Circumvention: CHF 2,000 penalty
- Role: Intermediary (not Employer)
- PayrollPlus as Staff Leasing provider

---

## 📋 WEEK 1 TASKS

### Day 1-2: Phase 1 Database Schema

**Task 1:** Add billing fields to facilities

```bash
# Create migration script
cd functions
touch database/migrations/addBillingFields.js
```

Schema to add:
```javascript
billing: {
  companyName: string,
  address: {
    street: string,
    postalCode: string, 
    city: string,
    canton: string
  },
  uidNumber: string,    // CHE-123.456.789
  invoiceEmail: string,
  glnNumber: string
}
```

**Task 2:** Update firestore.rules

Add validation for billing fields:
```javascript
function hasValidBilling(data) {
  return data.billing.keys().hasAll(['companyName', 'uidNumber', 'invoiceEmail'])
    && data.billing.companyName is string
    && data.billing.uidNumber.matches('^CHE-[0-9]{3}\\.[0-9]{3}\\.[0-9]{3}$');
}
```

### Day 3-4: Safe OCR Implementation

Create `functions/api/verifyDocument.js`:

```javascript
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const vision = require('@google-cloud/vision');
const { VertexAI } = require('@google-cloud/vertexai');
const config = require('../config');

// Force EU endpoint
const visionClient = new vision.ImageAnnotatorClient({
  apiEndpoint: config.visionEndpoint
});

const SAFE_PROMPT = `
CRITICAL GUARDRAILS:
- Extract ONLY business/company information
- Do NOT extract patient names, medical data, or prescriptions
- If patient data detected, return: { error: "patient_data_detected" }

Extract from letterhead/invoice:
{
  "companyName": "...",
  "address": { "street": "...", "postalCode": "...", "city": "..." },
  "gln": "...",
  "uid": "CHE-..."
}
`;

exports.verifyPharmacyDocument = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in');
  }

  const { imageUrl } = request.data;

  try {
    // Step 1: OCR with Vision API (EU endpoint)
    const [result] = await visionClient.textDetection(imageUrl);
    const extractedText = result.textAnnotations[0]?.description;

    if (!extractedText) {
      throw new HttpsError('invalid-argument', 'No text found in document');
    }

    // Step 2: AI analysis with Gemini (Frankfurt)
    const vertexAI = new VertexAI({
      project: process.env.GCLOUD_PROJECT,
      location: config.aiRegion  // europe-west3
    });

    const model = vertexAI.getGenerativeModel({
      model: 'gemini-1.5-flash'
    });

    const aiResult = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{
          text: `${SAFE_PROMPT}\n\nDocument text:\n${extractedText}`
        }]
      }]
    });

    const extractedData = JSON.parse(
      aiResult.response.candidates[0].content.parts[0].text
    );

    // Check for patient data violation
    if (extractedData.error === 'patient_data_detected') {
      throw new HttpsError(
        'invalid-argument',
        'Document contains patient data. Please upload letterhead or invoice.'
      );
    }

    return {
      success: true,
      data: extractedData
    };

  } catch (error) {
    logger.error('Document verification error:', error);
    throw new HttpsError('internal', error.message);
  }
});
```

### Day 5: PayrollPlus Email Integration

Install nodemailer:
```bash
cd functions
npm install nodemailer
```

Create `functions/services/payrollService.js`:

```javascript
const functions = require('firebase-functions/v2');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const config = require('../config');

// SendGrid transporter
const transporter = nodemailer.createTransport({
  service: 'SendGrid',
  auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY
  }
});

function generatePayrollCSV(data) {
  const headers = [
    'Request ID',
    'Pharmacy Name',
    'Pharmacy GLN',
    'Worker Name',
    'Worker Email',
    'Worker GLN',
    'Date',
    'Start Time',
    'End Time',
    'Duration (hrs)',
    'Role',
    'Hourly Rate',
    'Gross Pay',
    'Total Cost',
    'Commission'
  ].join(',');

  const row = [
    data.requestId,
    data.pharmacyProfile.companyName,
    data.pharmacyProfile.glnNumber,
    data.workerProfile.fullName,
    data.workerProfile.email,
    data.workerProfile.glnNumber || 'N/A',
    data.shiftDetails.date,
    data.shiftDetails.startTime,
    data.shiftDetails.endTime,
    data.shiftDetails.duration,
    data.shiftDetails.role,
    data.financials.hourlyRate,
    data.financials.workerGrossPay,
    data.financials.totalCost,
    data.financials.commission
  ].join(',');

  return `${headers}\n${row}`;
}

exports.sendPayrollRequest = functions
  .region('europe-west6')
  .firestore
  .onDocumentCreated('payroll_requests/{requestId}', async (event) => {
    const data = event.data.data();
    const csv = generatePayrollCSV(data);

    try {
      await transporter.sendMail({
        from: 'billing@interimed.ch',
        to: config.payrollEmail,
        subject: `Staff Request ${data.requestId} - ${data.pharmacyProfile.companyName}`,
        text: `
New staffing request submitted.

Pharmacy: ${data.pharmacyProfile.companyName}
Worker: ${data.workerProfile.fullName}
Date: ${data.shiftDetails.date}
Duration: ${data.shiftDetails.duration} hours
Total: CHF ${data.financials.totalCost}

Please see attached CSV for full details.
        `,
        attachments: [{
          filename: `payroll-${data.requestId}.csv`,
          content: csv
        }]
      });

      // Update status
      await event.data.ref.update({
        'payrollData.emailSentAt': admin.firestore.FieldValue.serverTimestamp(),
        status: 'sent'
      });

      console.log(`Payroll email sent for request ${data.requestId}`);

    } catch (error) {
      console.error('Failed to send payroll email:', error);
      
      await event.data.ref.update({
        'payrollData.error': error.message,
        status: 'failed'
      });
    }
  });
```

---

## 🎯 SUCCESS METRICS

By end of Week 1:
- [ ] All regions verified as europe-west6
- [ ] Legal documents published
- [ ] Safe OCR function deployed and tested
- [ ] PayrollPlus email integration working
- [ ] Billing fields added to schema

---

## 🚨 BLOCKERS TO WATCH FOR

1. **Wrong region detected** → Need migration plan
2. **Vision API not EU** → Could violate GDPR
3. **SendGrid not configured** → Need API key
4. **PayrollPlus no response** → Need backup plan

---

## 📞 NEXT CONVERSATION TOPICS

After Week 1, we'll tackle:
- Phase 2: Organizations/Chains schema
- Scheduler data layer
- Internal interim algorithm
- Data lifecycle (termination/deletion)

**Ready to start?** Which task should we tackle first?
