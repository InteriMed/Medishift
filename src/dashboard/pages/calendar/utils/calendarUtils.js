import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth } from 'firebase/auth';

// Initialize Firebase functions
const functions = getFunctions();

// Firebase function references
const saveEventFunction = httpsCallable(functions, 'saveCalendarEvent');
const updateEventFunction = httpsCallable(functions, 'updateCalendarEvent');
const deleteEventFunction = httpsCallable(functions, 'deleteCalendarEvent');
const saveRecurringEventsFunction = httpsCallable(functions, 'saveRecurringEvents');

/**
 * Get base event ID from a recurring event ID
 */
export const getBaseEventId = (eventId) => {
  if (!eventId) return null;
  return String(eventId).split(/[-_]/)[0];
};

/**
 * Modify event in database using Firebase functions
 * @param {Object} event - The event to modify
 * @param {string} userId - The user ID
 * @param {string} accountType - The account type
 * @param {Object} options - Modification options
 * @returns {Promise<Object>} - Result object with success/error status
 */
export const modifyEventInDatabase = async (event, userId, accountType, options = {}) => {
  if (!event || !userId) {
    return { success: false, error: 'Missing required parameters' };
  }

  const { 
    operation = 'update', 
    modificationType = 'single',
    updatedData = {},
    newRecurrenceId = null
  } = options;

  try {
    // Check authentication
    const auth = getAuth();
    if (!auth.currentUser || auth.currentUser.uid !== userId) {
      return { success: false, error: 'Authentication required' };
    }

    // For delete operations
    if (operation === 'delete') {
      const deleteData = {
        eventId: event.id,
        userId: userId,
        accountType: accountType,
        deleteType: modificationType,
        recurrenceId: event.recurrenceId
      };

      const result = await deleteEventFunction(deleteData);
      return result.data;
    }
    
    // For update operations
    if (operation === 'update') {
      if (modificationType === 'single') {
        // For single event updates, remove recurrenceId to make it independent
        const updateData = {
          eventId: event.id,
          userId: userId,
          accountType: accountType,
          ...updatedData,
          isRecurring: false,
          recurrenceId: null
        };
        
        const result = await updateEventFunction(updateData);
        return result.data;
      } 
      else if (modificationType === 'all') {
        // For updating an entire series, use the recurring events function
        const completeEvent = {
          ...event,
          ...updatedData,
          isRecurring: true,
          recurrenceId: event.recurrenceId || newRecurrenceId
        };
        
        const recurringData = {
          userId: userId,
          baseEvent: completeEvent
        };
        
        const result = await saveRecurringEventsFunction(recurringData);
        return result.data;
      }
      else if (modificationType === 'future') {
        // For updating this and all future occurrences
        const recurrenceId = newRecurrenceId || `${userId}_${Date.now()}_recurrence`;
        
        const futureEvent = {
          ...event,
          ...updatedData,
          isRecurring: true,
          recurrenceId
        };
        
        const recurringData = {
          userId: userId,
          baseEvent: futureEvent
        };
        
        const result = await saveRecurringEventsFunction(recurringData);
        return result.data;
      }
    }
    
    return { success: false, error: 'Invalid operation' };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      code: error.code
    };
  }
};

/**
 * Handle keyboard delete for events
 * @param {Object} event - The event to delete
 * @param {Array} events - All events array
 * @param {string} userId - The user ID
 * @param {string} accountType - The account type
 * @param {Object} callbacks - Callback functions
 * @returns {Promise<void>}
 */
export const handleKeyboardDelete = async (event, events, userId, accountType, callbacks = {}) => {
  const { 
    onSuccess = () => {}, 
    onError = () => {}, 
    showDeleteConfirmation = () => {}
  } = callbacks;
  
  if (!event) return;
  
  try {
    // Check authentication
    const auth = getAuth();
    if (!auth.currentUser || auth.currentUser.uid !== userId) {
      onError('Authentication required');
      return;
    }
  
  // For non-recurring events, delete directly
  if (!event.isRecurring && !event.recurrenceId) {
      const result = await modifyEventInDatabase(event, userId, accountType, {
      operation: 'delete',
      modificationType: 'single'
      });
      
        if (result.success) {
          onSuccess(result);
        } else {
          onError(result.error);
        }
  } else {
    // For recurring events, show delete confirmation dialog
    showDeleteConfirmation(event);
  }
  } catch (error) {
    onError(error.message);
  }
};

/**
 * Handle future occurrences modification
 * @param {Object} event - The event to modify
 * @param {string} userId - The user ID
 * @param {string} accountType - The account type
 * @param {Object} options - Modification options
 * @returns {Promise<Object>} - Result object
 */
export const handleFutureOccurrences = async (event, userId, accountType, options = {}) => {
  if (!event || !userId) {
    return { success: false, error: 'Missing required parameters' };
  }

  const {
    newStart,
    newEnd,
    newRecurrenceId = `${userId}_${Date.now()}_recurrence`,
    additionalData = {}
  } = options;

  try {
    // Check authentication
    const auth = getAuth();
    if (!auth.currentUser || auth.currentUser.uid !== userId) {
      return { success: false, error: 'Authentication required' };
    }

    // Create a complete base event for the future series
    const baseEvent = {
      ...event,
      ...additionalData,
      id: event.id,
      start: newStart ? newStart.toISOString() : event.start,
      end: newEnd ? newEnd.toISOString() : event.end,
      isRecurring: true,
      recurrenceId: newRecurrenceId,
      userId,
      repeatValue: event.repeatValue || 'Every Day'
    };

    // Use the recurring events function to create the new series
    const recurringData = {
      userId: userId,
      baseEvent: baseEvent
    };

    const createResult = await saveRecurringEventsFunction(recurringData);
    
    if (!createResult.data.success) {
      return createResult.data;
    }

    // Delete the old future occurrences if there was an existing recurrence
    if (event.recurrenceId && event.recurrenceId !== newRecurrenceId) {
      
      const deleteResult = await modifyEventInDatabase(event, userId, accountType, {
        operation: 'delete',
        modificationType: 'future'
      });

      if (!deleteResult.success) {
        // Continue anyway since we've created the new occurrences
      } else {
      }
    }

    return {
      success: true,
      recurrenceId: newRecurrenceId,
      count: createResult.data.count
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
};

/**
 * Validate event data before sending to Firebase
 * @param {Object} event - The event to validate
 * @returns {Object} - Validation result
 */
export const validateEventData = (event) => {
  const errors = [];
  
  if (!event.start || !event.end) {
    errors.push('Start and end times are required');
  }
  
  if (event.start && event.end) {
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      errors.push('Invalid date format');
    }
    
    if (startDate >= endDate) {
      errors.push('End time must be after start time');
    }
  }
  
  if (!event.userId) {
    errors.push('User ID is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Format event data for Firebase functions
 * @param {Object} event - The event to format
 * @returns {Object} - Formatted event data
 */
export const formatEventForFirebase = (event) => {
  return {
    userId: event.userId,
    title: event.title || 'Available',
    start: event.start instanceof Date ? event.start.toISOString() : event.start,
    end: event.end instanceof Date ? event.end.toISOString() : event.end,
    color: event.color,
    color1: event.color1,
    color2: event.color2,
    notes: event.notes || '',
    location: event.location || '',
    isAvailability: event.isAvailability !== false,
    isValidated: event.isValidated !== false,
    // Additional fields
    canton: event.canton || [],
    area: event.area || [],
    languages: event.languages || [],
    experience: event.experience || '',
    software: event.software || [],
    certifications: event.certifications || [],
    workAmount: event.workAmount || '',
    // Recurrence fields
    isRecurring: event.isRecurring || false,
    recurrenceId: event.recurrenceId || null,
    repeatValue: event.repeatValue || null,
    endRepeatValue: event.endRepeatValue || null,
    endRepeatCount: event.endRepeatCount || null,
    endRepeatDate: event.endRepeatDate || null
  };
}; 