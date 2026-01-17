import { httpsCallable } from 'firebase/functions';
import { db, functions, auth } from './firebase';
import { handleFirebaseOperation } from '../utils/errorHandler';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';

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
   * @param {object} dateRange - Optional date range filter
   */
  getEvents: async (dateRange = null) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      const eventsRef = collection(db, 'calendar_events');
      let q;

      if (dateRange) {
        const startTimestamp = Timestamp.fromDate(new Date(dateRange.start));
        const endTimestamp = Timestamp.fromDate(new Date(dateRange.end));
        
        // Query events that:
        // 1. Belong to the current user
        // 2. Start date is within the date range OR end date is within the date range
        q = query(
          eventsRef,
          where('userId', '==', currentUser.uid),
          where('startDate', '<=', endTimestamp),
          orderBy('startDate', 'asc')
        );
      } else {
        // If no date range provided, get all events for the user
        q = query(
          eventsRef,
          where('userId', '==', currentUser.uid),
          orderBy('startDate', 'asc')
        );
      }

      const snapshot = await getDocs(q);
      const events = [];

      snapshot.forEach(doc => {
        const eventData = doc.data();
        events.push({
          id: doc.id,
          ...eventData,
          startDate: eventData.startDate?.toDate() || null,
          endDate: eventData.endDate?.toDate() || null,
          createdAt: eventData.createdAt?.toDate() || null
        });
      });

      // If date range is provided, filter for events ending after the start date 
      // (the Firestore query only covered the start condition)
      if (dateRange) {
        const startDate = new Date(dateRange.start);
        return events.filter(event => {
          const eventEndDate = event.endDate || event.startDate;
          return eventEndDate >= startDate;
        });
      }

      return events;
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
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      // Convert Date objects to Firestore Timestamps
      const processedData = { ...eventData };
      if (processedData.startDate) {
        processedData.startDate = Timestamp.fromDate(new Date(processedData.startDate));
      }
      if (processedData.endDate) {
        processedData.endDate = Timestamp.fromDate(new Date(processedData.endDate));
      }

      // Add event to Firestore
      const eventsRef = collection(db, 'calendar_events');
      const docRef = await addDoc(eventsRef, {
        ...processedData,
        userId: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Get the newly created event
      const newEventDoc = await getDoc(docRef);
      const newEvent = newEventDoc.data();

      return {
        id: docRef.id,
        ...newEvent,
        startDate: newEvent.startDate?.toDate() || null,
        endDate: newEvent.endDate?.toDate() || null,
        createdAt: newEvent.createdAt?.toDate() || null
      };
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
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      // Check if event exists and belongs to current user
      const eventRef = doc(db, 'calendar_events', eventId);
      const eventDoc = await getDoc(eventRef);

      if (!eventDoc.exists()) {
        throw new Error('Event not found');
      }

      const existingEvent = eventDoc.data();
      if (existingEvent.userId !== currentUser.uid) {
        throw new Error('Not authorized to update this event');
      }

      // Convert Date objects to Firestore Timestamps
      const processedData = { ...eventData };
      if (processedData.startDate) {
        processedData.startDate = Timestamp.fromDate(new Date(processedData.startDate));
      }
      if (processedData.endDate) {
        processedData.endDate = Timestamp.fromDate(new Date(processedData.endDate));
      }

      // Remove fields that shouldn't be updated
      const { id, createdAt, userId, ...updatableData } = processedData;

      // Update the event
      await updateDoc(eventRef, {
        ...updatableData,
        updatedAt: serverTimestamp()
      });

      // Get the updated event
      const updatedEventDoc = await getDoc(eventRef);
      const updatedEvent = updatedEventDoc.data();

      return {
        id: eventId,
        ...updatedEvent,
        startDate: updatedEvent.startDate?.toDate() || null,
        endDate: updatedEvent.endDate?.toDate() || null,
        createdAt: updatedEvent.createdAt?.toDate() || null
      };
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
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      // Check if event exists and belongs to current user
      const eventRef = doc(db, 'calendar_events', eventId);
      const eventDoc = await getDoc(eventRef);

      if (!eventDoc.exists()) {
        throw new Error('Event not found');
      }

      const existingEvent = eventDoc.data();
      if (existingEvent.userId !== currentUser.uid) {
        throw new Error('Not authorized to delete this event');
      }

      // Handle recurring events
      if (existingEvent.recurrence && deleteOption !== 'single') {
        if (deleteOption === 'all') {
          // Delete all instances of the recurring event
          // This involves querying for all events with the same recurrenceId
          if (existingEvent.recurrenceId) {
            const recurringEventsRef = collection(db, 'calendar_events');
            const q = query(
              recurringEventsRef,
              where('recurrenceId', '==', existingEvent.recurrenceId),
              where('userId', '==', currentUser.uid)
            );
            
            const snapshot = await getDocs(q);
            
            // Delete each event
            const deletePromises = [];
            snapshot.forEach(doc => {
              deletePromises.push(deleteDoc(doc.ref));
            });
            
            await Promise.all(deletePromises);
            return { success: true, deletedCount: deletePromises.length };
          }
        } else if (deleteOption === 'future') {
          // Delete this event and all future instances
          // This is more complex and might require a Cloud Function
          // For now, just handle the single instance
          await deleteDoc(eventRef);
          return { success: true, deletedCount: 1, warning: 'Only this instance was deleted. Future instance deletion requires additional implementation.' };
        }
      }
      
      // Delete the single event
      await deleteDoc(eventRef);
      return { success: true, deletedCount: 1 };
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
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      // First check if user is a member of the team
      const teamRef = doc(db, 'teams', teamId);
      const teamDoc = await getDoc(teamRef);

      if (!teamDoc.exists()) {
        throw new Error('Team not found');
      }

      const teamData = teamDoc.data();
      if (!teamData.members.includes(currentUser.uid)) {
        throw new Error('Not authorized to access team events');
      }

      // Query events for the team
      const eventsRef = collection(db, 'calendar_events');
      const q = query(
        eventsRef,
        where('teamId', '==', teamId),
        orderBy('startDate', 'asc')
      );

      const snapshot = await getDocs(q);
      const events = [];

      snapshot.forEach(doc => {
        const eventData = doc.data();
        events.push({
          id: doc.id,
          ...eventData,
          startDate: eventData.startDate?.toDate() || null,
          endDate: eventData.endDate?.toDate() || null,
          createdAt: eventData.createdAt?.toDate() || null
        });
      });

      return events;
    } catch (error) {
      console.error('Error fetching team calendar events:', error);
      throw error;
    }
  }
};

export default calendarService; 