import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import './Event.css';
import { getMondayBasedDayIndex, getScrollableDayIndex } from '../../utils/dateHelpers';

// Memoized Event component for better performance
const OptimizedEvent = memo(({ 
  start, 
  end, 
  title, 
  color, 
  color1, 
  isSelected, 
  onClick, 
  onRightClick, 
  onResize, 
  onMove, 
  onChangeComplete, 
  isMultiDay, 
  isFirstDay, 
  isLastDay, 
  isRecurring = false, 
  notes, 
  location, 
  employees, 
  id, 
  style, 
  overlapInfo, 
  currentDate, 
  currentDayIndex, 
  weekScrollOffset = 0 
}) => {
  // Local state with minimal re-renders
  const [dragState, setDragState] = useState({
    isDragging: false,
    isResizing: false,
    dragStartTime: null
  });
  
  const autoScrollIntervalRef = useRef(null);
  const eventRef = useRef(null);
  
  // Memoized position calculation
  const position = React.useMemo(() => {
    // If style prop is provided (from TimeGrid for day view), use it
    if (style) {
      return style;
    }

    // Ensure start and end are Date objects
    const startDate = start instanceof Date ? start : new Date(start);
    const endDate = end instanceof Date ? end : new Date(end);
    
    // Check if we're in day view by looking at the time grid
    const timeGrid = document.querySelector('.time-grid');
    const isDayView = timeGrid && timeGrid.style.gridTemplateColumns === '1fr';
    
    if (isDayView) {
      // Day view: events should take full width
      let hour, duration;
      
      if (isMultiDay) {
        if (isFirstDay) {
          hour = startDate.getHours() + startDate.getMinutes() / 60;
          duration = 24 - hour;
        } else if (isLastDay) {
          hour = 0;
          duration = endDate.getHours() + endDate.getMinutes() / 60;
        } else {
          hour = 0;
          duration = 24;
        }
      } else {
        hour = startDate.getHours() + startDate.getMinutes() / 60;
        duration = (endDate.getHours() + endDate.getMinutes() / 60) - hour;
      }

      const top = hour * 50;
      const height = Math.max(duration * 50, 20); // Minimum height

      return {
        top: `${top}px`,
        height: `${height}px`,
        left: '0px',
        width: '100%'
      };
    } else {
      // Week view: calculate position based on day using scrollable day index
      const dayWidth = 100 / 7;
      let dayIndex, hour, duration;
      
      if (isMultiDay && currentDayIndex !== undefined) {
        const currentDay = new Date(startDate);
        currentDay.setDate(startDate.getDate() + currentDayIndex);
        dayIndex = getScrollableDayIndex(currentDay, weekScrollOffset);
        
        if (isFirstDay) {
          hour = startDate.getHours() + startDate.getMinutes() / 60;
          duration = 24 - hour;
        } else if (isLastDay) {
          hour = 0;
          duration = endDate.getHours() + endDate.getMinutes() / 60;
        } else {
          hour = 0;
          duration = 24;
        }
      } else {
        dayIndex = getScrollableDayIndex(startDate, weekScrollOffset);
        hour = startDate.getHours() + startDate.getMinutes() / 60;
        duration = (endDate.getHours() + endDate.getMinutes() / 60) - hour;
      }

      // Handle overlap if provided
      let adjustedLeft = dayWidth * dayIndex;
      let adjustedWidth = dayWidth;
      
      if (overlapInfo && overlapInfo.count > 1) {
        const overlapWidth = dayWidth / overlapInfo.count;
        adjustedLeft = (dayWidth * dayIndex) + (overlapWidth * overlapInfo.index);
        adjustedWidth = overlapWidth * 0.95; // Slight gap between overlapping events
      }

      const top = hour * 50;
      const height = Math.max(duration * 50, 20); // Minimum height

      return {
        top: `${top}px`,
        height: `${height}px`,
        left: `${adjustedLeft}%`,
        width: `${adjustedWidth}%`
      };
    }
  }, [start, end, isMultiDay, isFirstDay, isLastDay, currentDayIndex, weekScrollOffset, style, overlapInfo]);

  // Memoized event styles
  const eventStyles = React.useMemo(() => {
    const baseStyles = {
      ...position,
      backgroundColor: hexToRgba(color, 0.8),
      borderLeft: `4px solid ${color}`,
      color: getContrastColor(color),
      cursor: dragState.isDragging ? 'grabbing' : 'grab',
      zIndex: isSelected ? 1000 : dragState.isDragging ? 999 : 10,
      opacity: dragState.isDragging ? 0.8 : 1,
      transform: dragState.isDragging ? 'scale(1.02)' : 'scale(1)',
      transition: dragState.isDragging ? 'none' : 'transform 0.1s ease-out',
      boxShadow: isSelected 
        ? '0 4px 12px rgba(0,0,0,0.3)' 
        : dragState.isDragging 
          ? '0 8px 25px rgba(0,0,0,0.25)' 
          : '0 2px 8px rgba(0,0,0,0.1)'
    };

    // Add visual indicators for recurring events
    if (isRecurring) {
      baseStyles.borderLeftWidth = '6px';
      baseStyles.borderLeftStyle = 'double';
    }

    return baseStyles;
  }, [position, color, isSelected, dragState.isDragging, dragState.isResizing, isRecurring]);

  // Optimized drag handlers using useCallback
  const handleDragStart = useCallback((e) => {
    if (e.button !== 0) return; // Only left mouse button
    
    e.preventDefault();
    e.stopPropagation();
    
    // Set global drag flag
    window.calendarEventDragging = true;
    
    // Check for double-click
    const now = Date.now();
    if (dragState.dragStartTime && (now - dragState.dragStartTime < 300)) {
      setDragState(prev => ({ ...prev, dragStartTime: null, isDragging: false }));
      window.calendarEventDragging = false;
      onClick?.(e);
      return;
    }
    
    setDragState(prev => ({ ...prev, dragStartTime: now }));
    
    // Skip if clicking on resize handles
    if (e.target.classList.contains('resize-handle-top') || 
        e.target.classList.contains('resize-handle-bottom')) {
      return;
    }

    const startTime = start instanceof Date ? new Date(start) : new Date(start);
    const endTime = end instanceof Date ? new Date(end) : new Date(end);
    const duration = endTime - startTime;
    
    const timeGrid = e.currentTarget.closest('.time-grid');
    if (!timeGrid) return;
    
    const gridRect = timeGrid.getBoundingClientRect();
    const eventRect = e.currentTarget.getBoundingClientRect();
    const relativeY = e.clientY - eventRect.top;
    const relativeX = e.clientX - eventRect.left;
    
    const eventHeightInPixels = eventRect.height;
    const eventDurationInMinutes = duration / (1000 * 60);
    const timeOffsetInMinutes = (relativeY / eventHeightInPixels) * eventDurationInMinutes;

    const handleMouseMove = (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (!dragState.isDragging) {
        setDragState(prev => ({ ...prev, isDragging: true }));
      }

      // Auto-scroll logic
      checkAutoScroll(e.clientY);

      // Determine view type
      const isDayView = timeGrid.style.gridTemplateColumns === '1fr';

      if (isDayView) {
        // Day view: time changes only
        const currentY = e.clientY - gridRect.top;
        const mouseTimeInHours = Math.max(0, Math.min(24, currentY / 50));
        const mouseTimeInMinutes = mouseTimeInHours * 60;
        const eventStartTimeInMinutes = mouseTimeInMinutes - timeOffsetInMinutes;
        const roundedStartMinutes = Math.round(eventStartTimeInMinutes / 15) * 15;
        const clampedStartMinutes = Math.max(0, Math.min(24 * 60 - eventDurationInMinutes, roundedStartMinutes));
        
        const newStartTime = new Date(startTime);
        newStartTime.setHours(Math.floor(clampedStartMinutes / 60), clampedStartMinutes % 60, 0, 0);
        const newEndTime = new Date(newStartTime.getTime() + duration);

        onMove?.(id, newStartTime, newEndTime, true);
      } else {
        // Week view: day and time changes
        const currentY = e.clientY - gridRect.top;
        const currentX = e.clientX - gridRect.left;
        
        const mouseTimeInHours = Math.max(0, Math.min(24, currentY / 50));
        const mouseTimeInMinutes = mouseTimeInHours * 60;
        const eventStartTimeInMinutes = mouseTimeInMinutes - timeOffsetInMinutes;
        const roundedStartMinutes = Math.round(eventStartTimeInMinutes / 15) * 15;
        const clampedStartMinutes = Math.max(0, Math.min(24 * 60 - eventDurationInMinutes, roundedStartMinutes));
        
        const dayIndex = Math.max(0, Math.min(6, Math.floor((currentX / gridRect.width) * 7)));
        const weekStartDate = new Date(currentDate);
        const mondayBasedDayIndex = getMondayBasedDayIndex(weekStartDate);
        weekStartDate.setDate(weekStartDate.getDate() - mondayBasedDayIndex);
        
        const targetDate = new Date(weekStartDate);
        targetDate.setDate(weekStartDate.getDate() + dayIndex);
        targetDate.setHours(Math.floor(clampedStartMinutes / 60), clampedStartMinutes % 60, 0, 0);
        
        const newEndTime = new Date(targetDate.getTime() + duration);

        onMove?.(id, targetDate, newEndTime, true);
      }
    };

    const handleMouseUp = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      setDragState(prev => ({ ...prev, isDragging: false }));
      window.calendarEventDragging = false;
      stopAutoScroll();
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      if (dragState.isDragging) {
        onChangeComplete?.();
      } else {
        // It was a click, not a drag
        setTimeout(() => onClick?.(e), 0);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [id, start, end, currentDate, dragState, onClick, onMove, onChangeComplete]);

  // Optimized resize handlers
  const handleResizeStart = useCallback((e, direction) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDragState(prev => ({ ...prev, isResizing: true }));
    
    const startTime = start instanceof Date ? new Date(start) : new Date(start);
    const endTime = end instanceof Date ? new Date(end) : new Date(end);
    
    const handleMouseMove = (e) => {
      const timeGrid = e.currentTarget?.closest('.time-grid') || document.querySelector('.time-grid');
      if (!timeGrid) return;
      
      const gridRect = timeGrid.getBoundingClientRect();
      const currentY = e.clientY - gridRect.top;
      const timeInHours = Math.max(0, Math.min(24, currentY / 50));
      const timeInMinutes = Math.round(timeInHours * 60 / 15) * 15;
      
      let newStartTime = new Date(startTime);
      let newEndTime = new Date(endTime);
      
      if (direction === 'top') {
        newStartTime.setHours(Math.floor(timeInMinutes / 60), timeInMinutes % 60, 0, 0);
        if (newStartTime >= endTime) {
          newStartTime = new Date(endTime.getTime() - 15 * 60 * 1000);
        }
      } else {
        newEndTime.setHours(Math.floor(timeInMinutes / 60), timeInMinutes % 60, 0, 0);
        if (newEndTime <= startTime) {
          newEndTime = new Date(startTime.getTime() + 15 * 60 * 1000);
        }
      }
      
      onResize?.(id, newStartTime, newEndTime, true);
    };
    
    const handleMouseUp = (e) => {
      setDragState(prev => ({ ...prev, isResizing: false }));
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      onChangeComplete?.();
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [id, start, end, onResize, onChangeComplete]);

  // Auto-scroll functionality
  const checkAutoScroll = useCallback((clientY) => {
    const timeSlots = document.querySelector('.time-slots');
    if (!timeSlots) return;
    
    const rect = timeSlots.getBoundingClientRect();
    const scrollThreshold = 100;
    
    if (clientY < rect.top + scrollThreshold) {
      startAutoScroll('up');
    } else if (clientY > rect.bottom - scrollThreshold) {
      startAutoScroll('down');
    } else {
      stopAutoScroll();
    }
  }, []);

  const startAutoScroll = useCallback((direction) => {
    stopAutoScroll();
    
    autoScrollIntervalRef.current = setInterval(() => {
      const timeSlots = document.querySelector('.time-slots');
      if (timeSlots) {
        const scrollAmount = direction === 'up' ? -50 : 50;
        timeSlots.scrollTop += scrollAmount;
      }
    }, 100);
  }, []);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }
  }, []);

  // Event handlers
  const handleEventClick = useCallback((e) => {
    e.stopPropagation();
    onClick?.(e);
  }, [onClick]);

  const handleEventRightClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    onRightClick?.(e);
  }, [onRightClick]);

  // Utility functions
  const hexToRgba = useCallback((hex, opacity) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return hex;
    
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }, []);

  const getContrastColor = useCallback((hexColor) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexColor);
    if (!result) return '#000000';
    
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#ffffff';
  }, []);

  const formatEventTime = useCallback((date) => {
    if (!date) return '';
    const eventDate = date instanceof Date ? date : new Date(date);
    return eventDate.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  }, []);

  // Cleanup effect
  useEffect(() => {
    return () => {
      stopAutoScroll();
    };
  }, [stopAutoScroll]);

  // Memoized content
  const eventContent = React.useMemo(() => {
    const showTime = !isMultiDay || isFirstDay;
    const startDate = start instanceof Date ? start : new Date(start);
    const endDate = end instanceof Date ? end : new Date(end);
    
    return (
      <>
        {showTime && (
          <div className="event-time">
            {formatEventTime(startDate)}
            {!isMultiDay && ` - ${formatEventTime(endDate)}`}
          </div>
        )}
        <div className="event-title">
          {title || 'Untitled Event'}
          {isRecurring && (
            <span className="recurring-indicator" title="Recurring event">
              ↻
            </span>
          )}
        </div>
        {(location || employees) && (
          <div className="event-details">
            {location && <div className="event-location">{location}</div>}
            {employees && <div className="event-employees">{employees}</div>}
          </div>
        )}
      </>
    );
  }, [start, end, title, location, employees, isRecurring, isMultiDay, isFirstDay, formatEventTime]);

  return (
    <div
      ref={eventRef}
      className={`calendar-event ${isSelected ? 'selected' : ''} ${dragState.isDragging ? 'dragging' : ''} ${dragState.isResizing ? 'resizing' : ''}`}
      style={eventStyles}
      onMouseDown={handleDragStart}
      onClick={handleEventClick}
      onContextMenu={handleEventRightClick}
      data-event-id={id}
      role="button"
      tabIndex={0}
      aria-label={`Event: ${title || 'Untitled'} from ${formatEventTime(start)} to ${formatEventTime(end)}`}
    >
      {/* Resize handles */}
      <div
        className="resize-handle resize-handle-top"
        onMouseDown={(e) => handleResizeStart(e, 'top')}
        aria-label="Resize event start time"
      />
      
      {/* Event content */}
      <div className="event-content">
        {eventContent}
      </div>
      
      <div
        className="resize-handle resize-handle-bottom"
        onMouseDown={(e) => handleResizeStart(e, 'bottom')}
        aria-label="Resize event end time"
      />
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  // Only re-render if these specific props have changed
  const propsToCompare = [
    'start', 'end', 'title', 'color', 'color1', 'isSelected',
    'isMultiDay', 'isFirstDay', 'isLastDay', 'isRecurring',
    'notes', 'location', 'employees', 'id', 'currentDayIndex',
    'weekScrollOffset'
  ];
  
  for (const prop of propsToCompare) {
    if (prevProps[prop] !== nextProps[prop]) {
      // For Date objects, compare the time values
      if (prop === 'start' || prop === 'end') {
        const prevTime = prevProps[prop] instanceof Date ? prevProps[prop].getTime() : new Date(prevProps[prop]).getTime();
        const nextTime = nextProps[prop] instanceof Date ? nextProps[prop].getTime() : new Date(nextProps[prop]).getTime();
        if (prevTime !== nextTime) {
          return false;
        }
      } else {
        return false;
      }
    }
  }
  
  // Deep compare style object if present
  if (prevProps.style !== nextProps.style) {
    if (!prevProps.style && !nextProps.style) return true;
    if (!prevProps.style || !nextProps.style) return false;
    
    const styleKeys = Object.keys(prevProps.style || {}).concat(Object.keys(nextProps.style || {}));
    for (const key of styleKeys) {
      if (prevProps.style[key] !== nextProps.style[key]) {
        return false;
      }
    }
  }
  
  return true;
});

OptimizedEvent.displayName = 'OptimizedEvent';

export default OptimizedEvent; 