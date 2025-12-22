# Authorization System - Implementation Checklist
**Production Deployment Guide**

## 📋 Pre-Deployment Checklist

### Phase 1: Code Review ✅ COMPLETE
- [x] Granular permission system created (`permissions.js`)
- [x] Role synchronization triggers implemented (`roleSync.js`)
- [x] Audit logging service created (`auditLog.js`)
- [x] Rate limiting service implemented (`rateLimit.js`)
- [x] Team Settings UI component built (`TeamSettings.js`)
- [x] Firestore security rules updated (`firestore.rules`)
- [x] Test suite created (`authorization.test.js`)
- [x] Documentation completed

### Phase 2: Testing ⏳ PENDING
- [ ] Run unit tests for permission helpers
- [ ] Test role synchronization triggers
- [ ] Verify audit logging functionality
- [ ] Test rate limiting (normal + exceeded cases)
- [ ] UI testing for Team Settings page
- [ ] Cross-facility access tests
- [ ] Permission edge cases
- [ ] Integration tests with existing features

### Phase 3: Database Setup ⏳ PENDING
- [ ] Add `permissions` field to all `facilityProfiles`
- [ ] Backfill default permissions for existing employees
- [ ] Verify all users have correct `roles` array
- [ ] Create indexes for audit_logs queries
- [ ] Create index for rate_limits cleanup

### Phase 4: Backend Deployment ⏳ PENDING
- [ ] Deploy updated Firestore rules
- [ ] Deploy new Cloud Functions
  - [ ] `syncAdminRoles`
  - [ ] `cleanupRolesOnFacilityDelete`
  - [ ] `logAudit`
  - [ ] `getAuditLogs`
  - [ ] `cleanupRateLimits`
  - [ ] `getRateLimitStatus`
- [ ] Enable scheduled cleanup jobs
- [ ] Monitor function logs for errors
- [ ] Set up alerting for failed triggers

### Phase 5: Frontend Deployment ⏳ PENDING
- [ ] Add Team Settings tab to facility dashboard
- [ ] Update imports in existing components
- [ ] Replace direct role checks with permission helpers
- [ ] Add rate limit error handling
- [ ] Add permission-gated UI elements
- [ ] Test in staging environment

### Phase 6: Migration ⏳ PENDING
- [ ] Run data migration script
- [ ] Verify all users migrated correctly
- [ ] Test with real user accounts
- [ ] Monitor for permission errors
- [ ] Gradual rollout to users

### Phase 7: Monitoring ⏳ PENDING
- [ ] Set up audit log monitoring
- [ ] Configure rate limit alerts
- [ ] Monitor role sync trigger performance
- [ ] Track failed authorization attempts
- [ ] Set up dashboard for security metrics

---

## 🔧 Detailed Implementation Steps

### Step 1: Database Preparation

**Create Indexes**:
```bash
# Firestore indexes for audit logs
gcloud firestore indexes create --collection-group=audit_logs --field-config field-path=userId,order=ASCENDING --field-config field-path=timestamp,order=DESCENDING

gcloud firestore indexes create --collection-group=audit_logs --field-config field-path=metadata.facilityId,order=ASCENDING --field-config field-path=timestamp,order=DESCENDING
```

**Migration Script**:
```javascript
// Run this script once to migrate existing facilities
const migrateExistingFacilities = async () => {
  const snapshot = await admin.firestore()
    .collection('facilityProfiles')
    .get();

  const batch = admin.firestore().batch();

  snapshot.forEach(doc => {
    const data = doc.data();
    const permissions = {};

    // Give employees default permissions if not already set
    const employees = data.employees || [];
    employees.forEach(employeeId => {
      if (!data.permissions || !data.permissions[employeeId]) {
        permissions[employeeId] = ROLE_PRESETS.EMPLOYEE.permissions;
      }
    });

    // Update document if needed
    if (Object.keys(permissions).length > 0) {
      batch.update(doc.ref, {
        permissions: { ...data.permissions, ...permissions }
      });
    }
  });

  await batch.commit();
  console.log('Migration complete');
};

// Execute
migrateExistingFacilities().catch(console.error);
```

### Step 2: Deploy Backend Functions

```bash
# Navigate to functions directory
cd functions

# Install dependencies
npm install

# Run tests
npm test

# Deploy specific functions
firebase deploy --only functions:syncAdminRoles
firebase deploy --only functions:cleanupRolesOnFacilityDelete
firebase deploy --only functions:logAudit
firebase deploy --only functions:getAuditLogs
firebase deploy --only functions:cleanupRateLimits
firebase deploy --only functions:getRateLimitStatus

# Or deploy all at once
firebase deploy --only functions
```

### Step 3: Update Firestore Rules

```bash
# Deploy updated rules
firebase deploy --only firestore:rules

# Verify rules deployed
firebase firestore:rules get
```

### Step 4: Update Existing Cloud Functions

**Add rate limiting to existing functions**:

```javascript
// In functions/api/index.js
const { rateLimitMiddleware } = require('./services/rateLimit');
const { logAuditEvent, AUDIT_EVENT_TYPES } = require('./services/auditLog');

exports.marketplaceAPI = functions.https.onCall(async (data, context) => {
  const { action, ...params } = data;
  
  switch (action) {
    case 'createPosition': {
      // Add rate limiting
      await rateLimitMiddleware('CREATE_POSITION')(data, context);
      
      // Existing logic...
      
      // Add audit logging
      await logAuditEvent({
        eventType: AUDIT_EVENT_TYPES.POSITION_CREATED,
        userId: context.auth.uid,
        action: 'Created position',
        resource: { type: 'position', id: positionId },
        metadata: { facilityId: params.facilityProfileId },
        success: true
      });
      
      break;
    }
    // ... other cases
  }
});
```

### Step 5: Frontend Integration

**Add Team Settings to Dashboard**:

```javascript
// In frontend/src/dashboard/pages/FacilityDashboard.js
import TeamSettings from './team/TeamSettings';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';

function FacilityDashboard() {
  const { selectedWorkspace, user } = useDashboard();
  const [facility, setFacility] = useState(null);

  const canManageTeam = hasPermission(
    user,
    PERMISSIONS.FACILITY_MANAGE_TEAM,
    selectedWorkspace.facilityId,
    facility
  );

  return (
    <Tabs>
      {/* Existing tabs */}
      
      {canManageTeam && (
        <Tab label="Team Settings">
          <TeamSettings facilityId={selectedWorkspace.facilityId} />
        </Tab>
      )}
    </Tabs>
  );
}
```

**Replace Role Checks with Permissions**:

```javascript
// Before
if (user.roles.includes(`facility_admin_${facilityId}`)) {
  // Show admin UI
}

// After
if (hasPermission(user, PERMISSIONS.FACILITY_MANAGE_TEAM, facilityId, facility)) {
  // Show admin UI
}
```

### Step 6: Testing

**Run Backend Tests**:
```bash
cd functions
npm test authorization.test.js
```

**Manual Testing Checklist**:
- [ ] Create facility as admin
- [ ] Add team member (verify role sync)
- [ ] Change member role (verify sync)
- [ ] Update member permissions
- [ ] Apply role preset
- [ ] Remove team member (verify cleanup)
- [ ] Verify audit logs created
- [ ] Test rate limiting (create 10+ positions rapidly)
- [ ] Check cross-facility access (should be denied)
- [ ] Test with employee account (limited permissions)
- [ ] Test with manager account (intermediate permissions)

---

## 🚀 Deployment Steps

### Development Environment

```bash
# 1. Update dependencies
npm install

# 2. Run tests
npm test

# 3. Deploy to dev project
firebase use dev
firebase deploy

# 4. Verify in dev environment
# - Test all features manually
# - Check Cloud Functions logs
# - Verify Firestore rules
```

### Staging Environment

```bash
# 1. Switch to staging
firebase use staging

# 2. Deploy
firebase deploy

# 3. Run integration tests
npm run test:integration

# 4. Performance testing
# - Load test rate limiter
# - Stress test role sync triggers
# - Monitor audit log writes

# 5. Security testing
# - Attempt unauthorized access
# - Test permission bypass attempts
# - Verify audit trails captured
```

### Production Environment

```bash
# 1. Backup Firestore data
gcloud firestore export gs://backup-bucket/backups/$(date +%Y%m%d)

# 2. Switch to production
firebase use production

# 3. Deploy functions only first
firebase deploy --only functions

# 4. Monitor for 1 hour
# - Check error rates
# - Monitor function invocations
# - Review audit logs

# 5. Deploy Firestore rules
firebase deploy --only firestore:rules

# 6. Deploy frontend
npm run build
firebase deploy --only hosting

# 7. Monitor deployment
# - Watch realtime analytics
# - Monitor error logs
# - User feedback
```

---

## 📊 Post-Deployment Monitoring

### Metrics to Track

**Cloud Functions**:
- Invocations per minute
- Error rate
- Execution time (p50, p95, p99)
- Cold start frequency

**Audit Logs**:
- Events per hour
- Failed access attempts
- Most common event types
- User activity patterns

**Rate Limiting**:
- Requests blocked
- Most rate-limited actions
- Users hitting limits repeatedly

**Role Synchronization**:
- Trigger execution time
- Failed syncs
- Inconsistent states

### Alerts to Configure

```javascript
// Example alert configuration (Cloud Monitoring)
{
  displayName: 'High Rate Limit Violations',
  conditions: [{
    displayName: 'Rate limit exceeded 100 times in 1 hour',
    conditionThreshold: {
      filter: 'resource.type="cloud_function" AND metric.type="logging.googleapis.com/user/rate_limit_exceeded"',
      comparison: 'COMPARISON_GT',
      thresholdValue: 100,
      duration: '3600s'
    }
  }]
}
```

### Dashboard Widgets

1. **Authorization Activity**
   - Total authorization checks
   - Successful vs failed
   - By permission type

2. **Rate Limiting**
   - Requests by action type
   - Blocked requests
   - Top users hitting limits

3. **Audit Trail**
   - Recent events
   - Failed access attempts
   - Critical actions (member removal, role changes)

4. **Role Synchronization**
   - Sync operations per day
   - Failed syncs
   - Average sync time

---

## 🔒 Security Verification

### Security Audit Checklist

- [ ] All Firestore collections have explicit rules
- [ ] No `allow read/write: if true` rules
- [ ] All sensitive operations require authentication
- [ ] Permission checks on both frontend and backend
- [ ] Audit logs capture all sensitive actions
- [ ] Rate limits protect against abuse
- [ ] No hard-coded credentials or secrets
- [ ] Environment variables properly configured
- [ ] CORS configured correctly
- [ ] Session tokens properly secured (httpOnly in production)

### Penetration Testing

**Test Cases**:
1. Attempt to bypass frontend permission checks
2. Try to access other facility's data
3. Attempt role escalation
4. Test rate limit bypass
5. SQL injection attempts (N/A for Firestore, but test input validation)
6. XSS attacks in audit log data
7. CSRF token validation

---

## 🐛 Troubleshooting

### Common Issues

**Issue**: Role sync trigger not firing
**Solution**:
- Check Firestore trigger is deployed
- Verify trigger reads correct collection path
- Check Cloud Functions logs for errors
- Ensure service account has necessary permissions

**Issue**: Permission checks failing unexpectedly
**Solution**:
- Verify facility data is loaded
- Check user roles array format
- Ensure facilityId matches
- Log permission check inputs for debugging

**Issue**: Audit logs not appearing
**Solution**:
- Check Firestore rules allow writes from backend
- Verify audit logging service is imported
- Check for errors in function logs
- Ensure logAuditEvent is awaited

**Issue**: Rate limiting not working
**Solution**:
- Verify rate_limits collection exists
- Check rate limit configuration
- Ensure middleware is called before business logic
- Check for clock skew issues

---

## 📞 Rollback Plan

If critical issues arise:

### Emergency Rollback

```bash
# 1. Revert to previous Cloud Functions version
firebase deploy --only functions --version <previous-version>

# 2. Revert Firestore rules
firebase deploy --only firestore:rules --version <previous-version>

# 3. Disable new features in frontend
# Add feature flag to disable Team Settings

# 4. Notify users
# Send communication about temporary rollback

# 5. Investigate and fix
# Review logs, fix issues

# 6. Redeploy when ready
```

### Graceful Degradation

If only parts are failing:
- Disable rate limiting (fail open)
- Disable audit logging (non-critical)
- Keep basic permission checks
- Monitor closely

---

## ✅ Success Criteria

Deployment is successful when:

- [ ] All users can log in normally
- [ ] Team Settings page loads without errors
- [ ] Permission checks work correctly
- [ ] Role synchronization triggers fire successfully
- [ ] Audit logs capture events
- [ ] Rate limiting blocks excessive requests
- [ ] No increase in error rates
- [ ] User feedback is positive
- [ ] All tests pass
- [ ] Monitoring dashboards show healthy metrics

---

## 📚 Documentation Updates

After deployment, update:

- [ ] User-facing documentation (How to manage team members)
- [ ] Admin guide (Permission management)
- [ ] Developer onboarding docs
- [ ] API documentation
- [ ] Security policies
- [ ] Compliance documentation

---

## 🎉 Post-Launch

### Week 1
- Monitor metrics daily
- Collect user feedback
- Fix any bugs promptly
- Optimize performance as needed

### Month 1
- Review audit logs for patterns
- Analyze permission usage
- Identify most-used permissions
- Plan for additional role presets

### Quarter 1
- Comprehensive security review
- Performance optimization
- User training sessions
- Feature enhancements based on feedback

---

**Implementation Checklist Version 2.0** | MediShift Platform | December 2024
