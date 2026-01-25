const functions = require('firebase-functions');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onCall } = require('firebase-functions/v2/https');
const { HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');

/**
 * Log client-side error to Firestore and Firebase Error Reporting
 */
const { FUNCTION_CONFIG } = require('../config/keysDatabase');

exports.logClientError = onCall(FUNCTION_CONFIG, async (request) => {
  try {
    // Extract error information
    const { error, errorInfo, metadata } = request.data;

    // Get timestamp
    const timestamp = admin.firestore.FieldValue.serverTimestamp();

    // Get user info from auth context if available
    const userId = request.auth ? request.auth.uid : 'anonymous';

    // Store error in Firestore
    await admin.firestore().collection('client_errors').add({
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      errorInfo: errorInfo || {},
      metadata: metadata || {},
      userId,
      timestamp
    });

    // Log to Firebase Logging
    logger.error('Client Error', {
      error,
      errorInfo,
      metadata,
      userId
    });

    return { success: true };
  } catch (err) {
    logger.error('Error in logClientError function', err);
    throw new HttpsError('internal', 'Error logging client error');
  }
});

/**
 * Scheduled function to analyze errors and send alerts
 * Runs once a day
 */
exports.analyzeErrorTrends = onSchedule({
  schedule: '0 0 * * *'
}, async (event) => {
  try {
    // Get errors from the last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const errorsSnapshot = await admin.firestore()
      .collection('client_errors')
      .where('timestamp', '>=', yesterday)
      .get();

    if (errorsSnapshot.empty) {
      logger.info('No errors in the last 24 hours');
      return null;
    }

    // Group errors by name and count occurrences
    const errorCounts = {};
    errorsSnapshot.forEach(doc => {
      const error = doc.data().error;
      const errorKey = `${error.name}: ${error.message}`;

      if (!errorCounts[errorKey]) {
        errorCounts[errorKey] = 1;
      } else {
        errorCounts[errorKey]++;
      }
    });

    // Find high-frequency errors (more than 5 occurrences)
    const highFrequencyErrors = Object.entries(errorCounts)
      .filter(([_, count]) => count >= 5)
      .map(([error, count]) => ({ error, count }));

    if (highFrequencyErrors.length > 0) {
      // Store analysis results
      await admin.firestore().collection('error_analyses').add({
        date: admin.firestore.FieldValue.serverTimestamp(),
        totalErrors: errorsSnapshot.size,
        highFrequencyErrors
      });

      // You could send notifications here via email, Slack, etc.
      // For example:
      // await sendSlackAlert('High frequency errors detected: ' + JSON.stringify(highFrequencyErrors));
    }

    return null;
  } catch (error) {
    logger.error('Error analyzing error trends', error);
    return null;
  }
}); 