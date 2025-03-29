import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import './Calendar.css';
import Checkbox from '../../../../components/Checkbox/Checkbox';
import Event from './components/events/Event';
import EventPanel from './components/event_panel/Event_Panel';
import { GrPrevious, GrNext } from "react-icons/gr";
import Button from '../../../../components/Button/Button';
import DeleteConfirmationDialog from './components/delete_confirmation_dialog/Delete_Confirmation_Dialog';

const generateCustomRecurringEvents = (baseEvent, customConfig, endRepeatValue, endRepeatCount, endRepeatDate) => {
  const events = [];
  const startDate = new Date(baseEvent.start);
  const duration = new Date(baseEvent.end) - startDate;
  
  const frequency = parseInt(customConfig.frequency) || 1;
  const selectedDays = customConfig.days;
  
  let maxOccurrences = endRepeatValue === 'After' ? endRepeatCount : 52;
  let occurrenceCount = 0;

  // Get the start of the first week containing the start date
  const firstWeekStart = new Date(startDate);
  firstWeekStart.setDate(firstWeekStart.getDate() - firstWeekStart.getDay()); // Go to Sunday

  // Calculate how many weeks we need to check
  const totalWeeks = maxOccurrences * Math.max(frequency, 1);
  let currentWeek = 0;

  while (occurrenceCount < maxOccurrences && currentWeek < totalWeeks) {
    // Calculate the current week's start date based on frequency
    const currentWeekStart = new Date(firstWeekStart);
    currentWeekStart.setDate(firstWeekStart.getDate() + (currentWeek * 7));
    
    // Only process weeks that align with our frequency
    if (currentWeek % frequency === 0) {
      if (endRepeatValue === 'On Date' && currentWeekStart > endRepeatDate) {
        break;
      }

      // Process each selected day within the current week
      for (const day of selectedDays) {
        const dayIndex = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].indexOf(day);
        const eventDate = new Date(currentWeekStart);
        eventDate.setDate(currentWeekStart.getDate() + dayIndex);
        
        // Skip if the date is before the start date
        if (eventDate < startDate) {
          continue;
        }
        
        if (endRepeatValue === 'On Date' && eventDate > endRepeatDate) {
          continue;
        }

        // Set the correct time from the original event
        eventDate.setHours(startDate.getHours());
        eventDate.setMinutes(startDate.getMinutes());
        eventDate.setSeconds(startDate.getSeconds());

        const eventEnd = new Date(eventDate.getTime() + duration);
        
        events.push({
          ...baseEvent,
          id: `${baseEvent.id}-${currentWeek}-${day}`,
          start: new Date(eventDate),
          end: eventEnd,
          isRecurring: true
        });

        occurrenceCount++;
        if (endRepeatValue === 'After' && occurrenceCount >= maxOccurrences) {
          return events;
        }
      }
    }
    
    currentWeek++;
  }

  return events;
};

const MonthYearDropdown = ({ currentDate, onSelect, isOpen, onClose, position }) => {
  const { t, i18n } = useTranslation();
  // Get localized month names
  const months = Array.from({ length: 12 }, (_, i) => 
    new Date(2000, i, 1).toLocaleString(i18n.language, { month: 'long' })
  );
  
  // Generate array of 12 years centered around current year
  const currentYear = currentDate.getFullYear();
  const years = Array.from({ length: 12 }, (_, i) => 
    currentYear - 5 + i
  );

  return isOpen ? (
    <div 
      className="date-dropdown month-year-dropdown"
      style={{
        top: position?.y || '100%',
        left: position?.x || '0',
      }}
    >
      <div className="date-dropdown-section">
        <div className="date-dropdown-header">{t('dashboard.calendar.datetime.month')}</div>
        <div className="date-dropdown-grid months-grid">
          {months.map((month, index) => (
            <div
              key={month}
              className={`date-dropdown-item ${
                index === currentDate.getMonth() ? 'selected' : ''
              }`}
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setMonth(index);
                onSelect(newDate);
                onClose();
              }}
            >
              {month}
            </div>
          ))}
        </div>
      </div>
      <div className="date-dropdown-section">
        <div className="date-dropdown-header">{t('dashboard.calendar.datetime.year')}</div>
        <div className="date-dropdown-grid years-grid">
          {years.map(year => (
            <div
              key={year}
              className={`date-dropdown-item ${
                year === currentDate.getFullYear() ? 'selected' : ''
              }`}
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setFullYear(year);
                onSelect(newDate);
                onClose();
              }}
            >
              {year}
            </div>
          ))}
        </div>
      </div>
    </div>
  ) : null;
};

const Calendar = () => {
  const { t, i18n } = useTranslation();
  // Define calendar colors as a constant at component level
  const CALENDAR_COLORS = [
    { id: 'blue', color: '#0f54bc', color1: '#a8c1ff', color2: '#4da6fb', name: 'Personal' },
    { id: 'red', color: '#f54455', color1: '#ffbbcf', color2: '#ff6064', name: 'Missing employees' },
    { id: 'purple', color: '#6c6ce7', color1: '#e6e6ff', color2: '#a08dfc', name: 'Waiting for confirmation' },
    { id: 'green', color: '#0da71c', color1: '#ccffce', color2: '#32cb65', name: 'Approved employee' },
  ];

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('week'); // 'week' or 'month'
  const [categories, setCategories] = useState(CALENDAR_COLORS.map(color => ({
    name: color.name,
    color: color.color,
    checked: true
  })));
  const [events, setEvents] = useState([]);
  const [history, setHistory] = useState([[]]); // Initialize with empty array as first history entry
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(0); // Start at index 0
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [newEventStart, setNewEventStart] = useState(null);
  const [newEventEnd, setNewEventEnd] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [showRecurringDialog, setShowRecurringDialog] = useState(false);
  const [draggedEvent, setDraggedEvent] = useState(null);
  const [draggedEventNewDates, setDraggedEventNewDates] = useState(null);
  const [slideDirection, setSlideDirection] = useState(null);
  const [showHeaderDateDropdown, setShowHeaderDateDropdown] = useState(false);
  const [showMiniCalendarDropdown, setShowMiniCalendarDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState(null);
  const headerDateRef = useRef(null);
  const miniCalendarTitleRef = useRef(null);
  const [isDraggingNewEvent, setIsDraggingNewEvent] = useState(false);
  const [dragStartPosition, setDragStartPosition] = useState(null);
  const [clickTimeout, setClickTimeout] = useState(null);
  const [clickCount, setClickCount] = useState(0);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);

  useEffect(() => {
    const timeSlots = document.querySelector('.time-slots');
    if (timeSlots) {
      // Each hour slot is 60px high (adjust this value if your CSS is different)
      const scrollPosition = 8 * 49; // 8 AM = 8 * height of one hour
      timeSlots.scrollTop = scrollPosition;
    }
  }, []); // Empty dependency array means this runs once on mount

  const navigateDate = (direction) => {
    const newDate = new Date(currentDate);
    if (view === 'week') {
      newDate.setDate(newDate.getDate() + (direction * 7));
    } else if (view === 'day') {
      setSlideDirection(direction > 0 ? 'left' : 'right');
      newDate.setDate(newDate.getDate() + direction);
    } else {
      newDate.setMonth(newDate.getMonth() + direction);
    }
    setCurrentDate(newDate);
  };

  const getWeekDates = () => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay() + 1); // Start from Monday
    const dates = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  // Update the getShortDays function
  const getShortDays = () => {
    return Array.from({ length: 7 }, (_, i) => {
      // Start from Monday (i + 1) to match the week view starting from Monday
      const day = new Date(2000, 0, i + 1).toLocaleString(i18n.language, { weekday: 'short' }).slice(0, 3);
      return day.charAt(0).toUpperCase() + day.slice(1);
    });
  };

  const renderMiniCalendar = () => {
    const shortDays = getShortDays();
    const daysInMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0
    ).getDate();
    
    // Get the first day of the month (0-6)
    const firstDay = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    ).getDay();

    // Get days from previous month
    const prevMonthDays = [];
    const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
    const daysInPrevMonth = prevMonth.getDate();
    
    // Adjust for Monday start (convert Sunday from 0 to 7)
    const adjustedFirstDay = firstDay === 0 ? 7 : firstDay;
    const prevMonthStart = daysInPrevMonth - adjustedFirstDay + 2;
    
    for (let i = prevMonthStart; i <= daysInPrevMonth; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, i);
      prevMonthDays.push({ day: i, date, isCurrentMonth: false });
    }

    // Current month days
    const currentMonthDays = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
      currentMonthDays.push({ day: i, date, isCurrentMonth: true });
    }

    // Next month days
    const nextMonthDays = [];
    const totalDays = prevMonthDays.length + currentMonthDays.length;
    const remainingDays = 42 - totalDays; // 6 rows * 7 days = 42

    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, i);
      nextMonthDays.push({ day: i, date, isCurrentMonth: false });
    }

    // Combine all days
    const allDays = [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];

    const handleDateClick = (date) => {
      const newDate = new Date(date);
      setCurrentDate(newDate);
      // Keep the current view (day or week) when clicking
      if (view === 'day') {
        handleDayClick(newDate);
      }
    };

    const isSelectedDate = (date) => {
      return date.getDate() === currentDate.getDate() &&
             date.getMonth() === currentDate.getMonth() &&
             date.getFullYear() === currentDate.getFullYear();
    };

    return (
      <div className="mini-calendar">
        <div className="mini-calendar-header">
          <div 
            className="mini-calendar-title"
            ref={miniCalendarTitleRef}
            onClick={handleMiniCalendarTitleClick}
          >
            {(currentDate.toLocaleString(i18n.language, { 
              month: 'long', 
              year: 'numeric' 
            })).replace(/^\w/, c => c.toUpperCase())}
          </div>
          <div className="mini-calendar-nav">
            <button 
              className="mini-calendar-nav-btn"
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setMonth(currentDate.getMonth() - 1);
                setCurrentDate(newDate);
              }}
            >
              <GrPrevious />
            </button>
            <button 
              className="mini-calendar-nav-btn"
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setMonth(currentDate.getMonth() + 1);
                setCurrentDate(newDate);
              }}
            >
              <GrNext />
            </button>
          </div>
        </div>
        <div className="mini-calendar-grid">
          {shortDays.map(day => (
            <div key={day} className="mini-calendar-day-name">{day}</div>
          ))}
          {allDays.map((dayObj, index) => (
            <div
              key={index}
              className={`mini-calendar-day ${!dayObj.isCurrentMonth ? 'other-month' : ''} 
                ${isSelectedDate(dayObj.date) ? 'selected' : ''}`}
              onClick={() => handleDateClick(dayObj.date)}
            >
              {dayObj.day}
            </div>
          ))}
        </div>
        {showMiniCalendarDropdown && (
          <MonthYearDropdown
            currentDate={currentDate}
            onSelect={setCurrentDate}
            isOpen={showMiniCalendarDropdown}
            onClose={() => setShowMiniCalendarDropdown(false)}
            position={dropdownPosition}
          />
        )}
      </div>
    );
  };

  const generateTimeSlots = () => {
    const times = [];
    for (let i = 0; i < 24; i++) {
      const hour = i < 10 ? `0${i}:00` : `${i}:00`;
      times.push(hour);
    }
    return times;
  };

  const renderDaySeparators = () => {
    return Array(6).fill(null).map((_, index) => (
      <div
        key={index}
        className="day-separator"
        style={{ left: `${((index + 1) * 100) / 7}%` }}
      />
    ));
  };

  const handleTimeSlotMouseDown = (e) => {
    if (isCreatingEvent || selectedEvent) return;

    const timeGrid = e.currentTarget;
    const rect = timeGrid.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const x = e.clientX - rect.left;
    
    const hour = Math.floor(y / 50);
    
    let startDate;
    if (view === 'day') {
      startDate = new Date(currentDate);
    } else {
      const day = Math.floor((x / rect.width) * 7);
      startDate = new Date(getWeekDates()[day]);
    }
    
    startDate.setHours(hour);
    startDate.setMinutes(0);
    
    // Set end time to exactly one hour after start time
    const endDate = new Date(startDate);
    endDate.setHours(hour + 1);
    endDate.setMinutes(0);

    // Handle double click
    if (clickTimeout) {
      clearTimeout(clickTimeout);
      setClickTimeout(null);
      setClickCount(0);

      // Create event immediately on double click
      const defaultColor = CALENDAR_COLORS[0];
      const newEvent = {
        id: String(Date.now()),
        start: startDate,
        end: endDate,
        title: '',
        color: defaultColor.color,
        color1: defaultColor.color1
      };

      const newEvents = [...events, newEvent];
      setEvents(newEvents);
      addToHistory(newEvents);
      return;
    }

    // Set timeout for single click
    setClickTimeout(setTimeout(() => {
      setClickTimeout(null);
      setClickCount(0);
    }, 300));

    setClickCount(prev => prev + 1);
    
    // Only set drag start position on mouse down
    setDragStartPosition(startDate);
    setNewEventStart(startDate);
    setNewEventEnd(endDate);
  };

  const handleTimeSlotMouseMove = (e) => {
    // Only start dragging if mouse has moved while clicking
    if (!dragStartPosition || !e.buttons) return;
    
    setIsDraggingNewEvent(true);

    const timeGrid = e.currentTarget;
    const rect = timeGrid.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const hour = Math.floor(y / 50);
    
    let currentDate = new Date(dragStartPosition);
    currentDate.setHours(hour);
    currentDate.setMinutes(0);
    
    let endDate = new Date(currentDate);
    endDate.setHours(hour + 1);
    endDate.setMinutes(0);
    
    if (currentDate > dragStartPosition) {
      setNewEventStart(dragStartPosition);
      setNewEventEnd(endDate);
    } else {
      setNewEventStart(currentDate);
      setNewEventEnd(new Date(currentDate.getTime() + (60 * 60 * 1000)));
    }
  };

  const handleTimeSlotMouseUp = (e) => {
    if (!dragStartPosition) return;

    // Only create event if we were dragging
    if (isDraggingNewEvent) {
      const defaultColor = CALENDAR_COLORS[0];
      const newEvent = {
        id: String(Date.now()),
        start: newEventStart,
        end: newEventEnd,
        title: '',
        color: defaultColor.color,
        color1: defaultColor.color1
      };

      const newEvents = [...events, newEvent];
      setEvents(newEvents);
      addToHistory(newEvents);
    }
    
    // Reset states
    setIsDraggingNewEvent(false);
    setDragStartPosition(null);
    setNewEventStart(null);
    setNewEventEnd(null);
  };

  const handleEventSave = (updatedEvent, shouldClose = false) => {
    const eventWithDates = {
      ...updatedEvent,
      id: String(updatedEvent.id),
      start: new Date(updatedEvent.start),
      end: new Date(updatedEvent.end),
      title: updatedEvent.title || '',
      color: updatedEvent.color,
      color1: updatedEvent.color1,
      notes: updatedEvent.notes || '',
      location: updatedEvent.location || '',
      employees: updatedEvent.employees || '',
      repeatValue: updatedEvent.repeatValue || 'None',
      endRepeatValue: updatedEvent.endRepeatValue || 'Never',
      endRepeatCount: updatedEvent.endRepeatCount || 1,
      endRepeatDate: updatedEvent.endRepeatDate || new Date(),
      customRepeatConfig: updatedEvent.customRepeatConfig || {
        frequency: 1,
        unit: 'week',
        days: ['MON']
      },
      isRecurring: updatedEvent.repeatValue && updatedEvent.repeatValue !== 'None'
    };

    let newEvents;
    // If this is a recurring event update
    if (updatedEvent.repeatValue && updatedEvent.repeatValue !== 'None') {
      const baseId = eventWithDates.id.split('-')[0];
      const currentEventDate = new Date(eventWithDates.start);

      // First, remove future occurrences but keep past ones
      newEvents = events.filter(event => {
        if (!String(event.id).startsWith(baseId)) {
          return true; // Keep events from other series
        }
        const eventDate = new Date(event.start);
        return eventDate < currentEventDate; // Keep past events from this series
      });
      
      // Then generate new recurring events starting from the current date
      const recurringEvents = generateRecurringEvents(
        eventWithDates,
        updatedEvent.repeatValue,
        updatedEvent.endRepeatValue,
        updatedEvent.endRepeatCount,
        updatedEvent.endRepeatDate,
        updatedEvent.customRepeatConfig
      );
      
      // Filter out any generated events that would occur before the current event
      const futureRecurringEvents = recurringEvents.filter(event => {
        const eventDate = new Date(event.start);
        return eventDate >= currentEventDate;
      });
      
      newEvents = [...newEvents, ...futureRecurringEvents];
    } else {
      // For non-recurring events, just update the single event
      newEvents = events.map(event => 
        String(event.id) === String(eventWithDates.id) ? eventWithDates : event
      );
    }
    
    setEvents(newEvents);
    
    if (shouldClose) {
      addToHistory(newEvents);
      setIsCreatingEvent(false);
      setNewEventStart(null);
      setNewEventEnd(null);
      setSelectedEvent(null);
      setSelectedEventId(null);
    } else {
      setSelectedEvent(eventWithDates);
    }
  };

  const handleColorSelect = (color, color1) => {
    if (selectedEvent) {
      const updatedEvent = {
        ...selectedEvent,
        color: color,
        color1: color1
      };
      handleEventSave(updatedEvent, false);
    }
  };

  const handleEventClick = (event, e) => {
    // Handle single click - select event
    if (clickCount < 1) {
      setClickCount(prev => prev + 1);
      setClickTimeout(setTimeout(() => {
        setClickCount(0);
        setClickTimeout(null);
        // Select the event on single click
        setSelectedEventId(event.id);
      }, 300));
      return;
    }

    // Clear the timeout and click count
    if (clickTimeout) {
      clearTimeout(clickTimeout);
      setClickTimeout(null);
    }
    setClickCount(0);

    // Handle double click - open event panel
    if (e) {
      const rect = e.currentTarget.getBoundingClientRect();
      const panelPosition = {
        x: e.clientX,
        // Center vertically relative to the clicked event
        y: window.innerHeight / 2
      };
      setSelectedEvent({ 
        ...event, 
        position: panelPosition,
        color: event.color || CALENDAR_COLORS[0].color,
        color1: event.color1 || CALENDAR_COLORS[0].color1
      });
    } else {
      setSelectedEvent(event);
    }
  };

  const addToHistory = (events) => {
    const newHistory = history.slice(0, currentHistoryIndex + 1);
    newHistory.push([...events]);
    setHistory(newHistory);
    setCurrentHistoryIndex(newHistory.length - 1);
  };

  const handleEventDelete = useCallback((eventId, deleteType = 'single') => {
    const event = events.find(e => String(e.id) === String(eventId));
    if (!event) return;

    let newEvents;
    const baseId = String(event.id).split('-')[0];
    const currentEventDate = new Date(event.start);

    if (deleteType === 'future' && (event.isRecurring || String(event.id).includes('-'))) {
      // Delete this and all future occurrences
      newEvents = events.filter(e => {
        if (!String(e.id).startsWith(baseId)) {
          return true; // Keep events from other series
        }
        const eventDate = new Date(e.start);
        return eventDate < currentEventDate; // Keep only past events from this series
      });
    } else {
      // Delete only this occurrence
      newEvents = events.filter(e => String(e.id) !== String(eventId));
    }

    setEvents(newEvents);
    addToHistory(newEvents);
    setSelectedEvent(null);
    setSelectedEventId(null);
    setShowDeleteConfirmation(false);
    setEventToDelete(null);
  }, [events]);

  const handlePanelClose = () => {
    setSelectedEvent(null);
    setSelectedEventId(null);
  };

  const handleEventResize = (eventId, newStart, newEnd, isTemporary = false, isModified = false) => {
    const event = events.find(e => String(e.id) === String(eventId));
    
    if (!event) return;

    // During resizing, just update the position temporarily
    if (isTemporary) {
      // Don't update the events array during temporary moves for recurring events
      if (event.isRecurring || String(event.id).includes('-')) {
        return;
      }
      const newEvents = events.map(evt =>
        String(evt.id) === String(eventId)
          ? { ...evt, start: newStart, end: newEnd }
          : evt
      );
      setEvents(newEvents);
      return;
    }

    // When resize is complete
    if (isModified && (event.isRecurring || String(event.id).includes('-'))) {
      // Store the event and new dates for the dialog
      setDraggedEvent(event);
      setDraggedEventNewDates({ start: newStart, end: newEnd });
      setShowRecurringDialog(true);
    } else {
      // For non-recurring events or unmodified events
      const newEvents = events.map(evt =>
        String(evt.id) === String(eventId)
          ? { ...evt, start: newStart, end: newEnd }
          : evt
      );
      setEvents(newEvents);
      addToHistory(newEvents);
    }
  };

  const handleEventMove = (eventId, newStart, newEnd, isTemporary = false, isModified = false) => {
    const event = events.find(e => String(e.id) === String(eventId));
    
    if (!event) return;

    // During dragging, just update the position temporarily
    if (isTemporary) {
      // Don't update the events array during temporary moves for recurring events
      if (event.isRecurring || String(event.id).includes('-')) {
        return;
      }
      const newEvents = events.map(evt =>
        String(evt.id) === String(eventId)
          ? { ...evt, start: newStart, end: newEnd }
          : evt
      );
      setEvents(newEvents);
      return;
    }

    // When drag is complete
    if (isModified && (event.isRecurring || String(event.id).includes('-'))) {
      // Store the event and new dates for the dialog
      setDraggedEvent(event);
      setDraggedEventNewDates({ start: newStart, end: newEnd });
      setShowRecurringDialog(true);
    } else {
      // For non-recurring events or unmodified events
      const newEvents = events.map(evt =>
        String(evt.id) === String(eventId)
          ? { ...evt, start: newStart, end: newEnd }
          : evt
      );
      setEvents(newEvents);
      addToHistory(newEvents);
    }
  };

  const handleEventChangeComplete = () => {
    addToHistory([...events]);
  };

  const renderTimeGrid = () => (
    <div 
      className="time-grid" 
      onMouseDown={handleTimeSlotMouseDown}
      onMouseMove={handleTimeSlotMouseMove}
      onMouseUp={handleTimeSlotMouseUp}
      onMouseLeave={() => {
        setIsDraggingNewEvent(false);
        setDragStartPosition(null);
      }}
      style={{
        gridTemplateColumns: view === 'day' ? '1fr' : 'repeat(7, 1fr)'
      }}
    >
      {generateTimeSlots().map((_, index) => (
        <div key={index} className="time-slot-line"></div>
      ))}
      {view === 'week' && renderDaySeparators()}
      {renderCurrentTimeIndicator()}
      {renderEvents()}
      {isDraggingNewEvent && newEventStart && newEventEnd && (
        <Event
          start={newEventStart}
          end={newEventEnd}
          isNew={true}
          color="#0A84FF"
          color1="#a8c1ff"
          title="New Event"
          onClick={() => {}}
        />
      )}
    </div>
  );

  const renderEvents = () => {
    // Filter events based on active categories
    const activeCategories = categories.reduce((acc, category) => {
      if (category.checked) {
        acc.push(category.color);
      }
      return acc;
    }, []);

    const filteredEvents = events.filter(event => 
      activeCategories.includes(event.color)
    );

    if (view === 'day') {
      // Filter events for the current day
      const dayEvents = filteredEvents.filter(event => {
        const eventDate = new Date(event.start);
        const currentDateStart = new Date(currentDate);
        
        return eventDate.getDate() === currentDateStart.getDate() &&
               eventDate.getMonth() === currentDateStart.getMonth() &&
               eventDate.getFullYear() === currentDateStart.getFullYear();
      });

      // Sort events by start time
      dayEvents.sort((a, b) => new Date(a.start) - new Date(b.start));

      return dayEvents.map(event => {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        const top = (eventStart.getHours() + eventStart.getMinutes() / 60) * 50;
        const duration = (eventEnd - eventStart) / (1000 * 60 * 60);
        const height = duration * 50;

        return (
          <Event
            key={event.id}
            {...event}
            isSelected={event.id === selectedEventId}
            style={{
              width: 'calc(100% - 20px)',
              left: '10px',
              top: `${top}px`,
              height: `${height}px`,
              position: 'absolute'
            }}
            onClick={(e) => handleEventClick(event, e)}
            onResize={(newStart, newEnd) => handleEventResize(event.id, newStart, newEnd)}
            onMove={(newStart, newEnd) => handleEventMove(event.id, newStart, newEnd)}
            onChangeComplete={handleEventChangeComplete}
          />
        );
      });
    }

    // Original week view rendering logic
    const currentWeekEvents = getEventsForCurrentWeek(filteredEvents);
    const sortedEvents = [...currentWeekEvents].sort((a, b) => {
      if (a.isRecurring && !b.isRecurring) return -1;
      if (!a.isRecurring && b.isRecurring) return 1;
      return 0;
    });

    return sortedEvents.map(event => {
      const startDate = new Date(event.start);
      const endDate = new Date(event.end);
      const eventComponents = [];
      
      // Check if event spans multiple days
      const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= 1) {
        // Single day event
        eventComponents.push(
          <Event
            key={event.id}
            {...event}
            isSelected={event.id === selectedEventId}
            onClick={(e) => handleEventClick(event, e)}
            onResize={(newStart, newEnd) => handleEventResize(event.id, newStart, newEnd)}
            onMove={(newStart, newEnd) => handleEventMove(event.id, newStart, newEnd)}
            onChangeComplete={handleEventChangeComplete}
          />
        );
      } else {
        // Multi-day event
        const weekDates = getWeekDates();
        const weekStart = weekDates[0];
        const weekEnd = weekDates[6];
        
        // Only render event parts that fall within the current week view
        for (let i = 0; i < daysDiff; i++) {
          const currentDate = new Date(startDate);
          currentDate.setDate(startDate.getDate() + i);
          
          // Skip if day is not in current week
          if (currentDate < weekStart || currentDate > weekEnd) continue;
          
          const isFirstDay = i === 0;
          const isLastDay = i === daysDiff - 1;
          
          eventComponents.push(
            <Event
              key={`${event.id}-${i}`}
              {...event}
              start={isFirstDay ? startDate : new Date(currentDate.setHours(0, 0, 0))}
              end={isLastDay ? endDate : new Date(currentDate.setHours(23, 59, 59))}
              isSelected={event.id === selectedEventId}
              isMultiDay={true}
              isFirstDay={isFirstDay}
              isLastDay={isLastDay}
              onClick={(e) => handleEventClick(event, e)}
              onResize={(newStart, newEnd) => handleEventResize(event.id, newStart, newEnd)}
              onMove={(newStart, newEnd) => handleEventMove(event.id, newStart, newEnd)}
              onChangeComplete={handleEventChangeComplete}
            />
          );
        }
      }
      
      return eventComponents;
    }).flat();
  };

  const renderCurrentTimeIndicator = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const top = (hours * 50) + (minutes / 60) * 50;
    
    return (
      <div 
        className="current-time-indicator"
        style={{
          top: `${top}px`
        }}
      />
    );
  };

  useEffect(() => {
    const timer = setInterval(() => {
      // Force re-render to update time indicator position
      setCurrentDate(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  const undo = () => {
    if (currentHistoryIndex > 0) {
      const newIndex = currentHistoryIndex - 1;
      setCurrentHistoryIndex(newIndex);
      setEvents([...history[newIndex]]);
      
      // Clear selected event if it no longer exists in the previous state
      const previousEvents = history[newIndex];
      if (selectedEvent && !previousEvents.find(e => e.id === selectedEvent.id)) {
        setSelectedEvent(null);
        setSelectedEventId(null);
      }
    }
  };

  const redo = () => {
    if (currentHistoryIndex < history.length - 1) {
      const newIndex = currentHistoryIndex + 1;
      setCurrentHistoryIndex(newIndex);
      setEvents([...history[newIndex]]);
      
      // Clear selected event if it no longer exists in the next state
      const nextEvents = history[newIndex];
      if (selectedEvent && !nextEvents.find(e => e.id === selectedEvent.id)) {
        setSelectedEvent(null);
        setSelectedEventId(null);
      }
    }
  };

  const handleKeyboardShortcuts = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.key === 'y') || (e.key === 'z' && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      if (showDeleteConfirmation) {
        setShowDeleteConfirmation(false);
        setEventToDelete(null);
      } else if (selectedEvent) {
        handlePanelClose();
      }
    }

    if (e.key === 'Backspace' && !e.target.matches('input, textarea')) {
      e.preventDefault();
      const eventId = selectedEventId || (selectedEvent && selectedEvent.id);
      if (eventId) {
        const event = events.find(e => e.id === eventId);
        if (event) {
          setEventToDelete(event);
          setShowDeleteConfirmation(true);
        }
      }
    }
  }, [history, currentHistoryIndex, selectedEvent, selectedEventId, showDeleteConfirmation, events]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardShortcuts);
    return () => document.removeEventListener('keydown', handleKeyboardShortcuts);
  }, [handleKeyboardShortcuts]);

  const handleRecurringEventChange = (changeType) => {
    if (!draggedEvent || !draggedEventNewDates) return;

    let newEvents;
    const baseId = draggedEvent.id.split('-')[0];

    if (changeType === 'single') {
      // Update only this occurrence
      newEvents = events.map(event => {
        if (event.id === draggedEvent.id) {
          return {
            ...event,
            start: draggedEventNewDates.start,
            end: draggedEventNewDates.end
          };
        }
        return event;
      });
    } else if (changeType === 'all') {
      // Remove all existing occurrences
      newEvents = events.filter(event => !String(event.id).startsWith(baseId));

      // Get the base event
      const baseEvent = events.find(event => event.id === baseId) || draggedEvent;
      
      // Calculate time difference to apply to base event
      const timeDiff = draggedEventNewDates.start.getTime() - draggedEvent.start.getTime();
      
      // Create updated base event
      const updatedBaseEvent = {
        ...baseEvent,
        start: new Date(baseEvent.start.getTime() + timeDiff),
        end: new Date(baseEvent.end.getTime() + timeDiff)
      };

      // Regenerate recurring events
      const recurringEvents = generateRecurringEvents(
        updatedBaseEvent,
        baseEvent.repeatValue,
        baseEvent.endRepeatValue,
        baseEvent.endRepeatCount,
        baseEvent.endRepeatDate,
        baseEvent.customRepeatConfig
      );

      newEvents = [...newEvents, ...recurringEvents];
    } else {
      // If canceled, keep original events
      newEvents = [...events];
    }

    setEvents(newEvents);
    if (changeType !== 'cancel') {
      addToHistory(newEvents);
    }

    setShowRecurringDialog(false);
    setDraggedEvent(null);
    setDraggedEventNewDates(null);
  };

  // Add this helper function to format the navigation text
  const getNavigationText = () => {
    const month = currentDate.toLocaleString(i18n.language, { month: 'long' })
      .charAt(0).toUpperCase() + currentDate.toLocaleString(i18n.language, { month: 'long' }).slice(1);
    const year = currentDate.getFullYear();
    return `${month} ${year}`;
  };

  // Add this function to filter events for current week
  const getEventsForCurrentWeek = (filteredEvents = events) => {
    const weekDates = getWeekDates();
    const weekStart = new Date(weekDates[0]);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekDates[6]);
    weekEnd.setHours(23, 59, 59, 999);

    return filteredEvents.filter(event => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      return eventStart <= weekEnd && eventEnd >= weekStart;
    });
  };

  // Add new function to handle day click
  const handleDayClick = (date) => {
    const direction = date > currentDate ? 1 : -1;
    setSlideDirection(direction > 0 ? 'left' : 'right');
    setCurrentDate(date);
    setView('day');
  };

  // Add this helper function to get days around current date
  const getDaysAroundCurrent = () => {
    const days = [];
    const middleIndex = 3; // We'll show 7 days total, with current day in middle
    
    for (let i = -middleIndex; i <= middleIndex; i++) {
      const date = new Date(currentDate);
      date.setDate(currentDate.getDate() + i);
      days.push(date);
    }
    return days;
  };

  // Update the renderTimeHeaders function
  const renderTimeHeaders = () => {
    if (view === 'day') {
      const surroundingDays = getDaysAroundCurrent();
      
      return (        
        <div className="time-headers sticky-dates time-headers-padded day-view-headers">
            <Button 
              onClick={() => setView('week')}
              color="#333"
              textColor="white"
              focusColor="#222"
            >
              Week View
            </Button>
            {surroundingDays.map((date, index) => {
              const isCurrentDay = date.getDate() === currentDate.getDate() &&
                date.getMonth() === currentDate.getMonth() &&
                date.getFullYear() === currentDate.getFullYear();
              
              const distanceFromCenter = Math.abs(3 - index);
              const yOffset = distanceFromCenter * 2;
              
              return (
                <div 
                  key={index} 
                  className={`day-header ${slideDirection ? `sliding-${slideDirection}` : ''}`}
                  onClick={() => handleDayClick(date)}
                  onAnimationEnd={() => {
                    if (isCurrentDay) {
                      setSlideDirection(null);
                    }
                  }}
                  style={{ 
                    cursor: 'pointer',
                    opacity: 1 - (distanceFromCenter * 0.2),
                    '--y-offset': `${yOffset}px`,
                    transform: `translateY(${yOffset}px)`,
                    fontSize: `${100 - (distanceFromCenter * 10)}%`
                  }}
                >
                  <div className="day-name">
                    {date.toLocaleString(i18n.language, { weekday: 'short' }).slice(0, 3)}
                  </div>
                  <div className="day-number">{date.getDate()}</div>
                </div>
              );
            })}
        </div>
      );
    }

    // Week view header rendering
    const shortDays = getShortDays();
    return (
      <div className="time-headers sticky-dates time-headers-padded">
        {getWeekDates().map((date, index) => {
          const isCurrentDay = date.getDate() === currentDate.getDate() &&
            date.getMonth() === currentDate.getMonth() &&
            date.getFullYear() === currentDate.getFullYear();
          
          return (
            <div 
              key={index} 
              className={`day-header ${isCurrentDay ? 'current-day' : ''}`}
              onClick={() => handleDayClick(date)}
              style={{ cursor: 'pointer' }}
            >
              <div className="day-name">{shortDays[index]}</div>
              <div className="day-number">{date.getDate()}</div>
            </div>
          );
        })}
      </div>
    );
  };

  // Add this function to handle category toggle
  const handleCategoryToggle = (index) => {
    setCategories(prevCategories => {
      const newCategories = [...prevCategories];
      newCategories[index] = {
        ...newCategories[index],
        checked: !newCategories[index].checked
      };
      return newCategories;
    });
  };

  // Update the header title click handler
  const handleHeaderDateClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setDropdownPosition({
      x: 0,
      y: rect.height + 8
    });
    // Close event panel if open
    if (selectedEvent) {
      handlePanelClose();
    }
    // Toggle header dropdown
    setShowHeaderDateDropdown(!showHeaderDateDropdown);
    setShowMiniCalendarDropdown(false);
  };

  // Update the mini calendar title click handler
  const handleMiniCalendarTitleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setDropdownPosition({
      x: 0,
      y: rect.height + 30
    });
    // Close event panel if open
    if (selectedEvent) {
      handlePanelClose();
    }
    // Toggle header dropdown
    setShowHeaderDateDropdown(!showHeaderDateDropdown);
    setShowMiniCalendarDropdown(false);  
  };

  // Add click outside handler for both dropdowns and event panel
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside dropdowns
      if (
        !headerDateRef.current?.contains(event.target) &&
        !miniCalendarTitleRef.current?.contains(event.target) &&
        !event.target.closest('.date-dropdown')
      ) {
        setShowHeaderDateDropdown(false);
        setShowMiniCalendarDropdown(false);
      }

      // Check if click is outside event panel
      if (selectedEvent && !event.target.closest('.event-panel')) {
        handlePanelClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedEvent]); // Add selectedEvent to dependencies

  // Add this function to generate recurring event instances
  const generateRecurringEvents = (event) => {
    // If it's a custom configuration, use the existing custom generator
    if (event.customRepeatConfig && event.repeatValue.includes('Custom')) {
      return generateCustomRecurringEvents(
        event,
        event.customRepeatConfig,
        event.endRepeatValue,
        event.endRepeatCount,
        event.endRepeatDate
      );
    }

    const instances = [];
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);
    const duration = endDate.getTime() - startDate.getTime();

    // Define the end date for recurring events
    let recurrenceEndDate;
    if (event.endRepeatValue === 'Never') {
      // Set a reasonable limit, e.g., 1 year from start
      recurrenceEndDate = new Date(startDate);
      recurrenceEndDate.setFullYear(recurrenceEndDate.getFullYear() + 1);
    } else if (event.endRepeatValue === 'After') {
      recurrenceEndDate = null; // We'll use count instead
    } else if (event.endRepeatValue === 'On Date') {
      recurrenceEndDate = new Date(event.endRepeatDate);
    }

    let currentDate = new Date(startDate);
    let count = 0;

    while (
      (recurrenceEndDate ? currentDate <= recurrenceEndDate : true) &&
      (event.endRepeatValue === 'After' ? count < event.endRepeatCount : true)
    ) {
      // Add the current instance
      instances.push({
        ...event,
        id: `${event.id}-${count}`,
        start: new Date(currentDate),
        end: new Date(currentDate.getTime() + duration),
        isRecurring: true
      });
      
      count++;

      // Advance the date based on repeat type
      switch (event.repeatValue) {
        case 'Every Day':
          currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
          break;
        case 'Every Week':
          currentDate = new Date(currentDate.setDate(currentDate.getDate() + 7));
          break;
        case 'Every Month':
          currentDate = new Date(currentDate.setMonth(currentDate.getMonth() + 1));
          break;
        default:
          // For unknown repeat types, prevent infinite loop
          currentDate = recurrenceEndDate;
          break;
      }
    }

    return instances;
  };

  return (
    <div className="calendar-container">
      <div className="calendar-layout">
        {/* Sidebar */}
        <div className="calendar-sidebar">
          {renderMiniCalendar()}
          <div className="categories-section">
            <header>{t('dashboard.calendar.categories.title')}</header>
            {categories.map((category, index) => (
              <div className="category-item" key={index}>
                <Checkbox
                  label={t(`dashboard.calendar.categories.${category.name.toLowerCase().replace(/ /g, '_')}`)}
                  checked={category.checked}
                  onChange={() => handleCategoryToggle(index)}
                  color={category.color}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Main Calendar Section */}
        <div className="calendar-main">
          {/* Calendar Header */}
          <div className="calendar-header">
            <div className="calendar-navigation">
              <div className="calendar-navigation-left">
                <h2 
                  ref={headerDateRef}
                  onClick={handleHeaderDateClick}
                  className="header-date-title"
                >
                  {getNavigationText()}
                </h2>
                {showHeaderDateDropdown && (
                  <MonthYearDropdown
                    currentDate={currentDate}
                    onSelect={setCurrentDate}
                    isOpen={showHeaderDateDropdown}
                    onClose={() => setShowHeaderDateDropdown(false)}
                    position={dropdownPosition}
                  />
                )}
              </div>
              <div className="calendar-navigation-right">
                <button onClick={() => navigateDate(-1)}><GrPrevious /></button>
                <Button 
                  onClick={() => setCurrentDate(new Date())}
                  color="#333"
                  textColor="white"
                  focusColor="#222"
                  text={t('dashboard.calendar.today')}
                />
                <button onClick={() => navigateDate(1)}><GrNext /></button>
              </div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="calendar-grid" data-view={view}>
            {renderTimeHeaders()}
            <div className="time-slots">
              <div className="time-labels">
                {generateTimeSlots().map((time, index) => (
                  <div key={index} className="time-label">{time}</div>
                ))}
              </div>
              {renderTimeGrid()}
            </div>
          </div>
        </div>
      </div>

      {/* Rest of the components (EventPanel, RecurringDialog, etc.) */}
      {selectedEvent && (
        <EventPanel
          event={selectedEvent}
          position={selectedEvent.position}
          onClose={handlePanelClose}
          onSave={handleEventSave}
          onDelete={handleEventDelete}
          colorOptions={CALENDAR_COLORS}
        />
      )}
      {showRecurringDialog && (
        <div className="recurring-dialog-overlay">
          <div className="recurring-dialog">
            <div className="recurring-dialog-content">
              <h3>You&apos;re changing the date of a repeating event.</h3>
              <p>Do you want to move only this occurrence to {draggedEventNewDates?.start.toLocaleDateString()}, {draggedEventNewDates?.start.toLocaleTimeString()}, or change the date for this and all future events?</p>
              <div className="recurring-dialog-buttons">
                <button 
                  className="recurring-dialog-button"
                  onClick={() => handleRecurringEventChange('single')}
                >
                  Only This Event
                </button>
                <button 
                  className="recurring-dialog-button"
                  onClick={() => handleRecurringEventChange('all')}
                >
                  All Future Events
                </button>
                <button 
                  className="recurring-dialog-button cancel"
                  onClick={() => {
                    setShowRecurringDialog(false);
                    setDraggedEvent(null);
                    setDraggedEventNewDates(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showDeleteConfirmation && eventToDelete && (
        <DeleteConfirmationDialog
          event={eventToDelete}
          currentDate={new Date(eventToDelete.start)}
          onConfirm={(deleteType) => handleEventDelete(eventToDelete.id, deleteType)}
          onCancel={() => {
            setShowDeleteConfirmation(false);
            setEventToDelete(null);
          }}
          isRecurring={eventToDelete.isRecurring || String(eventToDelete.id).includes('-')}
        />
      )}
    </div>
  );
};

// Add this helper function at the top of the file with other helpers
const getWeekNumber = (date) => {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
};

export default Calendar;