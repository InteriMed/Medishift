# Marketplace Module - Two-Sided Job Platform

## Overview
Complete marketplace system for **Facilities** (demand) and **Professionals** (supply) with mission management, applications, transactions, and professional tools.

---

## 1. 🏥 Facility Actions (The "Demand" Side)

### MARKETPLACE.POST_MISSION
**Purpose**: Create job posting to fill gaps with qualified talent  
**Input**: `role`, `dates[]`, `location`, `ratePerHour`, `requirements`, `targeting`, `description`  

**Constraint Check**: Rate must meet legal minimum (CCT)  
**Targeting Options**:
- `PUBLIC` - Everyone
- `POOL_ONLY` - Verified network only
- `FAVORITES` - Previous hires

**AI Hook**: Draft job descriptions

```typescript
const { missionId } = await executeAction('marketplace.post_mission', {
  role: "pharmacist",
  dates: ["2024-03-15", "2024-03-16"],
  location: {
    address: "Rue de la Gare 10",
    city: "Lausanne",
    canton: "VD",
    coordinates: { lat: 46.5197, lng: 6.6323 }
  },
  ratePerHour: 90,
  requirements: {
    skills: ["NetCare"],
    certifications: ["Vaccination_Permit"],
    minExperience: 2
  },
  targeting: "PUBLIC",
  description: "Weekend coverage needed"
});
```

---

### MARKETPLACE.SEARCH_TALENT_POOL
**Purpose**: Find qualified professionals (anonymized to prevent poaching)  
**Input**: `query`, `role`, `availabilityDate`, `radiusKM`, `minRating`  
**Output**: Anonymized profiles (e.g., "M. D., Pharmacist, 5 yrs, Geneva")  

**Privacy**: Full identity only revealed upon application

```typescript
const { profiles } = await executeAction('marketplace.search_talent_pool', {
  role: "pharmacist",
  radiusKM: 20,
  minRating: 4.0
});
```

---

### MARKETPLACE.INVITE_TALENT
**Purpose**: Send direct invitation to a professional  
**Input**: `missionId`, `userId`, `personalMessage`  

**Notification**: Push notification "Pharmacie Populaire invited you to a mission"

```typescript
await executeAction('marketplace.invite_talent', {
  missionId: "mis_123",
  userId: "usr_456",
  personalMessage: "We loved working with you before!"
});
```

---

### MARKETPLACE.HIRE_CANDIDATE
**Purpose**: Accept application and complete onboarding  
**Input**: `applicationId`  
**Output**: `contractId`, `shiftIds[]`  

**Automated Actions**:
1. **Contract Generation**: Auto-generates CDD/INTERIM contract
2. **Roster Sync**: Adds user to calendar for mission dates
3. **Access Grant**: Temporary system access (badge) for mission duration

**Risk Level**: HIGH (creates contracts and system access)

```typescript
const { contractId, shiftIds } = await executeAction('marketplace.hire_candidate', {
  applicationId: "app_789"
});
```

---

## 2. 👩‍⚕️ Professional Actions (The "Supply" Side)

### MARKETPLACE.BROWSE_MISSIONS
**Purpose**: Find available work with geo-sorting  
**Input**: `filters` (role, minRate, maxDistanceKM, dateRange, cantons), `sortBy`  

**Geo-Sorting**: "Show missions within 20km of my home"

```typescript
const { missions } = await executeAction('marketplace.browse_missions', {
  filters: {
    role: "assistant",
    minRate: 65,
    maxDistanceKM: 15,
    cantons: ["GE", "VD"]
  },
  sortBy: "distance"
});
```

---

### MARKETPLACE.APPLY
**Purpose**: Submit application with validation  
**Input**: `missionId`, `proposedRate`, `message`  

**Validation Blocks**:
- ❌ Permit/License expired
- ❌ Scheduling conflict with existing shifts
- ❌ Missing mandatory skills/certifications

```typescript
const { applicationId } = await executeAction('marketplace.apply', {
  missionId: "mis_123",
  proposedRate: 85,
  message: "Available and experienced with NetCare"
});
```

---

### MARKETPLACE.NEGOTIATE_OFFER
**Purpose**: Counter-offer on mission rate  
**Input**: `applicationId`, `counterOffer`, `message`  

**Use Case**: Facility offers 80 CHF/hr → Professional counters with 85 CHF/hr

```typescript
await executeAction('marketplace.negotiate_offer', {
  applicationId: "app_789",
  counterOffer: 85,
  message: "Based on my 5 years experience"
});
```

---

### MARKETPLACE.SET_ALERT
**Purpose**: Get notified when matching missions appear  
**Input**: `criteria` (roles, minRate, maxDistanceKM, daysOfWeek, cantons)  

**Notification**: Push when match appears

```typescript
const { alertId } = await executeAction('marketplace.set_alert', {
  criteria: {
    roles: ["pharmacist"],
    minRate: 90,
    daysOfWeek: [0, 6],
    cantons: ["GE"]
  }
});
```

---

## 3. 🤝 Transaction & Review

### MARKETPLACE.VALIDATE_TIMESHEET
**Purpose**: Submit actual hours worked for manager approval  
**Input**: `missionId`, `actualHours[]`, `comment`  

**Flow**: Professional submits → Manager approves → Payroll

**Risk Level**: HIGH (affects payroll)

```typescript
const { timesheetId } = await executeAction('marketplace.validate_timesheet', {
  missionId: "mis_123",
  actualHours: [
    { date: "2024-03-15", clockIn: "08:00", clockOut: "16:00", hours: 8 },
    { date: "2024-03-16", clockIn: "08:00", clockOut: "16:00", hours: 8 }
  ]
});
```

---

### MARKETPLACE.RATE_PARTY
**Purpose**: Dual-sided ratings after mission completion  
**Input**: `missionId`, `targetId`, `score` (1-5), `tags`, `comment`  

**Dual Side**:
- **Facility → Professional**: "Did they show up? Were they good?"
- **Professional → Facility**: "Was team welcoming? Payment on time?"

```typescript
await executeAction('marketplace.rate_party', {
  missionId: "mis_123",
  targetId: "usr_456",
  score: 5,
  tags: ["Punctual", "Team Player", "Professional"],
  comment: "Excellent work, would hire again"
});
```

---

## 4. 🎓 Professional Tools

### PROFILE.GENERATE_SHAREABLE_CV
**Purpose**: Create portable verified digital passport  
**Input**: `includeRatings`, `includeFacilityNames`, `expiryDays`  
**Output**: `cvUrl`, `publicUrl`, `expiresAt`  

**Content**: "Verified: Worked 400h at Pharmacie Populaire. Rated 4.8/5."

**Use Case**: Apply for jobs outside platform with verified credibility

```typescript
const { publicUrl, expiresAt } = await executeAction('profile.generate_shareable_cv', {
  includeRatings: true,
  includeFacilityNames: true,
  expiryDays: 30
});
```

---

### FINANCE.SIMULATE_MISSION_INCOME
**Purpose**: Calculate net take-home after taxes/social security  
**Input**: `hourlyRate`, `hours`, `canton`, `isMarried`  
**Output**: `simulation` (gross, net, breakdown)  

**Swiss Context**: Calculates AVS, AC, LPP, source tax

```typescript
const { simulation } = await executeAction('finance.simulate_mission_income', {
  hourlyRate: 90,
  hours: 16,
  canton: "VD",
  isMarried: false
});

console.log(`Gross: ${simulation.grossAmount} CHF`);
console.log(`Net: ${simulation.netAmount} CHF`);
```

---

### MARKETPLACE.TOGGLE_OPEN_TO_WORK
**Purpose**: Broadcast availability to recruiters (passive income mode)  
**Input**: `active`, `availability`, `preferredLocations`, `minRate`, `maxDistanceKM`  

**Gap Filled**: Previously calendar was "request-based"; this enables recruiters to discover you

```typescript
await executeAction('marketplace.toggle_open_to_work', {
  active: true,
  availability: {
    daysOfWeek: [2, 4],
    timeSlots: ["morning", "afternoon"]
  },
  preferredLocations: ["Geneva", "Lausanne"],
  minRate: 85,
  maxDistanceKM: 30
});
```

---

## Key Features

### 1. **Legal Rate Validation**
All mission postings validate against Swiss CCT (Convention Collective de Travail) minimum rates:
- Pharmacist: 85 CHF/hr minimum
- Assistant: 60 CHF/hr minimum

### 2. **Anti-Poaching Privacy**
Talent pool search returns anonymized profiles until professionals apply, preventing facility raids.

### 3. **Conflict Detection**
Application process validates:
- No scheduling conflicts
- Valid certifications
- No expired permits

### 4. **Automated Onboarding**
Hiring triggers:
- Contract generation (CDD/INTERIM)
- Calendar synchronization
- Temporary access grant

### 5. **Dual-Sided Ratings**
Both parties rate each other, building trust and reputation.

### 6. **Swiss Tax Simulation**
Accurate net income calculation with canton-specific source tax rates.

---

## Firestore Collections

```
marketplace_missions/
  {missionId}/
    - facilityId
    - role
    - dates[]
    - ratePerHour
    - requirements
    - targeting
    - status

marketplace_applications/
  {applicationId}/
    - missionId
    - professionalId
    - status
    - proposedRate
    - counterOffer

marketplace_contracts/
  {contractId}/
    - missionId
    - professionalId
    - facilityId
    - contractType
    - ratePerHour
    - pdfUrl

marketplace_timesheets/
  {timesheetId}/
    - missionId
    - submittedHours
    - approvedHours
    - status

marketplace_ratings/
  {ratingId}/
    - missionId
    - fromUserId
    - toUserId
    - score
    - tags

marketplace_alerts/
  {alertId}/
    - userId
    - criteria
    - active

marketplace_open_to_work/
  {userId}/
    - active
    - availability
    - minRate

shareable_cvs/
  {cvId}/
    - userId
    - publicUrl
    - expiresAt
```

---

## React Hooks

```typescript
// Browse missions with filters
const useMissions = (filters) => {
  const { missions } = useAction('marketplace.browse_missions', { filters });
  return missions;
};

// Apply to mission
const useApplyMission = () => {
  const [applying, setApplying] = useState(false);
  
  const apply = async (missionId, rate) => {
    setApplying(true);
    await executeAction('marketplace.apply', { missionId, proposedRate: rate });
    setApplying(false);
  };

  return { apply, applying };
};

// Income simulator
const useIncomeSimulator = () => {
  const simulate = async (hourlyRate, hours) => {
    const { simulation } = await executeAction('finance.simulate_mission_income', {
      hourlyRate,
      hours,
      canton: 'VD'
    });
    return simulation;
  };

  return { simulate };
};
```

---

## Cloud Functions

```javascript
// Auto-trigger mission alerts
exports.onMissionPosted = functions.firestore
  .document('marketplace_missions/{missionId}')
  .onCreate(async (snap, context) => {
    const mission = snap.data();
    
    if (mission.targeting === 'PUBLIC') {
      const alertsQuery = await db.collection('marketplace_alerts')
        .where('active', '==', true)
        .get();

      for (const alertDoc of alertsQuery.docs) {
        const alert = alertDoc.data();
        if (matchesCriteria(mission, alert.criteria)) {
          await sendNotification(alert.userId, `New mission: ${mission.role} at ${mission.ratePerHour} CHF/hr`);
        }
      }
    }
  });

// Generate mission contract
exports.generateMissionContract = functions.https.onCall(async (data, context) => {
  const { contractId } = data;
  const contract = await db.collection('marketplace_contracts').doc(contractId).get();
  
  // Generate PDF using template
  const pdfBuffer = await generateContractPDF(contract.data());
  
  // Upload to storage
  const storagePath = `contracts/${contractId}.pdf`;
  await storage.bucket().file(storagePath).save(pdfBuffer);
  
  return { success: true };
});
```

---

## Security Rules

```javascript
// Missions public read, facility write
match /marketplace_missions/{missionId} {
  allow read: if request.auth != null;
  allow write: if request.auth.token.facilityId == resource.data.facilityId
    || request.auth.token.role == 'admin';
}

// Applications owned by applicant
match /marketplace_applications/{applicationId} {
  allow read: if request.auth.uid == resource.data.professionalId
    || request.auth.token.facilityId == resource.data.facilityId;
  allow create: if request.auth.uid == request.resource.data.professionalId;
}

// Open to work profile is private
match /marketplace_open_to_work/{userId} {
  allow read: if request.auth.token.role in ['admin', 'facility_admin'];
  allow write: if request.auth.uid == userId;
}
```

---

## Testing

```typescript
// Test mission posting with rate validation
try {
  await executeAction('marketplace.post_mission', {
    role: 'pharmacist',
    ratePerHour: 50  // Below minimum
  });
} catch (error) {
  assert(error.message.includes('below legal minimum'));
}

// Test application conflict detection
await executeAction('calendar.create_shift', { date: '2024-03-15' });
try {
  await executeAction('marketplace.apply', { 
    missionId: 'mis_with_same_date' 
  });
} catch (error) {
  assert(error.message.includes('Scheduling conflict'));
}

// Test income simulation
const { simulation } = await executeAction('finance.simulate_mission_income', {
  hourlyRate: 90,
  hours: 16
});
assert(simulation.netAmount < simulation.grossAmount);
```

