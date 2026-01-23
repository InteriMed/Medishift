# Medishift Demo Facility - Setup Guide

## Overview

The Medishift Demo Facility is a special facility workspace that all admin users can access for presentations and testing. It's automatically available in the workspace switcher for all active admins.

## How to Seed the Facility

### Option 1: From Frontend (Recommended)

Use the admin utility function from any admin page:

```javascript
import { seedMedishiftDemoFacility } from '../../utils/adminUtils';

try {
  const result = await seedMedishiftDemoFacility();
  console.log(result.message); // "Demo facility created successfully for X admin(s)"
} catch (error) {
  console.error('Error:', error.message);
}
```

### Option 2: Using Cloud Function Directly

From browser console or admin panel:

```javascript
import { getFunctions, httpsCallable } from 'firebase/functions';
import { firebaseApp } from '../services/firebase';

const functions = getFunctions(firebaseApp, 'europe-west6');
const seed = httpsCallable(functions, 'seedDemoFacility');
const result = await seed();
console.log(result.data);
```

### Option 3: Firebase CLI

```bash
firebase functions:call seedDemoFacility
```

### Option 4: Direct Node.js (Requires Credentials)

If you have service account credentials:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
cd functions
node -e "require('./database/seedMedishiftDemoFacility').seedMedishiftDemoFacility().then(r => console.log('Success:', r)).catch(e => console.error('Error:', e.message))"
```

## How to Remove the Facility

### From Frontend:

```javascript
import { removeMedishiftDemoFacility } from '../../utils/adminUtils';

try {
  const result = await removeMedishiftDemoFacility();
  console.log(result.message);
} catch (error) {
  console.error('Error:', error.message);
}
```

### Using Cloud Function:

```javascript
const remove = httpsCallable(functions, 'removeDemoFacility');
await remove();
```

## What Gets Created

1. **Facility Profile** (`facilityProfiles/medishift-demo-facility`):
   - Complete facility profile with demo data
   - All active admins added as employees with full roles
   - Verification status set to 'verified'
   - Subscription tier set to 'enterprise'

2. **User Roles**:
   - All active admin users get the demo facility added to their `users.roles` array
   - Roles: ['admin', 'scheduler', 'hr_manager', 'employee']

## Admin Access

Once seeded, all active admins will automatically see "Medishift Demo Facility" in their workspace switcher. They can:

- Access it without any restrictions
- Use it for presentations
- Test facility features
- Access all facility routes (payroll, organization, etc.)

## Notes

- The facility ID is: `medishift-demo-facility`
- The facility is marked with `isDemo: true` flag
- All data in the facility is fictional and for demo purposes only
- The facility persists until explicitly removed

