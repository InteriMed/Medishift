import { httpsCallable } from 'firebase/functions';
import { functions } from './firebaseService';
import { handleFirebaseOperation } from '../utils/errorHandler';
import apiService from './apiService';

/**
 * Sync calendar events with external calendar
 * @param {string} userId - User ID
 * @param {string} calendarId - External calendar ID
 * @param {array} events - Calendar events to sync
 * @returns {Promise} Sync result
 */
export const syncCalendar = async (userId, calendarId, events) => {
  return handleFirebaseOperation(
    async () => {
      const syncCalendarFn = httpsCallable(functions, 'calendarSync');
      const result = await syncCalendarFn({
        userId,
        calendarId,
        events
      });
      return result.data;
    }
  );
};

/**
 * Get calendar events
 * @param {string} userId - User ID
 * @param {object} dateRange - Date range for events
 * @returns {Promise} Calendar events
 */
export const getCalendarEvents = async (userId, dateRange) => {
  return handleFirebaseOperation(
    async () => {
      const getCalendarEventsFn = httpsCallable(functions, 'getCalendarEvents');
      const result = await getCalendarEventsFn({
        userId,
        startDate: dateRange.start,
        endDate: dateRange.end
      });
      return result.data;
    }
  );
};

const calendarService = {
  /**
   * Get all calendar events for the current user
   */
  getEvents: async () => {
    try {
      const response = await apiService.get('/calendar/events');
      return response.data;
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      throw error;
    }
  },

  /**
   * Create a new calendar event
   * @param {Object} eventData - Event data to create
   */
  createEvent: async (eventData) => {
    try {
      const response = await apiService.post('/calendar/events', eventData);
      return response.data;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  },

  /**
   * Update an existing calendar event
   * @param {string} eventId - ID of the event to update
   * @param {Object} eventData - Updated event data
   */
  updateEvent: async (eventId, eventData) => {
    try {
      const response = await apiService.put(`/calendar/events/${eventId}`, eventData);
      return response.data;
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw error;
    }
  },

  /**
   * Delete a calendar event
   * @param {string} eventId - ID of the event to delete
   * @param {string} deleteOption - 'single', 'future', or 'all' for recurring events
   */
  deleteEvent: async (eventId, deleteOption = 'single') => {
    try {
      const response = await apiService.delete(`/calendar/events/${eventId}`, {
        data: { deleteOption }
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw error;
    }
  },

  /**
   * Get shared events for a specific team or workspace
   * @param {string} teamId - ID of the team
   */
  getTeamEvents: async (teamId) => {
    try {
      const response = await apiService.get(`/calendar/teams/${teamId}/events`);
      return response.data;
    } catch (error) {
      console.error('Error fetching team calendar events:', error);
      throw error;
    }
  }
};

export default calendarService; 