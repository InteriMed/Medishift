# Dashboard Codebase Structure

## Root Directory
- `package.json` - Root level package configuration
- `firebase.json` - Firebase configuration
- `.firebaserc` - Firebase project configuration
- `firestore.rules` - Security rules for Firestore
- `storage.rules` - Security rules for Firebase Storage
- `README.md` - Project documentation

## Frontend
### Core
- `frontend/package.json` - Frontend dependencies and scripts
- `frontend/src/index.js` - Application entry point
- `frontend/src/App.js` - Main application component
- `frontend/src/i18n.js` - Internationalization configuration
- `frontend/src/firebase.js` - Firebase client configuration

### Dashboard
- `frontend/src/dashboard/index.js` - Dashboard module entry point
- `frontend/src/dashboard/DashboardRoot.jsx` - Dashboard root component

#### Dashboard Features
- `frontend/src/dashboard/features/profile/` - User profile management
- `frontend/src/dashboard/features/messages/` - Messaging functionality
- `frontend/src/dashboard/features/contracts/` - Contract management
- `frontend/src/dashboard/features/marketplace/` - Marketplace functionality
- `frontend/src/dashboard/features/calendar/` - Calendar and scheduling
- `frontend/src/dashboard/features/personalDashboard/` - Personal dashboard views

#### Dashboard Components
- `frontend/src/dashboard/components/` - Dashboard-specific UI components
- `frontend/src/dashboard/layout/` - Layout components for the dashboard
- `frontend/src/dashboard/pages/` - Dashboard pages and views
- `frontend/src/dashboard/hooks/` - Custom React hooks for dashboard
- `frontend/src/dashboard/utils/` - Dashboard utility functions
- `frontend/src/dashboard/config/` - Dashboard configuration
- `frontend/src/dashboard/constants/` - Dashboard constants
- `frontend/src/dashboard/context/` - Dashboard context providers

### Main Application Components
- `frontend/src/components/Header.js` - Main application header
- `frontend/src/components/LanguageSwitcher.js` - Language selection component
- `frontend/src/components/ProtectedRoute.js` - Authentication route protection
- `frontend/src/components/ErrorBoundary.js` - Error handling component
- `frontend/src/components/NetworkStatus.js` - Network status monitoring
- `frontend/src/components/FirebaseAuth.js` - Firebase authentication component
- `frontend/src/components/PlaceholderPage.js` - Loading placeholder

#### Component Directories
- `frontend/src/components/Tutorial/` - Tutorial components
- `frontend/src/components/LoadingSpinner/` - Loading indicators
- `frontend/src/components/BoxedInputFields/` - Form input components
- `frontend/src/components/Layout/` - Layout components
- `frontend/src/components/Links/` - Link components
- `frontend/src/components/Notification/` - Notification components
- `frontend/src/components/Header/` - Header components
- `frontend/src/components/Footer/` - Footer components
- `frontend/src/components/Dialog/` - Dialog components

### Pages
- `frontend/src/pages/Homepage.js` - Main landing page
- `frontend/src/pages/FacilitiesPage.js` - Facilities information
- `frontend/src/pages/ProfessionalsPage.js` - Professionals listing
- `frontend/src/pages/ContactPage.js` - Contact information
- `frontend/src/pages/BlogPage.js` - Blog content
- `frontend/src/pages/AboutPage.js` - About information
- `frontend/src/pages/TermsOfServicePage.js` - Terms of service
- `frontend/src/pages/PrivacyPolicyPage.js` - Privacy policy
- `frontend/src/pages/SitemapPage.js` - Site map
- `frontend/src/pages/FAQPage.js` - Frequently asked questions
- `frontend/src/pages/Support.js` - Support page
- `frontend/src/pages/NotFound.js` - 404 page
- `frontend/src/pages/LoadingPage.js` - Loading page
- `frontend/src/pages/Placeholders.js` - Placeholder components

#### Page Subdirectories
- `frontend/src/pages/Auth/` - Authentication pages
- `frontend/src/pages/Blog/` - Blog-related pages
- `frontend/src/pages/styles/` - Page-specific styles

### Contexts (State Management)
- `frontend/src/contexts/AuthContext.js` - Authentication state
- `frontend/src/contexts/NotificationContext.js` - Notification state
- `frontend/src/contexts/NetworkContext.js` - Network status state

### Services
- `frontend/src/services/firebase.js` - Firebase service
- `frontend/src/services/calendarService.js` - Calendar functionality
- `frontend/src/services/contractsService.js` - Contract management
- `frontend/src/services/messagesService.js` - Messaging service
- `frontend/src/services/userService.js` - User data management
- `frontend/src/services/apiService.js` - API communication
- `frontend/src/services/cloudFunctions.js` - Firebase Cloud Functions
- `frontend/src/services/storageService.js` - File storage service
- `frontend/src/services/monitoringService.js` - Application monitoring
- `frontend/src/services/dataService.js` - Data management
- `frontend/src/services/paymentService.js` - Payment processing
- `frontend/src/services/notificationService.js` - Notification service
- `frontend/src/services/performanceMonitor.js` - Performance monitoring

### Utilities and Resources
- `frontend/src/utils/` - Utility functions
- `frontend/src/styles/` - Global styles
- `frontend/src/assets/` - Static assets
- `frontend/src/config/` - Application configuration
- `frontend/src/locales/` - Internationalization resources
- `frontend/src/docs/` - Documentation

## Backend (Firebase Functions)
- `functions/index.js` - Firebase functions entry point
- `functions/config.js` - Backend configuration

### API Endpoints
- `functions/api/index.js` - API entry point
- `functions/api/calendar.js` - Calendar API endpoints
- `functions/api/data.js` - Data management API
- `functions/api/payment.js` - Payment processing API
- `functions/api/notifications.js` - Notification API
- `functions/api/monitoring.js` - Monitoring endpoints

### Firebase Function Domains
- `functions/auth/` - Authentication functions
- `functions/database/` - Database triggers
- `functions/storage/` - Storage triggers

## Testing
- `functions/tests/` - Backend tests
- `functions/test/` - Alternative test directory 