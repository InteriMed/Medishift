// Calendar Accessibility Utilities
import { useEffect, useRef, useState } from 'react';

/**
 * Accessibility utilities for the calendar system
 */

/**
 * Generate ARIA label for calendar events
 */
export const generateEventAriaLabel = (event) => {
  if (!event) return '';
  
  const startTime = new Date(event.start).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  const endTime = new Date(event.end).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  const date = new Date(event.start).toLocaleDateString([], {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  let label = `${event.title}, ${date} from ${startTime} to ${endTime}`;
  
  if (event.location) {
    label += `, at ${event.location}`;
  }
  
  if (event.notes) {
    label += `, note: ${event.notes}`;
  }
  
  if (event.isRecurring) {
    label += ', recurring event';
  }
  
  return label;
};

/**
 * Generate ARIA label for time slots
 */
export const generateTimeSlotAriaLabel = (hour, date, hasEvents = false) => {
  const timeString = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour)
    .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  const dateString = date.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });
  
  let label = `${timeString} on ${dateString}`;
  
  if (hasEvents) {
    label += ', has events';
  } else {
    label += ', available time slot';
  }
  
  return label + '. Press Enter to create new event, or Tab to navigate to next time slot.';
};

/**
 * Hook for keyboard navigation in calendar grid
 */
export const useCalendarKeyboardNavigation = (view, currentDate, events, onEventSelect, onTimeSlotSelect) => {
  const [focusedDate, setFocusedDate] = useState(currentDate);
  const [focusedHour, setFocusedHour] = useState(9); // Start at 9 AM
  const [focusedEventIndex, setFocusedEventIndex] = useState(-1);
  const gridRef = useRef(null);

  const handleKeyDown = (e) => {
    const { key, ctrlKey, metaKey, shiftKey } = e;
    
    // Prevent default browser behavior for navigation keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Space'].includes(key)) {
      e.preventDefault();
    }

    switch (key) {
      case 'ArrowRight':
        if (view === 'week') {
          // Move to next day
          const nextDate = new Date(focusedDate);
          nextDate.setDate(nextDate.getDate() + 1);
          setFocusedDate(nextDate);
        } else if (view === 'day') {
          // Move to next hour
          setFocusedHour(prev => Math.min(23, prev + 1));
        }
        break;

      case 'ArrowLeft':
        if (view === 'week') {
          // Move to previous day
          const prevDate = new Date(focusedDate);
          prevDate.setDate(prevDate.getDate() - 1);
          setFocusedDate(prevDate);
        } else if (view === 'day') {
          // Move to previous hour
          setFocusedHour(prev => Math.max(0, prev - 1));
        }
        break;

      case 'ArrowDown':
        if (focusedEventIndex >= 0) {
          // Navigate through events
          const dayEvents = getEventsForTimeSlot(focusedDate, focusedHour, events);
          setFocusedEventIndex(prev => Math.min(dayEvents.length - 1, prev + 1));
        } else {
          // Move to next hour
          setFocusedHour(prev => Math.min(23, prev + 1));
        }
        break;

      case 'ArrowUp':
        if (focusedEventIndex >= 0) {
          // Navigate through events
          setFocusedEventIndex(prev => Math.max(-1, prev - 1));
        } else {
          // Move to previous hour
          setFocusedHour(prev => Math.max(0, prev - 1));
        }
        break;

      case 'Enter':
      case ' ':
        if (focusedEventIndex >= 0) {
          // Select focused event
          const dayEvents = getEventsForTimeSlot(focusedDate, focusedHour, events);
          const selectedEvent = dayEvents[focusedEventIndex];
          if (selectedEvent && onEventSelect) {
            onEventSelect(selectedEvent);
          }
        } else {
          // Create new event at focused time slot
          if (onTimeSlotSelect) {
            const timeSlotDate = new Date(focusedDate);
            timeSlotDate.setHours(focusedHour, 0, 0, 0);
            onTimeSlotSelect(timeSlotDate);
          }
        }
        break;

      case 'Tab':
        // Tab navigation handled by browser
        if (!shiftKey) {
          // Focus next event in current time slot
          const dayEvents = getEventsForTimeSlot(focusedDate, focusedHour, events);
          if (dayEvents.length > 0 && focusedEventIndex < dayEvents.length - 1) {
            setFocusedEventIndex(prev => prev + 1);
          }
        }
        break;

      case 'Escape':
        // Clear event selection
        setFocusedEventIndex(-1);
        if (onEventSelect) {
          onEventSelect(null);
        }
        break;

      case 'Home':
        if (ctrlKey || metaKey) {
          // Go to current date
          setFocusedDate(new Date());
          setFocusedHour(9);
        } else {
          // Go to start of day
          setFocusedHour(0);
        }
        break;

      case 'End':
        if (ctrlKey || metaKey) {
          // Go to end of current month
          const endOfMonth = new Date(focusedDate);
          endOfMonth.setMonth(endOfMonth.getMonth() + 1, 0);
          setFocusedDate(endOfMonth);
        } else {
          // Go to end of day
          setFocusedHour(23);
        }
        break;

      case 'PageUp':
        // Previous week
        const prevWeek = new Date(focusedDate);
        prevWeek.setDate(prevWeek.getDate() - 7);
        setFocusedDate(prevWeek);
        break;

      case 'PageDown':
        // Next week
        const nextWeek = new Date(focusedDate);
        nextWeek.setDate(nextWeek.getDate() + 7);
        setFocusedDate(nextWeek);
        break;
    }
  };

  return {
    focusedDate,
    focusedHour,
    focusedEventIndex,
    gridRef,
    handleKeyDown,
    setFocusedDate,
    setFocusedHour
  };
};

/**
 * Get events for a specific time slot
 */
const getEventsForTimeSlot = (date, hour, events) => {
  const startOfHour = new Date(date);
  startOfHour.setHours(hour, 0, 0, 0);
  
  const endOfHour = new Date(date);
  endOfHour.setHours(hour + 1, 0, 0, 0);
  
  return events.filter(event => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    
    return (eventStart < endOfHour && eventEnd > startOfHour);
  });
};

/**
 * Hook for managing focus within calendar
 */
export const useFocusManagement = () => {
  const [focusedElement, setFocusedElement] = useState(null);
  const previousFocusRef = useRef(null);

  const savePreviousFocus = () => {
    previousFocusRef.current = document.activeElement;
  };

  const restorePreviousFocus = () => {
    if (previousFocusRef.current && previousFocusRef.current.focus) {
      previousFocusRef.current.focus();
    }
  };

  const moveFocusTo = (element) => {
    if (element && element.focus) {
      element.focus();
      setFocusedElement(element);
    }
  };

  const trapFocus = (containerRef) => {
    if (!containerRef.current) return;

    const focusableElements = containerRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  };

  return {
    focusedElement,
    savePreviousFocus,
    restorePreviousFocus,
    moveFocusTo,
    trapFocus
  };
};

/**
 * Hook for screen reader announcements
 */
export const useScreenReaderAnnouncements = () => {
  const announcementRef = useRef(null);

  const announce = (message, priority = 'polite') => {
    if (!announcementRef.current) {
      // Create live region if it doesn't exist
      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('aria-live', priority);
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.setAttribute('class', 'sr-only');
      liveRegion.style.cssText = 
        'position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden;';
      
      document.body.appendChild(liveRegion);
      announcementRef.current = liveRegion;
    }

    // Clear and set new message
    announcementRef.current.textContent = '';
    setTimeout(() => {
      if (announcementRef.current) {
        announcementRef.current.textContent = message;
      }
    }, 100);
  };

  const announceEventChange = (action, event) => {
    const eventLabel = generateEventAriaLabel(event);
    announce(`${action}: ${eventLabel}`);
  };

  const announceNavigation = (view, date) => {
    const dateString = date.toLocaleDateString([], {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    announce(`Navigated to ${view} view, ${dateString}`);
  };

  return {
    announce,
    announceEventChange,
    announceNavigation
  };
};

/**
 * Generate semantic markup attributes for calendar elements
 */
export const getCalendarSemantics = (elementType, props = {}) => {
  const semantics = {
    role: null,
    'aria-label': null,
    'aria-labelledby': null,
    'aria-describedby': null,
    'aria-expanded': null,
    'aria-selected': null,
    'aria-current': null,
    tabIndex: null
  };

  switch (elementType) {
    case 'calendar-grid':
      semantics.role = 'grid';
      semantics['aria-label'] = `Calendar grid, ${props.view} view`;
      semantics.tabIndex = 0;
      break;

    case 'calendar-row':
      semantics.role = 'row';
      break;

    case 'calendar-cell':
      semantics.role = 'gridcell';
      semantics['aria-label'] = props.ariaLabel;
      semantics.tabIndex = props.isFocused ? 0 : -1;
      if (props.isToday) {
        semantics['aria-current'] = 'date';
      }
      break;

    case 'event':
      semantics.role = 'button';
      semantics['aria-label'] = generateEventAriaLabel(props.event);
      semantics.tabIndex = props.isFocused ? 0 : -1;
      semantics['aria-selected'] = props.isSelected;
      break;

    case 'time-slot':
      semantics.role = 'button';
      semantics['aria-label'] = generateTimeSlotAriaLabel(props.hour, props.date, props.hasEvents);
      semantics.tabIndex = props.isFocused ? 0 : -1;
      break;

    case 'navigation-button':
      semantics.role = 'button';
      semantics['aria-label'] = props.ariaLabel;
      break;

    case 'view-selector':
      semantics.role = 'tablist';
      semantics['aria-label'] = 'Calendar view options';
      break;

    case 'view-option':
      semantics.role = 'tab';
      semantics['aria-selected'] = props.isSelected;
      semantics['aria-controls'] = props.panelId;
      break;
  }

  // Remove null values
  Object.keys(semantics).forEach(key => {
    if (semantics[key] === null) {
      delete semantics[key];
    }
  });

  return semantics;
};

/**
 * Color contrast checker for accessibility compliance
 */
export const checkColorContrast = (foreground, background) => {
  // Convert hex to RGB
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  // Calculate relative luminance
  const getLuminance = (rgb) => {
    const { r, g, b } = rgb;
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const fgRgb = hexToRgb(foreground);
  const bgRgb = hexToRgb(background);
  
  if (!fgRgb || !bgRgb) return { ratio: 0, isAccessible: false };

  const fgLuminance = getLuminance(fgRgb);
  const bgLuminance = getLuminance(bgRgb);
  
  const ratio = (Math.max(fgLuminance, bgLuminance) + 0.05) / 
                (Math.min(fgLuminance, bgLuminance) + 0.05);

  return {
    ratio: Math.round(ratio * 100) / 100,
    isAccessible: ratio >= 4.5, // WCAG AA standard
    isEnhanced: ratio >= 7      // WCAG AAA standard
  };
};

export { useCalendarKeyboardNavigation }; 