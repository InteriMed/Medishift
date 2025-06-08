import React, { useState, useEffect } from 'react';
import Event from './events/Event';
import { generateTimeSlots } from '../utils/dateHelpers';

const TimeGrid = ({
  view,
  events,
  selectedEventId,
  handleEventClick,
  handleEventRightClick,
  handleEventResize,
  handleEventMove,
  handleEventChangeComplete,
  handleTimeSlotMouseDown,
  handleTimeSlotMouseMove,
  handleTimeSlotMouseUp,
  setIsDraggingNewEvent,
  setDragStartPosition,
  newEventStart,
  newEventEnd,
  isDraggingNewEvent,
  currentDate,
  weekScrollOffset = 0,
  getEventsForCurrentWeek,
  getWeekDates,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
  validatedEvents
}) => {
  
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStartY, setDragStartY] = useState(null);
  const [autoScrollInterval, setAutoScrollInterval] = useState(null);

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

  const renderDaySeparators = () => {
    return Array(6).fill(null).map((_, index) => (
      <div
        key={index}
        className="day-separator"
        style={{ left: `${((index + 1) * 100) / 7}%` }}
      />
    ));
  };

  const renderCurrentTimeIndicator = () => {
    // Removed current time indicator as requested - no current time references except for logging
    return null;
  };

  const renderDraggingNewEvent = () => {
    if (!isDraggingNewEvent || !newEventStart || !newEventEnd) return null;
    
    const startDate = new Date(newEventStart);
    const endDate = new Date(newEventEnd);
    
    // Check if event spans multiple days
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const eventComponents = [];
    
    if (daysDiff <= 1 && startDate.getDate() === endDate.getDate()) {
      // Single day event
      eventComponents.push(
        <Event
          key="new-event-single"
          start={newEventStart}
          end={newEventEnd}
          isNew={true}
          color="#8c8c8c"
          color1="#e6e6e6"
          color2="#b3b3b3"
          title="New Event"
          currentDate={currentDate}
          weekScrollOffset={weekScrollOffset}
          onClick={() => {}}
        />
      );
    } else {
      // Multi-day event - render parts for each day
      if (view === 'week') {
        const weekDates = getWeekDates();
        const weekStart = weekDates[0];
        const weekEnd = weekDates[6];
        
        for (let i = 0; i < daysDiff; i++) {
          const currentDay = new Date(startDate);
          currentDay.setDate(startDate.getDate() + i);
          
          // Compare only date parts (ignore time) for proper boundary checking
          const currentDayDateOnly = new Date(currentDay.getFullYear(), currentDay.getMonth(), currentDay.getDate());
          const weekStartDateOnly = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
          const weekEndDateOnly = new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate());
          
          // Skip if day is not in current week
          if (currentDayDateOnly < weekStartDateOnly || currentDayDateOnly > weekEndDateOnly) continue;
          
          const isFirstDay = i === 0;
          const isLastDay = i === daysDiff - 1;
          
          eventComponents.push(
            <Event
              key={`new-event-${i}`}
              start={newEventStart}
              end={newEventEnd}
              isNew={true}
              color="#8c8c8c"
              color1="#e6e6e6"
              color2="#b3b3b3"
              title="New Event"
              isMultiDay={true}
              isFirstDay={isFirstDay}
              isLastDay={isLastDay}
              currentDate={currentDate}
              currentDayIndex={i}
              weekScrollOffset={weekScrollOffset}
              onClick={() => {}}
            />
          );
        }
      } else {
        // Day view - just render the single day portion
        eventComponents.push(
          <Event
            key="new-event-day"
            start={newEventStart}
            end={newEventEnd}
            isNew={true}
            color="#8c8c8c"
            color1="#e6e6e6"
            color2="#b3b3b3"
            title="New Event"
            currentDate={currentDate}
            weekScrollOffset={weekScrollOffset}
            onClick={() => {}}
          />
        );
      }
    }
    
    return eventComponents;
  };

  // Function to detect overlapping events and calculate positioning
  const calculateEventOverlaps = (events) => {
    if (events.length === 0) return [];

    // Convert events to include time information
    const eventsWithTimes = events.map(event => ({
      ...event,
      startTime: new Date(event.start).getTime(),
      endTime: new Date(event.end).getTime(),
      column: 0,
      totalColumns: 1
    }));

    // Sort by start time, then by end time (shorter events first)
    eventsWithTimes.sort((a, b) => {
      if (a.startTime === b.startTime) {
        return a.endTime - b.endTime;
      }
      return a.startTime - b.startTime;
    });

    // Group overlapping events
    const groups = [];
    
    for (let i = 0; i < eventsWithTimes.length; i++) {
      const currentEvent = eventsWithTimes[i];
      let addedToGroup = false;
      
      // Try to add to existing group
      for (let group of groups) {
        let overlapsWithGroup = false;
        
        // Check if current event overlaps with any event in this group
        for (let groupEvent of group) {
          if (currentEvent.startTime < groupEvent.endTime && currentEvent.endTime > groupEvent.startTime) {
            overlapsWithGroup = true;
            break;
          }
        }
        
        if (overlapsWithGroup) {
          group.push(currentEvent);
          addedToGroup = true;
          break;
        }
      }
      
      // If not added to any group, create new group
      if (!addedToGroup) {
        groups.push([currentEvent]);
      }
    }

    // Assign columns within each group
    groups.forEach(group => {
      if (group.length === 1) {
        group[0].column = 0;
        group[0].totalColumns = 1;
      } else {
        // Sort group by start time
        group.sort((a, b) => {
          if (a.startTime === b.startTime) {
            return a.endTime - b.endTime;
          }
          return a.startTime - b.startTime;
        });

        // Assign columns using a greedy algorithm
        const columns = [];
        
        group.forEach(event => {
          let assignedColumn = 0;
          
          // Find the first available column
          while (assignedColumn < columns.length) {
            const columnEvents = columns[assignedColumn];
            let canUseColumn = true;
            
            // Check if this event overlaps with any event in this column
            for (let columnEvent of columnEvents) {
              if (event.startTime < columnEvent.endTime && event.endTime > columnEvent.startTime) {
                canUseColumn = false;
                break;
              }
            }
            
            if (canUseColumn) {
              break;
            }
            assignedColumn++;
          }
          
          // If no existing column works, create a new one
          if (assignedColumn >= columns.length) {
            columns.push([]);
          }
          
          columns[assignedColumn].push(event);
          event.column = assignedColumn;
          event.totalColumns = Math.max(columns.length, group.length);
        });

        // Update totalColumns for all events in the group
        const totalColumns = columns.length;
        group.forEach(event => {
          event.totalColumns = totalColumns;
        });
      }
    });

    return eventsWithTimes;
  };

  const renderEvents = () => {
    if (view === 'day') {
      // Filter events for the current day
      const dayEvents = events.filter(event => {
        const eventDate = new Date(event.start);
        const currentDateStart = new Date(currentDate);
        
        return eventDate.getDate() === currentDateStart.getDate() &&
               eventDate.getMonth() === currentDateStart.getMonth() &&
               eventDate.getFullYear() === currentDateStart.getFullYear();
      });

      // Calculate overlaps and positioning
      const eventsWithPositions = calculateEventOverlaps(dayEvents);

      return eventsWithPositions.map(event => {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        const top = (eventStart.getHours() + eventStart.getMinutes() / 60) * 50;
        const duration = (eventEnd - eventStart) / (1000 * 60 * 60);
        const height = duration * 50;

        // Calculate width and left position based on overlaps
        const widthPercentage = 100 / event.totalColumns;
        const leftPercentage = (event.column * widthPercentage);
        const marginLeft = 10; // Base margin
        const marginRight = 10; // Base margin
        const availableWidth = `calc(${widthPercentage}% - ${marginLeft + marginRight}px)`;
        const leftPosition = `calc(${leftPercentage}% + ${marginLeft}px)`;

        // Override colors for validated events
        let eventToRender = { ...event };
        if (validatedEvents && validatedEvents.has(event.id)) {
          eventToRender = {
            ...event,
            color: '#0f54bc',  // Blue for validated
            color1: '#a8c1ff',
            color2: '#4da6fb',
            isValidated: true
          };
        } else if (event.isValidated === false || (!event.fromDatabase && !event.isValidated)) {
          eventToRender = {
            ...event,
            color: '#8c8c8c',  // Grey for unvalidated
            color1: '#e6e6e6',
            color2: '#b3b3b3',
            isValidated: false
          };
        }

        return (
          <Event
            key={event.id}
            {...eventToRender}
            isSelected={event.id === selectedEventId}
            style={{
              width: availableWidth,
              left: leftPosition,
              top: `${top}px`,
              height: `${height}px`,
              position: 'absolute'
            }}
            overlapInfo={{
              column: event.column,
              totalColumns: event.totalColumns,
              widthPercentage,
              leftPercentage
            }}
            currentDate={currentDate}
            weekScrollOffset={weekScrollOffset}
            onClick={(e) => handleEventClick(event, e)}
            onRightClick={(e) => handleEventRightClick(event, e)}
            onResize={(newStart, newEnd, isTemporary = false) => handleEventResize(event.id, newStart, newEnd, isTemporary)}
            onMove={(newStart, newEnd, isTemporary = false) => handleEventMove(event.id, newStart, newEnd, isTemporary)}
            onChangeComplete={handleEventChangeComplete}
          />
        );
      });
    }

    // Original week view rendering logic
    const currentWeekEvents = getEventsForCurrentWeek(events);
    // Sort events strictly by start time to handle overlaps correctly
    const sortedEvents = [...currentWeekEvents].sort((a, b) => {
      const startA = new Date(a.start).getTime();
      const startB = new Date(b.start).getTime();
      return startA - startB;
    });

    return sortedEvents.map(event => {
      const startDate = new Date(event.start);
      const endDate = new Date(event.end);
      const eventComponents = [];
      
      // Override colors for validated events
      let eventToRender = { ...event };
      if (validatedEvents && validatedEvents.has(event.id)) {
        eventToRender = {
          ...event,
          color: '#0f54bc',  // Blue for validated
          color1: '#a8c1ff',
          color2: '#4da6fb',
          isValidated: true
        };
      } else if (event.isValidated === false || (!event.fromDatabase && !event.isValidated)) {
        eventToRender = {
          ...event,
          color: '#8c8c8c',  // Grey for unvalidated
          color1: '#e6e6e6',
          color2: '#b3b3b3',
          isValidated: false
        };
      }
      
      // Check if event spans multiple days
      const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= 1) {
        // Single day event
        eventComponents.push(
          <Event
            key={event.id}
            {...eventToRender}
            isSelected={event.id === selectedEventId}
            currentDate={currentDate}
            weekScrollOffset={weekScrollOffset}
            onClick={(e) => handleEventClick(event, e)}
            onRightClick={(e) => handleEventRightClick(event, e)}
            onResize={(newStart, newEnd, isTemporary = false) => handleEventResize(event.id, newStart, newEnd, isTemporary)}
            onMove={(newStart, newEnd, isTemporary = false) => handleEventMove(event.id, newStart, newEnd, isTemporary)}
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
          const currentDay = new Date(startDate);
          currentDay.setDate(startDate.getDate() + i);
          
          // Compare only date parts (ignore time) for proper boundary checking
          const currentDayDateOnly = new Date(currentDay.getFullYear(), currentDay.getMonth(), currentDay.getDate());
          const weekStartDateOnly = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
          const weekEndDateOnly = new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate());
          
          // Skip if day is not in current week
          if (currentDayDateOnly < weekStartDateOnly || currentDayDateOnly > weekEndDateOnly) continue;
          
          const isFirstDay = i === 0;
          const isLastDay = i === daysDiff - 1;
          
          eventComponents.push(
            <Event
              key={`${event.id}-${i}`}
              {...eventToRender}
              start={startDate}
              end={endDate}
              isSelected={event.id === selectedEventId}
              isMultiDay={true}
              isFirstDay={isFirstDay}
              isLastDay={isLastDay}
              currentDate={currentDate}
              currentDayIndex={i}
              weekScrollOffset={weekScrollOffset}
              onClick={(e) => handleEventClick(event, e)}
              onRightClick={(e) => handleEventRightClick(event, e)}
              onResize={(newStart, newEnd, isTemporary = false) => handleEventResize(event.id, newStart, newEnd, isTemporary)}
              onMove={(newStart, newEnd, isTemporary = false) => handleEventMove(event.id, newStart, newEnd, isTemporary)}
              onChangeComplete={handleEventChangeComplete}
            />
          );
        }
      }
      
      return eventComponents;
    }).flat();
  };

  const handleMouseDown = (e) => {
    // Only handle left clicks
    if (e.button !== 0) return;
    
    setIsDragging(true);
    setDragStartY(e.clientY);
    onMouseDown(e);
  };

  const handleMouseMove = (e) => {
    if (isDragging || isResizing) {
      checkAutoScroll(e.clientY);
    }
    onMouseMove(e);
  };

  const handleMouseUp = (e) => {
    setIsDragging(false);
    setIsResizing(false);
    setDragStartY(null);
    stopAutoScroll();
    onMouseUp(e);
  };

  const handleMouseLeave = (e) => {
    setIsDragging(false);
    setIsResizing(false);
    setDragStartY(null);
    stopAutoScroll();
    onMouseLeave(e);
  };

  return (
    <div 
      className="time-grid" 
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onContextMenu={(e) => {
        // Prevent default context menu on time grid
        e.preventDefault();
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
      {renderDraggingNewEvent()}
    </div>
  );
};

export default TimeGrid; 