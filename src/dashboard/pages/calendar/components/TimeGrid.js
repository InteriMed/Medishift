import React, { useRef, useCallback, useState, useEffect } from 'react';
import Event from './events/Event';
import { getMultipleWeeks, getMultipleDays } from '../utils/dateHelpers';

/**
 * TimeGrid Component
 * 
 * Renders the calendar time grid with events in week view.
 * 
 * Grid Interactions:
 * - Click (Empty Slot): Creates 1-hour event and opens panel
 * - Double Click (Empty Slot): Creates 1-hour event immediately
 * - Drag (Empty Slot): Creates custom duration event based on drag distance
 */
const TimeGrid = ({
  view,
  events,
  selectedEventId,
  currentDate,
  getEventsForCurrentWeek,
  validatedEvents,
  onEventClick,
  onEventRightClick,
  onEventMove,
  onEventResize,
  onCreateEvent,
  scrollContainerRef: externalScrollContainerRef,
  numWeeks = 7,
  numDays = 30,
  referenceDate: propReferenceDate,
  nightView = false,
}) => {
  const gridRef = useRef(null);
  const internalScrollContainerRef = useRef(null);
  const scrollContainerRef = externalScrollContainerRef || internalScrollContainerRef;

  // Drag-to-create state
  const [draftEvent, setDraftEvent] = useState(null);
  const initialMouseY = useRef(0);
  const initialStartTime = useRef(null);
  const hasMovedRef = useRef(false);
  const latestDraftRef = useRef(null); // Track latest draft for drag-to-create

  // Get days/weeks for horizontal scrolling - use dynamic range for infinite scrolling
  const referenceDate = propReferenceDate || currentDate;
  let allDays;

  if (nightView) {
    // Night view: show previous day + next day for each date
    if (view === 'day') {
      const prevDay = new Date(referenceDate);
      prevDay.setDate(prevDay.getDate() - 1);
      const nextDay = new Date(referenceDate);
      nextDay.setDate(nextDay.getDate() + 1);
      allDays = [prevDay, nextDay];
    } else {
      const weeksBefore = numWeeks;
      const weeksAfter = numWeeks;
      const weeks = getMultipleWeeks(referenceDate, weeksBefore, weeksAfter);
      const baseDays = weeks.flat();
      allDays = baseDays.flatMap(date => {
        const prevDay = new Date(date);
        prevDay.setDate(prevDay.getDate() - 1);
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        return [prevDay, nextDay];
      });
    }
  } else if (view === 'day') {
    // Day view: generate days centered around current date
    // Day view: generate single day (current date)
    const daysBefore = 0;
    const daysAfter = 0;
    allDays = getMultipleDays(referenceDate, daysBefore, daysAfter);
  } else {
    // Week view: generate weeks and flatten to days
    const weeksBefore = numWeeks;
    const weeksAfter = numWeeks;
    const weeks = getMultipleWeeks(referenceDate, weeksBefore, weeksAfter);
    allDays = weeks.flat();
  }

  // Constants
  const PIXELS_PER_HOUR = 60;
  const MINUTES_INCREMENT = 15;

  /**
   * Snap time to nearest 15-minute interval
   */
  const snapToInterval = useCallback((date) => {
    const newDate = new Date(date);
    const minutes = newDate.getMinutes();
    const remainder = minutes % MINUTES_INCREMENT;

    if (remainder !== 0) {
      if (remainder < MINUTES_INCREMENT / 2) {
        newDate.setMinutes(minutes - remainder);
      } else {
        newDate.setMinutes(minutes + (MINUTES_INCREMENT - remainder));
      }
    }
    newDate.setSeconds(0, 0);
    return newDate;
  }, []);

  /**
   * Get time from Y position on grid
   * @param {number} y - Y position in pixels
   * @param {Date} referenceDate - Reference date for the calculation
   * @param {boolean} snapToHour - If true, snap to hour boundaries (for click events)
   */
  const getTimeFromY = useCallback((y, referenceDate, snapToHour = false) => {
    if (nightView) {
      // Night view: first 12 hours (12:00-00:00) = previous day, next 12 hours (00:00-12:00) = next day
      const hoursFromTop = y / PIXELS_PER_HOUR;
      const isPreviousDay = hoursFromTop < 12;

      let targetDate, hours, minutes, seconds;

      if (isPreviousDay) {
        // Previous day: 12:00-00:00 (hours 12-23)
        targetDate = new Date(referenceDate);
        targetDate.setDate(targetDate.getDate() - 1);
        const normalizedDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);

        if (snapToHour) {
          hours = Math.max(12, Math.min(23, 12 + Math.floor(hoursFromTop)));
          minutes = 0;
          seconds = 0;
        } else {
          hours = Math.max(12, Math.min(23, 12 + Math.floor(hoursFromTop)));
          const minutesDecimal = (hoursFromTop - Math.floor(hoursFromTop)) * 60;
          minutes = Math.round(minutesDecimal / MINUTES_INCREMENT) * MINUTES_INCREMENT;
          seconds = 0;
        }

        const date = new Date(normalizedDate);
        date.setHours(hours, minutes, seconds, 0);
        return date;
      } else {
        // Next day: 00:00-12:00 (hours 0-11)
        targetDate = new Date(referenceDate);
        targetDate.setDate(targetDate.getDate() + 1);
        const normalizedDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);

        const adjustedHours = hoursFromTop - 12;

        if (snapToHour) {
          hours = Math.max(0, Math.min(11, Math.floor(adjustedHours)));
          minutes = 0;
          seconds = 0;
        } else {
          hours = Math.max(0, Math.min(11, Math.floor(adjustedHours)));
          const minutesDecimal = (adjustedHours - Math.floor(adjustedHours)) * 60;
          minutes = Math.round(minutesDecimal / MINUTES_INCREMENT) * MINUTES_INCREMENT;
          seconds = 0;
        }

        const date = new Date(normalizedDate);
        date.setHours(hours, minutes, seconds, 0);
        return date;
      }
    }

    // Normal view: 00:00-24:00
    const normalizedDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate(), 0, 0, 0, 0);

    if (y <= 0) {
      return normalizedDate;
    }

    const hoursFromTop = y / PIXELS_PER_HOUR;

    let hours, minutes, seconds;

    if (snapToHour) {
      hours = Math.max(0, Math.min(23, Math.floor(hoursFromTop)));
      minutes = 0;
      seconds = 0;
    } else {
      hours = Math.max(0, Math.min(23, Math.floor(hoursFromTop)));
      const minutesDecimal = (hoursFromTop - Math.floor(hoursFromTop)) * 60;
      minutes = Math.round(minutesDecimal / MINUTES_INCREMENT) * MINUTES_INCREMENT;
      seconds = 0;
    }

    const date = new Date(normalizedDate);
    date.setHours(hours, minutes, seconds, 0);
    return date;
  }, [nightView]);

  /**
   * Get day date from X position in horizontal scrollable weeks
   */
  const getDayFromX = useCallback((x, gridWidth) => {
    const numDays = allDays.length;
    const dayIndex = Math.floor((x / gridWidth) * numDays);
    return allDays[Math.max(0, Math.min(numDays - 1, dayIndex))];
  }, [allDays]);

  const calculateEventOverlaps = (events, currentView) => {
    if (events.length === 0) return [];

    const eventsWithTimes = events.map(event => ({
      ...event,
      startTime: new Date(event.start).getTime(),
      endTime: new Date(event.end).getTime(),
      column: 0,
      totalColumns: 1,
      isOverlapping: false
    }));

    eventsWithTimes.sort((a, b) => {
      if (a.startTime === b.startTime) return a.endTime - b.endTime;
      return a.startTime - b.startTime;
    });

    if (currentView === 'day') {
      const maxColumns = 6;
      const columns = Array(maxColumns).fill(null).map(() => []);

      for (const event of eventsWithTimes) {
        let placed = false;
        let bestColumn = 0;
        let minOverlaps = Infinity;

        for (let col = 0; col < maxColumns; col++) {
          const overlappingCount = columns[col].filter(existingEvent => {
            return event.startTime < existingEvent.endTime && event.endTime > existingEvent.startTime;
          }).length;

          if (overlappingCount === 0) {
            columns[col].push(event);
            event.column = col;
            placed = true;
            break;
          }

          if (overlappingCount < minOverlaps) {
            minOverlaps = overlappingCount;
            bestColumn = col;
          }
        }

        if (!placed) {
          columns[bestColumn].push(event);
          event.column = bestColumn;
          event.isOverlapping = true;
        }
      }

      const usedColumns = new Set(eventsWithTimes.map(e => e.column));
      const actualMaxColumns = Math.min(maxColumns, Math.max(1, usedColumns.size));

      eventsWithTimes.forEach(event => {
        event.totalColumns = actualMaxColumns;
      });

    } else {
      const maxColumns = 2;
      const processed = new Set();

      for (let i = 0; i < eventsWithTimes.length; i++) {
        if (processed.has(i)) continue;

        const currentEvent = eventsWithTimes[i];
        const containmentGroup = [currentEvent];
        processed.add(i);

        for (let j = i + 1; j < eventsWithTimes.length; j++) {
          if (processed.has(j)) continue;

          const otherEvent = eventsWithTimes[j];
          const overlaps = currentEvent.startTime < otherEvent.endTime && currentEvent.endTime > otherEvent.startTime;

          if (overlaps) {
            const currentContainsOther = currentEvent.startTime <= otherEvent.startTime && currentEvent.endTime >= otherEvent.endTime;
            const otherContainsCurrent = otherEvent.startTime <= currentEvent.startTime && otherEvent.endTime >= currentEvent.endTime;

            if (currentContainsOther || otherContainsCurrent) {
              containmentGroup.push(otherEvent);
              processed.add(j);

              if (containmentGroup.length >= maxColumns) break;
            }
          }
        }

        if (containmentGroup.length > 1) {
          containmentGroup.sort((a, b) => {
            if (a.startTime === b.startTime) return a.endTime - b.endTime;
            return a.startTime - b.startTime;
          });

          containmentGroup.forEach((event, index) => {
            event.column = index;
            event.totalColumns = Math.min(maxColumns, containmentGroup.length);
          });
        }
      }

      for (let i = 0; i < eventsWithTimes.length; i++) {
        const currentEvent = eventsWithTimes[i];
        if (currentEvent.totalColumns === 1) {
          for (let j = 0; j < eventsWithTimes.length; j++) {
            if (i === j) continue;
            const otherEvent = eventsWithTimes[j];
            const overlaps = currentEvent.startTime < otherEvent.endTime && currentEvent.endTime > otherEvent.startTime;

            if (overlaps) {
              const currentContainsOther = currentEvent.startTime <= otherEvent.startTime && currentEvent.endTime >= otherEvent.endTime;
              const otherContainsCurrent = otherEvent.startTime <= currentEvent.startTime && otherEvent.endTime >= currentEvent.endTime;

              if (!currentContainsOther && !otherContainsCurrent) {
                currentEvent.isOverlapping = true;
                otherEvent.isOverlapping = true;
              }
            }
          }
        }
      }
    }

    return eventsWithTimes;
  };

  /**
   * Handle event mouse down - for move/resize
   */
  const handleEventMouseDown = useCallback((e, event, type = 'move') => {
    e.preventDefault();
    e.stopPropagation();

    if (e.button !== 0) return;

    hasMovedRef.current = false;
    const gridElement = gridRef.current;
    if (!gridElement) return;

    initialMouseY.current = e.clientY;
    const initialMouseX = e.clientX;
    const initialStart = new Date(event.start);
    const initialEnd = new Date(event.end);
    const duration = initialEnd.getTime() - initialStart.getTime();

    // Get grid for calculating day changes
    const gridRect = gridElement.getBoundingClientRect();

    // Find scroll container
    const scrollContainer = gridElement.closest('.calendar-scroll-container') ||
      gridElement.closest('.time-slots');
    let autoScrollAnimationFrame = null;
    let currentMouseY = e.clientY;
    const initialScrollTop = scrollContainer ? scrollContainer.scrollTop : 0;

    const performAutoScroll = () => {
      if (!scrollContainer) {
        autoScrollAnimationFrame = null;
        return;
      }

      const containerRect = scrollContainer.getBoundingClientRect();
      const containerTop = containerRect.top;
      const containerBottom = containerRect.bottom;
      const scrollThreshold = 80;
      const maxScrollSpeed = 15;

      // Calculate distance from mouse to top/bottom of scroll container
      const distanceFromTop = currentMouseY - containerTop;
      const distanceFromBottom = containerBottom - currentMouseY;

      let shouldScroll = false;
      let scrollAmount = 0;

      if (distanceFromTop < scrollThreshold && distanceFromTop > 0) {
        // Near top - scroll up
        shouldScroll = true;
        scrollAmount = -Math.min(maxScrollSpeed, Math.floor((scrollThreshold - distanceFromTop) / 5));
      } else if (distanceFromBottom < scrollThreshold && distanceFromBottom > 0) {
        // Near bottom - scroll down
        shouldScroll = true;
        scrollAmount = Math.min(maxScrollSpeed, Math.floor((scrollThreshold - distanceFromBottom) / 5));
      }

      if (shouldScroll && scrollAmount !== 0) {
        const currentScroll = scrollContainer.scrollTop;
        const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
        const newScroll = Math.max(0, Math.min(maxScroll, currentScroll + scrollAmount));
        scrollContainer.scrollTop = newScroll;
        autoScrollAnimationFrame = requestAnimationFrame(performAutoScroll);
      } else {
        autoScrollAnimationFrame = null;
      }
    };

    const handleMouseMove = (moveEvent) => {
      // Update current mouse Y for auto-scroll
      currentMouseY = moveEvent.clientY;

      // Calculate scroll delta to account for auto-scrolling
      const currentScrollTop = scrollContainer ? scrollContainer.scrollTop : 0;
      const scrollDelta = currentScrollTop - initialScrollTop;

      // Adjust deltaY to account for scroll changes
      // When scrolling down (scrollDelta > 0), content moves up, so mouse is further down relative to content
      // When scrolling up (scrollDelta < 0), content moves down, so mouse is further up relative to content
      const deltaY = (moveEvent.clientY - initialMouseY.current) + scrollDelta;
      const deltaX = moveEvent.clientX - initialMouseX;

      if (Math.abs(deltaY) > 3 || Math.abs(deltaX) > 3) {
        hasMovedRef.current = true;
      }

      // Start auto-scroll if not already running
      if (scrollContainer && (type === 'move' || type === 'resize-top' || type === 'resize-bottom') && !autoScrollAnimationFrame) {
        autoScrollAnimationFrame = requestAnimationFrame(performAutoScroll);
      }

      // Calculate minutes delta (snapped to 15 min)
      const minutesPerPixel = 60 / PIXELS_PER_HOUR;
      const rawMinutes = deltaY * minutesPerPixel;
      const minutesDelta = Math.round(rawMinutes / MINUTES_INCREMENT) * MINUTES_INCREMENT;

      if (type === 'resize-top') {
        const newStart = new Date(initialStart.getTime() + minutesDelta * 60000);
        const snappedStart = snapToInterval(newStart);
        if (snappedStart < initialEnd) {
          onEventResize?.(event.id, snappedStart, initialEnd, true);
        }
      } else if (type === 'resize-bottom') {
        const newEnd = new Date(initialEnd.getTime() + minutesDelta * 60000);
        const snappedEnd = snapToInterval(newEnd);
        if (snappedEnd > initialStart) {
          onEventResize?.(event.id, initialStart, snappedEnd, true);
        }
      } else {
        // Move - allow both time and day changes (including vertical day wrap across hours)
        const currentX = moveEvent.clientX - gridRect.left;
        const baseDayFromX = getDayFromX(currentX, gridRect.width);

        const minutesPerPixel = 60 / PIXELS_PER_HOUR;
        const currentScrollTop = scrollContainer ? scrollContainer.scrollTop : 0;
        const scrollDelta = currentScrollTop - initialScrollTop;
        const deltaY = (moveEvent.clientY - initialMouseY.current) + scrollDelta;
        const minutesDelta = Math.round((deltaY * minutesPerPixel) / MINUTES_INCREMENT) * MINUTES_INCREMENT;

        // Calculate total minutes from midnight of the base day to determine wrap
        const startMinutesAtMidnight = initialStart.getHours() * 60 + initialStart.getMinutes();
        const totalMinutes = startMinutesAtMidnight + minutesDelta;

        // Vertical day offset (1440 mins = 24h)
        const dayOffset = Math.floor(totalMinutes / 1440);
        const wrappedMinutes = ((totalMinutes % 1440) + 1440) % 1440;

        const targetDate = new Date(baseDayFromX);
        targetDate.setDate(targetDate.getDate() + dayOffset);
        targetDate.setHours(Math.floor(wrappedMinutes / 60), wrappedMinutes % 60, 0, 0);

        const snappedStart = snapToInterval(targetDate);
        const snappedEnd = new Date(snappedStart.getTime() + duration);

        onEventMove?.(event.id, snappedStart, snappedEnd, true);
      }
    };

    const handleMouseUp = (upEvent) => {
      // Stop auto-scroll
      if (autoScrollAnimationFrame) {
        cancelAnimationFrame(autoScrollAnimationFrame);
        autoScrollAnimationFrame = null;
      }

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      // If no movement, treat as click
      if (!hasMovedRef.current) {
        onEventClick?.(event, upEvent);
        return;
      }

      // Finalize move
      const finalScrollTop = scrollContainer ? scrollContainer.scrollTop : 0;
      const scrollDelta = finalScrollTop - initialScrollTop;
      const deltaY = (upEvent.clientY - initialMouseY.current) + scrollDelta;

      const minutesPerPixel = 60 / PIXELS_PER_HOUR;
      const minutesDelta = Math.round((deltaY * minutesPerPixel) / MINUTES_INCREMENT) * MINUTES_INCREMENT;

      if (type === 'resize-top') {
        const newStart = new Date(initialStart.getTime() + minutesDelta * 60000);
        const snappedStart = snapToInterval(newStart);
        if (snappedStart < initialEnd) {
          onEventResize?.(event.id, snappedStart, initialEnd, false);
        }
      } else if (type === 'resize-bottom') {
        const newEnd = new Date(initialEnd.getTime() + minutesDelta * 60000);
        const snappedEnd = snapToInterval(newEnd);
        if (snappedEnd > initialStart) {
          onEventResize?.(event.id, initialStart, snappedEnd, false);
        }
      } else {
        const finalX = upEvent.clientX - gridRect.left;
        const baseDayFromX = getDayFromX(finalX, gridRect.width);

        const startMinutesAtMidnight = initialStart.getHours() * 60 + initialStart.getMinutes();
        const totalMinutes = startMinutesAtMidnight + minutesDelta;

        const dayOffset = Math.floor(totalMinutes / 1440);
        const wrappedMinutes = ((totalMinutes % 1440) + 1440) % 1440;

        const targetDate = new Date(baseDayFromX);
        targetDate.setDate(targetDate.getDate() + dayOffset);
        targetDate.setHours(Math.floor(wrappedMinutes / 60), wrappedMinutes % 60, 0, 0);

        const snappedStart = snapToInterval(targetDate);
        const snappedEnd = new Date(snappedStart.getTime() + duration);

        onEventMove?.(event.id, snappedStart, snappedEnd, false);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [snapToInterval, onEventMove, onEventResize, onEventClick, getDayFromX]);

  // Handle scroll initialization
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    // Initial centering - scroll to 8 AM (480px)
    if (scrollContainer.scrollTop === 0) {
      scrollContainer.scrollTop = 8 * 60;
    }
  }, [scrollContainerRef]);

  /**
   * Handle grid mouse down - for drag-to-create
   */
  const handleGridMouseDown = useCallback((e) => {
    // Check if click is on an event - check target and all parents
    const clickedEvent = e.target.closest('[data-event-id]');

    if (clickedEvent) {
      return; // Let the event handle it
    }

    // Only handle left button
    if (e.button !== 0) return;

    e.preventDefault();

    const gridElement = gridRef.current;
    if (!gridElement) return;

    const gridRect = gridElement.getBoundingClientRect();
    const x = e.clientX - gridRect.left;
    const y = e.clientY - gridRect.top;

    // Determine which day was clicked
    const dayDate = getDayFromX(x, gridRect.width);

    // For initial click, snap to hour cell boundary
    const startTime = getTimeFromY(y, dayDate, true); // true = snapToHour
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // +1 hour default

    hasMovedRef.current = false;
    initialMouseY.current = e.clientY;
    initialStartTime.current = startTime;

    // Create draft event
    const draft = {
      id: `draft-${Date.now()}`,
      title: '',
      start: startTime,
      end: endTime,
      isDraft: true,
      color: '#3b82f6',
    };

    // Store in ref for mouse events
    latestDraftRef.current = draft;

    setDraftEvent(draft);

    const handleMouseMove = (moveEvent) => {
      const currentY = moveEvent.clientY - gridRect.top;

      if (Math.abs(moveEvent.clientY - initialMouseY.current) > 5) {
        hasMovedRef.current = true;
      }

      // For drag, use precise timing (not snapped to hour)
      const currentTime = getTimeFromY(currentY, dayDate, false);

      // Ensure event stays within the same day (or night view time range)
      let dayStart, dayEnd;
      if (nightView) {
        const isPreviousDay = allDays.indexOf(dayDate) % 2 === 0;
        if (isPreviousDay) {
          dayStart = new Date(dayDate);
          dayStart.setHours(12, 0, 0, 0);
          dayEnd = new Date(dayDate);
          dayEnd.setDate(dayEnd.getDate() + 1);
          dayEnd.setHours(0, 0, 0, 0);
        } else {
          dayStart = new Date(dayDate);
          dayStart.setHours(0, 0, 0, 0);
          dayEnd = new Date(dayDate);
          dayEnd.setHours(12, 0, 0, 0);
        }
      } else {
        dayStart = new Date(dayDate);
        dayStart.setHours(0, 0, 0, 0);
        dayEnd = new Date(dayDate);
        dayEnd.setHours(23, 59, 59, 999);
      }

      // Determine start and end based on drag direction
      let newStart, newEnd;
      if (currentTime < initialStartTime.current) {
        newStart = snapToInterval(currentTime);
        newEnd = snapToInterval(new Date(initialStartTime.current.getTime() + 60 * 60 * 1000));
      } else {
        newStart = snapToInterval(initialStartTime.current);
        newEnd = snapToInterval(currentTime);
        // Ensure minimum 15 min
        if (newEnd.getTime() - newStart.getTime() < 15 * 60 * 1000) {
          newEnd = new Date(newStart.getTime() + 15 * 60 * 1000);
        }
      }

      // Clamp to day boundaries
      if (newStart < dayStart) {
        newStart = dayStart;
        newEnd = new Date(newStart.getTime() + 60 * 60 * 1000);
      }
      if (newEnd > dayEnd) {
        newEnd = dayEnd;
        if (newEnd.getTime() - newStart.getTime() < 15 * 60 * 1000) {
          newStart = new Date(newEnd.getTime() - 15 * 60 * 1000);
          if (newStart < dayStart) {
            newStart = dayStart;
            newEnd = new Date(newStart.getTime() + 15 * 60 * 1000);
          }
        }
      }

      const updatedDraft = {
        ...latestDraftRef.current,
        start: newStart,
        end: newEnd,
      };

      latestDraftRef.current = updatedDraft;
      setDraftEvent(updatedDraft);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      setDraftEvent(null);

      if (hasMovedRef.current) {
        // Drag create - open panel to fill in details
        onCreateEvent?.({
          ...latestDraftRef.current,
          id: `temp-${Date.now()}`,
          isDraft: false,
        }, true); // true = open panel
      } else {
        // Single click - always create event using closure variables
        const newEvent = {
          id: `temp-${Date.now()}`,
          title: '',
          start: startTime, // From closure - already snapped to hour
          end: endTime,     // From closure - already 1 hour after start
          color: '#3b82f6',
        };
        onCreateEvent?.(newEvent, true); // true = open panel
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [currentDate, getDayFromX, getTimeFromY, snapToInterval, onCreateEvent, allDays, nightView]);

  /**
   * Handle grid double click - create event immediately
   */
  const handleGridDoubleClick = useCallback((e) => {
    // Don't handle if clicking on an event
    if (e.target.closest('[data-event-id]')) return;

    e.preventDefault();

    const gridElement = gridRef.current;
    if (!gridElement) return;

    const gridRect = gridElement.getBoundingClientRect();
    const x = e.clientX - gridRect.left;
    const y = e.clientY - gridRect.top;

    const dayDate = getDayFromX(x, gridRect.width);

    // Snap to hour cell boundary for double-click as well
    const startTime = getTimeFromY(y, dayDate, true); // true = snapToHour
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    const newEvent = {
      id: `temp-${Date.now()}`,
      title: '',
      start: startTime,
      end: endTime,
      color: '#3b82f6',
    };

    onCreateEvent?.(newEvent, true); // true = open panel
  }, [getDayFromX, getTimeFromY, onCreateEvent]);

  const renderEvents = () => {
    let eventsToRender = [];

    // Safety check: ensure allDays is not empty
    if (!allDays || allDays.length === 0) {
      return [];
    }

    // Process existing events only if they exist
    if (events && events.length > 0) {

      // Use all days from multiple weeks
      const rangeStart = new Date(allDays[0]);
      rangeStart.setHours(0, 0, 0, 0);
      const rangeEnd = new Date(allDays[allDays.length - 1]);
      rangeEnd.setHours(23, 59, 59, 999);

      // Separate events being moved/resized from normal events
      const activeEvents = events.filter(e => e.isBeingMoved || e.isBeingResized);
      const normalEvents = events.filter(e => !e.isBeingMoved && !e.isBeingResized);

      allDays.forEach((date, i) => {
        const dayEvents = normalEvents.filter(event => {
          if (!event || !event.start || !event.end) return false;

          const eventStart = new Date(event.start);
          const eventEnd = new Date(event.end);

          if (nightView) {
            // Night view: check if event falls in the time range for this day
            // For even indices (0, 2, 4...): previous day 12:00-00:00
            // For odd indices (1, 3, 5...): next day 00:00-12:00
            const isPreviousDay = i % 2 === 0;
            const dayStart = new Date(date);
            const dayEnd = new Date(date);

            if (isPreviousDay) {
              dayStart.setHours(12, 0, 0, 0);
              dayEnd.setHours(23, 59, 59, 999);
            } else {
              dayStart.setHours(0, 0, 0, 0);
              dayEnd.setHours(11, 59, 59, 999);
            }

            return eventStart < dayEnd && eventEnd > dayStart;
          } else {
            const dayStart = new Date(date);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(date);
            dayEnd.setHours(23, 59, 59, 999);

            return eventStart < dayEnd && eventEnd > dayStart;
          }
        });

        const processed = calculateEventOverlaps(dayEvents, view).map(e => ({ ...e, dayIndex: i, dayDate: date }));
        eventsToRender.push(...processed);
      });

      // Also handle active (moving/resizing) events
      activeEvents.forEach(event => {
        const eventDate = new Date(event.start);
        let dayIndex = allDays.findIndex(d =>
          d.getDate() === eventDate.getDate() &&
          d.getMonth() === eventDate.getMonth() &&
          d.getFullYear() === eventDate.getFullYear()
        );

        if (dayIndex < 0) {
          const daysDiff = Math.floor((eventDate - rangeStart) / (1000 * 60 * 60 * 24));
          dayIndex = Math.max(0, Math.min(allDays.length - 1, daysDiff));
        }

        const dayDate = allDays[dayIndex];
        eventsToRender.push({
          ...event,
          dayIndex,
          dayDate,
          column: 0,
          totalColumns: 1,
          isOverlapping: false
        });
      });
    }

    // Add draft event if creating
    if (draftEvent) {
      const draftDate = new Date(draftEvent.start);
      let dayIndex = allDays.findIndex(d =>
        d.getDate() === draftDate.getDate() &&
        d.getMonth() === draftDate.getMonth() &&
        d.getFullYear() === draftDate.getFullYear()
      );
      if (dayIndex === -1) dayIndex = 0;

      eventsToRender.push({
        ...draftEvent,
        dayIndex,
        dayDate: allDays[dayIndex],
        column: 0,
        totalColumns: 1,
        isOverlapping: false,
      });
    }

    return eventsToRender.flatMap(event => {
      if (!event || !event.start || event.dayIndex === undefined || event.dayIndex < 0) {
        return null;
      }

      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);

      // Use the day date specifically for this column to calculate segments
      const columnDate = event.dayDate || currentDate;

      // Rendering logic: an event spans through segments based on its day distance from the column's date
      const segments = [];

      if (nightView) {
        // Night view: show previous day (12:00-00:00) and next day (00:00-12:00)
        const isPreviousDay = event.dayIndex % 2 === 0;

        if (isPreviousDay) {
          // Previous day: 12:00-00:00 (maps to Y: 0-720px)
          const targetDayStart = new Date(columnDate);
          targetDayStart.setHours(12, 0, 0, 0);
          const targetDayEnd = new Date(columnDate);
          targetDayEnd.setDate(targetDayEnd.getDate() + 1);
          targetDayEnd.setHours(0, 0, 0, 0);

          const visibleStart = eventStart > targetDayStart ? eventStart : targetDayStart;
          const visibleEnd = eventEnd < targetDayEnd ? eventEnd : targetDayEnd;

          if (visibleStart < visibleEnd) {
            const startHours = visibleStart.getHours() + (visibleStart.getMinutes() / 60);
            const endHours = visibleEnd.getHours() + (visibleEnd.getMinutes() / 60);

            // Map 12:00-24:00 to 0-720px
            const top = (startHours - 12) * 60;
            const durationHours = endHours - startHours;
            const height = Math.max(durationHours * 60, 15);

            segments.push({ top, height, offset: 0 });
          }
        } else {
          // Next day: 00:00-12:00 (maps to Y: 720-1440px)
          const targetDayStart = new Date(columnDate);
          targetDayStart.setHours(0, 0, 0, 0);
          const targetDayEnd = new Date(columnDate);
          targetDayEnd.setHours(12, 0, 0, 0);

          const visibleStart = eventStart > targetDayStart ? eventStart : targetDayStart;
          const visibleEnd = eventEnd < targetDayEnd ? eventEnd : targetDayEnd;

          if (visibleStart < visibleEnd) {
            const startHours = visibleStart.getHours() + (visibleStart.getMinutes() / 60);
            const endHours = visibleEnd.getHours() + (visibleEnd.getMinutes() / 60);

            // Map 00:00-12:00 to 720-1440px
            const top = 720 + (startHours * 60);
            const durationHours = endHours - startHours;
            const height = Math.max(durationHours * 60, 15);

            segments.push({ top, height, offset: 0 });
          }
        }
      } else {
        // Normal view: Show only current day (0-1440px = 00:00-24:00)
        const targetDayStart = new Date(columnDate);
        targetDayStart.setHours(0, 0, 0, 0);

        const targetDayEnd = new Date(targetDayStart);
        targetDayEnd.setHours(23, 59, 59, 999);

        if (eventStart < targetDayEnd && eventEnd > targetDayStart) {
          const visibleStart = new Date(Math.max(eventStart, targetDayStart));
          const visibleEnd = new Date(Math.min(eventEnd, targetDayEnd));

          const hour = visibleStart.getHours();
          const top = (hour + visibleStart.getMinutes() / 60) * 60;
          const durationHours = (visibleEnd - visibleStart) / (1000 * 60 * 60);
          const height = Math.max(durationHours * 60, 15);

          segments.push({ top, height, offset: 0 });
        }
      }

      // Horizontal layout
      const numDays = allDays.length;
      const dayWidth = `${100 / numDays}%`;
      const dayLeft = `${event.dayIndex * (100 / numDays)}%`;

      // Color Logic
      let eventToRender = { ...event };
      if (validatedEvents && validatedEvents.has(event.id)) {
        eventToRender.color = '#0f54bc';
        eventToRender.color1 = '#a8c1ff';
        eventToRender.color2 = '#4da6fb';
      }

      if (segments.length === 0) {
        return null;
      }

      return segments.map(seg => {
        if (!seg || typeof seg.top !== 'number' || typeof seg.height !== 'number' || seg.height <= 0) {
          return null;
        }

        let style = {};
        if (event.isOverlapping) {
          const dayWidthNum = 100 / numDays;
          const subWidth = dayWidthNum / event.totalColumns;
          style = {
            top: `${seg.top}px`,
            left: `calc(${dayLeft} + ${event.column * subWidth}%)`,
            width: `calc(${subWidth}% - 4px)`,
            height: `${seg.height}px`,
            position: 'absolute',
          };
        } else {
          style = {
            top: `${seg.top}px`,
            left: dayLeft,
            width: `calc(${dayWidth} - 4px)`,
            height: `${seg.height}px`,
            position: 'absolute',
          };
        }

        if (!style.top || !style.left || !style.width || !style.height) {
          return null;
        }

        return (
          <Event
            key={`${event.id}-${seg.offset}`}
            {...eventToRender}
            style={style}
            isOverlapping={event.isOverlapping}
            isSelected={selectedEventId === event.id}
            onMouseDown={handleEventMouseDown}
            onRightClick={onEventRightClick}
            onClick={onEventClick}
          />
        );
      }).filter(Boolean);
    }).filter(Boolean);
  };

  return (
    <div
      className="relative flex-1 bg-transparent select-none min-w-max"
      ref={gridRef}
      style={{
        height: '1440px',
        width: view === 'day' ? `${allDays.length * 100}%` : `${(allDays.length / 7) * 100}%`,
        minWidth: view === 'day' ? `${allDays.length * 100}%` : `${(allDays.length / 7) * 100}%`
      }}
      onMouseDown={handleGridMouseDown}
      onDoubleClick={handleGridDoubleClick}
    >
      {/* Background Grid Lines (Horizontal for Time) - Absolutely Positioned */}
      <div className="absolute left-0 right-0 top-0 pointer-events-none" style={{ height: '1440px', zIndex: 1 }}>
        {Array.from({ length: 24 }, (_, index) => (
          <div
            key={index}
            className="absolute left-0 right-0"
            style={{
              top: `${index * 60}px`,
              height: '60px',
              borderBottom: nightView && index >= 21 ? 'none' : '1px solid hsl(var(--border))'
            }}
          />
        ))}
      </div>

      {/* Vertical Grid Lines (for all days) - Overlay */}
      <div className="absolute left-0 right-0 top-0 flex pointer-events-none" style={{ height: '1440px', zIndex: 2 }}>
        {allDays.map((_, i) => (
          <div
            key={i}
            className="border-l border-border h-full first:border-l-0"
            style={{ width: `${100 / allDays.length}%` }}
          />
        ))}
      </div>

      {/* Red Separator Line for Night View - Between Previous Day and Next Day */}
      {nightView && (
        <div
          className="absolute left-0 right-0 border-t-2 pointer-events-none"
          style={{
            top: '720px',
            borderColor: '#ef4444',
            zIndex: 20
          }}
        />
      )}

      {/* Events Layer - MUST have pointer-events enabled for interactions */}
      <div className="absolute left-0 right-0 top-0 w-full" style={{ height: '1440px', zIndex: 5, pointerEvents: 'auto' }}>
        <div className="relative w-full h-full" style={{ pointerEvents: 'auto' }}>
          {renderEvents()}
        </div>
      </div>
    </div>
  );
};

export default TimeGrid;