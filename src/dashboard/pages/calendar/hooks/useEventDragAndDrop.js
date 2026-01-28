import { useState, useCallback, useRef } from 'react';
import { CALENDAR_COLORS } from '../utils/constants';
import { getScrollableWeekDates } from '../utils/dateHelpers';

/**
 * Custom hook for event drag and drop operations
 * Handles event creation via dragging, event movement, and event resizing
 * 
 * Extracted from Calendar.js to separate interaction logic
 */
export const useEventDragAndDrop = (currentDate, view, weekScrollOffset, CALENDAR_COLORS, getScrollableWeekDates) => {
  // Drag state for new event creation
  const [isDraggingNewEvent, setIsDraggingNewEvent] = useState(false);
  const [dragStartPosition, setDragStartPosition] = useState(null);
  const [newEventStart, setNewEventStart] = useState(null);
  const [newEventEnd, setNewEventEnd] = useState(null);
  
  // Click detection state
  const [clickTimeout, setClickTimeout] = useState(null);
  const [clickCount, setClickCount] = useState(0);
  
  // Drag detection state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartTime, setDragStartTime] = useState(null);
  
  // Refs for tracking mouse state
  const mouseDownRef = useRef(false);
  const dragThresholdRef = useRef(5); // pixels to start drag
  const initialMousePosRef = useRef(null);
  
  /**
   * Snap time to 15-minute intervals
   * @param {Date} date - Date to snap
   * @returns {Date} - Snapped date
   */
  const snapToQuarterHour = useCallback((date) => {
    const newDate = new Date(date);
    const minutes = newDate.getMinutes();
    const snappedMinutes = Math.round(minutes / 15) * 15;
    newDate.setMinutes(snappedMinutes);
    newDate.setSeconds(0);
    newDate.setMilliseconds(0);
    return newDate;
  }, []);

  /**
   * Calculate time from mouse position
   * @param {number} y - Y position relative to time grid
   * @param {number} gridHeight - Height of the time grid
   * @returns {Object} - { hour, minutes }
   */
  const calculateTimeFromPosition = useCallback((y, gridHeight) => {
    const totalHours = 24;
    const hourHeight = gridHeight / totalHours;
    const totalMinutes = (y / hourHeight) * 60;
    const hour = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    return { 
      hour: Math.max(0, Math.min(23, hour)), 
      minutes: Math.max(0, Math.min(59, minutes))
    };
  }, []);

  /**
   * Calculate date from mouse position
   * @param {number} x - X position relative to time grid
   * @param {number} y - Y position relative to time grid
   * @param {DOMRect} rect - Time grid bounding rectangle
   * @returns {Date} - Calculated date
   */
  const calculateDateFromPosition = useCallback((x, y, rect) => {
    const { hour, minutes } = calculateTimeFromPosition(y, rect.height);
    
    let targetDate;
    if (view === 'day') {
      targetDate = new Date(currentDate);
    } else {
      // Week view: calculate which day based on x position
      const dayWidth = rect.width / 7;
      const dayIndex = Math.floor(x / dayWidth);
      const boundedDay = Math.max(0, Math.min(6, dayIndex));
      
      const scrollableWeekDates = getScrollableWeekDates(currentDate, weekScrollOffset);
      targetDate = new Date(scrollableWeekDates[boundedDay]);
    }
    
    targetDate.setHours(hour);
    targetDate.setMinutes(minutes);
    targetDate.setSeconds(0);
    targetDate.setMilliseconds(0);
    
    return snapToQuarterHour(targetDate);
  }, [view, currentDate, weekScrollOffset, getScrollableWeekDates, calculateTimeFromPosition, snapToQuarterHour]);

  // Handle time slot mouse down
  const handleTimeSlotMouseDown = useCallback((e, selectedEvent) => {
    if (selectedEvent) return;

    const timeGrid = e.currentTarget;
    const rect = timeGrid.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Store initial mouse position for drag threshold
    initialMousePosRef.current = { x: e.clientX, y: e.clientY };
    
    // Calculate the start date/time based on click position
    const startDate = calculateDateFromPosition(x, y, rect);
    
    // Set end time to exactly one hour after start time
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 1);

    // Handle double click detection
    if (clickTimeout) {
      clearTimeout(clickTimeout);
      setClickTimeout(null);
      setClickCount(0);

      // Create 1-hour event immediately on double click
      return {
        type: 'CREATE_EVENT',
        startDate: snapToQuarterHour(startDate),
        endDate: snapToQuarterHour(endDate)
      };
    }

    // Set timeout for single click detection
    setClickTimeout(setTimeout(() => {
      setClickTimeout(null);
      setClickCount(0);
    }, 300));

    setClickCount(prev => prev + 1);
    
    // Set initial drag position for potential drag operation
    setDragStartPosition(startDate);
    setNewEventStart(startDate);
    setNewEventEnd(endDate);
    mouseDownRef.current = true;
    
    return null;
  }, [clickTimeout, calculateDateFromPosition, snapToQuarterHour]);

  // Handle time slot mouse move
  const handleTimeSlotMouseMove = useCallback((e) => {
    if (!dragStartPosition || !e.buttons || !mouseDownRef.current) return;
    
    // Check if we've moved enough to start dragging
    if (!isDraggingNewEvent && initialMousePosRef.current) {
      const deltaX = Math.abs(e.clientX - initialMousePosRef.current.x);
      const deltaY = Math.abs(e.clientY - initialMousePosRef.current.y);
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      if (distance < dragThresholdRef.current) {
        return; // Haven't moved enough to start dragging
      }
    }
    
    setIsDraggingNewEvent(true);

    const timeGrid = e.currentTarget;
    const rect = timeGrid.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate current drag position
    const currentDragDate = calculateDateFromPosition(x, y, rect);
    
    // Support bidirectional dragging with proper time calculation
    let startTime, endTime;
    
    // Compare the full date-time, not just the date
    const dragStartTime = dragStartPosition.getTime();
    const currentTime = currentDragDate.getTime();
    
    if (currentTime >= dragStartTime) {
      // Dragging forward (down/right in time)
      startTime = snapToQuarterHour(new Date(dragStartPosition));
      endTime = snapToQuarterHour(new Date(currentDragDate));
      
      // Ensure minimum 15-minute duration
      if (endTime.getTime() <= startTime.getTime()) {
        endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + 15);
      }
    } else {
      // Dragging backward (up/left in time)
      startTime = snapToQuarterHour(new Date(currentDragDate));
      endTime = snapToQuarterHour(new Date(dragStartPosition));
      
      // Ensure minimum 15-minute duration
      if (endTime.getTime() <= startTime.getTime()) {
        endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + 15);
      }
    }
    
    setNewEventStart(startTime);
    setNewEventEnd(endTime);
  }, [dragStartPosition, isDraggingNewEvent, calculateDateFromPosition, snapToQuarterHour]);

  // Handle time slot mouse up
  const handleTimeSlotMouseUp = useCallback((e) => {
    mouseDownRef.current = false;
    initialMousePosRef.current = null;
    
    if (!dragStartPosition) return null;

    // Create event if we were dragging OR if it's a single click
    if (isDraggingNewEvent || !isDraggingNewEvent) {
      let eventStart, eventEnd;
      
      if (isDraggingNewEvent) {
        // Use the calculated start/end from dragging
        eventStart = newEventStart;
        eventEnd = newEventEnd;
      } else {
        // Single click - create 1-hour event at click position
        eventStart = snapToQuarterHour(new Date(dragStartPosition));
        eventEnd = new Date(eventStart);
        eventEnd.setHours(eventEnd.getHours() + 1);
      }
      
      // Use grey color for unvalidated new events
      const defaultColor = CALENDAR_COLORS.find(c => c.id === 'grey');
      const newEvent = {
        id: String(Date.now()),
        start: eventStart,
        end: eventEnd,
        title: '',
        color: defaultColor.color,
        color1: defaultColor.color1,
        color2: defaultColor.color2,
        isValidated: false
      };

      // Reset states
      setIsDraggingNewEvent(false);
      setDragStartPosition(null);
      setNewEventStart(null);
      setNewEventEnd(null);
      
      return {
        type: 'CREATE_EVENT_FROM_DRAG',
        event: newEvent
      };
    }
    
    // Reset states
    setIsDraggingNewEvent(false);
    setDragStartPosition(null);
    setNewEventStart(null);
    setNewEventEnd(null);
    
    return null;
  }, [dragStartPosition, isDraggingNewEvent, newEventStart, newEventEnd, CALENDAR_COLORS, snapToQuarterHour]);

  // Handle event resize
  const handleEventResize = useCallback((eventId, newStart, newEnd, isTemporary = false) => {
    // Track drag state for resize
    if (isTemporary) {
      setIsDragging(true);
      setDragStartTime(Date.now());
    } else {
      // End of resize - reset after a delay
      setTimeout(() => {
        setIsDragging(false);
      }, 250);
    }
    
    return {
      type: 'RESIZE_EVENT',
      eventId,
      newStart,
      newEnd,
      isTemporary
    };
  }, []);

  // Handle event move
  const handleEventMove = useCallback((eventId, newStartDate, newEndDate, isTemporary = false) => {
    // Track drag state
    if (isTemporary) {
      setIsDragging(true);
      setDragStartTime(Date.now());
    } else {
      // End of drag - reset after a delay
      setTimeout(() => {
        setIsDragging(false);
      }, 250);
    }

    // Ensure dates are proper Date objects
    const newStart = newStartDate instanceof Date ? newStartDate : new Date(newStartDate);
    const newEnd = newEndDate instanceof Date ? newEndDate : new Date(newEndDate);
    
    return {
      type: 'MOVE_EVENT',
      eventId,
      newStart,
      newEnd,
      isTemporary
    };
  }, []);
  
  // Handle event drop on day headers for cross-day dragging
  const handleEventDropOnDay = useCallback((draggedEvent, targetDate) => {
    if (!draggedEvent || !targetDate) return null;
    
    // Calculate the time difference to maintain the same time when moving to a different day
    const originalStart = new Date(draggedEvent.start);
    const originalEnd = new Date(draggedEvent.end);
    const duration = originalEnd.getTime() - originalStart.getTime();
    
    // Create new start and end times on the target date
    const newStart = new Date(targetDate);
    newStart.setHours(originalStart.getHours(), originalStart.getMinutes(), 0, 0);
    
    const newEnd = new Date(newStart.getTime() + duration);
    
    return {
      type: 'DROP_EVENT_ON_DAY',
      eventId: draggedEvent.id,
      newStart,
      newEnd
    };
  }, []);

  // Handle event change complete
  const handleEventChangeComplete = useCallback(() => {
    return {
      type: 'EVENT_CHANGE_COMPLETE'
    };
  }, []);
  
  // Reset drag state
  const resetDragState = useCallback(() => {
    setIsDraggingNewEvent(false);
    setDragStartPosition(null);
    setNewEventStart(null);
    setNewEventEnd(null);
    setIsDragging(false);
    setDragStartTime(null);
    mouseDownRef.current = false;
    
    if (clickTimeout) {
      clearTimeout(clickTimeout);
      setClickTimeout(null);
    }
    setClickCount(0);
  }, [clickTimeout]);
  
  return {
    // State
    isDraggingNewEvent,
    dragStartPosition,
    newEventStart,
    newEventEnd,
    isDragging,
    dragStartTime,
    
    // Setters
    setIsDraggingNewEvent,
    setDragStartPosition,
    setIsDragging,
    setDragStartTime,
    
    // Handlers
    handleTimeSlotMouseDown,
    handleTimeSlotMouseMove,
    handleTimeSlotMouseUp,
    handleEventResize,
    handleEventMove,
    handleEventDropOnDay,
    handleEventChangeComplete,
    resetDragState
  };
}; 