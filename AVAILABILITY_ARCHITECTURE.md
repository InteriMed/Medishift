# Events Architecture Recommendation

## Current Structure Analysis

You already have:
- ✅ `events` - Worker availabilities and other event types (marketplace/public)
- ✅ `positions` - Job posts (facilities posting needs)
- ✅ `timeOffRequests` - Internal time off requests
- ✅ `contracts` - Agreements between parties
- ✅ `teamSchedules` - Internal team scheduling (subcollections)

## Recommended Approach: **Unified `events` Collection with Type Discriminator**

### Why This Approach?

1. **Query Efficiency**: Single collection allows unified queries across all availability types
2. **Consistency**: Same data structure for time-based availability data
3. **Flexibility**: Easy to add new availability types without schema changes
4. **Performance**: Better indexing with a single collection
5. **Calendar Integration**: Your calendar already expects a unified view

### Proposed Schema

```javascript
// events collection
{
  // IDENTITY & TYPE
  type: 'worker_availability' | 'job_post' | 'chain_internal' | 'facility_employee' | 'vacancy_request',
  
  // CORE TIME DATA (always present)
  userId: string,                    // Owner/creator
  from: Timestamp,                   // Start time
  to: Timestamp,                     // End time
  
  // TYPE-SPECIFIC FIELDS
  // For worker_availability (current)
  isAvailability: boolean,
  isValidated: boolean,
  professionalProfileId?: string,
  
  // For job_post
  facilityProfileId?: string,         // Posting facility
  postedByUserId?: string,
  status?: 'open' | 'filled' | 'cancelled',
  jobTitle?: string,
  jobType?: string,
  compensation?: object,
  
  // For chain_internal
  organizationId?: string,            // Chain/organization ID
  chainInternal: boolean,             // Flag for chain-only visibility
  sharedFacilityIds?: string[],       // Which facilities can see this
  
  // For facility_employee
  facilityEmployee: boolean,          // Flag for facility employees
  employeeRole?: string,              // Role within facility
  
  // For vacancy_request
  vacancyType?: 'permanent' | 'temporary' | 'replacement',
  requiredSkills?: string[],
  urgency?: 'low' | 'medium' | 'high',
  
  // COMMON FIELDS
  title: string,
  notes: string,
  location: object,
  color: string,
  color1: string,
  color2: string,
  
  // FILTERING FIELDS
  locationCountry: string[],
  LocationArea: string[],
  languages: string[],
  experience: string,
  software: string[],
  certifications: string[],
  workAmount: string,
  
  // RECURRENCE
  recurring: boolean,
  recurrenceId?: string,
  recurrenceMetadata?: object,
  
  // METADATA
  created: Timestamp,
  updated: Timestamp,
  createdBy: string,
  visibility: 'public' | 'facility' | 'chain' | 'private'
}
```

### Query Patterns

```javascript
// Get all worker availabilities (marketplace)
db.collection('events')
  .where('type', '==', 'worker_availability')
  .where('isValidated', '==', true)
  .where('visibility', '==', 'public')

// Get job posts for a facility
db.collection('events')
  .where('type', '==', 'job_post')
  .where('facilityProfileId', '==', facilityId)
  .where('status', '==', 'open')

// Get chain-internal availabilities
db.collection('events')
  .where('type', '==', 'chain_internal')
  .where('organizationId', '==', orgId)

// Get facility employee availabilities
db.collection('events')
  .where('type', '==', 'facility_employee')
  .where('facilityProfileId', '==', facilityId)
  .where('facilityEmployee', '==', true)

// Unified calendar view (all types for a user)
db.collection('events')
  .where('userId', '==', userId)
  // Or for facility view
  .where('facilityProfileId', '==', facilityId)
```

### Migration Strategy

1. **Phase 1**: Add `type` field to existing `events` documents
   ```javascript
   // Set type for existing documents
   type: 'worker_availability'
   ```

2. **Phase 2**: Migrate `positions` to `events` collection
   ```javascript
   // Convert positions to events with type: 'job_post'
   // Keep positions collection for backward compatibility (deprecated)
   ```

3. **Phase 3**: Add new types incrementally
   - `chain_internal` for organization-wide availability
   - `facility_employee` for internal employee scheduling
   - `vacancy_request` for staffing needs

### Security Rules

```javascript
// firestore.rules
match /events/{eventId} {
  // Public worker availabilities - readable by all
  allow read: if resource.data.type == 'worker_availability' 
              && resource.data.visibility == 'public';
  
  // Job posts - readable by all authenticated users
  allow read: if resource.data.type == 'job_post' 
              && request.auth != null;
  
  // Chain internal - only visible to chain members
  allow read: if resource.data.type == 'chain_internal'
              && request.auth != null
              && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.organizationIds
                 .hasAny(resource.data.organizationId);
  
  // Facility employee - only visible to facility members
  allow read: if resource.data.type == 'facility_employee'
              && request.auth != null
              && resource.data.facilityProfileId in 
                 get(/databases/$(database)/documents/users/$(request.auth.uid)).data.facilityMemberships;
  
  // Write rules
  allow create: if request.auth != null 
                && request.resource.data.userId == request.auth.uid;
  
  allow update: if request.auth != null 
                && resource.data.userId == request.auth.uid;
  
  allow delete: if request.auth != null 
                && resource.data.userId == request.auth.uid;
}
```

### Indexes Required

```json
{
  "indexes": [
    {
      "collectionGroup": "events",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "type", "order": "ASCENDING" },
        { "fieldPath": "from", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "availability",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "type", "order": "ASCENDING" },
        { "fieldPath": "facilityProfileId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "availability",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "type", "order": "ASCENDING" },
        { "fieldPath": "organizationId", "order": "ASCENDING" },
        { "fieldPath": "from", "order": "ASCENDING" }
      ]
    }
  ]
}
```

### Benefits

✅ **Single Source of Truth**: All time-based availability in one place
✅ **Unified Calendar View**: Easy to display all types together
✅ **Flexible Queries**: Filter by type, facility, chain, etc.
✅ **Type Safety**: Clear type discriminator prevents confusion
✅ **Backward Compatible**: Can migrate existing data gradually
✅ **Scalable**: Easy to add new types without breaking changes

### Keep Separate Collections For

- `contracts` - Different data model (legal agreements)
- `timeOffRequests` - Different workflow (approval process)
- `teamSchedules` - Different structure (monthly schedules with subcollections)

### Implementation Example

```javascript
// Save different types
async function saveAvailability(data) {
  const availabilityData = {
    type: data.type, // 'worker_availability', 'job_post', etc.
    userId: data.userId,
    from: data.from,
    to: data.to,
    // Type-specific fields
    ...(data.type === 'job_post' && {
      facilityProfileId: data.facilityProfileId,
      status: 'open',
      jobTitle: data.jobTitle
    }),
    ...(data.type === 'chain_internal' && {
      organizationId: data.organizationId,
      chainInternal: true,
      sharedFacilityIds: data.sharedFacilityIds
    }),
    // Common fields
    title: data.title,
    visibility: data.visibility || 'public',
    created: admin.firestore.FieldValue.serverTimestamp()
  };
  
  return await db.collection('events').add(availabilityData);
}
```

## Recommendation Summary

**Use a unified `events` collection with a `type` discriminator field** rather than separate collections. This provides:
- Better query performance
- Unified calendar views
- Easier maintenance
- Flexible filtering

Keep `contracts`, `timeOffRequests`, and `teamSchedules` as separate collections due to their distinct data models and workflows.

