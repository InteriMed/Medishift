/**
 * CENTRALIZED KEYS DATABASE FOR FIREBASE FUNCTIONS
 * Single source of truth for all keys used in Cloud Functions
 * 
 * This file centralizes:
 * - Firestore collection names
 * - Environment variable names
 * - Configuration constants
 * - Default values
 * 
 * IMPORTANT: Always use constants from this file instead of hardcoding keys.
 */

// ============================================================================
// FIRESTORE COLLECTION NAMES
// ============================================================================

const FIRESTORE_COLLECTIONS = {
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
  AUDIT_LOGS: 'auditLogs',
  INVITATIONS: 'invitations'
};

// ============================================================================
// FIRESTORE DATABASE NAME
// ============================================================================

const FIRESTORE_DATABASE_NAME = 'medishift';

// ============================================================================
// ENVIRONMENT VARIABLE NAMES
// ============================================================================

const ENV_VARS = {
  NODE_ENV: 'NODE_ENV',
  GCLOUD_PROJECT: 'GCLOUD_PROJECT',
  GCP_PROJECT: 'GCP_PROJECT',
  FIREBASE_STORAGE_BUCKET: 'FIREBASE_STORAGE_BUCKET',
  LOGGING_LEVEL: 'LOGGING_LEVEL',
  ACCOUNT_DELETION_SALT: 'ACCOUNT_DELETION_SALT'
};

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const DEFAULT_VALUES = {
  FIREBASE_PROJECT_ID: 'interimed-620fd',
  REGION: 'europe-west6',
  AI_REGION: 'europe-west3',
  VISION_ENDPOINT: 'eu-vision.googleapis.com',
  ACCOUNT_DELETION_SALT: 'interimed-gdpr-compliant-2024',
  HASH_ALGORITHM: 'sha256'
};

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

const CONFIG = {
  REGION: 'europe-west6',
  AI_REGION: 'europe-west3',
  VISION_ENDPOINT: 'eu-vision.googleapis.com',
  PAYROLL_EMAIL: 'partners@payrollplus.ch',
  PILOT: {
    ENABLED: true,
    END_DATE: '2025-02-28',
    FEE_PERCENTAGE: 0,
    MESSAGE: 'Pilot Program: 0% commission until Feb 28, 2025'
  },
  DATA_RETENTION: {
    FINANCIAL_RECORDS_YEARS: 10,
    AUDIT_LOGS_YEARS: 10,
    DELETED_ACCOUNTS_YEARS: 10
  },
  SECURITY: {
    HASH_ALGORITHM: 'sha256'
  }
};

// ============================================================================
// CENTRALIZED FUNCTION CONFIGURATION
// ============================================================================

const FUNCTION_CONFIG = {
  region: CONFIG.REGION,
  database: FIRESTORE_DATABASE_NAME,
  cors: true
};

const FUNCTION_CONFIG_REQUEST = {
  region: CONFIG.REGION,
  cors: true
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getEnvVar = (varName) => {
  return process.env[ENV_VARS[varName]];
};

const getCollectionName = (collectionName) => {
  return FIRESTORE_COLLECTIONS[collectionName];
};

const getProjectId = () => {
  return getEnvVar('GCLOUD_PROJECT') || getEnvVar('GCP_PROJECT') || DEFAULT_VALUES.FIREBASE_PROJECT_ID;
};

// ============================================================================
// KEY USAGE DOCUMENTATION
// ============================================================================

/**
 * KEY USAGE REFERENCE:
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
 * - POSITIONS: Job positions posted by facilities
 * - PROFESSIONAL_AVAILABILITIES: Availability listings from professionals
 * - AUDIT_LOGS: System audit logs
 * - INVITATIONS: User invitations
 * 
 * ENVIRONMENT VARIABLES:
 * - GCLOUD_PROJECT / GCP_PROJECT: Google Cloud Project ID
 * - FIREBASE_STORAGE_BUCKET: Firebase Storage bucket name
 * - LOGGING_LEVEL: Logging verbosity level
 * - ACCOUNT_DELETION_SALT: Salt for account deletion hashing
 */

module.exports = {
  FIRESTORE_COLLECTIONS,
  FIRESTORE_DATABASE_NAME,
  ENV_VARS,
  DEFAULT_VALUES,
  CONFIG,
  FUNCTION_CONFIG,
  FUNCTION_CONFIG_REQUEST,
  getEnvVar,
  getCollectionName,
  getProjectId
};

