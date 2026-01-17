# Test Data Generator for INTERIMED Platform

## Overview

The test data generator creates comprehensive, realistic test data for all Firebase collections in the INTERIMED platform. It generates data for the test user with UID `yXpsx5kaOhPO8em7o77F7wR9Xen1` and creates a complete ecosystem of related data.

## What Gets Generated

### 1. User Profile (`users` collection)
- **Test User**: Dr. Sarah Mueller
- **Email**: test.user@interimed.ch
- **Roles**: Professional + Facility Admin
- **Status**: Fully verified and onboarded
- **Features**: Notification preferences, consents, team memberships

### 2. Professional Profile (`professionalProfiles` collection)
- **Type**: Pharmacist (Clinical Pharmacist)
- **Complete Identity**: Legal name, DOB, nationality, AHV number
- **Contact Information**: Phone, email, residential address
- **Professional Details**: 
  - 8+ years experience
  - Specializations in geriatric pharmacy
  - Swiss pharmacy license and clinical certifications
  - Work experience at University Hospital Zürich
  - Education from ETH Zürich
- **Sensitive Data**: Banking info, payroll data (encrypted/protected)
- **Platform Settings**: Availability preferences, marketplace status

### 3. Facility Profile (`facilityProfiles` collection)
- **Facility**: Stadtapotheke Zürich (Pharmacy)
- **Legal Entity**: Stadtapotheke Zürich AG
- **Complete Business Info**: UID number, VAT, commercial register
- **Operational Details**: Opening hours, staffing requirements
- **Team Workspace Settings**: Time-off approval workflows

### 4. Team Members (subcollection of facility)
- **3 Team Members**:
  1. Dr. Sarah Mueller (Head Pharmacist, Manager)
  2. Anna Schneider (Pharmacy Technician, Full-time)
  3. Marco Rossi (Pharmacy Assistant, Part-time)
- **Roles & Permissions**: Different team roles and responsibilities
- **Employment Details**: Job titles, hours, skills

### 5. Contracts (`contracts` collection)
- **Employment Contract**: Between Sarah and the pharmacy
- **Complete Terms**: Salary (95,000 CHF), benefits, notice periods
- **Status Tracking**: Approved by both parties, active status
- **Platform Integration**: Fees, document URLs

### 6. Professional Availabilities (`professionalAvailabilities` collection)
- **30 Days of Availability**: Morning and afternoon slots
- **Realistic Patterns**: Weekdays only, alternating afternoon availability
- **Rate Information**: 45-70 CHF per hour
- **Location Preferences**: Zürich area, travel distance limits
- **Job Type Preferences**: Pharmacist, clinical pharmacist roles

### 7. Marketplace Positions (`positions` collection)
- **2 Open Positions**:
  1. Weekend Pharmacist (60 CHF/hour)
  2. Evening Pharmacy Technician (35 CHF/hour)
- **Complete Job Details**: Requirements, compensation, urgency
- **Applications**: Sample applications from other professionals
- **Location Data**: Address and coordinates

### 8. Time-Off Requests (`timeOffRequests` collection)
- **3 Requests**:
  1. Anna's vacation (approved)
  2. Marco's medical appointment (pending)
  3. Sarah's spring break (pending)
- **Different Types**: Vacation, personal appointments
- **Approval Workflow**: Manager notes, timestamps

### 9. Team Schedules (`teamSchedules` collection)
- **March 2024 Schedule**: Published team schedule
- **Weekly Shifts**: 
  - Morning shifts for head pharmacist
  - Afternoon shifts for technician
  - Part-time assistant coverage
- **Sublet Options**: Some shifts marked as sublettable
- **Shift Details**: Roles, responsibilities, notes

### 10. Conversations & Messages (`conversations` collection)
- **Professional Communication**: Between Sarah and another pharmacist
- **Message History**: Discussion about weekend position
- **Read Status**: Tracking of message read receipts
- **Realistic Content**: Professional, contextual messages

## How to Use

### Method 1: Browser Console (Development)
```javascript
// Import the utility (if not auto-loaded)
import { runTestDataGeneration } from '../utils/runTestDataGeneration';

// Generate all test data
await runTestDataGeneration();

// Clean up test data (when needed)
await runTestDataCleanup();
```

### Method 2: Direct Import
```javascript
import { generateTestData } from '../services/testDataGenerator';

const testData = await generateTestData();
console.log('Generated:', testData);
```

### Method 3: Component Integration
```javascript
import { useEffect } from 'react';
import { generateTestData } from '../services/testDataGenerator';

const TestDataButton = () => {
  const handleGenerateData = async () => {
    try {
      await generateTestData();
      alert('Test data generated successfully!');
    } catch (error) {
      console.error('Failed to generate test data:', error);
    }
  };

  return (
    <button onClick={handleGenerateData}>
      Generate Test Data
    </button>
  );
};
```

## Data Relationships

The generated data maintains proper relationships:

```
User (yXpsx5kaOhPO8em7o77F7wR9Xen1)
├── Professional Profile (same ID)
├── Facility Profile (yXpsx5kaOhPO8em7o77F7wR9Xen1_facility)
│   └── Team Members (3 members including main user)
├── Contracts (links professional + facility)
├── Availabilities (professional's marketplace presence)
├── Positions (facility's hiring needs)
├── Time-off Requests (team members requesting time off)
├── Team Schedules (facility's internal scheduling)
└── Conversations (professional communications)
```

## Security Considerations

- **Sensitive Data**: Banking and payroll information is included but should be properly secured
- **Test Environment**: Only use in development/testing environments
- **Data Cleanup**: Use cleanup function to remove test data when done
- **Real Data**: Never run this against production databases

## Customization

To modify the test data:

1. **Edit User Details**: Change `generateUserData()` function
2. **Add More Profiles**: Modify professional/facility generation functions
3. **Different Scenarios**: Adjust contract terms, availability patterns
4. **More Team Members**: Expand `generateTeamMembers()` function
5. **Additional Messages**: Extend conversation generation

## Firebase Collections Created

- `users/{TEST_USER_UID}`
- `professionalProfiles/{TEST_USER_UID}`
- `facilityProfiles/{TEST_USER_UID}_facility`
- `facilityProfiles/{facilityId}/teamMembers/{userId}` (subcollection)
- `contracts/{contractId}` (auto-generated IDs)
- `professionalAvailabilities/{availabilityId}` (auto-generated IDs)
- `positions/{positionId}` (auto-generated IDs)
- `positions/{positionId}/applications/{applicationId}` (subcollection)
- `timeOffRequests/{requestId}` (auto-generated IDs)
- `teamSchedules/{scheduleId}`
- `teamSchedules/{scheduleId}/shifts/{shiftId}` (subcollection)
- `conversations/{conversationId}` (auto-generated IDs)
- `conversations/{conversationId}/messages/{messageId}` (subcollection)

## Testing Scenarios Enabled

This test data enables testing of:

1. **User Onboarding**: Complete user with all profile data
2. **Dual Roles**: User as both professional and facility admin
3. **Team Management**: Managing team members and schedules
4. **Marketplace**: Posting positions and managing availabilities
5. **Contracts**: Creating and managing employment agreements
6. **Scheduling**: Team schedules with sublet options
7. **Time-off**: Request and approval workflows
8. **Messaging**: Professional communications
9. **Data Relationships**: Complex interconnected data structures
10. **UI Components**: All dashboard features with realistic data

## Troubleshooting

### Common Issues:
- **Firebase Connection**: Ensure Firebase is properly initialized
- **Permissions**: Check Firestore security rules allow writes
- **Duplicate Data**: Use cleanup function before regenerating
- **Missing Collections**: Verify all collection names match your Firebase setup

### Debug Mode:
The generator includes extensive console logging to track progress and identify issues.

## Future Enhancements

Potential improvements:
- Multiple test users with different roles
- More complex team structures
- Historical data (past contracts, schedules)
- Different facility types (clinics, hospitals)
- More professional types (doctors, nurses)
- Bulk data generation for performance testing 