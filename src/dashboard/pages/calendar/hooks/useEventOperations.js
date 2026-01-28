import { useState, useCallback } from 'react';
import { CALENDAR_COLORS } from '../utils/constants';
import {
  saveEvent,
  updateEvent,
  deleteEvent,
  saveRecurringEvents
} from '../utils/eventDatabase';
import { handleModificationConfirm as handleModificationConfirmUtil } from '../utils/eventModificationUtils';
// import notificationStore from '../../../../utils/stores/notificationStore';

/**
 * Custom hook for event operations
 * Handles event CRUD operations, validation, and database synchronization
 * 
 * Extracted from Calendar.js to separate business logic from UI logic
 */
export const useEventOperations = (userId, accountType, workspaceContext, currentDate, setCurrentDate, CALENDAR_COLORS, saveEventsToLocalStorage, setPendingChanges) => {
  // Events state
  const [events, setEvents] = useState([]);
  // Event selection state
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [selectedEventIds, setSelectedEventIds] = useState([]);

  // Event modification state
  const [originalEventPosition, setOriginalEventPosition] = useState(null);
  const [validatedEvents, setValidatedEvents] = useState(new Set());

  // modal states
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [showMoveConfirmation, setShowMoveConfirmation] = useState(false);
  const [movedEvent, setMovedEvent] = useState(null);
  const [originalEventDates, setOriginalEventDates] = useState(null);
  const [newEventDates, setNewEventDates] = useState(null);
  const [showModificationmodal, setShowModificationmodal] = useState(false);
  const [pendingModification, setPendingModification] = useState(null);

  // Loading state
  const [isSaving, setIsSaving] = useState(false);

  // History management
  const [history, setHistory] = useState([[]]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(0);

  // Slide direction state
  const [slideDirection, setSlideDirection] = useState(null);

  // Drag states
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartTime, setDragStartTime] = useState(null);

  // Add to history
  const addToHistory = useCallback((events) => {
    const newHistory = history.slice(0, currentHistoryIndex + 1);
    newHistory.push([...events]);
    setHistory(newHistory);
    setCurrentHistoryIndex(newHistory.length - 1);
  }, [history, currentHistoryIndex]);

  // Undo/Redo functions
  const undo = useCallback((events, setEvents) => {
    if (currentHistoryIndex > 0) {
      const newIndex = currentHistoryIndex - 1;
      setCurrentHistoryIndex(newIndex);
      setEvents([...history[newIndex]]);

      // Clear selected event if it no longer exists in the previous state
      const previousEvents = history[newIndex];
      if (selectedEvent && !previousEvents.find(e => e.id === selectedEvent.id)) {
        setSelectedEvent(null);
        setSelectedEventId(null);
      }
    }
  }, [currentHistoryIndex, history, selectedEvent]);

  const redo = useCallback((events, setEvents) => {
    if (currentHistoryIndex < history.length - 1) {
      const newIndex = currentHistoryIndex + 1;
      setCurrentHistoryIndex(newIndex);
      setEvents([...history[newIndex]]);

      // Clear selected event if it no longer exists in the next state
      const nextEvents = history[newIndex];
      if (selectedEvent && !nextEvents.find(e => e.id === selectedEvent.id)) {
        setSelectedEvent(null);
        setSelectedEventId(null);
      }
    }
  }, [currentHistoryIndex, history, selectedEvent]);

  // Event click handler
  const handleEventClick = useCallback((event, e, events, isDragging, dragStartTime) => {
    console.log('handleEventClick called with event:', event);
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }

    // Handle multi-selection with Ctrl/Cmd key
    if (e && (e.ctrlKey || e.metaKey)) {
      setSelectedEventIds(prevSelectedIds => {
        const isSelected = prevSelectedIds.includes(event.id);
        if (isSelected) {
          return prevSelectedIds.filter(id => id !== event.id);
        } else {
          return [...prevSelectedIds, event.id];
        }
      });
      return;
    }

    // Clear multi-selection when clicking without modifier keys
    if (selectedEventIds.length > 0) {
      setSelectedEventIds([]);
    }

    // Check if this was a click after a drag
    const timeSinceDragStart = dragStartTime ? Date.now() - dragStartTime : 0;
    const wasRecentDrag = isDragging || timeSinceDragStart < 200;

    if (wasRecentDrag) {
      console.log('Event clicked after drag - not opening panel');
      return;
    }

    // This is a clean click - open the event panel
    console.log('Clean event click detected - opening event panel');

    // Find the full event data
    const clickedEvent = events.find(ev => ev.id === event.id) || event;

    // Store original event position for potential restoration
    setOriginalEventPosition({
      id: clickedEvent.id,
      start: new Date(clickedEvent.start),
      end: new Date(clickedEvent.end),
      title: clickedEvent.title,
      color: clickedEvent.color,
      color1: clickedEvent.color1,
      color2: clickedEvent.color2,
      notes: clickedEvent.notes,
      location: clickedEvent.location,
      employees: clickedEvent.employees,
      ...clickedEvent
    });

    // Open event panel
    setSelectedEventId(event.id);
    setSelectedEvent(clickedEvent);
  }, [selectedEventIds]);

  // Event double-click handler
  const handleEventDoubleClick = useCallback((event, e, events) => {
    console.log('Event double-clicked:', event.id, '- opening event panel');
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }

    // Find the full event data
    const clickedEvent = events.find(ev => ev.id === event.id) || event;

    // Store original event position for potential restoration
    setOriginalEventPosition({
      id: clickedEvent.id,
      start: new Date(clickedEvent.start),
      end: new Date(clickedEvent.end),
      title: clickedEvent.title,
      color: clickedEvent.color,
      color1: clickedEvent.color1,
      color2: clickedEvent.color2,
      notes: clickedEvent.notes,
      location: clickedEvent.location,
      employees: clickedEvent.employees,
      ...clickedEvent
    });

    // Open event panel for detailed editing
    setSelectedEventId(event.id);
    setSelectedEvent(clickedEvent);
  }, []);

  // Handle panel close
  const handlePanelClose = useCallback((events, setEvents) => {
    console.log('Panel closing, checking if event needs to be restored or removed');

    // Check if the selected event was a temporary draft (unsaved NEW event)
    // Temp events ARE in the array now (for visibility), so we need to remove them
    if (selectedEvent && String(selectedEvent.id).startsWith('temp-')) {
      console.log('Removing unsaved temp event from array:', selectedEvent.id);
      const newEvents = events.filter(e => e.id !== selectedEvent.id);
      setEvents(newEvents);

      setSelectedEvent(null);
      setSelectedEventId(null);
      setOriginalEventPosition(null);
      return;
    }

    // If we have an original event position and a currently selected event, restore it
    if (originalEventPosition && selectedEvent && originalEventPosition.id === selectedEvent.id) {
      console.log('Restoring event to original position:', originalEventPosition);

      // Find the current event in the events array
      const currentEventIndex = events.findIndex(e => e.id === selectedEvent.id);

      if (currentEventIndex !== -1) {
        // Check if the event has been modified by comparing key properties
        const currentEvent = events[currentEventIndex];
        const currentStart = currentEvent.start instanceof Date ? currentEvent.start : new Date(currentEvent.start);
        const currentEnd = currentEvent.end instanceof Date ? currentEvent.end : new Date(currentEvent.end);
        const originalStart = originalEventPosition.start instanceof Date ? originalEventPosition.start : new Date(originalEventPosition.start);
        const originalEnd = originalEventPosition.end instanceof Date ? originalEventPosition.end : new Date(originalEventPosition.end);
        
        const isModified = (
          currentStart.getTime() !== originalStart.getTime() ||
          currentEnd.getTime() !== originalEnd.getTime() ||
          (currentEvent.title || '') !== (originalEventPosition.title || '') ||
          (currentEvent.notes || '') !== (originalEventPosition.notes || '') ||
          (currentEvent.location || '') !== (originalEventPosition.location || '') ||
          (currentEvent.employees || '') !== (originalEventPosition.employees || '') ||
          (currentEvent.color || '') !== (originalEventPosition.color || '')
        );

        if (isModified) {
          console.log('Event was modified, restoring to original state');
          // Restore the event to its original state, preserving fromDatabase flag
          const restoredEvents = [...events];
          restoredEvents[currentEventIndex] = {
            ...originalEventPosition,
            start: new Date(originalEventPosition.start),
            end: new Date(originalEventPosition.end),
            fromDatabase: currentEvent.fromDatabase || false,
            isValidated: currentEvent.isValidated || false
          };

          setEvents(restoredEvents);
          addToHistory(restoredEvents);
        } else {
          console.log('Event was not modified, no restoration needed');
        }
      }
    }

    // Clear all panel-related state
    setSelectedEvent(null);
    setSelectedEventId(null);
    setOriginalEventPosition(null);
  }, [originalEventPosition, selectedEvent, addToHistory]);


  // Continue event save helper
  const continueEventSave = useCallback((eventWithDates, shouldClose, isAlreadyProcessedByPanel = false, events, setEvents) => {
    // Extract baseId from event ID if it's a recurring event instance
    const baseId = String(eventWithDates.id).includes('_')
      ? String(eventWithDates.id).split('_')[0]
      : eventWithDates.id;

    // Create a new copy of events for state update
    let newEvents = [...events];

    // If we're editing an existing event, replace it
    const existingEventIndex = newEvents.findIndex(e => e.id === eventWithDates.id);

    if (existingEventIndex !== -1) {
      // Update single existing event
      newEvents[existingEventIndex] = {
        ...newEvents[existingEventIndex],
        ...eventWithDates
      };
    } else {
      // This is a new event, add it to events array
      newEvents.push(eventWithDates);
    }

    // Handle recurring events
    if (eventWithDates.isRecurring && shouldClose) {
      console.log('Event save details:', {
        id: eventWithDates.id,
        baseId: baseId,
        isNowRecurring: eventWithDates.isRecurring,
        repeatValue: eventWithDates.repeatValue,
        isAvailability: eventWithDates.isAvailability,
        shouldClose: shouldClose,
        alreadyProcessed: isAlreadyProcessedByPanel
      });

      // Filter out any existing recurring events with the same base ID
      const existingRecurring = newEvents.filter(e =>
        e.id !== eventWithDates.id && // Don't filter out the event we're editing
        (e.recurrenceId === eventWithDates.recurrenceId || // Same recurrence ID
          (String(e.id).includes('_') && String(e.id).split('_')[0] === String(baseId))) // Derived from same base ID
      );

      console.log(`Filtered out ${existingRecurring.length} existing recurring events`);

      // Remove existing recurring events from the events array before adding new ones
      newEvents = newEvents.filter(e => !existingRecurring.includes(e));

      // If this is a recurring event being saved to database (shouldClose is true)
      if (shouldClose && userId && !isAlreadyProcessedByPanel) {
        console.log('Final save: should save recurring events to database');

        // Check if event has a baseId that's different from its id
        if (baseId !== eventWithDates.id) {
          console.log('Updating instance of recurring event with baseId:', baseId);
        }

        console.log('Calling saveRecurringEvents with:', eventWithDates);
        console.log('userId value:', userId);

        // Direct call to saveRecurringEvents for worker account recurring events
        if (accountType === 'worker' && !isAlreadyProcessedByPanel) {
          console.log('Making direct call to saveRecurringEvents');
          const eventWithUserData = {
            ...eventWithDates,
            userId: userId // Explicitly add userId to the event data
          };

          // Save recurring events
          saveRecurringEvents(eventWithUserData, userId)
            .then(result => {
              console.log('saveRecurringEvents result:', result);
              setIsSaving(false); // Hide loading spinner

              if (result.success) {
                console.log('Recurring events saved successfully', result);
                notificationStore.showNotification('Recurring events saved successfully', 'success');

                // Mark event as validated
                setValidatedEvents(prev => new Set([...prev, result.recurrenceId]));

                // Update the UI with recurrence ID
                const updatedEvents = events.map(event => {
                  if (String(event.id) === String(baseId)) {
                    return {
                      ...event,
                      fromDatabase: true,
                      recurrenceId: result.recurrenceId,
                      isValidated: true
                    };
                  }
                  return event;
                });
                setEvents(updatedEvents);
              } else {
                console.error('Failed to save recurring events', result.error);
                notificationStore.showNotification('Failed to save recurring events: ' + (result.error || 'Unknown error'), 'error');

                // Fall back to saveEvent as a backup
                console.log('Falling back to saveEvent for recurring event');
                saveRecurringEventFallback(eventWithDates, baseId);
              }
            })
            .catch(error => {
              console.error('Error in saveRecurringEvents:', error);
              setIsSaving(false); // Hide loading spinner
              notificationStore.showNotification('Error saving recurring events', 'error');

              // Fall back to saveEvent on error
              saveRecurringEventFallback(eventWithDates, baseId);
            });
        }
      }
    }
    // If this is not a recurring event and we're saving to the database
    else if (shouldClose && userId && !isAlreadyProcessedByPanel) {
      console.log('Saving regular (non-recurring) event to database');

      const eventToSave = {
        ...eventWithDates,
        userId: userId,
        isAvailability: accountType === 'worker' ? true : eventWithDates.isAvailability
      };

      // Direct call to saveEvent for non-recurring events
      saveEvent(eventToSave, userId)
        .then(result => {
          console.log('Regular saveEvent result:', result);
          setIsSaving(false); // Hide loading spinner

          if (result.success) {
            console.log('Event saved successfully with ID:', result.id);

            // Mark event as validated
            setValidatedEvents(prev => new Set([...prev, result.id]));

            // Find the saved event in our state and mark it as fromDatabase
            const updatedEvents = events.map(event => {
              if (String(event.id) === String(eventWithDates.id)) {
                return {
                  ...event,
                  id: result.id, // Use the ID returned from the server
                  fromDatabase: true,
                  isValidated: true
                };
              }
              return event;
            });

            setEvents(updatedEvents);
            notificationStore.showNotification('Event saved successfully', 'success');
          } else {
            console.error('Failed to save event:', result.error);
            notificationStore.showNotification('Failed to save event: ' + (result.error || 'Unknown error'), 'error');
          }
        })
        .catch(error => {
          console.error('Error saving event:', error);
          setIsSaving(false); // Hide loading spinner
          notificationStore.showNotification('Error saving event', 'error');
        });
    } else {
      // For non-database saves, just hide the loading spinner
      if (shouldClose) {
        setIsSaving(false);
      }
    }

    // Update UI state regardless of database operations
    setEvents(newEvents);

    if (shouldClose) {
      addToHistory(newEvents);
    } else {
      // If not closing, update the selected event state to reflect the changes made
      const currentlySelectedInstance = newEvents.find(e => String(e.id) === String(eventWithDates.id)) ||
        newEvents.find(e => String(e.id).startsWith(baseId));
      setSelectedEvent(currentlySelectedInstance || null);
      setSelectedEventId(currentlySelectedInstance ? String(currentlySelectedInstance.id) : null);
    }
  }, [userId, accountType, addToHistory]);

  // Helper function to fall back to normal saveEvent for recurring events
  const saveRecurringEventFallback = useCallback((eventWithDates, baseId) => {
    console.log('Using saveRecurringEventFallback with direct saveEvent call');

    const eventToSave = {
      ...eventWithDates,
      id: baseId,
      fromDatabase: true,
      isAvailability: accountType === 'worker' ? true : eventWithDates.isAvailability
    };

    // Direct call to saveEvent
    saveEvent(eventToSave, userId)
      .then(result => {
        console.log('Fallback saveEvent result:', result);
        setIsSaving(false); // Hide loading spinner

        if (result.success) {
          console.log('Fallback save successful');
          notificationStore.showNotification('Event saved successfully', 'success');

          // Mark event as validated
          setValidatedEvents(prev => new Set([...prev, baseId]));
        } else {
          console.error('Fallback save failed:', result.error);
          notificationStore.showNotification('Failed to save event: ' + (result.error || 'Unknown error'), 'error');
        }
      })
      .catch(error => {
        console.error('Error in fallback save:', error);
        setIsSaving(false); // Hide loading spinner
        notificationStore.showNotification('Error saving event', 'error');
      });
  }, [accountType, userId]);

  // Event delete handler
  const handleEventDelete = useCallback((eventId, deleteType = 'single', events, setEvents) => {
    console.log('handleEventDelete called with:', { eventId, deleteType });
    const event = events.find(e => String(e.id) === String(eventId));
    if (!event) {
      console.warn('Event not found for deletion:', eventId);
      return;
    }

    let newEvents;
    // Extract the base ID or use the full ID if it doesn't contain a separator
    const baseId = String(event.id).split('-')[0];
    const currentEventDate = new Date(event.start);

    // First update the local events state
    if (deleteType === 'future' && (event.isRecurring || event.recurrenceId || String(event.id).includes('-'))) {
      console.log('Deleting this and all future occurrences from series');
      // Delete this and all future occurrences
      newEvents = events.filter(e => {
        if (!String(e.id).startsWith(baseId) &&
          !(e.recurrenceId && e.recurrenceId === event.recurrenceId)) {
          return true; // Keep events from other series
        }
        const eventDate = new Date(e.start);
        return eventDate < currentEventDate; // Keep only past events from this series
      });
    } else if (deleteType === 'all' && (event.isRecurring || event.recurrenceId)) {
      console.log('Deleting all occurrences of the series');
      // Delete all occurrences of this series
      newEvents = events.filter(e =>
        !(String(e.id).startsWith(baseId) ||
          (e.recurrenceId && e.recurrenceId === event.recurrenceId))
      );
    } else {
      // Delete only this occurrence
      console.log('Deleting only this occurrence');
      newEvents = events.filter(e => String(e.id) !== String(eventId));
    }

    console.log('Event Delete - Updated events array:', newEvents);
    setEvents(newEvents);
    addToHistory(newEvents);

    // Delete from database
    if (userId) {
      // Pass the recurrenceId to help database identify recurring events series
      deleteEvent(eventId, userId, accountType, deleteType, event.recurrenceId)
        .then(result => {
          if (result.success) {
            console.log('Event deleted from database successfully');
          } else {
            console.error('Failed to delete event from database:', result.error);
          }
        })
        .catch(error => {
          console.error('Error deleting event from database:', error);
        });
    } else {
      console.warn('Auth not ready or user not logged in, event not deleted from database');
    }

    setSelectedEvent(null);
    setSelectedEventId(null);
    setShowDeleteConfirmation(false);
    setEventToDelete(null);
  }, [userId, accountType, addToHistory]);

  // Create new event
  const handleCreateEventClick = useCallback((currentDate) => {
    const startTime = new Date(currentDate);
    startTime.setHours(9, 0, 0, 0); // Fixed time: 9:00 AM

    const endTime = new Date(startTime);
    endTime.setHours(10, 0, 0, 0); // Fixed time: 10:00 AM

    const newEvent = {
      id: `temp-${Date.now()}`,
      title: '',
      start: startTime,
      end: endTime,
      color: CALENDAR_COLORS[0].color,
      color1: CALENDAR_COLORS[0].color1,
      category: CALENDAR_COLORS[0].name,
      notes: '',
      location: '',
      employees: '',
      isRecurring: false,
      position: { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    };

    // Store original position for new events too
    setOriginalEventPosition({
      ...newEvent,
      start: new Date(startTime),
      end: new Date(endTime)
    });

    setSelectedEvent(newEvent);
  }, [CALENDAR_COLORS]);

  // Handle event drop on day headers for cross-day dragging
  const handleEventDropOnDay = useCallback((draggedEvent, targetDate) => {
    if (!draggedEvent || !targetDate) return;

    // Calculate the time difference to maintain the same time when moving to a different day
    const originalStart = new Date(draggedEvent.start);
    const originalEnd = new Date(draggedEvent.end);
    const duration = originalEnd.getTime() - originalStart.getTime();

    // Create new start and end times on the target date
    const newStart = new Date(targetDate);
    newStart.setHours(originalStart.getHours(), originalStart.getMinutes(), 0, 0);

    const newEnd = new Date(newStart.getTime() + duration);

    // Use the existing handleEventMove function to handle the move
    // Note: This would need to be implemented or passed from the drag hook
    console.log('Event drop on day:', { draggedEvent, targetDate, newStart, newEnd });
  }, []);

  // Event save handler
  const handleEventSave = useCallback((updatedEvent, shouldClose) => {
    console.log("Saving event:", updatedEvent);

    // If shouldClose is true, immediately close the panel, mark as validated, and show loading
    if (shouldClose) {
      console.log('Immediate panel close, mark as validated, and showing loading spinner');

      // Immediately mark the event as validated and change color to blue
      const updatedEvents = events.map(e => {
        if (e.id === updatedEvent.id) {
          return {
            ...e,
            ...updatedEvent,
            isValidated: true,
            color: CALENDAR_COLORS.find(c => c.id === 'blue')?.color || e.color,
            color1: CALENDAR_COLORS.find(c => c.id === 'blue')?.color1 || e.color1,
            color2: CALENDAR_COLORS.find(c => c.id === 'blue')?.color2 || e.color2,
            fromDatabase: true
          };
        }
        return e;
      });

      // If it's a new event, add it to the array
      const existingEventIndex = events.findIndex(e => e.id === updatedEvent.id);
      if (existingEventIndex === -1) {
        updatedEvents.push({
          ...updatedEvent,
          isValidated: true,
          color: CALENDAR_COLORS.find(c => c.id === 'blue')?.color || updatedEvent.color,
          color1: CALENDAR_COLORS.find(c => c.id === 'blue')?.color1 || updatedEvent.color1,
          color2: CALENDAR_COLORS.find(c => c.id === 'blue')?.color2 || updatedEvent.color2,
          fromDatabase: true
        });
      }

      // Update events immediately
      setEvents(updatedEvents);
      addToHistory(updatedEvents);

      // Mark as validated immediately
      setValidatedEvents(prev => new Set([...prev, updatedEvent.id]));

      // Close panel immediately
      setSelectedEvent(null);
      setSelectedEventId(null);
      setOriginalEventPosition(null);
      setIsSaving(true);
    }

    // Continue with database save operation (async in background)
    const existingEvent = events.find(e => e.id === updatedEvent.id);
    const isNewEvent = !existingEvent?.fromDatabase;

    if (userId && shouldClose) {
      const eventToSave = {
        ...updatedEvent,
        userId: userId,
        isAvailability: accountType === 'worker' ? true : updatedEvent.isAvailability,
        isValidated: true // Mark as validated for database
      };

      // Save to database in background
      if (updatedEvent.isRecurring && updatedEvent.repeatValue && updatedEvent.repeatValue !== 'None') {
        console.log('Saving recurring event to database in background');
        saveRecurringEvents(eventToSave, userId)
          .then(result => {
            console.log('Background recurring save result:', result);
            setIsSaving(false);
            if (result.success) {
              notificationStore.showNotification('Recurring events saved successfully', 'success');
            } else {
              console.error('Failed to save recurring events', result.error);
              notificationStore.showNotification('Failed to save recurring events: ' + (result.error || 'Unknown error'), 'error');
            }
          })
          .catch(error => {
            console.error('Error saving recurring events:', error);
            setIsSaving(false);
            notificationStore.showNotification('Error saving recurring events', 'error');
          });
      } else if (isNewEvent) {
        // New event - save to database
        console.log('Saving new event to database in background');
        saveEvent(eventToSave, userId)
          .then(result => {
            console.log('Background save result:', result);
            setIsSaving(false);
            if (result.success) {
              notificationStore.showNotification('Event saved successfully', 'success');

              // Update the event with the database ID if needed
              if (result.id && result.id !== updatedEvent.id) {
                setEvents(prevEvents => prevEvents.map(e =>
                  e.id === updatedEvent.id ? { ...e, id: result.id } : e
                ));
              }
            } else {
              console.error('Failed to save event:', result.error);
              notificationStore.showNotification('Failed to save event: ' + (result.error || 'Unknown error'), 'error');
            }
          })
          .catch(error => {
            console.error('Error saving event:', error);
            setIsSaving(false);
            notificationStore.showNotification('Error saving event', 'error');
          });
      } else {
        // Existing event - update in database
        console.log('Updating existing event in database in background');
        updateEvent(updatedEvent.id, eventToSave, userId, accountType)
          .then(result => {
            console.log('Background update result:', result);
            setIsSaving(false);
            if (result.success) {
              notificationStore.showNotification('Event updated successfully', 'success');
              // Mark event as validated
              setValidatedEvents(prev => new Set([...prev, updatedEvent.id]));
            } else {
              console.error('Failed to update event:', result.error);
              notificationStore.showNotification('Failed to update event: ' + (result.error || 'Unknown error'), 'error');
            }
          })
          .catch(error => {
            console.error('Error updating event:', error);
            setIsSaving(false);
            notificationStore.showNotification('Error updating event', 'error');
          });
      }
    } else {
      // For non-database saves, just update the events and close
      const updatedEvents = events.map(e =>
        e.id === updatedEvent.id ? { ...e, ...updatedEvent } : e
      );

      if (!events.find(e => e.id === updatedEvent.id)) {
        updatedEvents.push(updatedEvent);
      }

      setEvents(updatedEvents);
      if (shouldClose) {
        addToHistory(updatedEvents);
        setIsSaving(false);
      }
    }
  }, [events, setEvents, addToHistory, setValidatedEvents, setSelectedEvent, setSelectedEventId, setOriginalEventPosition, setIsSaving, userId, accountType, CALENDAR_COLORS]);

  // Placeholder event handlers (these need to be properly implemented)
  const handleEventRightClick = useCallback((event, e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Event right-clicked:', event);
  }, []);

  const handleEventResize = useCallback((eventId, newStart, newEnd, isTemporary = false) => {
    const event = events.find(e => e.id === eventId);

    if (!event) {
      console.error('Event not found:', eventId);
      return;
    }

    // Track drag state for resize
    if (isTemporary) {
      setIsDragging(true);
      setDragStartTime(Date.now());
    } else {
      // End of resize - reset after a delay
      setTimeout(() => {
        setIsDragging(false);
      }, 250);
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

    const isRecurringEvent = event.isRecurring || originalEvent?.recurrence ||
      isRecurringInstance || String(eventId).includes('-') || String(eventId).includes('_');

    // If this is a recurring event, show confirmation modal
    if (isRecurringEvent) {
      // Store the pending modification for the modal
      setPendingModification({
        type: 'resize',
        eventId: eventId,
        event: event,
        originalEvent: originalEvent,
        newStart: newStart,
        newEnd: newEnd
      });

      // Store original and new dates for the modal
      setOriginalEventDates({
        start: event.start instanceof Date ? event.start : new Date(event.start),
        end: event.end instanceof Date ? event.end : new Date(event.end)
      });
      setNewEventDates({
        start: newStart,
        end: newEnd
      });
      setMovedEvent(event);

      // Ensure the modal shows up even with quick mouse movements
      // Use requestAnimationFrame to make sure it appears in the next frame
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

    // Update in database if it's an existing event
    const isNewEvent = !event.isValidated && !event.fromDatabase;

    if (userId && !isNewEvent) {
      const eventForUpdate = {
        id: eventId,
        start: newStart,
        end: newEnd,
        title: event.title,
        color: event.color,
        color1: event.color1,
        color2: event.color2,
        isValidated: event.isValidated || false,
        isRecurring: false, // Set to false since we're detaching from recurrence for single resizes
        notes: event.notes,
        location: event.location,
        employees: event.employees,
        canton: event.canton,
        area: event.area,
        experience: event.experience,
        software: event.software,
        certifications: event.certifications,
        isAvailability: event.isAvailability
      };

      console.log('Updating resized event in database:', eventForUpdate);

      updateEvent(eventId, eventForUpdate, userId, accountType)
        .then(result => {
          if (result.success) {
            console.log('Event resize updated in database successfully');
            // Mark event as validated
            setValidatedEvents(prev => new Set([...prev, eventId]));
          } else {
            console.warn('Database update failed for resize operation:', result.error);
            notificationStore.showNotification('Failed to save resize changes', 'warning');
          }
        })
        .catch(error => {
          console.warn('Database update error for resize operation:', error);
          notificationStore.showNotification('Failed to save resize changes', 'warning');
        });
    } else {
      console.log('Skipping database update - either no userId or event is new');
    }

    console.log('Event resized successfully');
  }, [events, setEvents, addToHistory, setPendingModification, setOriginalEventDates, setNewEventDates, setMovedEvent, setShowMoveConfirmation, setIsDragging, setDragStartTime]);

  const handleEventMove = useCallback((eventId, newStartDate, newEndDate, isTemporary = false) => {
    const currentEvent = events.find(e => e.id === eventId);

    if (!currentEvent) {
      console.error('Event not found:', eventId);
      return;
    }

    // Track drag state
    if (isTemporary) {
      setIsDragging(true);
      setDragStartTime(Date.now());
    } else {
      // End of drag - reset after a delay
      setTimeout(() => {
        setIsDragging(false);
      }, 250);
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
    const isRecurringEvent = currentEvent.isRecurring || originalEvent?.recurrence ||
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

    // If this is a recurring event, show confirmation modal
    if (isRecurringEvent) {
      // Store the pending modification for the modal
      setPendingModification({
        type: isRecurringInstance ? 'move_single' : 'move',
        eventId: eventId,
        event: currentEvent,
        originalEvent: originalEvent,
        newStart: newStart,
        newEnd: newEnd
      });

      // Store original and new dates for the modal
      setOriginalEventDates({
        start: currentEvent.start instanceof Date ? currentEvent.start : new Date(currentEvent.start),
        end: currentEvent.end instanceof Date ? currentEvent.end : new Date(currentEvent.end)
      });
      setNewEventDates({
        start: newStart,
        end: newEnd
      });

      // Add isLastOccurrence flag to the moved event for the modal
      setMovedEvent({
        ...currentEvent,
        isLastOccurrence: isLastOccurrence
      });

      // Ensure the modal shows up even with quick mouse movements
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

    // Update in database if it's an existing event
    const isNewEvent = !currentEvent.isValidated && !currentEvent.fromDatabase;

    if (userId && !isNewEvent) {
      const eventForUpdate = {
        id: eventId,
        start: newStart,
        end: newEnd,
        title: currentEvent.title,
        color: currentEvent.color,
        color1: currentEvent.color1,
        color2: currentEvent.color2,
        isValidated: currentEvent.isValidated || false,
        isRecurring: false, // Set to false since we're detaching from recurrence for single moves
        notes: currentEvent.notes,
        location: currentEvent.location,
        employees: currentEvent.employees,
        canton: currentEvent.canton,
        area: currentEvent.area,
        experience: currentEvent.experience,
        software: currentEvent.software,
        certifications: currentEvent.certifications,
        isAvailability: currentEvent.isAvailability
      };

      console.log('Updating moved event in database:', eventForUpdate);

      updateEvent(eventId, eventForUpdate, userId, accountType)
        .then(result => {
          if (result.success) {
            console.log('Event move updated in database successfully');
            // Mark event as validated
            setValidatedEvents(prev => new Set([...prev, eventId]));
          } else {
            console.warn('Database update failed for move operation:', result.error);
            notificationStore.showNotification('Failed to save move changes', 'warning');
          }
        })
        .catch(error => {
          console.warn('Database update error for move operation:', error);
          notificationStore.showNotification('Failed to save move changes', 'warning');
        });
    } else {
      console.log('Skipping database update - either no userId or event is new');
    }

    console.log('Event moved successfully');
  }, [events, setEvents, addToHistory, setPendingModification, setOriginalEventDates, setNewEventDates, setMovedEvent, setShowMoveConfirmation, setIsDragging, setDragStartTime]);

  const handleModificationConfirm = useCallback((modificationType) => {
    console.log('Modification confirm:', modificationType);
    
    if (!pendingModification) {
      console.error('handleModificationConfirm called but no pending modification');
      return;
    }
    
    handleModificationConfirmUtil(
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
    );
  }, [pendingModification, events, setEvents, addToHistory, userId, accountType, originalEventDates, setShowMoveConfirmation, setPendingModification, setMovedEvent, setOriginalEventDates, setNewEventDates, setSelectedEvent, setSelectedEventId, saveEventsToLocalStorage, setPendingChanges]);

  const handleMoveConfirm = useCallback(() => {
    console.log('Move confirm');
    handleModificationConfirm('single');
  }, [handleModificationConfirm]);

  const handleMoveAllConfirm = useCallback(() => {
    console.log('Move all confirm');
    handleModificationConfirm('all');
  }, [handleModificationConfirm]);

  const handleMoveCancel = useCallback(() => {
    console.log('Move cancel');
    handleModificationConfirm('cancel');
  }, [handleModificationConfirm]);

  const handleEventChangeComplete = useCallback(() => {
    console.log('Event change complete');
    addToHistory([...events]);
  }, [addToHistory, events]);

  return {
    // Events state
    events,
    setEvents,
    // Event selection state
    selectedEvent,
    setSelectedEvent,
    selectedEventId,
    setSelectedEventId,
    selectedEventIds,
    setSelectedEventIds,

    // Event modification state
    originalEventPosition,
    setOriginalEventPosition,
    validatedEvents,
    setValidatedEvents,

    // modal states
    showDeleteConfirmation,
    setShowDeleteConfirmation,
    eventToDelete,
    setEventToDelete,
    showMoveConfirmation,
    setShowMoveConfirmation,
    movedEvent,
    setMovedEvent,
    originalEventDates,
    setOriginalEventDates,
    newEventDates,
    setNewEventDates,
    showModificationmodal,
    setShowModificationmodal,
    pendingModification,
    setPendingModification,

    // Loading state
    isSaving,
    setIsSaving,

    // History
    history,
    currentHistoryIndex,
    addToHistory,

    // Event handlers
    handleEventClick,
    handleEventDoubleClick,
    handleEventRightClick,
    handlePanelClose,
    handleEventSave,
    handleEventDelete,
    handleEventResize,
    handleEventMove,
    handleModificationConfirm,
    handleMoveConfirm,
    handleMoveAllConfirm,
    handleMoveCancel,
    handleEventChangeComplete,
    handleCreateEventClick,
    handleEventDropOnDay,
    undo,
    redo,

    // Slide direction
    slideDirection,
    setSlideDirection,

    // Drag states
    isDragging,
    setIsDragging,
    dragStartTime,
    setDragStartTime
  };
}; 