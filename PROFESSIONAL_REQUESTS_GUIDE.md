# Professional Requests Guide

## Overview

Professionals can now request two types of events:
1. **Sick Leave / Time Off Requests** - For facility employees
2. **Vacancy Applications** - For applying to vacancy requests

## 1. Sick Leave / Time Off Requests

### Who Can Create
- Professionals who are employees of a facility
- Must be requesting for themselves only

### How to Create
```javascript
const eventData = {
  userId: professionalId,
  type: 'time_off_request',
  requestType: 'sick_leave', // or 'time_off', 'vacation', etc.
  timeOffType: 'sick_leave', // 'sick_leave', 'vacation', 'personal_appointment'
  facilityProfileId: facilityId, // Required
  start: '2026-01-20T08:00:00Z',
  end: '2026-01-20T18:00:00Z',
  title: 'Sick Leave',
  notes: 'Feeling unwell, need to rest',
  visibility: 'facility'
};

await saveCalendarEvent(eventData);
```

### Data Structure
```javascript
{
  type: 'time_off_request',
  userId: string,
  facilityProfileId: string,
  requestType: 'sick_leave' | 'time_off',
  timeOffType: 'sick_leave' | 'vacation' | 'personal_appointment',
  status: 'pending' | 'approved' | 'rejected',
  reason: string,
  professionalProfileId: string,
  from: Timestamp,
  to: Timestamp,
  created: Timestamp,
  updated: Timestamp
}
```

### Collection
- Stored in: `timeOffRequests` collection
- Visible to: Facility admins and the requesting employee

## 2. Vacancy Applications

### Who Can Create
- Any professional
- Must be applying for themselves

### How to Create
```javascript
const eventData = {
  userId: professionalId,
  type: 'vacancy_application',
  requestType: 'vacancy_application',
  vacancyEventId: 'vacancy123', // ID of the vacancy_request event
  start: '2026-01-25T08:00:00Z',
  end: '2026-01-25T18:00:00Z',
  title: 'Application for Weekend Shift',
  notes: 'I have 5 years experience in pharmacy',
  visibility: 'facility'
};

await saveCalendarEvent(eventData);
```

### Data Structure
```javascript
{
  type: 'vacancy_application',
  userId: string,
  vacancyEventId: string, // Reference to the vacancy_request event
  applicationStatus: 'pending' | 'accepted' | 'rejected',
  professionalProfileId: string,
  applicationNotes: string,
  from: Timestamp,
  to: Timestamp,
  created: Timestamp,
  updated: Timestamp
}
```

### Collection
- Stored in: `vacancyApplications` collection
- Also creates a subcollection entry: `events/{vacancyEventId}/applications/{applicationId}`
- Visible to: Facility admins and the applying professional

## Permission Rules

### Time Off Requests
- **Create**: Professional must be employee of the facility
- **Read**: Employee (own requests) or facility admins
- **Update**: Facility admins (to approve/reject)
- **Delete**: Employee (own requests)

### Vacancy Applications
- **Create**: Any professional
- **Read**: Professional (own applications) or facility admins (for their vacancies)
- **Update**: Facility admins (to accept/reject applications)
- **Delete**: Professional (own applications)

## Frontend Integration

### Creating Time Off Request
```javascript
// In EventPanel or similar component
const handleCreateTimeOff = async (eventData) => {
  const requestData = {
    ...eventData,
    type: 'time_off_request',
    requestType: 'sick_leave',
    timeOffType: selectedTimeOffType, // 'sick_leave', 'vacation', etc.
    facilityProfileId: selectedWorkspace.facilityId
  };
  
  await saveEvent(requestData, userId);
};
```

### Creating Vacancy Application
```javascript
// When professional clicks "Apply" on a vacancy
const handleApplyForVacancy = async (vacancyEvent, professionalId) => {
  const applicationData = {
    userId: professionalId,
    type: 'vacancy_application',
    requestType: 'vacancy_application',
    vacancyEventId: vacancyEvent.id,
    start: vacancyEvent.from,
    end: vacancyEvent.to,
    title: `Application: ${vacancyEvent.title}`,
    notes: applicationNotes,
    facilityProfileId: vacancyEvent.facilityProfileId
  };
  
  await saveEvent(applicationData, professionalId);
};
```

## Status Management

### Time Off Request Status
- `pending` - Awaiting facility admin approval
- `approved` - Approved by facility admin
- `rejected` - Rejected by facility admin

### Vacancy Application Status
- `pending` - Application submitted, awaiting review
- `accepted` - Facility accepted the application
- `rejected` - Facility rejected the application

## Notes

- Time off requests require the professional to be an employee of the facility
- Vacancy applications can be made by any professional
- Both types create calendar events that can be displayed in the calendar view
- Facility admins can manage both types of requests through the calendar interface


