const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

// Calendar sync endpoint
exports.calendarSync = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be signed in to sync calendars'
    );
  }
  
  try {
    const { userId, calendarId, events } = data;
    
    // Ensure the caller can only sync their own calendar
    if (userId !== context.auth.uid) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'You can only sync your own calendar'
      );
    }
    
    // Log the sync request
    functions.logger.info('Calendar sync request', { userId, calendarId, eventCount: events.length });
    
    // Get user's existing calendar data
    const userRef = admin.firestore().collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'User not found'
      );
    }
    
    // Update calendar reference in user document
    await userRef.update({
      connectedCalendars: admin.firestore.FieldValue.arrayUnion(calendarId),
      lastCalendarSync: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Process calendar events
    const batch = admin.firestore().batch();
    const eventsCollection = admin.firestore().collection('calendarEvents');
    
    // First, query existing events
    const existingEvents = await eventsCollection
      .where('userId', '==', userId)
      .where('calendarId', '==', calendarId)
      .get();
    
    // Keep track of event IDs we've seen in this sync
    const syncedEventIds = new Set();
    
    // Process incoming events
    for (const event of events) {
      syncedEventIds.add(event.id);
      
      // Check if this event already exists
      const existingEventDoc = existingEvents.docs.find(doc => 
        doc.data().externalEventId === event.id
      );
      
      if (existingEventDoc) {
        // Update existing event
        batch.update(existingEventDoc.ref, {
          title: event.title,
          start: admin.firestore.Timestamp.fromDate(new Date(event.start)),
          end: admin.firestore.Timestamp.fromDate(new Date(event.end)),
          allDay: event.allDay || false,
          description: event.description || '',
          location: event.location || '',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        // Create new event
        const newEventRef = eventsCollection.doc();
        batch.set(newEventRef, {
          userId,
          calendarId,
          externalEventId: event.id,
          title: event.title,
          start: admin.firestore.Timestamp.fromDate(new Date(event.start)),
          end: admin.firestore.Timestamp.fromDate(new Date(event.end)),
          allDay: event.allDay || false,
          description: event.description || '',
          location: event.location || '',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }
    
    // Delete events that are no longer in the calendar
    existingEvents.forEach(doc => {
      const eventData = doc.data();
      if (!syncedEventIds.has(eventData.externalEventId)) {
        batch.delete(doc.ref);
      }
    });
    
    // Commit all changes
    await batch.commit();
    
    return {
      success: true,
      message: `Synced ${events.length} events for calendar ${calendarId}`
    };
    
  } catch (error) {
    functions.logger.error('Error syncing calendar', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// HTTP version for external services
exports.calendarWebhook = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      // Only allow POST method
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      
      const data = req.body;
      const { userId, calendarId, events, apiKey } = data;
      
      // Verify API key (should be securely stored and verified)
      const isValidApiKey = await verifyApiKey(apiKey);
      if (!isValidApiKey) {
        return res.status(403).json({ error: 'Invalid API key' });
      }
      
      // Implementation similar to the callable function above
      // ...
      
      return res.status(200).json({
        success: true,
        message: `Synced ${events.length} events for calendar ${calendarId}`
      });
    } catch (error) {
      functions.logger.error('Error in calendar webhook', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
});

// Utility function to verify API key
async function verifyApiKey(apiKey) {
  try {
    const apiKeysSnapshot = await admin.firestore()
      .collection('apiKeys')
      .where('key', '==', apiKey)
      .where('type', '==', 'calendar')
      .where('active', '==', true)
      .get();
    
    return !apiKeysSnapshot.empty;
  } catch (error) {
    functions.logger.error('Error verifying API key', error);
    return false;
  }
} 