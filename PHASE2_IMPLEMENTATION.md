# 🏥 Phase 2: Comprehensive Team Management System

## 🎯 Project Goal (Phase 2)

To deliver a complete internal team management platform for facilities, enabling them to manage their employees, schedules, time-off, and staffing needs directly through the system. This builds on Phase 1's marketplace matching by providing facilities with the tools to manage their existing teams and integrate marketplace hires seamlessly.

**TIMELINE**: Immediate implementation (current functions) + Future roadmap (1-3 months)

---

## 📊 Current State Analysis

### ✅ What Already Exists

1. **Database Structure**
   - `facilityProfiles` with `admin` and `employees` arrays
   - `teamSchedules` collection with `shifts` subcollection
   - `timeOffRequests` collection
   - `teamMembers` subcollection structure (documented but not fully implemented)

2. **Basic Functions**
   - Role synchronization triggers (`syncAdminRoles`)
   - Team shift creation in calendar (`teamShift` event type)
   - Time-off request creation
   - Basic team settings page (`TeamSettings.js`)

3. **Workspace System**
   - Team workspace concept exists
   - Workspace selection logic
   - Permission system foundation

### ❌ What's Missing

1. **Team Member Management**
   - Add/remove team members UI
   - Team member onboarding flow
   - Role assignment (manager, scheduler, employee)
   - Team member profile management

2. **Schedule Management**
   - Schedule creation UI
   - Shift assignment interface
   - Schedule publishing workflow
   - Schedule versioning and history

3. **Time-Off Management**
   - Time-off approval workflow UI
   - Calendar integration for time-off
   - Automatic availability blocking
   - Time-off balance tracking

4. **Advanced Features**
   - Shift subletting functionality
   - Staffing gap detection
   - Team analytics and reporting
   - Integration with marketplace for gap filling

---

## 🚀 Phase 2 Implementation Plan

### **IMMEDIATE (Current Sprint - Weeks 1-2)**

#### 1.1 Team Member Management Core
**Priority**: HIGH  
**Status**: Foundation exists, needs UI implementation

**Tasks**:
- [ ] Create `TeamMembers.js` component for managing team roster
- [ ] Implement add team member flow (invite by email or search existing users)
- [ ] Implement remove/deactivate team member functionality
- [ ] Add role assignment UI (admin, manager, scheduler, employee)
- [ ] Create team member detail view with employment info
- [ ] Add team member search and filtering

**API Endpoints Needed**:
```javascript
// New endpoints in facilityAPI or teamAPI
- inviteTeamMember(facilityId, email, role, jobTitle)
- addTeamMember(facilityId, userId, role, jobTitle)
- updateTeamMemberRole(facilityId, userId, newRole)
- removeTeamMember(facilityId, userId)
- getTeamMembers(facilityId, filters)
```

**Database Updates**:
- Ensure `teamMembers` subcollection is properly used
- Sync with `admin`/`employees` arrays in facilityProfile
- Add `teamRoles` array to team member documents

**Files to Create/Modify**:
- `frontend/src/dashboard/pages/team/TeamMembers.js` (NEW)
- `frontend/src/dashboard/pages/team/TeamMemberCard.js` (NEW)
- `frontend/src/dashboard/pages/team/AddTeamMemberModal.js` (NEW)
- `frontend/src/services/teamService.js` (NEW or extend existing)
- `functions/api/index.js` - Add team management endpoints

---

#### 1.2 Schedule Management Foundation
**Priority**: HIGH  
**Status**: Database structure exists, needs UI

**Tasks**:
- [ ] Create `TeamSchedules.js` component for schedule overview
- [ ] Implement schedule creation UI (monthly/weekly periods)
- [ ] Build shift assignment interface (drag-and-drop or form-based)
- [ ] Add schedule status management (draft → published → locked)
- [ ] Create schedule calendar view for team members
- [ ] Implement schedule versioning (track changes)

**API Endpoints Needed**:
```javascript
// New endpoints
- createSchedule(facilityId, periodStart, periodEnd, notes)
- updateSchedule(scheduleId, updates)
- publishSchedule(scheduleId)
- lockSchedule(scheduleId)
- addShift(scheduleId, shiftData)
- updateShift(shiftId, updates)
- deleteShift(shiftId)
- getSchedule(facilityId, periodStart, periodEnd)
- getTeamMemberSchedule(userId, facilityId, dateRange)
```

**Database Structure** (Already exists, verify):
```javascript
teamSchedules/{scheduleId}
  - facilityProfileId
  - periodStartDate
  - periodEndDate
  - status: 'draft' | 'published_to_team' | 'locked'
  - version: number
  - shifts/{shiftId}
    - userId
    - startTime
    - endTime
    - roleOrTask
    - notes
    - isSublettable
    - subletStatus
```

**Files to Create/Modify**:
- `frontend/src/dashboard/pages/team/TeamSchedules.js` (NEW)
- `frontend/src/dashboard/pages/team/ScheduleBuilder.js` (NEW)
- `frontend/src/dashboard/pages/team/ShiftAssignmentModal.js` (NEW)
- `frontend/src/dashboard/pages/team/ScheduleCalendar.js` (NEW)
- `frontend/src/services/scheduleService.js` (NEW)

---

#### 1.3 Time-Off Request Workflow
**Priority**: HIGH  
**Status**: Basic structure exists, needs approval UI

**Tasks**:
- [ ] Create `TimeOffRequests.js` component for managers
- [ ] Build time-off request submission form (already exists in calendar)
- [ ] Implement approval/rejection workflow UI
- [ ] Add time-off calendar view (overlay on schedule)
- [ ] Create automatic availability blocking (Cloud Function)
- [ ] Add time-off balance tracking per employee

**API Endpoints Needed**:
```javascript
// Extend existing or create new
- submitTimeOffRequest(facilityId, requestData)
- approveTimeOffRequest(requestId, managerNotes)
- rejectTimeOffRequest(requestId, managerNotes, reason)
- cancelTimeOffRequest(requestId) // by employee
- getTimeOffRequests(facilityId, filters)
- getTimeOffBalance(userId, facilityId)
```

**Cloud Functions Needed**:
```javascript
// In functions/database/index.js
- onTimeOffApproved: When time-off approved, block professional availability
- onTimeOffRejected: Handle rejection notifications
```

**Files to Create/Modify**:
- `frontend/src/dashboard/pages/team/TimeOffRequests.js` (NEW)
- `frontend/src/dashboard/pages/team/TimeOffApprovalCard.js` (NEW)
- `frontend/src/dashboard/pages/team/TimeOffCalendar.js` (NEW)
- `functions/database/index.js` - Add time-off triggers

---

### **SHORT-TERM (Weeks 3-4)**

#### 2.1 Enhanced Team Member Features
**Priority**: MEDIUM

**Tasks**:
- [ ] Add employment details (start date, employment type, default hours)
- [ ] Implement team member skills tracking
- [ ] Create team member performance notes (internal only)
- [ ] Add team member availability preferences
- [ ] Build team member profile view (employment-specific)

**Database Updates**:
```javascript
teamMembers/{userId}
  - employmentType: 'full_time' | 'part_time' | 'contractor'
  - defaultWeeklyHours: number
  - startDate: Timestamp
  - skills: string[]
  - availabilityPreferences: object
  - performanceNotes: array (manager-only)
```

---

#### 2.2 Schedule Optimization Features
**Priority**: MEDIUM

**Tasks**:
- [ ] Add minimum staffing requirements checking
- [ ] Implement shift conflict detection
- [ ] Create schedule templates (recurring patterns)
- [ ] Add shift swap request functionality
- [ ] Build schedule coverage analysis

**API Endpoints**:
```javascript
- checkStaffingCoverage(scheduleId)
- detectConflicts(scheduleId)
- createScheduleTemplate(facilityId, templateData)
- requestShiftSwap(shiftId, targetUserId)
- approveShiftSwap(swapRequestId)
```

---

#### 2.3 Integration with Marketplace
**Priority**: MEDIUM

**Tasks**:
- [ ] Detect staffing gaps in schedules
- [ ] Auto-suggest posting to marketplace
- [ ] Quick position creation from gap
- [ ] Link marketplace hires to team members
- [ ] Track marketplace vs internal hires

**Workflow**:
1. Manager identifies gap in schedule
2. System suggests: "Post to marketplace?" or "Sublet existing shift?"
3. Quick position creation with pre-filled data
4. When position filled → auto-add to team members

---

### **FUTURE ROADMAP (1-3 Months)**

#### 3.1 Shift Subletting System
**Priority**: LOW (Future)

**Features**:
- Mark shifts as sublettable
- Post sublet shifts to marketplace
- Accept sublet requests from other facilities
- Create sublet contracts automatically
- Track sublet history

**Database Updates**:
```javascript
shifts/{shiftId}
  - isSublettable: boolean
  - subletStatus: 'none' | 'available_for_sublet' | 'pending_sublet_acceptance' | 'sublet_confirmed'
  - subletToFacilityId: string
  - subletContractId: string
  - lendingFacilityProfileId: string
```

**API Endpoints**:
```javascript
- markShiftSublettable(shiftId)
- postSubletToMarketplace(shiftId, positionData)
- acceptSubletRequest(subletRequestId)
- createSubletContract(shiftId, acceptingFacilityId)
```

---

#### 3.2 Team Analytics & Reporting
**Priority**: LOW (Future)

**Features**:
- Team utilization metrics
- Schedule adherence tracking
- Time-off trends
- Cost analysis (hours × rates)
- Staffing efficiency reports
- Marketplace hire success rates

**Components**:
- `TeamAnalytics.js` - Dashboard with charts
- `TeamReports.js` - Exportable reports
- `StaffingInsights.js` - AI-powered suggestions

---

#### 3.3 Advanced Scheduling Features
**Priority**: LOW (Future)

**Features**:
- AI-powered schedule optimization
- Auto-assignment based on preferences
- Shift bidding system
- Overtime tracking and alerts
- Compliance checking (working hours regulations)
- Multi-location support

---

#### 3.4 Team Communication
**Priority**: LOW (Future)

**Features**:
- Team-wide announcements
- Shift-specific notes and handoffs
- Team chat channels
- Notification preferences per team member
- Integration with existing conversation system

---

## 🗂️ File Structure Plan

```
frontend/src/dashboard/pages/team/
├── TeamDashboard.js          # Main team workspace dashboard
├── TeamMembers/
│   ├── TeamMembers.js        # Team roster list
│   ├── TeamMemberCard.js     # Individual member card
│   ├── AddTeamMemberModal.js # Invite/add member
│   ├── TeamMemberDetail.js   # Member detail view
│   └── RoleAssignment.js     # Role management
├── TeamSchedules/
│   ├── TeamSchedules.js      # Schedule list/overview
│   ├── ScheduleBuilder.js    # Create/edit schedules
│   ├── ScheduleCalendar.js   # Calendar view
│   ├── ShiftAssignment.js    # Assign shifts
│   └── ScheduleTemplates.js   # Reusable templates
├── TimeOff/
│   ├── TimeOffRequests.js    # Request list (manager view)
│   ├── TimeOffApproval.js    # Approval workflow
│   ├── TimeOffCalendar.js    # Time-off overlay
│   └── TimeOffBalance.js     # Balance tracking
├── TeamSettings.js           # Existing - enhance
└── TeamAnalytics.js          # Future - reporting

frontend/src/services/
├── teamService.js            # Team member operations
├── scheduleService.js         # Schedule operations
└── timeOffService.js         # Time-off operations

functions/api/
├── index.js                  # Add team management endpoints
└── teamAPI.js                # NEW - Dedicated team API

functions/database/
└── index.js                  # Add team-related triggers
```

---

## 🔐 Security & Permissions

### Role Hierarchy
1. **Facility Admin**: Full access to all team features
2. **Manager**: Can manage schedules, approve time-off, view team
3. **Scheduler**: Can create/edit schedules, assign shifts
4. **Employee**: Can view own schedule, submit time-off requests

### Permission Checks
```javascript
// Example permission checks
const canManageTeam = isFacilityAdmin(facilityId) || hasRole(userId, 'manager');
const canEditSchedule = isFacilityAdmin(facilityId) || hasRole(userId, ['manager', 'scheduler']);
const canApproveTimeOff = isFacilityAdmin(facilityId) || hasRole(userId, 'manager');
```

---

## 📋 Implementation Checklist

### Week 1-2 (Immediate)
- [ ] Team member management UI
- [ ] Basic schedule creation
- [ ] Time-off approval workflow
- [ ] API endpoints for team operations
- [ ] Cloud Functions for time-off automation

### Week 3-4 (Short-term)
- [ ] Enhanced team member features
- [ ] Schedule optimization
- [ ] Marketplace integration for gaps
- [ ] Schedule templates

### Month 2-3 (Future)
- [ ] Shift subletting
- [ ] Team analytics
- [ ] Advanced scheduling
- [ ] Team communication

---

## 🔄 Integration Points

### With Phase 1 (Marketplace)
- **Gap Detection** → Auto-suggest position posting
- **Marketplace Hires** → Auto-add to team members
- **Sublet Shifts** → Post to marketplace

### With Existing Systems
- **Calendar** → Team schedules visible in calendar
- **Contracts** → Link marketplace contracts to team members
- **Conversations** → Team-wide communication channels
- **Profiles** → Team member employment details

---

## 📊 Success Metrics

1. **Adoption**: % of facilities using team management features
2. **Efficiency**: Time saved on schedule creation
3. **Coverage**: % of shifts with proper coverage
4. **Integration**: % of marketplace hires added to teams
5. **Satisfaction**: User feedback on team management tools

---

## 🚨 Critical Dependencies

1. **Phase 1 Completion**: Marketplace matching must be stable
2. **Permission System**: Role-based access must be robust
3. **Calendar System**: Must support team schedules
4. **Notification System**: Must support team-wide alerts

---

## 📝 Notes

- **Backward Compatibility**: Ensure existing `admin`/`employees` arrays continue to work
- **Migration**: May need to migrate existing team data to `teamMembers` subcollection
- **Testing**: Focus on multi-user scenarios (managers + employees)
- **Performance**: Schedule queries may need pagination for large teams

---

## 🎯 Quick Wins (Can Start Immediately)

1. **Team Member List View**: Simple table/list of current team
2. **Basic Schedule View**: Display existing schedules
3. **Time-Off Request List**: Show pending requests
4. **Add Team Member Button**: Simple invite flow

These can be built quickly to show progress while larger features are developed.



