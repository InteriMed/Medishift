import React from 'react';
import { useTranslation } from 'react-i18next';
import { FiPlus, FiChevronLeft, FiChevronRight, FiCalendar } from 'react-icons/fi';
import styles from './calendarHeader.module.css';

const CalendarHeader = ({ 
  currentDate, 
  view, 
  setView,
  navigateDate, 
  setCurrentDate,
  handleCreateEventClick 
}) => {
  const { t } = useTranslation();
  
  // Format the date display based on view
  const formatDateHeader = () => {
    const options = { month: 'long', year: 'numeric' };
    if (view === 'day') {
      options.day = 'numeric';
    } else if (view === 'week') {
      // Get first and last day of the displayed week
      const weekDates = getWeekDates(currentDate);
      const firstDay = weekDates[0];
      const lastDay = weekDates[6];
      
      // If days are in the same month
      if (firstDay.getMonth() === lastDay.getMonth()) {
        return `${firstDay.getDate()} - ${lastDay.getDate()} ${firstDay.toLocaleString(undefined, { month: 'long' })} ${firstDay.getFullYear()}`;
      } 
      // If days span different months
      else {
        return `${firstDay.getDate()} ${firstDay.toLocaleString(undefined, { month: 'short' })} - ${lastDay.getDate()} ${lastDay.toLocaleString(undefined, { month: 'short' })} ${firstDay.getFullYear()}`;
      }
    }
    
    return currentDate.toLocaleString(undefined, options);
  };
  
  // Helper function to get week dates
  function getWeekDates(date) {
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay() + (date.getDay() === 0 ? -6 : 1)); // Start from Monday
    
    const result = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      result.push(day);
    }
    
    return result;
  }
  
  return (
    <div className={styles.calendarHeader}>
      <div className={styles.headerLeft}>
        <button 
          className={styles.createButton}
          onClick={handleCreateEventClick}
        >
          <FiPlus />
          <span>{t('dashboard.calendar.createEvent')}</span>
        </button>
      </div>
      
      <div className={styles.headerCenter}>
        <h2 className={styles.currentDate}>{formatDateHeader()}</h2>
      </div>
      
      <div className={styles.headerRight}>
        <button 
          className={styles.todayButton}
          onClick={() => setCurrentDate(new Date())}
        >
          {t('dashboard.calendar.today')}
        </button>
        
        <div className={styles.navigationButtons}>
          <button 
            className={styles.navButton}
            onClick={() => navigateDate(-1)}
            aria-label="Previous"
          >
            <FiChevronLeft />
          </button>
          <button 
            className={styles.navButton}
            onClick={() => navigateDate(1)}
            aria-label="Next"
          >
            <FiChevronRight />
          </button>
        </div>
        
        <div className={styles.viewToggle}>
          <button 
            className={`${styles.viewButton} ${view === 'day' ? styles.active : ''}`}
            onClick={() => setView('day')}
          >
            {t('dashboard.calendar.dayView')}
          </button>
          <button 
            className={`${styles.viewButton} ${view === 'week' ? styles.active : ''}`}
            onClick={() => setView('week')}
          >
            {t('dashboard.calendar.weekView')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CalendarHeader; 