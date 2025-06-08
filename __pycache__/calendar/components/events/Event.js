import React, { useState, useCallback, useRef, useEffect } from 'react';
import './Event.css';
import { getMondayBasedDayIndex, getWeekDates, getScrollableDayIndex, getScrollableWeekDates } from '../../utils/dateHelpers';

const Event = ({ start, end, title, color, color1, isSelected, onClick, onRightClick, onResize, onMove, onChangeComplete, isMultiDay, isFirstDay, isLastDay, isRecurring = false, notes, location, employees, id, style, overlapInfo, currentDate, currentDayIndex, weekScrollOffset = 0 }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStartTime, setDragStartTime] = useState(null);
  const [autoScrollInterval, setAutoScrollInterval] = useState(null);

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
    // Only handle left-click (button 0), ignore right-click (button 2)
    if (e.button !== 0) {
      return;
    }
    
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
    
    // Calculate the relative position where the mouse grabbed the event
    const eventRect = e.currentTarget.getBoundingClientRect();
    const relativeY = e.clientY - eventRect.top; // How far down in the event the mouse is
    const relativeX = e.clientX - eventRect.left; // How far right in the event the mouse is
    
    // Convert relative position to time offset (in minutes)
    const eventHeightInPixels = eventRect.height;
    const eventDurationInMinutes = duration / (1000 * 60); // Convert milliseconds to minutes
    const timeOffsetInMinutes = (relativeY / eventHeightInPixels) * eventDurationInMinutes;
    
    // Get the initial day index using Monday-based system
    const initialGridDayIndex = Math.floor(((e.clientX - gridRect.left) / gridRect.width) * 7);
    const initialMondayBasedDayIndex = getMondayBasedDayIndex(startTime);

    const handleMouseMove = (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Check for auto-scroll when dragging
      checkAutoScroll(e.clientY);

      if (!isDragging) {
        setIsDragging(true);
      }

      // Check if we're in day view
      const timeGrid = document.querySelector('.time-grid');
      const isDayView = timeGrid && timeGrid.style.gridTemplateColumns === '1fr';

      if (isDayView) {
        // Day view: only allow time changes, no day changes
        const currentY = e.clientY - gridRect.top;
        
        // Calculate the time where the mouse should be (accounting for the grab offset)
        const mouseTimeInHours = Math.max(0, Math.min(24, currentY / 50));
        const mouseTimeInMinutes = mouseTimeInHours * 60;
        
        // Subtract the offset to get where the event start should be
        const eventStartTimeInMinutes = mouseTimeInMinutes - timeOffsetInMinutes;
        
        // Round to nearest 15-minute increment
        const roundedStartMinutes = Math.round(eventStartTimeInMinutes / 15) * 15;
        const clampedStartMinutes = Math.max(0, Math.min(24 * 60 - eventDurationInMinutes, roundedStartMinutes));
        
        // Calculate new start and end times
        const newStartTime = new Date(startTime);
        newStartTime.setHours(Math.floor(clampedStartMinutes / 60), clampedStartMinutes % 60, 0, 0);

        const newEndTime = new Date(newStartTime);
        newEndTime.setTime(newStartTime.getTime() + duration);

        onMove(newStartTime, newEndTime, true);
      } else {
        // Week view: allow both day and time changes
        const gridRect = timeGrid.getBoundingClientRect();
        const currentX = e.clientX - gridRect.left;
        const currentY = e.clientY - gridRect.top;
        
        // Calculate new day index using the same scrollable system with bounds checking
        const dayFloat = (currentX / gridRect.width) * 7;
        const gridDayIndex = Math.max(0, Math.min(6, Math.floor(dayFloat)));
        const weekDates = getScrollableWeekDates(currentDate, weekScrollOffset);
        
        // Safety check for valid week dates and grid day index
        if (!weekDates || weekDates.length < 7 || gridDayIndex < 0 || gridDayIndex >= 7 || !weekDates[gridDayIndex]) {
          console.warn('Invalid week dates or day index in Event mouseup', { weekDates, gridDayIndex });
          onChangeComplete();
          return; // Exit early if we don't have valid dates
        }
        
        const targetDate = weekDates[gridDayIndex];
        
        // Additional safety check for targetDate
        if (!targetDate) {
          console.warn('Target date is undefined in Event mouseup');
          onChangeComplete();
          return;
        }
        
        const newScrollableDayIndex = getScrollableDayIndex(targetDate, weekScrollOffset);
        
        // For multi-day events, calculate the time delta from the original position
        if (isMultiDay) {
          // Calculate the original day and time position
          const originalDayIndex = getScrollableDayIndex(startTime, weekScrollOffset);
          const originalTimeInMinutes = startTime.getHours() * 60 + startTime.getMinutes();
          
          // Calculate current mouse position in terms of day and time
          const mouseTimeInHours = Math.max(0, Math.min(24, currentY / 50));
          const mouseTimeInMinutes = mouseTimeInHours * 60;
          
          // Calculate the total time delta in minutes (including day changes)
          const daysDelta = gridDayIndex - originalDayIndex;
          const timeDelta = (daysDelta * 24 * 60) + (mouseTimeInMinutes - timeOffsetInMinutes - originalTimeInMinutes);
          
          // Round to nearest 15-minute increment
          const roundedTimeDelta = Math.round(timeDelta / 15) * 15;
          
          // Apply the time delta to both start and end times
          const newStartTime = new Date(startTime);
          newStartTime.setTime(startTime.getTime() + (roundedTimeDelta * 60 * 1000));
          
          const newEndTime = new Date(endTime);
          newEndTime.setTime(endTime.getTime() + (roundedTimeDelta * 60 * 1000));
          
          onMove(newStartTime, newEndTime, true);
        } else {
          // Single day event: use original logic
          // Calculate the time where the mouse should be (accounting for the grab offset)
          const mouseTimeInHours = Math.max(0, Math.min(24, currentY / 50));
          const mouseTimeInMinutes = mouseTimeInHours * 60;
          
          // Subtract the offset to get where the event start should be
          const eventStartTimeInMinutes = mouseTimeInMinutes - timeOffsetInMinutes;
          
          // Round to nearest 15-minute increment
          const roundedStartMinutes = Math.round(eventStartTimeInMinutes / 15) * 15;
          const clampedStartMinutes = Math.max(0, Math.min(24 * 60 - eventDurationInMinutes, roundedStartMinutes));

          // Calculate new start and end times, maintaining the event's duration
          const newStartTime = new Date(targetDate);
          newStartTime.setHours(Math.floor(clampedStartMinutes / 60), clampedStartMinutes % 60, 0, 0);

          const newEndTime = new Date(newStartTime);
          newEndTime.setTime(newStartTime.getTime() + duration);

          onMove(newStartTime, newEndTime, true);
        }
      }
    };

    const handleMouseUp = (e) => {
      console.log('Mouse up event:', e);
      e.preventDefault();
      e.stopPropagation();
      
      // Clear the global dragging flag
      window.calendarEventDragging = false;
      
      // Stop auto-scrolling
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
        const timeGrid = document.querySelector('.time-grid');
        const isDayView = timeGrid && timeGrid.style.gridTemplateColumns === '1fr';
        
        if (isDayView) {
          // Day view: only time changes
          const currentY = e.clientY - gridRect.top;
          
          // Calculate the time where the mouse should be (accounting for the grab offset)
          const mouseTimeInHours = Math.max(0, Math.min(24, currentY / 50));
          const mouseTimeInMinutes = mouseTimeInHours * 60;
          
          // Subtract the offset to get where the event start should be
          const eventStartTimeInMinutes = mouseTimeInMinutes - timeOffsetInMinutes;
          
          // Round to nearest 15-minute increment
          const roundedStartMinutes = Math.round(eventStartTimeInMinutes / 15) * 15;
          const clampedStartMinutes = Math.max(0, Math.min(24 * 60 - eventDurationInMinutes, roundedStartMinutes));
          
          // Check if there was a meaningful change (at least 15 minutes)
          const originalStartMinutes = startTime.getHours() * 60 + startTime.getMinutes();
          if (Math.abs(clampedStartMinutes - originalStartMinutes) >= 15) {
            const newStart = new Date(startTime);
            const newEnd = new Date(endTime);

            newStart.setHours(Math.floor(clampedStartMinutes / 60), clampedStartMinutes % 60, 0, 0);
            newEnd.setTime(newStart.getTime() + duration);

            onMove(newStart, newEnd, false);
          }
        } else {
          // Week view: use scrollable system for consistency
          const currentX = e.clientX - gridRect.left;
          const currentY = e.clientY - gridRect.top;
          const gridDayIndex = Math.floor((currentX / gridRect.width) * 7);
          const weekDates = getScrollableWeekDates(currentDate, weekScrollOffset);
          const targetDate = weekDates[gridDayIndex];
          const newScrollableDayIndex = getScrollableDayIndex(targetDate, weekScrollOffset);
          
          if (gridDayIndex >= 0 && gridDayIndex < 7) {
            // For multi-day events, calculate the time delta from the original position
            if (isMultiDay) {
              // Calculate the original day and time position
              const originalDayIndex = getScrollableDayIndex(startTime, weekScrollOffset);
              const originalTimeInMinutes = startTime.getHours() * 60 + startTime.getMinutes();
              
              // Calculate current mouse position in terms of day and time
              const mouseTimeInHours = Math.max(0, Math.min(24, currentY / 50));
              const mouseTimeInMinutes = mouseTimeInHours * 60;
              
              // Calculate the total time delta in minutes (including day changes)
              const daysDelta = gridDayIndex - originalDayIndex;
              const timeDelta = (daysDelta * 24 * 60) + (mouseTimeInMinutes - timeOffsetInMinutes - originalTimeInMinutes);
              
              // Round to nearest 15-minute increment
              const roundedTimeDelta = Math.round(timeDelta / 15) * 15;
              
              // Check if there was a meaningful change (at least 15 minutes or day change)
              if (Math.abs(roundedTimeDelta) >= 15) {
                // Apply the time delta to both start and end times
                const newStart = new Date(startTime);
                newStart.setTime(startTime.getTime() + (roundedTimeDelta * 60 * 1000));
                
                const newEnd = new Date(endTime);
                newEnd.setTime(endTime.getTime() + (roundedTimeDelta * 60 * 1000));
                
                onMove(newStart, newEnd, false);
              }
            } else {
              // Single day event: use original logic
              const daysDelta = gridDayIndex - getScrollableDayIndex(startTime, weekScrollOffset);
              
              // Calculate the time where the mouse should be (accounting for the grab offset)
              const mouseTimeInHours = Math.max(0, Math.min(24, currentY / 50));
              const mouseTimeInMinutes = mouseTimeInHours * 60;
              
              // Subtract the offset to get where the event start should be
              const eventStartTimeInMinutes = mouseTimeInMinutes - timeOffsetInMinutes;
              
              // Round to nearest 15-minute increment
              const roundedStartMinutes = Math.round(eventStartTimeInMinutes / 15) * 15;
              const clampedStartMinutes = Math.max(0, Math.min(24 * 60 - eventDurationInMinutes, roundedStartMinutes));
              
              // Check if there was a meaningful change (at least 15 minutes or day change)
              const originalStartMinutes = startTime.getHours() * 60 + startTime.getMinutes();
              if (Math.abs(clampedStartMinutes - originalStartMinutes) >= 15 || daysDelta !== 0) {
                const newStart = new Date(targetDate);
                newStart.setHours(Math.floor(clampedStartMinutes / 60), clampedStartMinutes % 60, 0, 0);

                const newEnd = new Date(newStart);
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
    // Only handle left-click (button 0), ignore right-click (button 2)
    if (e.button !== 0) {
      return;
    }
    
    console.log(`Resize start event (${direction}):`, e);
    e.preventDefault();
    e.stopPropagation();
    
    // Set a global flag to indicate resizing is happening
    window.calendarEventDragging = true;
    
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

      // Check for auto-scroll when resizing
      checkAutoScroll(e.clientY);

      if (!isResizing) {
        setIsResizing(true);
      }

      const currentY = e.clientY - gridRect.top;
      
      // Calculate time in minutes from the top of the grid
      const mouseTimeInHours = Math.max(0, Math.min(24, currentY / 50));
      const mouseTimeInMinutes = mouseTimeInHours * 60;
      
      // Round to nearest 15-minute increment
      const roundedTimeInMinutes = Math.round(mouseTimeInMinutes / 15) * 15;

      // Check if we're in day view
      const timeGrid = document.querySelector('.time-grid');
      const isDayView = timeGrid && timeGrid.style.gridTemplateColumns === '1fr';

      if (isDayView) {
        // Day view: only allow time changes, no day changes
        if (direction === 'top') {
          const newStart = new Date(startTime);
          newStart.setHours(Math.floor(roundedTimeInMinutes / 60), roundedTimeInMinutes % 60, 0, 0);
          
          if (newStart < endTime) {
            onResize(newStart, end, true);
          }
        } else {
          const newEnd = new Date(endTime);
          newEnd.setHours(Math.floor(roundedTimeInMinutes / 60), roundedTimeInMinutes % 60, 0, 0);
          
          if (newEnd > startTime) {
            onResize(start, newEnd, true);
          }
        }
      } else {
        // Week view: allow both day and time changes
        const currentX = e.clientX - gridRect.left;
        
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
            newStart.setHours(Math.floor(roundedTimeInMinutes / 60), roundedTimeInMinutes % 60, 0, 0);
            newStart.setDate(startTime.getDate() + daysDelta);
            
            if (newStart < endTime) {
              onResize(newStart, end, true);
            }
          } else {
            const newEnd = new Date(endTime);
            newEnd.setHours(Math.floor(roundedTimeInMinutes / 60), roundedTimeInMinutes % 60, 0, 0);
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
      
      // Stop auto-scrolling
      stopAutoScroll();
      
      const currentY = e.clientY - gridRect.top;
      
      // Calculate time in minutes from the top of the grid
      const mouseTimeInHours = Math.max(0, Math.min(24, currentY / 50));
      const mouseTimeInMinutes = mouseTimeInHours * 60;
      
      // Round to nearest 15-minute increment
      const roundedTimeInMinutes = Math.round(mouseTimeInMinutes / 15) * 15;
      
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // Check if we're in day view
      const timeGrid = document.querySelector('.time-grid');
      const isDayView = timeGrid && timeGrid.style.gridTemplateColumns === '1fr';

      if (isDayView) {
        // Day view: only allow time changes, no day changes
        // Check if there was a meaningful change (at least 15 minutes)
        const originalTime = direction === 'top' ? 
          (startTime.getHours() * 60 + startTime.getMinutes()) :
          (endTime.getHours() * 60 + endTime.getMinutes());
          
        if (Math.abs(roundedTimeInMinutes - originalTime) >= 15) {
          if (direction === 'top') {
            const newStart = new Date(startTime);
            newStart.setHours(Math.floor(roundedTimeInMinutes / 60), roundedTimeInMinutes % 60, 0, 0);
            
            if (newStart < endTime) {
              onResize(newStart, end, false);
            }
          } else {
            const newEnd = new Date(endTime);
            newEnd.setHours(Math.floor(roundedTimeInMinutes / 60), roundedTimeInMinutes % 60, 0, 0);
            
            if (newEnd > startTime) {
              onResize(start, newEnd, false);
            }
          }
        }
      } else {
        // Week view: allow both day and time changes
        const currentX = e.clientX - gridRect.left;
        const newGridDayIndex = Math.floor((currentX / gridRect.width) * 7);
        
        // Check if there was a meaningful change (at least 15 minutes or day change)
        const originalTime = direction === 'top' ? 
          (startTime.getHours() * 60 + startTime.getMinutes()) :
          (endTime.getHours() * 60 + endTime.getMinutes());
        const dayChanged = Math.abs(newGridDayIndex - initialScrollableDayIndex) > 0;
        
        if (Math.abs(roundedTimeInMinutes - originalTime) >= 15 || dayChanged) {
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
              newStart.setHours(Math.floor(roundedTimeInMinutes / 60), roundedTimeInMinutes % 60, 0, 0);
              newStart.setDate(startTime.getDate() + daysDelta);
              
              if (newStart < endTime) {
                onResize(newStart, end, false);
              }
            } else {
              const newEnd = new Date(endTime);
              newEnd.setHours(Math.floor(roundedTimeInMinutes / 60), roundedTimeInMinutes % 60, 0, 0);
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

  const handleEventRightClick = (e) => {
    // Prevent default context menu and call the onRightClick handler if provided
    e.preventDefault();
    e.stopPropagation();
    if (onRightClick) {
      onRightClick(e);
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

  // Auto-scroll functionality
  const startAutoScroll = (direction) => {
    if (autoScrollInterval) return; // Already scrolling
    
    const scrollContainer = document.querySelector('.calendar-main');
    if (!scrollContainer) return;
    
    const interval = setInterval(() => {
      const scrollAmount = direction === 'up' ? -10 : 10;
      scrollContainer.scrollTop += scrollAmount;
    }, 50);
    
    setAutoScrollInterval(interval);
  };

  const stopAutoScroll = () => {
    if (autoScrollInterval) {
      clearInterval(autoScrollInterval);
      setAutoScrollInterval(null);
    }
  };

  const checkAutoScroll = (clientY) => {
    const scrollContainer = document.querySelector('.calendar-main');
    if (!scrollContainer) return;
    
    const rect = scrollContainer.getBoundingClientRect();
    const scrollThreshold = 50; // pixels from edge to trigger scroll
    
    if (clientY - rect.top < scrollThreshold) {
      startAutoScroll('up');
    } else if (rect.bottom - clientY < scrollThreshold) {
      startAutoScroll('down');
    } else {
      stopAutoScroll();
    }
  };

  // Clean up auto-scroll on unmount
  useEffect(() => {
    return () => {
      if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
      }
    };
  }, [autoScrollInterval]);

  return (
    <div
      className={className}
      style={eventStyle}
      onClick={handleSimpleClick}
      onContextMenu={handleEventRightClick}
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
          onMouseDown={(e) => {
            // Only handle left-click (button 0), ignore right-click (button 2)
            if (e.button === 0) {
              handleResizeStart(e, 'top');
            }
          }}
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
          onMouseDown={(e) => {
            // Only handle left-click (button 0), ignore right-click (button 2)
            if (e.button === 0) {
              handleResizeStart(e, 'bottom');
            }
          }}
        />
      )}
    </div>
  );
};

export default Event;
