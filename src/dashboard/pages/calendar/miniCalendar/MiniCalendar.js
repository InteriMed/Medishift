import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FiChevronLeft, FiChevronRight, FiCheck } from 'react-icons/fi';
import { getShortDays, isSameDay, getWeekDates } from '../utils/dateHelpers';
import { cn } from '../../../../utils/cn';

const MiniCalendar = ({
  currentDate,
  onDateClick,
  events = [],
  view = 'week',
  visibleWeekStart,
  visibleWeekEnd
}) => {
  const { t, i18n } = useTranslation();
  const [calendarDate, setCalendarDate] = useState(new Date(currentDate));
  const [calendarDays, setCalendarDays] = useState([]);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const monthDropdownRef = useRef(null);
  const yearDropdownRef = useRef(null);

  const shortDays = getShortDays(i18n.language);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .minicalendar-selected-day:hover {
        background-color: var(--color-logo-2) !important;
        color: white !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  useEffect(() => {
    const newDate = new Date(currentDate);
    setCalendarDate(prevDate => {
      const currentMonth = prevDate.getMonth();
      const currentYear = prevDate.getFullYear();
      const newMonth = newDate.getMonth();
      const newYear = newDate.getFullYear();

      if (currentMonth !== newMonth || currentYear !== newYear) {
        return newDate;
      }
      return prevDate;
    });
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

    // Get days from next month to fill the last week (ensure 6 rows)
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

  // Check if a date is in the visible range passed from parent
  // This uses the actual scroll-calculated bounds instead of deriving from currentDate
  const isInSameWeek = (date) => {
    if (view !== 'week') return false;

    // If we have explicit bounds from parent, use them
    if (visibleWeekStart && visibleWeekEnd) {
      const checkDate = new Date(date);
      checkDate.setHours(12, 0, 0, 0); // Normalize to noon to avoid timezone issues

      const start = new Date(visibleWeekStart);
      start.setHours(0, 0, 0, 0);

      const end = new Date(visibleWeekEnd);
      end.setHours(23, 59, 59, 999);

      return checkDate >= start && checkDate <= end;
    }

    // Fallback to calculating from currentDate if bounds not provided
    const weekDates = getWeekDates(currentDate);
    const weekStart = new Date(weekDates[0]);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekDates[6]);
    weekEnd.setHours(23, 59, 59, 999);

    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    return checkDate >= weekStart && checkDate <= weekEnd;
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
    const date = new Date(2024, i, 1);
    return {
      value: i,
      label: date.toLocaleString(i18n.language, { month: 'long' })
    };
  });

  // Generate year options (10 years before and after current year)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 21 }, (_, i) => {
    const year = currentYear - 10 + i;
    return {
      value: year,
      label: year.toString()
    };
  });

  return (
    <div className="w-full bg-card backdrop-blur-sm rounded-2xl p-3 select-none">
      {/* Header with Navigation */}
      <div className="flex items-center justify-between mb-0 px-0.5">
        <div className="flex items-center gap-1 text-foreground" style={{ fontSize: 'var(--font-size-small)', fontWeight: 'var(--font-weight-medium)' }}>
          <div className="relative group cursor-pointer hover:bg-muted/50 px-2 py-1 rounded-lg transition-colors"
            onClick={() => { setShowMonthDropdown(!showMonthDropdown); setShowYearDropdown(false); }}
            ref={monthDropdownRef}>
            <span className="capitalize">{formatMonth()}</span>
            {showMonthDropdown && (
              <div className="absolute top-full left-0 mt-1 w-36 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto z-30 py-1">
                {monthOptions.map(m => (
                  <div key={m.value} className={cn("px-3 py-2 hover:bg-muted cursor-pointer flex justify-between items-center", calendarDate.getMonth() === m.value && "bg-primary/10 text-primary")}
                    style={{ fontSize: 'var(--font-size-medium)', fontWeight: calendarDate.getMonth() === m.value ? 'var(--font-weight-medium)' : 'var(--font-weight-normal)' }}
                    onClick={(e) => { e.stopPropagation(); handleMonthChange(m.value); }}>
                    {m.label}
                    {calendarDate.getMonth() === m.value && <FiCheck size={14} />}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="relative group cursor-pointer hover:bg-muted/50 px-2 py-1 rounded-lg transition-colors"
            onClick={() => { setShowYearDropdown(!showYearDropdown); setShowMonthDropdown(false); }}
            ref={yearDropdownRef}>
            <span>{formatYear()}</span>
            {showYearDropdown && (
              <div className="absolute top-full left-0 mt-1 w-24 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto z-30 py-1">
                {yearOptions.map(y => (
                  <div key={y.value} className={cn("px-3 py-2 hover:bg-muted cursor-pointer flex justify-between items-center", calendarDate.getFullYear() === y.value && "bg-primary/10 text-primary")}
                    style={{ fontSize: 'var(--font-size-medium)', fontWeight: calendarDate.getFullYear() === y.value ? 'var(--font-weight-medium)' : 'var(--font-weight-normal)' }}
                    onClick={(e) => { e.stopPropagation(); handleYearChange(y.value); }}>
                    {y.label}
                    {calendarDate.getFullYear() === y.value && <FiCheck size={14} />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          <button className="p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors" onClick={() => navigateMonth(-1)}>
            <FiChevronLeft size={16} />
          </button>
          <button className="p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors" onClick={() => navigateMonth(1)}>
            <FiChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 mb-1.5 text-center">
        {shortDays.map((day, index) => (
          <div key={index} className="text-muted-foreground uppercase tracking-wider py-1" style={{ fontSize: 'var(--font-size-small)', fontWeight: 'var(--font-weight-medium)' }}>
            {day.substr(0, 1)}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {calendarDays.map((dayInfo, index) => {
          const { date, isCurrentMonth } = dayInfo;
          const isSelected = isSameDay(date, currentDate);
          const inVisibleWeek = view === 'week' && isInSameWeek(date);
          const isHighlight = isSelected || inVisibleWeek;

          const isWeekStart = index % 7 === 0;
          const isWeekEnd = index % 7 === 6;
          const dayEvents = getEventsForDay(date);

          return (
            <div
              key={index}
              onClick={() => handleDayClick(date)}
              className={cn(
                "relative flex items-center justify-center cursor-pointer transition-all h-7",
                // Width: Highlighted items fill the cell
                isHighlight ? "w-full" : "w-7 mx-auto rounded-lg",
                // Rounding
                isHighlight && view === 'week'
                  ? cn(isWeekStart && "rounded-l-lg", isWeekEnd && "rounded-r-lg")
                  : "rounded-lg",

                // Text styling
                !isCurrentMonth && !isHighlight ? "text-muted-foreground/30" : "text-foreground",

                // Hover effect
                !isHighlight && "hover:bg-muted/50"
              )}
              style={{
                ...(isHighlight
                  ? { backgroundColor: 'color-mix(in srgb, var(--color-logo-1), transparent 85%)' }
                  : {}),
                fontSize: 'var(--font-size-small)',
                fontWeight: isHighlight ? 'var(--font-weight-large)' : 'var(--font-weight-normal)'
              }}
            >
              <span className="z-10 relative">{date.getDate()}</span>

              {/* Event Dots */}
              {dayEvents.length > 0 && (
                <div className="absolute bottom-0 flex gap-0.5 justify-center">
                  {dayEvents.length > 3
                    ? <span className="w-1 h-1 rounded-full bg-primary/70" />
                    : dayEvents.slice(0, 3).map((_, i) => (
                      <span key={i} className="w-1 h-1 rounded-full bg-primary/60" />
                    ))
                  }
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