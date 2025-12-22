# URGENT: Deploy Cloud Function to Fix CORS Error

## The Problem
The CORS error is happening because the **updated Cloud Function hasn't been deployed yet**. The function running on Firebase is still using the old code without CORS support.

## The Solution
Deploy the updated function with CORS support.

---

## Quick Fix (Choose One Method)

### **Method 1: Using WSL Terminal** (Recommended)

```bash
# Open WSL terminal
wsl

# Navigate to project
cd /root/Medishift

# Deploy the function
firebase deploy --only functions:processDocument
```

### **Method 2: Using Deployment Script**

```bash
# Open WSL terminal
wsl

# Navigate to project
cd /root/Medishift

# Make script executable
chmod +x scripts/deploy-process-document.sh

# Run deployment script
./scripts/deploy-process-document.sh
```

### **Method 3: Using Firebase Console**

1. Go to https://console.firebase.google.com/
2. Select your project: **medishift-620fd**
3. Go to **Functions**
4. Click **Deploy** or wait for auto-deployment
5. Verify `processDocument` function is deployed

---

## Step-by-Step Deployment

### 1. Open Terminal
```bash
wsl
```

### 2. Navigate to Project
```bash
cd /root/Medishift
```

### 3. Check Firebase Login
```bash
firebase login
```
If not logged in, follow the prompts to log in.

### 4. Select Project
```bash
firebase use medishift-620fd
```

### 5. Install Dependencies (if needed)
```bash
cd functions
npm install
cd ..
```

### 6. Deploy Function
```bash
firebase deploy --only functions:processDocument
```

### 7. Wait for Deployment
You should see:
```
✔  functions[processDocument(us-central1)] Successful update operation.
✔  Deploy complete!
```

### 8. Verify Deployment
```bash
firebase functions:list
```

Look for `processDocument` in the list.

---

## After Deployment

### 1. Refresh Browser
- Hard refresh: **Ctrl + Shift + R** (Windows/Linux)
- Or: **Cmd + Shift + R** (Mac)

### 2. Test Upload
1. Go to Profile page
2. Click "Auto Fill" button
3. Upload a test document
4. **CORS error should be gone!** ✅

### 3. Monitor Logs
```bash
firebase functions:log --only processDocument --follow
```

---

## Troubleshooting

### Error: "firebase: command not found"

**Solution**: Install Firebase CLI
```bash
npm install -g firebase-tools
```

### Error: "Not logged in"

**Solution**: Log in to Firebase
```bash
firebase login
```

### Error: "No project selected"

**Solution**: Select your project
```bash
firebase use medishift-620fd
```

### Error: "Permission denied"

**Solution**: Check your Firebase permissions
- You need "Editor" or "Owner" role
- Check in Firebase Console → Settings → Users and permissions

### Error: "Function deployment failed"

**Solution**: Check function logs
```bash
firebase functions:log
```

Common causes:
- Missing dependencies: `cd functions && npm install`
- Syntax errors: Check `functions/api/processDocument.js`
- API not enabled: Enable Cloud Vision and Vertex AI APIs

---

## Verify CORS is Fixed

### Check Function Configuration

1. Go to Firebase Console → Functions
2. Click on `processDocument`
3. Check "Configuration" tab
4. Should show:
   - Runtime: Node.js 18
   - Memory: 512 MiB
   - Timeout: 300s
   - **CORS: Enabled** ✅

### Test with curl

```bash
curl -X POST \
  https://us-central1-medishift-620fd.cloudfunctions.net/processDocument \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:4000" \
  -d '{"data":{"documentUrl":"test"}}'
```

Should return CORS headers in response.

---

## Expected Deployment Output

```
=== Deploying to 'medishift-620fd'...

i  deploying functions
i  functions: ensuring required API cloudfunctions.googleapis.com is enabled...
i  functions: ensuring required API cloudbuild.googleapis.com is enabled...
✔  functions: required API cloudfunctions.googleapis.com is enabled
✔  functions: required API cloudbuild.googleapis.com is enabled
i  functions: preparing codebase default for deployment
i  functions: packaged /root/Medishift/functions (XX.X MB) for uploading
✔  functions: functions folder uploaded successfully
i  functions: updating Node.js 18 function processDocument(us-central1)...
✔  functions[processDocument(us-central1)]: Successful update operation.

✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/medishift-620fd/overview
```

---

## What Changed in the Deployment

### Before (v1 - No CORS)
```javascript
exports.processDocument = functions.https.onCall(async (data, context) => {
  // No CORS configuration
});
```

### After (v2 - With CORS) ✅
```javascript
exports.processDocument = onCall(
  {
    cors: true,              // ✅ CORS enabled
    maxInstances: 10,
    timeoutSeconds: 300,
    memory: '512MiB'
  },
  async (request) => {
    // Function code
  }
);
```

---

## Timeline

**Deployment time**: 2-5 minutes
**Propagation time**: Immediate
**Total time**: ~5 minutes

---

## Next Steps After Successful Deployment

1. ✅ Refresh browser
2. ✅ Test document upload
3. ✅ Verify CORS error is gone
4. ✅ Check function logs for any errors
5. ✅ Monitor costs in Firebase Console

---

## Still Getting CORS Error After Deployment?

### 1. Clear Browser Cache
- Chrome: Settings → Privacy → Clear browsing data
- Or: Hard refresh (Ctrl+Shift+R)

### 2. Check Function URL
Should be:
```
https://us-central1-medishift-620fd.cloudfunctions.net/processDocument
```

### 3. Verify Deployment
```bash
firebase functions:list
```

### 4. Check Function Logs
```bash
firebase functions:log --only processDocument
```

### 5. Re-deploy
```bash
firebase deploy --only functions:processDocument --force
```

---

## Summary

**Problem**: CORS error because function not deployed
**Solution**: Deploy updated function with CORS support
**Command**: `firebase deploy --only functions:processDocument`
**Time**: ~5 minutes
**Result**: CORS error fixed! ✅

---

## Need Help?

**Check deployment status**:
```bash
firebase functions:list
```

**View logs**:
```bash
firebase functions:log --only processDocument
```

**Test function**:
```bash
firebase functions:shell
```

**Contact support**:
- Firebase Support: https://firebase.google.com/support
- Stack Overflow: Tag `firebase-cloud-functions`

---

**Deploy now to fix the CORS error!** 🚀
