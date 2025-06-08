const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");

// Initialize Firebase Admin
const admin = require('firebase-admin');
admin.initializeApp();

// Import calendar functions
const calendarFunctions = require('./api/calendar');

// Simplified functions - create basic endpoints

// Health check endpoint
exports.healthCheck = onRequest((req, res) => {
  logger.info("Health check requested", { structuredData: true });
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Example authenticated function
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