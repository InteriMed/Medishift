import { MODIFICATION_TYPES } from './constants';
import { updateEvent } from './eventDatabase';

/**
 * Event modification utilities
 * Handles complex event move and resize operations for recurring and non-recurring events
 * 
 * Extracted from Calendar.js to separate business logic
 */

// Handle event resize operations
export const handleEventResize = async (
  eventId, 
  newStart, 
  newEnd, 
  isTemporary, 
  events, 
  setEvents, 
  addToHistory, 
  markEventForSync, 
  userId, 
  accountType,
  setPendingModification,
  setOriginalEventDates,
  setNewEventDates,
  setMovedEvent,
  setShowMoveConfirmation
) => {
  const event = events.find(e => e.id === eventId);
  
  if (!event) {
    console.error('Event not found:', eventId);
    return;
  }
  
  const updatedEvents = [...events];
  const eventIndex = updatedEvents.findIndex(e => e.id === eventId);
  
  if (eventIndex === -1) {
    console.error('Event index not found:', eventId);
    return;
  }
  
  if (isTemporary) {
    // Update visual position during resize
    updatedEvents[eventIndex] = {
      ...updatedEvents[eventIndex],
      start: newStart,
      end: newEnd,
      isBeingResized: true
    };
    
    setEvents(updatedEvents);
    return;
  }
  
  // Check if this is a recurring event
  const isRecurringInstance = event.isRecurringInstance;
  const originalEvent = isRecurringInstance ? 
    events.find(e => e.id === event.recurringParentId) : 
    event;
  
  const isRecurringEvent = event.isRecurring || originalEvent.recurrence || 
    isRecurringInstance || String(eventId).includes('-') || String(eventId).includes('_');
  
  // If this is a recurring event, show confirmation dialog
  if (isRecurringEvent) {
    // Store the pending modification for the dialog
    setPendingModification({
      type: MODIFICATION_TYPES.RESIZE,
      eventId: eventId,
      event: event,
      originalEvent: originalEvent,
      newStart: newStart,
      newEnd: newEnd
    });
    
    // Store original and new dates for the dialog
    setOriginalEventDates({
      start: event.start instanceof Date ? event.start : new Date(event.start),
      end: event.end instanceof Date ? event.end : new Date(event.end)
    });
    setNewEventDates({
      start: newStart,
      end: newEnd
    });
    setMovedEvent(event);
    
    // Ensure the dialog shows up even with quick mouse movements
    requestAnimationFrame(() => {
      setShowMoveConfirmation(true);
    });
    return;
  }
  
  // For non-recurring events, proceed with the resize
  updatedEvents[eventIndex] = {
    ...updatedEvents[eventIndex],
    start: newStart,
    end: newEnd,
    isBeingResized: false
  };
  
  setEvents(updatedEvents);
  addToHistory(updatedEvents);
  
  // Save changes to local storage immediately and mark for sync
  console.log('Event resized, saving to local storage');
  markEventForSync(eventId);
  
  // Check if the event exists in the database before updating
  const isNewEvent = !event.isValidated && !event.fromDatabase;
  
  // Only update in the database if we have userId and it's not a new event
  if (userId && !isNewEvent) {
    console.log('Skipping database update for resize operation (temporary fix for Firebase function issue):', {
      eventId: eventId,
      reason: 'Firebase function updateCalendarEvent is throwing internal errors',
      uiResizeCompleted: true,
      willRetryOnSave: true
    });
  } else {
    console.log('Skipping database resize update for new event that will be saved later');
  }
};

// Handle event move operations
export const handleEventMove = async (
  eventId, 
  newStartDate, 
  newEndDate, 
  isTemporary, 
  events, 
  setEvents, 
  addToHistory, 
  markEventForSync, 
  userId, 
  accountType,
  setPendingModification,
  setOriginalEventDates,
  setNewEventDates,
  setMovedEvent,
  setShowMoveConfirmation
) => {
  const currentEvent = events.find(e => e.id === eventId);
  
  if (!currentEvent) {
    console.error('Event not found:', eventId);
    return;
  }

  // Ensure dates are proper Date objects
  const newStart = newStartDate instanceof Date ? newStartDate : new Date(newStartDate);
  const newEnd = newEndDate instanceof Date ? newEndDate : new Date(newEndDate);

  const isRecurringInstance = currentEvent.isRecurringInstance;
  const originalEvent = isRecurringInstance ? 
    events.find(e => e.id === currentEvent.recurringParentId) : 
    currentEvent;

  // Create a copy of events to modify
  const updatedEvents = [...events];
  const eventIndex = updatedEvents.findIndex(e => e.id === eventId);

  if (eventIndex === -1) {
    console.error('Event index not found:', eventId);
    return;
  }

  if (isTemporary) {
    // For temporary moves (during drag), update the current event's visual position
    updatedEvents[eventIndex] = {
      ...updatedEvents[eventIndex],
      start: newStart,
      end: newEnd,
      isBeingMoved: true
    };
    
    setEvents(updatedEvents);
    return;
  }

  // Check if this is a recurring event
  const isRecurringEvent = currentEvent.isRecurring || originalEvent.recurrence || 
    isRecurringInstance || String(eventId).includes('-') || String(eventId).includes('_');

  // Check if this is the last occurrence in the series
  let isLastOccurrence = currentEvent.isLastOccurrence || false;
  
  if (isRecurringEvent && currentEvent.recurrenceId && !isLastOccurrence) {
    // If not explicitly marked, check if this is the last occurrence by comparing with other events
    const seriesEvents = events.filter(e => e.recurrenceId === currentEvent.recurrenceId);
    
    if (seriesEvents.length > 0) {
      // Sort events by end date
      seriesEvents.sort((a, b) => {
        const aEnd = a.end instanceof Date ? a.end : new Date(a.end);
        const bEnd = b.end instanceof Date ? b.end : new Date(b.end);
        return bEnd.getTime() - aEnd.getTime();
      });
      
      // Check if this is the last event in the series
      const latestEvent = seriesEvents[0]; // After sorting, first is latest
      isLastOccurrence = currentEvent.id === latestEvent.id;
      console.log(`Checking if event ${currentEvent.id} is last in series: ${isLastOccurrence}`);
    }
  }
  
  // Create a common structure to store original and new dates for the dialog
  const originalEventDatesObj = {
    start: currentEvent.start instanceof Date ? currentEvent.start : new Date(currentEvent.start),
    end: currentEvent.end instanceof Date ? currentEvent.end : new Date(currentEvent.end)
  };
  
  const newEventDatesObj = {
    start: newStart,
    end: newEnd
  };

  // If this is a recurring event, show confirmation dialog
  if (isRecurringEvent) {
    // Store the pending modification for the dialog
    setPendingModification({
      type: isRecurringInstance ? MODIFICATION_TYPES.MOVE_SINGLE : MODIFICATION_TYPES.MOVE,
      eventId: eventId,
      event: currentEvent,
      originalEvent: originalEvent,
      newStart: newStart,
      newEnd: newEnd
    });
    
    // Store original and new dates for the dialog
    setOriginalEventDates(originalEventDatesObj);
    setNewEventDates(newEventDatesObj);
    
    // Add isLastOccurrence flag to the moved event for the dialog
    setMovedEvent({
      ...currentEvent,
      isLastOccurrence: isLastOccurrence
    });
    
    // Ensure the dialog shows up even with quick mouse movements
    requestAnimationFrame(() => {
      setShowMoveConfirmation(true);
    });
    return;
  }

  // For non-recurring events, update immediately
  updatedEvents[eventIndex] = {
    ...updatedEvents[eventIndex],
    start: newStart,
    end: newEnd,
    isBeingMoved: false
  };
  
  setEvents(updatedEvents);
  addToHistory(updatedEvents);
  
  // Save changes to local storage immediately and mark for sync
  console.log('Event moved, saving to local storage');
  markEventForSync(eventId);
  
  // Update in database if it's an existing event
  const isNewEvent = !currentEvent.isValidated && !currentEvent.fromDatabase;
  
  console.log('Event move - database update check:', {
    eventId: eventId,
    isValidated: currentEvent.isValidated,
    fromDatabase: currentEvent.fromDatabase,
    isNewEvent: isNewEvent,
    userId: userId,
    willUpdateDatabase: userId && !isNewEvent
  });
  
  if (userId && !isNewEvent) {
    console.log('Skipping database update for move operation (temporary fix for Firebase function issue):', {
      eventId: eventId,
      reason: 'Firebase function updateCalendarEvent is throwing internal errors',
      uiMoveCompleted: true,
      willRetryOnSave: true
    });
  } else {
    console.log('Skipping database update - either no userId or event is new');
  }
};

// Handle modification confirmations for recurring events
export const handleModificationConfirm = async (
  modificationType,
  pendingModification,
  events,
  setEvents,
  addToHistory,
  userId,
  accountType,
  originalEventDates,
  setShowMoveConfirmation,
  setPendingModification,
  setMovedEvent,
  setOriginalEventDates,
  setNewEventDates,
  setSelectedEvent,
  setSelectedEventId,
  saveEventsToLocalStorage,
  setPendingChanges
) => {
  console.log('handleModificationConfirm called with type:', modificationType, 'pendingModification:', pendingModification);
  if (!pendingModification) {
    console.error('handleModificationConfirm called but no pending modification');
    return;
  }
  
  // Reset dialog states
  setShowMoveConfirmation(false);
  
  const { type, eventId, event, newStart, newEnd } = pendingModification;
  console.log('Processing event:', eventId, 'with modification type:', type);
  
  if (modificationType === 'cancel') {
    // Reset the event's position to original state
    if (type === MODIFICATION_TYPES.MOVE || type === MODIFICATION_TYPES.RESIZE || type === MODIFICATION_TYPES.MOVE_SINGLE) {
      // Find the event and reset its position
      const updatedEvents = events.map(e => {
        if (e.id === eventId) {
          return {
            ...e,
            start: originalEventDates?.start instanceof Date ? originalEventDates.start : new Date(originalEventDates.start),
            end: originalEventDates?.end instanceof Date ? originalEventDates.end : new Date(originalEventDates.end),
            isBeingMoved: false
          };
        }
        return e;
      });
      
      // Update state to refresh the event's position
      setEvents(updatedEvents);
      
      // Save reverted events to local storage
      if (saveEventsToLocalStorage) {
        console.log('Event move canceled, resetting local storage');
        saveEventsToLocalStorage(updatedEvents);
      }
      
      // Remove event from pending changes
      if (setPendingChanges) {
        setPendingChanges(prev => {
          const newSet = new Set(prev);
          newSet.delete(eventId);
          return newSet;
        });
      }
    }
    
    // Reset all states
    setPendingModification(null);
    setMovedEvent(null);
    setOriginalEventDates(null);
    setNewEventDates(null);
    return;
  }

  // Handle single event modifications
  if (modificationType === 'single') {
    // Update only this occurrence
    const index = events.findIndex(e => String(e.id) === String(eventId));
    if (index !== -1) {
      console.log(`Modifying single event ${eventId} from recurring series`);
      
      const newEvents = [...events];
      // Check if the event had a recurrenceId before updating
      const hadRecurrenceId = !!newEvents[index].recurrenceId;
      
      // Update this specific event
      newEvents[index] = {
        ...newEvents[index],
        start: newStart,
        end: newEnd,
        isBeingMoved: false // Clear the drag flag
      };
      
      // Remove recurrenceId when moving a single child event
      if (hadRecurrenceId) {
        console.log(`Removing recurrenceId from single moved event ${eventId}`);
        delete newEvents[index].recurrenceId;
        newEvents[index].isRecurring = false;
      }
      
      // Update state
      setEvents(newEvents);
      addToHistory(newEvents);
      
      console.log('Single recurring event modification completed');
      
      // Update in database
      if (userId) {
        const eventForUpdate = {
          id: eventId,
          start: newStart,
          end: newEnd,
          title: newEvents[index].title,
          color: newEvents[index].color,
          color1: newEvents[index].color1,
          color2: newEvents[index].color2,
          isValidated: newEvents[index].isValidated || false,
          isRecurring: false, // Set to false since we're detaching from recurrence
          notes: newEvents[index].notes,
          location: newEvents[index].location,
          employees: newEvents[index].employees,
          canton: newEvents[index].canton,
          area: newEvents[index].area,
          experience: newEvents[index].experience,
          software: newEvents[index].software,
          certifications: newEvents[index].certifications,
          isAvailability: newEvents[index].isAvailability
        };

        console.log('Sending update to database for single event:', eventForUpdate);

        updateEvent(eventId, eventForUpdate, userId, accountType)
          .then(result => {
            if (result.success) {
              console.log('Single event modified successfully in database');
            } else {
              console.error('Failed to modify single event in database:', result.error);
            }
          })
          .catch(error => {
            console.error('Error modifying single event in database:', error);
          });
      }
    }
  } 
  // Handle all future occurrences modifications
  else if (modificationType === 'all') {
    const eventDate = new Date(event.start);
    const originalDate = originalEventDates ? new Date(originalEventDates.start) : new Date(event.start);
    const baseId = String(eventId).split(/[-_]/)[0];
    const recurrenceId = event.recurrenceId;
    
    console.log(`Modifying all future occurrences with baseId: ${baseId}, recurrenceId: ${recurrenceId}, eventId: ${eventId}`);
    
    // First, identify all events in this series
    const seriesEvents = events.filter(e => {
      const isInSeries = String(e.id).startsWith(baseId) || 
                         (recurrenceId && e.recurrenceId === recurrenceId);
      return isInSeries;
    });
    
    console.log(`Found ${seriesEvents.length} events in this series`);
    
    // Calculate the time difference between original and new times
    const timeDiff = newStart.getTime() - originalDate.getTime();
    console.log(`Time difference to apply: ${timeDiff}ms`);
    
    // Generate a new recurrenceId for this set of modified events
    const newRecurrenceId = `${userId}_${Date.now()}_recurrence`;
    console.log(`Generated new recurrenceId for modified events: ${newRecurrenceId}`);
    
    // Create a set of modified events for the series
    const modifiedSeriesEvents = [];
    
    // First, ensure the current event is properly updated
    const currentEventIndex = seriesEvents.findIndex(e => String(e.id) === String(eventId));
    if (currentEventIndex !== -1) {
      console.log(`Found current event at index ${currentEventIndex}: ${eventId}`);
      
      const updatedEvent = {
        ...seriesEvents[currentEventIndex],
        start: newStart,
        end: newEnd,
        recurrenceId: newRecurrenceId,
        isBeingMoved: false
      };
      
      modifiedSeriesEvents.push(updatedEvent);
    } else {
      console.warn(`Could not find current event ${eventId} in series events`);
    }
    
    // Now process the rest of the events
    for (const e of seriesEvents) {
      // Skip the current event since we already processed it
      if (String(e.id) === String(eventId)) {
        continue;
      }
      
      const eDate = new Date(e.start);
      
      // Only include future events
      if (eDate >= eventDate) {
        // Apply the same time shift
        const newStart = new Date(e.start.getTime() + timeDiff);
        const newEnd = new Date(e.end.getTime() + timeDiff);
        
        console.log(`Modifying event ${e.id} from ${e.start} to ${newStart}`);
        
        const updatedEvent = {
          ...e,
          start: newStart,
          end: newEnd,
          recurrenceId: newRecurrenceId,
          isBeingMoved: false
        };
        
        modifiedSeriesEvents.push(updatedEvent);
      }
    }
    
    console.log(`Modified ${modifiedSeriesEvents.length} events in total`);
    
    // Replace the entire series in the events array
    const eventsWithoutSeries = events.filter(e => {
      return !(String(e.id).startsWith(baseId) || 
              (recurrenceId && e.recurrenceId === recurrenceId));
    });
    
    const updatedEvents = [...eventsWithoutSeries, ...modifiedSeriesEvents];
    
    // Update state with the new events
    setEvents(updatedEvents);
    addToHistory(updatedEvents);
    
    console.log('All recurring event modifications completed');
    
    // Update in database
    if (userId) {
      console.log('Updating database with modified recurring events');
      
      // For each modified event, update it in the database
      modifiedSeriesEvents.forEach(e => {
        const eventForUpdate = {
          id: e.id,
          start: e.start,
          end: e.end,
          title: e.title,
          color: e.color,
          color1: e.color1,
          color2: e.color2,
          isValidated: e.isValidated || false,
          isRecurring: true,
          recurrenceId: newRecurrenceId,
          notes: e.notes,
          location: e.location,
          employees: e.employees,
          canton: e.canton,
          area: e.area,
          experience: e.experience,
          software: e.software,
          certifications: e.certifications,
          isAvailability: e.isAvailability,
          isBeingMoved: false
        };
        
        updateEvent(e.id, eventForUpdate, userId, accountType)
          .then(result => {
            if (result.success) {
              console.log(`Event ${e.id} modified successfully in database`);
            } else {
              console.error(`Failed to modify event ${e.id} in database:`, result.error);
            }
          })
          .catch(error => {
            console.error(`Error modifying event ${e.id} in database:`, error);
          });
      });
    }
  }
  
  // Reset all states
  setPendingModification(null);
  setMovedEvent(null);
  setOriginalEventDates(null);
  setNewEventDates(null);
}; 