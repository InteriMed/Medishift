# Marketplace Architecture

## Overview
The marketplace implementation uses a **hybrid architecture** that balances performance with security:

### Architecture Pattern: Hybrid Direct + Backend

```
┌─────────────────────────────────────────────────────────────┐
│                     MARKETPLACE FLOW                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  READ OPERATIONS (Fast - Direct Firestore)                  │
│  ┌──────────────┐                                            │
│  │   Frontend   │ ──direct──> Firestore                     │
│  │  Component   │ <─realtime─ (positions/availabilities)    │
│  └──────────────┘                                            │
│        │                                                     │
│        │  Uses: fetchListings(), fetchListingDetails()      │
│        │  Speed: ~50-100ms (cached), real-time updates      │
│        │  Security: firestore.rules validate access         │
│                                                              │
│  WRITE OPERATIONS (Secure - Backend API)                    │
│  ┌──────────────┐                                            │
│  │   Frontend   │ ──https──> Cloud Function                 │
│  │  Component   │            (marketplaceAPI)                │
│  └──────────────┘                │                           │
│                                  │                           │
│                         Server-side validation               │
│                         Admin checks                         │
│                         Business logic                       │
│                                  │                           │
│                                  v                           │
│                            Firestore DB                      │
│                                                              │
│        │  Uses: createPosition(), applyToPosition(),         │
│        │        createAvailability()                         │
│        │  Speed: ~200-500ms (includes validation)           │
│        │  Security: Backend code + firestore.rules          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Details

### 1. Read Operations (Direct Firestore)
**Hook**: `useMarketplaceData.js`
- **fetchListings()**: Queries `positions` or `professionalAvailabilities` collection
- **fetchListingDetails()**: Gets single document + related data
- **Advantages**:
  - Fastest possible reads (~50ms with cache)
  - Real-time updates via onSnapshot (future enhancement)
  - Offline support with Firestore cache
  - No Cloud Function cold start delays

**Firestore Rules Protection**:
```javascript
// positions: Public read for authenticated users
allow read: if isAuthenticated();
// professionalAvailabilities: Public read for authenticated users
allow read: if isAuthenticated();
```

### 2. Write Operations (Backend API)
**Backend**: `functions/api/index.js` - `marketplaceAPI`
- **createPosition()**: 
  - Validates user is facility admin
  - Ensures all required fields present
  - Validates date ranges
- **applyToPosition()**:
  - Checks position exists and is open
  - Prevents duplicate applications
  - Creates application document
- **createAvailability()**:
  - Validates user is creating for own profile
  - Validates date ranges
  - Ensures data integrity

**Why Backend for Writes?**:
1. **Server-side validation** cannot be bypassed
2. **Facility admin checks** require database lookups
3. **Complex business logic** (e.g., duplicate detection)
4. **Audit trail** with server timestamps
5. **Future extensibility** (notifications, emails, etc.)

### 3. Local Filtering (Client-Side)
**Component**: `Marketplace.js`
- Firestore queries handle basic filtering (status, ordering)
- Additional client-side filters applied for:
  - City, area, experience level
  - Software skills, work amount
  - Date ranges
- **Why Client-Side?**:
  - Avoids creating composite indexes for every filter combination
  - Marketplace datasets are reasonably sized (< 10k items)
  - Instant filter response (no server round-trip)

## Data Collections

### positions
```javascript
{
  id: string,
  facilityProfileId: string,      // Required
  postedByUserId: string,          // Required
  status: 'open' | 'filled' | 'cancelled',
  jobTitle: string,                // Required
  jobType: string,
  startTime: Timestamp,            // Required
  endTime: Timestamp,              // Required
  location: {
    canton: string,
    city: string,
    address: string
  },
  description: string,
  compensation: {
    amount: number,
    currency: string,
    period: 'hourly' | 'daily' | 'monthly'
  },
  created: Timestamp,
  updated: Timestamp
}
```

### professionalAvailabilities
```javascript
{
  id: string,
  professionalProfileId: string,   // Required
  userId: string,                   // Required
  startTime: Timestamp,             // Required
  endTime: Timestamp,               // Required
  status: 'available' | 'booked',
  jobTypes: string[],
  locationPreference: {
    canton: string,
    city: string,
    radius: number
  },
  hourlyRate: {
    min: number,
    max: number,
    currency: string
  },
  notes: string,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## Security Model

### Firestore Rules
```javascript
// Positions
- Read: All authenticated users (public marketplace)
- Create: Facility admins only
- Update: Facility admins only
- Delete: Disabled (use status='cancelled')

// Professional Availabilities
- Read: All authenticated users (public marketplace)
- Create: Owner only (professionalProfileId == userId)
- Update: Owner only
- Delete: Owner only

// Applications (subcollection of positions)
- Read: Applicant or facility admin
- Create: Applicant only (for themselves)
- Update: Facility admin only (status changes)
- Delete: Disabled
```

### Backend Validation (Defense in Depth)
Even though Firestore rules protect data, backend functions provide additional validation:
- Admin permission checks with facility document lookup
- Date validation and business logic
- Duplicate prevention
- Rate limiting (via Cloud Functions)

## Performance Characteristics

| Operation              | Method          | Latency    | Caching |
|------------------------|-----------------|------------|---------|
| List Positions         | Direct Firestore| 50-100ms   | Yes     |
| Filter Locally         | Client-side     | <10ms      | N/A     |
| Get Position Details   | Direct Firestore| 30-80ms    | Yes     |
| Create Position        | Backend API     | 200-500ms  | No      |
| Apply to Position      | Backend API     | 200-400ms  | No      |
| Create Availability    | Backend API     | 200-400ms  | No      |

## Future Enhancements

### Real-time Updates
```javascript
// Replace getDocs with onSnapshot for live updates
const unsubscribe = onSnapshot(q, (snapshot) => {
  const fetchedListings = [];
  snapshot.forEach(doc => {
    fetchedListings.push({ id: doc.id, ...doc.data() });
  });
  setListings(fetchedListings);
});
```

### Advanced Search
For full-text search across multiple fields:
- Integrate Algolia or Elasticsearch
- Or use backend API with custom search logic
- Keep direct reads for browsing, use search API for queries

### Pagination
For large datasets (>100 items):
```javascript
// Implement cursor-based pagination
const lastVisible = snapshot.docs[snapshot.docs.length - 1];
const next = query(listingsRef, 
  startAfter(lastVisible), 
  limit(20)
);
```

## Mock Data (Development)
Currently, the hook generates mock data for missing fields:
- `area`, `experience_level`, `software_skills`, `work_amount`
- Falls back to sample data if Firestore is empty
- **Production**: These should be removed or feature-flagged

## Usage Example

```javascript
import { useMarketplaceData } from '../../hooks/useMarketplaceData';

function MarketplacePage() {
  const {
    listings,
    isLoading,
    fetchListings,
    createPosition,
    applyToPosition
  } = useMarketplaceData();

  // Load data
  useEffect(() => {
    fetchListings({}, 'jobs');
  }, [fetchListings]);

  // Create a new position
  const handleCreatePosition = async (data) => {
    try {
      const positionId = await createPosition({
        facilityProfileId: 'facility-123',
        jobTitle: 'Pharmacist',
        startTime: new Date('2024-06-01'),
        endTime: new Date('2024-06-30'),
        location: { canton: 'Zurich', city: 'Zurich' }
      });
      console.log('Created:', positionId);
    } catch (err) {
      console.error('Failed:', err);
    }
  };

  // Apply to a position
  const handleApply = async (positionId) => {
    try {
      const applicationId = await applyToPosition(positionId);
      console.log('Applied:', applicationId);
    } catch (err) {
      console.error('Failed:', err);
    }
  };

  return (
    <div>
      {listings.map(listing => (
        <ListingCard 
          key={listing.id} 
          listing={listing}
          onApply={() => handleApply(listing.id)}
        />
      ))}
    </div>
  );
}
```

## Summary
The marketplace uses a **best-of-both-worlds** approach:
- ✅ **Fast reads** via direct Firestore access
- ✅ **Secure writes** via validated backend API
- ✅ **Real-time capable** (future enhancement)
- ✅ **Scalable** for thousands of listings
- ✅ **Flexible** client-side filtering
- ✅ **Protected** by multi-layer security (rules + backend)
