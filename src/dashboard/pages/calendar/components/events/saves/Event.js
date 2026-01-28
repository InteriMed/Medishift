import React, { useState, useCallback, useRef } from 'react';
import '.././Event.css';
import { getMondayBasedDayIndex, getWeekDates, getScrollableDayIndex, getScrollableWeekDates } from '../../../utils/dateHelpers';

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
    if (scrollIntervalRef.current) {
      return; // Already scrolling
    }
    
    setScrollDirection(direction);
    const interval = setInterval(() => {
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
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
      setScrollDirection(null);
    }
  };

  const updateEventPositionAfterScroll = (scrollDirection) => {
    
    // Ensure start and end are Date objects
    const startTime = start instanceof Date ? new Date(start) : new Date(start);
    const endTime = end instanceof Date ? new Date(end) : new Date(end);
    
    if (isDragging) {
      // For dragging, move the entire event by one day
      const newStart = new Date(startTime);
      const newEnd = new Date(endTime);
      
      newStart.setDate(startTime.getDate() + scrollDirection);
      newEnd.setDate(endTime.getDate() + scrollDirection);
      
      onMove(newStart, newEnd, true);
    } else if (isResizing && resizeDirectionRef.current) {
      // For resizing, only move the end being resized
      const resizeDirection = resizeDirectionRef.current;
      
      if (resizeDirection === 'top') {
        // Resizing the start time
        const newStart = new Date(startTime);
        newStart.setDate(startTime.getDate() + scrollDirection);
        
        if (newStart < endTime) {
          onResize(newStart, end, true);
        }
      } else {
        // Resizing the end time
        const newEnd = new Date(endTime);
        newEnd.setDate(endTime.getDate() + scrollDirection);
        
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
    if (e.target.classList.contains('resize-handle-top') || 
        e.target.classList.contains('resize-handle-bottom')) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    
    window.calendarEventDragging = true;
    
    const now = Date.now();
    if (dragStartTime && (now - dragStartTime < 300)) {
      setDragStartTime(null);
      setIsDragging(false);
      window.calendarEventDragging = false;
      handleEventClick(e);
      return;
    }
    
    setDragStartTime(now);

    // Ensure start and end are Date objects
    const startTime = start instanceof Date ? new Date(start) : new Date(start);
    const endTime = end instanceof Date ? new Date(end) : new Date(end);
    const duration = endTime - startTime;
    const initialMouseY = e.clientY;
    const initialMouseX = e.clientX;
    
    // Find the time grid element safely
    const timeGrid = e.currentTarget.closest('.time-grid');
    if (!timeGrid) {
      return;
    }
    
    const gridRect = timeGrid.getBoundingClientRect();
    
    // Get the initial day index using Monday-based system
    const initialGridDayIndex = Math.floor(((e.clientX - gridRect.left) / gridRect.width) * 7);
    const initialMondayBasedDayIndex = getMondayBasedDayIndex(startTime);

    const handleMouseMove = (e) => {
      if (!isDragging) {
        setIsDragging(true);
      }

      const isDayView = timeGrid && timeGrid.style.gridTemplateColumns === '1fr';

      if (isDayView) {
        const currentY = e.clientY - gridRect.top;
        const newHour = Math.max(0, Math.min(23, currentY / 50));
        const roundedHour = Math.floor(newHour);
        const minutes = Math.floor((newHour - roundedHour) * 60);

        const newStartTime = new Date(startTime);
        newStartTime.setHours(roundedHour, minutes, 0, 0);

        const newEndTime = new Date(newStartTime);
        newEndTime.setTime(newStartTime.getTime() + duration);

        onMove(newStartTime, newEndTime, true);
      } else {
        const currentGridRect = timeGrid.getBoundingClientRect();
        const currentX = e.clientX - currentGridRect.left;
        const currentY = e.clientY - currentGridRect.top;

        const timeHeadersContainer = document.querySelector('.time-headers');
        if (timeHeadersContainer) {
          const headers = Array.from(timeHeadersContainer.querySelectorAll('div[data-date]'));
          for (const header of headers) {
            const headerRect = header.getBoundingClientRect();
            if (e.clientY >= headerRect.top && e.clientY <= headerRect.bottom &&
                e.clientX >= headerRect.left && e.clientX <= headerRect.right) {
              const dateStr = header.getAttribute('data-date');
              if (dateStr) {
                const targetDate = new Date(dateStr);
                targetDate.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
                const newEndTime = new Date(targetDate.getTime() + duration);
                onMove(targetDate, newEndTime, true);
                
                header.classList.add('drag-over');
                headers.forEach(h => {
                  if (h !== header) h.classList.remove('drag-over');
                });
                return;
              }
            }
          }
          headers.forEach(h => h.classList.remove('drag-over'));
        }
        
        const scrollThreshold = 50;
        const isOutsideLeft = currentX < scrollThreshold;
        const isOutsideRight = currentX > currentGridRect.width - scrollThreshold;
        const isCompletelyOutside = currentX < 0 || currentX > currentGridRect.width;
        
        // Auto-scroll logic: start scrolling when near edges, continue when completely outside, stop only when in safe zone
        if (isOutsideLeft && !isCompletelyOutside && scrollDirection !== -1) {
          stopAutoScroll();
          startAutoScroll(-1);
        } else if (isOutsideRight && !isCompletelyOutside && scrollDirection !== 1) {
          stopAutoScroll();
          startAutoScroll(1);
        } else if (isCompletelyOutside && currentX < 0 && scrollDirection !== -1) {
          // Mouse is completely outside on the left
          if (scrollDirection !== -1) {
            stopAutoScroll();
            startAutoScroll(-1);
          }
        } else if (isCompletelyOutside && currentX > gridRect.width && scrollDirection !== 1) {
          // Mouse is completely outside on the right
          if (scrollDirection !== 1) {
            stopAutoScroll();
            startAutoScroll(1);
          }
        } else if (!isOutsideLeft && !isOutsideRight && !isCompletelyOutside) {
          stopAutoScroll();
        }
        
        // Calculate new day index using the same scrollable system with bounds checking
        const dayFloat = (currentX / gridRect.width) * 7;
        const gridDayIndex = Math.max(0, Math.min(6, Math.floor(dayFloat)));
        const weekDates = getScrollableWeekDates(currentDate, weekScrollOffset);
        
        // Safety check for valid week dates
        if (!weekDates || weekDates.length < 7 || !weekDates[gridDayIndex]) {
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
          const timeHeadersContainer = document.querySelector('.time-headers');
          let droppedOnHeader = false;
          
          if (timeHeadersContainer) {
            const headers = Array.from(timeHeadersContainer.querySelectorAll('div[data-date]'));
            for (const header of headers) {
              const headerRect = header.getBoundingClientRect();
              if (e.clientY >= headerRect.top && e.clientY <= headerRect.bottom &&
                  e.clientX >= headerRect.left && e.clientX <= headerRect.right) {
                const dateStr = header.getAttribute('data-date');
                if (dateStr) {
                  const targetDate = new Date(dateStr);
                  targetDate.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
                  const newEndTime = new Date(targetDate.getTime() + duration);
                  onMove(targetDate, newEndTime, false);
                  droppedOnHeader = true;
                  break;
                }
              }
            }
            headers.forEach(h => h.classList.remove('drag-over'));
          }
          
          if (!droppedOnHeader) {
            const currentGridRect = timeGrid.getBoundingClientRect();
            const currentX = e.clientX - currentGridRect.left;
            const gridDayIndex = Math.floor((currentX / currentGridRect.width) * 7);
            const weekDates = getScrollableWeekDates(currentDate, weekScrollOffset);
            
            if (weekDates && gridDayIndex >= 0 && gridDayIndex < 7) {
              const targetDate = weekDates[gridDayIndex];
              const newScrollableDayIndex = getScrollableDayIndex(targetDate, weekScrollOffset);
              const hourDelta = Math.round(deltaY / 50);
              const daysDelta = newScrollableDayIndex - getScrollableDayIndex(startTime, weekScrollOffset);
              
              if (hourDelta !== 0 || daysDelta !== 0) {
                const newStart = new Date(startTime);
                const newEnd = new Date(endTime);

                newStart.setHours(startTime.getHours() + hourDelta);
                newStart.setDate(startTime.getDate() + daysDelta);
                newEnd.setTime(newStart.getTime() + duration);

                onMove(newStart, newEnd, false);
              }
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
          stopAutoScroll();
          startAutoScroll(-1);
        } else if (isOutsideRight && !isCompletelyOutside && scrollDirection !== 1) {
          stopAutoScroll();
          startAutoScroll(1);
        } else if (isCompletelyOutside && currentX < 0 && scrollDirection !== -1) {
          // Mouse is completely outside on the left
          if (scrollDirection !== -1) {
            stopAutoScroll();
            startAutoScroll(-1);
          }
        } else if (isCompletelyOutside && currentX > gridRect.width && scrollDirection !== 1) {
          // Mouse is completely outside on the right
          if (scrollDirection !== 1) {
            stopAutoScroll();
            startAutoScroll(1);
          }
        } else if (!isOutsideLeft && !isOutsideRight && !isCompletelyOutside) {
          stopAutoScroll();
        }
        
        const dayFloat = (currentX / gridRect.width) * 7;
        const newGridDayIndex = Math.max(0, Math.min(6, Math.floor(dayFloat)));

        if (newGridDayIndex >= 0 && newGridDayIndex < 7) {
          // Additional safety check for valid scrollable day index calculation
          const weekDates = getScrollableWeekDates(currentDate, weekScrollOffset);
          if (!weekDates || weekDates.length < 7 || !weekDates[newGridDayIndex]) {
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
    // Directly invoke the onClick handler for clicks
    if (onClick) {
      onClick(e);
    }
  };

  // Add a simple click handler as a fallback
  const handleSimpleClick = (e) => {
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

  const handleDragStartHTML5 = (e) => {
    const eventData = {
      id: id,
      start: start instanceof Date ? start.toISOString() : start,
      end: end instanceof Date ? end.toISOString() : end,
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
    e.dataTransfer.setDragImage(e.currentTarget, 0, 0);
    
    window.calendarEventDragging = true;
  };

  const handleDragEndHTML5 = (e) => {
    window.calendarEventDragging = false;
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
      onDragEnd={handleDragEndHTML5}
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