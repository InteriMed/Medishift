# 🚀 Phase 2 Quick Start Guide

## Immediate Action Items (This Week)

### 1. Team Member Management - Foundation
**Estimated Time**: 2-3 days

**Step 1**: Create basic team member list component
```bash
# Create new file
frontend/src/dashboard/pages/team/TeamMembers.js
```

**Step 2**: Add API endpoint for fetching team members
```javascript
// In functions/api/index.js - Add to existing API or create teamAPI
case 'getTeamMembers': {
  const { facilityId } = data;
  // Fetch from facilityProfiles/{facilityId}/admin and /employees
  // Return formatted list with user details
}
```

**Step 3**: Create simple UI to display team
- List of current admins and employees
- Show name, role, email
- Add "Invite Member" button (placeholder for now)

---

### 2. Schedule View - Basic Display
**Estimated Time**: 1-2 days

**Step 1**: Create schedule list component
```bash
frontend/src/dashboard/pages/team/TeamSchedules.js
```

**Step 2**: Fetch existing schedules
```javascript
// Query teamSchedules collection
// Filter by facilityProfileId
// Display schedule periods with status
```

**Step 3**: Show schedule in calendar view
- Use existing calendar component
- Filter to show only team shifts
- Different color for team shifts vs personal events

---

### 3. Time-Off Request List
**Estimated Time**: 1 day

**Step 1**: Create time-off requests component
```bash
frontend/src/dashboard/pages/team/TimeOffRequests.js
```

**Step 2**: Fetch pending requests
```javascript
// Query timeOffRequests collection
// Filter by facilityProfileId and status='pending'
// Show employee name, dates, type, reason
```

**Step 3**: Add approve/reject buttons
- Simple buttons that call API
- Update request status
- Show notification

---

## API Endpoints to Create First

### Priority 1 (This Week)
```javascript
// In functions/api/index.js or new teamAPI.js

1. getTeamMembers(facilityId)
   - Returns list of admins and employees with user details
   
2. getTeamSchedules(facilityId, dateRange)
   - Returns schedules for facility
   
3. getTimeOffRequests(facilityId, status)
   - Returns time-off requests (pending, approved, etc.)
   
4. approveTimeOffRequest(requestId, managerNotes)
   - Approves a time-off request
   
5. rejectTimeOffRequest(requestId, reason)
   - Rejects a time-off request
```

---

## Database Queries Needed

### Team Members
```javascript
// Get facility
const facility = await db.collection('facilityProfiles').doc(facilityId).get();
const { admin, employees } = facility.data();

// Get user details for each
const memberIds = [...admin, ...employees];
const members = await Promise.all(
  memberIds.map(id => db.collection('users').doc(id).get())
);
```

### Schedules
```javascript
// Get schedules for facility
const schedules = await db.collection('teamSchedules')
  .where('facilityProfileId', '==', facilityId)
  .where('periodStartDate', '>=', startDate)
  .where('periodEndDate', '<=', endDate)
  .get();
```

### Time-Off Requests
```javascript
// Get pending requests
const requests = await db.collection('timeOffRequests')
  .where('facilityProfileId', '==', facilityId)
  .where('status', '==', 'pending')
  .orderBy('createdAt', 'desc')
  .get();
```

---

## Component Structure (Quick Start)

```
TeamDashboard.js (Main container)
├── TeamMembers.js (List of team)
├── TeamSchedules.js (Schedule overview)
└── TimeOffRequests.js (Pending requests)
```

**Navigation**: Add tabs or sidebar in Team Dashboard

---

## Cloud Functions to Add

### Time-Off Approval Trigger
```javascript
// In functions/database/index.js

const onTimeOffRequestUpdate = onDocumentUpdated(
  'timeOffRequests/{requestId}',
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    
    // If status changed to 'approved'
    if (before.status !== 'approved' && after.status === 'approved') {
      // Block professional availability if they have one
      await blockAvailabilityForTimeOff(
        after.userId,
        after.startTime,
        after.endTime
      );
    }
  }
);
```

---

## Testing Checklist

- [ ] Can view team members list
- [ ] Can view schedules
- [ ] Can see pending time-off requests
- [ ] Can approve time-off request
- [ ] Can reject time-off request
- [ ] Approved time-off blocks availability (if professional)
- [ ] Permissions work correctly (only managers can approve)

---

## Next Steps After Quick Start

1. **Week 2**: Add team member invitation flow
2. **Week 2**: Create schedule builder UI
3. **Week 3**: Add shift assignment
4. **Week 3**: Marketplace gap detection

See `PHASE2_IMPLEMENTATION.md` for full roadmap.



