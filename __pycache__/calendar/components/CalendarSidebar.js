import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import MiniCalendar from '../miniCalendar/MiniCalendar';
import styles from './calendarSidebar.module.css';

// This is a stub CalendarSidebar component
const CalendarSidebar = ({ 
  currentDate, 
  setCurrentDate, 
  handleDayClick,
  events,
  handleUpcomingEventClick,
  isSidebarCollapsed,
  toggleSidebar,
  isMobileView = false
}) => {
  const { t } = useTranslation();
  
  // Don't render content if collapsed
  if (isSidebarCollapsed) {
    return <div className={styles.sidebarContainer}></div>;
  }
  
  return (
    <div className={`${styles.sidebarContainer} ${isMobileView ? styles.mobileView : ''}`}>
      <div className={styles.section}>
        <MiniCalendar 
          currentDate={currentDate}
          onDateClick={handleDayClick}
          events={events}
        />
      </div>
      
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>{t('dashboard.calendar.upcomingEvents')}</h4>
        {events && events.length > 0 ? (
          <div className={styles.upcomingEventsList}>
            {events
              .filter(event => new Date(event.start) > new Date()) // Only show future events
              .sort((a, b) => new Date(a.start) - new Date(b.start))
              .slice(0, 5) // Show 5 upcoming events instead of 3
              .map((event, index) => (
                <div 
                  key={index} 
                  className={styles.upcomingEvent}
                  onClick={() => handleUpcomingEventClick(event.start)}
                >
                  <div 
                    className={styles.eventIndicator}
                    style={{ backgroundColor: event.color }}
                  />
                  <div className={styles.eventDetails}>
                    <h4 className={styles.eventTitle}>{event.title}</h4>
                    <p className={styles.eventTime}>
                      {new Date(event.start).toLocaleDateString(undefined, { 
                        weekday: 'short',
                        month: 'short', 
                        day: 'numeric'
                      })}, {' '}
                      {new Date(event.start).toLocaleTimeString(undefined, { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: false 
                      })}
                      {event.location && (
                        <span className={styles.eventLocation}> • {event.location}</span>
                      )}
                    </p>
                  </div>
                </div>
              ))
            }
          </div>
        ) : (
          <p className={styles.noEvents}>{t('dashboard.calendar.noUpcomingEvents')}</p>
        )}
      </div>
    </div>
  );
};

export default CalendarSidebar; 