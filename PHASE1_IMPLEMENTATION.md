# Phase 1 Implementation Summary

## ✅ Completed Changes

### 1. Interview Status & Automatic Conversation Creation
- **Added `interview` status** to positions collection
- **Cloud Function Trigger**: `onPositionUpdate` automatically creates conversation when position status changes to `interview`
- **Conversation Structure**: 
  - Linked to `positionId` (not `contractId` initially)
  - Includes `facilityProfileId` and `professionalProfileId`
  - Creates initial system message in `messages` subcollection
  - Sets up `unreadCounts` (professional gets 1, facility gets 0)
  - Creates notifications for both parties
- **Location**: `functions/database/index.js` - `onPositionUpdate` function
- **Export**: `functions/index.js` - Exported as `onPositionUpdate`

### 2. Manual Conversation Creation Disabled
- **Removed manual creation**: `createConversation` API endpoint now returns permission error
- **Location**: `functions/api/index.js` - `messagesAPI` case 'createConversation'

### 3. Select Applicant Endpoint
- **New endpoint**: `selectApplicant` in marketplaceAPI
- **Security**: Only facility admins can select applicants
- **Flow**: 
  1. Facility selects applicant → Application status → `accepted_for_contract`
  2. Position status → `interview`
  3. Position `selectedApplicantProfileId` field set
  4. **AUTOMATIC**: `onPositionUpdate` trigger fires → Creates conversation
- **Location**: `functions/api/index.js` - `marketplaceAPI` case 'selectApplicant'

### 4. Parallel Contract Approval Flow with Auto-Approval
- **New status**: `awaiting_dual_approval` for parallel approvals
- **New endpoint**: `approveContract` handles individual party approvals
- **Validation structure**: Contracts include `statusLifecycle.validation` with `professionalApproved` and `facilityApproved` flags
- **Auto-activation**: Contract becomes `active` automatically when both parties approve
- **Auto-approval**: 
  - When contract status changes to `awaiting_dual_approval`, system checks auto-approval settings
  - If enabled and minimum time requirement met, party is auto-approved
  - Both parties can have auto-approval enabled independently
  - Creates notifications for auto-approvals
- **Update endpoint**: Also supports parallel approvals via `update` endpoint (fallback)
- **Location**: 
  - `functions/api/index.js` - `contractAPI` cases 'approveContract' and 'update'
  - `functions/database/index.js` - `onContractUpdate` trigger for auto-approval

### 5. Conflict Detection Updated
- **Skip for positions**: Conflict detection only applies to workers (availability, contracts, timeOffRequests)
- **Facility positions**: No conflict checking for `position` event type
- **Location**: `functions/api/calendar.js` - `checkAndCreateEventHTTP` and `checkAndCreateEvent`

### 6. Contract Activation → Availability Booking
- **Auto-booking**: When contract becomes `active`, marks professional availability as `booked`
- **Requirement**: Contract must have `originAvailabilityId` field set
- **Update**: Sets availability `status` to `booked` and `bookedByContractId` to contract ID
- **Location**: `functions/database/index.js` - `onContractUpdate` function

### 7. Firestore Rules Updated
- **Contract rules**: Added `awaiting_dual_approval` status to allowed update statuses
- **Position rules**: Added facility admin check for position status updates
- **Location**: `firestore.rules`

### 8. Database Triggers Exported
- **Exports added**: `onPositionUpdate`, `onContractUpdate`, `onContractCreate`
- **Location**: `functions/index.js`

## 🔄 Updated Flow

### Marketplace Flow (Phase 1)
1. **Posting**: Professionals post Availability; Facilities post Positions
2. **Discovery**: Search based on Professional's Location + Radius (to be implemented)
3. **Application**: Professional applies to Position
   - Application created with status `submitted`
   - Stored in `positions/{positionId}/applications/{professionalProfileId}`
4. **Interview Stage**: 
   - Facility selects applicant via `selectApplicant` endpoint
   - Application status → `accepted_for_contract`
   - Position status → `interview`
   - **AUTOMATIC**: Conversation created and linked to `positionId`
   - Both parties receive notifications
5. **Contract Stage**: 
   - Both parties agree via conversation
   - Contract created in `draft` status with validation structure initialized
   - **Status transition**: Contract status manually changed to `awaiting_dual_approval` (via `update` endpoint or frontend)
   - **Auto-approval check**: When status changes to `awaiting_dual_approval`, system checks:
     - Professional's `platformSettings.contractAutoApproval.enabled`
     - Facility's `operationalSettings.contractAutoApproval.enabled`
     - If enabled and contract start is >= `minimumHoursInAdvance` hours away, party is auto-approved
   - **Parallel approvals**: 
     - Auto-approved parties: Approved immediately if conditions met
     - Manual approval: Parties without auto-approval (or conditions not met) approve via `approveContract` endpoint
   - Contract becomes `active` automatically when both parties approve (auto or manual)
   - **AUTOMATIC**: Professional's Availability marked as `booked` (if `originAvailabilityId` exists)

## 📋 Remaining Tasks

### 1. Add defaultMarketplaceRadius to Professional Profiles
- **Field**: `platformSettings.defaultMarketplaceRadius` (Number, in km)
- **Default**: 50 km
- **Usage**: Filter positions by distance from professional's location
- **Status**: ✅ Added to professional config (`professionals-doctor.json`)
- **Location**: `frontend/src/dashboard/pages/profile/professionals/configs/professionals-doctor.json`

### 2. Data Retention Scheduler
- **Cloud Scheduler**: Daily task to delete conversations 30 days after contract end
- **Function**: Check contracts with `endDate` + 30 days, delete associated conversations and messages
- **Location**: New function in `functions/database/index.js` or separate scheduler file
- **Status**: Not yet implemented

### 3. Contract Auto-Approval System
- **Feature**: Automatic contract approval based on user settings
- **Settings Location**:
  - **Professionals**: `platformSettings.contractAutoApproval` in `professionalProfiles`
  - **Facilities**: `operationalSettings.contractAutoApproval` in `facilityProfiles`
- **Settings Structure**:
  ```javascript
  contractAutoApproval: {
    enabled: boolean,              // Enable/disable auto-approval
    minimumHoursInAdvance: number   // Minimum hours before contract start (default: 24)
  }
  ```
- **Auto-Approval Logic**:
  - Triggered when contract status changes to `awaiting_dual_approval`
  - Checks both professional and facility settings independently
  - Calculates hours until contract start date
  - Auto-approves if `enabled` is true AND `hoursUntilStart >= minimumHoursInAdvance`
  - Both parties can have auto-approval enabled independently
  - Creates notifications when auto-approved
- **Location**: `functions/database/index.js` - `onContractUpdate` function
- **Status Flow**: `draft` → `awaiting_dual_approval` → (auto-approval check) → `active` (if both auto-approved) OR manual approval required

## ✅ Implementation Verification

### Code Locations Verified
- ✅ `onPositionUpdate` trigger: `functions/database/index.js:262-396`
- ✅ `onContractUpdate` trigger: `functions/database/index.js:399-493` (includes auto-approval logic)
- ✅ `selectApplicant` endpoint: `functions/api/index.js:880-950`
- ✅ `approveContract` endpoint: `functions/api/index.js:273-370`
- ✅ `createConversation` disabled: `functions/api/index.js:580-586`
- ✅ Conflict detection skip: `functions/api/calendar.js:800-864`
- ✅ Firestore rules updated: `firestore.rules:76-84, 171-175`
- ✅ Exports: `functions/index.js:40-42`
- ✅ Professional settings config: `professionals-doctor.json` (auto-approval + radius)
- ✅ Facility settings config: `facility.json` (auto-approval settings)
- ✅ Facility Settings component: `facilities/components/Settings.js`

### Data Flow Verified
- ✅ Position status `interview` → Conversation created automatically
- ✅ Contract status `awaiting_dual_approval` → Auto-approval check triggered
- ✅ Auto-approval conditions met → Party auto-approved with notification
- ✅ Contract `active` → Availability marked `booked` (if `originAvailabilityId` exists)
- ✅ Parallel approvals → Contract auto-activates when both approve (auto or manual)
- ✅ Application status → `accepted_for_contract` when selected

## 🔐 Security Notes

1. **Conversation Creation**: 
   - Only system can create conversations (via `onPositionUpdate` trigger)
   - Manual creation via API returns permission error
   - Conversations linked to positions are automatically created

2. **Position Updates**: 
   - Only facility admins can change position status to `interview`
   - Firestore rules check facility admin status
   - `selectApplicant` endpoint verifies admin permissions

3. **Contract Approvals**: 
   - Only parties involved can approve (`professional` or `employer`)
   - Each party can only approve once
   - Approval status tracked in `statusLifecycle.validation`

4. **Conflict Detection**: 
   - Only applies to worker events (`availability`, `contracts`, `timeOffRequests`)
   - Facility `positions` skip conflict detection
   - Team shifts checked if in team workspace context

## 🎯 Auto-Approval Feature Details

### Settings Structure

**Professional Settings** (`professionalProfiles/{profileId}/platformSettings.contractAutoApproval`):
```javascript
{
  enabled: boolean,              // Default: false
  minimumHoursInAdvance: number  // Default: 24 hours
}
```

**Facility Settings** (`facilityProfiles/{facilityId}/operationalSettings.contractAutoApproval`):
```javascript
{
  enabled: boolean,              // Default: false
  minimumHoursInAdvance: number  // Default: 24 hours
}
```

### Auto-Approval Logic

1. **Trigger**: When contract status changes from any status to `awaiting_dual_approval`
2. **Check Process**:
   - System fetches both professional and facility profiles
   - Extracts `contractAutoApproval` settings from each
   - Calculates hours until contract start date
   - For each party:
     - If `enabled === true` AND `hoursUntilStart >= minimumHoursInAdvance`:
       - Auto-approves that party
       - Sets `professionalApproved` or `facilityApproved` to `true`
       - Records timestamp
3. **Contract Activation**:
   - If both parties auto-approved → Contract immediately becomes `active`
   - If one party auto-approved → Waits for manual approval from other party
   - If neither auto-approved → Both parties must manually approve
4. **Notifications**: 
   - Auto-approved parties receive notification explaining the auto-approval
   - Includes hours in advance for transparency

### Settings UI

**Professional Settings Page**:
- Location: Profile → Settings tab
- Fields:
  - Toggle: "Enable Auto-Approval for Contracts"
  - Number input: "Minimum Hours in Advance for Auto-Approval" (1-168 hours, default: 24)
  - Only visible when toggle is enabled

**Facility Settings Page**:
- Location: Facility Profile → Settings tab (NEW)
- Fields:
  - Toggle: "Enable Auto-Approval for Contracts"
  - Number input: "Minimum Hours in Advance for Auto-Approval" (1-168 hours, default: 24)
  - Only visible when toggle is enabled
  - Also includes operational settings (opening hours, time-off workflow)

### Example Scenarios

**Scenario 1: Both parties have auto-approval enabled**
- Contract start: 48 hours away
- Professional min: 24h, Facility min: 24h
- Result: Both auto-approved → Contract immediately `active`

**Scenario 2: Only professional has auto-approval**
- Contract start: 30 hours away
- Professional min: 24h (enabled), Facility: disabled
- Result: Professional auto-approved, Facility must manually approve

**Scenario 3: Auto-approval enabled but time requirement not met**
- Contract start: 12 hours away
- Professional min: 24h (enabled)
- Result: Professional must manually approve (12h < 24h requirement)

## 📝 API Changes

### New Endpoints
- `marketplaceAPI.selectApplicant` - Select applicant for interview
  - **Input**: `positionId`, `professionalProfileId`
  - **Output**: Success message
  - **Security**: Facility admin only
  
- `contractAPI.approveContract` - Approve contract (parallel flow)
  - **Input**: `contractId`
  - **Output**: Success message with approval status
  - **Security**: Contract party only
  - **Logic**: Updates validation flags, auto-activates if both approved

### Modified Endpoints
- `messagesAPI.createConversation` - Now disabled (returns permission error)
  - **Error Message**: "Manual conversation creation is not allowed. Conversations are automatically created during the interview process."
  
- `contractAPI.create` - Updated to support new status lifecycle
  - **Initial Status**: `draft` (default)
  - **Validation Structure**: Initialized with `professionalApproved: false`, `facilityApproved: false`
  
- `contractAPI.update` - Updated to handle parallel approvals
  - **Supports**: `awaiting_dual_approval` status with parallel approval logic
  - **Fallback**: Can handle approvals if `approveContract` not used

### Status Values
- **Positions**: `open`, `interview`, `filled`, `cancelled`
- **Applications**: `submitted`, `accepted_for_contract`, `rejected`
- **Contracts**: `draft`, `awaiting_dual_approval`, `active`, `completed`, `terminated`
- **Availability**: `available`, `booked`, `unavailable_internal`

## 🆕 New Features Added

### Auto-Approval System
- **Settings Location**: 
  - Professional: `platformSettings.contractAutoApproval`
  - Facility: `operationalSettings.contractAutoApproval`
- **UI Components**:
  - Professional Settings: Auto-approval toggle and minimum hours field
  - Facility Settings: New Settings tab with auto-approval and operational settings
- **Backend Logic**: Auto-approval check in `onContractUpdate` trigger
- **Config Files Updated**:
  - `professionals-doctor.json`: Added auto-approval and radius settings
  - `professionals-pharmacist.json`: Added auto-approval and radius settings
  - `facility.json`: Added Settings tab with auto-approval settings
- **Component Created**: `facilities/components/Settings.js` - Facility settings page
- **Translations Added**: New translation keys for auto-approval settings

