const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const { setGlobalOptions } = require("firebase-functions/v2");

// FORCE ZURICH GLOBALLY
setGlobalOptions({ region: "europe-west6" });

// Initialize Firebase Admin
const admin = require('firebase-admin');
admin.initializeApp({
  databaseId: 'medishift',
  storageBucket: 'interimed-620fd.firebasestorage.app'
});

// Import calendar functions
const calendarFunctions = require('./api/calendar');

// Import database functions (profile functions)
const databaseFunctions = require('./database/index');

// Import API functions (contract functions)
const apiFunctions = require('./api/index');

// Import BAG Admin functions
const bagAdminFunctions = require('./api/BAG_Admin');

// Import document processing function
const documentProcessing = require('./api/processDocument');

// Import invitation functions
const invitationFunctions = require('./api/invitations');

// Simplified functions - create basic endpoints

// Health check endpoint
exports.healthCheck = onRequest((req, res) => {
  logger.info("Health check requested", { structuredData: true });
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// PROFILE FUNCTIONS - Export from database/index.js
exports.getUserProfile = databaseFunctions.getUserProfile;
exports.updateUserProfile = databaseFunctions.updateUserProfile;
exports.createUserProfile = databaseFunctions.createUserProfile;
// exports.updateUserLastLogin = databaseFunctions.updateUserLastLogin;
exports.cleanupDeletedUser = databaseFunctions.cleanupDeletedUser;

// DATABASE TRIGGERS - Export from database/index.js
exports.onContractCreate = databaseFunctions.onContractCreate;
exports.onContractUpdate = databaseFunctions.onContractUpdate;
exports.onPositionUpdate = databaseFunctions.onPositionUpdate;

// CONTRACT FUNCTIONS - Export from api/index.js
exports.contractAPI = apiFunctions.contractAPI;

// MESSAGE FUNCTIONS - Export from api/index.js
exports.messagesAPI = apiFunctions.messagesAPI;

// MARKETPLACE FUNCTIONS - Export from api/index.js
exports.marketplaceAPI = apiFunctions.marketplaceAPI;

// HEALTH REGISTRY FUNCTIONS - Export from api/BAG_Admin.js
exports.healthRegistryAPI = bagAdminFunctions.healthRegistryAPI;
exports.companySearchAPI = bagAdminFunctions.companySearchAPI;
exports.companyDetailsAPI = bagAdminFunctions.companyDetailsAPI;
exports.verifyProfileAPI = bagAdminFunctions.verifyProfileAPI;

// DOCUMENT PROCESSING - Export from api/processDocument.js
exports.processDocument = documentProcessing.processDocument;

// Simplified getProfile function (alternative to getUserProfile)
exports.getProfile = onCall((request) => {
  // Check if the user is authenticated
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
  }

  // Return user profile info
  return {
    uid: request.auth.uid,
    email: request.auth.token.email || null,
    name: request.auth.token.name || null,
    picture: request.auth.token.picture || null,
    success: true
  };
});

// Export calendar functions (these are v1 callable functions - imported directly to preserve their type)
module.exports.saveCalendarEvent = calendarFunctions.saveCalendarEvent;
module.exports.updateCalendarEvent = calendarFunctions.updateCalendarEvent;
module.exports.deleteCalendarEvent = calendarFunctions.deleteCalendarEvent;
module.exports.saveRecurringEvents = calendarFunctions.saveRecurringEvents;
module.exports.calendarSync = calendarFunctions.calendarSync;
module.exports.checkAndCreateEvent = calendarFunctions.checkAndCreateEvent;
module.exports.checkAndCreateEventHTTP = calendarFunctions.checkAndCreateEventHTTP;

// ROLE SYNCHRONIZATION TRIGGERS - Export from triggers/roleSync.js
const roleSyncTriggers = require('./triggers/roleSync');
module.exports.syncAdminRoles = roleSyncTriggers.syncAdminRoles;
module.exports.cleanupRolesOnFacilityDelete = roleSyncTriggers.cleanupRolesOnFacilityDelete;

// AUDIT LOGGING - Export from services/auditLog.js
const auditLogService = require('./services/auditLog');
module.exports.logAudit = auditLogService.logAudit;
module.exports.getAuditLogs = auditLogService.getAuditLogs;

// RATE LIMITING - Export from services/rateLimit.js
const rateLimitService = require('./services/rateLimit');
module.exports.cleanupRateLimits = rateLimitService.cleanupRateLimits;
module.exports.getRateLimitStatus = rateLimitService.getRateLimitStatus;

// =========================================================================
//  🇨🇭 SWISS COMPLIANCE - Phase 1 Implementation
// =========================================================================

// DOCUMENT VERIFICATION (Safe OCR) - Export from api/verifyDocument.js
const documentVerification = require('./api/verifyDocument');
module.exports.verifyPharmacyDocument = documentVerification.verifyPharmacyDocument;

// PAYROLL INTEGRATION (PayrollPlus) - Export from services/payrollService.js
const payrollService = require('./services/payrollService');
module.exports.onPayrollRequestCreated = payrollService.onPayrollRequestCreated;
module.exports.createPayrollRequest = payrollService.createPayrollRequest;
module.exports.getPayrollRequests = payrollService.getPayrollRequests;

// EMPLOYEE LIFECYCLE (Termination/Deletion) - Export from services/employeeLifecycle.js
const employeeLifecycle = require('./services/employeeLifecycle');
module.exports.terminateEmployee = employeeLifecycle.terminateEmployee;
module.exports.deleteAccount = employeeLifecycle.deleteAccount;
module.exports.cleanupExpiredRecords = employeeLifecycle.cleanupExpiredRecords;
module.exports.restoreAccount = employeeLifecycle.restoreAccount;

// =========================================================================
//  🔵 PHASE 2 - Organizations & Chains
// =========================================================================

// ORGANIZATION MANAGEMENT - Export from triggers/organizationSync.js
const organizationSync = require('./triggers/organizationSync');
module.exports.onOrganizationCreated = organizationSync.onOrganizationCreated;
module.exports.onOrganizationUpdated = organizationSync.onOrganizationUpdated;
module.exports.onOrganizationDeleted = organizationSync.onOrganizationDeleted;
module.exports.createOrganization = organizationSync.createOrganization;
module.exports.addFacilityToOrganization = organizationSync.addFacilityToOrganization;
module.exports.removeFacilityFromOrganization = organizationSync.removeFacilityFromOrganization;

// =========================================================================
//  🔒 GDPR/nFADP COMPLIANCE - Account Management API
// =========================================================================

// ACCOUNT MANAGEMENT - Export from api/accountManagement.js
const accountManagement = require('./api/accountManagement');
module.exports.accountDeletionPreview = accountManagement.deletionPreview;     // GET preview of deletion
module.exports.accountDelete = accountManagement.deleteAccount;                 // POST delete account
module.exports.accountBonusEligibility = accountManagement.checkBonusEligibility; // Anti-fraud check
module.exports.accountDataExport = accountManagement.dataExport;                // GDPR data export

// =========================================================================
//  📧 FACILITY INVITATIONS - Role Invitation System
// =========================================================================

// FACILITY INVITATIONS - Export from api/invitations.js
module.exports.generateFacilityRoleInvitation = invitationFunctions.generateFacilityRoleInvitation;
module.exports.getInvitationDetails = invitationFunctions.getInvitationDetails;
module.exports.acceptFacilityInvitation = invitationFunctions.acceptFacilityInvitation;

