# Updated Event Management System

## Changes Implemented

### 1. Facility Employee Schedule - View Authorization

**Updated**: Facility employees can now only view `facility_employee_schedule` events if they have the `facility:schedule:view` permission.

**Implementation**:
- Updated `canViewEvent()` to check for `facility:schedule:view` permission
- Employees must be explicitly granted view permission by facility admins
- Admins and chain admins can always view

### 2. Chain Internal Availability - Internal/External Options

**Updated**: Chain internal availability now:
- Falls under availability when creating
- Has option to open **only internally** OR **both externally and internally**

**Data Structure**:
```javascript
{
  type: 'chain_internal_availability',
  isAvailability: true,
  chainInternal: true,
  openInternally: true,  // Default: true
  openExternally: false, // Default: false
  visibility: 'chain' | 'public', // 'public' if openExternally is true
  // ... availability fields (locationCountry, languages, etc.)
}
```

**Usage**:
- When `openInternally: true` and `openExternally: false` → Only visible within chain
- When `openInternally: true` and `openExternally: true` → Visible both internally and publicly
- When creating, it's treated as an availability with chain context

### 3. Employee Vacancy/Sick Leave Requests

**New Flow**:
1. **Employee requests** vacancy or sick leave
2. **Employer (facility/chain admin) accepts** the request
3. **On acceptance**, a menu appears to choose:
   - Open internally only
   - Open externally only
   - Open both internally and externally
4. **System automatically creates** the appropriate event(s)

**New Event Type**: `employee_vacancy_request`
- Stored in `employeeVacancyRequests` collection
- Status: `pending` → `accepted` → creates events
- Can be requested by facility employees

**Acceptance Function**: `acceptEmployeeRequest`
```javascript
await acceptEmployeeRequest({
  requestId: 'request123',
  requestType: 'vacancy_request', // or 'sick_leave'
  openInternally: true,
  openExternally: true
});
```

**What Gets Created**:

When `openInternally: true`:
- Creates `vacancy_request` event (if vacancy) or `facility_employee_schedule` (if sick leave)
- Visibility: `facility`
- Status: `open` (vacancy) or `scheduled` (sick leave)

When `openExternally: true`:
- Creates `facility_job_post` event (if vacancy) or `worker_availability` (if sick leave)
- Visibility: `public`
- Status: `open` (job post) or `available` (availability)

## Updated Event Types

### `facility_employee_schedule`
- **View**: Only employees with `facility:schedule:view` permission
- **Create**: Facility admins, chain admins
- **Edit/Delete**: Facility admins, chain admins

### `chain_internal_availability`
- **Create**: Chain admins
- **Options**: Internal only OR both internal and external
- **Visibility**: `chain` (internal only) or `public` (if external)

### `employee_vacancy_request`
- **Create**: Facility employees (for themselves)
- **Status**: `pending` → `accepted` (by facility admin)
- **On Accept**: Creates internal/external events based on options

## Security Rules

- Added `employeeVacancyRequests` collection rules
- Employees can only create requests for themselves
- Facility admins can accept/reject requests
- Updated event update rules to allow facility admins to update

## Frontend Integration

### Accepting Employee Requests
```javascript
// When facility admin accepts a request
const handleAcceptRequest = async (requestId, requestType) => {
  const result = await acceptEmployeeRequest({
    requestId,
    requestType,
    openInternally: true,
    openExternally: true
  });
  
  // result.createdEvents contains the created event IDs
  console.log('Created events:', result.createdEvents);
};
```

### Creating Chain Internal Availability
```javascript
const eventData = {
  type: 'chain_internal_availability',
  isAvailability: true,
  chainInternal: true,
  organizationId: 'org123',
  facilityProfileId: 'facility123',
  openInternally: true,
  openExternally: true, // Option to also post publicly
  // ... availability fields
};
```


