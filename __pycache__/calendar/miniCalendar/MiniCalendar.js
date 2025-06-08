import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FiChevronLeft, FiChevronRight, FiCalendar } from 'react-icons/fi';
import { getShortDays, isSameDay } from '../utils/dateHelpers';
import styles from './miniCalendar.module.css';

const MiniCalendar = ({ 
  currentDate, 
  onDateClick, 
  events = [] 
}) => {
  const { t, i18n } = useTranslation();
  const [calendarDate, setCalendarDate] = useState(new Date(currentDate));
  const [calendarDays, setCalendarDays] = useState([]);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const monthDropdownRef = useRef(null);
  const yearDropdownRef = useRef(null);
  
  const shortDays = getShortDays(i18n.language);
  
  // Update calendar date when currentDate changes
  useEffect(() => {
    const newDate = new Date(currentDate);
    setCalendarDate(newDate);
  }, [currentDate]);
  
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
  
  // Handle clicks outside of the dropdowns to close them
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(event.target)) {
        setShowMonthDropdown(false);
      }
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(event.target)) {
        setShowYearDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Navigate to previous/next month
  const navigateMonth = (direction) => {
    const newDate = new Date(calendarDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCalendarDate(newDate);
  };
  
  // Format the month and year for display
  const formatMonth = () => {
    return calendarDate.toLocaleString(i18n.language, { month: 'long' });
  };
  
  const formatYear = () => {
    return calendarDate.getFullYear().toString();
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
  
  // Handle month change
  const handleMonthChange = (monthIndex) => {
    const newDate = new Date(calendarDate);
    newDate.setMonth(monthIndex);
    setCalendarDate(newDate);
    setShowMonthDropdown(false);
  };
  
  // Handle year change
  const handleYearChange = (year) => {
    const newDate = new Date(calendarDate);
    newDate.setFullYear(year);
    setCalendarDate(newDate);
    setShowYearDropdown(false);
  };
  
  // Generate month options
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(2024, i, 1); // Use fixed year 2024
    return {
      value: i,
      label: date.toLocaleString(i18n.language, { month: 'long' })
    };
  });
  
  // Generate year options (10 years before and after 2024)
  const currentYear = 2024; // Fixed year
  const yearOptions = Array.from({ length: 21 }, (_, i) => {
    const year = currentYear - 10 + i;
    return {
      value: year,
      label: year.toString()
    };
  });
  
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
        <div className={styles.dateControls}>
          <div className={styles.monthYearContainer}>
            <button
              className={styles.monthButton}
              onClick={() => {
                setShowMonthDropdown(!showMonthDropdown);
                setShowYearDropdown(false);
              }}
              aria-label="Select month"
              ref={monthDropdownRef}
            >
              <h4>{formatMonth()}</h4>
              <FiChevronRight className={styles.dropdownIcon} />
              
              {showMonthDropdown && (
                <div className={styles.dropdown}>
                  {monthOptions.map(month => (
                    <div
                      key={month.value}
                      className={`${styles.dropdownItem} ${calendarDate.getMonth() === month.value ? styles.active : ''}`}
                      onClick={() => handleMonthChange(month.value)}
                    >
                      {month.label}
                    </div>
                  ))}
                </div>
              )}
            </button>
            
            <button
              className={styles.yearButton}
              onClick={() => {
                setShowYearDropdown(!showYearDropdown);
                setShowMonthDropdown(false);
              }}
              aria-label="Select year"
              ref={yearDropdownRef}
            >
              <h4>{formatYear()}</h4>
              <FiChevronRight className={styles.dropdownIcon} />
              
              {showYearDropdown && (
                <div className={styles.dropdown}>
                  {yearOptions.map(year => (
                    <div
                      key={year.value}
                      className={`${styles.dropdownItem} ${calendarDate.getFullYear() === year.value ? styles.active : ''}`}
                      onClick={() => handleYearChange(year.value)}
                    >
                      {year.label}
                    </div>
                  ))}
                </div>
              )}
            </button>
          </div>
        </div>
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
          const isToday = false; // Disable today highlighting
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