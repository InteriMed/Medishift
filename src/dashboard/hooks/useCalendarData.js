import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDashboard } from '../context/DashboardContext';
import calendarService from '../../services/calendarService';
import { CALENDAR_COLORS } from '../features/calendar/utils/constants';
import { showNotification } from '../utils/notifications';

const useCalendarData = () => {
  const { t } = useTranslation();
  const { workspaceId, isLoading: isDashboardLoading } = useDashboard();
  
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState(
    CALENDAR_COLORS.map(color => ({ ...color, checked: true }))
  );
  
  // Load events
  const loadEvents = useCallback(async () => {
    if (!workspaceId) return;
    
    setIsLoading(true);
    try {
      const eventsData = await calendarService.getEvents();
      setEvents(eventsData);
      setError(null);
    } catch (err) {
      console.error('Error loading calendar events:', err);
      setError(err);
      showNotification(t('dashboard.calendar.errorLoadingEvents'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, t]);
  
  // Initial load
  useEffect(() => {
    if (!isDashboardLoading) {
      loadEvents();
    }
  }, [isDashboardLoading, loadEvents]);
  
  // Toggle category visibility
  const handleCategoryToggle = (index) => {
    setCategories(prev => 
      prev.map((cat, i) => i === index ? { ...cat, checked: !cat.checked } : cat)
    );
  };
  
  // Create event
  const createEvent = async (eventData) => {
    try {
      const newEvent = await calendarService.createEvent(eventData);
      setEvents(prev => [...prev, newEvent]);
      showNotification(t('dashboard.calendar.eventCreated'), 'success');
      return newEvent;
    } catch (err) {
      console.error('Error creating event:', err);
      showNotification(t('dashboard.calendar.errorCreatingEvent'), 'error');
      throw err;
    }
  };
  
  // Update event
  const updateEvent = async (eventId, eventData) => {
    try {
      const updatedEvent = await calendarService.updateEvent(eventId, eventData);
      setEvents(prev => prev.map(event => 
        event.id === eventId ? updatedEvent : event
      ));
      showNotification(t('dashboard.calendar.eventUpdated'), 'success');
      return updatedEvent;
    } catch (err) {
      console.error('Error updating event:', err);
      showNotification(t('dashboard.calendar.errorUpdatingEvent'), 'error');
      throw err;
    }
  };
  
  // Delete event
  const deleteEvent = async (eventId, deleteOption = 'single') => {
    try {
      await calendarService.deleteEvent(eventId, deleteOption);
      setEvents(prev => prev.filter(event => event.id !== eventId));
      showNotification(t('dashboard.calendar.eventDeleted'), 'success');
    } catch (err) {
      console.error('Error deleting event:', err);
      showNotification(t('dashboard.calendar.errorDeletingEvent'), 'error');
      throw err;
    }
  };
  
  return {
    events,
    isLoading,
    error,
    categories,
    handleCategoryToggle,
    loadEvents,
    createEvent,
    updateEvent,
    deleteEvent
  };
};

export default useCalendarData; 