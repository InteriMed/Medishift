import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useDashboard } from '../../context/DashboardContext';
import styles from './calendar.module.css';

// Import components
import CalendarHeader from './components/CalendarHeader';
import CalendarSidebar from './components/CalendarSidebar';
import TimeHeaders from './components/TimeHeaders';
import TimeGrid from './components/TimeGrid';
import DeleteConfirmationDialog from './components/DeleteConfirmationDialog';
import EventPanel from './components/EventPanel/EventPanel';

// Import utility functions and constants
import { CALENDAR_COLORS } from './utils/constants';
import { getWeekDates, getShortDays, getDaysAroundCurrent } from './utils/dateHelpers';
import { getEventsForCurrentWeek, filterEventsByCategories } from './utils/eventUtils';

const Calendar = () => {
  const { t } = useTranslation();
  const { dashboardData } = useDashboard();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('week'); // 'week' or 'day'
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState(
    CALENDAR_COLORS.map(cat => ({
      name: cat.name,
      color: cat.color,
      checked: true
    }))
  );
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventPanel, setShowEventPanel] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDraggingNewEvent, setIsDraggingNewEvent] = useState(false);
  const [newEventStart, setNewEventStart] = useState(null);
  const [newEventEnd, setNewEventEnd] = useState(null);
  
  // Refs for positioning
  const calendarRef = useRef(null);

  // Fetch events (replace with your actual data fetching logic)
  useEffect(() => {
    // Mock function to simulate API call - replace with actual implementation
    const fetchEvents = async () => {
      try {
        // Replace with actual API call
        // const response = await api.calendar.getEvents(currentDate);
        // For now we'll use mock data
        const mockEvents = [
          {
            id: '1',
            title: 'Team Meeting',
            start: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 10, 0),
            end: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 11, 30),
            color: CALENDAR_COLORS[0].color,
            color1: CALENDAR_COLORS[0].color1,
            location: 'Conference Room A',
            notes: 'Discuss quarterly goals'
          },
          {
            id: '2',
            title: 'Doctor Appointment',
            start: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1, 14, 0),
            end: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1, 15, 0),
            color: CALENDAR_COLORS[1].color,
            color1: CALENDAR_COLORS[1].color1,
            location: 'Medical Center',
            isRecurring: true
          }
        ];
        
        setEvents(mockEvents);
      } catch (error) {
        console.error('Error fetching events:', error);
      }
    };
    
    fetchEvents();
  }, [currentDate]);

  // Filter events based on selected categories
  const filteredEvents = filterEventsByCategories(events, categories);
  
  // Navigation handlers
  const navigateDate = (direction) => {
    const newDate = new Date(currentDate);
    if (view === 'week') {
      newDate.setDate(newDate.getDate() + (direction * 7));
    } else {
      newDate.setDate(newDate.getDate() + direction);
    }
    setCurrentDate(newDate);
  };
  
  // Handle day click in headers or mini calendar
  const handleDayClick = (date) => {
    setCurrentDate(date);
    if (view === 'day') {
      // If already in day view, just update the date
      // Otherwise switch to day view
      setView('day');
    }
  };
  
  // Event handlers
  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setShowEventPanel(true);
  };
  
  const handleCreateEventClick = () => {
    // Create a default event at current time, rounded to the nearest half hour
    const now = new Date();
    const minutes = now.getMinutes();
    const roundedMinutes = minutes < 30 ? 30 : 0;
    const hours = minutes < 30 ? now.getHours() : now.getHours() + 1;
    
    const start = new Date(currentDate);
    start.setHours(hours, roundedMinutes, 0, 0);
    
    const end = new Date(start);
    end.setHours(end.getHours() + 1);
    
    const newEvent = {
      title: '',
      start,
      end,
      color: CALENDAR_COLORS[0].color,
      color1: CALENDAR_COLORS[0].color1,
      isNew: true
    };
    
    setSelectedEvent(newEvent);
    setShowEventPanel(true);
  };
  
  const handleEventSave = (updatedEvent) => {
    if (updatedEvent.isNew) {
      // Add new event
      const newEvent = {
        ...updatedEvent,
        id: Date.now().toString(), // temporary ID
        isNew: undefined // remove the isNew flag
      };
      setEvents([...events, newEvent]);
    } else {
      // Update existing event
      const updatedEvents = events.map(event => 
        event.id === updatedEvent.id ? updatedEvent : event
      );
      setEvents(updatedEvents);
    }
    
    setShowEventPanel(false);
    setSelectedEvent(null);
  };
  
  const handleEventDelete = (event) => {
    setSelectedEvent(event);
    setShowDeleteDialog(true);
  };
  
  const confirmDeleteEvent = () => {
    if (!selectedEvent) return;
    
    const updatedEvents = events.filter(event => event.id !== selectedEvent.id);
    setEvents(updatedEvents);
    
    setShowDeleteDialog(false);
    setSelectedEvent(null);
    setShowEventPanel(false);
  };
  
  const handleCategoryToggle = (index) => {
    const updatedCategories = [...categories];
    updatedCategories[index].checked = !updatedCategories[index].checked;
    setCategories(updatedCategories);
  };
  
  // Time slot handlers for creating events by dragging
  const handleTimeSlotMouseDown = (time) => {
    setIsDraggingNewEvent(true);
    setNewEventStart(time);
    setNewEventEnd(new Date(time.getTime() + 30 * 60 * 1000)); // Add 30 minutes
  };
  
  const handleTimeSlotMouseMove = (time) => {
    if (isDraggingNewEvent && newEventStart) {
      // Ensure end time is after start time
      if (time > newEventStart) {
        setNewEventEnd(time);
      }
    }
  };
  
  const handleTimeSlotMouseUp = () => {
    if (isDraggingNewEvent && newEventStart && newEventEnd) {
      const newEvent = {
        title: '',
        start: newEventStart,
        end: newEventEnd,
        color: CALENDAR_COLORS[0].color,
        color1: CALENDAR_COLORS[0].color1,
        isNew: true
      };
      
      setSelectedEvent(newEvent);
      setShowEventPanel(true);
    }
    
    setIsDraggingNewEvent(false);
    setNewEventStart(null);
    setNewEventEnd(null);
  };
  
  return (
    <div className={styles.calendarContainer} ref={calendarRef}>
      <CalendarHeader 
        currentDate={currentDate}
        view={view}
        setView={setView}
        navigateDate={navigateDate}
        setCurrentDate={setCurrentDate}
        handleCreateEventClick={handleCreateEventClick}
      />
      
      <div className={styles.calendarLayout}>
        <CalendarSidebar 
          currentDate={currentDate}
          setCurrentDate={setCurrentDate}
          handleDayClick={handleDayClick}
          categories={categories}
          handleCategoryToggle={handleCategoryToggle}
          events={events}
        />
        
        <div className={styles.calendarContent}>
          <TimeHeaders 
            view={view}
            currentDate={currentDate}
            setView={setView}
            handleDayClick={handleDayClick}
          />
          
          <TimeGrid 
            view={view}
            events={filteredEvents}
            selectedEventId={selectedEvent?.id}
            handleEventClick={handleEventClick}
            handleTimeSlotMouseDown={handleTimeSlotMouseDown}
            handleTimeSlotMouseMove={handleTimeSlotMouseMove}
            handleTimeSlotMouseUp={handleTimeSlotMouseUp}
            isDraggingNewEvent={isDraggingNewEvent}
            newEventStart={newEventStart}
            newEventEnd={newEventEnd}
          />
        </div>
      </div>
      
      {showEventPanel && selectedEvent && (
        <EventPanel 
          event={selectedEvent}
          onClose={() => setShowEventPanel(false)}
          onSave={handleEventSave}
          onDelete={handleEventDelete}
          colorOptions={CALENDAR_COLORS}
        />
      )}
      
      {showDeleteDialog && selectedEvent && (
        <DeleteConfirmationDialog 
          event={selectedEvent}
          onConfirm={confirmDeleteEvent}
          onCancel={() => setShowDeleteDialog(false)}
          isRecurring={selectedEvent.isRecurring}
        />
      )}
    </div>
  );
};

export default Calendar; 