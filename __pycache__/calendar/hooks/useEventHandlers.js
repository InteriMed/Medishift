import { useCallback, useRef, useEffect } from 'react';
import { CALENDAR_COLORS } from '../utils/constants';
import { 
  updateEvent,
  deleteEvent,
  saveEvent,
  saveRecurringEvents
} from '../utils/eventDatabase';
import { modifyEventInDatabase, handleKeyboardDelete } from '../utils/calendarUtils';
import useCalendarStore from './useCalendarStore';
import notificationStore from '../../../../utils/stores/notificationStore';

// Custom hook for event interactions (click, double-click, right-click)
export const useEventInteractions = (userId, accountType) => {
  const {
    setSelectedEvent,
    setSelectedEventId,
    setOriginalEventPosition,
    setIsDragging,
    isDragging,
    dragStartTime,
    selectedEventIds,
    setMultiSelectedEvents,
    clearMultiSelection,
    showContextMenuAt
  } = useCalendarStore();

  const handleEventClick = useCallback((event, e) => {
    console.log('Event click handler called with event:', event);
    e.stopPropagation();
    
    // Handle multi-selection with Ctrl/Cmd key
    if (e.ctrlKey || e.metaKey) {
      setMultiSelectedEvents(prevSelectedIds => {
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
      clearMultiSelection();
    }
    
    // Check if this was a click after a drag
    const timeSinceDragStart = dragStartTime ? Date.now() - dragStartTime : 0;
    const wasRecentDrag = isDragging || timeSinceDragStart < 200;
    
    if (wasRecentDrag) {
      console.log('Event clicked after drag - not opening panel');
      return;
    }
    
    console.log('Clean event click detected - opening event panel');
    
    // Store original event position for potential restoration
    setOriginalEventPosition({
      id: event.id,
      start: new Date(event.start),
      end: new Date(event.end),
      title: event.title,
      color: event.color,
      color1: event.color1,
      color2: event.color2,
      notes: event.notes,
      location: event.location,
      employees: event.employees,
      ...event
    });
    
    // Open event panel
    setSelectedEventId(event.id);
    setSelectedEvent(event);
  }, [
    setSelectedEvent,
    setSelectedEventId,
    setOriginalEventPosition,
    isDragging,
    dragStartTime,
    selectedEventIds,
    setMultiSelectedEvents,
    clearMultiSelection
  ]);

  const handleEventDoubleClick = useCallback((event, e) => {
    console.log('Event double-clicked:', event.id, '- opening event panel');
    e.stopPropagation();
    
    // Store original event position for potential restoration
    setOriginalEventPosition({
      id: event.id,
      start: new Date(event.start),
      end: new Date(event.end),
      title: event.title,
      color: event.color,
      color1: event.color1,
      color2: event.color2,
      notes: event.notes,
      location: event.location,
      employees: event.employees,
      ...event
    });
    
    // Open event panel for detailed editing
    setSelectedEventId(event.id);
    setSelectedEvent(event);
  }, [setSelectedEvent, setSelectedEventId, setOriginalEventPosition]);

  const handleEventRightClick = useCallback((event, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    showContextMenuAt(
      { x: e.clientX, y: e.clientY },
      event
    );
  }, [showContextMenuAt]);

  return {
    handleEventClick,
    handleEventDoubleClick,
    handleEventRightClick
  };
};

// Custom hook for event drag and drop operations
export const useEventDragDrop = (userId, accountType) => {
  const {
    events,
    setEvents,
    addToHistory,
    setIsDragging,
    showMoveDialog,
    setPendingModification,
    addPendingChange,
    addValidatedEvent
  } = useCalendarStore();

  const handleEventMove = useCallback((eventId, newStartDate, newEndDate, isTemporary = false) => {
    const currentEvent = events.find(e => e.id === eventId);
    
    if (!currentEvent) {
      console.error('Event not found:', eventId);
      return;
    }

    // Track drag state
    if (isTemporary) {
      setIsDragging(true);
    } else {
      // End of drag - reset after a delay
      setTimeout(() => {
        setIsDragging(false);
      }, 250);
    }

    // Ensure dates are proper Date objects
    const newStart = newStartDate instanceof Date ? newStartDate : new Date(newStartDate);
    const newEnd = newEndDate instanceof Date ? newEndDate : new Date(newEndDate);

    // Create a copy of events to modify
    const updatedEvents = [...events];
    const eventIndex = updatedEvents.findIndex(e => e.id === eventId);

    if (eventIndex === -1) {
      console.error('Event index not found:', eventId);
      return;
    }

    if (isTemporary) {
      // For temporary moves (during drag), update visual position
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
    const isRecurringEvent = currentEvent.isRecurring || 
      String(eventId).includes('-') || String(eventId).includes('_');

    // Create common structure to store original and new dates for the dialog
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
      showMoveDialog(currentEvent, originalEventDatesObj, newEventDatesObj);
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
    
    // Mark for sync
    addPendingChange(eventId);
    
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
        isRecurring: false,
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

      updateEvent(eventId, eventForUpdate, userId, accountType)
        .then(result => {
          if (result.success) {
            console.log('Event move updated in database');
          } else {
            console.warn('Database update failed (non-critical for move operation):', result.error);
          }
        })
        .catch(error => {
          console.warn('Database update error (non-critical for move operation):', error);
        });
    }
  }, [
    events,
    setEvents,
    addToHistory,
    setIsDragging,
    showMoveDialog,
    addPendingChange,
    userId,
    accountType
  ]);

  const handleEventResize = useCallback((eventId, newStart, newEnd, isTemporary = false) => {
    const event = events.find(e => e.id === eventId);
    
    if (!event) {
      console.error('Event not found:', eventId);
      return;
    }
    
    // Track drag state for resize
    if (isTemporary) {
      setIsDragging(true);
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
    const isRecurringEvent = event.isRecurring || 
      String(eventId).includes('-') || String(eventId).includes('_');
    
    // If this is a recurring event, show confirmation dialog
    if (isRecurringEvent) {
      const originalEventDatesObj = {
        start: event.start instanceof Date ? event.start : new Date(event.start),
        end: event.end instanceof Date ? event.end : new Date(event.end)
      };
      
      const newEventDatesObj = {
        start: newStart,
        end: newEnd
      };
      
      showMoveDialog(event, originalEventDatesObj, newEventDatesObj);
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
    
    // Mark for sync
    addPendingChange(eventId);
  }, [
    events,
    setEvents,
    addToHistory,
    setIsDragging,
    showMoveDialog,
    addPendingChange
  ]);

  return {
    handleEventMove,
    handleEventResize
  };
};

// Custom hook for event CRUD operations
export const useEventCRUD = (userId, accountType) => {
  const {
    events,
    setEvents,
    addToHistory,
    clearSelectedEvent,
    setIsSaving,
    addValidatedEvent,
    removeEvent
  } = useCalendarStore();

  const handleEventSave = useCallback(async (updatedEvent, shouldClose) => {
    console.log("Saving event:", updatedEvent);
    
    // If shouldClose is true, immediately close the panel and show loading
    if (shouldClose) {
      console.log('Immediate panel close and showing loading spinner');
      clearSelectedEvent();
      setIsSaving(true);
    }
    
    // Find the original event if it exists
    const originalEvent = events.find(e => e.id === updatedEvent.id);
    
    // Check if this is a recurring event
    const hasRecurrenceRule = updatedEvent.rrule || (originalEvent && originalEvent.rrule);
    const isEditingExistingRecurring = originalEvent && hasRecurrenceRule;
    const isModifyingRecurring = isEditingExistingRecurring && (
      (originalEvent.recurrenceId) || 
      (typeof updatedEvent.id === 'string' && updatedEvent.id.includes('_')) ||
      (typeof originalEvent.id === 'string' && originalEvent.id.includes('_'))
    );
    
    // For recurring events that need modification dialog
    if (isModifyingRecurring && shouldClose) {
      // This should be handled by the modification dialog
      console.log("Recurring event modification should be handled by dialog");
      return;
    }
    
    // Continue with normal save
    return continueEventSave(updatedEvent, shouldClose);
  }, [events, clearSelectedEvent, setIsSaving]);

  const continueEventSave = useCallback(async (eventWithDates, shouldClose) => {
    let newEvents = [...events];
    
    // If we're editing an existing event, replace it
    const existingEventIndex = newEvents.findIndex(e => e.id === eventWithDates.id);
    
    if (existingEventIndex !== -1) {
      newEvents[existingEventIndex] = {
        ...newEvents[existingEventIndex],
        ...eventWithDates
      };
    } else {
      // This is a new event, add it to events array
      newEvents.push(eventWithDates);
    }
    
    // Handle recurring events
    if (eventWithDates.isRecurring && shouldClose && userId) {
      console.log('Saving recurring events to database');
      
      const eventWithUserData = {
        ...eventWithDates,
        userId: userId
      };
      
      try {
        const result = await saveRecurringEvents(eventWithUserData, userId);
        setIsSaving(false);
        
        if (result.success) {
          console.log('Recurring events saved successfully', result);
          notificationStore.showNotification('Recurring events saved successfully', 'success');
          addValidatedEvent(result.recurrenceId);
          
          // Update the UI with recurrence ID
          const updatedEvents = events.map(event => {
            if (String(event.id) === String(eventWithDates.id)) {
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
        }
      } catch (error) {
        console.error('Error in saveRecurringEvents:', error);
        setIsSaving(false);
        notificationStore.showNotification('Error saving recurring events', 'error');
      }
    } 
    // For non-recurring events
    else if (shouldClose && userId) {
      console.log('Saving regular (non-recurring) event to database');
      
      const eventToSave = {
        ...eventWithDates,
        userId: userId,
        isAvailability: accountType === 'worker' ? true : eventWithDates.isAvailability
      };
      
      try {
        const result = await saveEvent(eventToSave, userId);
        setIsSaving(false);
        
        if (result.success) {
          console.log('Event saved successfully with ID:', result.id);
          addValidatedEvent(result.id);
          
          // Update the event in state with the server ID
          const updatedEvents = events.map(event => {
            if (String(event.id) === String(eventWithDates.id)) {
              return {
                ...event,
                id: result.id,
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
      } catch (error) {
        console.error('Error saving event:', error);
        setIsSaving(false);
        notificationStore.showNotification('Error saving event', 'error');
      }
    } else {
      // For non-database saves, just hide the loading spinner
      if (shouldClose) {
        setIsSaving(false);
      }
    }
    
    // Update UI state
    setEvents(newEvents);
    
    if (shouldClose) {
      addToHistory(newEvents);
    }
  }, [events, setEvents, addToHistory, setIsSaving, addValidatedEvent, userId, accountType]);

  const handleEventDelete = useCallback(async (eventId, deleteType = 'single') => {
    console.log('handleEventDelete called with:', { eventId, deleteType });
    const event = events.find(e => String(e.id) === String(eventId));
    if (!event) {
      console.warn('Event not found for deletion:', eventId);
      return;
    }

    let newEvents;
    const baseId = String(event.id).split('-')[0];
    const currentEventDate = new Date(event.start);

    // Update the local events state
    if (deleteType === 'future' && (event.isRecurring || event.recurrenceId || String(event.id).includes('-'))) {
      console.log('Deleting this and all future occurrences from series');
      newEvents = events.filter(e => {
        if (!String(e.id).startsWith(baseId) && 
            !(e.recurrenceId && e.recurrenceId === event.recurrenceId)) {
          return true;
        }
        const eventDate = new Date(e.start);
        return eventDate < currentEventDate;
      });
    } else if (deleteType === 'all' && (event.isRecurring || event.recurrenceId)) {
      console.log('Deleting all occurrences of the series');
      newEvents = events.filter(e => 
        !(String(e.id).startsWith(baseId) || 
          (e.recurrenceId && e.recurrenceId === event.recurrenceId))
      );
    } else {
      console.log('Deleting only this occurrence');
      newEvents = events.filter(e => String(e.id) !== String(eventId));
    }

    setEvents(newEvents);
    addToHistory(newEvents);
    
    // Delete from database
    if (userId) {
      try {
        const result = await deleteEvent(eventId, userId, accountType, deleteType, event.recurrenceId);
        if (result.success) {
          console.log('Event deleted from database successfully');
        } else {
          console.error('Failed to delete event from database:', result.error);
        }
      } catch (error) {
        console.error('Error deleting event from database:', error);
      }
    }
    
    clearSelectedEvent();
  }, [events, setEvents, addToHistory, clearSelectedEvent, userId, accountType]);

  return {
    handleEventSave,
    handleEventDelete,
    continueEventSave
  };
};

// Custom hook for keyboard shortcuts
export const useKeyboardShortcuts = (userId, accountType) => {
  const {
    history,
    currentHistoryIndex,
    selectedEvent,
    showDeleteConfirmation,
    events,
    undo,
    redo,
    clearSelectedEvent,
    showDeleteDialog
  } = useCalendarStore();

  const handleKeyboardShortcuts = useCallback((e) => {
    // Only handle shortcuts if no input is focused
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    // Ctrl+Z for undo
    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    }
    // Ctrl+Shift+Z or Ctrl+Y for redo
    else if ((e.ctrlKey && e.shiftKey && e.key === 'Z') || (e.ctrlKey && e.key === 'y')) {
      e.preventDefault();
      redo();
    }
    // Delete key for deleting selected event
    else if (e.key === 'Delete' && selectedEvent && !showDeleteConfirmation) {
      e.preventDefault();
      showDeleteDialog(selectedEvent);
    }
    // Escape key for closing panels/dialogs
    else if (e.key === 'Escape') {
      e.preventDefault();
      if (selectedEvent) {
        clearSelectedEvent();
      }
    }
  }, [
    history,
    currentHistoryIndex,
    selectedEvent,
    showDeleteConfirmation,
    events,
    undo,
    redo,
    clearSelectedEvent,
    showDeleteDialog
  ]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardShortcuts);
    return () => document.removeEventListener('keydown', handleKeyboardShortcuts);
  }, [handleKeyboardShortcuts]);
};

// Custom hook for time slot interactions (creating new events)
export const useTimeSlotInteractions = () => {
  const {
    selectedEvent,
    events,
    setEvents,
    addToHistory,
    setSelectedEvent,
    setSelectedEventId,
    setOriginalEventPosition,
    setDragStartPosition,
    setNewEventDates,
    setIsDraggingNewEvent,
    clickTimeout,
    setClickTimeout,
    clickCount,
    setClickCount,
    currentDate,
    view,
    weekScrollOffset
  } = useCalendarStore();

  const handleTimeSlotMouseDown = useCallback((e) => {
    if (selectedEvent) return;

    const timeGrid = e.currentTarget;
    const rect = timeGrid.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const x = e.clientX - rect.left;
    
    const hour = Math.floor(y / 50);
    
    let startDate;
    if (view === 'day') {
      startDate = new Date(currentDate);
    } else {
      const day = Math.floor((x / rect.width) * 7);
      // This would need the week dates helper
      startDate = new Date(currentDate);
      startDate.setDate(startDate.getDate() + day);
    }
    
    startDate.setHours(hour);
    startDate.setMinutes(0);
    
    const endDate = new Date(startDate);
    endDate.setHours(hour + 1);
    endDate.setMinutes(0);

    // Handle double click
    if (clickTimeout) {
      clearTimeout(clickTimeout);
      setClickTimeout(null);
      setClickCount(0);

      // Create event immediately on double click
      const defaultColor = CALENDAR_COLORS.find(c => c.id === 'grey');
      const newEvent = {
        id: String(Date.now()),
        start: startDate,
        end: endDate,
        title: '',
        color: defaultColor.color,
        color1: defaultColor.color1,
        color2: defaultColor.color2,
        isValidated: false
      };

      const newEvents = [...events, newEvent];
      setEvents(newEvents);
      addToHistory(newEvents);
      
      setOriginalEventPosition({
        ...newEvent,
        start: new Date(startDate),
        end: new Date(endDate)
      });
      
      setSelectedEvent(newEvent);
      setSelectedEventId(newEvent.id);
      return;
    }

    // Set timeout for single click
    setClickTimeout(setTimeout(() => {
      setClickTimeout(null);
      setClickCount(0);
    }, 300));

    setClickCount(prev => prev + 1);
    
    setDragStartPosition(startDate);
    setNewEventDates(startDate, endDate);
  }, [
    selectedEvent,
    events,
    setEvents,
    addToHistory,
    setSelectedEvent,
    setSelectedEventId,
    setOriginalEventPosition,
    setDragStartPosition,
    setNewEventDates,
    clickTimeout,
    setClickTimeout,
    clickCount,
    setClickCount,
    currentDate,
    view,
    weekScrollOffset
  ]);

  return {
    handleTimeSlotMouseDown
  };
}; 