# Firebase Configuration Diagnostic Guide

## Project Information
- **Project Name**: Interimed
- **Project ID**: interimed-620fd
- **Project Number**: 436488373074

## Common Issues After Disaster Recovery

### 1. Missing Environment Variables
After recovery, `.env` files are often missing. Check if you have a `.env` file with:
```
REACT_APP_FIREBASE_API_KEY=AIzaSyBKMnh477m8ZDmk7WhQZKPzb3VDe3PktDs
REACT_APP_FIREBASE_AUTH_DOMAIN=interimed-620fd.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=interimed-620fd
REACT_APP_FIREBASE_STORAGE_BUCKET=interimed-620fd.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=436488373074
REACT_APP_FIREBASE_APP_ID=1:436488373074:web:60c3a26935b6238d9a308b
REACT_APP_FIREBASE_MEASUREMENT_ID=G-66V8BS82V0
```

### 2. API Key Restrictions
The 400 Bad Request error often indicates API key restrictions. Check:
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Find your API key: `AIzaSyBKMnh477m8ZDmk7WhQZKPzb3VDe3PktDs`
3. Check "API restrictions" - should allow:
   - Identity Toolkit API
   - Firebase Installations API
   - Firebase Remote Config API
4. Check "Application restrictions" - should include:
   - `127.0.0.1:4000`
   - `localhost:4000`
   - Your production domain

### 3. Authorized Domains
1. Go to [Firebase Console](https://console.firebase.google.com/project/interimed-620fd/authentication/settings)
2. Under "Authorized domains", ensure:
   - `127.0.0.1`
   - `localhost`
   - Your production domain

### 4. Firestore Security Rules
Check Firestore rules allow read/write for authenticated users:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /professionalProfiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 5. Corrupted Browser Cache
After recovery, the browser's IndexedDB cache might be corrupted:
1. Open Browser DevTools (F12)
2. Go to Application tab
3. Clear:
   - IndexedDB (all `firestore/` entries)
   - Local Storage
   - Session Storage
4. Hard refresh (Ctrl+Shift+R)

### 6. Firestore Database Status
Verify Firestore is enabled:
1. Go to [Firebase Console](https://console.firebase.google.com/project/interimed-620fd/firestore)
2. Ensure Firestore is in "Native mode" (not Datastore mode)
3. Check if database exists and is accessible

## Quick Fix Steps

1. **Clear Browser Cache** (Most Common Fix)
   - Clear all site data for `127.0.0.1:4000`
   - Restart browser

2. **Verify API Key**
   - Check API key restrictions in Google Cloud Console
   - Ensure Identity Toolkit API is enabled

3. **Check Authorized Domains**
   - Add `127.0.0.1` to authorized domains if missing

4. **Test Connection**
   - Run `window.testFirestore()` in browser console
   - Check for specific error messages

5. **Reset Firestore Cache**
   - The persistent cache might be corrupted
   - Clear IndexedDB and restart

## Testing

Run in browser console:
```javascript
window.testFirestore()
```

This will test:
- Network connectivity
- Read operations
- Write operations
- Document verification


