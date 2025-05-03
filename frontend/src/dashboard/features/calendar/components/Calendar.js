import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiChevronLeft, FiChevronRight, FiPlus } from 'react-icons/fi';
import CalendarHeader from './CalendarHeader';
import CalendarGrid from './CalendarGrid';
import EventPanel from './EventPanel/EventPanel';
import styles from './calendar.module.css';

const Calendar = () => {
  const { t } = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month'); // month, week, day
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventPanel, setShowEventPanel] = useState(false);
  
  // Navigate to previous period
  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    
    if (view === 'month') {
      newDate.setMonth(currentDate.getMonth() - 1);
    } else if (view === 'week') {
      newDate.setDate(currentDate.getDate() - 7);
    } else if (view === 'day') {
      newDate.setDate(currentDate.getDate() - 1);
    }
    
    setCurrentDate(newDate);
  };
  
  // Navigate to next period
  const navigateNext = () => {
    const newDate = new Date(currentDate);
    
    if (view === 'month') {
      newDate.setMonth(currentDate.getMonth() + 1);
    } else if (view === 'week') {
      newDate.setDate(currentDate.getDate() + 7);
    } else if (view === 'day') {
      newDate.setDate(currentDate.getDate() + 1);
    }
    
    setCurrentDate(newDate);
  };
  
  // Navigate to today
  const navigateToday = () => {
    setCurrentDate(new Date());
  };
  
  // Handle date selection
  const handleDateSelect = (date) => {
    setSelectedDate(date);
  };
  
  // Handle event selection
  const handleEventSelect = (event) => {
    setSelectedEvent(event);
    setShowEventPanel(true);
  };
  
  // Create new event
  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setShowEventPanel(true);
  };
  
  // Close event panel
  const handleCloseEventPanel = () => {
    setShowEventPanel(false);
  };
  
  return (
    <div className={styles.calendar}>
      <div className={styles.calendarContainer}>
        <CalendarHeader 
          currentDate={currentDate}
          view={view}
          onViewChange={setView}
          onPrevious={navigatePrevious}
          onNext={navigateNext}
          onToday={navigateToday}
        />
        
        <CalendarGrid
          currentDate={currentDate}
          selectedDate={selectedDate}
          view={view}
          onDateSelect={handleDateSelect}
          onEventSelect={handleEventSelect}
        />
        
        <button 
          className={styles.createEventButton}
          onClick={handleCreateEvent}
        >
          <FiPlus />
          {t('dashboard.calendar.newEvent')}
        </button>
      </div>
      
      {showEventPanel && (
        <EventPanel
          event={selectedEvent}
          date={selectedDate}
          onClose={handleCloseEventPanel}
        />
      )}
    </div>
  );
};

export default Calendar; 