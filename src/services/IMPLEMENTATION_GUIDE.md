# Service Tree - Core Infrastructure

This directory contains the core service infrastructure for the Swiss Healthcare HR Platform.

## Architecture Overview

The Service Tree follows these principles:

1. **Trust the Token**: Authentication uses Firebase Custom Claims - no Firestore reads on every call
2. **Auditability**: Every action is logged to `system_logs` collection
3. **Scalability**: Fan-out pattern for notifications (write to individual user docs)
4. **Feature Flags**: Hybrid model combining Remote Config (global) + Custom Claims (local)

## Directory Structure

```
src/services/
├── actions/                  # (Future: Action Catalog)
├── services/
│   ├── auth.ts               # Custom Claims & Token Logic
│   ├── audit.ts              # Central Audit Logger
│   ├── flags.ts              # Feature Flag Logic (Remote Config + Claims)
│   ├── notifications.ts      # Fan-out logic & FCM
│   ├── telemetry.ts          # Sentry/LogRocket wrapper
│   └── index.ts              # Barrel export
└── types/
    └── context.ts            # TypeScript interfaces
```

## Core Services

### Authentication (`auth.ts`)

**Key Functions:**
- `useSmartAuth()` - React hook that exposes Custom Claims without DB reads
- `getCustomClaims()` - Extracts claims from ID token
- `hasPermission()` - Check if user has required role level
- `isTierAllowed()` - Check if user's tier meets requirement

**Custom Claims Structure:**
```typescript
{
  facilityId: string;
  role: 'admin' | 'facility_admin' | 'professional' | 'coordinator';
  tier: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
}
```

**Backend Triggers (Cloud Functions):**
- `setCustomClaimsOnUserCreation` - Sets default claims on user creation
- `assignFacilityToUser` - Admin function to assign user to facility
- `updateUserTier` - Updates subscription tier for all facility users

### Audit Logging (`audit.ts`)

**Key Functions:**
- `logAudit()` - Primary audit logger (logs to `system_logs`)
- `logUserAction()` - Logs user-initiated actions
- `logSecurityEvent()` - Logs auth events (login, failed login, etc.)
- `logDataAccess()` - GDPR compliance logging

**Log Structure:**
```typescript
{
  userId: string;
  facilityId: string;
  actionId: string;
  timestamp: Timestamp;
  ipAddress: string;
  status: 'START' | 'SUCCESS' | 'ERROR';
  metadata: Record<string, any>;
}
```

### Feature Flags (`flags.ts`)

**Key Functions:**
- `getFeatureFlag()` - Get flag value (combines Remote Config + Claims)
- `useFeatureFlag()` - React hook for feature flags
- `checkTierAccess()` - Verify tier meets requirement

**Logic:**
1. Check Remote Config for global flag
2. Check if facility is in pilot/beta list
3. Check user's tier against feature requirements
4. Return combined result

**Tier-Based Features:**
- AI Assistant: PROFESSIONAL, ENTERPRISE
- Advanced Analytics: ENTERPRISE only
- Payroll Automation: PROFESSIONAL, ENTERPRISE
- Document AI: ENTERPRISE only

### Notifications (`notifications.ts`)

**Key Functions:**
- `createAnnouncement()` - Creates announcement doc (triggers fanout)
- `broadcastNotification()` - Sends to multiple users
- `sendPushNotification()` - Sends FCM push message
- `fanOutNotifications()` - Batched write to individual user notification collections

**Fan-Out Pattern:**
When announcement is created:
1. Query target users (by role, facility, or specific IDs)
2. Write notification doc to `users/{uid}/notifications/{id}` for each recipient
3. For HIGH/CRITICAL priority: send FCM push message
4. Update announcement with recipient count

**Priority Rules:**
- CRITICAL → Push (Sound) + In-app
- HIGH → Push (Silent) + In-app  
- LOW → In-app only (red dot)

**Backend Trigger:**
- `onAnnouncementCreated` - Firestore trigger that performs fan-out

### Telemetry (`telemetry.ts`)

**Key Functions:**
- `initializeTelemetry()` - Initialize Sentry + Session Replay
- `setTelemetryUser()` - Attach user context to all errors
- `captureError()` - Log error with context
- `withTelemetry()` - Wrapper for operations with automatic error tracking
- `initializeLogRocket()` - Session replay for debugging

**Context Attached:**
Every error automatically includes:
- userId
- facilityId
- role
- tier
- LogRocket session URL (if available)

## Backend (Cloud Functions)

Located in `functions/` directory:

### `functions/auth/customClaims.js`
- User creation trigger (sets default claims)
- Facility assignment (admin callable)
- Tier updates (admin callable)

### `functions/triggers/notificationFanout.js`
- Firestore trigger on `announcements` collection
- Performs batched writes to user notification subcollections
- Sends FCM messages based on priority

## Usage Examples

### Frontend: Use Smart Auth

```typescript
import { useSmartAuth, hasPermission } from '@/services/services/auth';

function MyComponent() {
  const auth = useSmartAuth();

  if (!auth) return <LoginPrompt />;

  // No Firestore read - claims are in the token!
  const canManageShifts = hasPermission(auth.claims, 'coordinator');

  return <div>Welcome, {auth.claims.role}</div>;
}
```

### Frontend: Feature Flags

```typescript
import { useFeatureFlag } from '@/services/services/flags';
import { useSmartAuth } from '@/services/services/auth';

function AIAssistantButton() {
  const auth = useSmartAuth();
  const hasAI = useFeatureFlag('enable_ai_assistant', auth?.claims);

  if (!hasAI) return null;

  return <button>Ask AI</button>;
}
```

### Frontend: Send Notification

```typescript
import { broadcastNotification } from '@/services/services/notifications';

await broadcastNotification({
  title: 'System Maintenance',
  body: 'Scheduled downtime on Sunday',
  priority: 'HIGH',
  target: {
    type: 'FACILITY',
    facilityIds: ['fac_123'],
  },
}, currentUserId, facilityId);
```

### Frontend: Error Tracking

```typescript
import { setTelemetryUser, captureError } from '@/services/services/telemetry';

// On login
setTelemetryUser({
  userId: user.uid,
  email: user.email,
  facilityId: claims.facilityId,
  tier: claims.tier,
  role: claims.role,
});

// On errors
try {
  await riskyOperation();
} catch (error) {
  captureError(error, { operation: 'riskyOperation' });
  throw error;
}
```

## Security Rules

### Firestore Rules

```
// system_logs: Write from backend only
match /system_logs/{logId} {
  allow read: if request.auth.token.role == 'admin';
  allow write: if false; // Backend only
}

// User notifications: User can only read their own
match /users/{userId}/notifications/{notificationId} {
  allow read: if request.auth.uid == userId;
  allow write: if false; // Backend writes via fanout
}

// Announcements: Admins only
match /announcements/{announcementId} {
  allow read: if request.auth != null;
  allow create: if request.auth.token.role in ['admin', 'facility_admin'];
  allow update, delete: if request.auth.token.role == 'admin';
}
```

## Configuration

### Environment Variables

**Frontend (.env):**
```
REACT_APP_SENTRY_DSN=https://...
REACT_APP_LOGROCKET_APP_ID=your-app-id
```

**Backend (functions/.env):**
```
FIREBASE_PROJECT_ID=your-project
SENTRY_DSN=https://...
```

### Firebase Remote Config

Default values in `flags.ts`:
```typescript
{
  enable_ai_assistant: false,
  enable_advanced_analytics: false,
  enable_payroll_automation: false,
  enable_shift_swap: true,
  enable_marketplace: false,
  enable_document_ai: false,
  pilot_facilities: '[]',
  beta_facilities: '[]'
}
```

## Installation

### Frontend Dependencies

```bash
npm install @sentry/react @sentry/tracing
npm install logrocket  # Optional
```

### Backend Dependencies

```bash
cd functions
npm install firebase-admin firebase-functions
```

## Deployment

### Deploy Functions

```bash
firebase deploy --only functions:setCustomClaimsOnUserCreation
firebase deploy --only functions:assignFacilityToUser
firebase deploy --only functions:onAnnouncementCreated
firebase deploy --only functions:sendPushNotification
```

### Initialize Telemetry (Frontend)

Add to `src/index.js`:

```typescript
import { initializeTelemetry } from '@/services/services/telemetry';

initializeTelemetry(process.env.REACT_APP_SENTRY_DSN);
```

## Testing

### Test Custom Claims

```typescript
// In Firebase Console or Admin SDK
admin.auth().setCustomUserClaims('user123', {
  facilityId: 'fac_test',
  role: 'coordinator',
  tier: 'PROFESSIONAL'
});
```

### Test Feature Flags

```typescript
// In Firebase Console → Remote Config
{
  "enable_ai_assistant": true,
  "pilot_facilities": '["fac_123", "fac_456"]'
}
```

### Test Notifications

```typescript
await createAnnouncement({
  title: 'Test',
  body: 'This is a test',
  priority: 'LOW',
  target: { type: 'USER', userIds: ['user123'] }
}, 'admin_uid', 'fac_test');
```

## Migration Path

If upgrading from existing auth system:

1. Run migration script to set claims for existing users
2. Update frontend to use `useSmartAuth()` instead of context
3. Remove Firestore reads from auth flows
4. Deploy backend functions
5. Test with pilot users first

## Troubleshooting

**Custom Claims not updating:**
- Client must call `getIdToken(true)` to force refresh
- Or wait for automatic token refresh (every 1 hour)

**Feature flags not working:**
- Check Remote Config has been fetched
- Verify tier hierarchy logic
- Check pilot/beta facility lists

**Notifications not received:**
- Verify FCM token is stored in user doc
- Check Firestore trigger is deployed
- Verify push notification permissions

## Future Enhancements

- [ ] Action Catalog integration
- [ ] SMS notifications for CRITICAL priority
- [ ] Webhook support for external systems
- [ ] Advanced audit log querying UI
- [ ] A/B testing framework integration

---

## Workspace Access - Multi-Tenancy "Passport Strategy"

### Overview

The workspace access system implements a "Passport Strategy" for multi-tenancy, where users receive a custom token with workspace claims embedded when they switch workspaces.

### Architecture: "Trust the Token"

1. **User logs in**: Gets a "Global Token" (No workspace access yet, or default)
2. **User selects Workspace**: Calls `workspace.switch` Cloud Function
3. **Action verifies**: Checks `facilityProfiles` for membership
4. **Action returns**: A new Custom Token with `facilityId` embedded in claims
5. **Frontend re-auths**: Uses the new token. All subsequent API calls carry the `facilityId`

### Key Benefits

- **Security**: User cannot spoof `facilityId` because it's in the signed JWT token
- **Performance**: No DB read on every action - workspace verified once at entry
- **Simplicity**: Actions assume `ctx.facilityId` exists and is valid

### Implementation Files

**Backend (Cloud Functions):**
- `functions/api/workspaceAccess.js` - Contains `switchWorkspace` and `checkWorkspaces` functions
- Exported in `functions/index.js`

**Frontend:**
- `src/hooks/useWorkspaceAccess.js` - React hook that calls backend and re-authenticates
- `src/services/actions/middleware/buildActionContext.ts` - Client-side context builder (see note below)

### Custom Claims Structure

```typescript
// After workspace.switch
{
  workspaceId: string;          // 'personal' | facilityId | orgId | 'admin'
  workspaceType: string;        // 'personal' | 'facility' | 'organization' | 'admin'
  facilityId?: string;          // Set for facility workspaces
  organizationId?: string;      // Set for organization workspaces
  roles?: string[];             // User's roles in this workspace
  permissions: string[];        // Derived from roles (RBAC)
}
```

### Facility Membership Verification

The backend verifies membership by checking the facility profile:

```typescript
// Source of Truth: facilityProfiles/{facilityId}
const facilityData = facilitySnap.data();
const employees = facilityData.employees || [];
const employeeRecord = employees.find(emp => emp.user_uid === userId);

// Security Checks:
if (!employeeRecord) {
  throw new HttpsError('permission-denied', 'Not a member of this facility');
}

if (employeeRecord.status && employeeRecord.status !== 'ACTIVE') {
  throw new HttpsError('permission-denied', 'Account status is not ACTIVE');
}
```

### Frontend Usage

```typescript
import { useWorkspaceAccess } from '@/hooks/useWorkspaceAccess';

function WorkspaceSwitcher() {
  const { workspaces, switchWorkspace, switching } = useWorkspaceAccess();

  const handleSwitch = async (facilityId) => {
    const success = await switchWorkspace(facilityId);
    if (success) {
      // User is now re-authenticated with facility passport
      // Navigate to facility dashboard
    }
  };

  return (
    <select onChange={(e) => handleSwitch(e.target.value)} disabled={switching}>
      {workspaces.map(ws => (
        <option key={ws.id} value={ws.id}>{ws.name}</option>
      ))}
    </select>
  );
}
```

### Tenant Isolation

Actions automatically enforce tenant isolation through the `facilityId` in claims:

```typescript
// In any action handler
import { validateTenantIsolation } from '@/services/actions/middleware/buildActionContext';

export const myAction = {
  handler: async (input, ctx) => {
    // Ensure user can only access their own facility's data
    validateTenantIsolation(ctx, input.targetFacilityId, 'my.action');
    
    // Proceed with action...
  }
};
```

### Important Notes

**Current Architecture:**
- Most actions run **client-side** using Firebase Client SDK
- `switchWorkspace` runs **server-side** (Cloud Function) because `createCustomToken()` requires Admin SDK
- Client-side context is built from Firebase auth state (trusted because Firebase SDK verifies tokens)

**Future Migration:**
- When actions move to backend, implement server-side `buildActionContextFromToken()` (see middleware file for example)
- Server-side should verify ID token with Admin SDK
- Extract claims and enforce workspace requirements

### Deployment

```bash
# Deploy workspace access functions
firebase deploy --only functions:switchWorkspace,functions:checkWorkspaces
```

### Testing

```typescript
// Call from frontend
const { switchWorkspace } = useWorkspaceAccess();
await switchWorkspace('fac_123');

// Verify claims updated
const user = auth.currentUser;
const token = await user.getIdTokenResult();
console.log(token.claims.facilityId); // Should be 'fac_123'
```

### Troubleshooting

**Workspace switch fails:**
- Check user is in `facilityProfiles/{facilityId}/employees` array
- Verify `status` field is 'ACTIVE' or missing
- Check Cloud Function logs in Firebase Console

**Claims not updating after switch:**
- Frontend must call `getIdToken(true)` to force refresh
- Check that `signInWithCustomToken()` completed successfully
- Verify no errors in browser console

