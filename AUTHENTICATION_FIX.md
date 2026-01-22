# Banking Access Authentication Fix

## PROBLEM IDENTIFIED

Firebase logs showed:
```
W requestbankingaccesscode: The request was not authenticated. Either allow unauthenticated invocations or set the proper Authorization header.
```

**Root Cause:** The Cloud Function calls were not properly authenticated because:
1. The component was creating a new Functions instance dynamically
2. No explicit check for user authentication before making the call
3. Auth token wasn't being refreshed before the call

## SOLUTION IMPLEMENTED

### ✅ Fixed: BankingAccessModal.js

**Changes Made:**

1. **Use Shared Functions Instance**
   - Changed from: `getFunctions(firebaseApp, 'europe-west6')`
   - Changed to: Import `functions` directly from firebaseService
   - This ensures the functions instance uses the same auth context

2. **Add Authentication Checks**
   - Added `auth.currentUser` check before each function call
   - Throws clear error if user is not logged in

3. **Force Token Refresh**
   - Added `await currentUser.getIdToken(true)` before each call
   - Forces Firebase to refresh the ID token
   - Ensures token is valid and attached to the request

### Code Changes

#### handleSendCode()
```javascript
// BEFORE
const { httpsCallable, getFunctions } = await import('firebase/functions');
const { firebaseApp } = await import('../../../../services/firebaseService');
const functions = getFunctions(firebaseApp, 'europe-west6');

// AFTER  
const { httpsCallable } = await import('firebase/functions');
const { functions, auth } = await import('../../../../services/firebaseService');

const currentUser = auth.currentUser;
if (!currentUser) {
  throw new Error('You must be logged in to request a banking access code');
}
await currentUser.getIdToken(true);
```

#### handleVerify()
```javascript
// Same fix applied to verification function
const currentUser = auth.currentUser;
if (!currentUser) {
  throw new Error('You must be logged in to verify the banking access code');
}
await currentUser.getIdToken(true);
```

## WHY THIS FIXES THE ISSUE

### Firebase Auth Token Flow

1. **Before:** Functions instance created dynamically might not have proper auth context
2. **After:** Using shared instance ensures auth state is properly linked

3. **Token Refresh:** `getIdToken(true)` forces Firebase to:
   - Check if current token is valid
   - Refresh if expired
   - Attach fresh token to all subsequent requests

### Authentication Flow

```
User Action → Check auth.currentUser → Refresh ID Token → Call Cloud Function → Success
```

## TESTING

### To Test the Fix:

1. **Restart Development Server:**
```bash
cd ~/Interimed/NEW\ INTERIMED\ MERGED
npm start
```

2. **Open Browser Console**

3. **Navigate to Profile > Banking Information**

4. **Click "Send Code" Button**

5. **Expected Success Logs:**
```
✅ Token refreshed successfully
✅ Code sent via email/SMS
✅ No authentication errors
```

6. **Expected Firebase Logs (No Errors):**
```bash
firebase functions:log | grep -i requestbankingaccesscode
# Should show successful invocation, NOT authentication errors
```

## ADDITIONAL FIXES

### Translation Warnings Fixed

Changed `t('common.email')` to `t('common:email')` to use proper namespace syntax.

## FILES MODIFIED

1. `src/dashboard/pages/profile/components/BankingAccessModal.js`
   - handleSendCode() - Added auth checks and token refresh
   - handleVerify() - Added auth checks and token refresh
   - Fixed translation namespace syntax

## NEXT STEPS

1. **Test in Browser:**
   - Log in to the application
   - Go to Profile → Banking Information
   - Click "Send Code via Email"
   - Verify no console errors
   - Check email for code

2. **Verify Firebase Logs:**
```bash
cd ~/Interimed/NEW\ INTERIMED\ MERGED
firebase functions:log | head -50
```
   - Should see successful function invocations
   - No "unauthenticated" warnings

3. **Check .env File Exists:**
```bash
ls -la ~/Interimed/NEW\ INTERIMED\ MERGED/functions/.env
cat ~/Interimed/NEW\ INTERIMED\ MERGED/functions/.env
```

## IF STILL NOT WORKING

### Check User is Logged In
```javascript
// In browser console:
import { auth } from './services/firebaseService';
console.log('Current user:', auth.currentUser);
console.log('Email:', auth.currentUser?.email);
```

### Force Token Refresh Manually
```javascript
// In browser console:
const token = await auth.currentUser.getIdToken(true);
console.log('Token refreshed:', token ? 'YES' : 'NO');
```

### Verify Functions Region
```javascript
// In browser console:
import { functions } from './services/firebaseService';
console.log('Functions instance:', functions);
// Should show region: europe-west6
```

## SUCCESS INDICATORS

✅ No "unauthenticated" errors in Firebase logs
✅ Code successfully sent to email/SMS
✅ No console errors in browser
✅ Translation warnings resolved
✅ Function calls complete successfully

## ENVIRONMENT VARIABLES

Ensure these are set in `functions/.env`:
```bash
MICROSOFT_CLIENT_ID=406b2cf6-2530-4c19-a7bd-0478f074156b
MICROSOFT_CLIENT_SECRET=5474bfa0-0ea5-47cd-a8dd-533e8256e0db
MICROSOFT_TENANT_ID=e8026978-c9e0-4640-b76b-bb83c6fba810
EMAIL_FROM=noreply@medishift.ch
INFOBIP_API_KEY=8272f672c72b130bb8840ce7fefa758c-...
INFOBIP_BASE_URL=api.infobip.com
INFOBIP_SENDER=MediShift
```

## REDEPLOY IF NEEDED

If you made any changes to Cloud Functions:
```bash
cd ~/Interimed/NEW\ INTERIMED\ MERGED
firebase deploy --only functions:requestBankingAccessCode,functions:verifyBankingAccessCode
```

Wait 2-3 minutes for deployment, then test again.

