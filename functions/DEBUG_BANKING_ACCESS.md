# DEBUG: Banking Access "Internal" Error

## ISSUE

Getting `FirebaseError: internal` when clicking "Send Code" in Banking Access Modal.

## ROOT CAUSE

The error "internal" from Firebase means the Cloud Function `requestBankingAccessCode` is throwing an error. This could be:

1. **Missing Environment Variables** (most likely)
2. **Microsoft OAuth2 token failure**
3. **Infobip SMS API error**
4. **User data structure issue**

## DEBUGGING STEPS

### 1. CHECK FIREBASE FUNCTIONS LOGS

**In WSL/Linux terminal:**
```bash
cd "/mnt/c/Users/willi/path/to/NEW INTERIMED MERGED"
firebase functions:log --limit 50
```

**Or in Firebase Console:**
1. Go to https://console.firebase.google.com
2. Select your project
3. Functions > Logs
4. Look for errors from `requestBankingAccessCode`

### 2. CHECK ENVIRONMENT VARIABLES

**Verify .env file exists:**

```bash
cd functions
cat .env
```

**Required variables in `.env`:**
```bash
MICROSOFT_CLIENT_ID=406b2cf6-2530-4c19-a7bd-0478f074156b
MICROSOFT_CLIENT_SECRET=5474bfa0-0ea5-47cd-a8dd-533e8256e0db
MICROSOFT_TENANT_ID=e8026978-c9e0-4640-b76b-bb83c6fba810
EMAIL_FROM=noreply@medishift.ch
INFOBIP_API_KEY=your_actual_key
INFOBIP_BASE_URL=api.infobip.com
INFOBIP_SENDER=MediShift
```

**If missing, create it:**
```bash
cd functions
cp .env.template .env
# Edit .env with your actual credentials
```

### 3. TEST EMAIL METHOD FIRST

Email is easier to debug. Try clicking "Email" instead of "Phone" first.

**Expected behavior:**
- Should get OAuth2 token from Microsoft
- Should send email via Graph API
- Check logs for specific error

**Common email errors:**
- `Failed to authenticate with Microsoft` → Check Client ID/Secret/Tenant ID
- `Failed to send email via Microsoft Graph` → Check mailbox permissions
- `No email address found` → User profile missing email

### 4. TEST SMS METHOD

**Prerequisites:**
- User must have phone number in profile
- Infobip API key must be valid
- Infobip account must have credits

**Common SMS errors:**
- `SMS delivery is not configured` → Infobip env vars missing
- `No phone number found` → User profile missing phone
- `Failed to send verification code via SMS` → Infobip API error (check credits/sender ID)

### 5. CHECK USER PROFILE DATA

The function needs:
- **For Email**: `auth.token.email` OR `userData.email` OR `userData.contact.email`
- **For SMS**: `userData.contact.primaryPhone` OR `userData.primaryPhone`
- **For SMS**: `userData.contact.primaryPhonePrefix` OR `userData.primaryPhonePrefix`

**Check in Firestore:**
```
users/{userId}
  email: "user@example.com"
  contact: {
    email: "user@example.com"
    primaryPhone: "763392889"
    primaryPhonePrefix: "+41"
  }
```

### 6. DEPLOY LATEST FUNCTIONS

Make sure latest code is deployed:

```bash
cd functions
firebase deploy --only functions:requestBankingAccessCode,functions:verifyBankingAccessCode
```

Wait for deployment to complete (can take 2-3 minutes).

## QUICK FIX CHECKLIST

- [ ] Environment variables set in Firebase (`firebase functions:config:get`)
- [ ] Functions deployed (`firebase deploy --only functions`)
- [ ] User has email in profile (for email method)
- [ ] User has phone number in profile (for SMS method)
- [ ] Microsoft app has `Mail.Send` permission with admin consent
- [ ] Infobip account has credits (for SMS)
- [ ] Check Firebase Functions logs for specific error

## TESTING LOCALLY

### Test Microsoft OAuth2:

```bash
cd functions
node test-microsoft-oauth.js
```

Expected output:
```
✅ Access token obtained successfully
✅ Test email sent successfully!
```

### Test Infobip SMS (create test script):

```javascript
// functions/test-infobip.js
const https = require('https');

const INFOBIP_API_KEY = 'YOUR_KEY';
const INFOBIP_BASE_URL = 'api.infobip.com';
const TEST_PHONE = '41763392889'; // Without +

const postData = JSON.stringify({
  messages: [{
    destinations: [{ to: TEST_PHONE }],
    from: 'MediShift',
    text: 'Test SMS from MediShift'
  }]
});

const options = {
  method: 'POST',
  hostname: INFOBIP_BASE_URL,
  path: '/sms/2/text/advanced',
  headers: {
    'Authorization': `App ${INFOBIP_API_KEY}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Response:', JSON.parse(data));
  });
});

req.on('error', (error) => console.error('Error:', error));
req.write(postData);
req.end();
```

Run:
```bash
node test-infobip.js
```

## MOST LIKELY ISSUE

**Missing or incorrect `.env` file in functions directory.**

Make sure `functions/.env` exists with correct values:

```bash
cd functions
ls -la .env  # Check if file exists
cat .env     # Verify contents
```

After creating/updating `.env`, **REDEPLOY**:
```bash
firebase deploy --only functions
```

**Note:** Firebase automatically includes `.env` file during deployment.

## NEED MORE HELP?

Share the output of:
1. `firebase functions:log --limit 50` (from WSL terminal)
2. `firebase functions:config:get`
3. Screenshot of the browser console error with full stack trace

