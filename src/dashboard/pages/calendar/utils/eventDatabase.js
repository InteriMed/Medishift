import { useState, useEffect, useRef } from 'react';
import { useAction } from '../../../../services/actions/hook';

// FETCH USER EVENTS
export const fetchUserEvents = async (execute, userId, accountType = "worker") => {
  try {
    const result = await execute('calendar.list_events', {
      includeContracts: accountType === 'employer' || accountType === 'worker' || accountType === 'professional'
    });

    if (!result || !result.events) {
      return { success: false, error: 'No events returned' };
    }

    // Map events to frontend format
    const events = result.events.map(event => ({
      ...event,
      start: new Date(event.start),
      end: new Date(event.end),
      fromDatabase: true
    }));

    return { success: true, events };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
};

// SAVE EVENT
export const saveEvent = async (execute, event, userId) => {
  console.log('[eventDatabase] saveEvent called', { eventId: event.id, userId, eventTitle: event.title });
  
  try {
    console.log('[eventDatabase] Preparing event data for action catalog');
    
    const result = await execute('calendar.create_event', {
      title: event.title || 'Available',
      start: event.start instanceof Date ? event.start.toISOString() : event.start,
      end: event.end instanceof Date ? event.end.toISOString() : event.end,
      color: event.color,
      color1: event.color1,
      color2: event.color2,
      notes: event.notes || '',
      location: event.location || '',
      isAvailability: event.isAvailability !== false,
      isValidated: event.isValidated !== undefined ? event.isValidated : true,
      canton: event.canton || [],
      area: event.area || [],
      languages: event.languages || [],
      experience: event.experience || '',
      software: event.software || [],
      certifications: event.certifications || [],
      workAmount: event.workAmount || ''
    });

    console.log('[eventDatabase] Action catalog returned', { success: result?.success, id: result?.id });

    if (result && result.success) {
      console.log('[eventDatabase] Event saved successfully', { id: result.id });
      return {
        success: true,
        id: result.id
      };
    } else {
      console.error('[eventDatabase] Event save failed', { error: result?.error });
      return {
        success: false,
        error: result?.error || 'Failed to save event'
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

// UPDATE EVENT
export const updateEvent = async (execute, eventId, event, userId, accountType = 'worker', forceUpdate = false) => {
  try {
    console.log('Calling calendar.update_event action', {
      eventId,
      userId,
      accountType
    });
    
    const result = await execute('calendar.update_event', {
      eventId,
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

    return { success: result?.success || false };
  } catch (error) {
    console.error('calendar.update_event error:', {
      code: error.code,
      message: error.message,
      details: error.details,
      stack: error.stack
    });

    return {
      success: false,
      error: `Failed to update event: ${error.code || error.message || 'unknown error'}`
    };
  }
};

// DELETE EVENT
export const deleteEvent = async (execute, eventId, userId, accountType = 'worker', deleteType = 'single', recurrenceId = null) => {
  try {
    const result = await execute('calendar.delete_event', {
      eventId,
      deleteType,
      recurrenceId
    });

    return { success: result?.success || false, deletedCount: result?.deletedCount || 0 };
  } catch (error) {
    return {
      success: false,
      error: `Failed to delete event: ${error.code || 'unknown error'}`
    };
  }
};

// SAVE RECURRING EVENTS
export const saveRecurringEvents = async (execute, baseEvent, userId) => {
  console.log('[eventDatabase] saveRecurringEvents called', { eventId: baseEvent.id, userId });
  
  try {
    console.log('[eventDatabase] Preparing recurring event data');
    
    const result = await execute('calendar.create_recurring_events', {
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
      repeatValue: baseEvent.repeatValue || 'Every Day',
      endRepeatValue: baseEvent.endRepeatValue || 'After',
      endRepeatCount: baseEvent.endRepeatCount || 10,
      endRepeatDate: baseEvent.endRepeatDate ?
        (baseEvent.endRepeatDate instanceof Date ? baseEvent.endRepeatDate.toISOString() : baseEvent.endRepeatDate) : undefined,
      weeklyDays: baseEvent.weeklyDays,
      monthlyType: baseEvent.monthlyType,
      monthlyDay: baseEvent.monthlyDay,
      monthlyWeek: baseEvent.monthlyWeek,
      monthlyDayOfWeek: baseEvent.monthlyDayOfWeek,
      canton: baseEvent.canton || [],
      area: baseEvent.area || [],
      languages: baseEvent.languages || [],
      experience: baseEvent.experience || '',
      software: baseEvent.software || [],
      certifications: baseEvent.certifications || [],
      workAmount: baseEvent.workAmount || ''
    });
    
    console.log('[eventDatabase] Recurring events action returned', {
      success: result?.success,
      recurrenceId: result?.recurrenceId,
      count: result?.count
    });

    if (result && result.success) {
      console.log('[eventDatabase] Recurring events saved successfully', {
        recurrenceId: result.recurrenceId,
        count: result.count
      });
      return {
        success: true,
        recurrenceId: result.recurrenceId,
        count: result.count
      };
    } else {
      console.error('[eventDatabase] Recurring events save failed', { error: result?.error });
      return {
        success: false,
        error: result?.error || 'Failed to save recurring events'
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

// REAL-TIME HOOK FOR CALENDAR EVENTS
export const useCalendarEvents = (userId, accountType = "worker") => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { execute } = useAction();
  const fetchIntervalRef = useRef(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchEvents = async () => {
      try {
        const result = await execute('calendar.list_events', {
          includeContracts: accountType === 'employer' || accountType === 'worker' || accountType === 'professional'
        });

        if (result && result.events) {
          const mappedEvents = result.events.map(event => ({
            ...event,
            start: new Date(event.start),
            end: new Date(event.end),
            fromDatabase: true
          }));

          setEvents(mappedEvents);
          setError(null);
        }
        setLoading(false);
      } catch (err) {
        console.error('[useCalendarEvents] Error fetching events:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    // Initial fetch
    fetchEvents();

    // Poll every 30 seconds for real-time updates
    fetchIntervalRef.current = setInterval(fetchEvents, 30000);

    return () => {
      if (fetchIntervalRef.current) {
        clearInterval(fetchIntervalRef.current);
      }
    };
  }, [userId, accountType, execute]);

  return { events, loading, error };
};

// CHECK AND CREATE EVENT (Legacy compatibility)
export const checkAndCreateEvent = async (execute, eventData, userId, workspaceContext) => {
  try {
    const result = await execute('calendar.create_event', {
      start: eventData.start instanceof Date ? eventData.start.toISOString() : eventData.start,
      end: eventData.end instanceof Date ? eventData.end.toISOString() : eventData.end,
      title: eventData.title,
      notes: eventData.notes,
      location: eventData.location,
      isAvailability: eventData.type !== 'contract'
    });

    return {
      success: result?.success || false,
      id: result?.id
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
};

// DEPRECATED: These functions are kept for backward compatibility
// but they now just throw errors directing to use the action catalog

export function generateRecurringEventDates() {
  throw new Error('generateRecurringEventDates is deprecated. Use calendar.create_recurring_events action instead.');
}
