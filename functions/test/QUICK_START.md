# QUICK START GUIDE
TEST DATA GENERATION FOR MEDISHIFT DEMO

## SETUP

### STEP 1: PREPARE SERVICE ACCOUNT
```bash
cd "NEW INTERIMED MERGED/functions"

export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
```

### STEP 2: INSTALL DEPENDENCIES
```bash
npm install
```

## GENERATE TEST DATA

### OPTION A: RUN DIRECTLY
```bash
node test/runTestDataGeneration.js
```

### OPTION B: USE NPM SCRIPT
Add to `package.json` scripts:
```json
{
  "scripts": {
    "generate-test-data": "node test/runTestDataGeneration.js",
    "cleanup-test-data": "node test/runTestDataCleanup.js"
  }
}
```

Then run:
```bash
npm run generate-test-data
```

## LOGIN WITH TEST USER

After generation completes:

**Email**: `demo@medishift.ch`
**Password**: `DemoPass123!`

## VERIFY DATA

### CHECK FIREBASE CONSOLE
1. Go to Firebase Console
2. Select `medishift` database
3. Verify collections populated:
   - users
   - professionalProfiles
   - facilityProfiles
   - organizations
   - admins
   - events
   - positions
   - contracts
   - notifications

### CHECK USER ACCESS
1. Login to application
2. Verify workspaces available:
   - Personal (Professional Account)
   - Central Pharmacy (Facility Admin)
   - MediCare Pharmacy Group (Organization Admin)
   - Admin Panel (Platform Admin)

### CHECK ORGANIZATION
1. Switch to organization workspace
2. Verify 3 facilities visible
3. Check employees across facilities

### CHECK EVENTS
1. Go to Calendar
2. Verify events:
   - Past: 3 events
   - Current: 1 event
   - Future: 4 events

### CHECK CONTRACTS
1. Go to Contracts page
2. Verify 4 contracts:
   - Awaiting approval
   - Approved
   - Active
   - Completed

## CLEANUP TEST DATA

### REMOVE ALL TEST DATA
```bash
node test/runTestDataCleanup.js
```

Or with npm:
```bash
npm run cleanup-test-data
```

**WARNING**: Type "yes" when prompted. This action cannot be undone.

## TROUBLESHOOTING

### ISSUE: MODULE NOT FOUND
```bash
cd "NEW INTERIMED MERGED/functions"
npm install
```

### ISSUE: SERVICE ACCOUNT ERROR
Verify path and permissions:
```bash
ls -la /path/to/service-account-key.json
export GOOGLE_APPLICATION_CREDENTIALS="/correct/path/service-account-key.json"
```

### ISSUE: PERMISSION DENIED
Ensure service account has:
- Firestore: Read/Write
- Authentication: User Management
- Database: `medishift`

### ISSUE: USER ALREADY EXISTS
Run cleanup first:
```bash
node test/runTestDataCleanup.js
```

Then regenerate:
```bash
node test/runTestDataGeneration.js
```

## WHAT GETS CREATED

### ACCOUNTS (9 TOTAL)
- 1 Test user (admin across all workspaces)
- 8 Employee accounts (distributed across facilities)

### ORGANIZATION (1)
- MediCare Pharmacy Group
- 3 facilities
- Complete legal and billing information

### FACILITIES (3)
- Central Pharmacy (Zurich) - 3 employees
- North District Clinic (Basel) - 3 employees
- South General Hospital (Geneva) - 2 employees

### EVENTS (8)
- Distributed across past, current, and future
- Various shift types
- Complete event details

### CONTRACTS (4)
- Different lifecycle states
- Professional terms and compensation
- Proper party relationships

### JOB POSTINGS (3)
- One per facility type
- Active and urgent positions
- Complete job descriptions

### NOTIFICATIONS (5)
- Various priority levels
- Some read, some unread
- Different notification types

## DEMONSTRATION SCENARIOS

### DEMO 1: MULTI-WORKSPACE NAVIGATION
1. Login as demo user
2. Switch between Personal, Facility, Organization, Admin workspaces
3. Show different views and permissions

### DEMO 2: ORGANIZATION MANAGEMENT
1. Access organization workspace
2. View all facilities
3. Manage cross-facility employees
4. View consolidated reports

### DEMO 3: FACILITY ADMINISTRATION
1. Access Central Pharmacy facility
2. View employee list
3. Manage schedules
4. Post new positions

### DEMO 4: CALENDAR AND SCHEDULING
1. Open Calendar view
2. Show past shifts
3. Highlight current shift
4. Plan future availability

### DEMO 5: CONTRACT WORKFLOW
1. View contracts page
2. Show pending contract
3. Approve contract
4. View active contracts

### DEMO 6: JOB MARKETPLACE
1. View open positions
2. Show job details
3. Application process
4. Position management

## CUSTOMIZATION

### CHANGE USER EMAIL
Edit `generateTestData.js`:
```javascript
const testEmail = 'your@email.com';
```

### MODIFY PASSWORD
Edit `generateTestData.js`:
```javascript
password: 'YourSecurePassword123!',
```

### ADD MORE FACILITIES
Edit `facilityData` array:
```javascript
const facilityData = [
  // Add new facility objects
];
```

### CHANGE ORGANIZATION NAME
Edit organization section:
```javascript
organizationName: 'Your Organization Name',
```

## SECURITY REMINDERS

🔒 **NEVER** commit service account keys to git
🔒 **CHANGE** default password in production
🔒 **LIMIT** admin access in production
🔒 **USE** strong passwords for real users
🔒 **VERIFY** email addresses in production

## NEXT STEPS

1. Generate test data
2. Login and verify
3. Run through demo scenarios
4. Customize as needed
5. Cleanup when done
6. Regenerate for new demo

## SUPPORT

For issues:
1. Check console output for errors
2. Verify Firebase permissions
3. Review service account setup
4. Check database connection
5. Consult TEST_DATA_README.md

---

**Version**: 1.0.0
**Last Updated**: 2026-01-27

