# Project Implementation Documentation

## 1. Overview

This document details the architecture and implementation of the user onboarding, profile management, and workspace system for the INTERIMED platform. The platform connects healthcare professionals with facilities and also provides internal HR/team management tools for facilities. It supports distinct profile types (Professional, Facility) and distinct operational contexts (Personal Workspace, Team Workspace).

**Key System Features:**
-   **Multi-Step Onboarding Flow**: Guides new users through initial setup, personal details collection, and role selection.
-   **Dual Workspace Model**:
    * **Personal Workspace**: For individual professionals managing their marketplace presence and for facilities interacting with the marketplace.
    * **Team Workspace**: An internal HR tool for registered facilities to manage their staff, schedules, and staffing needs.
-   **Role-Based Profiles & Permissions**: Separate profile structures and granular permissions for Professionals, Facility representatives, Team Managers, and Team Employees.
-   **Configuration-Driven UI**: Profile sections, fields, and validation rules are defined in JSON configuration files.
-   **Modular Component Architecture**: React components for distinct UI sections and functionalities.
-   **Centralized Data Handling**: `useProfileData.js` hook manages Firestore interactions.
-   **Backend Logic**: Firebase Cloud Functions are envisioned for complex operations, business rule enforcement, and automated tasks.

## 2. Project File Organization (Flat Map)

This map reflects the primary frontend source code structure:


frontend/src/
├── dashboard/
│   ├── hooks/
│   │   ├── useCalendarData.js
│   │   ├── useContractsData.js
│   │   ├── useDashboardData.js
│   │   ├── useInfiniteScroll.js
│   │   ├── useMarketplaceData.js
│   │   ├── useMessagesData.js
│   │   └── useProfileData.js         <-- Core data hook for user and profile data
│   ├── layout/                       // Dashboard layout components
│   └── pages/
│       ├── calendar/                 // Calendar feature page
│       ├── contracts/                // Contracts feature page
│       ├── marketplace/              // Marketplace feature page
│       ├── messages/                 // Messaging feature page
│       ├── onboarding/
│       │   ├── OnboardingFlow.js     <-- Manages initial user setup & role selection
│       │   └── onboardingFlow.module.css <-- Styles for OnboardingFlow.js
│       ├── personalDashboard/        // User's main dashboard page (could be context-aware)
│       ├── profile/                  <-- Main profile editing (Personal & initial Facility setup)
│       │   ├── facilities/
│       │   │   ├── components/
│       │   │   │   └── FacilityDetails.js  <-- Renders facility-specific profile sections
│       │   │   └── configs/
│       │   │       └── facility-pharmacy.json
│       │   ├── professionals/
│       │   │   ├── components/
│       │   │   │   ├── PersonalDetails.js
│       │   │   │   ├── BillingInformation.js
│       │   │   │   └── DocumentUploads.js
│       │   │   ├── configs/
│       │   │   │   └── professional-doctor.json
│       │   │   ├── utils/
│       │   │   │   └── professionalBackgroundUtils.js
│       │   │   └── ProfessionalBackground.js
│       │   ├── components/                 // Shared components for Profile.js
│       │   │   └── ProfileHeader.js        <-- Tab navigation for profile sections
│       │   ├── Profile.js                  <-- Orchestrates profile display/editing
│       │   └── profile.module.css          <-- Styles for Profile.js & ProfileHeader
│       └── teamWorkspace/                <-- NEW: For internal facility team management
│           ├── components/
│           │   ├── TeamMemberManagement.js
│           │   ├── ScheduleView.js
│           │   ├── TimeOffRequestForm.js
│           │   └── ... (other team workspace specific components)
│           ├── TeamWorkspace.js            <-- Main orchestrator for a facility's team view
│           └── teamWorkspace.module.css
├── contexts/                             // React Context API
│   ├── AuthContext.js
│   └── NotificationContext.js
├── components/                           // Global, reusable UI components
│   └── ... (Buttons, Inputs, Modals etc.)
├── configs/                              // Centralized JSON configurations (alternative location)
│   ├── professionals/
│   └── facilities/
├── services/
│   └── firebase.js                     // Firebase initialization
├── locales/                              // i18n translation files
│   └── ...
└── styles/                               // Global styles or shared CSS modules
└── profileUnified.module.css       <-- Shared styles for profile section components


## 3. Onboarding Flow (`OnboardingFlow.js`)

**Location**: `/src/pages/onboarding/OnboardingFlow.js`

**Purpose**: Handles initial user setup, guiding them through essential data collection and role definition.

**Steps**:
1.  **Welcome & Verification (Placeholders)**: Standard welcome. Phone/ID verification are conceptual steps requiring external service integration.
2.  **Personal Details Collection**: Uses the `PersonalDetails.js` component with a minimal, mandatory configuration (`onboardingPersonalDetailsConfig`).
3.  **Role Choice**: User selects if they want to primarily operate as an individual "Professional" or set up/join a "Facility" (which then enables the Team Workspace for that facility).
4.  **Finalization**:
    * `useProfileData.changeUserRoleAndProfileType` updates the user's primary `role` (e.g., "professional" or "facility_admin") and a default `profileType` in `/users/{uid}`.
    * `initializeProfileDocument` ensures the appropriate Firestore documents are created (e.g., `/users/{uid}`, and `/professionalProfiles/{uid}` or `/facilityProfiles/{uid}`).
    * Collected personal details are saved. If "Facility" was chosen, this step might also involve creating the initial `FacilityProfile` document if the user is setting up a new facility.
    * User is redirected to `/dashboard/profile` to complete their newly established profile (Professional or Facility).

## 4. Workspace Concepts

### 4.1. Personal Workspace
-   This is the default context for individual professionals managing their public `professionalProfile` for marketplace visibility and direct contracting.
-   Facilities also interact with this "workspace" when they post `positions` to the marketplace or search for professionals.

### 4.2. Team Workspace (`TeamWorkspace.js`)
**Location (Conceptual):** `/src/pages/dashboard/teamWorkspace/TeamWorkspace.js`
-   An internal HR and scheduling tool for a *specific facility*.
-   Accessed by users who are members of a facility's team (defined in `facilityProfiles/{facilityId}/teamMembers`).
-   **Employee View**:
    * View assigned shifts from `teamSchedules`.
    * Submit `timeOffRequests`.
-   **Manager View** (based on `teamRoles` within the `teamMembers` document):
    * Manage the facility's `teamMembers` list.
    * Approve/reject `timeOffRequests`.
    * Create/publish `teamSchedules` (potentially using a "smart matching" algorithm planned for future development).
    * Handle staffing gaps:
        * **Subletting**: Identify overstaffed periods from `teamSchedules` and potentially offer these employees/shifts to other facilities (requires a clear workflow and possibly marketplace integration).
        * **Hiring**: Create `positions` in the public marketplace when understaffed.
-   Users with manager `teamRoles` can also perform "employee" actions for themselves (e.g., submit their own `timeOffRequests`).

## 5. Profile Management System (`Profile.js`)

**Location**: `/src/pages/dashboard/profile/Profile.js`

This component handles the detailed completion and editing of either a `ProfessionalProfile` or the initial setup/editing of a `FacilityProfile`.

**Functionality**:
-   Loads the appropriate JSON configuration based on `initialProfileData.role` ("professional" or "facility") and `initialProfileData.profileType`.
-   Uses `ProfileHeader.js` to render tabs defined in the config.
-   Dynamically renders section components (e.g., `PersonalDetails.js`, `ProfessionalBackground.js` for professionals; `FacilityDetails.js` for facilities).
-   `FacilityDetails.js` itself is an orchestrator for sub-sections defined in its config (e.g., Core Info, Legal/Billing, Facility Documents).
-   Manages `formData`, validation, and saving through `useProfileData`.

## 6. Data Management Hook (`useProfileData.js`)

**Location**: `/src/dashboard/hooks/useProfileData.js`

The central hook for all Firestore interactions.
-   **`WorkspaceProfileData()`**: Retrieves and merges data from `/users/{uid}` and the relevant role-specific profile (`professionalProfiles/{uid}` or `facilityProfiles/{uid}`).
-   **`updateProfileData(dataToSave)`**: Splits data and saves to `/users/{uid}` and the role-specific profile.
-   **`initializeProfileDocument(role, profileType)`**: Ensures user and role-specific profile documents exist. Crucial for setting up new users or when a user first creates/joins a facility.
-   **`changeUserRoleAndProfileType(newRole, newProfileType)`**: Updates user's role/type in `/users/{uid}` and calls `initializeProfileDocument`.

## 7. Firestore Data Structure (Key Collections Updated/Added)

* **`users`**:
    * `/{userId}`
        * `roles`: Array (e.g., ["professional", "facility_admin_facilityId1", "employee_facilityId1"]) - *Roles can be more specific, linking to facility IDs directly for clarity in rules.*
        * `professionalProfileId`: String (ID to `professionalProfiles` document)
        * `teamMemberships`: Array of objects for quick client-side determination of team access (e.g., `{ facilityProfileId: "facility123", teamRole: "manager" }`). *Authoritative membership is in `facilityProfiles`.*
        * *(Other fields as previously defined: email, names, photoURL, onboardingStatus, etc.)*

* **`professionalProfiles`**:
    * `/{professionalProfileId}` (Often same as `userId`)
        * `userId`: String
        * `profileType`: String (e.g., "doctor", "nurse")
        * *(Detailed professional fields like identity, contact, employmentEligibility, professionalDetails, payrollData, banking, platformSettings, verification, as per previous detailed breakdown [cite: 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74])*

* **`facilityProfiles`**: (This becomes the "Team" entity)
    * `/{facilityProfileId}`
        * `facilityName`: String
        * `profileType`: String (e.g., "pharmacy", "clinic")
        * `identityLegal`: Map [cite: 7, 8, 9, 10, 11, 12, 13]
        * `contactPoints`: Map [cite: 15, 16, 17, 18]
        * `profilePublic`: Map [cite: 19, 20, 21, 22, 23]
        * `operationalEnvironment`: Map (Defines how the facility operates, including software, labor agreements, work hours/model, remote policy) [cite: 25, 26, 27, 28, 29, 30]
        * `recruitmentAndContracts`: Map (Hiring process, contract standards) [cite: 32, 33, 34, 35, 36, 37]
        * `payrollAndComplianceInfo`: Map (Employer's payroll obligations setup) [cite: 39, 40, 41, 42, 43, 44]
        * `platformAccountAndBilling`: Map (Facility's account with your platform) [cite: 46, 47, 48]
        * `verification`: Map (Platform verification of the facility) [cite: 50, 51, 52, 53]
        * **`teamMembers` (Subcollection)**: Authoritative list of team members.
            * `/{userId}`
                * `displayName`: String (Denormalized)
                * `photoURL`: String (Denormalized)
                * `professionalProfileId`: String (Optional, link to their public profile)
                * `teamRoles`: Array (Permissions within *this* facility's Team Workspace, e.g., ["manager", "scheduler"], ["employee"])
                * `jobTitle`: String
                * `employmentType`: String (e.g., "full_time", "part_time")
                * `skills`: Array (Optional, team-specific skills)
                * `isActiveInTeam`: Boolean
                * `joinedDate`: Timestamp
        * **`operationalSettings` (Map)**: Settings for the Team Workspace.
            * `standardOpeningHours`: Object (e.g., `{ mon: "08:00-18:00", ... }`)
            * `minStaffPerShiftType`: Object (e.g., `{ pharmacist_day: 2, technician_day: 1 }`)
            * `timeOffApprovalWorkflow`: String

* **`timeOffRequests` (NEW)**:
    * `/{timeOffRequestId}`
        * `facilityProfileId`: String (Team context)
        * `userId`: String (Employee)
        * `startTime`: Timestamp
        * `endTime`: Timestamp
        * `type`: String (e.g., "vacation", "sick_paid", "training")
        * `status`: String ("pending", "approved", "rejected")
        * *(Other fields: reason, managerNotes, approvedByUserId, etc.)*

* **`teamSchedules` (NEW)**:
    * `/{scheduleId}` (e.g., `facilityProfileId_YYYY-MM`)
        * `facilityProfileId`: String
        * `periodStartDate`: Timestamp
        * `periodEndDate`: Timestamp
        * `status`: String ("draft", "published")
        * **Subcollection `shifts`**:
            * `/{shiftId}`
                * `userId`: String (Assigned team member)
                * `startTime`: Timestamp
                * `endTime`: Timestamp
                * `roleOrTask`: String
                * `isSublettable`: Boolean
                * `subletStatus`: String (e.g., "available_for_sublet", "confirmed")
                * `subletToFacilityId`: String (Optional)

* **`professionalAvailabilities` (Marketplace)**:
    * `/{availabilityId}`
        * *(Fields as defined previously [cite: 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94])*.
        * **Integration Point**: Approved `timeOffRequests` from a team should block out corresponding times here if the professional is also on the marketplace. This likely requires a Cloud Function.

* **`employerNeeds` / `positions` (Marketplace)**:
    * `/{positionId}` (Name changed from `employerNeeds` to `positions` for clarity)
        * *(Fields as defined previously, e.g., `facilityProfileId` (formerly `employerProfileId`), `jobTitle`, `startTime`, `endTime`, etc. [cite: 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112])*.
        * Facility managers use this (from their Team Workspace or directly via Facility Profile) to post public needs when hiring externally.

* **`contracts`**:
    * `/{contractId}`
        * *(Fields as defined previously, for marketplace engagements [cite: 75, 76, 77, 78, 79, 80, 81])*.
        * **Integration Point**: May need a new contract type or adaptation for "subletting" scenarios, defining terms between the lending facility, the borrowing facility, and the professional.

* **`conversations` / `messages`**:
    * *(As previously defined)*. Messaging can occur between users, user-facility (for marketplace positions/contracts), or potentially user-manager within a team context.

## 8. Backend Logic (Conceptual - Firebase Cloud Functions)

While the UI is advanced and client-side hooks manage direct Firebase interactions, more complex operations, business rule enforcement, and automated tasks will require Firebase Cloud Functions:

* **User Management**: `onUserCreate` (Auth Trigger) for initial user document setup.
* **Team Workspace Logic**:
    * Processing `timeOffRequests` (approval/rejection workflows, notifications).
    * `syncAvailabilityWithTimeOff`: Firestore Trigger to update a professional's marketplace `availabilities` when a team `timeOffRequest` is approved.
    * `generateTeamSchedule`: HTTPS Callable Function for the (future) "smart matching" scheduling algorithm. Publishes to `teamSchedules`.
    * Managing `teamMembers` (invitations, role changes).
* **Marketplace & Contracts**:
    * Application management for `positions`.
    * Contract lifecycle management (initiation, acceptance, status changes).
    * Logic for "subletting" if it involves creating temporary marketplace availabilities or specific contract types.
* **Notifications**: Using FCM via Firestore Triggers on relevant data changes (new messages, contract updates, time-off status changes, schedule publications, new marketplace positions matching criteria).
* **Scheduled Tasks** (via Cloud Scheduler & Pub/Sub): Reminders, data cleanup/archival, report generation.

## 9. Styling

-   **CSS Modules**: Primary approach for component-level styling.
    -   `profile.module.css`: Styles the main `Profile.js` orchestrator and its `ProfileHeader.js`.
    -   `profileUnified.module.css`: Shared styles for common elements across all profile *section* components (e.g., `PersonalDetails.js`, `FacilityDetails.js`, inputs, buttons within these sections).
    -   `onboardingFlow.module.css`: Specific to the `OnboardingFlow.js` component.
    -   `teamWorkspace.module.css` (New): Specific styles for the `TeamWorkspace.js` orchestrator and its internal components.
-   **CSS Variables**: Used globally for theming (colors, fonts, spacing).

## 10. Key Challenges & Considerations for Team Workspace

-   **"Smart" Scheduling Algorithm**: This is a complex AI/operations research problem. Start with manual/template-based scheduling, then iterate.
-   **Availability Synchronization**: Ensuring consistency between an employee's internal team schedule/time-off and their public marketplace availability is critical and best handled by backend functions.
-   **Subletting Workflow**: Define clear processes, consent mechanisms, and contractual/payment models for subletting employees.
-   **Permissions within Teams**: Granular control over what managers vs. employees can see and do within a specific Team Workspace (enforced by Firestore Security Rules and Cloud Functions).
-   **User Experience for Workspace Switching**: If a user is part of multiple teams or has a professional profile, the UI must allow easy context switching.

This updated documentation reflects the dual-workspace model and provides a more comprehensive view of the system architecture and data organization.