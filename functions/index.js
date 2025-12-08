const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");

// Initialize Firebase Admin
const admin = require('firebase-admin');
admin.initializeApp();

// Import calendar functions
const calendarFunctions = require('./api/calendar');

// Import database functions (profile functions)
const databaseFunctions = require('./database/index');

// Import API functions (contract functions)
const apiFunctions = require('./api/index');

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
exports.updateUserLastLogin = databaseFunctions.updateUserLastLogin;
exports.cleanupDeletedUser = databaseFunctions.cleanupDeletedUser;

// CONTRACT FUNCTIONS - Export from api/index.js
exports.contractAPI = apiFunctions.contractAPI;

// MESSAGE FUNCTIONS - Export from api/index.js
exports.messagesAPI = apiFunctions.messagesAPI;

// MARKETPLACE FUNCTIONS - Export from api/index.js
exports.marketplaceAPI = apiFunctions.marketplaceAPI;

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
