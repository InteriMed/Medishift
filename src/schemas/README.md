# DATABASE SCHEMAS

This directory contains centralized data schemas for all Firestore collections used in the Interimed application.

## COLLECTIONS OVERVIEW

### USER & PROFILE COLLECTIONS

1. **users** - Core user identity and authentication data
2. **professionalProfiles** - Detailed professional profile information
3. **facilityProfiles** - Facility/employer profile information
4. **organizations** - Organization/chain/group profile information
5. **admins** - Admin user accounts and permissions

### COMMUNICATION COLLECTIONS

6. **conversations** - Chat conversations between users
7. **messages** - Individual messages within conversations
8. **notifications** - User notifications

### BUSINESS COLLECTIONS

9. **contracts** - Signed contracts between professionals and facilities
10. **shifts** - Work shifts assigned to employees
11. **payroll** - Payroll records for employees
12. **invoices** - Invoice records
13. **bonusClaims** - Bonus claims from professionals

### MARKETPLACE COLLECTIONS

14. **positions** - Job positions posted by facilities
15. **availability** - Availability records
16. **professionalAvailabilities** - Availability listings from professionals

### SYSTEM COLLECTIONS

17. **facilityInvitations** - Facility invitation records
18. **legal_archive** - Legal archive documents
19. **antifraud_hashes** - Anti-fraud hash records for document verification
20. **auditProfessionalCertification** - Audit logs for professional certification verification

## USAGE

Import schemas from the index file:

```javascript
import { 
  usersSchema, 
  professionalProfilesSchema,
  contractsSchema 
} from '@/schemas';
```

Or import collection names:

```javascript
import { COLLECTION_NAMES } from '@/schemas';

const usersRef = collection(db, COLLECTION_NAMES.USERS);
```

## SCHEMA STRUCTURE

Each schema file exports a default object with the following structure:

- `collectionName` - Firestore collection name
- `description` - Collection description
- `documentId` - Document ID pattern/format
- `fields` - Field definitions with types and descriptions
- `indexes` - Recommended Firestore indexes
- `notes` - Additional notes and important information

## IMPORTANT NOTES

### Users Collection
- DO NOT include: `role`, `profileType`, `profileCompleted`, `profileStatus`, `tutorialPassed`, `tutorialAccessMode`, `facilityMemberships`, `verifiedAt`, `verifiedBy`
- These fields belong in profile collections (professionalProfiles, facilityProfiles)
- Document ID must match Firebase Auth UID

### Profile Collections
- `tutorialAccessMode` and `verification` fields belong in profile collections, not users
- Profile document IDs should match user UIDs for consistency

### Organizations
- Facilities map uses facility UIDs as keys for direct lookups
- Shared team supports cross-facility staffing/replacements
- Organization roles in users.roles follow same pattern as facility roles

## DATABASE NAME

All collections are stored in the Firestore database: **medishift**

## RELATED FILES

- Collection name constants: `src/config/keysDatabase.js`
- Functions collection constants: `functions/config/keysDatabase.js`

