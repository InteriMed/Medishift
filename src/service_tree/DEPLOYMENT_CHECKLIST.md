# Service Tree Infrastructure - Deployment Checklist

## ✅ Completed Tasks

### 1. Directory Structure ✓
```
src/service_tree/
├── actions/                  # Ready for Action Catalog
├── services/
│   ├── auth.ts              ✓ Custom Claims & Token Logic
│   ├── audit.ts             ✓ Central Audit Logger
│   ├── flags.ts             ✓ Feature Flag Logic
│   ├── notifications.ts     ✓ Fan-out logic & FCM
│   ├── telemetry.ts         ✓ Sentry/LogRocket wrapper
│   └── index.ts             ✓ Barrel exports
└── types/
    └── context.ts           ✓ TypeScript interfaces
```

### 2. Frontend Services ✓
- **auth.ts**: Token-based auth, no Firestore reads
- **audit.ts**: Centralized logging to `system_logs`
- **flags.ts**: Hybrid Remote Config + Custom Claims
- **notifications.ts**: Fan-out pattern implementation
- **telemetry.ts**: Sentry + LogRocket integration

### 3. Backend Functions ✓
- **functions/auth/customClaims.js**: User creation trigger, facility assignment
- **functions/triggers/notificationFanout.js**: Announcement fanout trigger
- **functions/index.js**: Updated with new exports

### 4. Documentation ✓
- **IMPLEMENTATION_GUIDE.md**: Complete usage guide with examples

## 🔧 Next Steps for Deployment

### Step 1: Install Dependencies

```bash
# Frontend
cd "NEW INTERIMED MERGED"
npm install

# Backend
cd functions
npm install
```

### Step 2: Configure Environment Variables

**Frontend (.env):**
```env
REACT_APP_SENTRY_DSN=https://your-sentry-dsn
REACT_APP_LOGROCKET_APP_ID=your-logrocket-id
```

**Backend (functions/.env):**
```env
FIREBASE_PROJECT_ID=interimed-620fd
```

### Step 3: Deploy Cloud Functions

```bash
firebase deploy --only functions:setCustomClaimsOnUserCreation
firebase deploy --only functions:assignFacilityToUser
firebase deploy --only functions:updateUserTier
firebase deploy --only functions:refreshUserToken
firebase deploy --only functions:onAnnouncementCreated
firebase deploy --only functions:broadcastNotification
firebase deploy --only functions:sendPushNotification
```

### Step 4: Configure Firestore Security Rules

Add these rules to `firestore.rules`:

```javascript
// System logs (backend only)
match /system_logs/{logId} {
  allow read: if request.auth.token.role == 'admin';
  allow write: if false;
}

// Security logs (backend only)
match /security_logs/{logId} {
  allow read: if request.auth.token.role == 'admin';
  allow write: if false;
}

// User notifications (read-only for user)
match /users/{userId}/notifications/{notificationId} {
  allow read: if request.auth.uid == userId;
  allow write: if false;
}

// Announcements
match /announcements/{announcementId} {
  allow read: if request.auth != null;
  allow create: if request.auth.token.role in ['admin', 'facility_admin'];
  allow update, delete: if request.auth.token.role == 'admin';
}
```

Deploy rules:
```bash
firebase deploy --only firestore:rules
```

### Step 5: Configure Remote Config

In Firebase Console → Remote Config:

```json
{
  "enable_ai_assistant": false,
  "enable_advanced_analytics": false,
  "enable_payroll_automation": false,
  "enable_shift_swap": true,
  "enable_marketplace": false,
  "enable_document_ai": false,
  "pilot_facilities": "[]",
  "beta_facilities": "[]"
}
```

### Step 6: Initialize Telemetry

Add to `src/index.js`:

```javascript
import { initializeTelemetry } from './service_tree/services/telemetry';

// Initialize before React renders
initializeTelemetry();

// Rest of your app initialization
```

### Step 7: Migration Script for Existing Users

Create and run this script to set claims for existing users:

```javascript
// scripts/migrateCustomClaims.js
const admin = require('firebase-admin');
admin.initializeApp();

async function migrateUsers() {
  const usersSnapshot = await admin.firestore().collection('users').get();
  
  for (const userDoc of usersSnapshot.docs) {
    const userData = userDoc.data();
    
    const claims = {
      facilityId: userData.facilityId || 'UNASSIGNED',
      role: userData.role || 'professional',
      tier: userData.tier || 'FREE'
    };
    
    await admin.auth().setCustomUserClaims(userDoc.id, claims);
    console.log(`Updated claims for ${userDoc.id}`);
  }
}

migrateUsers();
```

Run with:
```bash
cd functions
node ../scripts/migrateCustomClaims.js
```

### Step 8: Test Implementation

**Test Custom Claims:**
```javascript
// In browser console after login
const user = firebase.auth().currentUser;
const idToken = await user.getIdTokenResult();
console.log(idToken.claims);
// Should show: { facilityId, role, tier }
```

**Test Feature Flags:**
```javascript
import { getFeatureFlag } from './service_tree/services/flags';

const hasAI = getFeatureFlag('enable_ai_assistant', {
  facilityId: 'fac_test',
  tier: 'ENTERPRISE',
  role: 'admin'
});
console.log('AI Enabled:', hasAI);
```

**Test Notifications:**
```javascript
import { createAnnouncement } from './service_tree/services/notifications';

await createAnnouncement({
  title: 'Test Announcement',
  body: 'This is a test',
  priority: 'LOW',
  target: { type: 'USER', userIds: ['your-user-id'] }
}, 'admin-id', 'fac-id');
```

### Step 9: Update Existing Auth Flow

Replace existing auth context usage:

**Before:**
```javascript
const { user } = useAuth();
const userData = await getUserProfile(user.uid); // Firestore read
```

**After:**
```javascript
import { useSmartAuth } from './service_tree/services/auth';

const auth = useSmartAuth();
// auth.claims contains facilityId, role, tier - no DB read!
```

## 📊 Monitoring & Debugging

### Sentry Dashboard
- Monitor errors at: https://sentry.io
- All errors include userId, facilityId, tier, role

### LogRocket Sessions
- View session replays at: https://logrocket.com
- Linked to Sentry errors automatically

### Audit Logs
Query in Firestore Console:
```
Collection: system_logs
Where: userId == 'user_123'
Order by: timestamp desc
```

### Feature Flag Testing
Update in Firebase Console → Remote Config, then:
```javascript
import { refreshFeatureFlags } from './service_tree/services/flags';
await refreshFeatureFlags();
```

## 🔒 Security Considerations

1. **Custom Claims are public** - Don't store sensitive data
2. **System logs are backend-only** - Frontend cannot write directly
3. **Notification fanout is triggered** - Cannot be called from frontend
4. **Admin functions require role check** - Claims verified in functions

## 📈 Performance Optimization

1. **Token caching**: Claims cached in token (1 hour)
2. **Remote Config caching**: Fetched every 1 hour
3. **Batch writes**: Notifications written in batches of 500
4. **Lazy telemetry**: LogRocket loads after app initialization

## 🐛 Common Issues

**Issue: Claims not updating**
```javascript
// Force token refresh
const user = firebase.auth().currentUser;
await user.getIdToken(true); // Force refresh
```

**Issue: Remote Config not loading**
```javascript
// Check fetch status
import { getRemoteConfig } from 'firebase/remote-config';
const config = getRemoteConfig();
console.log('Last fetch:', config.fetchTimeMillis);
```

**Issue: Notifications not received**
```javascript
// Check FCM token
const userData = await getDoc(doc(db, 'users', userId));
console.log('FCM Tokens:', userData.data().fcmTokens);
```

## 📝 Additional Resources

- [Firebase Custom Claims Docs](https://firebase.google.com/docs/auth/admin/custom-claims)
- [Remote Config Best Practices](https://firebase.google.com/docs/remote-config/best-practices)
- [Sentry React Integration](https://docs.sentry.io/platforms/javascript/guides/react/)
- [LogRocket Setup Guide](https://docs.logrocket.com/docs/getting-started)

## ✨ Architecture Benefits

1. **No Firestore reads for auth**: Claims in token = faster, cheaper
2. **Centralized audit trail**: Every action logged for compliance
3. **Flexible feature rollout**: Pilot → Beta → General with flags
4. **Scalable notifications**: Fan-out pattern handles thousands of users
5. **Comprehensive debugging**: Sentry + LogRocket = full visibility

---

**Status**: ✅ All infrastructure code complete and ready for deployment
**Next**: Run deployment steps above and test with pilot users

