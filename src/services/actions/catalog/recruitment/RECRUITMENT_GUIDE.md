# RECRUITMENT & ATS MODULE

## OVERVIEW

The **Recruitment Module** is a full Applicant Tracking System (ATS) designed for quality hiring. Unlike the **Marketplace** (built for speed and shift coverage), this module supports:

- Custom screening questions (knockout logic).
- CV parsing with AI.
- Side-by-side candidate comparison.
- Interview scheduling with calendar integration.
- Feedback logging (hidden from candidates).

---

## MARKETPLACE VS RECRUITMENT

| Feature                  | Marketplace                       | Recruitment                              |
|--------------------------|-----------------------------------|------------------------------------------|
| **Purpose**              | Fill urgent shifts                | Hire permanent staff                     |
| **Speed**                | High (1-click apply)              | Medium (multi-step application)          |
| **Screening**            | Basic (permit, skills)            | Deep (custom forms, interviews)          |
| **Integration**          | Calendar (instant roster sync)    | Calendar + Contract Gen + Onboarding     |
| **Visibility**           | Public or Pool-only               | Fully customizable (interimed.ch/jobs)   |

---

## ACTION CATALOG

### 1. JOB AD BUILDER (`/recruitment/jobs/`)

#### `recruitment.create_job_posting`

**Purpose:** Create structured job ad with custom screening questions.

**Input:**
- `title`: Job title (e.g., "Pharmacist - Geneva").
- `role`: System role.
- `basicDetails`: Salary, work percentage, contract type, start date, location.
- `standardFields`: Toggle built-in requirements (CV, permit, software, diplomas, references).
- `customQuestions`: Array of custom screening questions.
  - Types: `MULTIPLE_CHOICE`, `OPEN_TEXT`, `BOOLEAN`, `FILE_UPLOAD`.
  - Knockout Logic: Flag critical questions with `isKnockout: true` and `knockoutValue`.
- `description`: Job description text.

**Output:**
- `jobId`: Firestore ID.
- `publicUrl`: Public link (e.g., `https://interimed.ch/jobs/{id}`).

**Example:**

```json
{
  "title": "Pharmacist - Part Time",
  "role": "pharmacist",
  "basicDetails": {
    "salary": 85000,
    "workPercentage": 80,
    "contractType": "CDI",
    "startDate": "2026-03-01",
    "location": "Geneva"
  },
  "standardFields": {
    "require_cv": true,
    "require_permit_scan": true,
    "require_software_netcare": true,
    "require_diplomas": true,
    "require_references": false
  },
  "customQuestions": [
    {
      "type": "BOOLEAN",
      "question": "Do you have a valid Swiss Pharmacist license?",
      "required": true,
      "isKnockout": true,
      "knockoutValue": true
    },
    {
      "type": "MULTIPLE_CHOICE",
      "question": "Do you have a car?",
      "options": ["Yes", "No"],
      "required": false
    },
    {
      "type": "OPEN_TEXT",
      "question": "Describe a difficult situation you resolved.",
      "required": true
    }
  ],
  "description": "We are looking for a passionate pharmacist..."
}
```

---

#### `recruitment.archive_job`

**Purpose:** Close job and notify pending applicants.

**Input:**
- `jobId`: Job to close.
- `reason`: `FILLED`, `CANCELLED`, `EXPIRED`.
- `comment`: Optional explanation.

**Logic:**
- Sets job status to `CLOSED`.
- Auto-rejects all pending applications.
- Sends notification: "Position closed. Thank you for your interest."

---

### 2. APPLICATION HANDLING (`/recruitment/applications/`)

#### `recruitment.submit_application`

**Purpose:** Apply to job with custom quiz answers and auto-reject validation.

**Input:**
- `jobId`: Target job.
- `answers`: Map of `questionId` -> answer.
- `cvFileUrl`: Optional CV upload.

**Logic:**
1. **Profile Sync:** Auto-pulls basic data (name, experience, skills) from user profile.
2. **Knockout Validation:** If any knockout question is failed, status → `AUTO_REJECT`.
3. **Status:** `PENDING` or `AUTO_REJECT`.

**Example:**

```json
{
  "jobId": "job_xyz",
  "answers": {
    "q_1": true,
    "q_2": "Yes",
    "q_3": "I resolved a conflict by..."
  },
  "cvFileUrl": "https://storage.googleapis.com/cvs/john_cv.pdf"
}
```

**Output:**

```json
{
  "applicationId": "app_abc",
  "status": "PENDING"
}
```

---

#### `recruitment.parse_cv_ai`

**Purpose:** Extract skills, software, and experience from CV automatically.

**Input:**
- `applicationId`: Target application.
- `cvFileUrl`: CV file URL.

**Logic:**
- Downloads CV.
- Extracts:
  - Skills: "Patient Care", "Medication Dispensing".
  - Software: "NetCare", "Tactil", "CGM".
  - Certifications: "FPH", "Vaccination Permit".
  - Experience: Company, role, duration.
  - Languages: "French", "German".
  - Education: "Master in Pharmacy".

**Output:**

```json
{
  "parsedData": {
    "skills": ["Patient Care", "Consultation"],
    "software": ["NetCare", "Tactil"],
    "certifications": ["FPH"],
    "experience": [
      {
        "role": "Pharmacist",
        "facility": "Pharmacie Centrale",
        "duration": "3 years"
      }
    ],
    "languages": ["French", "German"],
    "education": ["Master in Pharmacy"]
  }
}
```

---

### 3. CANDIDATE COMPARISON & SCORING (`/recruitment/analysis/`)

#### `recruitment.compare_applicants`

**Purpose:** Side-by-side comparison with AI recommendations.

**Input:**
- `jobId`: Job ID.
- `candidateIds`: Array of user IDs to compare.

**Output:**

```json
{
  "comparison": {
    "jobId": "job_xyz",
    "candidates": [
      {
        "id": "user_123",
        "name": "John Doe",
        "experience": "5 years",
        "software": ["NetCare", "Tactil"],
        "quizScore": 85,
        "aiMatchScore": 92,
        "salaryExpectation": 90000,
        "availability": "Immediate"
      },
      {
        "id": "user_456",
        "name": "Jane Smith",
        "experience": "3 years",
        "software": ["NetCare"],
        "quizScore": 78,
        "aiMatchScore": 85,
        "salaryExpectation": 80000,
        "availability": "1 month"
      }
    ],
    "recommendation": {
      "topCandidate": "user_123",
      "reasoning": "John Doe recommended: highest AI match score, more software proficiency, excellent quiz performance."
    }
  }
}
```

**Logic:**
- Normalizes experience ("5 years" vs "Five yrs").
- Calculates quiz score from answers.
- AI provides recommendation reasoning.

---

#### `recruitment.score_open_questions`

**Purpose:** Analyze open text answers for relevance and sentiment.

**Input:**
- `applicationId`: Application ID.
- `questionId`: Specific open text question.

**Output:**

```json
{
  "score": 78,
  "sentiment": "POSITIVE",
  "keyPoints": [
    "Demonstrates conflict resolution",
    "Shows teamwork skills"
  ]
}
```

**Logic:**
- AI analyzes text for positive/negative keywords.
- Scores from 0-100.
- Sentiment: `POSITIVE`, `NEUTRAL`, `NEGATIVE`.

---

### 4. INTERVIEW MANAGEMENT (`/recruitment/interviews/`)

#### `recruitment.schedule_interview`

**Purpose:** Book interview with calendar overlay and auto-invite.

**Input:**
- `applicationId`: Application ID.
- `hostUserId`: Interviewer (Manager).
- `scheduledAt`: ISO datetime (e.g., "2026-02-15T14:00:00").
- `duration`: Minutes (default: 60).
- `type`: `VIDEO`, `IN_PERSON`, `PHONE`.
- `location`: Optional (for in-person).
- `videoLink`: Optional (for video).

**Logic:**
1. **Availability Overlay:** Checks Calendar of both host and candidate for conflicts.
2. **Calendar Block:** Creates a shift in `calendar_shifts` with type `INTERVIEW`.
3. **Notifications:** Sends invite to both parties.

**Output:**

```json
{
  "interviewId": "int_abc",
  "calendarEventCreated": true
}
```

---

#### `recruitment.log_interview_feedback`

**Purpose:** Record interview notes and hiring decision (hidden from candidate).

**Input:**
- `interviewId`: Interview ID.
- `score`: Rating (1-5).
- `decision`: `HIRE`, `REJECT`, `SECOND_ROUND`.
- `notes`: Free text notes.
- `strengths`: Optional array.
- `weaknesses`: Optional array.

**Security:**
- Stored in `recruitment_interview_feedback` collection.
- `visibility: HIRING_TEAM_ONLY` (candidate cannot see this).

**Output:**

```json
{
  "feedbackId": "fb_xyz"
}
```

---

## DATA MODELS

### Job Posting

```typescript
interface JobPosting {
  id: string;
  facilityId: string;
  title: string;
  role: string;
  basicDetails: {
    salary: number;
    workPercentage: number;
    contractType: 'CDI' | 'CDD' | 'INTERIM';
    startDate: string;
    location: string;
  };
  standardFields: {
    require_cv: boolean;
    require_permit_scan: boolean;
    require_software_netcare: boolean;
    require_diplomas: boolean;
    require_references: boolean;
  };
  customQuestions: CustomQuestion[];
  knockoutQuestionIds: string[];
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
  createdBy: string;
  createdAt: Timestamp;
}
```

### Application

```typescript
interface Application {
  id: string;
  jobId: string;
  userId: string;
  status: 'PENDING' | 'AUTO_REJECT' | 'REVIEWING' | 'INTERVIEW' | 'HIRED' | 'REJECTED';
  answers: Record<string, any>;
  cvFileUrl?: string;
  cvParsedData?: CVParsedData;
  aiMatchScore?: number;
  submittedAt: Timestamp;
}
```

### Interview

```typescript
interface Interview {
  id: string;
  applicationId: string;
  jobId: string;
  hostUserId: string;
  candidateUserId: string;
  scheduledAt: Timestamp;
  duration: number;
  type: 'VIDEO' | 'IN_PERSON' | 'PHONE';
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
}
```

### Interview Feedback

```typescript
interface InterviewFeedback {
  id: string;
  interviewId: string;
  score: number; // 1-5
  decision: 'HIRE' | 'REJECT' | 'SECOND_ROUND';
  notes: string;
  visibility: 'HIRING_TEAM_ONLY'; // CRITICAL: Candidate cannot see
  createdBy: string;
  createdAt: Timestamp;
}
```

---

## KNOCKOUT LOGIC

**Knockout questions** auto-reject candidates who fail critical requirements.

**Example:**

```json
{
  "type": "BOOLEAN",
  "question": "Do you have a valid Swiss work permit?",
  "isKnockout": true,
  "knockoutValue": true
}
```

**If candidate answers `false`:**
- Application status → `AUTO_REJECT`.
- Reason: "Required: Do you have a valid Swiss work permit? must be 'true'."
- No manual review needed.

---

## INTEGRATION WITH OTHER MODULES

### Calendar Module

- `schedule_interview` creates a calendar block of type `INTERVIEW`.
- Prevents host from being double-booked.

### Contracts Module

- When `decision: HIRE` is logged, trigger contract generation.

### Team Module

- After contract signed, call `team.invite_user` to complete onboarding.

---

## PERMISSIONS

| Action                              | Required Permission                |
|-------------------------------------|------------------------------------|
| `recruitment.create_job_posting`    | `recruitment.create_job`           |
| `recruitment.archive_job`           | `recruitment.archive_job`          |
| `recruitment.submit_application`    | `recruitment.apply`                |
| `recruitment.parse_cv_ai`           | `recruitment.parse_cv`             |
| `recruitment.compare_applicants`    | `recruitment.compare_applicants`   |
| `recruitment.score_open_questions`  | `recruitment.score_questions`      |
| `recruitment.schedule_interview`    | `recruitment.schedule_interview`   |
| `recruitment.log_interview_feedback`| `recruitment.log_interview_feedback`|

---

## BEST PRACTICES

### For Managers

1. **Use Knockout Questions:** Filter out unqualified candidates early.
2. **AI CV Parsing:** Automatically extract skills instead of manual review.
3. **Side-by-Side Comparison:** Use `compare_applicants` to make data-driven decisions.

### For Candidates

1. **Profile Sync:** Keep your Interimed profile updated (skills, experience, software).
2. **CV Format:** Use standard formats (PDF) for best AI parsing results.
3. **Open Questions:** Be specific and detailed in text answers for higher AI scores.

---

## FIRESTORE COLLECTIONS

- `recruitment_jobs`: Job postings.
- `recruitment_applications`: Applications submitted by candidates.
- `recruitment_interviews`: Scheduled interviews.
- `recruitment_interview_feedback`: Interview notes (restricted visibility).

---

## SECURITY NOTES

1. **Feedback Visibility:** Interview feedback has `visibility: HIRING_TEAM_ONLY`. Candidates cannot see notes, scores, or strengths/weaknesses.
2. **Auto-Reject Transparency:** If auto-rejected, candidate receives generic message ("Requirements not met") without exposing internal knockout logic.
3. **Calendar Conflicts:** System prevents double-booking for interviews.

---

## FUTURE ENHANCEMENTS

- **Multi-Stage Pipelines:** Track candidates through "Applied → Screening → Interview 1 → Interview 2 → Offer".
- **Email Templates:** Auto-send rejection/acceptance emails.
- **Bulk Actions:** Archive multiple jobs or reject multiple candidates at once.
- **Offer Letters:** Generate formal offer documents within the platform.

---

**END OF RECRUITMENT MODULE GUIDE**

