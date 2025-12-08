# Deployment Guide: Frontend + Functions

## The Problem
When you run `npm run build` from the frontend directory, you only build the frontend React app. Firebase Functions are separate backend services that need to be deployed to Google Cloud Platform through Firebase.

cPanel hosting only supports static files and some server-side technologies, but not Firebase Functions natively.

## Solution Options

### Option 1: Firebase Hosting (Recommended) ⭐

**Pros:**
- Functions work seamlessly
- Easy deployment with one command
- Automatic HTTPS
- Global CDN
- Free tier available

**Cons:**
- Not using your existing cPanel hosting

**Steps:**
1. Run the deployment script:
   ```bash
   chmod +x deploy-to-firebase.sh
   ./deploy-to-firebase.sh
   ```

2. Or manually:
   ```bash
   # Build frontend
   cd frontend
   npm run build
   cd ..
   
   # Deploy everything
   firebase deploy
   ```

### Option 2: cPanel with Express Backend

**Pros:**
- Uses your existing cPanel hosting
- Full control over backend

**Cons:**
- More complex setup
- Requires Node.js support on cPanel
- Need to rewrite function calls

**Steps:**

1. **Prepare deployment files:**
   ```bash
   chmod +x deploy-to-cpanel.sh
   ./deploy-to-cpanel.sh
   ```

2. **Copy the calendar functions logic:**
   You'll need to copy your calendar functions from `functions/api/calendar.js` to the Express backend and adapt them.

3. **Update frontend API calls:**
   Change from Firebase function calls to HTTP requests:
   
   **Before (Firebase Functions):**
   ```javascript
   import { getFunctions, httpsCallable } from 'firebase/functions';
   
   const functions = getFunctions();
   const getProfile = httpsCallable(functions, 'getProfile');
   const result = await getProfile();
   ```
   
   **After (Express API):**
   ```javascript
   const response = await fetch('/api/getProfile', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
     },
     body: JSON.stringify({ idToken: await user.getIdToken() })
   });
   const result = await response.json();
   ```

4. **Upload to cPanel:**
   - Upload frontend files to `public_html`
   - Upload backend files to a separate directory
   - Configure Node.js app in cPanel (if supported)

### Option 3: Hybrid Approach

Keep Firebase Functions but host frontend on cPanel:

1. Build frontend: `cd frontend && npm run build`
2. Upload build files to cPanel
3. Keep functions on Firebase
4. Update frontend to call Firebase Functions directly with full URLs

## Environment Configuration

### For Firebase Hosting:
Your existing `firebase.json` is already configured correctly.

### For cPanel:
You'll need to:
1. Get Firebase service account key
2. Set environment variables in cPanel
3. Update API endpoints in frontend

## Recommendation

**Use Option 1 (Firebase Hosting)** because:
- Your functions are already written for Firebase
- No code changes needed
- Better performance and reliability
- Easier maintenance

If you must use cPanel, ensure your hosting provider supports Node.js applications before proceeding with Option 2.

## Quick Commands

**Firebase deployment:**
```bash
./deploy-to-firebase.sh
```

**cPanel preparation:**
```bash
./deploy-to-cpanel.sh
```

**Development:**
```bash
npm start  # (this will start the frontend)
``` 