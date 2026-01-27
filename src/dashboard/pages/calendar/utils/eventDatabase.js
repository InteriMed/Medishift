import { collection, getDocs, query, where, Timestamp, onSnapshot } from 'firebase/firestore';
import { useState, useEffect, useRef } from 'react';
import { db, auth, firebaseApp } from '../../../../services/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { DEFAULT_VALUES } from '../../../../config/keysDatabase';

const functions = getFunctions(firebaseApp, DEFAULT_VALUES.FIREBASE_REGION);

const saveEventFunction = httpsCallable(functions, 'saveCalendarEvent');
const saveRecurringEventsFunction = httpsCallable(functions, 'saveRecurringEvents');

const checkPermissions = async (uid) => {
  if (!uid) {
    return false;
  }

  // If auth is still initializing, wait a bit
  if (!auth._isInitialized) {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const currentUser = auth.currentUser;

  if (!currentUser) {
    return false;
  }

  if (currentUser.uid !== uid) {
    return false;
  }

  return true;
};

// Function to fetch events from both availability and contracts collections
export const fetchUserEvents = async (userId, accountType = "worker") => {
  try {
    // Function to fetch all contracts if employer, else fetch only contracts related to the user
    const fetchContracts = async () => {
      const contractsRef = collection(db, 'contracts');
      let contractsQuery;

      if (accountType === 'employer') {
        // For employers, fetch all contracts they've created
        contractsQuery = query(contractsRef, where('employerId', '==', userId));
      } else {
        // For workers, fetch contracts where they're assigned
        contractsQuery = query(contractsRef, where('workerId', '==', userId));
      }

      const contractsSnapshot = await getDocs(contractsQuery);
      return contractsSnapshot.docs;
    };

    await checkPermissions(userId);

    const events = [];

    // Fetch availability events
    if (accountType === 'worker') {
      const availabilityRef = collection(db, 'availability');
      const availabilityQuery = query(availabilityRef, where('userId', '==', userId));
      const availabilitySnapshot = await getDocs(availabilityQuery);

      availabilitySnapshot.forEach(doc => {
        const data = doc.data();
        const isValidated = data.isValidated || false;

        // Directly map to category colors
        let eventColor, color1, color2;
        if (isValidated) {
          // Map to blue category - Validated events
          eventColor = '#0f54bc';  // Match blue category color from Calendar.js
          color1 = '#a8c1ff';
          color2 = '#4da6fb';
        } else {
          // Map to grey category - Unvalidated events  
          eventColor = '#8c8c8c';  // Match grey category color from Calendar.js
          color1 = '#e6e6e6';
          color2 = '#b3b3b3';
        }

        // Check if this is a recurring event
        const isRecurring = !!data.recurrenceId;

        events.push({
          id: doc.id,
          title: 'Available',
          start: new Date(data.from),
          end: new Date(data.to),
          color: eventColor,
          color1: color1,
          color2: color2,
          // Include all additional fields for filtering
          canton: data.locationCountry || [],
          area: data.LocationArea || [],
          languages: data.languages || [],
          experience: data.experience || '',
          software: data.software || [],
          certifications: data.certifications || [],
          isAvailability: true, // Mark as availability event
          isValidated: isValidated,
          // Add recurring event info
          recurrenceId: data.recurrenceId || null,
          isRecurring: isRecurring,
          fromDatabase: true // Mark as coming from database
        });
      });

      // Fetch contracts events
      const contractsSnapshot = await fetchContracts();

      contractsSnapshot.forEach(doc => {
        const data = doc.data();
        events.push({
          id: doc.id,
          title: data.title || 'Contract',
          start: new Date(data.from),
          end: new Date(data.to),
          color: '#f54455', // Red color for contracts
          color1: '#ffbbcf',
          color2: '#ff6064',
          location: data.location || '',
          notes: data.notes || '',
          isContract: true, // Mark as contract event
          isValidated: data.isValidated || false,
          fromDatabase: true // Mark as coming from database
        });
      });
    }

    return { success: true, events };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
};

/**
 * Save a single event to database using Firebase functions
 * @param {Object} event - The event to save
 * @param {string} userId - The user ID
 * @returns {Promise<Object>} - Result object with success/error status
 */
export const saveEvent = async (event, userId) => {
  console.log('[eventDatabase] saveEvent called', { eventId: event.id, userId, eventTitle: event.title });
  
  // First check permissions and authentication
  console.log('[eventDatabase] Checking permissions');
  const hasPermission = await checkPermissions(userId);
  if (!hasPermission) {
    console.error('[eventDatabase] Permission denied', { userId });
    return { success: false, error: 'Permission denied' };
  }
  console.log('[eventDatabase] Permissions check passed');

  try {
    // Prepare event data for Firebase function
    console.log('[eventDatabase] Preparing event data');
    const eventData = {
      userId: userId,
      title: event.title || 'Available',
      start: event.start.toISOString(),
      end: event.end.toISOString(),
      color: event.color,
      color1: event.color1,
      color2: event.color2,
      notes: event.notes || '',
      location: event.location || '',
      isAvailability: event.isAvailability !== false, // Default to true
      isValidated: event.isValidated || true,
      // Additional fields
      canton: event.canton || [],
      area: event.area || [],
      languages: event.languages || [],
      experience: event.experience || '',
      software: event.software || [],
      certifications: event.certifications || [],
      workAmount: event.workAmount || ''
    };

    console.log('[eventDatabase] Calling saveCalendarEvent function', {
      userId,
      title: eventData.title,
      start: eventData.start,
      end: eventData.end
    });

    // Use Firebase function for secure server-side validation and saving
    const result = await saveEventFunction(eventData);
    console.log('[eventDatabase] saveCalendarEvent function returned', { success: result.data?.success, id: result.data?.id });

    if (result.data.success) {
      console.log('[eventDatabase] Event saved successfully', { id: result.data.id });
      return {
        success: true,
        id: result.data.id
      };
    } else {
      console.error('[eventDatabase] Event save failed', { error: result.data.error });
      return {
        success: false,
        error: result.data.error || 'Failed to save event'
      };
    }
  } catch (error) {
    console.error('[eventDatabase] Error in saveEvent', {
      error: error.message,
      code: error.code,
      stack: error.stack
    });
    return {
      success: false,
      error: 'Failed to save event: ' + error.message
    };
  }
};

/**
 * Generate occurrence dates for a recurring event
 * @param {Date} startDate - The start date of the event
 * @param {string} repeatType - The repeat type ('Every Day', 'Every Week', 'Every Month', 'Custom...')
 * @param {string} endType - How the recurrence ends ('After', 'On Date', 'Never')
 * @param {Object} repeatConfig - Custom repeat configuration (for 'Custom...' type)
 * @param {number} endRepeatCount - Number of occurrences (for 'After' endType)
 * @param {Date} endRepeatDate - End date (for 'On Date' endType)
 * @returns {Array<Date>} - Array of occurrence dates
 */

export function generateRecurringEventDates(
  startDate,
  repeatType,
  endType,
  repeatConfig = null,
  endRepeatCount = 10,
  endRepeatDate = null
) {
  // Input validation
  if (!startDate) {
    return [];
  }

  // Ensure startDate is a Date object
  const startDateObj = startDate instanceof Date ? startDate : new Date(startDate);
  if (isNaN(startDateObj.getTime())) {
    return [];
  }

  const occurrenceDates = [];

  // First occurrence is always the start date
  occurrenceDates.push(new Date(startDateObj));

  // Track unique dates to prevent duplicates
  const dateMap = new Set();
  dateMap.add(startDateObj.toDateString());

  // Set maximum end date limit (for 'Never' end type) - 2 years from start
  const MAX_END_DATE = new Date(startDateObj);
  MAX_END_DATE.setFullYear(MAX_END_DATE.getFullYear() + 2);

  // Safety limit to prevent infinite loops or excessive occurrences
  const MAX_OCCURRENCES = 200;

  // Determine end date based on end type
  let endDate = MAX_END_DATE;
  if (endType === 'On Date' && endRepeatDate) {
    const endRepeatDateObj = endRepeatDate instanceof Date ?
      endRepeatDate : new Date(endRepeatDate);

    if (!isNaN(endRepeatDateObj.getTime())) {
      endDate = endRepeatDateObj;
      endDate.setHours(23, 59, 59, 999); // Include the entire end day
    }
  }

  let maxOccurrences = MAX_OCCURRENCES;
  if (endType === 'After' && endRepeatCount > 0) {
    maxOccurrences = Math.min(parseInt(endRepeatCount, 10), MAX_OCCURRENCES);
  }

  // Clone the start date to use as our current position
  const currentDate = new Date(startDateObj);

  // Standard repeat types 
  if (repeatType === 'Every Day' || repeatType === 'Every Week' || repeatType === 'Every Month') {
    // Process standard repeat types (daily, weekly, monthly)
    let occurrenceCount = 1; // Start at 1 because we've already added the first occurrence

    if (repeatType === 'Every Week' && repeatConfig && repeatConfig.weeklyDays) {
      const weeklyDays = repeatConfig.weeklyDays;
      const selectedDays = weeklyDays.map((selected, index) => selected ? index : null).filter(v => v !== null);

      if (selectedDays.length === 0) {
        const startDayOfWeek = startDateObj.getDay();
        const mondayIndex = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
        selectedDays.push(mondayIndex);
      }

      let weekOffset = 0;
      let dayIndex = 0;

      while (occurrenceCount < maxOccurrences && currentDate < endDate) {
        const checkDate = new Date(startDateObj);
        checkDate.setDate(startDateObj.getDate() + (weekOffset * 7) + (selectedDays[dayIndex] - selectedDays[0]));

        if (checkDate >= startDateObj && checkDate <= endDate) {
          const dateKey = checkDate.toDateString();
          if (!dateMap.has(dateKey)) {
            dateMap.add(dateKey);
            occurrenceDates.push(new Date(checkDate));
            occurrenceCount++;
          }
        }

        dayIndex++;
        if (dayIndex >= selectedDays.length) {
          dayIndex = 0;
          weekOffset++;
        }

        if (checkDate > endDate) break;
      }
    } else if (repeatType === 'Every Month' && repeatConfig) {
      const monthlyType = repeatConfig.monthlyType || 'day';

      let monthOffset = 1;

      while (occurrenceCount < maxOccurrences && currentDate < endDate) {
        const nextDate = new Date(startDateObj);
        nextDate.setMonth(startDateObj.getMonth() + monthOffset);

        if (monthlyType === 'day') {
          const day = repeatConfig.monthlyDay || startDateObj.getDate();
          const lastDayOfMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
          nextDate.setDate(Math.min(day, lastDayOfMonth));
        } else if (monthlyType === 'weekday') {
          const week = repeatConfig.monthlyWeek || 'first';
          const dayOfWeek = repeatConfig.monthlyDayOfWeek !== undefined ? repeatConfig.monthlyDayOfWeek : (startDateObj.getDay() === 0 ? 6 : startDateObj.getDay() - 1);

          const firstDay = new Date(nextDate.getFullYear(), nextDate.getMonth(), 1);
          const firstDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

          let targetDate;
          if (week === 'last') {
            const lastDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0);
            let lastDayOfWeek = lastDay.getDay() === 0 ? 6 : lastDay.getDay() - 1;
            let daysBack = (lastDayOfWeek - dayOfWeek + 7) % 7;
            if (daysBack === 0) daysBack = 7;
            targetDate = new Date(lastDay);
            targetDate.setDate(lastDay.getDate() - daysBack + 7);
            if (targetDate.getMonth() !== nextDate.getMonth()) {
              targetDate.setDate(targetDate.getDate() - 7);
            }
          } else {
            const weekOffset = week === 'first' ? 0 : week === 'second' ? 1 : week === 'third' ? 2 : 3;
            let daysToAdd = (dayOfWeek - firstDayOfWeek + 7) % 7;
            if (daysToAdd === 0 && weekOffset > 0) daysToAdd = 7;
            daysToAdd += weekOffset * 7;
            targetDate = new Date(firstDay);
            targetDate.setDate(firstDay.getDate() + daysToAdd);
          }
          nextDate.setTime(targetDate.getTime());
        }

        if (nextDate > endDate) break;

        const dateKey = nextDate.toDateString();
        if (!dateMap.has(dateKey)) {
          dateMap.add(dateKey);
          occurrenceDates.push(new Date(nextDate));
          occurrenceCount++;
        }

        monthOffset++;
      }
    } else {
      while (occurrenceCount < maxOccurrences && currentDate < endDate) {
        const nextDate = new Date(currentDate);

        switch (repeatType) {
          case 'Every Day':
            nextDate.setDate(nextDate.getDate() + 1);
            break;

          case 'Every Week':
            nextDate.setDate(nextDate.getDate() + 7);
            break;

          case 'Every Month': {
            const currentMonth = nextDate.getMonth();
            nextDate.setMonth(currentMonth + 1);
            if (nextDate.getMonth() !== (currentMonth + 1) % 12) {
              nextDate.setDate(0);
            }
            break;
          }
          default:
            break;
        }

        currentDate.setTime(nextDate.getTime());

        if (currentDate > endDate) {
          break;
        }

        const dateKey = currentDate.toDateString();
        if (!dateMap.has(dateKey)) {
          dateMap.add(dateKey);
          occurrenceDates.push(new Date(currentDate));
          occurrenceCount++;
        }
      }
    }
  }
  // Handle custom repeat configuration
  else if (repeatType === 'Custom...' && repeatConfig) {
    // Implement custom repeat logic here...
  }
  else {
    // Return just the start date as a fallback
    return [new Date(startDateObj)];
  }

  return occurrenceDates;
}

/**
 * Update an existing event using Firebase functions
 * @param {string} eventId - The event ID to update
 * @param {Object} event - The updated event data
 * @param {string} userId - The user ID
 * @param {string} accountType - The account type
 * @returns {Promise<Object>} - Result object with success/error status
 */
export const updateEvent = async (eventId, event, userId, accountType = 'worker', forceUpdate = false) => {
  try {
    // Map account types properly for Firebase function
    let mappedAccountType = accountType;
    if (accountType === 'professional') {
      mappedAccountType = 'worker'; // Map professional to worker for Firebase function
    }

    const updateEventFunction = httpsCallable(functions, 'updateCalendarEvent');
    
    console.log('Calling updateCalendarEvent function', {
      eventId,
      userId,
      accountType: mappedAccountType,
      functionsRegion: DEFAULT_VALUES.FIREBASE_REGION,
      expectedURL: `https://${DEFAULT_VALUES.FIREBASE_REGION}-${DEFAULT_VALUES.FIREBASE_PROJECT_ID}.cloudfunctions.net/updateCalendarEvent`
    });
    
    const result = await updateEventFunction({
      eventId,
      userId,
      accountType: mappedAccountType,
      title: event.title,
      start: event.start instanceof Date ? event.start.toISOString() : event.start,
      end: event.end instanceof Date ? event.end.toISOString() : event.end,
      color: event.color,
      color1: event.color1,
      color2: event.color2,
      notes: event.notes,
      location: event.location,
      isValidated: event.isValidated,
      isRecurring: event.isRecurring,
      recurrenceId: event.recurrenceId,
      canton: event.canton,
      area: event.area,
      experience: event.experience,
      software: event.software,
      certifications: event.certifications,
      workAmount: event.workAmount,
      isAvailability: event.isAvailability
    });

    return result.data;
  } catch (error) {
    console.error('updateCalendarEvent error:', {
      code: error.code,
      message: error.message,
      details: error.details,
      stack: error.stack
    });

    // Check for HTTP 404 errors (function not deployed or not found)
    if (error.code === 'functions/not-found' || error.code === 'not-found' || 
        error.code === '404' ||
        (error.message && error.message.includes('404')) ||
        (error.message && error.message.includes('Not Found'))) {
      console.error('Function endpoint not found. This may indicate:');
      console.error('1. Function is still deploying (wait 1-2 minutes)');
      console.error('2. Function name mismatch');
      console.error('3. Region mismatch');
      console.error('Expected URL:', `https://${DEFAULT_VALUES.FIREBASE_REGION}-${DEFAULT_VALUES.FIREBASE_PROJECT_ID}.cloudfunctions.net/updateCalendarEvent`);
      return {
        success: false,
        error: 'Function not available. The update function may still be deploying. Please try again in a few moments.'
      };
    }

    if (error.code === 'functions/permission-denied') {
      return {
        success: false,
        error: 'Permission denied. You do not have access to update this event.'
      };
    }

    if (error.code === 'functions/invalid-argument') {
      return {
        success: false,
        error: 'Invalid event data provided.'
      };
    }

    // Check for specific CORS errors
    if (error.message.includes('CORS') || error.message.includes('Access-Control-Allow-Origin')) {
      return {
        success: false,
        error: 'Server configuration error. The backend needs to be configured to allow requests from this domain. Please contact your system administrator.'
      };
    }

    // Check for network errors
    if (error.message.includes('net::ERR_FAILED') || error.message.includes('Failed to fetch')) {
      return {
        success: false,
        error: 'Network error. Please check your internet connection and try again.'
      };
    }

    return {
      success: false,
      error: `Failed to update event: ${error.code || error.message || 'unknown error'}`
    };
  }
};

/**
 * Delete an event using Firebase functions
 * @param {string} eventId - The event ID to delete
 * @param {string} userId - The user ID
 * @param {string} accountType - The account type
 * @param {string} deleteType - Type of deletion (single, all, future)
 * @param {string} recurrenceId - The recurrence ID for recurring events
 * @returns {Promise<Object>} - Result object with success/error status
 */
export const deleteEvent = async (eventId, userId, accountType = 'worker', deleteType = 'single', recurrenceId = null) => {
  try {
    // Prepare the data for the delete operation
    const deleteData = {
      eventId,
      userId,
      accountType,
      deleteType,
      recurrenceId
    };

    const deleteEventFunction = httpsCallable(functions, 'deleteCalendarEvent');
    const result = await deleteEventFunction(deleteData);

    return result.data;
  } catch (error) {
    // Check for specific CORS errors
    if (error.message.includes('CORS') || error.message.includes('Access-Control-Allow-Origin')) {
      return {
        success: false,
        error: 'Server configuration error. The backend needs to be configured to allow requests from this domain. Please contact your system administrator.'
      };
    }

    // Check for network errors
    if (error.message.includes('net::ERR_FAILED') || error.message.includes('Failed to fetch')) {
      return {
        success: false,
        error: 'Network error. Please check your internet connection and try again.'
      };
    }

    return {
      success: false,
      error: `Failed to delete event: ${error.code || 'unknown error'}`
    };
  }
};

/**
 * Save recurring events using Firebase functions
 * @param {Object} baseEvent - The base event with recurrence settings
 * @param {string} userId - The user ID
 * @returns {Promise<Object>} - Result object with success/error status
 */
export const saveRecurringEvents = async (baseEvent, userId) => {
  console.log('[eventDatabase] saveRecurringEvents called', { eventId: baseEvent.id, userId });
  try {
    console.log('[eventDatabase] Checking permissions for recurring events');
    await checkPermissions(userId);
    console.log('[eventDatabase] Permissions check passed for recurring events');

    // Prepare recurring event data for Firebase function
    console.log('[eventDatabase] Preparing recurring event data');
    const recurringData = {
      userId: userId,
      baseEvent: {
        id: baseEvent.id,
        title: baseEvent.title || 'Available',
        start: baseEvent.start instanceof Date ? baseEvent.start.toISOString() : baseEvent.start,
        end: baseEvent.end instanceof Date ? baseEvent.end.toISOString() : baseEvent.end,
        color: baseEvent.color,
        color1: baseEvent.color1,
        color2: baseEvent.color2,
        notes: baseEvent.notes || '',
        location: baseEvent.location || '',
        isAvailability: baseEvent.isAvailability !== false,
        isValidated: baseEvent.isValidated || true,
        // Recurrence settings
        isRecurring: true,
        repeatValue: baseEvent.repeatValue || 'Every Day',
        endRepeatValue: baseEvent.endRepeatValue || 'After',
        endRepeatCount: baseEvent.endRepeatCount || 10,
        endRepeatDate: baseEvent.endRepeatDate ?
          (baseEvent.endRepeatDate instanceof Date ? baseEvent.endRepeatDate.toISOString() : baseEvent.endRepeatDate) : null,
        // Repeat configuration
        weeklyDays: baseEvent.weeklyDays,
        monthlyType: baseEvent.monthlyType,
        monthlyDay: baseEvent.monthlyDay,
        monthlyWeek: baseEvent.monthlyWeek,
        monthlyDayOfWeek: baseEvent.monthlyDayOfWeek,
        // Additional fields
        canton: baseEvent.canton || [],
        area: baseEvent.area || [],
        languages: baseEvent.languages || [],
        experience: baseEvent.experience || '',
        software: baseEvent.software || [],
        certifications: baseEvent.certifications || [],
        workAmount: baseEvent.workAmount || ''
      }
    };

    // Use Firebase function for secure server-side recurring event generation
    console.log('[eventDatabase] Calling saveRecurringEvents function', {
      userId: recurringData.userId,
      baseEventId: recurringData.baseEvent.id,
      repeatValue: recurringData.baseEvent.repeatValue
    });
    const result = await saveRecurringEventsFunction(recurringData);
    console.log('[eventDatabase] saveRecurringEvents function returned', {
      success: result.data?.success,
      recurrenceId: result.data?.recurrenceId,
      count: result.data?.count
    });

    if (result.data.success) {
      console.log('[eventDatabase] Recurring events saved successfully', {
        recurrenceId: result.data.recurrenceId,
        count: result.data.count
      });
      return {
        success: true,
        recurrenceId: result.data.recurrenceId,
        count: result.data.count
      };
    } else {
      console.error('[eventDatabase] Recurring events save failed', { error: result.data.error });
      return {
        success: false,
        error: result.data.error || 'Failed to save recurring events'
      };
    }
  } catch (error) {
    console.error('[eventDatabase] Error in saveRecurringEvents', {
      error: error.message,
      code: error.code,
      stack: error.stack
    });
    return {
      success: false,
      error: 'Failed to save recurring events: ' + error.message
    };
  }
};

/**
 * Real-time hook for calendar events
 * @param {string} userId - The user ID to fetch events for
 * @param {string} accountType - The account type (worker, employer, etc.)
 * @returns {Object} - Events, loading state, and error state
 */
export const useCalendarEvents = (userId, accountType = "worker") => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const eventsRef = useRef({ availability: [], events: [], contracts: [] });

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const processEventData = (data, docId) => {
      const startDate = data.from instanceof Timestamp ? data.from.toDate() : new Date(data.from);
      const endDate = data.to instanceof Timestamp ? data.to.toDate() : new Date(data.to);

      const isValidated = data.isValidated || false;
      let eventColor, color1, color2;

      if (isValidated) {
        eventColor = '#0f54bc';
        color1 = '#a8c1ff';
        color2 = '#4da6fb';
      } else {
        eventColor = '#8c8c8c';
        color1 = '#e6e6e6';
        color2 = '#b3b3b3';
      }

      return {
        id: docId,
        title: data.title || 'Available',
        start: startDate,
        end: endDate,
        color: eventColor,
        color1: color1,
        color2: color2,
        isAvailability: data.isAvailability !== false,
        isValidated: isValidated,
        recurrenceId: data.recurrenceId || null,
        isRecurring: !!data.recurrenceId,
        canton: data.locationCountry || [],
        area: data.LocationArea || [],
        languages: data.languages || [],
        experience: data.experience || '',
        software: data.software || [],
        certifications: data.certifications || [],
        workAmount: data.workAmount || '',
        notes: data.notes || '',
        location: typeof data.location === 'object' ? (data.location.address || data.location.name || '') : (data.location || ''),
        visibility: data.visibility || 'public',
        fromDatabase: true
      };
    };

    const updateEventsState = () => {
      const eventMap = new Map();
      [...eventsRef.current.availability, ...eventsRef.current.events, ...eventsRef.current.contracts].forEach(event => {
        if (!eventMap.has(event.id)) {
          eventMap.set(event.id, event);
        }
      });
      setEvents(Array.from(eventMap.values()));
      setLoading(false);
      setError(null);
    };

    const availabilityQuery = query(
      collection(db, 'availability'),
      where('userId', '==', userId)
    );

    const unsubscribeAvailability = onSnapshot(
      availabilityQuery,
      (snapshot) => {
        try {
          const availabilityEvents = [];
          snapshot.forEach(doc => {
            const event = processEventData(doc.data(), doc.id);
            availabilityEvents.push(event);
          });

          eventsRef.current.availability = availabilityEvents;
          updateEventsState();
        } catch (err) {
          setError(err.message);
          setLoading(false);
        }
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    const eventsQuery = query(
      collection(db, 'events'),
      where('userId', '==', userId)
    );

    const unsubscribeEvents = onSnapshot(
      eventsQuery,
      (snapshot) => {
        try {
          const eventsFromCollection = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            if (data.type === 'worker_availability' || data.isAvailability) {
              const event = processEventData(data, doc.id);
              eventsFromCollection.push(event);
            }
          });

          eventsRef.current.events = eventsFromCollection;
          updateEventsState();
        } catch (err) {
          setError(err.message);
          setLoading(false);
        }
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    // Set up real-time listener for contracts if needed
    let unsubscribeContracts = null;
    if (accountType === 'employer' || accountType === 'worker' || accountType === 'professional') {
      // Query contracts using new structure (parties.professional.profileId / parties.employer.profileId)
      // Also support backward compatibility with old structure (workerId / employerId)
      const professionalQuery = query(
        collection(db, 'contracts'),
        where('parties.professional.profileId', '==', userId)
      );

      const employerQuery = query(
        collection(db, 'contracts'),
        where('parties.employer.profileId', '==', userId)
      );

      // Backward compatibility queries
      const workerQuery = query(
        collection(db, 'contracts'),
        where('workerId', '==', userId)
      );

      const oldEmployerQuery = query(
        collection(db, 'contracts'),
        where('employerId', '==', userId)
      );

      // Combine queries based on account type
      const queriesToUse = accountType === 'employer'
        ? [employerQuery, oldEmployerQuery]
        : [professionalQuery, workerQuery];

      // Set up listeners for all relevant queries
      const unsubscribes = [];

      queriesToUse.forEach((contractQuery, index) => {
        const unsubscribe = onSnapshot(
          contractQuery,
          (snapshot) => {
            try {
              const contractEvents = [];

              snapshot.forEach(doc => {
                const data = doc.data();

                // Only process active contracts
                const status = data.statusLifecycle?.currentStatus || data.status;
                if (status !== 'active' && status !== 'pending' && status !== 'pending_professional_approval' && status !== 'pending_facility_approval') {
                  return;
                }

                // Convert Firestore timestamps to JavaScript dates
                const startDate = data.from instanceof Timestamp ? data.from.toDate() : new Date(data.from);
                const endDate = data.to instanceof Timestamp ? data.to.toDate() : new Date(data.to);

                contractEvents.push({
                  id: doc.id,
                  title: data.title || 'Contract',
                  start: startDate,
                  end: endDate,
                  color: '#f54455', // Red color for contracts
                  color1: '#ffbbcf',
                  color2: '#ff6064',
                  isContract: true,
                  isValidated: data.isValidated || false,
                  location: data.location || '',
                  notes: data.notes || '',
                  fromDatabase: true
                });
              });

              const contractMap = new Map();
              [...eventsRef.current.contracts, ...contractEvents].forEach(event => {
                if (!contractMap.has(event.id)) {
                  contractMap.set(event.id, event);
                }
              });

              eventsRef.current.contracts = Array.from(contractMap.values());
              updateEventsState();

            } catch (err) {
              // Error processing contract events
            }
          },
          (err) => {
            // Error in contract events listener
          }
        );

        unsubscribes.push(unsubscribe);
      });

      unsubscribeContracts = () => {
        unsubscribes.forEach(unsub => unsub());
      };
    }

    // Cleanup function
    return () => {
      unsubscribeAvailability();
      unsubscribeEvents();
      if (unsubscribeContracts) {
        unsubscribeContracts();
      }
    };
  }, [userId, accountType]);

  return { events, loading, error };
};

/**
 * Check and create event with conflict validation
 * @param {Object} eventData - The event data to validate and create
 * @param {string} userId - The user ID
 * @param {Object} workspaceContext - The workspace context
 * @returns {Promise<Object>} - Result object with success/error status
 */
export const checkAndCreateEvent = async (eventData, userId, workspaceContext) => {
  try {
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }

    // Get the current user's ID token for authentication
    const idToken = await auth.currentUser.getIdToken();

    const requestData = {
      workspaceContext,
      eventType: eventData.type,
      eventData: {
        startTime: eventData.start instanceof Date ? eventData.start.toISOString() : eventData.start,
        endTime: eventData.end instanceof Date ? eventData.end.toISOString() : eventData.end,
        title: eventData.title,
        notes: eventData.notes,
        location: eventData.location
      },
      targetUserId: userId,
      recurrenceSettings: eventData.isRecurring ? {
        isRecurring: true,
        repeatValue: eventData.repeatValue,
        endRepeatValue: eventData.endRepeatValue,
        endRepeatDate: eventData.endRepeatDate ?
          (eventData.endRepeatDate instanceof Date ? eventData.endRepeatDate.toISOString() : eventData.endRepeatDate) : null
      } : null
    };

    // Call the function as an HTTP request
    const response = await fetch('https://us-central1-medishift.cloudfunctions.net/checkAndCreateEventHTTP', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
}; 