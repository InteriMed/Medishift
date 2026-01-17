# InteriMed Profile System Documentation (Refactored)

## 1. Overview

The InteriMed Profile System allows users (Healthcare Professionals and Employers) to create, manage, and complete their profiles. The system is built with React and uses Firebase (Firestore) for data persistence and Firebase Authentication.

This document outlines the data structure, core components, hooks, key functions, and overall workflows of the refactored system, which emphasizes centralized state management for improved data consistency and maintainability.

## 2. Data Structure (Firestore)

The system utilizes a split data model in Firestore to efficiently store and manage user information:

### 2.1. `users` Collection
   - Stores basic authentication-related user information and core metadata.
   - Each document ID is the User's UID from Firebase Authentication.
   - **Key Fields**:
     - `uid`: User ID (string, matches Auth UID)
     - `email`: User's primary email address (string)
     - `displayName`: User's display name (string, optional)
     - `firstName`: User's legal first name (string, for quick reference)
     - `lastName`: User's legal last name (string, for quick reference)
     - `photoURL`: URL to the user's profile picture (string, optional)
     - `emailVerified`: Boolean indicating if the primary email is verified.
     - `role`: User's role (e.g., "professional", "employer") (string)
     - `profileCompletionPercentage`: Calculated percentage of profile completeness (number)
     - `createdAt`: Timestamp of account creation.
     - `updatedAt`: Timestamp of the last update to this user document.

### 2.2. Role-Specific Profile Collections
   - Store detailed profile information specific to the user's role.
   - Each document ID is also the User's UID.
   - Collections:
     - `professionalProfiles`: For Healthcare Professionals.
     - `employerProfiles`: For Employers/Companies (schema may vary).
   - **Data Principle**: These collections store the bulk of the profile information. The system aims for a **flattened structure for fields within these profile documents where feasible**, as indicated in the original design principles. This means individual preference fields (like notification settings) are stored as top-level fields in the profile document rather than deeply nested objects, unless a nested structure is inherently part of the data (e.g., `residentialAddress`, `desiredWorkPercentage`).

### 2.3. Field Structure Example (within a `professionalProfiles` document)
   - **Account Basics related (Profile Specific)**:
     - `emailNotifications` (boolean)
     - `smsNotifications` (boolean)
     - `pushNotifications` (boolean)
     - `profileVisibility` (string, e.g., "public", "private")
     - `twoFactorEnabled` (boolean)
     - `contactEmail` (string, preferred contact email, might differ from auth email)
     - `contactPhone` (string)
     - `contactPhonePrefix` (string)
   - **Personal Details**:
     - `legalFirstName` (string) - *Note: Also in `users` collection for quick display needs.*
     - `legalLastName` (string) - *Note: Also in `users` collection.*
     - `dateOfBirth` (string, e.g., ISO date "YYYY-MM-DD")
     - `nationality` (string, e.g., country code)
     - `residentialAddress`: Object containing `street`, `number`, `postalCode`, `city`, `canton`.
   - **Professional Background**:
     - `education`: Array of objects (each with `degree`, `field`, `institution`, `graduationDate`, `currentlyStudying`)
     - `workExperience`: Array of objects (each with `position`, `company`, `location`, `startDate`, `endDate`, `current`, `description`)
     - `licensesCertifications`: Array of objects (each with `name`, `issuingBody`, `licenseNumber`, `issuedDate`, `expiryDate`, `validForLife`)
     - `professionalMemberships`: Array of objects (each with `organization`, `membershipType`, `memberSince`)
     - `volunteering`: Array of objects (similar structure to work experience)
     - `skills`: Array of strings or objects.
   - **Billing Information**:
     - `iban` (string)
     - `bankName` (string)
     - `accountHolder` (string)
     - `avsNumber` (string)
     - `residencyPermit` (string, e.g., permit type or "swiss")
     - `taxationLocation` (string)
     - `sameAsResidential` (boolean, for billing address)
     - `billingAddress`: Object (if different from residential)
     - `residencePermit`: Object (if not Swiss, e.g., `{ type: 'B', expiryDate: 'YYYY-MM-DD' }`)
     - `familyAllocation` (string)
     - `numberOfChildren` (number)
     - `spouse`: Object containing spouse details (conditional).
   - **Job Preferences**:
     - `availabilityStatus` (string)
     - `desiredWorkPercentage`: Object (`{ min: number, max: number }`)
     - `preferredWorkRadiusKm` (number)
     - `willingToRelocate` (boolean)
     - `targetHourlyRate`: Object (`{ min: number, max: number }`)
     - `preferredShifts`: Array of strings.
     - `currentWorkPercentage` (number)
     - `jobPreferencesContactEmail` (string)
   - **Document Uploads**:
     - `cvUrl` (string)
     - `diplomaUrls`: Array of strings (URLs)
     - `licenseUrls`: Array of strings (URLs)
     - `workPermitUrl` (string)
     - `referenceLetterUrls`: Array of strings (URLs)
     - `otherDocumentUrls`: Array of strings (URLs)
   - **Timestamps**:
     - `createdAt`: Timestamp of profile creation.
     - `updatedAt`: Timestamp of last profile update.
     - `userId`: User UID (string, for reference).

## 3. Core Components (JavaScript Files)

The profile system is structured around a main `Profile.js` component that orchestrates various sub-components, each representing a tab or section of the profile.

### 3.1. `Profile.js`
   - **Role**: The central container for the entire user profile interface.
   - **Responsibilities**:
     - Orchestrates the display of different profile sections (tabs).
     - Manages the **centralized `formData` state** for the entire profile. This object holds all data being edited.
     - Fetches initial profile data using the `useProfileData` hook.
     - Handles saving the entire `formData` to Firestore via `useProfileData`.
     - Manages global UI states like `isLoading`, `isSubmitting`, and `errors` (for form-wide or specific field errors).
     - Provides updater functions (e.g., `onInputChange`, `onAddressChange`, `onArrayChange`, `onNestedInputChange`) as props to child tab components to modify the central `formData`.
     - Implements overall form validation (`validateCurrentTabData`) before allowing navigation or final submission.
     - Manages tab navigation logic, including prompting for unsaved changes.
     - Calculates and displays profile completeness, managing the onboarding flow.
     - Exports helper functions like `isTabCompleted`, `isTabAccessible`, and `calculateProfileCompleteness`.

### 3.2. `ProfileHeader.js`
   - **Role**: Displays user summary information (name, email, profile picture, role) and the tab navigation bar.
   - **Interaction**:
     - Receives `profile` (the `formData` from `Profile.js`), `activeTab`, `onTabChange` callback, `isOnboarding` status, and `profileCompleteness` as props.
     - Uses `isTabCompleted` and `isTabAccessible` (imported from `Profile.js` or a utility) to style tabs and control their interactivity.
     - Does NOT fetch data itself; relies on props from `Profile.js`.

### 3.3. Tab Components
   These components represent individual sections/tabs of the profile. They are now primarily presentational, receiving data and callbacks from `Profile.js`.
   - **General Pattern**:
     - Receive a slice of `formData` relevant to their section (or the whole `formData` and they pick what they need).
     - Receive specific updater functions from `Profile.js` (e.g., `onInputChange`, `onAddressChange`) to propagate changes back to the central `formData`.
     - Receive an `errors` object containing validation errors relevant to their fields.
     - Receive `isSubmitting`, `onSaveAndContinue`, `onCancel`, and `isOnboarding` props.
     - Do NOT manage their own duplicate `formData` state for profile data.
     - Do NOT call `useProfileData` directly.
     - May contain local UI state for internal component needs (e.g., visibility of an "add item" form).

   - **Specific Tab Components**:
     - **`AccountBasics.js`**: Manages email display, password change, notification preferences, privacy settings, and account deletion. Password change and account deletion involve direct Firebase Auth calls and thus manage some local state for these operations.
     - **`PersonalDetails.js`**: Manages legal name, date of birth, nationality, residential address, and contact information.
     - **`ProfessionalBackground.js`**: Manages lists of education, work experience, licenses/certifications, memberships, and volunteering. It includes local state and forms for adding/editing these list items before updating the main array in `Profile.js` via `onArrayChange`.
     - **`BillingInformation.js`**: Manages banking details, insurance, AVS number, billing address, and residency/permit information.
     - **`JobPreferences.js`**: Manages availability, desired work parameters (percentage, radius), compensation expectations, and relocation willingness.
     - **`DocumentUploads.js`**: Manages uploading and displaying links to CVs, diplomas, licenses, etc. It interacts with a file upload service and updates URLs in `Profile.js`'s `formData` via `onInputChange` (for single files) or `onArrayChange` (for multiple files of the same type).

### 3.4. Input Components
   - e.g., `Personnalized-InputField.js`, `DropdownField.js`, `DropdownDate.js`, `CheckboxField.js`, `Switch.js`, `Slider.js`, `UploadFile.js`.
   - These are reusable UI components for various input types.
   - They receive `value`, `onChange` callbacks, `error` messages, and `onErrorReset` callbacks from their parent tab components.

## 4. Hooks

### 4.1. `useProfileData.js`
   - **Role**: Custom hook responsible for all interactions with Firestore regarding profile data.
   - **Key Functions**:
     - `WorkspaceProfileData()`: Fetches data from both `/users/{uid}` and the relevant role-specific profile collection (`/professionalProfiles/{uid}` or `/employerProfiles/{uid}`), merges them, and returns the combined data. Also updates the hook's internal `profileData` state.
     - `updateProfileData(data)`:
       - Accepts the complete `formData` object from `Profile.js`.
       - Uses `cleanData()` to remove empty/default values.
       - Uses `prepareDataForUpdate()` to separate the cleaned data into `userFields` (based on `USER_COLLECTION_FIELDS` constant) and `profileFields`.
       - Updates the `/users/{uid}` document with `userFields`.
       - Updates or creates the document in the role-specific profile collection with `profileFields`.
       - Handles timestamps (`createdAt`, `updatedAt`).
     - `refreshProfileData()`: A wrapper around `WorkspaceProfileData` to re-fetch data.
     - `updateUserRole(role)`: Updates the user's role in the `/users/{uid}` document.
   - **State**: Manages `profileData` (the fetched data), `isLoading`, and `error` states.
   - **`USER_COLLECTION_FIELDS`**: A crucial constant within this hook defining which fields belong to the primary `users` collection.

### 4.2. `useAuth()` (from `AuthContext`)
   - Provides the `currentUser` object (from Firebase Authentication), which includes the `uid` necessary for all data operations.

### 4.3. `useNotification()` (from `NotificationContext`)
   - Provides a `showNotification` function used to display success or error messages to the user.

## 5. Key Functions & Logic (Centralized in `Profile.js`)

### 5.1. State Management
   - `formData` (object): Holds the entire profile data being edited. Initialized from `useProfileData` and updated by child components via prop functions.
   - `originalData` (ref): Stores a snapshot of `formData` when loaded, used for "cancel" functionality.
   - `errors` (object): Stores validation errors for various fields.
   - `isSubmitting` (boolean): Tracks if a save operation is in progress.
   - `activeTab` (string): Tracks the currently active profile tab.
   - `isFormModified` (boolean): Tracks if `formData` has changed from `originalData`.

### 5.2. Updater Functions (Props for Children)
   - `onInputChange(fieldName, value)`: Updates a top-level field in `formData`.
   - `onAddressChange(addressFieldName, value)`: Updates a field within `formData.residentialAddress` (or other address objects).
   - `onNestedInputChange(sectionName, fieldName, value)`: Updates a field within a generic nested object in `formData` (e.g., `formData.desiredWorkPercentage.min`).
   - `onArrayChange(arrayName, newArray)`: Replaces an entire array in `formData` (e.g., `formData.education`). Used by `ProfessionalBackground.js`.
   - `setErrors(errorsUpdater)`: Allows child components (or `Profile.js` itself) to update the `errors` state, typically to clear an error for a specific field on user interaction.

### 5.3. Validation
   - `validateCurrentTabData()`: Called before saving or navigating away from a tab with changes. Contains tab-specific validation rules. Sets the `errors` state.
   - Individual input components might also display errors passed via props and trigger an `onErrorReset` callback.

### 5.4. Tab Logic & Navigation
   - `isTabCompleted(profileData, tabId)`: Determines if a tab's required fields are filled.
   - `isTabAccessible(profileData, tabId)`: Determines if a tab can be accessed based on the completion of prerequisite tabs.
   - `calculateProfileCompleteness(profileData)`: Calculates overall profile completion percentage.
   - `handleTabChange(tabId)`: Handles tab switching, prompts for unsaved changes if `isFormModified` is true. Uses `react-router-dom`'s `Maps` function.

### 5.5. Data Flow for Saving
   1. User clicks "Save and Continue" or "Save" in a tab component.
   2. The tab component calls its `onSaveAndContinue()` or `onSave()` prop, which are typically bound to `handleSaveAndContinue()` or `handleSave()` in `Profile.js`.
   3. `Profile.js`'s `handleSave()` is invoked:
      a. Calls `validateCurrentTabData()`.
      b. If valid (for navigation) or always (for just saving, as per original docs), sets `isSubmitting` to true.
      c. Calls `updateProfileData(formData)` from the `useProfileData` hook.
      d. `useProfileData` cleans the data, separates it, and writes to Firestore.
      e. On success, `Profile.js` calls `refreshProfileData()` to get the latest data, updates its `formData` and `originalData`, clears `isFormModified`, and shows a success notification. Then, if navigating, it proceeds.
      f. On failure, an error notification is shown.
      g. Sets `isSubmitting` to false.

## 6. Overall Workflows

### 6.1. Loading Profile
   1. `Profile.js` mounts.
   2. `useProfileData` hook is called, `isLoading` is true.
   3. `WorkspaceProfileData` is triggered, gets `currentUser`.
   4. Data is fetched from Firestore (`users` and role-specific profile collection).
   5. Data is merged and set in `useProfileData`'s `profileData` state. `isLoading` becomes false.
   6. `Profile.js` receives `initialProfileData` (from the hook's `profileData`), initializes its own `formData` and `originalData`.
   7. UI renders with the loaded data.

### 6.2. Editing a Profile Section
   1. User interacts with an input field in a tab component (e.g., `PersonalDetails.js`).
   2. The input field's `onChange` calls the specific updater prop from `Profile.js` (e.g., `onInputChange('legalFirstName', 'NewName')`).
   3. `Profile.js` updates its central `formData` state.
   4. React re-renders relevant components. `isFormModified` in `Profile.js` becomes true.

### 6.3. Cancelling Changes
   1. User clicks "Cancel" in a tab component.
   2. `Profile.js`'s `handleCancelChanges()` is called.
   3. If `isFormModified` is true, a confirmation dialog is shown.
   4. If confirmed, `formData` is reset to `originalData.current`, `isFormModified` is set to false, and errors are cleared.

### 6.4. Onboarding
   - The `isOnboarding` prop (derived from `profileCompleteness < 100%`) controls UI elements like prompts and progress display.
   - Tab accessibility (`isTabAccessible`) enforces a sequential completion flow during onboarding.
   - "Save and Continue" buttons facilitate moving to the next required section.

## 7. Form Modification Tracking (Cookie-based - Optional)

The original system described using cookies (`modifiedFields`, `tabCompletionStatus`) for tracking. In the refactored system with centralized state:
- `isFormModified` state in `Profile.js` (comparing `formData` to `originalData.current`) is the primary mechanism for detecting unsaved changes within a session.
- Cookie-based tracking can still be implemented for persistence across sessions/reloads if desired, using utility functions like `trackModifiedField` and `clearModifiedFields` (which might be exported from `Profile.js` or a utility file). This was part of the original `Profile.js` and can be maintained if needed.
- Tab completion status for visual indicators in `ProfileHeader.js` relies on `isTabCompleted` function.

## 8. Best Practices (Summary from Original Documentation - Still Apply)
1.  **Avoid Duplication**: Centralized `formData` helps achieve this at the component level. Firestore structure also aims for this.
2.  **Minimize Database Writes**: `useProfileData`'s `cleanData` helps by not writing empty values. Only changed data (implicitly, by passing the whole `formData` but Firestore SDKs often handle minimal writes) is sent.
3.  **Handle Empty Values**: `cleanData` ensures empty strings, objects, and arrays are handled gracefully.
4.  **Maintain Data Integrity**: Timestamps and consistent UID usage are key.
5.  **Form State Management**: Centralized state in `Profile.js` simplifies this. Validation is performed before critical actions.

This refactored architecture provides a more robust and maintainable system for managing user profiles.