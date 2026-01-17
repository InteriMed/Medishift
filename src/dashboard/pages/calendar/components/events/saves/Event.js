import React, { useState, useCallback, useRef } from 'react';
import './Event.css';
import { getMondayBasedDayIndex, getWeekDates, getScrollableDayIndex, getScrollableWeekDates } from '../../utils/dateHelpers';

const Event = ({ start, end, title, color, color1, isSelected, onClick, onResize, onMove, onChangeComplete, isMultiDay, isFirstDay, isLastDay, isRecurring = false, notes, location, employees, id, style, overlapInfo, currentDate, currentDayIndex, weekScrollOffset = 0, onWeekScroll }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStartTime, setDragStartTime] = useState(null);
  const [scrollDirection, setScrollDirection] = useState(null);
  const autoScrollTimeoutRef = useRef(null);
  const scrollIntervalRef = useRef(null);
  const resizeDirectionRef = useRef(null);

  // Helper functions for auto-scroll
  const startAutoScroll = (direction) => {
    console.log('startAutoScroll called with direction:', direction, 'current scrollInterval:', scrollIntervalRef.current);
    if (scrollIntervalRef.current) {
      console.log('Already scrolling, returning early');
      return; // Already scrolling
    }
    
    console.log('Setting up new scroll interval');
    setScrollDirection(direction);
    const interval = setInterval(() => {
      console.log('Auto-scroll tick, direction:', direction);
      if (onWeekScroll) {
        onWeekScroll(direction, true);
        
        // Update event position after scroll to follow the grid
        if (isDragging || isResizing) {
          updateEventPositionAfterScroll(direction);
        }
      }
    }, 500); // Scroll every 0.5 seconds
    
    scrollIntervalRef.current = interval;
  };

  const stopAutoScroll = () => {
    console.log('stopAutoScroll called, current scrollInterval:', scrollIntervalRef.current);
    if (scrollIntervalRef.current) {
      console.log('Clearing scroll interval');
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
      setScrollDirection(null);
    } else {
      console.log('No scroll interval to clear');
    }
  };

  const updateEventPositionAfterScroll = (scrollDirection) => {
    console.log('Updating event position after scroll, direction:', scrollDirection);
    
    // Ensure start and end are Date objects
    const startTime = start instanceof Date ? new Date(start) : new Date(start);
    const endTime = end instanceof Date ? new Date(end) : new Date(end);
    
    if (isDragging) {
      // For dragging, move the entire event by one day
      const newStart = new Date(startTime);
      const newEnd = new Date(endTime);
      
      newStart.setDate(startTime.getDate() + scrollDirection);
      newEnd.setDate(endTime.getDate() + scrollDirection);
      
      console.log('Moving dragged event:', { 
        oldStart: startTime, 
        newStart, 
        oldEnd: endTime, 
        newEnd 
      });
      
      onMove(newStart, newEnd, true);
    } else if (isResizing && resizeDirectionRef.current) {
      // For resizing, only move the end being resized
      const resizeDirection = resizeDirectionRef.current;
      
      if (resizeDirection === 'top') {
        // Resizing the start time
        const newStart = new Date(startTime);
        newStart.setDate(startTime.getDate() + scrollDirection);
        
        console.log('Moving resize start date:', { 
          oldStart: startTime, 
          newStart, 
          end: endTime 
        });
        
        if (newStart < endTime) {
          onResize(newStart, end, true);
        }
      } else {
        // Resizing the end time
        const newEnd = new Date(endTime);
        newEnd.setDate(endTime.getDate() + scrollDirection);
        
        console.log('Moving resize end date:', { 
          start: startTime, 
          oldEnd: endTime, 
          newEnd 
        });
        
        if (newEnd > startTime) {
          onResize(start, newEnd, true);
        }
      }
    }
  };

  const calculatePosition = () => {
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
      // Day view: events should take full width (fallback if no style prop)
      let hour, duration;
      
      if (isMultiDay) {
        // For multiday events, calculate the visible portion for this day
        if (isFirstDay) {
          hour = startDate.getHours() + startDate.getMinutes() / 60;
          duration = 24 - hour; // From start time to end of day
        } else if (isLastDay) {
          hour = 0; // Start of day
          duration = endDate.getHours() + endDate.getMinutes() / 60; // To end time
        } else {
          hour = 0; // Full day
          duration = 24;
        }
      } else {
        hour = startDate.getHours() + startDate.getMinutes() / 60;
        duration = (endDate.getHours() + endDate.getMinutes() / 60) - hour;
      }

      const top = hour * 50;
      const height = duration * 50;

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
        // For multiday events, use the current day index to determine position
        const currentDay = new Date(startDate);
        currentDay.setDate(startDate.getDate() + currentDayIndex);
        dayIndex = getScrollableDayIndex(currentDay, weekScrollOffset);
        
        // Calculate the visible portion for this day
        if (isFirstDay) {
          hour = startDate.getHours() + startDate.getMinutes() / 60;
          duration = 24 - hour; // From start time to end of day
        } else if (isLastDay) {
          hour = 0; // Start of day
          duration = endDate.getHours() + endDate.getMinutes() / 60; // To end time
        } else {
          hour = 0; // Full day
          duration = 24;
        }
      } else {
        // Single day event or fallback
        dayIndex = getScrollableDayIndex(startDate, weekScrollOffset);
        hour = startDate.getHours() + startDate.getMinutes() / 60;
        duration = (endDate.getHours() + endDate.getMinutes() / 60) - hour;
      }

      const top = hour * 50;
      const height = duration * 50;
      const left = dayWidth * dayIndex;
      const width = dayWidth;

      return {
        top: `${top}px`,
        height: `${height}px`,
        left: `${left}%`,
        width: `${width}%`
      };
    }
  };

  const handleDragStart = (e) => {
    console.log('Drag start event:', e);
    e.preventDefault();
    e.stopPropagation();
    
    // Set a global flag to indicate dragging is happening
    window.calendarEventDragging = true;
    
    // Check if this is a double-click
    const now = Date.now();
    if (dragStartTime && (now - dragStartTime < 300)) {
      // It's a double click, clear drag state and trigger click event
      setDragStartTime(null);
      setIsDragging(false);
      window.calendarEventDragging = false;
      handleEventClick(e);
      return;
    }
    
    // Save click time for double-click detection
    setDragStartTime(now);
    
    if (e.target.classList.contains('resize-handle-top') || 
        e.target.classList.contains('resize-handle-bottom')) {
      return;
    }

    // Ensure start and end are Date objects
    const startTime = start instanceof Date ? new Date(start) : new Date(start);
    const endTime = end instanceof Date ? new Date(end) : new Date(end);
    const duration = endTime - startTime;
    const initialMouseY = e.clientY;
    const initialMouseX = e.clientX;
    
    // Find the time grid element safely
    const timeGrid = e.currentTarget.closest('.time-grid');
    if (!timeGrid) {
      console.warn('Time grid element not found. Aborting drag operation.');
      return;
    }
    
    const gridRect = timeGrid.getBoundingClientRect();
    
    // Get the initial day index using Monday-based system
    const initialGridDayIndex = Math.floor(((e.clientX - gridRect.left) / gridRect.width) * 7);
    const initialMondayBasedDayIndex = getMondayBasedDayIndex(startTime);

    const handleMouseMove = (e) => {
      // Start dragging if we haven't already
      if (!isDragging) {
        setIsDragging(true);
      }

      // Check if we're in day view
      const isDayView = timeGrid && timeGrid.style.gridTemplateColumns === '1fr';

      if (isDayView) {
        // Day view: only allow time changes, no day changes
        const currentY = e.clientY - gridRect.top;
        const newHour = Math.max(0, Math.min(23, currentY / 50));
        const roundedHour = Math.floor(newHour);
        const minutes = Math.floor((newHour - roundedHour) * 60);

        // Calculate new start and end times (same day, different time)
        const newStartTime = new Date(startTime);
        newStartTime.setHours(roundedHour, minutes, 0, 0);

        const newEndTime = new Date(newStartTime);
        newEndTime.setTime(newStartTime.getTime() + duration);

        onMove(newStartTime, newEndTime, true);
      } else {
        // Week view: allow both day and time changes
        const gridRect = timeGrid.getBoundingClientRect();
        const currentX = e.clientX - gridRect.left;
        const currentY = e.clientY - gridRect.top;
        
        // Check if mouse is outside grid boundaries for auto-scroll
        const scrollThreshold = 50; // pixels from edge
        const isOutsideLeft = currentX < scrollThreshold;
        const isOutsideRight = currentX > gridRect.width - scrollThreshold;
        const isCompletelyOutside = currentX < 0 || currentX > gridRect.width;
        
        // Auto-scroll logic: start scrolling when near edges, continue when completely outside, stop only when in safe zone
        if (isOutsideLeft && !isCompletelyOutside && scrollDirection !== -1) {
          console.log('Starting auto-scroll LEFT');
          stopAutoScroll();
          startAutoScroll(-1);
        } else if (isOutsideRight && !isCompletelyOutside && scrollDirection !== 1) {
          console.log('Starting auto-scroll RIGHT');
          stopAutoScroll();
          startAutoScroll(1);
        } else if (isCompletelyOutside && currentX < 0 && scrollDirection !== -1) {
          // Mouse is completely outside on the left
          console.log('Continuing/Starting auto-scroll LEFT (completely outside)');
          if (scrollDirection !== -1) {
            stopAutoScroll();
            startAutoScroll(-1);
          }
        } else if (isCompletelyOutside && currentX > gridRect.width && scrollDirection !== 1) {
          // Mouse is completely outside on the right
          console.log('Continuing/Starting auto-scroll RIGHT (completely outside)');
          if (scrollDirection !== 1) {
            stopAutoScroll();
            startAutoScroll(1);
          }
        } else if (!isOutsideLeft && !isOutsideRight && !isCompletelyOutside) {
          console.log('Stopping auto-scroll - mouse in safe zone');
          stopAutoScroll();
        }
        
        // Calculate new day index using the same scrollable system with bounds checking
        const dayFloat = (currentX / gridRect.width) * 7;
        const gridDayIndex = Math.max(0, Math.min(6, Math.floor(dayFloat)));
        const weekDates = getScrollableWeekDates(currentDate, weekScrollOffset);
        
        // Safety check for valid week dates
        if (!weekDates || weekDates.length < 7 || !weekDates[gridDayIndex]) {
          console.warn('Invalid week dates or day index in Event drag', { weekDates, gridDayIndex });
          return; // Exit early if we don't have valid dates
        }
        
        const targetDate = weekDates[gridDayIndex];
        
        // Calculate new time based on mouse position
        const newHour = Math.max(0, Math.min(23, currentY / 50));
        const roundedHour = Math.floor(newHour);
        const minutes = Math.floor((newHour - roundedHour) * 60);

        // Calculate new start and end times, maintaining the event's duration
        const newStartTime = new Date(targetDate);
        newStartTime.setHours(roundedHour, minutes, 0, 0);

        const newEndTime = new Date(newStartTime);
        newEndTime.setTime(newStartTime.getTime() + duration);

        onMove(newStartTime, newEndTime, true);
      }
    };

    const handleMouseUp = (e) => {
      console.log('Mouse up event:', e);
      e.preventDefault();
      e.stopPropagation();
      
      // Clear the global dragging flag
      window.calendarEventDragging = false;
      
      // Stop auto-scroll when drag ends
      stopAutoScroll();
      
      const deltaY = e.clientY - initialMouseY;
      const deltaX = e.clientX - initialMouseX;
      
      // If no movement or very small movement, treat as click
      if (!isDragging && Math.abs(deltaY) <= 3 && Math.abs(deltaX) <= 3) {
        console.log('Detected click (no drag movement)');
        handleEventClick(e);
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        return;
      }
      
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // Only proceed if there was actual movement
      if (Math.abs(deltaY) >= 5 || Math.abs(deltaX) >= 5) {
        // Check if we're in day view
        const isDayView = timeGrid && timeGrid.style.gridTemplateColumns === '1fr';
        
        if (isDayView) {
          // Day view: only time changes
          const hourDelta = Math.round(deltaY / 50);
          
          if (hourDelta !== 0) {
            const newStart = new Date(startTime);
            const newEnd = new Date(endTime);

            // Simple hour adjustment
            newStart.setHours(startTime.getHours() + hourDelta);
            newEnd.setTime(newStart.getTime() + duration);

            onMove(newStart, newEnd, false);
          }
        } else {
          // Week view: use scrollable system for consistency
          const currentX = e.clientX - gridRect.left;
          const gridDayIndex = Math.floor((currentX / gridRect.width) * 7);
          const weekDates = getScrollableWeekDates(currentDate, weekScrollOffset);
          const targetDate = weekDates[gridDayIndex];
          const newScrollableDayIndex = getScrollableDayIndex(targetDate, weekScrollOffset);
          const hourDelta = Math.round(deltaY / 50);
          
          if (gridDayIndex >= 0 && gridDayIndex < 7) {
            const daysDelta = newScrollableDayIndex - getScrollableDayIndex(startTime, weekScrollOffset);
            
            if (hourDelta !== 0 || daysDelta !== 0) {
              const newStart = new Date(startTime);
              const newEnd = new Date(endTime);

              // Apply adjustments
              newStart.setHours(startTime.getHours() + hourDelta);
              newStart.setDate(startTime.getDate() + daysDelta);
              newEnd.setTime(newStart.getTime() + duration);

              onMove(newStart, newEnd, false);
            }
          }
        }
      }
      
      if (onChangeComplete) {
        onChangeComplete();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleResizeStart = (e, direction) => {
    console.log(`Resize start event (${direction}):`, e);
    e.preventDefault();
    e.stopPropagation();
    
    // Set a global flag to indicate resizing is happening
    window.calendarEventDragging = true;
    
    // Track resize direction for auto-scroll updates
    resizeDirectionRef.current = direction;
    
    // Ensure start and end are Date objects
    const startTime = start instanceof Date ? new Date(start) : new Date(start);
    const endTime = end instanceof Date ? new Date(end) : new Date(end);
    const initialMouseY = e.clientY;
    const initialMouseX = e.clientX;
    const timeGrid = e.currentTarget.closest('.time-grid');
    const gridRect = timeGrid.getBoundingClientRect();
    
    // Use the appropriate date for initial day index calculation
    const referenceDate = direction === 'top' ? startTime : endTime;
    const initialScrollableDayIndex = getScrollableDayIndex(referenceDate, weekScrollOffset);

    const handleMouseMove = (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Add grid mouse enter/leave listeners when resizing starts
      if (!isResizing) {
        setIsResizing(true);
      }

      const deltaY = e.clientY - initialMouseY;
      const hourDelta = Math.round(deltaY / 50);

      // Check if we're in day view
      const isDayView = timeGrid && timeGrid.style.gridTemplateColumns === '1fr';

      if (isDayView) {
        // Day view: only allow time changes, no day changes
        if (direction === 'top') {
          const newStart = new Date(startTime);
          newStart.setHours(startTime.getHours() + hourDelta);
          
          if (newStart < endTime) {
            onResize(newStart, end, true);
          }
        } else {
          const newEnd = new Date(endTime);
          newEnd.setHours(endTime.getHours() + hourDelta);
          
          if (newEnd > startTime) {
            onResize(start, newEnd, true);
          }
        }
      } else {
        // Week view: allow both day and time changes
        const currentX = e.clientX - gridRect.left;
        
        // Check if mouse is outside grid boundaries for auto-scroll
        const scrollThreshold = 50; // pixels from edge
        const isOutsideLeft = currentX < scrollThreshold;
        const isOutsideRight = currentX > gridRect.width - scrollThreshold;
        const isCompletelyOutside = currentX < 0 || currentX > gridRect.width;
        
        // Auto-scroll logic: start scrolling when near edges, continue when completely outside, stop only when in safe zone
        if (isOutsideLeft && !isCompletelyOutside && scrollDirection !== -1) {
          console.log('Starting auto-scroll LEFT');
          stopAutoScroll();
          startAutoScroll(-1);
        } else if (isOutsideRight && !isCompletelyOutside && scrollDirection !== 1) {
          console.log('Starting auto-scroll RIGHT');
          stopAutoScroll();
          startAutoScroll(1);
        } else if (isCompletelyOutside && currentX < 0 && scrollDirection !== -1) {
          // Mouse is completely outside on the left
          console.log('Continuing/Starting auto-scroll LEFT (completely outside)');
          if (scrollDirection !== -1) {
            stopAutoScroll();
            startAutoScroll(-1);
          }
        } else if (isCompletelyOutside && currentX > gridRect.width && scrollDirection !== 1) {
          // Mouse is completely outside on the right
          console.log('Continuing/Starting auto-scroll RIGHT (completely outside)');
          if (scrollDirection !== 1) {
            stopAutoScroll();
            startAutoScroll(1);
          }
        } else if (!isOutsideLeft && !isOutsideRight && !isCompletelyOutside) {
          console.log('Stopping auto-scroll - mouse in safe zone');
          stopAutoScroll();
        }
        
        const dayFloat = (currentX / gridRect.width) * 7;
        const newGridDayIndex = Math.max(0, Math.min(6, Math.floor(dayFloat)));

        if (newGridDayIndex >= 0 && newGridDayIndex < 7) {
          // Additional safety check for valid scrollable day index calculation
          const weekDates = getScrollableWeekDates(currentDate, weekScrollOffset);
          if (!weekDates || weekDates.length < 7 || !weekDates[newGridDayIndex]) {
            console.warn('Invalid week dates in resize operation', { weekDates, newGridDayIndex });
            return; // Exit early if we don't have valid dates
          }
          
          // Calculate day delta from the current scrollable position
          const targetDate = weekDates[newGridDayIndex];
          const newScrollableDayIndex = getScrollableDayIndex(targetDate, weekScrollOffset);
          const daysDelta = newScrollableDayIndex - initialScrollableDayIndex;
          
          if (direction === 'top') {
            const newStart = new Date(startTime);
            newStart.setHours(startTime.getHours() + hourDelta);
            newStart.setDate(startTime.getDate() + daysDelta);
            
            if (newStart < endTime) {
              onResize(newStart, end, true);
            }
          } else {
            const newEnd = new Date(endTime);
            newEnd.setHours(endTime.getHours() + hourDelta);
            newEnd.setDate(endTime.getDate() + daysDelta);
            
            if (newEnd > startTime) {
              onResize(start, newEnd, true);
            }
          }
        }
      }
    };

    const handleMouseUp = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Clear the global dragging flag
      window.calendarEventDragging = false;
      
      // Stop auto-scroll when resize ends
      stopAutoScroll();
      
      const deltaY = e.clientY - initialMouseY;
      const hourDelta = Math.round(deltaY / 50);
      
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // Check if we're in day view
      const isDayView = timeGrid && timeGrid.style.gridTemplateColumns === '1fr';

      if (isDayView) {
        // Day view: only allow time changes, no day changes
        if (Math.abs(hourDelta) > 0) {
          if (direction === 'top') {
            const newStart = new Date(startTime);
            newStart.setHours(startTime.getHours() + hourDelta);
            
            if (newStart < endTime) {
              onResize(newStart, end, false);
            }
          } else {
            const newEnd = new Date(endTime);
            newEnd.setHours(endTime.getHours() + hourDelta);
            
            if (newEnd > startTime) {
              onResize(start, newEnd, false);
            }
          }
        }
      } else {
        // Week view: allow both day and time changes
        const currentX = e.clientX - gridRect.left;
        const newGridDayIndex = Math.floor((currentX / gridRect.width) * 7);
        
        if (Math.abs(hourDelta) > 0 || Math.abs(newGridDayIndex - initialScrollableDayIndex) > 0) {
          if (newGridDayIndex >= 0 && newGridDayIndex < 7) {
            // Additional safety check for valid scrollable day index calculation
            const weekDates = getScrollableWeekDates(currentDate, weekScrollOffset);
            if (!weekDates || weekDates.length < 7 || !weekDates[newGridDayIndex]) {
              console.warn('Invalid week dates in resize mouseup', { weekDates, newGridDayIndex });
              onChangeComplete();
              return; // Exit early if we don't have valid dates
            }
            
            const daysDelta = newGridDayIndex - initialScrollableDayIndex;
            
            if (direction === 'top') {
              const newStart = new Date(startTime);
              newStart.setHours(startTime.getHours() + hourDelta);
              newStart.setDate(startTime.getDate() + daysDelta);
              
              if (newStart < endTime) {
                onResize(newStart, end, false);
              }
            } else {
              const newEnd = new Date(endTime);
              newEnd.setHours(endTime.getHours() + hourDelta);
              newEnd.setDate(endTime.getDate() + daysDelta);
              
              if (newEnd > startTime) {
                onResize(start, newEnd, false);
              }
            }
          }
        }
      }
      
      onChangeComplete();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleEventClick = (e) => {
    console.log('Event clicked directly:', e);
    // Directly invoke the onClick handler for clicks
    if (onClick) {
      onClick(e);
    }
  };

  // Add a simple click handler as a fallback
  const handleSimpleClick = (e) => {
    console.log('Simple click handler triggered:', e);
    // Only handle if we're not in a drag operation
    if (!window.calendarEventDragging && !isDragging && !isResizing) {
      e.stopPropagation();
      handleEventClick(e);
    }
  };

  const formatEventTime = (date) => {
    // Ensure date is a Date object
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).toLowerCase();
  };

  const position = calculatePosition();
  
  const hexToRgba = (hex, opacity) => {
    if (!hex) return `rgba(0, 0, 0, ${opacity})`;
    
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    let shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => {
      return r + r + g + g + b + b;
    });
    
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return `rgba(0, 0, 0, ${opacity})`;
    
    let r = parseInt(result[1], 16);
    let g = parseInt(result[2], 16);
    let b = parseInt(result[3], 16);
    
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  // Apply styles based on state
  const eventStyle = {
    ...position,
    backgroundColor: hexToRgba(color1, 0.5),
    borderLeft: `3px solid ${color || '#333'}`,
    position: 'absolute',
    cursor: isDragging ? 'grabbing' : 'grab'
  };

  // Compose class names
  let className = `calendar-event ${isSelected ? 'selected' : ''}`;
  if (isMultiDay) className += ' multi-day';
  if (isDragging) className += ' dragging';
  if (isResizing) className += ' resizing';
  if (overlapInfo && overlapInfo.totalColumns > 1) className += ' overlapping';

  // Handle drag start for cross-day dragging in day view
  const handleDragStartHTML5 = (e) => {
    // Check if we're in day view
    const timeGrid = document.querySelector('.time-grid');
    const isDayView = timeGrid && timeGrid.style.gridTemplateColumns === '1fr';
    
    if (isDayView) {
      // Set drag data for cross-day dragging
      const eventData = {
        id: id,
        start: start,
        end: end,
        title: title,
        color: color,
        color1: color1,
        isRecurring: isRecurring,
        notes: notes,
        location: location,
        employees: employees
      };
      
      e.dataTransfer.setData('text/plain', JSON.stringify(eventData));
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  return (
    <div
      className={className}
      style={eventStyle}
      onClick={handleSimpleClick}
      onMouseDown={handleDragStart}
      onDoubleClick={(e) => e.preventDefault()}
      draggable={true}
      onDragStart={handleDragStartHTML5}
    >
      {isRecurring && (
        <div className="recurring-indicator">
          <i className="fas fa-redo-alt" style={{ color }}></i>
        </div>
      )}
      {/* Top resize handle - only show on first day of multiday events or single day events */}
      {(!isMultiDay || isFirstDay) && (
        <div 
          className="resize-handle-top"
          onMouseDown={(e) => handleResizeStart(e, 'top')}
        />
      )}
      <div className="event-content">
        <div className="event-title" style={{ color }}>{title || 'New Event'}</div>
        <div className="event-time" style={{ color }}>
          {formatEventTime(start instanceof Date ? start : new Date(start))} - 
          {formatEventTime(end instanceof Date ? end : new Date(end))}
        </div>
        {location && <div className="event-location" style={{ color }}>📍 {location}</div>}
        {employees && <div className="event-employees" style={{ color }}>👥 {employees}</div>}
        {notes && <div className="event-notes" style={{ color }}>{notes}</div>}
      </div>
      {/* Bottom resize handle - only show on last day of multiday events or single day events */}
      {(!isMultiDay || isLastDay) && (
        <div 
          className="resize-handle-bottom"
          onMouseDown={(e) => handleResizeStart(e, 'bottom')}
        />
      )}
    </div>
  );
};

export default Event; 