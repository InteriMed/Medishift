# Event Management System Architecture

## Event Types

### 1. `worker_availability` - Professional Marketplace Availability
**Who can create**: Individual professionals
**Who can view**: Public (validated) or private (unvalidated)
**Who can edit/delete**: Owner only

### 2. `facility_job_post` - Facility Job Posting
**Who can create**: Facility admins
**Who can view**: Public (all authenticated users)
**Who can edit/delete**: Facility admins, chain admins

### 3. `facility_employee_schedule` - Internal Employee Schedule
**Who can create**: Facility admins, chain admins
**Who can view**: Facility employees, facility admins, chain admins
**Who can edit/delete**: Facility admins, chain admins

### 4. `chain_internal_availability` - Chain-Wide Availability
**Who can create**: Chain admins
**Who can view**: Chain members, facility admins in the chain
**Who can edit/delete**: Chain admins

### 5. `vacancy_request` - Staffing Need Request
**Who can create**: Facility admins
**Who can view**: Facility admins, chain admins, matching professionals
**Who can edit/delete**: Facility admins, chain admins

## Permission Hierarchy

1. **Owner** - Full control (create, read, update, delete)
2. **Chain Admin** - Can manage events in their organization
3. **Facility Admin** - Can manage events in their facility
4. **Facility Employee** - Can view and create personal events
5. **Professional** - Can create and manage own availability

## Data Structure per Event Type

```javascript
// Common fields for all events
{
  // IDENTITY
  eventId: string,
  type: 'worker_availability' | 'facility_job_post' | 'facility_employee_schedule' | 
        'chain_internal_availability' | 'vacancy_request',
  
  // TIME
  from: Timestamp,
  to: Timestamp,
  
  // OWNERSHIP & PERMISSIONS
  userId: string,                    // Creator/owner
  createdBy: string,                 // User who created
  permissions: {
    owners: string[],                // Full control
    chainAdmins: string[],           // Chain admin user IDs
    facilityAdmins: string[],         // Facility admin user IDs
    viewers: string[]                // Read-only access
  },
  
  // CONTEXT
  professionalProfileId?: string,    // For professional events
  facilityProfileId?: string,        // For facility events
  organizationId?: string,           // For chain events
  employeeUserId?: string,           // For employee schedule events
  
  // VISIBILITY
  visibility: 'public' | 'facility' | 'chain' | 'private',
  
  // METADATA
  title: string,
  notes: string,
  location: object,
  color: string,
  color1: string,
  color2: string,
  
  // RECURRENCE
  recurring: boolean,
  recurrenceId?: string,
  recurrenceMetadata?: object,
  
  // TIMESTAMPS
  created: Timestamp,
  updated: Timestamp
}

// Type-specific fields
{
  // worker_availability
  isAvailability: true,
  isValidated: boolean,
  locationCountry: string[],
  LocationArea: string[],
  languages: string[],
  experience: string,
  software: string[],
  certifications: string[],
  workAmount: string,
  
  // facility_job_post
  status: 'open' | 'filled' | 'cancelled',
  jobTitle: string,
  jobType: string,
  compensation: object,
  requiredSkills: string[],
  
  // facility_employee_schedule
  employeeRole: string,
  shiftType: string,
  isSublettable: boolean,
  
  // chain_internal_availability
  sharedFacilityIds: string[],
  chainInternal: true,
  
  // vacancy_request
  vacancyType: 'permanent' | 'temporary' | 'replacement',
  urgency: 'low' | 'medium' | 'high',
  requiredSkills: string[]
}
```









