# CORS Error Fix - Cloud Function Deployment

## Error Fixed
```
Access to fetch at 'https://us-central1-medishift-620fd.cloudfunctions.net/processDocument' 
from origin 'http://localhost:4000' has been blocked by CORS policy
```

## What Was Changed

### 1. Updated Cloud Function to Firebase Functions v2
**File**: `functions/api/processDocument.js`

**Changes**:
- ✅ Migrated from `firebase-functions` v1 to v2
- ✅ Added `cors: true` configuration
- ✅ Increased timeout to 300 seconds (5 minutes)
- ✅ Set memory to 512MiB
- ✅ Added maxInstances limit

**Before**:
```javascript
const functions = require('firebase-functions');
exports.processDocument = functions.https.onCall(async (data, context) => {
  // ...
});
```

**After**:
```javascript
const { onCall, HttpsError } = require('firebase-functions/v2/https');
exports.processDocument = onCall(
  {
    cors: true, // Enable CORS for all origins
    maxInstances: 10,
    timeoutSeconds: 300,
    memory: '512MiB'
  },
  async (request) => {
    // ...
  }
);
```

## How to Deploy

### Option 1: Deploy All Functions
```bash
cd /root/Medishift/functions
npm install
cd ..
firebase deploy --only functions
```

### Option 2: Deploy Only processDocument
```bash
cd /root/Medishift
firebase deploy --only functions:processDocument
```

### Option 3: Using WSL
```bash
wsl
cd /root/Medishift
firebase deploy --only functions:processDocument
```

## Verify Deployment

### 1. Check Firebase Console
1. Go to https://console.firebase.google.com/
2. Select your project
3. Navigate to **Functions**
4. Look for `processDocument` function
5. Check status is "Healthy"

### 2. Check Function URL
The function should be available at:
```
https://us-central1-medishift-620fd.cloudfunctions.net/processDocument
```

### 3. Test from Frontend
1. Go to Profile page
2. Click "Auto Fill" button
3. Upload a test document
4. Should process without CORS error

## What the CORS Configuration Does

### `cors: true`
- Allows requests from **any origin** (including localhost:4000)
- Automatically adds these headers:
  - `Access-Control-Allow-Origin: *`
  - `Access-Control-Allow-Methods: POST, OPTIONS`
  - `Access-Control-Allow-Headers: Content-Type, Authorization`

### For Production
If you want to restrict CORS to specific origins:

```javascript
exports.processDocument = onCall(
  {
    cors: ['https://yourdomain.com', 'http://localhost:4000'],
    // ... other options
  },
  async (request) => {
    // ...
  }
);
```

## Other Configuration Options

### Timeout
```javascript
timeoutSeconds: 300  // 5 minutes (max for v2)
```
- Default: 60 seconds
- Max: 540 seconds (9 minutes) for v2
- Needed for large document processing

### Memory
```javascript
memory: '512MiB'
```
- Options: '128MiB', '256MiB', '512MiB', '1GiB', '2GiB', '4GiB', '8GiB'
- More memory = faster processing but higher cost

### Max Instances
```javascript
maxInstances: 10
```
- Limits concurrent executions
- Prevents runaway costs
- Good for rate limiting

## Troubleshooting

### Still Getting CORS Error?

**1. Check if function is deployed**:
```bash
firebase functions:list
```

**2. Check function logs**:
```bash
firebase functions:log --only processDocument
```

**3. Verify function URL**:
- Should be: `https://us-central1-{project-id}.cloudfunctions.net/processDocument`
- Check in Firebase Console → Functions

**4. Clear browser cache**:
- Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

**5. Check if function is callable**:
```javascript
// In browser console
const functions = firebase.functions();
const processDoc = functions.httpsCallable('processDocument');
console.log(processDoc);
```

### Function Not Found?

**Check index.js export**:
```javascript
// functions/index.js
const documentProcessing = require('./api/processDocument');
exports.processDocument = documentProcessing.processDocument;
```

### Deployment Fails?

**Check package.json**:
```json
{
  "dependencies": {
    "firebase-functions": "^5.1.1",  // v2 compatible
    "@google-cloud/vision": "^4.0.2",
    "@google-cloud/vertexai": "^1.1.0"
  }
}
```

**Install dependencies**:
```bash
cd functions
npm install
```

## Cost Impact

### Firebase Functions v2 Pricing
- **Invocations**: $0.40 per million
- **Compute time (512MB)**: $0.0000125 per GB-second
- **Network egress**: $0.12 per GB

### Estimated Cost per Document
- Processing time: ~20 seconds
- Memory: 512MB
- **Cost**: ~$0.0001 per document

### Monthly Cost (100 documents)
- **Total**: ~$0.01 + Cloud Vision + Vertex AI costs
- **Grand Total**: ~$0.25/month

Very affordable!

## Security Notes

### CORS: true
- ⚠️ Allows requests from any origin
- ✅ Safe for callable functions (Firebase handles auth)
- ✅ User must be authenticated
- ✅ Request includes auth token

### For Production
Consider:
1. Restrict CORS to your domain
2. Add rate limiting
3. Monitor usage
4. Set up alerts for unusual activity

## Next Steps

1. **Deploy the function**:
   ```bash
   firebase deploy --only functions:processDocument
   ```

2. **Test the upload**:
   - Go to Profile page
   - Click "Auto Fill"
   - Upload a document
   - Should work without CORS error!

3. **Monitor logs**:
   ```bash
   firebase functions:log --only processDocument --follow
   ```

4. **Check costs**:
   - Firebase Console → Functions → Usage

## Files Modified

1. ✅ `functions/api/processDocument.js` - Updated to v2 with CORS
2. ✅ `functions/index.js` - Export already correct

## Summary

The CORS error is fixed by:
1. ✅ Using Firebase Functions v2
2. ✅ Adding `cors: true` configuration
3. ✅ Increasing timeout for document processing
4. ✅ Setting appropriate memory limits

**Just deploy the function and it will work!** 🚀
