# Project Implementation Documentation

## 1. Overview

This document details the architecture and implementation of the user onboarding and profile management system for the INTERIMED platform. The platform facilitates connections between healthcare professionals and facilities, featuring distinct profile structures and a configuration-driven UI to cater to different user roles (Professional, Facility) and types (e.g., Doctor, Pharmacy).

**Key System Features:**
-   **Multi-Step Onboarding Flow**: Guides new users through verification (placeholder), initial data collection (Personal Details), and role selection.
-   **Role-Based Profiles**: Separate profile structures and editing flows for "Professionals" and "Facilities".
-   **Configuration-Driven UI**: Profile sections, fields, validation rules, and tab navigation are defined in JSON configuration files, allowing dynamic rendering and easier modification of profile structures per role/type.
-   **Modular Component Architecture**: React components for distinct UI sections (e.g., `PersonalDetails`, `FacilityDetails`), core functionalities (e.g., `OnboardingFlow`, `Profile`), and data handling (`useProfileData`).
-   **Centralized Data Handling**: A custom React hook (`useProfileData.js`) manages all Firestore interactions for user and profile data.
-   **Scoped Styling**: CSS Modules are used for component-specific and shared styles to prevent naming conflicts and improve maintainability.

## 2. Project File Organization (Flat Map)

This map reflects the primary frontend source code structure for the dashboard and profile features:



frontend/src/
├── dashboard/
│ ├── hooks/
│ │ ├── useCalendarData.js
│ │ ├── useContractsData.js
│ │ ├── useDashboardData.js
│ │ ├── useInfiniteScroll.js // Note: filename in image is useinfinite Scroll.js
│ │ ├── useMarketplaceData.js
│ │ ├── useMessagesData.js
│ │ └── useProfileData.js <-- Core data hook for user and profile data
│ ├── layout/ // Dashboard layout components
│ └── pages/
│ ├── calendar/ // Calendar feature page
│ ├── contracts/ // Contracts feature page
│ ├── marketplace/ // Marketplace feature page
│ ├── messages/ // Messaging feature page
│ ├── onboarding/
│ │ ├── OnboardingFlow.js <-- Manages the multi-step initial user setup
│ │ └── onboardingFlow.module.css <-- Styles for OnboardingFlow.js
│ ├── personalDashboard/ // User's main dashboard page
│ └── profile/ <-- Main profile editing and management area
│ ├── facilities/
│ │ ├── components/
│ │ │ └── FacilityDetails.js <-- Renders facility-specific profile sections
│ │ └── configs/
│ │ └── facility-pharmacy.json <-- Example JSON config for a "pharmacy" facility type
│ ├── professionals/
│ │ ├── components/
│ │ │ ├── PersonalDetails.js
│ │ │ ├── BillingInformation.js
│ │ │ └── DocumentUploads.js
│ │ ├── configs/
│ │ │ └── professional-doctor.json <-- Example JSON config for a "doctor" professional type
│ │ ├── utils/
│ │ │ └── professionalBackgroundUtils.js <-- Helpers for ProfessionalBackground.js
│ │ └── ProfessionalBackground.js
│ ├── components/ <-- Shared components used by Profile.js orchestrator
│ │ └── ProfileHeader.js <-- Renders the tab navigation for profile sections
│ ├── Profile.js <-- Orchestrates profile display/editing based on role/type
│ └── profile.module.css <-- Styles for Profile.js page layout and ProfileHeader.js
├── contexts/ // React Context API for global state
│ ├── AuthContext.js
│ └── NotificationContext.js
├── components/ // Global, reusable UI components
│ ├── BoxedInputFields/ // Custom input field components
│ │ ├── Button.js
│ │ ├── Personnalized-InputField.js // Note: Typo in "Personnalized"
│ │ ├── Dropdown-Field.js
│ │ └── ... (other input types like DropdownDate, CheckboxField, Slider, TextareaField, UploadFile)
│ ├── LoadingSpinner/
│ └── Dialog/
├── configs/ // Top-level configuration directory (alternative to nested)
│ ├── professionals/ // Contains all professional type JSON configs
│ │ └── professional-doctor.json
│ └── facilities/ // Contains all facility type JSON configs
│ └── facility-pharmacy.json
├── services/
│ └── firebase.js // Firebase initialization and core services
├── locales/ // Internationalization (i18n) files
│ ├── en/ // English translations
│ │ ├── common.json
│ │ ├── dashboardProfile.json
│ │ ├── onboarding.json
│ │ ├── validation.json
│ │ ├── tabs.json
│ │ └── dropdowns.json // Options for dropdown menus
│ └── ... (other languages, e.g., fr/)
└── styles/ // Global styles or shared CSS modules
└── profileUnified.module.css <-- Shared CSS module for common styling across profile section components
## 3. Onboarding Flow (`OnboardingFlow.js`)

**Location**: `/src/pages/onboarding/OnboardingFlow.js`

**Purpose**:
This component manages the initial user setup process. It guides new users (or users who haven't completed this flow) through essential steps before they can fully access and manage their detailed profile.

**Key Steps**:
1.  **Welcome & Verification (Placeholders)**:
    * Displays a welcome message and introductory information.
    * Includes UI elements for phone number and ID verification. Currently, these are placeholders and would require integration with actual verification services or backend processes.
2.  **Personal Details Collection**:
    * Renders the `PersonalDetails.js` component (reused from the professionals' section for this initial data capture).
    * Uses a minimal, hardcoded configuration (`onboardingPersonalDetailsConfig` defined within `OnboardingFlow.js`) which mandates all fields in `PersonalDetails` as required for this step.
    * Collected data is validated and temporarily stored in the `OnboardingFlow.js` component's state (`collectedPersonalDetails`).
3.  **Role Choice**:
    * Prompts the user to select their primary role on the platform: "Professional" (intending to offer services) or "Facility" (representing an organization seeking professionals).
4.  **Finalization & Redirection**:
    * Upon role selection:
        * `useProfileData.changeUserRoleAndProfileType` is invoked. This critical function:
            * Updates the user's `role` (e.g., "professional" or "facility") in their `/users/{uid}` Firestore document.
            * Assigns a default `profileType` based on the chosen role (e.g., "doctor" for professional, "pharmacy" for facility).
            * Calls `initializeProfileDocument` to ensure the corresponding role-specific profile document (e.g., `/professionalProfiles/{uid}` or `/facilityProfiles/{uid}`) is created in Firestore with any necessary default structure.
        * The `collectedPersonalDetails` are then merged with the (potentially newly initialized) user data.
        * `useProfileData.updateProfileData` saves this comprehensive initial data. This function intelligently distributes fields: core user information (like name, if it's part of `USER_COLLECTION_FIELDS`) goes to `/users/{uid}`, while the rest (including all personal details) goes to the role-specific profile document.
        * An `onboardingStatus: 'completed'` flag (or similar) is set in the user's document in `/users/{uid}`.
    * The user is then redirected to the main profile editing page (`/dashboard/profile`).

**Styling**: Uses `onboardingFlow.module.css` for its specific layout, progress bar, and step presentation.

## 4. Profile Management System

This system allows users to complete, view, and edit their detailed profiles after the initial onboarding.

### 4.1. Main Orchestrator (`Profile.js`)

**Location**: `/src/pages/dashboard/profile/Profile.js`

**Core Responsibilities**:
-   **Role and Type Determination**: Fetches the user's `role` (Professional/Facility) and `profileType` (Doctor/Pharmacy, etc.) from `useProfileData`. This information is crucial for loading the correct UI and configuration.
-   **Dynamic Configuration Loading**:
    * Based on the user's role and type, it dynamically imports the appropriate JSON configuration file.
        * Professional configs: `/src/configs/professionals/professional-<type>.json`
        * Facility configs: `/src/configs/facilities/facility-<type>.json`
    * It also resolves `dropdownOptions` specified in the config by fetching corresponding data from i18n translation files (e.g., `locales:dropdowns.countries` points to the countries list in `dropdowns.json`).
-   **Tabbed Navigation**:
    * Renders the `ProfileHeader.js` component.
    * Displays navigation tabs as defined in the `tabs` array of the loaded configuration file.
    * Manages the `activeTab` state, synchronizing it with the URL.
    * Handles navigation between tabs, including checks for unsaved changes (prompting the user if necessary) and tab accessibility (using helper functions `isTabCompleted`, `isTabAccessible` which evaluate rules from the config).
-   **Dynamic Section Rendering**:
    * Based on the `activeTab` and the user's `role`, it lazy-loads and renders the corresponding section component.
        * **Professional Role**: `PersonalDetails.js`, `ProfessionalBackground.js`, `ProfessionalBillingInformation.js`, `ProfessionalDocumentUploads.js`.
        * **Facility Role**: Primarily `FacilityDetails.js`. The `FacilityDetails` component itself is designed to handle multiple sub-sections (like "Facility Core Details", "Legal & Billing") based on the `activeTab` prop it receives, which corresponds to a tab ID defined in the facility's configuration file. Document uploads for facilities might be a separate top-level tab (reusing `ProfessionalDocumentUploads.js` or a specific `FacilityDocumentUploads.js`) or a sub-section within `FacilityDetails.js`.
    * Passes necessary props (`formData`, the loaded `config`, `errors`, event handlers like `onInputChange`, `onArrayChange`, `onSaveAndContinue`, `onCancel`, and utility `getNestedValue`) to the active section component.
-   **State and Data Handling**:
    * Manages the main `formData` object for the entire profile being edited.
    * Maintains an `errors` object for displaying validation messages.
    * Tracks `isSubmitting` state for save operations.
    * Uses `originalData.current` (a ref) to store a snapshot of the data for detecting changes and enabling "cancel" functionality.
-   **Data Validation**:
    * Before saving or allowing navigation to a new tab (if changes are made), it validates the data in the current `activeTab` against rules defined in the loaded configuration file (e.g., `required` fields, `validationRules` like patterns or min/max lengths, `minItems` for list sections).
-   **Data Persistence**:
    * Uses `useProfileData.updateProfileData` to save the `formData` to Firestore.
-   **Profile Completion UI**:
    * Displays a header (e.g., `.onboardingHeader` or `.mainProfileHeader` from `profile.module.css`) indicating the profile's completeness percentage (calculated using `calculateProfileCompleteness` based on the config).
    * This provides users with a visual guide if their profile is not yet 100% complete according to the requirements of their specific profile type.

### 4.2. Data Management Hook (`useProfileData.js`)

**Location**: `/src/dashboard/hooks/useProfileData.js`

This custom React hook centralizes all Firestore database interactions related to user and profile data.

**Key Functions**:
-   **`fetchProfileData()`**: Retrieves the user document from `/users/{uid}`. Based on the `role` field in this document, it then fetches the corresponding role-specific profile data from either `/professionalProfiles/{uid}` or `/facilityProfiles/{uid}`. It merges these two data sources before returning. Handles Firestore Timestamps conversion to JS Dates.
-   **`updateProfileData(dataToSave)`**:
    * Takes the complete `formData` from `Profile.js`.
    * Intelligently splits the data: fields listed in `USER_COLLECTION_FIELDS` (a constant within the hook, e.g., `email`, `firstName`, `lastName`, `role`, `profileType`) are saved to the `/users/{uid}` document.
    * All other fields are saved to the appropriate role-specific profile document (`/professionalProfiles/{uid}` or `/facilityProfiles/{uid}`).
    * Automatically handles `createdAt` (on new document creation) and `updatedAt` (on every update) Firestore Timestamps.
    * Uses `setDoc` with `{ merge: true }` for profile documents to avoid overwriting unrelated fields.
-   **`initializeProfileDocument(role, profileType)`**:
    * Called during onboarding or if a user's profile documents are missing.
    * Ensures the user document in `/users/{uid}` exists and has the correct `role` and `profileType`.
    * Ensures the corresponding role-specific profile document (e.g., `/professionalProfiles/{uid}`) exists, creating it with minimal default values if it doesn't.
-   **`changeUserRoleAndProfileType(newRole, newProfileType)`**:
    * Updates the `role` and `profileType` fields in the `/users/{uid}` document.
    * Crucially, after updating, it calls `initializeProfileDocument` to ensure the correct profile structure for the *new* role/type is created or available.
    * Used by `OnboardingFlow.js` when the user makes their role selection.
-   **`uploadProfilePicture(file)`**: An example utility function demonstrating how to upload an image (e.g., user's avatar) to Firebase Storage and then update the `photoURL` field in the `/users/{uid}` document. (Note: Document uploads for profile sections are handled within the `DocumentUploads.js` component).
-   Manages `isLoading` and `error` states for data operations, providing feedback to the UI.

### 4.3. Section Components

These are the modular React components responsible for rendering specific parts of a user's profile. They are designed to be highly reusable and driven by the JSON configuration passed to them.

**Common Characteristics**:
-   Receive props from `Profile.js`:
    * `formData`: The relevant slice of data for the section.
    * `config`: The loaded JSON configuration object (containing field definitions, tab info, etc.).
    * `errors`: Validation errors relevant to the fields in this section.
    * `isSubmitting`: Boolean indicating if a save operation is in progress.
    * `onInputChange(fieldNameWithPath, value)`: Callback to update simple field values in `Profile.js`'s `formData`. Handles nested paths.
    * `onArrayChange(arrayName, newArray)`: Callback for components like `ProfessionalBackground.js` to update arrays in `formData`.
    * `onSaveAndContinue`: Callback to trigger saving the current section and potentially moving to the next.
    * `onCancel`: Callback to discard changes (handled by `Profile.js`).
    * `getNestedValue(object, path, defaultValue)`: Utility to safely access data from `formData` or `errors`.
    * `t`: The i18n translation function.
-   Dynamically render input fields, dropdowns, lists of items, file uploaders, etc., based on the definitions found in `config.fields[activeTab]` (for simple sections) or `config.itemSchemas` (for list-based sections like `ProfessionalBackground`).
-   Use `profileUnified.module.css` for common styling.

**Specific Section Components**:

* **Professionals**:
    * `PersonalDetails.js` (in `/professionals/components/`): Renders fields like name, DOB, address, contact info.
    * `ProfessionalBackground.js` (in `/professionals/`): Manages lists of education, work experience, licenses, etc. Uses `professionalBackgroundUtils.js` for item manipulation logic.
    * `BillingInformation.js` (in `/professionals/components/`): For professional's banking details (where they get paid).
    * `DocumentUploads.js` (in `/professionals/components/`): Handles uploads like CV, diplomas, licenses. Renders individual upload sections per document type defined in the config.
* **Facilities**:
    * `FacilityDetails.js` (in `/facilities/components/`): This component is the primary UI for facility profiles. It receives an `activeTab` prop from `Profile.js` which corresponds to one of its own configured sub-sections (e.g., "facilityCoreDetails", "facilityLegalBilling", "facilityDocuments"). It then renders the fields for that active facility sub-section based on the facility-specific JSON configuration.

### 4.4. Profile Header (`ProfileHeader.js`)

**Location**: `/src/pages/dashboard/profile/components/ProfileHeader.js`

A shared UI component responsible for rendering the tab navigation bar at the top of the profile editing area.

**Functionality**:
-   Receives the loaded `profileConfig` to dynamically generate the list of tabs (their IDs and translated labels).
-   Receives `activeTab` from `Profile.js` to highlight the current tab.
-   Receives `profile` (current `formData`) and helper functions `isTabCompleted` and `isTabAccessible` (passed from `Profile.js`) to visually indicate the status of each tab (e.g., completed, accessible, disabled).
-   Handles tab click events, calling the `onTabChange` prop (provided by `Profile.js`) to update the active tab and URL.
-   May display visual cues for profile completion progress (e.g., checkmarks on completed tabs, highlighting the next recommended tab) if `isOnboardingFlow` prop (indicating main profile completion phase) is true.

### 4.5. Configuration Files (JSON)

These files are the backbone of the dynamic UI, defining the structure, content, and rules for each profile type.

**Locations**:
-   Professionals: `/src/configs/professionals/professional-<type>.json` (e.g., `professional-doctor.json`)
-   Facilities: `/src/configs/facilities/facility-<type>.json` (e.g., `facility-pharmacy.json`)

**Key Structure Elements within a Config File**:
-   **`profileType`**: A string identifying the specific configuration (e.g., "doctor", "pharmacy").
-   **`profileTypeNameKey`**: An i18n key for the display name of this profile type (e.g., "Doctor Profile").
-   **`tabs`**: An array of objects, each defining a main tab/section.
    -   `id`: Unique string ID for the tab (e.g., "personalDetails", "facilityCoreDetails"). This ID maps to a key in the `fields` object.
    -   `labelKey`: i18n key for the tab's display name.
-   **`fields`**: An object where each key is a `tab.id`.
    -   The value for each tab ID can be:
        1.  An **array of field definition objects**: For tabs that render a series of direct input fields (e.g., `PersonalDetails`, `BillingInformation`, and sub-sections within `FacilityDetails`). Each field object typically includes:
            * `name`: Path to the data in `formData` (e.g., "legalFirstName", "address.street", "facilityIBAN").
            * `type`: Input type ("text", "email", "tel", "url", "date", "dropdown", "checkbox", "textarea", "slider", "slider-range", "checkbox-group").
            * `required`: Boolean.
            * `labelKey`: i18n key for the field label.
            * `placeholderKey` (optional): i18n key for placeholder text.
            * `infoKey` (optional): i18n key for help/info text displayed near the field.
            * `optionsKey` (for "dropdown", "checkbox-group"): Key referencing an entry in the top-level `dropdownOptions` section of the config.
            * `dependsOn` (optional): Name of another field that this field's requirement or visibility depends on.
            * `dependsOnValue` (optional): Array of values. If the `dependsOn` field has one of these values, this field is considered relevant/required.
            * `dependsOnValueExclude` (optional): Array of values. If the `dependsOn` field has one of these values, this field is *not* considered relevant/required.
            * `validationRules` (optional): Object for specific client-side validation rules (e.g., `{ "minLength": 2, "pattern": "^[A-Z]+$", "patternErrorKey": "validation.onlyCaps" }`).
            * `group` (optional): String to group fields under subheadings within a tab component (used by `BillingInformation.js`, `FacilityDetails.js`).
            * `isMultiple` (for document uploads): Boolean, if multiple files of this type are allowed.
            * `accept` (for document uploads): Standard HTML input `accept` attribute string (e.g., ".pdf,.jpg,.png").
            * `docType` (for document uploads): A unique identifier for the document category, used for internal logic and potentially display.
        2.  An **object** (for complex list-based sections like `ProfessionalBackground`). Each key in this object represents a list (e.g., "education", "workExperience") and its value is an object defining:
            * `required`: Boolean, if at least one item in this list is mandatory for the section to be considered complete.
            * `minItems`: Number, minimum items required if the section is filled by the user.
            * `labelKey`: i18n key for this list's subsection title.
            * `itemSchemaRef`: String, a reference to a key in the top-level `itemSchemas` object. This referenced schema defines the structure of each individual item within this list.
            * `descriptionKey` (optional): i18n key for a descriptive text for this subsection.
-   **`itemSchemas`**: An object where each key is an `itemSchemaRef` (e.g., "educationItem", "licenseItem", "workExperienceItem").
    * The value is an array of field definition objects (similar to those described above), defining the structure of each item in a list (e.g., the fields for a single education entry are defined in the "educationItem" schema).
-   **`dropdownOptions`**: An object mapping `optionsKey` (used in field definitions) to their actual data source.
    * Example: `"countries": "locales:dropdowns.countries"` instructs the system to load options from the i18n translation file, under the `dropdowns` namespace and the `countries` key. The component rendering the dropdown (e.g., `PersonalDetails.js`) will use this path to fetch and format the options.

## 5. Data Flow & Storage (Firestore)

-   **User Creation**: Handled by Firebase Authentication.
-   **Onboarding Data Flow**:
    1.  `OnboardingFlow.js` collects initial `PersonalDetails`.
    2.  User selects a role.
    3.  `useProfileData.changeUserRoleAndProfileType` updates `/users/{uid}` with `role` and default `profileType`, and initializes the role-specific profile document (e.g., `/professionalProfiles/{uid}`).
    4.  Collected personal details are merged and saved via `useProfileData.updateProfileData` to both `/users/{uid}` (for shared fields) and the role-specific profile document. `onboardingStatus` is set to 'completed'.
-   **Profile Editing Data Flow**:
    1.  `Profile.js` loads, `useProfileData.fetchProfileData` gets merged user and profile data.
    2.  User edits data in a tab.
    3.  On save, `Profile.js` validates data against the loaded config.
    4.  `useProfileData.updateProfileData` saves `formData`, splitting data between `/users/{uid}` and the role-specific profile collection.

**Example Firestore Structure**:


/users/{uid}
uid
email
emailVerified
role: "professional" | "facility"
profileType: "doctor" | "pharmacy" | "clinic" | etc.
firstName // User's own first name
lastName // User's own last name
photoURL // User's avatar
onboardingStatus: "pending_verification" | "pending_personal_details" | "pending_role_choice" | "completed"
createdAt: Timestamp
updatedAt: Timestamp
/professionalProfiles/{uid} // UID matches /users/{uid}
userId: String (duplicate of UID for easier querying if needed)
legalFirstName: String
legalLastName: String
dateOfBirth: String (ISO YYYY-MM-DD) or Timestamp
nationality: String
residentialAddress: { street, number, postalCode, city, canton }
contactPhonePrefix: String
contactPhone: String
contactEmail: String
education: Array (each object matching "educationItem" schema)
workExperience: Array (each object matching "workExperienceItem" schema)
licensesCertifications: Array
professionalMemberships: Array
volunteering: Array
iban: String
bankName: String
... (other professional-specific fields)
cvUrl: String
diplomaUrls: Array
createdAt: Timestamp
updatedAt: Timestamp
/facilityProfiles/{uid} // UID matches /users/{uid} of the facility manager/representative
userId: String
facilityName: String
facilityType: String (e.g., "pharmacy", "clinic")
address: { street, number, postalCode, city, canton }
mainPhoneNumber: String
mainEmail: String
website: String (optional)
legalEntityName: String
uidNumber: String (Swiss Business ID, e.g., CHE-XXX.XXX.XXX)
commercialRegisterNumber: String (optional)
legalRepresentative: { firstName, lastName, email, phone }
billingContact: { name, email, phone }
facilityIBAN: String
facilityBankName: String
commercialRegisterExtractUrl: String
proofOfAddressUrl: String
pharmacyLicenseUrl: String (example for pharmacy type)
... (other facility-specific fields and documents)
createdAt: Timestamp
updatedAt: Timestamp
## 6. Styling

-   **CSS Modules**: Used for component-level styling to ensure encapsulation and avoid global scope conflicts.
    -   `onboardingFlow.module.css`: Styles specific to the `OnboardingFlow.js` component and its multi-step presentation.
    -   `profile.module.css` (in `/src/pages/dashboard/profile/`): Styles the main `Profile.js` orchestrator page layout, its headers (profile completion status, main title), and the `ProfileHeader.js` tab navigation bar.
    -   `profileUnified.module.css` (conceptually in `/src/styles/` or a shared location): Provides common, shared styles for elements *within* the various profile section components (e.g., `PersonalDetails.js`, `FacilityDetails.js`, `ProfessionalBackground.js`, `DocumentUploads.js`). This includes consistent styling for input fields, buttons, section containers, item cards, error messages, grid layouts, etc. Individual section components import from this unified file.
-   **CSS Variables**: The system relies heavily on CSS variables (e.g., `var(--primary-color)`, `var(--text-secondary)`, `var(--grey-1)`) for theming (colors, fonts, spacing). These variables should be defined globally (e.g., in an `index.css` or a dedicated theme file).
-   **Responsive Design**: Media queries are used within the CSS modules to ensure the layout adapts to different screen sizes, particularly for tab navigation, grid layouts, and form elements.

## 7. Key Features & Benefits Summary

-   **Clear Onboarding Path**: Guides new users effectively through initial setup.
-   **Role Segregation**: Distinct profile experiences for Professionals and Facilities.
-   **High Configurability**: Profile structures (tabs, sections, fields, rules) are defined in JSON, making it easy to adapt or add new profile types without extensive code changes.
-   **Modularity & Reusability**: Components are designed for specific purposes and can be reused (e.g., `PersonalDetails` in onboarding and main profile).
-   **Centralized Data Logic**: `useProfileData` simplifies and standardizes backend interactions.
-   **Maintainable Styling**: CSS Modules prevent style conflicts and promote organized stylesheets.
-   **Internationalization (i18n) Ready**: UI labels, messages, and dropdown options are sourced from translation files, driven by keys in the JSON configurations.


