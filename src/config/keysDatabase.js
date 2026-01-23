/**
 * CENTRALIZED KEYS DATABASE
 * Single source of truth for all keys used throughout the application
 * 
 * This file centralizes:
 * - localStorage keys
 * - sessionStorage keys
 * - Cookie names
 * - Firestore collection names
 * - Environment variable names
 * - Session token prefixes
 * - IndexedDB database names
 * - Window/global flags
 * - Storage keys
 * 
 * IMPORTANT: Always use constants from this file instead of hardcoding keys.
 */

// ============================================================================
// LOCALSTORAGE KEYS
// ============================================================================

export const LOCALSTORAGE_KEYS = {
  ONBOARDING_FORM_DATA: 'onboarding_form_data',
  TUTORIAL_STATE: 'tutorialState',
  TUTORIAL_MAX_ACCESSED_PROFILE_TAB: 'tutorial_maxAccessedProfileTab',
  FIRESTORE_INITIALIZED: '__FIRESTORE_INITIALIZED__',
  BANKING_ACCESS_GRANTED: 'bankingAccessGranted',
  PHONE_VERIFICATION: 'interimed_phone_verification',
  RECAPTCHA_VERIFICATION: 'interimed_recaptcha_verified',
  RECAPTCHA_RESPONSE: 'interimed_recaptcha_response',
  AUTOFILL_CACHE: (userId) => `autofill_cache_${userId}`,
  PROFILE_DRAFT: (activeTab) => `profile_${activeTab}_draft`,
  DOCUMENT_PROCESSING_CACHE: (userId) => `document_processing_cache_${userId}`,
  POPUP_SHOWN: (popupId) => `popup_shown_${popupId}`
};

// ============================================================================
// SESSIONSTORAGE KEYS
// ============================================================================

export const SESSIONSTORAGE_KEYS = {
  SESSION_DATA: 'session_data',
  TEMP_FORM_DATA: 'temp_form_data'
};

// ============================================================================
// COOKIE KEYS
// ============================================================================

export const COOKIE_KEYS = {
  WORKSPACE: 'medishift_workspace',
  PROFILE_COMPLETE: (userId) => `medishift_profile_complete_${userId}`,
  TUTORIAL_PASSED: (userId) => `medishift_tutorial_passed_${userId}`,
  IMPERSONATION_SESSION: 'medishift_impersonation_session',
  SESSION_TOKEN: (workspaceType, facilityId = null) => {
    const prefix = 'medishift_session_';
    return `${prefix}${workspaceType}${facilityId ? `_${facilityId}` : ''}`;
  },
  NEWSLETTER_SUBSCRIPTION_COUNT: 'newsletter_subscription_count',
  NEWSLETTER_LAST_SUBSCRIPTION_TIME: 'newsletter_last_subscription_time'
};

// ============================================================================
// COOKIE CONFIGURATION
// ============================================================================

export const COOKIE_CONFIG = {
  WORKSPACE_EXPIRY_DAYS: 30,
  PROFILE_TUTORIAL_EXPIRY_DAYS: 7,
  NEWSLETTER_EXPIRY_DAYS: 1,
  SESSION_EXPIRY_HOURS: 1
};

// ============================================================================
// FIRESTORE COLLECTION NAMES
// ============================================================================

export const FIRESTORE_COLLECTIONS = {
  USERS: 'users',
  PROFESSIONAL_PROFILES: 'professionalProfiles',
  FACILITY_PROFILES: 'facilityProfiles',
  ADMINS: 'admins',
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
  CONTRACTS: 'contracts',
  NOTIFICATIONS: 'notifications',
  SHIFTS: 'shifts',
  PAYROLL: 'payroll',
  INVOICES: 'invoices',
  BONUS_CLAIMS: 'bonusClaims',
  LEGAL_ARCHIVE: 'legal_archive',
  ANTIFRAUD_HASHES: 'antifraud_hashes',
  AVAILABILITY: 'availability',
  POSITIONS: 'positions',
  PROFESSIONAL_AVAILABILITIES: 'professionalAvailabilities',
  FACILITY_INVITATIONS: 'facilityInvitations'
};

// ============================================================================
// FIRESTORE DATABASE NAME
// ============================================================================

export const FIRESTORE_DATABASE_NAME = 'medishift';

// ============================================================================
// ENVIRONMENT VARIABLE NAMES
// ============================================================================

export const ENV_VARS = {
  NODE_ENV: 'NODE_ENV',
  FIREBASE_API_KEY: 'REACT_APP_FIREBASE_API_KEY',
  FIREBASE_AUTH_DOMAIN: 'REACT_APP_FIREBASE_AUTH_DOMAIN',
  FIREBASE_PROJECT_ID: 'REACT_APP_FIREBASE_PROJECT_ID',
  FIREBASE_STORAGE_BUCKET: 'REACT_APP_FIREBASE_STORAGE_BUCKET',
  FIREBASE_MESSAGING_SENDER_ID: 'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
  FIREBASE_APP_ID: 'REACT_APP_FIREBASE_APP_ID',
  FIREBASE_MEASUREMENT_ID: 'REACT_APP_FIREBASE_MEASUREMENT_ID',
  USE_FIREBASE_EMULATORS: 'REACT_APP_USE_FIREBASE_EMULATORS',
  FIREBASE_AUTH_EMULATOR_URL: 'REACT_APP_FIREBASE_AUTH_EMULATOR_URL',
  FIREBASE_FIRESTORE_EMULATOR_URL: 'REACT_APP_FIREBASE_FIRESTORE_EMULATOR_URL',
  FIREBASE_FUNCTIONS_EMULATOR_URL: 'REACT_APP_FIREBASE_FUNCTIONS_EMULATOR_URL',
  FIREBASE_STORAGE_EMULATOR_URL: 'REACT_APP_FIREBASE_STORAGE_EMULATOR_URL',
  API_BASE_URL: 'REACT_APP_API_URL',
  API_BASE: 'REACT_APP_API_BASE_URL',
  USE_EMULATORS: 'REACT_APP_USE_EMULATORS',
  EMULATOR_HOST: 'REACT_APP_EMULATOR_HOST'
};

// ============================================================================
// SESSION TOKEN PREFIXES
// ============================================================================

export const SESSION_PREFIXES = {
  WORKSPACE_SESSION: 'medishift_session_'
};

// ============================================================================
// INDEXEDDB DATABASE NAMES
// ============================================================================

export const INDEXEDDB_DATABASES = {
  FIRESTORE: 'firestore',
  FIREBASE_LOCAL_STORAGE: 'firebaseLocalStorageDb',
  FIREBASE_HEARTBEAT: 'firebase-heartbeat-database'
};

// ============================================================================
// WINDOW/GLOBAL FLAGS
// ============================================================================

export const WINDOW_FLAGS = {
  FIRESTORE_INITIALIZED: '__FIRESTORE_INITIALIZED__',
  RESET_FIRESTORE_CACHE: 'resetFirestoreCache'
};

// ============================================================================
// WORKSPACE TYPES
// ============================================================================

export const WORKSPACE_TYPES = {
  PERSONAL: 'personal',
  FACILITY: 'facility',
  TEAM: 'facility', // LEGACY ALIAS: 'team' was renamed to 'facility', keeping alias for backward compatibility
  ADMIN: 'admin'
};

// ============================================================================
// FIREBASE CONFIGURATION KEYS
// ============================================================================

export const FIREBASE_CONFIG_KEYS = {
  API_KEY: 'apiKey',
  AUTH_DOMAIN: 'authDomain',
  PROJECT_ID: 'projectId',
  STORAGE_BUCKET: 'storageBucket',
  MESSAGING_SENDER_ID: 'messagingSenderId',
  APP_ID: 'appId',
  MEASUREMENT_ID: 'measurementId'
};

// ============================================================================
// FIREBASE EMULATOR CONFIGURATION
// ============================================================================

export const FIREBASE_EMULATOR_CONFIG = {
  AUTH: 'auth',
  FIRESTORE: 'firestore',
  FUNCTIONS: 'functions',
  STORAGE: 'storage'
};

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const DEFAULT_VALUES = {
  FIREBASE_PROJECT_ID: 'interimed-620fd',
  FIREBASE_AUTH_DOMAIN: 'interimed-620fd.firebaseapp.com',
  FIREBASE_STORAGE_BUCKET: 'interimed-620fd.firebasestorage.app',
  FIREBASE_MESSAGING_SENDER_ID: '436488373074',
  FIREBASE_APP_ID: '1:436488373074:web:60c3a26935b6238d9a308b',
  FIREBASE_MEASUREMENT_ID: 'G-66V8BS82V0',
  FIREBASE_REGION: 'europe-west6',
  FIREBASE_AI_REGION: 'europe-west3',
  FIREBASE_VISION_ENDPOINT: 'eu-vision.googleapis.com',
  EMULATOR_AUTH_URL: 'http://localhost:9099',
  EMULATOR_FIRESTORE_URL: 'http://localhost:8080',
  EMULATOR_FUNCTIONS_URL: 'http://localhost:5001',
  EMULATOR_STORAGE_URL: 'http://localhost:9199',
  API_BASE_URL: 'http://localhost:5001/api',
  API_BASE: 'https://europe-west6-interimed-620fd.cloudfunctions.net'
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export const getLocalStorageKey = (keyName, ...params) => {
  const key = LOCALSTORAGE_KEYS[keyName];
  if (typeof key === 'function') {
    return key(...params);
  }
  return key;
};

export const getCookieKey = (keyName, ...params) => {
  const key = COOKIE_KEYS[keyName];
  if (typeof key === 'function') {
    return key(...params);
  }
  return key;
};

export const getEnvVar = (varName) => {
  return process.env[ENV_VARS[varName]];
};

export const getCollectionName = (collectionName) => {
  return FIRESTORE_COLLECTIONS[collectionName];
};

// ============================================================================
// KEY USAGE DOCUMENTATION
// ============================================================================

/**
 * KEY USAGE REFERENCE:
 * 
 * LOCALSTORAGE KEYS:
 * - ONBOARDING_FORM_DATA: Stores onboarding form data during registration flow
 * - TUTORIAL_STATE: Stores tutorial progress and state
 * - TUTORIAL_MAX_ACCESSED_PROFILE_TAB: Tracks the furthest tab accessed during tutorial
 * - FIRESTORE_INITIALIZED: Flag to prevent multiple Firestore initializations
 * - BANKING_ACCESS_GRANTED: Stores timestamp when banking access was granted
 * - PHONE_VERIFICATION: Stores phone verification data during onboarding
 * - RECAPTCHA_VERIFICATION: Stores reCAPTCHA verification status
 * - RECAPTCHA_RESPONSE: Stores reCAPTCHA response token
 * - AUTOFILL_CACHE: Caches extracted document data for autofill (userId required)
 * - PROFILE_DRAFT: Stores draft profile data per tab (activeTab required)
 * - DOCUMENT_PROCESSING_CACHE: Caches document processing results (userId required)
 * - POPUP_SHOWN: Tracks if a popup has been shown (popupId required)
 * 
 * COOKIE KEYS:
 * - WORKSPACE: Stores selected workspace information
 * - IMPERSONATION_SESSION: Stores admin impersonation session ID
 * - SESSION_TOKEN: Stores workspace session token (workspaceType, facilityId required)
 * - NEWSLETTER_SUBSCRIPTION_COUNT: Tracks newsletter subscription attempts
 * - NEWSLETTER_LAST_SUBSCRIPTION_TIME: Stores last newsletter subscription timestamp
 * 
 * NOTE: PROFILE_COMPLETE and TUTORIAL_PASSED removed - use tutorialAccessMode in profile collections
 * 
 * FIRESTORE COLLECTIONS:
 * - USERS: Core user identity and authentication data
 * - PROFESSIONAL_PROFILES: Detailed professional profile information
 * - FACILITY_PROFILES: Facility/employer profile information
 * - ADMINS: Admin user accounts and permissions
 * - CONVERSATIONS: Chat conversations between users
 * - MESSAGES: Individual messages within conversations
 * - CONTRACTS: Signed contracts between professionals and facilities
 * - NOTIFICATIONS: User notifications
 * 
 * ENVIRONMENT VARIABLES:
 * - FIREBASE_*: Firebase configuration values
 * - USE_FIREBASE_EMULATORS: Flag to enable Firebase emulators
 * - FIREBASE_*_EMULATOR_URL: Emulator connection URLs
 * - API_BASE_URL / API_BASE: API endpoint base URLs
 * 
 * WORKSPACE TYPES:
 * - PERSONAL: Professional's personal workspace (determined by professionalProfiles existence)
 * - FACILITY: Facility workspace (determined by users.roles array)
 * - ADMIN: Medishift admin workspace (determined by admins collection)
 */

export default {
  LOCALSTORAGE_KEYS,
  SESSIONSTORAGE_KEYS,
  COOKIE_KEYS,
  COOKIE_CONFIG,
  FIRESTORE_COLLECTIONS,
  FIRESTORE_DATABASE_NAME,
  ENV_VARS,
  SESSION_PREFIXES,
  INDEXEDDB_DATABASES,
  WINDOW_FLAGS,
  WORKSPACE_TYPES,
  FIREBASE_CONFIG_KEYS,
  FIREBASE_EMULATOR_CONFIG,
  DEFAULT_VALUES,
  getLocalStorageKey,
  getCookieKey,
  getEnvVar,
  getCollectionName
};

