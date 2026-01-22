# Firebase Function Internal Error - Debugging Guide

## ERROR

```
Error sending banking access code: FirebaseError: internal
```

## CAUSE

The Cloud Function `requestBankingAccessCode` is throwing an error. This is usually due to:

1. **Missing environment variables in .env file**
2. **Function not finding .env file**
3. **Microsoft OAuth2 or Infobip API error**

## IMMEDIATE FIX

### Step 1: Verify .env file exists in functions directory

```bash
cd ~/Interimed/NEW\ INTERIMED\ MERGED/functions
ls -la .env
cat .env
```

**Expected content:**
```bash
MICROSOFT_CLIENT_ID=406b2cf6-2530-4c19-a7bd-0478f074156b
MICROSOFT_CLIENT_SECRET=5474bfa0-0ea5-47cd-a8dd-533e8256e0db
MICROSOFT_TENANT_ID=e8026978-c9e0-4640-b76b-bb83c6fba810
EMAIL_FROM=noreply@medishift.ch
INFOBIP_API_KEY=8272f672c72b130bb8840ce7fefa758c-89f5ca69-24db-423a-b11d-37cf8c588c30
INFOBIP_BASE_URL=api.infobip.com
INFOBIP_SENDER=MediShift
```

### Step 2: Check Firebase Functions Logs

```bash
firebase functions:log --limit 50 | grep -A 5 "requestBankingAccessCode"
```

Or in Firebase Console:
1. Go to https://console.firebase.google.com
2. Select project: interimed-620fd
3. Functions > Logs
4. Search for "requestBankingAccessCode"
5. Look for the error message

### Step 3: Test Locally (If Possible)

```bash
cd functions
node test-microsoft-oauth.js
```

This will test if Microsoft OAuth2 credentials work.

## COMMON ERRORS

### Error 1: "Failed to authenticate with Microsoft"
**Cause:** Invalid Microsoft credentials
**Fix:** Verify Client ID, Secret, and Tenant ID in .env

### Error 2: "No email address found for your account"
**Cause:** User profile missing email
**Fix:** Check Firestore user document has email field

### Error 3: "SMS delivery is not configured"
**Cause:** Infobip credentials missing
**Fix:** Verify INFOBIP_API_KEY in .env

### Error 4: "Failed to send verification code via email"
**Cause:** Microsoft app doesn't have permissions
**Fix:** 
1. Go to Azure Portal
2. Check app has Mail.Send permission
3. Verify admin consent granted

## REDEPLOY CHECKLIST

After making changes:

```bash
cd ~/Interimed/NEW\ INTERIMED\ MERGED
firebase deploy --only functions:requestBankingAccessCode,functions:verifyBankingAccessCode
```

Wait 2-3 minutes for deployment to complete.

## GET DETAILED ERROR

Add this to your browser console to see full error:

```javascript
// In browser console
window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.log('Error:', msg, '\nURL:', url, '\nLine:', lineNo);
    console.log('Full error:', error);
    return false;
};
```

Then try sending code again.

## MANUAL TEST

Test the Cloud Function directly:

```javascript
// In browser console (when logged in)
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions(undefined, 'europe-west6');
const requestCode = httpsCallable(functions, 'requestBankingAccessCode');

requestCode({ method: 'email' })
  .then(result => console.log('Success:', result))
  .catch(error => console.error('Error:', error));
```

## ENVIRONMENT VARIABLE LOADING

Verify dotenv is working in functions/index.js:

```javascript
// At the top of functions/index.js, should have:
require('dotenv').config();

// Test by adding:
console.log('ENV TEST:', process.env.MICROSOFT_CLIENT_ID ? 'LOADED' : 'NOT LOADED');
```

Redeploy and check logs:
```bash
firebase functions:log --limit 10
```

Should see: `ENV TEST: LOADED`

## NUCLEAR OPTION

If nothing works:

1. **Delete and redeploy:**
```bash
firebase functions:delete requestBankingAccessCode
firebase functions:delete verifyBankingAccessCode
firebase deploy --only functions
```

2. **Check Firebase project settings:**
- Go to https://console.firebase.google.com
- Project settings
- Verify region is europe-west6
- Verify billing is enabled

3. **Verify user email in Firestore:**
```bash
# In Firebase Console > Firestore
# Check: users/{your-uid}/email
```

## EXPECTED SUCCESSFUL LOG

When working correctly, logs should show:

```
[Banking Access] Temporary code generated for user abc123: 123456
[Microsoft Graph] Email sent successfully to user@example.com
[Banking Access] Email sent to user@example.com
```

If you see these, it's working!

