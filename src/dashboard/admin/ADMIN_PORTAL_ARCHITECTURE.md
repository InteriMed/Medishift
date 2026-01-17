# MediShift Admin Portal Architecture

## Overview

The Admin Portal is the "Control Tower" for internal team operations. It implements Role-Based Access Control (RBAC) to ensure employees only see what they need.

## Directory Structure

```
src/dashboard/admin/
├── components/
│   └── ProtectedRoute.js          # RBAC route protection
├── pages/
│   ├── ExecutiveDashboard.js       # The Cockpit (Module 1)
│   ├── operations/
│   │   ├── VerificationQueue.js   # Enhanced verification (Module 2A)
│   │   ├── ShiftCommandCenter.js   # Shift management (Module 2B)
│   │   └── UserCRM.js              # User management (Module 2C)
│   ├── finance/
│   │   ├── RevenueAnalysis.js      # Revenue & Commissions (Module 3A)
│   │   ├── AccountsReceivable.js   # AR tracking (Module 3B)
│   │   ├── SpendingsTracker.js     # CAC & Referrals (Module 3C)
│   │   └── BalanceSheet.js          # P&L Snapshot (Module 3D)
│   ├── system/
│   │   ├── AuditLogs.js             # Audit trail (Module 4A)
│   │   └── NotificationsCenter.js   # System announcements (Module 4B)
│   └── management/
│       └── EmployeeManagement.js   # Admin employee management (Module 5)
├── utils/
│   └── rbac.js                      # Role & permission definitions
└── AdminRoute.js                    # Base admin route protection
```

## RBAC System

### Roles

1. **SUPER_ADMIN** - Full access (Founder)
2. **OPS_MANAGER** - Operations & compliance
3. **FINANCE** - Financial data only
4. **RECRUITER** - User verification & shift management
5. **SUPPORT** - User support & impersonation

### Permissions

- `VIEW_DASHBOARD` - Access executive dashboard
- `VIEW_FINANCE` - View financial modules
- `VIEW_BALANCE_SHEET` - Access balance sheet
- `VERIFY_USERS` - Approve/reject users
- `MANAGE_SHIFTS` - Manage shifts
- `FORCE_ASSIGN_SHIFTS` - Force assign shifts (God Mode)
- `EDIT_PAY_RATES` - Edit hourly rates
- `VIEW_USER_PROFILES` - Access user CRM
- `IMPERSONATE_USERS` - Ghost mode
- `VIEW_AUDIT_LOGS` - View audit trail
- `MANAGE_EMPLOYEES` - Invite/manage admin employees
- `SEND_NOTIFICATIONS` - Send system announcements
- `VIEW_REVENUE` - View revenue data
- `EXPORT_DATA` - Export CSV/Excel
- `DELETE_DATA` - Delete records (Super Admin only)

## Module 1: Executive Dashboard ✅

**Status**: Implemented

**Features**:
- Real-time activity metrics (Live Shifts, Urgent Vacancies, Pending Verifications)
- Financial pulse (GMV, Net Revenue, Fill Rate) with sparklines
- Growth metrics (New Signups, CAC)
- Sparkline charts for trend visualization

## Module 2: Operations Module

### 2A: Verification Queue ✅
**Status**: Enhanced from original implementation

**Features**:
- Split view: User data + Document viewer
- Swiss compliance checks (AVS, GLN, Permit)
- Approve/Reject/Request Resubmission actions

### 2B: Shift Command Center ✅
**Status**: Implemented

**Features**:
- Table view of all shifts
- Filters: Unfilled, Applied, Confirmed, Completed
- God Mode actions (permission-based):
  - Force Assign: Manually assign nurse to shift
  - Edit Pay: Adjust hourly rate
- Margin column (hidden for basic users)

### 2C: User CRM ✅
**Status**: Implemented

**Features**:
- Professional & Facility profiles
- Shift history & Reliability Score
- Internal notes section
- Ghost Mode (Impersonation) button

## Module 3: Financial Suite

### 3A: Revenue & Margin Analysis
**Status**: TODO

**Features Needed**:
- Commission tracker breakdown
- Margin per profession chart
- SaaS MRR tracking
- Churn rate calculation

### 3B: Accounts Receivable
**Status**: TODO

**Features Needed**:
- Unpaid commissions tracker
- Outstanding invoices
- Send reminder email button

### 3C: Spendings & CAC Tracker
**Status**: TODO

**Features Needed**:
- Referral payout table
- Marketing spend tracking
- CAC calculation

### 3D: Balance Sheet (P&L Snapshot)
**Status**: TODO

**Features Needed**:
- Revenue breakdown
- Direct costs tracking
- Gross profit calculation
- Fixed costs input field

## Module 4: System & Audit

### 4A: Audit Logs
**Status**: TODO

**Features Needed**:
- Who approved this user?
- Who changed commission rate?
- Full action history with timestamps

### 4B: Notifications Center
**Status**: TODO

**Features Needed**:
- System-wide announcements
- Push notifications to segments
- Notification scheduling

## Module 5: Admin Management

**Status**: TODO

**Features Needed**:
- Invite employees
- Assign roles
- Manage admin access
- View admin activity

## Navigation Structure

```
ADMIN SIDEBAR
├── 🏠 Dashboard (Executive Dashboard)
├── 👥 Users
│   ├── Professionals (UserCRM - Professional view)
│   ├── Facilities (UserCRM - Facility view)
│   └── Verification Queue (🔴 Badge if pending > 24h)
├── 📅 Shifts
│   ├── Live Board (Calendar View - TODO)
│   └── Shift List (ShiftCommandCenter)
├── 💰 Finance
│   ├── Revenue & Commissions (RevenueAnalysis)
│   ├── Referral Payouts (SpendingsTracker)
│   └── Invoices (AccountsReceivable)
├── ⚙️ System
│   ├── Audit Logs (AuditLogs)
│   └── Global Settings (TODO)
└── 🛡️ Admin Management (EmployeeManagement)
```

## Implementation Status

✅ **Completed**:
- RBAC system (roles stored in `users.roles` array)
- Executive Dashboard
- Shift Command Center
- User CRM
- Enhanced Verification Queue (from original)
- Financial Suite (all 4 modules)
- System & Audit (both modules)
- Admin Management (Employee Management)
- Debug Tools (Account Creation Tool)
- All routes configured

🚧 **Remaining**:
- Admin Portal navigation sidebar (submenu for admin pages)
- Audit logging implementation (write logs to Firestore)
- Notification sending implementation (push notifications)

## Role Structure

**Important**: Admin roles are stored in the `users.roles` array alongside platform roles:

```javascript
users/{userId} {
  roles: ["professional", "super_admin"]  // Can have both platform and admin roles
}
```

**Admin Roles**:
- `super_admin` - Full access
- `ops_manager` - Operations & compliance
- `finance` - Financial data only
- `recruiter` - User verification & shift management
- `support` - User support & impersonation

**Platform Roles**:
- `professional` - Healthcare professional
- `facility` - Facility account
- `admin` - Platform admin (legacy, still supported)

## Next Steps

1. Create admin portal navigation sidebar component
2. Implement audit logging writes (when actions occur)
3. Implement push notification sending
4. Add role-based visibility to admin sidebar items

