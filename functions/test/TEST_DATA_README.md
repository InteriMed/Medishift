# TEST DATA GENERATOR

COMPREHENSIVE TEST DATA POPULATION FUNCTION FOR PROJECT DEMONSTRATION

## OVERVIEW

This module generates complete test data for the Medishift platform, including:
- Test user with admin rights
- Organization with multiple facilities
- Employees for each facility
- Events (past, current, and future)
- Contracts in various states
- Job postings
- Notifications

## FILES

- `generateTestData.js` - Main data generation function
- `runTestDataGeneration.js` - CLI script to execute generation

## GENERATED DATA STRUCTURE

### TEST USER
- **Email**: `demo@medishift.ch`
- **Password**: `DemoPass123!`
- **User ID**: `test_user_demo_2026`
- **Profiles**:
  - Professional Profile (Doctor)
  - Admin Account
  - Organization Admin
  - Facility Admin (Central Pharmacy)

### ORGANIZATION
- **ID**: `org_test_pharmacy_group`
- **Name**: MediCare Pharmacy Group
- **Type**: Pharmacy Chain
- **Legal Entity**: MediCare Pharmacy Group AG
- **UID Number**: CHE-123.456.789
- **Facilities**: 3 facilities

### FACILITIES

#### 1. Central Pharmacy (facility_central_pharmacy)
- **Location**: Zurich, ZH
- **Type**: Pharmacy
- **Employees**: 3
  - Pharmacist Demo001 (Scheduler)
  - Pharmacist Demo002 (Employee)
  - Receptionist Demo001 (Employee)

#### 2. North District Clinic (facility_north_clinic)
- **Location**: Basel, BS
- **Type**: Clinic
- **Employees**: 3
  - Nurse Demo001 (Admin)
  - Nurse Demo002 (Employee)
  - Receptionist Demo002 (Employee)

#### 3. South General Hospital (facility_south_hospital)
- **Location**: Geneva, GE
- **Type**: Hospital
- **Employees**: 2
  - Doctor Demo001 (Admin, Scheduler)
  - Doctor Demo002 (Recruiter)

### EVENTS (8 TOTAL)
- **Past Events**: 3
  - Morning Shift (7 days ago)
  - Afternoon Coverage (5 days ago)
  - Emergency Shift (2 days ago)
- **Current Events**: 1
  - Current Shift (today)
- **Future Events**: 4
  - Evening Shift (tomorrow)
  - Weekend Coverage (3 days)
  - Holiday Shift (7 days)
  - Night Shift (10 days)

### CONTRACTS (4 TOTAL)
- Contract 1: `awaiting_dual_approval` - Pending signatures
- Contract 2: `approved` - Approved by both parties
- Contract 3: `active` - Currently active
- Contract 4: `completed` - Finished contract

### JOB POSTINGS (3 TOTAL)
- Pharmacist Position at Central Pharmacy
- Nurse Position at North District Clinic
- Doctor Position at South General Hospital

### NOTIFICATIONS (5 TOTAL)
- Contract Approval Needed (High Priority)
- Shift Reminder (Normal Priority)
- Application Received (Normal Priority)
- Payment Processed (Low Priority, Read)
- Schedule Update (Normal Priority, Read)

## USAGE

### METHOD 1: DIRECT NODE EXECUTION

```bash
cd "NEW INTERIMED MERGED/functions"
node test/runTestDataGeneration.js
```

### METHOD 2: PROGRAMMATIC USE

```javascript
const { generateTestData } = require('./test/generateTestData');

async function setup() {
  const result = await generateTestData();
  console.log('Test data created:', result);
}

setup();
```

### METHOD 3: FIREBASE FUNCTIONS

```javascript
const { generateTestData } = require('./test/generateTestData');

exports.setupTestData = functions.https.onRequest(async (req, res) => {
  try {
    const result = await generateTestData();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## REQUIREMENTS

### FIREBASE ADMIN SDK
Requires Firebase Admin SDK initialized with service account credentials.

### SERVICE ACCOUNT KEY
Set environment variable or place in functions directory:
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
```

### DATABASE ACCESS
Script targets the `medishift` database. Ensure proper permissions.

## COLLECTIONS POPULATED

- `users` - User documents
- `professionalProfiles` - Professional profiles
- `facilityProfiles` - Facility profiles
- `organizations` - Organization documents
- `admins` - Admin accounts
- `events` - Calendar events/availabilities
- `positions` - Job postings
- `contracts` - Employment contracts
- `notifications` - User notifications

## DATA CHARACTERISTICS

### REALISTIC DATA
- Swiss addresses and phone numbers
- GLN numbers for healthcare entities
- CHE UID numbers for legal entities
- IBAN numbers for banking
- Proper timestamp handling

### COMPLETE RELATIONSHIPS
- User roles linked to facilities
- Organization contains facilities
- Employees assigned to facilities
- Contracts between professionals and facilities
- Events assigned to users and facilities

### VARIOUS STATES
- Past, current, and future events
- Contracts in different lifecycle states
- Read and unread notifications
- Active and pending approvals

## TESTING SCENARIOS

### SCENARIO 1: ORGANIZATION MANAGEMENT
Login as demo user and:
- View organization dashboard
- Manage 3 facilities
- View all employees across facilities
- Access cross-facility reports

### SCENARIO 2: FACILITY ADMINISTRATION
Login as demo user and:
- Access Central Pharmacy admin panel
- View facility employees
- Manage schedules and shifts
- Approve contracts

### SCENARIO 3: CALENDAR AND EVENTS
Login as demo user and:
- View past events
- See current shift
- Plan future availability
- Check event details

### SCENARIO 4: CONTRACT MANAGEMENT
Login as demo user and:
- Review pending contracts
- View approved contracts
- Check active employment contracts
- Access completed contracts

### SCENARIO 5: JOB POSTINGS
Login as demo user and:
- View open positions
- Manage job listings
- Review applications
- Post new positions

## CLEANUP

To remove test data, delete documents with these IDs:

### USERS
```javascript
const testUserIds = [
  'test_user_demo_2026',
  'employee_pharmacist_001',
  'employee_pharmacist_002',
  'employee_nurse_001',
  'employee_nurse_002',
  'employee_doctor_001',
  'employee_doctor_002',
  'employee_receptionist_001',
  'employee_receptionist_002'
];
```

### ORGANIZATIONS
```javascript
const organizationId = 'org_test_pharmacy_group';
```

### FACILITIES
```javascript
const facilityIds = [
  'facility_central_pharmacy',
  'facility_north_clinic',
  'facility_south_hospital'
];
```

## CUSTOMIZATION

### MODIFY USER CREDENTIALS
Edit in `generateTestData.js`:
```javascript
const testUserId = 'your_custom_id';
const testEmail = 'your@email.com';
```

### CHANGE FACILITY COUNT
Adjust `facilityData` array in `generateTestData.js`

### ADD MORE EMPLOYEES
Extend `employeeIds` array and assign to facilities

### MODIFY EVENT TYPES
Edit `eventTypes` array to change event characteristics

## SECURITY NOTES

⚠️ **IMPORTANT SECURITY CONSIDERATIONS**

1. **PASSWORD**: Default password is `DemoPass123!` - Change in production
2. **EMAIL VERIFICATION**: All accounts have `emailVerified: true` for testing
3. **ADMIN ACCESS**: Test user has full admin rights
4. **SERVICE ACCOUNT**: Keep service account key secure
5. **DATABASE ACCESS**: Only run in development/staging environments

## TROUBLESHOOTING

### ERROR: AUTH/UID-ALREADY-EXISTS
User already exists. Script will continue and update existing user.

### ERROR: SERVICE ACCOUNT NOT FOUND
Set `GOOGLE_APPLICATION_CREDENTIALS` environment variable.

### ERROR: PERMISSION DENIED
Ensure service account has Firestore write permissions.

### ERROR: DATABASE NOT FOUND
Verify database name is `medishift` in Firebase console.

## SUPPORT

For issues or questions:
1. Check Firebase console for created documents
2. Review script output for specific errors
3. Verify service account permissions
4. Ensure proper database connection

## VERSION

- **Version**: 1.0.0
- **Last Updated**: 2026-01-27
- **Compatible With**: Medishift Platform v2.0+

