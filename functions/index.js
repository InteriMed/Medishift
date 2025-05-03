const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

// Simplified functions - create basic endpoints

// Health check endpoint
exports.healthCheck = onRequest((req, res) => {
  logger.info("Health check requested", { structuredData: true });
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Example authenticated function
exports.getProfile = onCall({ enforceAppCheck: false }, (data, context) => {
  // Check if the user is authenticated
  if (!context.auth) {
    throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
  }

  // Return user profile info
  return {
    uid: context.auth.uid,
    email: context.auth.token.email || null,
    name: context.auth.token.name || null,
    picture: context.auth.token.picture || null,
    success: true
  };
}); 