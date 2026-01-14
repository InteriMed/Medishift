# Clear Firestore Cache - Database Migration Fix

## Issue
After migrating from "(default)" database to "medishift" database, you may encounter:
- "Missing or insufficient permissions" errors
- Firestore internal assertion failures
- "Failed to get document because the client is offline" errors

## Solution: Clear Browser Cache

The Firestore offline cache was created for the old "(default)" database and needs to be cleared.

### Option 1: Clear via Browser DevTools (Recommended)

1. Open your browser's Developer Tools (F12)
2. Go to the **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Under **Storage**, find **IndexedDB**
4. Look for entries starting with `firestore/` or `firebaseLocalStorageDb`
5. Right-click and select **Delete** or **Clear**
6. Also clear **Local Storage** entries for your domain
7. Refresh the page

### Option 2: Clear All Site Data

1. Open your browser's Developer Tools (F12)
2. Go to the **Application** tab
3. Click **Clear site data** button
4. Make sure **IndexedDB** and **Local Storage** are checked
5. Click **Clear**
6. Refresh the page

### Option 3: Programmatic Clear (Temporary)

If the errors persist, you can temporarily disable offline persistence by modifying `frontend/src/services/firebase.js`:

```javascript
// Temporarily disable persistence to clear cache
db = initializeFirestore(firebaseApp, {
  // localCache: persistentLocalCache({ tabManager: persistentSingleTabManager() })
}, 'medishift');
```

Then re-enable it after the cache is cleared.

## After Clearing Cache

1. Restart your development server
2. Clear browser cache completely
3. Try logging in again
4. User creation should now work properly







