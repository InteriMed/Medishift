import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, getDoc, getDocs, query, where, orderBy, Timestamp, serverTimestamp, onSnapshot, limit, FieldValue, deleteField, writeBatch } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useState, useEffect, useCallback } from 'react';

// Initialize Firebase services
const db = getFirestore();
const functions = getFunctions();

// Firebase function references
const saveEventFunction = httpsCallable(functions, 'saveCalendarEvent');
const updateEventFunction = httpsCallable(functions, 'updateCalendarEvent'); 
const deleteEventFunction = httpsCallable(functions, 'deleteCalendarEvent');
const saveRecurringEventsFunction = httpsCallable(functions, 'saveRecurringEvents');

const checkPermissions = async (uid) => {
  console.log('checkPermissions called with uid:', uid);
  
  if (!uid) {
    console.error('checkPermissions failed: User ID is required');
    return false;
  }

  const auth = getAuth();
  console.log('Auth state in checkPermissions:', { 
    currentUser: auth.currentUser ? auth.currentUser.uid : 'null',
    isInitialized: auth._isInitialized
  });
  
  // If auth is still initializing, wait a bit
  if (!auth._isInitialized) {
    console.log('Auth not fully initialized, waiting...');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  const currentUser = auth.currentUser;

  if (!currentUser) {
    console.error('checkPermissions failed: User not authenticated');
    return false;
  }

  if (currentUser.uid !== uid) {
    console.error(`checkPermissions failed: User ID mismatch - current: ${currentUser.uid}, requested: ${uid}`);
    return false;
  }

  console.log('checkPermissions passed for uid:', uid);
  return true;
};

// Function to fetch events from both availability and contracts collections
export const fetchUserEvents = async (userId, accountType = "worker") => {
  try {
    const db = getFirestore();
    
    // Common function to convert documents to calendar events
    const convertDocsToEvents = (docs, type) => {
      return docs.map(doc => {
        const data = doc.data();
        
        // Define colors based on type and validation status
        let eventColor, color1, color2;
        
        if (type === 'availability') {
          eventColor = data.isValidated ? '#4287f5' : '#808080'; // Blue if validated, grey if not
          color1 = data.isValidated ? '#a8c1ff' : '#808080';
          color2 = data.isValidated ? '#4da6fb' : '#808080';
        } else { // contracts
          eventColor = data.isValidated ? '#4287f5' : '#f54455'; // Blue if validated, red if not
          color1 = data.isValidated ? '#4287f5' : '#f54455';
          color2 = data.isValidated ? '#4287f5' : '#f54455';
        }
        
        // Base event properties
        return {
          id: doc.id,
          title: type === 'availability' ? 'Available' : 'Contract',
          start: new Date(data.from),
          end: new Date(data.to),
          color: eventColor,
          color1: color1,
          color2: color2,
          type: type,
          userId: data.userId,
          canton: data.locationCountry || ['Switzerland'],
          area: data.LocationArea || [],
          languages: data.languages || [],
          experience: data.experience || "",
          software: data.software || [],
          certifications: data.certifications || [],
          recurrenceId: data.recurrenceId || null,
          isValidated: data.isValidated || false,
          fromDatabase: true // Mark as coming from database
        };
      });
    };
    
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
      console.log('Fetching availability events');
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
          console.log(`Event ${doc.id}: Assigned validated (blue) color`);
        } else {
          // Map to grey category - Unvalidated events  
          eventColor = '#8c8c8c';  // Match grey category color from Calendar.js
          color1 = '#e6e6e6';
          color2 = '#b3b3b3';
          console.log(`Event ${doc.id}: Assigned unvalidated (grey) color`);
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
      console.log('Fetching contracts events');
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
    
    console.log(`Fetched ${events.length} events for user:`, userId);
    return { success: true, events };
  } catch (error) {
    console.error('Error fetching events:', error);
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
  console.log('SAVE SINGLE EVENT called with:', {
    eventId: event.id,
    userId,
    title: event.title,
    isAvailability: event.isAvailability
  });
  
  // First check permissions and authentication
  const hasPermission = await checkPermissions(userId);
  if (!hasPermission) {
    console.error('User does not have permission to save event');
    return { success: false, error: 'Permission denied' };
  }
  
  try {
    // Prepare event data for Firebase function
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
    
    // Use Firebase function for secure server-side validation and saving
    const result = await saveEventFunction(eventData);
    
    if (result.data.success) {
      console.log(`Event saved with ID: ${result.data.id}`);
    return { 
      success: true, 
        id: result.data.id
    };
    } else {
      console.error('Firebase function returned error:', result.data.error);
      return { 
        success: false, 
        error: result.data.error || 'Failed to save event'
      };
    }
  } catch (error) {
    console.error('Error calling saveEvent Firebase function:', error);
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
  console.log("generateRecurringEventDates called with params:", {
    startDate: startDate instanceof Date ? startDate.toISOString() : startDate,
    repeatType,
    endType,
    repeatConfig,
    endRepeatCount,
    endRepeatDate: endRepeatDate instanceof Date ? endRepeatDate.toISOString() : endRepeatDate
  });
  
  // Input validation
  if (!startDate) {
    console.error("No start date provided to generateRecurringEventDates");
    return [];
  }
  
  // Ensure startDate is a Date object
  const startDateObj = startDate instanceof Date ? startDate : new Date(startDate);
  if (isNaN(startDateObj.getTime())) {
    console.error("Invalid start date provided to generateRecurringEventDates:", startDate);
    return [];
  }
  
  console.log("Working with start date:", startDateObj.toISOString());
  
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
    } else {
      console.warn("Invalid endRepeatDate, using default MAX_END_DATE");
    }
  }
  
  let maxOccurrences = MAX_OCCURRENCES;
  if (endType === 'After' && endRepeatCount > 0) {
    maxOccurrences = Math.min(parseInt(endRepeatCount, 10), MAX_OCCURRENCES);
  }
  
  console.log("Recurring event parameters:", {
    startDate: startDateObj.toISOString(),
    endDate: endDate.toISOString(),
    maxOccurrences,
    repeatType
  });
  
  // Clone the start date to use as our current position
  const currentDate = new Date(startDateObj);
  
  // Standard repeat types 
  if (repeatType === 'Every Day' || repeatType === 'Every Week' || repeatType === 'Every Month') {
    console.log(`Processing standard repeat type: ${repeatType}`);
    
    // Process standard repeat types (daily, weekly, monthly)
    let occurrenceCount = 1; // Start at 1 because we've already added the first occurrence
    
    while (occurrenceCount < maxOccurrences && currentDate < endDate) {
      // Clone the date before advancing to avoid modifying previous occurrences
      const nextDate = new Date(currentDate);
      
      // Advance to next occurrence date based on repeat type
      switch (repeatType) {
        case 'Every Day':
          nextDate.setDate(nextDate.getDate() + 1);
          break;
          
        case 'Every Week':
          nextDate.setDate(nextDate.getDate() + 7);
          break;
          
        case 'Every Month': {
          // Careful handling of month increments to avoid skipping months
          const currentDay = nextDate.getDate();
          const currentMonth = nextDate.getMonth();
          
          // Move to the next month
          nextDate.setMonth(currentMonth + 1);
          
          // Check if the month went too far forward (e.g., Jan 31 -> Mar 3)
          // This happens when the target month doesn't have enough days
          if (nextDate.getMonth() !== (currentMonth + 1) % 12) {
            // Set to the last day of the intended month
            nextDate.setDate(0);
          }
          break;
        }
      }
      
      // Update our current position
      currentDate.setTime(nextDate.getTime());
      
      // Skip if we've gone past the end date
      if (currentDate > endDate) {
        console.log("Reached end date, stopping recurring generation");
        break;
      }
      
      // Check for duplicate dates before adding
      const dateKey = currentDate.toDateString();
      if (!dateMap.has(dateKey)) {
        dateMap.add(dateKey);
        occurrenceDates.push(new Date(currentDate));
        occurrenceCount++;
        
        // Log every 10th occurrence for debugging
        if (occurrenceCount % 10 === 0) {
          console.log(`Added occurrence ${occurrenceCount}: ${currentDate.toISOString()}`);
        }
      } else {
        console.warn(`Skipping duplicate occurrence date: ${dateKey}`);
      }
    }
  } 
  // Handle custom repeat configuration
  else if (repeatType === 'Custom...' && repeatConfig) {
    // Implement custom repeat logic here...
    console.log("Processing custom repeat configuration:", repeatConfig);
    
    // ... existing custom repeat code ...
  } 
  else {
    console.warn("Unsupported repeat type:", repeatType);
    // Return just the start date as a fallback
    return [new Date(startDateObj)];
  }
  
  console.log(`Generated ${occurrenceDates.length} occurrence dates for event starting on ${startDateObj.toDateString()}`);
  
  if (occurrenceDates.length > 0) {
    console.log("First occurrence:", occurrenceDates[0].toISOString());
    if (occurrenceDates.length > 1) {
      console.log("Last occurrence:", occurrenceDates[occurrenceDates.length - 1].toISOString());
    }
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
    
    console.log('Calling updateCalendarEvent Firebase function with:', {
      eventId,
      userId,
      originalAccountType: accountType,
      mappedAccountType: mappedAccountType,
      startType: typeof event.start,
      endType: typeof event.end,
      start: event.start instanceof Date ? event.start.toISOString() : event.start,
      end: event.end instanceof Date ? event.end.toISOString() : event.end,
      title: event.title,
      collectionToUse: mappedAccountType === 'manager' ? 'jobs-listing' : 'availability',
      eventHasFromDatabaseFlag: event.fromDatabase === true,
      eventHasValidatedFlag: event.isValidated === true,
      isForceUpdate: forceUpdate
    });

    const updateEventFunction = httpsCallable(functions, 'updateCalendarEvent');
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

    console.log('Update event result:', result.data);
    return result.data;
  } catch (error) {
    console.error('Error calling updateEvent Firebase function:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      stack: error.stack
    });
    
    // Check for specific error types
    if (error.code === 'functions/not-found') {
      return {
        success: false,
        error: 'Event not found in database. It may have been deleted or moved.'
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
      console.error('CORS error detected - this is a server configuration issue');
      return {
        success: false,
        error: 'Server configuration error. The backend needs to be configured to allow requests from this domain. Please contact your system administrator.'
      };
    }
    
    // Check for network errors
    if (error.message.includes('net::ERR_FAILED') || error.message.includes('Failed to fetch')) {
      console.error('Network error detected');
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
    console.log('Deleting event:', eventId, 'for user:', userId, 'type:', deleteType);
    
    // Prepare the data for the delete operation
    const deleteData = {
      eventId,
      userId,
      accountType,
      deleteType,
      recurrenceId
    };
    
    console.log('Delete data:', deleteData);
    
    const deleteEventFunction = httpsCallable(functions, 'deleteCalendarEvent');
    const result = await deleteEventFunction(deleteData);
    
    console.log('Delete event result:', result.data);
    return result.data;
  } catch (error) {
    console.error('Error deleting event:', error);
    
    // Check for specific CORS errors
    if (error.message.includes('CORS') || error.message.includes('Access-Control-Allow-Origin')) {
      console.error('CORS error detected during delete - this is a server configuration issue');
      return {
        success: false,
        error: 'Server configuration error. The backend needs to be configured to allow requests from this domain. Please contact your system administrator.'
      };
    }
    
    // Check for network errors
    if (error.message.includes('net::ERR_FAILED') || error.message.includes('Failed to fetch')) {
      console.error('Network error detected during delete');
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
  console.log('SAVE RECURRING EVENTS called with:', {
    eventId: baseEvent.id,
    userId,
    repeatValue: baseEvent.repeatValue,
    isRecurring: baseEvent.isRecurring
  });
  
  try {
    await checkPermissions(userId);
    
    // Prepare recurring event data for Firebase function
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
    const result = await saveRecurringEventsFunction(recurringData);
    
    if (result.data.success) {
      console.log(`Recurring events saved successfully. Count: ${result.data.count}`);
      return { 
        success: true,
        recurrenceId: result.data.recurrenceId,
        count: result.data.count
      };
    } else {
      console.error('Firebase function returned error:', result.data.error);
      return { 
        success: false, 
        error: result.data.error || 'Failed to save recurring events'
      };
    }
  } catch (error) {
    console.error('Error calling saveRecurringEvents Firebase function:', error);
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
  
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    
    console.log('Setting up real-time listener for user:', userId, 'accountType:', accountType);
    
    // Set up real-time listener for availability events
    const availabilityQuery = query(
      collection(db, 'availability'),
      where('userId', '==', userId),
      orderBy('from', 'desc')
    );

    const unsubscribeAvailability = onSnapshot(
      availabilityQuery,
      (snapshot) => {
        try {
            const availabilityEvents = [];
            
            snapshot.forEach(doc => {
              const data = doc.data();
            
            // Convert Firestore timestamps to JavaScript dates
            const startDate = data.from instanceof Timestamp ? data.from.toDate() : new Date(data.from);
            const endDate = data.to instanceof Timestamp ? data.to.toDate() : new Date(data.to);
              
              // Determine colors based on validation status
            const isValidated = data.isValidated || false;
              let eventColor, color1, color2;
            
              if (isValidated) {
              eventColor = '#0f54bc';  // Blue for validated
                color1 = '#a8c1ff';
                color2 = '#4da6fb';
              } else {
              eventColor = '#8c8c8c';  // Grey for unvalidated
                color1 = '#e6e6e6';
                color2 = '#b3b3b3';
              }
              
              availabilityEvents.push({
                id: doc.id,
              title: data.title || 'Available',
              start: startDate,
              end: endDate,
                color: eventColor,
                color1: color1,
                color2: color2,
              isAvailability: true,
              isValidated: isValidated,
              recurrenceId: data.recurrenceId || null,
              isRecurring: !!data.recurrenceId,
              // Additional metadata
                canton: data.locationCountry || [],
                area: data.LocationArea || [],
                languages: data.languages || [],
                experience: data.experience || '',
                software: data.software || [],
                certifications: data.certifications || [],
              workAmount: data.workAmount || '',
                    notes: data.notes || '',
              location: data.location || '',
              fromDatabase: true
              });
            });
            
          console.log(`Real-time update: ${availabilityEvents.length} availability events loaded`);
          setEvents(availabilityEvents);
            setLoading(false);
          setError(null);
        } catch (err) {
          console.error('Error processing availability events:', err);
          setError(err.message);
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error in availability events listener:', err);
          setError(err.message);
        setLoading(false);
      }
    );

    // Set up real-time listener for contracts if needed
    let unsubscribeContracts = null;
    if (accountType === 'employer' || accountType === 'worker') {
      const contractsQuery = accountType === 'employer' 
        ? query(collection(db, 'contracts'), where('employerId', '==', userId))
        : query(collection(db, 'contracts'), where('workerId', '==', userId));

      unsubscribeContracts = onSnapshot(
        contractsQuery,
        (snapshot) => {
          try {
            const contractEvents = [];
            
            snapshot.forEach(doc => {
                  const data = doc.data();
              
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
          
            console.log(`Real-time update: ${contractEvents.length} contract events loaded`);
            
            // Combine availability and contract events
            setEvents(prevEvents => {
              const availabilityEvents = prevEvents.filter(event => event.isAvailability);
              return [...availabilityEvents, ...contractEvents];
            });
            
          } catch (err) {
            console.error('Error processing contract events:', err);
          }
        },
        (err) => {
          console.error('Error in contract events listener:', err);
        }
      );
      }
    
    // Cleanup function
    return () => {
      console.log('Cleaning up real-time listeners');
      unsubscribeAvailability();
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
    console.log('checkAndCreateEvent called with:', { eventData, userId, workspaceContext });
      
    const auth = getAuth();
    
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
    const response = await fetch('https://us-central1-interimed.cloudfunctions.net/checkAndCreateEventHTTP', {
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
    console.error('Error in checkAndCreateEvent:', error);
    return { 
      success: false, 
      error: error.message,
      code: error.code
    };
  }
}; 