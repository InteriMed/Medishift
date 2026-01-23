# Implementation Plan: Locale Review & Service Tree Creation

## PHASE 1: FILE STRUCTURE TREE (Pages to Check)

### PUBLIC PAGES (`src/pages/`)

- [ ] **Homepage.js** → `pages/home.json`
- [ ] **AboutPage.js** → `pages/about.json`
- [ ] **FacilitiesPage.js** → `pages/facilities.json`
- [ ] **ProfessionalsPage.js** → `pages/professionals.json`
- [ ] **FAQPage.js** → `pages/faq.json`
- [ ] **ContactPage.js** → `pages/contact.json`
- [ ] **BlogPage.js** → `pages/blog.json`
- [ ] **SitemapPage.js** → `pages/sitemap.json`
- [ ] **Support.js** → `pages/support.json`
- [ ] **LegalPage.js** → `pages/legal/` (needs split)
- [ ] **PrivacyPolicyPage.js** → `pages/legal/privacy.json`
- [ ] **TermsOfServicePage.js** → `pages/legal/terms.json`
- [ ] **NotFound.js** → `pages/notFound.json`
- [ ] **LoadingPage.js** → (verify needs locale)
- [ ] **Placeholders.js** → `pages/placeholders.json`
- [ ] **GLNTestVerifPage.js** → `pages/glnTestVerif.json`
- [ ] **TestGLNPage.js** → `pages/testGLN.json`
- [ ] **TestPage.js** → (test file - skip?)
- [ ] **TestPhonePage.js** → (test file - skip?)
- [ ] **TestPopupPage.js** → (test file - skip?)

### AUTH PAGES (`src/pages/Auth/`)

- [ ] **LoginPage.js** → `pages/auth/auth.json`
- [ ] **SignupPage.js** → `pages/auth/auth.json`
- [ ] **ForgotPasswordPage.js** → `pages/auth/auth.json`
- [ ] **AcceptInvitationPage.js** → `pages/auth/auth.json`
- [ ] **VerificationSentPage.js** → `pages/auth/auth.json`

### BLOG PAGES (`src/pages/Blog/`)

- [ ] **BlogPost.js** → `pages/blog/blog.json`
- [ ] **data/categories.js** → `pages/blog/posts/`
- [ ] **data/posts.js** → `pages/blog/posts/`

### ONBOARDING (`src/pages/Onboarding/`)

- [ ] **OnboardingPage.js** → `pages/onboarding/onboarding.json`

---

### DASHBOARD PAGES (`src/dashboard/pages/`)

#### Personal Dashboard
- [ ] **personalDashboard/PersonalDashboard.js** → `dashboard/personalDashboard/personalDashboard.json`

#### Calendar
- [ ] **calendar/Calendar.js** → `dashboard/calendar/calendar.json`
- [ ] **calendar/components/CalendarHeader.js** → `dashboard/calendar/calendar.json`
- [ ] **calendar/components/CalendarSidebar.js** → `dashboard/calendar/calendar.json`
- [ ] **calendar/components/AddFacilityRoleModal.js** → `dashboard/calendar/calendar.json`
- [ ] **calendar/components/CalendarErrorBoundary.js** → `dashboard/calendar/calendar.json`
- [ ] **calendar/components/DeleteConfirmationDialog.js** → `dashboard/calendar/calendar.json`
- [ ] **calendar/components/EditOptionsDialog.js** → `dashboard/calendar/calendar.json`
- [ ] **calendar/components/EventContextMenu.js** → `dashboard/calendar/calendar.json`
- [ ] **calendar/components/ResourceGrid.js** → `dashboard/calendar/calendar.json`
- [ ] **calendar/components/TimeGrid.js** → `dashboard/calendar/calendar.json`
- [ ] **calendar/components/TimeHeaders.js** → `dashboard/calendar/calendar.json`
- [ ] **calendar/components/events/Event.js** → `dashboard/calendar/calendar.json`
- [ ] **calendar/EventPanel/EventPanel.js** → `dashboard/calendar/calendar.json`
- [ ] **calendar/EventPanel/CustomDateInput.js** → `dashboard/calendar/calendar.json`
- [ ] **calendar/miniCalendar/MiniCalendar.js** → `dashboard/calendar/calendar.json`

#### Messages
- [ ] **messages/Messages.js** → `dashboard/messages/messages.json`
- [ ] **messages/components/ConversationsList.js** → `dashboard/messages/messages.json`
- [ ] **messages/components/ConversationView.js** → `dashboard/messages/messages.json`
- [ ] **messages/components/MessageItem.js** → `dashboard/messages/messages.json`

#### Contracts
- [ ] **contracts/Contracts.js** → `dashboard/contracts/contracts.json`
- [ ] **contracts/components/ContractDetails.js** → `dashboard/contracts/contracts.json`
- [ ] **contracts/components/ContractFilters.jsx** → `dashboard/contracts/contracts.json`
- [ ] **contracts/components/ContractForm.js** → `dashboard/contracts/contracts.json`
- [ ] **contracts/components/ContractPdfView.js** → `dashboard/contracts/contracts.json`
- [ ] **contracts/components/ContractsList.js** → `dashboard/contracts/contracts.json`
- [ ] **contracts/components/ContractStatusBadge.js** → `dashboard/contracts/contracts.json`

#### Marketplace
- [ ] **marketplace/Marketplace.js** → `dashboard/marketplace/marketplace.json`
- [ ] **marketplace/components/card/card.js** → `dashboard/marketplace/marketplace.json`
- [ ] **marketplace/components/detailed_card/detailed_card.js** → `dashboard/marketplace/marketplace.json`
- [ ] **marketplace/components/filterbar/filterbar.js** → `dashboard/marketplace/marketplace.json`

#### Profile
- [ ] **profile/Profile.js** → `dashboard/profile/profile.json`
- [ ] **profile/components/AccessLevelChoicePopup.js** → `dashboard/profile/profile.json`
- [ ] **profile/components/AccountDeletion.js** → `dashboard/profile/profile.json`
- [ ] **profile/components/AccountManagement.js** → `dashboard/profile/profile.json`
- [ ] **profile/components/BankingAccessModal.js** → `dashboard/profile/profile.json`
- [ ] **profile/components/DeleteAccount.js** → `dashboard/profile/profile.json`
- [ ] **profile/components/FacilityAccessLevelPopup.js** → `dashboard/profile/profile.json`
- [ ] **profile/components/ProfileHeader.js** → `dashboard/profile/profile.json`
- [ ] **profile/components/RestartTutorialPopup.js** → `dashboard/profile/profile.json`
- [ ] **profile/facilities/components/*.js** (9 files) → `dashboard/profile/profile.json`
- [ ] **profile/professionals/components/*.js** (7 files) → `dashboard/profile/profile.json`

#### Organization
- [ ] **organization/OrganizationDashboard.js** → `dashboard/organization/organization.json`
- [ ] **organization/components/*.js** (11 files) → `dashboard/organization/organization.json`
- [ ] **organization/tabs/ChainHeadquarters.js** → `dashboard/organization/organization.json`
- [ ] **organization/tabs/OrganigramView.js** → `dashboard/organization/organization.json`

#### Payroll
- [ ] **payroll/PayrollDashboard.js** → `dashboard/payroll/payroll.json`

#### GLN Test
- [ ] **glnTest/GLNTestPage.js** → (verify locale mapping)

#### UID Test
- [ ] **uidTest/UIDTestPage.js** → (verify locale mapping)

---

### DASHBOARD ADMIN (`src/dashboard/admin/`)

- [ ] **AdminDashboard.js** → `dashboard/admin/admin.json`
- [ ] **DatabaseEditor.js** → `dashboard/admin/admin.json`
- [ ] **ShiftMasterList.js** → `dashboard/admin/admin.json`
- [ ] **UserVerificationQueue.js** → `dashboard/admin/admin.json`
- [ ] **components/AdminLayout.js** → `dashboard/admin/admin.json`
- [ ] **components/AdminSidebar.js** → `dashboard/admin/admin.json`

#### Admin Pages
- [ ] **pages/ExecutiveDashboard.js** → `dashboard/admin/admin.json`
- [ ] **pages/debug/AccountCreationTool.js** → `dashboard/admin/admin.json`
- [ ] **pages/finance/AccountsReceivable.js** → `dashboard/admin/admin.json`
- [ ] **pages/finance/BalanceSheet.js** → `dashboard/admin/admin.json`
- [ ] **pages/finance/RevenueAnalysis.js** → `dashboard/admin/admin.json`
- [ ] **pages/finance/SpendingsTracker.js** → `dashboard/admin/admin.json`
- [ ] **pages/management/EmployeeManagement.js** → `dashboard/admin/admin.json`
- [ ] **pages/operations/LinkedInJobScraper.js** → `dashboard/admin/admin.json`
- [ ] **pages/operations/ShiftCommandCenter.js** → `dashboard/admin/admin.json`
- [ ] **pages/operations/UserCRM.js** → `dashboard/admin/admin.json`
- [ ] **pages/payroll/PayrollExport.js** → `dashboard/admin/admin.json`
- [ ] **pages/system/AuditLogs.js** → `dashboard/admin/admin.json`
- [ ] **pages/system/NotificationsCenter.js** → `dashboard/admin/admin.json`

---

### DASHBOARD COMPONENTS (`src/dashboard/components/`)

- [ ] **AccessLevelModal.js** → `dashboard/common.json`
- [ ] **DashboardAccessGuard.js** → `dashboard/common.json`
- [ ] **DashboardRedirect.js** → `dashboard/common.json`
- [ ] **ColorPicker/ColorPicker.js** → `dashboard/common.json`
- [ ] **DetailedCard/DetailedCard.js** → `dashboard/common.json`
- [ ] **EmptyState/EmptyState.js** → `dashboard/common.json`
- [ ] **FilterBar/FilterBar.js** → `dashboard/common.json`
- [ ] **ListingCard/ListingCard.js** → `dashboard/common.json`
- [ ] **PageHeader/PageHeader.js** → `dashboard/common.json`
- [ ] **SkeletonLoader/SkeletonLoader.js** → `dashboard/common.json`
- [ ] **Sidebar/Sidebar.js** → `dashboard/common.json`
- [ ] **Sidebar/SidebarItem.js** → `dashboard/common.json`
- [ ] **Sidebar/LockedMenuItem.js** → `dashboard/common.json`
- [ ] **WorkspaceSelector/WorkspaceSelector.js** → `dashboard/common.json`
- [ ] **Header/Header.js** → `dashboard/common.json`
- [ ] **Header/SettingsButton.js** → `dashboard/common.json`
- [ ] **Header/UserMenu/UserMenu.jsx** → `dashboard/common.json`
- [ ] **Header/WorkspaceSelector/HeaderWorkspaceSelector.js** → `dashboard/common.json`
- [ ] **Header/SettingsMenu/SettingsPage.js** → `dashboard/common.json`
- [ ] **Header/SettingsMenu/AccountBasics.js** → `dashboard/common.json`
- [ ] **Header/SettingsMenu/JobPreferences.js** → `dashboard/common.json`
- [ ] **modals/TutorialSelectionModal.js** → `config/tutorial.json`
- [ ] **Layout/DashboardLayout.js** → `dashboard/common.json`
- [ ] **StatisticCard/StatisticCard.jsx** → `dashboard/common.json`
- [ ] **RecentActivityCard/RecentActivityCard.jsx** → `dashboard/common.json`

---

### DASHBOARD ONBOARDING (`src/dashboard/onboarding/`)

- [ ] **components/ContentTutorial.js** → `config/tutorial.json`
- [ ] **components/DocumentDisplay.js** → `pages/onboarding/onboarding.json`
- [ ] **components/FacilityGLNVerification.js** → `pages/onboarding/onboarding.json`
- [ ] **components/FirstTimeModal.js** → `config/tutorial.json`
- [ ] **components/HighlightTooltip.js** → `config/tutorial.json`
- [ ] **components/PhoneVerificationStep.js** → `pages/onboarding/onboarding.json`
- [ ] **components/ProfessionalGLNVerification.js** → `pages/onboarding/onboarding.json`
- [ ] **components/SidebarHighlighter.js** → `config/tutorial.json`
- [ ] **components/SidebarTutorial.js** → `config/tutorial.json`
- [ ] **components/VerificationDetails.js** → `pages/onboarding/onboarding.json`

---

### SHARED COMPONENTS (`src/components/`)

- [ ] **Header/Header.js** → `dashboard/common.json` or new `components/header.json`
- [ ] **Header/LanguageSwitcher.js** → `dashboard/common.json`
- [ ] **Header/Notification/Notification.js** → `dashboard/common.json`
- [ ] **Header/TutorialHelp.js** → `config/tutorial.json`
- [ ] **Footer/Footer.js** → new `components/footer.json`
- [ ] **Dialog/Dialog.js** → `dashboard/common.json`
- [ ] **GhostModeBanner/GhostModeBanner.js** → `dashboard/admin/admin.json`
- [ ] **ErrorBoundary.js** → `dashboard/common.json`
- [ ] **NetworkStatus.js** → `dashboard/common.json`
- [ ] **ProtectedRoute.js** → (no UI text)
- [ ] **Layout/Layout.js** → (no UI text)

#### BoxedInputFields (`src/components/BoxedInputFields/`)
- [ ] **Button.js** → `dashboard/common.json`
- [ ] **BoxedSwitchField.js** → `dashboard/common.json`
- [ ] **CheckboxField.js** → `dashboard/common.json`
- [ ] **DateField.js** → `dashboard/common.json`
- [ ] **DaySelector.js** → `dashboard/common.json`
- [ ] **Dropdown-Field.js** → `dashboard/common.json`
- [ ] **Dropdown-Field-AddList.js** → `dashboard/common.json`
- [ ] **Dropdown-Time.js** → `dashboard/common.json`
- [ ] **Hint.js** → `dashboard/common.json`
- [ ] **InputFieldHideUnhide.js** → `dashboard/common.json`
- [ ] **Letterbox.js** → `dashboard/common.json`
- [ ] **Personnalized-InputField.js** → `dashboard/common.json`
- [ ] **Slider.js** → `dashboard/common.json`
- [ ] **Switch.js** → `dashboard/common.json`
- [ ] **TextareaField.js** → `dashboard/common.json`
- [ ] **UnderlinedLink.js** → (no UI text)
- [ ] **UploadFile.js** → `dashboard/common.json`
- [ ] **WeekDaySelector.js** → `dashboard/common.json`

---

### SERVICES (`src/services/`) - For Service Tree

- [ ] **accountManagementService.js** → Extract actions
- [ ] **api.js** → Extract actions
- [ ] **calendarService.js** → Extract actions
- [ ] **cloudFunctions.js** → Extract actions
- [ ] **contractsService.js** → Extract actions
- [ ] **dataService.js** → Extract actions
- [ ] **documentProcessingService.js** → Extract actions
- [ ] **firebaseService.js** → Extract actions
- [ ] **messagesService.js** → Extract actions
- [ ] **monitoringService.js** → Extract actions
- [ ] **newsletterService.js** → Extract actions
- [ ] **notificationService.js** → Extract actions
- [ ] **paymentService.js** → Extract actions
- [ ] **payrollService.js** → Extract actions
- [ ] **storageService.js** → Extract actions
- [ ] **userService.js** → Extract actions

---

### CONTEXTS (`src/contexts/` & `src/dashboard/contexts/`)

- [ ] **AuthContext.js** → Extract actions
- [ ] **NetworkContext.js** → Extract actions
- [ ] **NotificationContext.js** → Extract actions
- [ ] **DashboardContext.js** → Extract actions
- [ ] **SidebarContext.js** → Extract actions
- [ ] **TutorialContext.js** → Extract actions

---

## PHASE 2: IMPLEMENTATION STEPS

### STEP 1: UI Text Review (Per File)

For each file checked above:

1. **Scan for hardcoded strings:**
   - Text in JSX: `<span>Text</span>`, `<p>Text</p>`, `<button>Click</button>`
   - Placeholders: `placeholder="Enter text"`
   - Alt text: `alt="Image description"`
   - Title attributes: `title="Tooltip"`
   - Aria labels: `aria-label="Label"`
   - Error messages in catch blocks
   - Toast/notification messages
   - Modal titles and content
   - Button labels
   - Form labels
   - Table headers

2. **Replace with translation calls:**
   ```javascript
   // Before
   <h1>Welcome to InteriMed</h1>
   
   // After
   <h1>{t('namespace:section.welcome')}</h1>
   ```

3. **Verify locale structure mirrors file path:**
   - File: `src/pages/Auth/LoginPage.js`
   - Locale: `locales/en/pages/auth/auth.json` with key `login.xxx`

4. **Remove unused locale keys** not present in corresponding files

---

### STEP 2: Service Tree Creation

#### Structure for `src/locales/en/service_tree/`

```
service_tree/
├── index.json              # Main service tree index
├── calendar/
│   └── actions.json        # Calendar-related actions
├── contracts/
│   └── actions.json        # Contract-related actions
├── messages/
│   └── actions.json        # Messaging actions
├── profile/
│   └── actions.json        # Profile management actions
├── organization/
│   └── actions.json        # Organization actions
├── marketplace/
│   └── actions.json        # Marketplace actions
├── admin/
│   └── actions.json        # Admin actions
├── auth/
│   └── actions.json        # Authentication actions
└── common/
    └── actions.json        # Shared actions
```

#### Action Entry Format

```json
{
  "actions": {
    "calendar.createShift": {
      "location": "src/services/calendarService.js",
      "function": "createShift",
      "keywords": ["shift", "create", "schedule", "calendar", "event"],
      "description": "Creates a new shift entry in the calendar",
      "parameters": {
        "startDate": "ISO date string",
        "endDate": "ISO date string",
        "professionalId": "User ID",
        "facilityId": "Facility ID",
        "role": "Role type"
      },
      "agentCall": {
        "service": "calendarService",
        "method": "createShift",
        "example": "calendarService.createShift({ startDate, endDate, professionalId, facilityId, role })"
      }
    }
  }
}
```

#### Action Types to Extract

**UI Actions (from pages):**
- Form submissions
- Button clicks that trigger functions
- Search operations
- Filter operations
- Navigation actions
- Modal open/close
- Data CRUD operations

**Service Actions (from services):**
- API calls
- Database operations
- File uploads/downloads
- Authentication flows
- Payment processing
- Notification sending
- Email sending

**NOT Actions (exclude):**
- Filter state changes (UI-only)
- Sort state changes (UI-only)
- Pagination (UI-only)
- Pure styling/layout changes
- Console logs
- Error boundary catches

---

## PHASE 3: EXECUTION ORDER

### Round 1: Public Pages
1. Homepage.js
2. AboutPage.js
3. FacilitiesPage.js
4. ProfessionalsPage.js
5. FAQPage.js
6. ContactPage.js
7. BlogPage.js + Blog/
8. Legal pages (Privacy, Terms)
9. Other public pages

### Round 2: Auth Pages
1. LoginPage.js
2. SignupPage.js
3. ForgotPasswordPage.js
4. AcceptInvitationPage.js
5. VerificationSentPage.js

### Round 3: Dashboard Core
1. PersonalDashboard.js
2. Profile + components
3. Calendar + components
4. Messages + components
5. Contracts + components
6. Marketplace + components

### Round 4: Dashboard Advanced
1. Organization + components
2. Payroll
3. Team
4. Admin pages

### Round 5: Shared Components
1. Header/Footer
2. BoxedInputFields
3. Dashboard components
4. Modals/Dialogs

### Round 6: Services → Service Tree
1. Review each service file
2. Extract action signatures
3. Create service_tree JSON files
4. Link actions to UI elements

---

## TRACKING

| Phase | Total Files | Completed | Remaining |
|-------|-------------|-----------|-----------|
| Public Pages | 20 | 0 | 20 |
| Auth Pages | 5 | 0 | 5 |
| Dashboard Pages | 50+ | 0 | 50+ |
| Dashboard Components | 30+ | 0 | 30+ |
| Shared Components | 25+ | 0 | 25+ |
| Services | 16 | 0 | 16 |
| **TOTAL** | **150+** | **0** | **150+** |

---

## NOTES

1. **Namespace convention:** Use the `nsMapping` from `i18n.js` as the source of truth
2. **Key naming:** Use dot notation mirroring component hierarchy
3. **Service tree:** Actions should be callable by an AI agent with clear parameters
4. **Cleanup:** After each file, remove orphaned locale keys
5. **Testing:** Verify translations load correctly after each change

