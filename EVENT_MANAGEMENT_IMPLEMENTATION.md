# Event Management System - Implementation Guide

## Event Types

### 1. `worker_availability`
**Purpose**: Professional marketplace availability
**Who can create**: Individual professionals (themselves only)
**Who can view**: 
- Public if `isValidated: true` and `visibility: 'public'`
- Private if `isValidated: false` or `visibility: 'private'`
**Who can edit/delete**: Owner only

**Data Structure**:
```javascript
{
  type: 'worker_availability',
  userId: string,
  professionalProfileId: string,
  isAvailability: true,
  isValidated: boolean,
  visibility: 'public' | 'private',
  locationCountry: string[],
  LocationArea: string[],
  languages: string[],
  experience: string,
  software: string[],
  certifications: string[],
  workAmount: string
}
```

### 2. `facility_job_post`
**Purpose**: Facility posting job openings
**Who can create**: Facility admins
**Who can view**: All authenticated users (public)
**Who can edit/delete**: Facility admins, chain admins

**Data Structure**:
```javascript
{
  type: 'facility_job_post',
  userId: string,
  facilityProfileId: string,
  status: 'open' | 'filled' | 'cancelled',
  jobTitle: string,
  jobType: string,
  compensation: object,
  requiredSkills: string[],
  visibility: 'public'
}
```

### 3. `facility_employee_schedule`
**Purpose**: Internal employee scheduling
**Who can create**: Facility admins, chain admins
**Who can view**: Facility employees, facility admins, chain admins
**Who can edit/delete**: Facility admins, chain admins

**Data Structure**:
```javascript
{
  type: 'facility_employee_schedule',
  userId: string,
  facilityProfileId: string,
  employeeUserId: string,
  employeeRole: string,
  shiftType: string,
  isSublettable: boolean,
  visibility: 'facility'
}
```

### 4. `chain_internal_availability`
**Purpose**: Chain-wide availability sharing
**Who can create**: Chain admins
**Who can view**: Chain members, facility admins in the chain
**Who can edit/delete**: Chain admins

**Data Structure**:
```javascript
{
  type: 'chain_internal_availability',
  userId: string,
  organizationId: string,
  facilityProfileId: string,
  chainInternal: true,
  sharedFacilityIds: string[],
  visibility: 'chain'
}
```

### 5. `vacancy_request`
**Purpose**: Staffing need requests
**Who can create**: Facility admins
**Who can view**: Facility admins, chain admins, matching professionals
**Who can edit/delete**: Facility admins, chain admins

**Data Structure**:
```javascript
{
  type: 'vacancy_request',
  userId: string,
  facilityProfileId: string,
  vacancyType: 'permanent' | 'temporary' | 'replacement',
  urgency: 'low' | 'medium' | 'high',
  requiredSkills: string[],
  visibility: 'facility' | 'public'
}
```

## Permission System

### Permission Object Structure
```javascript
permissions: {
  owners: string[],           // Full control (always includes creator)
  chainAdmins: string[],      // Chain admin user IDs
  facilityAdmins: string[],   // Facility admin user IDs
  viewers: string[]           // Read-only access
}
```

### Permission Hierarchy
1. **Owner** (`userId`) - Full control
2. **Chain Admin** - Can manage events in their organization
3. **Facility Admin** - Can manage events in their facility
4. **Facility Employee** - Can view facility events
5. **Professional** - Can create and manage own availability

## Usage Examples

### Creating a Worker Availability
```javascript
const eventData = {
  userId: 'user123',
  type: 'worker_availability',
  start: '2026-01-15T08:00:00Z',
  end: '2026-01-15T18:00:00Z',
  title: 'Available',
  visibility: 'public',
  isValidated: true,
  locationCountry: ['ZH'],
  languages: ['de', 'en']
};

await saveCalendarEvent(eventData);
```

### Creating a Facility Job Post
```javascript
const eventData = {
  userId: 'facilityAdmin123',
  type: 'facility_job_post',
  facilityProfileId: 'facility456',
  start: '2026-01-20T08:00:00Z',
  end: '2026-01-20T18:00:00Z',
  title: 'Weekend Pharmacist Needed',
  jobTitle: 'Pharmacist',
  jobType: 'pharmacist',
  status: 'open',
  compensation: { hourlyRate: 60, currency: 'CHF' },
  requiredSkills: ['pharmacy_license', 'german_language'],
  visibility: 'public'
};

await saveCalendarEvent(eventData);
```

### Creating Chain Internal Availability
```javascript
const eventData = {
  userId: 'chainAdmin123',
  type: 'chain_internal_availability',
  organizationId: 'org789',
  facilityProfileId: 'facility456',
  start: '2026-01-25T08:00:00Z',
  end: '2026-01-25T18:00:00Z',
  title: 'Shared Availability',
  chainInternal: true,
  sharedFacilityIds: ['facility456', 'facility789'],
  visibility: 'chain'
};

await saveCalendarEvent(eventData);
```

## Frontend Integration

### Event Type Detection
The frontend should determine event type based on context:
- Personal workspace → `worker_availability`
- Facility workspace → `facility_job_post`, `facility_employee_schedule`, `vacancy_request`
- Chain workspace → `chain_internal_availability`

### Filtering Events by User Role
```javascript
// Get events user can view
const events = await getAccessibleEvents(userId, {
  type: 'worker_availability',
  visibility: 'public'
});

// Get facility events
const facilityEvents = await getAccessibleEvents(userId, {
  facilityProfileId: facilityId
});

// Get chain events
const chainEvents = await getAccessibleEvents(userId, {
  organizationId: organizationId
});
```

## Security Rules

The Firestore rules now check:
- Event ownership
- Permission arrays
- Facility admin status
- Chain admin status
- Visibility settings

## Migration Notes

Existing `availability` collection documents should be migrated:
1. Add `type: 'worker_availability'` to all existing documents
2. Add `permissions` object based on current `userId`
3. Set `visibility: 'public'` for validated events, `'private'` for unvalidated









