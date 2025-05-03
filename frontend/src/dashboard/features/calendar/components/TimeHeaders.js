import React from 'react';
import { useTranslation } from 'react-i18next';
import { getWeekDates, getShortDays, isSameDay } from '../utils/dateHelpers';
import styles from './timeHeaders.module.css';

const TimeHeaders = ({ view, currentDate, handleDayClick }) => {
  const { t, i18n } = useTranslation();
  const today = new Date();
  const weekDates = getWeekDates(currentDate);
  const shortDays = getShortDays(i18n.language);
  
  return (
    <div className={styles.timeHeaders}>
      {/* Left corner header for all-day and time labels */}
      <div className={styles.cornerHeader}>
        {t('dashboard.calendar.allDay')}
      </div>
      
      {/* Day headers */}
      {view === 'week' ? (
        // Week view - show all 7 days
        weekDates.map((date, index) => {
          const isToday = isSameDay(date, today);
          const isCurrentDay = isSameDay(date, currentDate);
          
          return (
            <div 
              key={index}
              className={`
                ${styles.dayHeader}
                ${isToday ? styles.today : ''}
                ${isCurrentDay ? styles.currentDay : ''}
              `}
              onClick={() => handleDayClick(date)}
            >
              <div className={styles.dayName}>
                {shortDays[index]}
              </div>
              <div className={styles.dayNumber}>
                {date.getDate()}
              </div>
            </div>
          );
        })
      ) : (
        // Day view - show only the selected day
        <div 
          className={`
            ${styles.dayHeader} 
            ${styles.singleDay}
            ${isSameDay(currentDate, today) ? styles.today : ''}
          `}
        >
          <div className={styles.dayName}>
            {currentDate.toLocaleString(i18n.language, { weekday: 'long' })}
          </div>
          <div className={styles.dayNumber}>
            {currentDate.getDate()}
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeHeaders; 