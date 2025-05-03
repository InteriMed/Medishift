import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { getShortDays, isSameDay } from '../../utils/dateHelpers';
import styles from './miniCalendar.module.css';

const MiniCalendar = ({ 
  currentDate, 
  onDateClick, 
  events = [] 
}) => {
  const { t, i18n } = useTranslation();
  const [calendarDate, setCalendarDate] = useState(new Date(currentDate));
  const [calendarDays, setCalendarDays] = useState([]);
  
  const shortDays = getShortDays(i18n.language);
  
  // Generate days for the calendar
  useEffect(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    
    // Get the first day of the month
    const firstDay = new Date(year, month, 1);
    // Convert day of week (0-6, Sun-Sat) to (0-6, Mon-Sun)
    const firstDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    
    // Get the last day of the month
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Get days from previous month to fill the first week
    const prevMonthDays = [];
    if (firstDayOfWeek > 0) {
      const prevMonth = new Date(year, month, 0);
      const prevMonthDaysCount = prevMonth.getDate();
      
      for (let i = prevMonthDaysCount - firstDayOfWeek + 1; i <= prevMonthDaysCount; i++) {
        prevMonthDays.push({
          date: new Date(year, month - 1, i),
          isCurrentMonth: false
        });
      }
    }
    
    // Get days of current month
    const currentMonthDays = [];
    for (let i = 1; i <= daysInMonth; i++) {
      currentMonthDays.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }
    
    // Get days from next month to fill the last week
    const nextMonthDays = [];
    const totalDays = prevMonthDays.length + currentMonthDays.length;
    const remainingDays = 42 - totalDays; // 6 rows of 7 days
    
    for (let i = 1; i <= remainingDays; i++) {
      nextMonthDays.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }
    
    setCalendarDays([...prevMonthDays, ...currentMonthDays, ...nextMonthDays]);
  }, [calendarDate]);
  
  // Navigate to previous/next month
  const navigateMonth = (direction) => {
    const newDate = new Date(calendarDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCalendarDate(newDate);
  };
  
  // Format the month and year for display
  const formatMonthYear = () => {
    return calendarDate.toLocaleString(i18n.language, {
      month: 'long',
      year: 'numeric'
    });
  };
  
  // Handle day click
  const handleDayClick = (date) => {
    if (onDateClick) {
      onDateClick(date);
    }
  };
  
  // Get events for a specific day
  const getEventsForDay = (date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start);
      return isSameDay(eventDate, date);
    });
  };
  
  return (
    <div className={styles.miniCalendar}>
      <div className={styles.header}>
        <button 
          className={styles.navButton}
          onClick={() => navigateMonth(-1)}
          aria-label={t('dashboard.calendar.previousMonth')}
        >
          <FiChevronLeft />
        </button>
        <h3 className={styles.monthYear}>{formatMonthYear()}</h3>
        <button 
          className={styles.navButton}
          onClick={() => navigateMonth(1)}
          aria-label={t('dashboard.calendar.nextMonth')}
        >
          <FiChevronRight />
        </button>
      </div>
      
      <div className={styles.weekDays}>
        {shortDays.map((day, index) => (
          <div key={index} className={styles.weekDay}>{day}</div>
        ))}
      </div>
      
      <div className={styles.daysGrid}>
        {calendarDays.map((dayInfo, index) => {
          const { date, isCurrentMonth } = dayInfo;
          const isToday = isSameDay(date, new Date());
          const isSelected = isSameDay(date, currentDate);
          const dayEvents = getEventsForDay(date);
          
          return (
            <div 
              key={index}
              className={`
                ${styles.day}
                ${isCurrentMonth ? '' : styles.notCurrentMonth}
                ${isToday ? styles.today : ''}
                ${isSelected ? styles.selected : ''}
              `}
              onClick={() => handleDayClick(date)}
            >
              <span className={styles.dayNumber}>{date.getDate()}</span>
              {dayEvents.length > 0 && (
                <div className={styles.eventDots}>
                  {dayEvents.slice(0, 3).map((event, idx) => (
                    <span 
                      key={idx} 
                      className={styles.eventDot}
                      style={{ backgroundColor: event.color }}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <span className={`${styles.eventDot} ${styles.moreEvents}`} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MiniCalendar; 