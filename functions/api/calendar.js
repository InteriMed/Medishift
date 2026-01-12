// Migrated to v2
// const functions = require('firebase-functions/v1');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onRequest } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

// Initialize Firestore
const db = admin.firestore();

/**
 * Save a calendar event (availability)
 */
exports.saveCalendarEvent = onCall(async (request) => {
  // V2 compatibility shim
  const data = request.data;
  const context = { auth: request.auth };

  // Ensure user is authenticated
  if (!context.auth) {
    throw new HttpsError(
      'unauthenticated',
      'You must be signed in to save calendar events'
    );
  }

  try {
    const { userId, title, start, end, color, color1, color2, notes, location, isAvailability, isValidated, canton, area, languages, experience, software, certifications, workAmount } = data;

    // Ensure the caller can only save events for their own account
    if (userId !== context.auth.uid) {
      throw new HttpsError(
        'permission-denied',
        'You can only save events for your own account'
      );
    }

    // Validate required fields
    if (!start || !end) {
      throw new HttpsError(
        'invalid-argument',
        'Start and end times are required'
      );
    }

    // Validate date format
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new HttpsError(
        'invalid-argument',
        'Invalid date format'
      );
    }

    if (startDate >= endDate) {
      throw new HttpsError(
        'invalid-argument',
        'End time must be after start time'
      );
    }

    // Prepare event data for Firestore
    const eventData = {
      userId: userId,
      title: title || 'Available',
      from: startDate.toISOString(),
      to: endDate.toISOString(),
      color: color || '#0f54bc',
      color1: color1 || '#a8c1ff',
      color2: color2 || '#4da6fb',
      notes: notes || '',
      location: location || '',
      isAvailability: isAvailability !== false, // Default to true
      isValidated: isValidated !== false, // Default to true
      recurring: false,
      // Additional fields
      locationCountry: canton || [],
      LocationArea: area || [],
      languages: languages || [],
      experience: experience || '',
      software: software || [],
      certifications: certifications || [],
      workAmount: workAmount || '',
      created: admin.firestore.FieldValue.serverTimestamp(),
      updated: admin.firestore.FieldValue.serverTimestamp()
    };

    // Save to availability collection
    const docRef = await db.collection('availability').add(eventData);

    logger.info('Calendar event saved', {
      eventId: docRef.id,
      userId: userId,
      start: start,
      end: end
    });

    return {
      success: true,
      id: docRef.id
    };
  } catch (error) {
    logger.error('Error saving calendar event', error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError(
      'internal',
      'Error saving calendar event'
    );
  }
});

/**
 * Update a calendar event
 */
exports.updateCalendarEvent = onCall(async (request) => {
  // V2 compatibility shim
  const data = request.data;
  const context = { auth: request.auth };

  // Ensure user is authenticated
  if (!context.auth) {
    throw new HttpsError(
      'unauthenticated',
      'You must be signed in to update calendar events'
    );
  }

  try {
    const { eventId, userId, accountType, title, start, end, color, color1, color2, notes, location, isValidated, isRecurring, recurrenceId, canton, area, languages, experience, software, certifications, workAmount, isAvailability } = data;

    // Ensure the caller can only update events for their own account
    if (userId !== context.auth.uid) {
      throw new HttpsError(
        'permission-denied',
        'You can only update events for your own account'
      );
    }

    if (!eventId) {
      throw new HttpsError(
        'invalid-argument',
        'Event ID is required'
      );
    }

    // Choose collection based on account type
    const collectionName = accountType === 'manager' ? 'jobs-listing' : 'availability';

    // Get the document reference
    const eventRef = db.collection(collectionName).doc(eventId);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) {
      throw new HttpsError(
        'not-found',
        'Event not found'
      );
    }

    const eventData = eventDoc.data();

    // Check if user owns this event
    const userField = collectionName === 'availability' ? 'userId' : 'user_id';
    if (eventData[userField] !== userId) {
      throw new HttpsError(
        'permission-denied',
        'You do not have permission to update this event'
      );
    }

    // Prepare update data
    const updateData = {
      updated: admin.firestore.FieldValue.serverTimestamp()
    };

    if (title !== undefined) updateData.title = title;
    if (start) {
      const startDate = new Date(start);
      if (isNaN(startDate.getTime())) {
        throw new HttpsError('invalid-argument', 'Invalid start date');
      }
      updateData.from = startDate.toISOString();
    }
    if (end) {
      const endDate = new Date(end);
      if (isNaN(endDate.getTime())) {
        throw new HttpsError('invalid-argument', 'Invalid end date');
      }
      updateData.to = endDate.toISOString();
    }
    if (color !== undefined) updateData.color = color;
    if (color1 !== undefined) updateData.color1 = color1;
    if (color2 !== undefined) updateData.color2 = color2;
    if (notes !== undefined) updateData.notes = notes;
    if (location !== undefined) updateData.location = location;
    if (isValidated !== undefined) updateData.isValidated = isValidated;

    // Handle recurrence fields
    if (isRecurring !== undefined) {
      updateData.recurring = isRecurring;
      if (isRecurring && recurrenceId) {
        updateData.recurrenceId = recurrenceId;
      } else if (!isRecurring) {
        updateData.recurrenceId = admin.firestore.FieldValue.delete();
      }
    }

    // Add availability-specific fields
    if (collectionName === 'availability') {
      if (canton !== undefined) updateData.locationCountry = canton;
      if (area !== undefined) updateData.LocationArea = area;
      if (languages !== undefined) updateData.languages = languages;
      if (experience !== undefined) updateData.experience = experience;
      if (software !== undefined) updateData.software = software;
      if (certifications !== undefined) updateData.certifications = certifications;
      if (workAmount !== undefined) updateData.workAmount = workAmount;
      if (isAvailability !== undefined) updateData.isAvailability = isAvailability;
    }

    // Validate date order if both dates are being updated
    if (updateData.from && updateData.to) {
      if (new Date(updateData.from) >= new Date(updateData.to)) {
        throw new HttpsError(
          'invalid-argument',
          'End time must be after start time'
        );
      }
    }

    // Update the document
    await eventRef.update(updateData);

    logger.info('Calendar event updated', {
      eventId: eventId,
      userId: userId,
      updateFields: Object.keys(updateData)
    });

    return {
      success: true
    };
  } catch (error) {
    logger.error('Error updating calendar event', error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError(
      'internal',
      'Error updating calendar event'
    );
  }
});

/**
 * Delete a calendar event
 */
exports.deleteCalendarEvent = onCall(async (request) => {
  // V2 compatibility shim
  const data = request.data;
  const context = { auth: request.auth };

  // Ensure user is authenticated
  if (!context.auth) {
    throw new HttpsError(
      'unauthenticated',
      'You must be signed in to delete calendar events'
    );
  }

  try {
    const { eventId, userId, accountType, deleteType, recurrenceId } = data;

    // Ensure the caller can only delete events for their own account
    if (userId !== context.auth.uid) {
      throw new HttpsError(
        'permission-denied',
        'You can only delete events for your own account'
      );
    }

    if (!eventId) {
      throw new HttpsError(
        'invalid-argument',
        'Event ID is required'
      );
    }

    // Choose collection based on account type
    const collectionName = accountType === 'manager' ? 'jobs-listing' : 'availability';

    let deletedCount = 0;

    if (deleteType === 'single' || !recurrenceId) {
      // Delete single event
      const eventRef = db.collection(collectionName).doc(eventId);
      const eventDoc = await eventRef.get();

      if (!eventDoc.exists) {
        throw new HttpsError(
          'not-found',
          'Event not found'
        );
      }

      const eventData = eventDoc.data();
      const userField = collectionName === 'availability' ? 'userId' : 'user_id';

      if (eventData[userField] !== userId) {
        throw new HttpsError(
          'permission-denied',
          'You do not have permission to delete this event'
        );
      }

      await eventRef.delete();
      deletedCount = 1;
    } else if (deleteType === 'all' && recurrenceId) {
      // Delete all events in the series
      const seriesQuery = db.collection(collectionName)
        .where('recurrenceId', '==', recurrenceId)
        .where(collectionName === 'availability' ? 'userId' : 'user_id', '==', userId);

      const seriesSnapshot = await seriesQuery.get();

      if (seriesSnapshot.empty) {
        throw new HttpsError(
          'not-found',
          'No events found in the series'
        );
      }

      // Delete all events in batches
      const batch = db.batch();
      seriesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      deletedCount = seriesSnapshot.size;
    } else if (deleteType === 'future' && recurrenceId) {
      // Delete future events in the series
      const eventRef = db.collection(collectionName).doc(eventId);
      const eventDoc = await eventRef.get();

      if (!eventDoc.exists) {
        throw new HttpsError(
          'not-found',
          'Event not found'
        );
      }

      const eventData = eventDoc.data();
      const currentEventDate = new Date(eventData.from);

      // Find all future events in the series
      const seriesQuery = db.collection(collectionName)
        .where('recurrenceId', '==', recurrenceId)
        .where(collectionName === 'availability' ? 'userId' : 'user_id', '==', userId);

      const seriesSnapshot = await seriesQuery.get();

      // Filter for future events and delete them
      const batch = db.batch();
      seriesSnapshot.docs.forEach(doc => {
        const docData = doc.data();
        const eventDate = new Date(docData.from);

        if (eventDate >= currentEventDate) {
          batch.delete(doc.ref);
          deletedCount++;
        }
      });

      if (deletedCount > 0) {
        await batch.commit();
      }
    }

    logger.info('Calendar events deleted', {
      eventId: eventId,
      userId: userId,
      deleteType: deleteType,
      count: deletedCount
    });

    return {
      success: true,
      count: deletedCount
    };
  } catch (error) {
    logger.error('Error deleting calendar event', error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError(
      'internal',
      'Error deleting calendar event'
    );
  }
});

/**
 * Save recurring calendar events
 */
exports.saveRecurringEvents = onCall(async (request) => {
  // V2 compatibility shim
  const data = request.data;
  const context = { auth: request.auth };

  // Ensure user is authenticated
  if (!context.auth) {
    throw new HttpsError(
      'unauthenticated',
      'You must be signed in to save recurring events'
    );
  }

  try {
    const { userId, baseEvent } = data;

    // Ensure the caller can only save events for their own account
    if (userId !== context.auth.uid) {
      throw new HttpsError(
        'permission-denied',
        'You can only save events for your own account'
      );
    }

    if (!baseEvent || !baseEvent.start || !baseEvent.end) {
      throw new HttpsError(
        'invalid-argument',
        'Base event with start and end times is required'
      );
    }

    // Generate recurrence ID
    const recurrenceId = `${userId}_${Date.now()}_recurrence`;

    // Generate recurring dates
    const startDate = new Date(baseEvent.start);
    const endDate = new Date(baseEvent.end);
    const duration = endDate.getTime() - startDate.getTime();

    // Calculate end repeat date
    let endRepeatDate;
    if (baseEvent.endRepeatDate) {
      endRepeatDate = new Date(baseEvent.endRepeatDate);
    } else {
      // Default to 3 months from start if no end date provided
      endRepeatDate = new Date(startDate);
      endRepeatDate.setMonth(endRepeatDate.getMonth() + 3);
    }

    // Generate occurrence dates based on repeat pattern
    const occurrences = generateRecurringDates(
      startDate,
      baseEvent.repeatValue || 'Every Day',
      baseEvent.endRepeatValue || 'On Date',
      baseEvent.endRepeatCount || 30,
      endRepeatDate
    );

    // Save all occurrences in batches
    const batchSize = 500; // Firestore batch limit
    const batches = [];
    let currentBatch = db.batch();
    let operationCount = 0;

    for (let i = 0; i < occurrences.length; i++) {
      const occurrence = occurrences[i];
      const isLastOccurrence = i === occurrences.length - 1;

      const occurrenceEnd = new Date(occurrence.getTime() + duration);

      const eventData = {
        userId: userId,
        title: baseEvent.title || 'Available',
        from: occurrence.toISOString(),
        to: occurrenceEnd.toISOString(),
        color: baseEvent.color || '#0f54bc',
        color1: baseEvent.color1 || '#a8c1ff',
        color2: baseEvent.color2 || '#4da6fb',
        notes: baseEvent.notes || '',
        location: baseEvent.location || '',
        isAvailability: baseEvent.isAvailability !== false,
        isValidated: baseEvent.isValidated !== false,
        recurring: true,
        recurrenceId: recurrenceId,
        isLastOccurrence: isLastOccurrence,
        // Additional fields
        locationCountry: baseEvent.canton || [],
        LocationArea: baseEvent.area || [],
        languages: baseEvent.languages || [],
        experience: baseEvent.experience || '',
        software: baseEvent.software || [],
        certifications: baseEvent.certifications || [],
        workAmount: baseEvent.workAmount || '',
        created: admin.firestore.FieldValue.serverTimestamp(),
        updated: admin.firestore.FieldValue.serverTimestamp()
      };

      const docRef = db.collection('availability').doc();
      currentBatch.set(docRef, eventData);
      operationCount++;

      // If we've reached the batch limit, commit and start a new batch
      if (operationCount === batchSize) {
        batches.push(currentBatch.commit());
        currentBatch = db.batch();
        operationCount = 0;
      }
    }

    // Commit any remaining operations
    if (operationCount > 0) {
      batches.push(currentBatch.commit());
    }

    // Wait for all batches to complete
    await Promise.all(batches);

    logger.info('Recurring events saved', {
      userId: userId,
      recurrenceId: recurrenceId,
      count: occurrences.length
    });

    return {
      success: true,
      recurrenceId: recurrenceId,
      count: occurrences.length
    };
  } catch (error) {
    logger.error('Error saving recurring events', error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError(
      'internal',
      'Error saving recurring events'
    );
  }
});

/**
 * Helper function to generate recurring dates
 */
function generateRecurringDates(startDate, repeatValue, endRepeatValue, endRepeatCount, endRepeatDate) {
  const dates = [];
  const currentDate = new Date(startDate);

  // Determine end condition
  const maxOccurrences = endRepeatValue === 'After' ? endRepeatCount : 200; // Safety limit
  const endDate = endRepeatValue === 'On Date' ? endRepeatDate : new Date(startDate.getTime() + (365 * 24 * 60 * 60 * 1000)); // 1 year default

  let count = 0;

  while (count < maxOccurrences && currentDate <= endDate) {
    dates.push(new Date(currentDate));
    count++;

    // Advance to next occurrence
    switch (repeatValue) {
      case 'Every Day':
        currentDate.setDate(currentDate.getDate() + 1);
        break;
      case 'Every Week':
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case 'Every Month':
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
      default:
        // Default to daily if unknown repeat value
        currentDate.setDate(currentDate.getDate() + 1);
        break;
    }
  }

  return dates;
}

// Legacy calendar sync endpoint (keep for backward compatibility)
exports.calendarSync = onCall(async (request) => {
  // V2 compatibility shim
  const data = request.data;
  const context = { auth: request.auth };

  // Ensure user is authenticated
  if (!context.auth) {
    throw new HttpsError(
      'unauthenticated',
      'You must be signed in to sync calendars'
    );
  }

  try {
    const { userId, calendarId, events } = data;

    // Ensure the caller can only sync their own calendar
    if (userId !== context.auth.uid) {
      throw new HttpsError(
        'permission-denied',
        'You can only sync your own calendar'
      );
    }

    // Log the sync request
    logger.info('Calendar sync request', { userId, calendarId, eventCount: events.length });

    // Get user's existing calendar data
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new HttpsError(
        'not-found',
        'User not found'
      );
    }

    // Update calendar reference in user document
    await userRef.update({
      connectedCalendars: admin.firestore.FieldValue.arrayUnion(calendarId),
      lastCalendarSync: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      message: 'Calendar synced successfully'
    };
  } catch (error) {
    logger.error('Error syncing calendar', error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError(
      'internal',
      'Error syncing calendar'
    );
  }
});

// HTTP version for external services
exports.calendarWebhook = onRequest({ region: 'europe-west6', cors: true }, (req, res) => {
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
      logger.error('Error in calendar webhook', error);
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
    logger.error('Error verifying API key', error);
    return false;
  }
}

/**
 * Check for conflicts and create event (comprehensive validation)
 * Updated to use onRequest with CORS for better compatibility
 */
exports.checkAndCreateEventHTTP = onRequest({ region: 'europe-west6', cors: true }, async (req, res) => {
  // Enable CORS
  cors(req, res, async () => {
    try {
      // Handle preflight OPTIONS request
      if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
      }

      // Only accept POST requests
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }

      // Get the authorization token
      const authorization = req.headers.authorization;
      if (!authorization || !authorization.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Verify the token
      const token = authorization.split('Bearer ')[1];
      let decodedToken;
      try {
        decodedToken = await admin.auth().verifyIdToken(token);
      } catch (error) {
        console.error('Token verification failed:', error);
        res.status(401).json({ error: 'Invalid token' });
        return;
      }

      const {
        workspaceContext,
        eventType,
        eventData,
        targetUserId,
        recurrenceSettings
      } = req.body;

      console.log('checkAndCreateEventHTTP called with:', {
        workspaceContext,
        eventType,
        eventData,
        targetUserId,
        recurrenceSettings,
        authUID: decodedToken.uid
      });

      // Validate inputs
      if (!workspaceContext || !eventType || !eventData || !targetUserId) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters'
        });
        return;
      }

      // Authorization: Verify user has permission to create this type of event
      if (targetUserId !== decodedToken.uid) {
        // Additional checks for managers creating events for employees
        if (workspaceContext.type === 'team' && workspaceContext.facilityProfileId) {
          const facilityDoc = await db.collection('facilityProfiles').doc(workspaceContext.facilityProfileId).get();
          if (!facilityDoc.exists) {
            res.status(404).json({
              success: false,
              error: 'Facility not found'
            });
            return;
          }

          const facilityData = facilityDoc.data();
          if (!facilityData.admin.includes(decodedToken.uid)) {
            res.status(403).json({
              success: false,
              error: 'Only facility admins can create events for employees'
            });
            return;
          }
        } else {
          res.status(403).json({
            success: false,
            error: 'You can only create events for yourself'
          });
          return;
        }
      }

      // Validate date format and logic
      const startDate = new Date(eventData.startTime);
      const endDate = new Date(eventData.endTime);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        res.status(400).json({
          success: false,
          error: 'Invalid date format'
        });
        return;
      }

      if (startDate >= endDate) {
        res.status(400).json({
          success: false,
          error: 'End time must be after start time'
        });
        return;
      }

      console.log('Validation passed, creating event of type:', eventType);

      // CONFLICT DETECTION: ONLY for Workers (availability, contracts, timeOffRequests)
      // SKIP conflict detection for Facility positions (eventType === 'position')
      const conflicts = [];

      if (eventType !== 'position') {
        // 1. Check availability conflicts (for professionals)
        const availabilityQuery = await db.collection('availability')
          .where('userId', '==', targetUserId)
          .where('from', '<=', endDate.toISOString())
          .get();

        availabilityQuery.docs.forEach(doc => {
          const availData = doc.data();
          const existingStart = new Date(availData.from);
          const existingEnd = new Date(availData.to);

          // Check for overlap: (newStart < existingEnd) && (newEnd > existingStart)
          if (startDate < existingEnd && endDate > existingStart) {
            conflicts.push({
              type: 'availability',
              id: doc.id,
              summary: `Available: ${existingStart.toLocaleString()} - ${existingEnd.toLocaleString()}`
            });
          }
        });

        // 2. Check contract conflicts
        const contractsQuery = await db.collection('contracts')
          .where('workerId', '==', targetUserId)
          .where('status', '==', 'active')
          .get();

        contractsQuery.docs.forEach(doc => {
          const contractData = doc.data();
          const existingStart = new Date(contractData.from);
          const existingEnd = new Date(contractData.to);

          if (startDate < existingEnd && endDate > existingStart) {
            conflicts.push({
              type: 'contract',
              id: doc.id,
              summary: `Contract: ${contractData.title || 'Untitled'} (${existingStart.toLocaleString()} - ${existingEnd.toLocaleString()})`
            });
          }
        });

        // 3. Check time-off requests conflicts
        const timeOffQuery = await db.collection('timeOffRequests')
          .where('userId', '==', targetUserId)
          .where('status', 'in', ['approved', 'pending'])
          .get();

        timeOffQuery.docs.forEach(doc => {
          const timeOffData = doc.data();
          const existingStart = new Date(timeOffData.startTime);
          const existingEnd = new Date(timeOffData.endTime);

          if (startDate < existingEnd && endDate > existingStart) {
            conflicts.push({
              type: 'timeOff',
              id: doc.id,
              summary: `Time Off: ${timeOffData.type || 'Leave'} (${existingStart.toLocaleString()} - ${existingEnd.toLocaleString()})`
            });
          }
        });

        // 4. Check team schedule conflicts (if in team workspace)
        if (workspaceContext.type === 'team' && workspaceContext.facilityProfileId) {
          const schedulesQuery = await db.collectionGroup('shifts')
            .where('userId', '==', targetUserId)
            .get();

          schedulesQuery.docs.forEach(doc => {
            const shiftData = doc.data();
            const existingStart = new Date(shiftData.startTime);
            const existingEnd = new Date(shiftData.endTime);

            if (startDate < existingEnd && endDate > existingStart) {
              conflicts.push({
                type: 'teamShift',
                id: doc.id,
                summary: `Team Shift: ${shiftData.roleOrTask || 'Shift'} (${existingStart.toLocaleString()} - ${existingEnd.toLocaleString()})`
              });
            }
          });
        }
      } // End of if (eventType !== 'position')

      // If conflicts detected, return them
      if (conflicts.length > 0) {
        console.log('Conflicts detected:', conflicts);
        res.status(200).json({
          success: false,
          error: 'conflict',
          conflicts: conflicts
        });
        return;
      }

      // NO CONFLICTS: Proceed to create the event(s)
      let result;

      if (recurrenceSettings && recurrenceSettings.isRecurring) {
        // Create recurring events
        result = await createRecurringEvent(eventType, eventData, targetUserId, workspaceContext, recurrenceSettings);
      } else {
        // Create single event
        result = await createSingleEvent(eventType, eventData, targetUserId, workspaceContext);
      }

      console.log('Event creation result:', result);

      logger.info('Event created successfully', {
        eventType,
        targetUserId,
        workspaceContext,
        resultId: result.id || result.recurrenceId
      });

      res.status(200).json(result);

    } catch (error) {
      console.error('Error in checkAndCreateEventHTTP:', error);
      logger.error('Error in checkAndCreateEventHTTP', error);

      res.status(500).json({
        success: false,
        error: `Error creating event: ${error.message}`
      });
    }
  });
});

/**
 * Check for conflicts and create event (comprehensive validation)
 * @deprecated - Use checkAndCreateEventHTTP instead for better CORS support
 */
exports.checkAndCreateEvent = onCall(async (request) => {
  // V2 compatibility shim
  const data = request.data;
  const context = { auth: request.auth };

  // Ensure user is authenticated
  if (!context.auth) {
    throw new HttpsError(
      'unauthenticated',
      'You must be signed in to create events'
    );
  }

  try {
    const {
      workspaceContext,
      eventType,
      eventData,
      targetUserId,
      recurrenceSettings
    } = data;

    console.log('checkAndCreateEvent called with:', {
      workspaceContext,
      eventType,
      eventData,
      targetUserId,
      recurrenceSettings,
      authUID: context.auth.uid
    });

    // Validate inputs
    if (!workspaceContext || !eventType || !eventData || !targetUserId) {
      throw new HttpsError(
        'invalid-argument',
        'Missing required parameters'
      );
    }

    // Authorization: Verify user has permission to create this type of event
    if (targetUserId !== context.auth.uid) {
      // Additional checks for managers creating events for employees
      if (workspaceContext.type === 'team' && workspaceContext.facilityProfileId) {
        const facilityDoc = await db.collection('facilityProfiles').doc(workspaceContext.facilityProfileId).get();
        if (!facilityDoc.exists) {
          throw new HttpsError('not-found', 'Facility not found');
        }

        const facilityData = facilityDoc.data();
        if (!facilityData.admin.includes(context.auth.uid)) {
          throw new HttpsError('permission-denied', 'Only facility admins can create events for employees');
        }
      } else {
        throw new HttpsError('permission-denied', 'You can only create events for yourself');
      }
    }

    // Validate date format and logic
    const startDate = new Date(eventData.startTime);
    const endDate = new Date(eventData.endTime);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new HttpsError('invalid-argument', 'Invalid date format');
    }

    if (startDate >= endDate) {
      throw new HttpsError('invalid-argument', 'End time must be after start time');
    }

    console.log('Validation passed, creating event of type:', eventType);

    // CONFLICT DETECTION: ONLY for Workers (availability, contracts, timeOffRequests)
    // SKIP conflict detection for Facility positions (eventType === 'position')
    const conflicts = [];

    if (eventType !== 'position') {
      // 1. Check availability conflicts (for professionals)
      const availabilityQuery = await db.collection('availability')
        .where('userId', '==', targetUserId)
        .where('from', '<=', endDate.toISOString())
        .get();

      availabilityQuery.docs.forEach(doc => {
        const availData = doc.data();
        const existingStart = new Date(availData.from);
        const existingEnd = new Date(availData.to);

        // Check for overlap: (newStart < existingEnd) && (newEnd > existingStart)
        if (startDate < existingEnd && endDate > existingStart) {
          conflicts.push({
            type: 'availability',
            id: doc.id,
            summary: `Available: ${existingStart.toLocaleString()} - ${existingEnd.toLocaleString()}`
          });
        }
      });

      // 2. Check contract conflicts
      const contractsQuery = await db.collection('contracts')
        .where('workerId', '==', targetUserId)
        .where('status', '==', 'active')
        .get();

      contractsQuery.docs.forEach(doc => {
        const contractData = doc.data();
        const existingStart = new Date(contractData.from);
        const existingEnd = new Date(contractData.to);

        if (startDate < existingEnd && endDate > existingStart) {
          conflicts.push({
            type: 'contract',
            id: doc.id,
            summary: `Contract: ${contractData.title || 'Untitled'} (${existingStart.toLocaleString()} - ${existingEnd.toLocaleString()})`
          });
        }
      });

      // 3. Check time-off requests conflicts
      const timeOffQuery = await db.collection('timeOffRequests')
        .where('userId', '==', targetUserId)
        .where('status', 'in', ['approved', 'pending'])
        .get();

      timeOffQuery.docs.forEach(doc => {
        const timeOffData = doc.data();
        const existingStart = new Date(timeOffData.startTime);
        const existingEnd = new Date(timeOffData.endTime);

        if (startDate < existingEnd && endDate > existingStart) {
          conflicts.push({
            type: 'timeOff',
            id: doc.id,
            summary: `Time Off: ${timeOffData.type || 'Leave'} (${existingStart.toLocaleString()} - ${existingEnd.toLocaleString()})`
          });
        }
      });

      // 4. Check team schedule conflicts (if in team workspace)
      if (workspaceContext.type === 'team' && workspaceContext.facilityProfileId) {
        const schedulesQuery = await db.collectionGroup('shifts')
          .where('userId', '==', targetUserId)
          .get();

        schedulesQuery.docs.forEach(doc => {
          const shiftData = doc.data();
          const existingStart = new Date(shiftData.startTime);
          const existingEnd = new Date(shiftData.endTime);

          if (startDate < existingEnd && endDate > existingStart) {
            conflicts.push({
              type: 'teamShift',
              id: doc.id,
              summary: `Team Shift: ${shiftData.roleOrTask || 'Shift'} (${existingStart.toLocaleString()} - ${existingEnd.toLocaleString()})`
            });
          }
        });
      }
    } // End of if (eventType !== 'position')

    // If conflicts detected, return them
    if (conflicts.length > 0) {
      console.log('Conflicts detected:', conflicts);
      return {
        success: false,
        error: 'conflict',
        conflicts: conflicts
      };
    }

    // NO CONFLICTS: Proceed to create the event(s)
    let result;

    if (recurrenceSettings && recurrenceSettings.isRecurring) {
      // Create recurring events
      result = await createRecurringEvent(eventType, eventData, targetUserId, workspaceContext, recurrenceSettings);
    } else {
      // Create single event
      result = await createSingleEvent(eventType, eventData, targetUserId, workspaceContext);
    }

    console.log('Event creation result:', result);

    logger.info('Event created successfully', {
      eventType,
      targetUserId,
      workspaceContext,
      resultId: result.id || result.recurrenceId
    });

    return result;

  } catch (error) {
    console.error('Error in checkAndCreateEvent:', error);
    logger.error('Error in checkAndCreateEvent', error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError('internal', `Error creating event: ${error.message}`);
  }
});

/**
 * Helper function to create a single event
 */
async function createSingleEvent(eventType, eventData, targetUserId, workspaceContext) {
  let collection, docData;

  switch (eventType) {
    case 'availability':
      collection = 'availability';
      docData = {
        userId: targetUserId,
        professionalProfileId: targetUserId, // Assuming profileId matches userId
        from: new Date(eventData.startTime).toISOString(), // Use 'from' field expected by frontend
        to: new Date(eventData.endTime).toISOString(),     // Use 'to' field expected by frontend
        title: eventData.title || 'Available',
        color: eventData.color || '#8c8c8c',
        color1: eventData.color1 || '#e6e6e6',
        color2: eventData.color2 || '#b3b3b3',
        notes: eventData.notes || '',
        location: eventData.location || '',
        isAvailability: true,
        isValidated: eventData.isValidated !== false, // Default to true
        recurring: false,
        // Additional fields that frontend expects
        locationCountry: eventData.locationCountry || [],
        LocationArea: eventData.LocationArea || [],
        languages: eventData.languages || [],
        experience: eventData.experience || '',
        software: eventData.software || [],
        certifications: eventData.certifications || [],
        workAmount: eventData.workAmount || '',
        created: admin.firestore.FieldValue.serverTimestamp(),
        updated: admin.firestore.FieldValue.serverTimestamp()
      };
      break;

    case 'timeOffRequest':
      collection = 'timeOffRequests';
      docData = {
        facilityProfileId: workspaceContext.facilityProfileId,
        userId: targetUserId,
        startTime: admin.firestore.Timestamp.fromDate(new Date(eventData.startTime)),
        endTime: admin.firestore.Timestamp.fromDate(new Date(eventData.endTime)),
        type: eventData.type || 'vacation',
        reason: eventData.notes || '',
        status: workspaceContext.managerCreated ? 'approved' : 'pending',
        approvedByUserId: workspaceContext.managerCreated ? workspaceContext.managerId : null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      break;

    case 'position':
      collection = 'positions';
      docData = {
        facilityProfileId: workspaceContext.facilityProfileId,
        postedByUserId: targetUserId,
        status: 'open',
        jobTitle: eventData.title || 'Open Position',
        jobType: eventData.jobType || 'general',
        startTime: admin.firestore.Timestamp.fromDate(new Date(eventData.startTime)),
        endTime: admin.firestore.Timestamp.fromDate(new Date(eventData.endTime)),
        location: eventData.location || {},
        description: eventData.notes || '',
        compensation: eventData.compensation || {},
        created: admin.firestore.FieldValue.serverTimestamp(),
        updated: admin.firestore.FieldValue.serverTimestamp()
      };
      break;

    case 'teamShift':
      // For team shifts, we need to create in the appropriate schedule
      const scheduleId = `${workspaceContext.facilityProfileId}_${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      const shiftRef = db.collection('teamSchedules').doc(scheduleId).collection('shifts').doc();

      docData = {
        userId: targetUserId,
        startTime: admin.firestore.Timestamp.fromDate(new Date(eventData.startTime)),
        endTime: admin.firestore.Timestamp.fromDate(new Date(eventData.endTime)),
        roleOrTask: eventData.roleOrTask || 'General Shift',
        notes: eventData.notes || '',
        isSublettable: false,
        subletStatus: 'none',
        created: admin.firestore.FieldValue.serverTimestamp()
      };

      await shiftRef.set(docData);
      return { success: true, id: shiftRef.id, collection: 'teamSchedules/shifts' };

    default:
      throw new HttpsError('invalid-argument', `Unsupported event type: ${eventType}`);
  }

  const docRef = await db.collection(collection).add(docData);

  // Handle side effects for certain event types
  if (eventType === 'timeOffRequest' && docData.status === 'approved') {
    // Create unavailable block in professional availability
    await createUnavailableBlock(targetUserId, eventData.startTime, eventData.endTime, 'timeOff');
  }

  return { success: true, id: docRef.id, collection };
}

/**
 * Helper function to create recurring events
 */
async function createRecurringEvent(eventType, eventData, targetUserId, workspaceContext, recurrenceSettings) {
  const recurrenceId = `${targetUserId}_${Date.now()}_recurrence`;
  const occurrences = generateRecurringDates(
    new Date(eventData.startTime),
    recurrenceSettings.repeatValue || 'Every Week',
    recurrenceSettings.endRepeatValue || 'On Date',
    recurrenceSettings.endRepeatCount || 30,
    recurrenceSettings.endRepeatDate ? new Date(recurrenceSettings.endRepeatDate) : null
  );

  const duration = new Date(eventData.endTime).getTime() - new Date(eventData.startTime).getTime();
  const batch = db.batch();
  let count = 0;

  for (const occurrence of occurrences) {
    const occurrenceEnd = new Date(occurrence.getTime() + duration);

    const occurrenceData = {
      ...eventData,
      startTime: occurrence.toISOString(),
      endTime: occurrenceEnd.toISOString()
    };

    // Create single occurrence
    const singleResult = await createSingleEvent(eventType, occurrenceData, targetUserId, workspaceContext);
    count++;

    if (count >= 500) break; // Firestore batch limit
  }

  return { success: true, recurrenceId, count };
}

/**
 * Helper function to create unavailable blocks
 */
async function createUnavailableBlock(userId, startTime, endTime, reason) {
  try {
    await db.collection('availability').add({
      userId: userId,
      professionalProfileId: userId,
      from: new Date(startTime).toISOString(), // Use 'from' field expected by frontend
      to: new Date(endTime).toISOString(),     // Use 'to' field expected by frontend
      title: `Blocked - ${reason}`,
      color: '#808080', // Grey color for blocked time
      color1: '#e6e6e6',
      color2: '#b3b3b3',
      notes: `Automatically blocked due to ${reason}`,
      location: '',
      isAvailability: false, // This is a blocking event, not availability
      isValidated: true,
      recurring: false,
      // Additional fields
      locationCountry: [],
      LocationArea: [],
      languages: [],
      experience: '',
      software: [],
      certifications: [],
      workAmount: '',
      created: admin.firestore.FieldValue.serverTimestamp(),
      updated: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    logger.error('Error creating unavailable block', error);
  }
} 
