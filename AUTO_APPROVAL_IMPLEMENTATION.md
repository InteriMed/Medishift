# 🚀 Auto-Approval Implementation Summary

## Overview

Auto-approval allows both professionals and facilities to automatically approve contracts when certain conditions are met, reducing manual intervention for routine contracts.

## Implementation Details

### 1. Settings Structure

#### Professional Settings
**Location**: `professionalProfiles/{profileId}/platformSettings.contractAutoApproval`

```javascript
{
  enabled: boolean,              // Toggle auto-approval on/off
  minimumHoursInAdvance: number  // Minimum hours before contract start (1-168, default: 24)
}
```

#### Facility Settings
**Location**: `facilityProfiles/{facilityId}/operationalSettings.contractAutoApproval`

```javascript
{
  enabled: boolean,              // Toggle auto-approval on/off
  minimumHoursInAdvance: number  // Minimum hours before contract start (1-168, default: 24)
}
```

### 2. Auto-Approval Logic

**Trigger**: `onContractUpdate` Cloud Function when contract status changes to `awaiting_dual_approval`

**Process**:
1. Fetch professional and facility profiles
2. Extract `contractAutoApproval` settings from each
3. Calculate hours until contract start date
4. For each party:
   - Check if `enabled === true`
   - Check if `hoursUntilStart >= minimumHoursInAdvance`
   - If both conditions met → Auto-approve
5. Update contract validation flags
6. If both parties auto-approved → Contract becomes `active` immediately
7. Create notifications for auto-approved parties

**Code Location**: `functions/database/index.js:413-520`

### 3. UI Components

#### Professional Settings
- **Component**: `professionals/components/Settings.js` (existing, enhanced)
- **Config**: `professionals/configs/professionals-doctor.json` and `professionals-pharmacist.json`
- **Fields**:
  - Toggle: "Enable Auto-Approval for Contracts" (`platformSettings.contractAutoApproval.enabled`)
  - Number input: "Minimum Hours in Advance" (`platformSettings.contractAutoApproval.minimumHoursInAdvance`)
  - Only visible when toggle is enabled (dependency)

#### Facility Settings
- **Component**: `facilities/components/Settings.js` (NEW)
- **Config**: `facilities/configs/facility.json` (Settings tab added)
- **Fields**:
  - Toggle: "Enable Auto-Approval for Contracts" (`operationalSettings.contractAutoApproval.enabled`)
  - Number input: "Minimum Hours in Advance" (`operationalSettings.contractAutoApproval.minimumHoursInAdvance`)
  - Opening hours settings
  - Time-off approval workflow
  - Only visible when toggle is enabled (dependency)

### 4. Translations

**File**: `frontend/src/locales/en/dashboard/profile.json`

**New Keys**:
- `settings.contractAutoApprovalEnabled`: "Enable Auto-Approval for Contracts"
- `settings.contractAutoApprovalMinHours`: "Minimum Hours in Advance for Auto-Approval"
- `settings.contractSettingsTitle`: "Contract Settings"
- `settings.operationalSettingsTitle`: "Operational Settings"
- `settings.defaultMarketplaceRadius`: "Default Search Radius (km)"
- Opening hours labels (Monday-Sunday)

### 5. Database Structure Updates

**Documentation Updated**:
- `frontend/src/dashboard/FIREBASE_DATABASE_ORGANIZATION.txt`
  - Added `contractAutoApproval` to `platformSettings` (professional)
  - Added `contractAutoApproval` to `operationalSettings` (facility)
  - Added `defaultMarketplaceRadius` to `platformSettings`

## Usage Examples

### Example 1: Both Parties Auto-Approve
- Contract start: 48 hours from now
- Professional settings: `enabled: true, minimumHoursInAdvance: 24`
- Facility settings: `enabled: true, minimumHoursInAdvance: 24`
- **Result**: Both parties auto-approved → Contract immediately `active`

### Example 2: Only Professional Auto-Approve
- Contract start: 30 hours from now
- Professional settings: `enabled: true, minimumHoursInAdvance: 24`
- Facility settings: `enabled: false`
- **Result**: Professional auto-approved, Facility must manually approve

### Example 3: Time Requirement Not Met
- Contract start: 12 hours from now
- Professional settings: `enabled: true, minimumHoursInAdvance: 24`
- **Result**: Professional must manually approve (12h < 24h requirement)

### Example 4: Different Minimum Hours
- Contract start: 36 hours from now
- Professional settings: `enabled: true, minimumHoursInAdvance: 48`
- Facility settings: `enabled: true, minimumHoursInAdvance: 24`
- **Result**: Only Facility auto-approved (36h < 48h for professional, but 36h >= 24h for facility)

## Security & Validation

1. **Settings Access**: Only profile owners can modify their own settings
2. **Auto-Approval Check**: Only runs when contract status changes to `awaiting_dual_approval`
3. **Time Calculation**: Uses contract start date from `terms.startDate` or `startDate`
4. **Notification**: Auto-approved parties receive notification explaining the action
5. **Fallback**: If auto-approval conditions not met, parties must manually approve

## Testing Checklist

- [ ] Professional can enable/disable auto-approval in settings
- [ ] Professional can set minimum hours in advance
- [ ] Facility can enable/disable auto-approval in settings
- [ ] Facility can set minimum hours in advance
- [ ] Auto-approval triggers when contract status → `awaiting_dual_approval`
- [ ] Auto-approval respects minimum hours requirement
- [ ] Contract activates immediately if both parties auto-approved
- [ ] Notifications created for auto-approved parties
- [ ] Manual approval still works if auto-approval disabled or conditions not met
- [ ] Settings persist correctly in database

## Future Enhancements

1. **Per-Contract Override**: Allow manual override of auto-approval for specific contracts
2. **Advanced Rules**: More complex auto-approval rules (e.g., based on contract value, duration)
3. **Audit Trail**: Log all auto-approvals with reason (settings-based)
4. **Email Notifications**: Send email when auto-approval occurs
5. **Settings Migration**: Default settings for existing users



