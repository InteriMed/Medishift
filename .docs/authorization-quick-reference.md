# Authorization System - Quick Reference Card
**InteriMed Platform | Developer Guide**

## 🚀 Quick Start

### Check Permission (Frontend)
```javascript
import { hasPermission, PERMISSIONS } from '@/utils/permissions';

// Check if user can create positions
if (hasPermission(user, PERMISSIONS.FACILITY_CREATE_POSITIONS, facilityId, facilityData)) {
  // Show create button
}
```

### Check Permission (Backend)
```javascript
const { hasPermission, PERMISSIONS } = require('../utils/permissions');

// Ensure you have facility data
const facilityDoc = await admin.firestore()
  .collection('facilityProfiles')
  .doc(facilityId)
  .get();

if (!hasPermission(user, PERMISSIONS.FACILITY_CREATE_POSITIONS, facilityId, facilityDoc.data())) {
  throw new functions.https.HttpsError('permission-denied', 'Insufficient permissions');
}
```

---

## 📋 Available Permissions

### Facility Management
- `FACILITY_VIEW_SETTINGS` - View facility settings
- `FACILITY_MANAGE_SETTINGS` - Edit facility settings
- `FACILITY_DELETE` - Delete facility

### Team Management
- `FACILITY_VIEW_TEAM` - View team members
- `FACILITY_MANAGE_TEAM` - Add/remove members, assign roles
- `FACILITY_INVITE_MEMBERS` - Invite new members
- `FACILITY_REMOVE_MEMBERS` - Remove team members
- `FACILITY_EDIT_ROLES` - Change member roles/permissions

### Positions & Jobs
- `FACILITY_VIEW_POSITIONS` - View job postings
- `FACILITY_CREATE_POSITIONS` - Create new positions
- `FACILITY_EDIT_POSITIONS` - Edit existing positions
- `FACILITY_DELETE_POSITIONS` - Delete positions

### Applications
- `FACILITY_VIEW_APPLICATIONS` - View applicationsfor positions
- `FACILITY_MANAGE_APPLICATIONS` - Edit application status
- `FACILITY_APPROVE_APPLICATIONS` - Approve applications

### Schedule
- `FACILITY_VIEW_SCHEDULE` - View team schedules
- `FACILITY_CREATE_SCHEDULE` - Create schedules
- `FACILITY_EDIT_SCHEDULE` - Modify schedules
- `FACILITY_DELETE_SCHEDULE` - Delete schedules

### Time-Off
- `FACILITY_REQUEST_TIMEOFF` - Request time-off
- `FACILITY_VIEW_TIMEOFF` - View time-off requests
- `FACILITY_APPROVE_TIMEOFF` - Approve time-off
- `FACILITY_REJECT_TIMEOFF` - Reject time-off

### Messages
- `FACILITY_VIEW_MESSAGES` - View messages
- `FACILITY_SEND_MESSAGES` - Send messages
- `FACILITY_MANAGE_MESSAGES` - Manage conversations

### Contracts
- `FACILITY_VIEW_CONTRACTS` - View contracts
- `FACILITY_CREATE_CONTRACTS` - Create contracts
- `FACILITY_EDIT_CONTRACTS` - Edit contracts
- `FACILITY_APPROVE_CONTRACTS` - Approve contracts

### Calendar
- `FACILITY_VIEW_EVENTS` - View calendar
- `FACILITY_CREATE_EVENTS` - Create events
- `FACILITY_EDIT_EVENTS` - Edit events
- `FACILITY_DELETE_EVENTS` - Delete events
- `FACILITY_CREATE_TEAM_EVENTS` - Create events for team members

### Billing & Reports
- `FACILITY_VIEW_BILLING` - View billing info
- `FACILITY_MANAGE_BILLING` - Manage payments
- `FACILITY_VIEW_REPORTS` - View reports
- `FACILITY_EXPORT_REPORTS` - Export report data

---

## 🎭 Role Presets

### Owner
**All permissions** - Complete facility control

### Administrator
**Most permissions except**:
- Facility deletion

**Use for**: Facility managers, senior staff

### Manager
**Limited permissions**:
- View team, positions, applications
- Manage schedules and time-off
- View contracts and messages
- Create calendar events

**Use for**: Shift managers, team leads

### Employee
**Basic permissions**:
- View team and schedule
- Request time-off
- Send messages
- View calendar

**Use for**: Regular staff members

---

## 🔧 Common Operations

### Apply Role Preset
```javascript
import { ROLE_PRESETS } from '@/utils/permissions';

// Get preset permissions
const managerPermissions = ROLE_PRESETS.MANAGER.permissions;

// Update user permissions
await updateDoc(facilityRef, {
  [`permissions.${userId}`]: managerPermissions
});
```

### Get User's Permissions
```javascript
import { getUserPermissions } from '@/utils/permissions';

const userPermissions = getUserPermissions(user, facilityId, facilityData);
console.log(`User has ${userPermissions.length} permissions`);
```

### Check Multiple Permissions
```javascript
import { hasAllPermissions, hasAnyPermission } from '@/utils/permissions';

// Check if user has ALL permissions
const canManageApplications = hasAllPermissions(user, [
  PERMISSIONS.FACILITY_VIEW_APPLICATIONS,
  PERMISSIONS.FACILITY_MANAGE_APPLICATIONS
], facilityId, facilityData);

// Check if user has ANY permission
const canAccessSchedule = hasAnyPermission(user, [
  PERMISSIONS.FACILITY_VIEW_SCHEDULE,
  PERMISSIONS.FACILITY_EDIT_SCHEDULE
], facilityId, facilityData);
```

---

## 📊 Audit Logging

### Log Event (Frontend)
```javascript
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/services/firebase';

const logAudit = httpsCallable(functions, 'logAudit');

await logAudit({
  eventType: 'position:created',
  action: 'Created new position',
  resource: {
    type: 'position',
    id: positionId,
    name: 'Pharmacist - Night Shift'
  },
  details: {
    jobType: 'pharmacist',
    startDate: '2024-06-01'
  }
});
```

### Log Event (Backend)
```javascript
const { logAuditEvent, AUDIT_EVENT_TYPES } = require('./services/auditLog');

await logAuditEvent({
  eventType: AUDIT_EVENT_TYPES.MEMBER_ADDED,
  userId: context.auth.uid,
  action: `Added team member ${newMemberId}`,
  resource: {
    type: 'user',
    id: newMemberId
  },
  details: {
    role: 'employee'
  },
  metadata: {
    facilityId,
    ip: req.ip
  },
  success: true
});
```

### Query Audit Logs
```javascript
const getAuditLogs = httpsCallable(functions, 'getAuditLogs');

const { logs } = await getAuditLogs({
  facilityId,
  limit: 50,
  filters: {
    eventType: 'team:member_added',
    userId: specificUserId // optional
  }
});
```

---

## ⏱️ Rate Limiting

### Add Rate Limit to Function
```javascript
const { rateLimitMiddleware } = require('./services/rateLimit');

exports.createPosition = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  // Check rate limit
  await rateLimitMiddleware('CREATE_POSITION')(data, context);
  
  // Continue with logic...
});
```

### Check Rate Limit Status
```javascript
const getRateLimitStatus = httpsCallable(functions, 'getRateLimitStatus');

const status = await getRateLimitStatus({
  action: 'CREATE_POSITION'
});

console.log(`Remaining: ${status.maxRequests - status.requests}`);
console.log(`Resets at: ${status.resetAt}`);
```

### Available Rate Limits
| Action | Window | Max Requests |
|--------|--------|--------------|
| CREATE_POSITION | 15 min | 10 |
| APPLY_TO_POSITION | 1 hour | 20 |
| CREATE_AVAILABILITY | 15 min | 15 |
| SEND_MESSAGE | 1 min | 30 |
| CREATE_CONTRACT | 15 min | 5 |
| INVITE_MEMBER | 1 hour | 20 |
| REQUEST_TIMEOFF | 24 hours | 10 |

---

## 🔄 Role Synchronization

**Automatic** - No code required!

When you update `facilityProfiles/{id}`:
```javascript
await updateDoc(facilityRef, {
  admin: arrayUnion(newAdminId)  // Add admin
});
```

**Firestore trigger automatically**:
1. Adds `facility_admin_{id}` to user.roles
2. Updates user.facilityMemberships
3. Removes old employee role if exists
4. Logs the change in audit trail

**No manual sync needed!**

---

## 🎨 UI Integration

### Team Settings Page
```javascript
import TeamSettings from '@/dashboard/pages/team/TeamSettings';

// In facility dashboard
<Tab label="Team Settings">
  <TeamSettings facilityId={selectedWorkspace.facilityId} />
</Tab>
```

### Permission-Gated UI
```javascript
import { hasPermission, PERMISSIONS } from '@/utils/permissions';

function PositionManagement() {
  const { user, selectedWorkspace } = useDashboard();
  const [facility, setFacility] = useState(null);

  const canCreate = hasPermission(
    user,
    PERMISSIONS.FACILITY_CREATE_POSITIONS,
    selectedWorkspace.facilityId,
    facility
  );

  return (
    <div>
      {canCreate && (
        <button onClick={createPosition}>
          Create Position
        </button>
      )}
    </div>
  );
}
```

---

## 🧪 Testing

### Run Tests
```bash
cd functions
npm test authorization.test.js
```

### Test Coverage
- ✅ Permission checking (admin, manager, employee)
- ✅ Role synchronization
- ✅ Audit logging
- ✅ Rate limiting
- ✅ Cross-facility access control

---

## 🚨 Common Pitfalls

### ❌ Don't Do This
```javascript
// DON'T check roles directly
if (user.roles.includes('facility_admin_123')) {
  // This bypasses permission system!
}
```

### ✅ Do This Instead
```javascript
// DO use permission helpers
if (hasPermission(user, PERMISSIONS.FACILITY_MANAGE_TEAM, facilityId, facilityData)) {
  // Proper permission check
}
```

### ❌ Don't Do This
```javascript
// DON'T modify roles manually
await updateDoc(userRef, {
  roles: [...user.roles, 'facility_admin_123']
});
```

### ✅ Do This Instead
```javascript
// DO update facility document (trigger handles role sync)
await updateDoc(facilityRef, {
  admin: arrayUnion(userId)
});
```

---

## 📦 Package Imports

### Frontend
```javascript
// Permissions
import { 
  hasPermission,
  getUserPermissions,
  hasAnyPermission,
  hasAllPermissions,
  PERMISSIONS,
  ROLE_PRESETS 
} from '@/utils/permissions';

// Firebase
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/services/firebase';
```

### Backend
```javascript
// Permissions
const { 
  hasPermission,
  PERMISSIONS,
  ROLE_PRESETS 
} = require('../utils/permissions');

// Services
const { logAuditEvent, AUDIT_EVENT_TYPES } = require('./services/auditLog');
const { rateLimitMiddleware, RATE_LIMITS } = require('./services/rateLimit');
```

---

## 🔐 Security Best Practices

1. **Always check permissions** on both frontend AND backend
2. **Log sensitive actions** with audit trail
3. **Apply rate limits** to spam-prone endpoints
4. **Use role presets** for consistency
5. **Test permission changes** thoroughly
6. **Monitor audit logs** for suspicious activity

---

## 📞 Need Help?

### Documentation
- Full guide: `.docs/authorization-improvements-summary.md`
- Security review: `.docs/authorization-review.md`

### Testing
- Test suite: `functions/tests/authorization.test.js`
- Run: `npm test authorization.test.js`

### Code Examples
- Permission system: `frontend/src/utils/permissions.js`
- Team Settings UI: `frontend/src/dashboard/pages/team/TeamSettings.js`
- Audit logging: `functions/services/auditLog.js`
- Rate limiting: `functions/services/rateLimit.js`

---

**Quick Reference Version 2.0** | Last Updated: December 2024
