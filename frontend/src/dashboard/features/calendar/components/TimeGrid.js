import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { generateTimeSlots, formatTime } from '../utils/dateHelpers';
import { calculateEventPosition } from '../utils/eventUtils';
import { FIRST_HOUR, LAST_HOUR, TIME_SLOT_HEIGHT } from '../utils/constants';
import styles from './timeGrid.module.css';

const TimeGrid = ({ 
  view, 
  events,
  selectedEventId,
  handleEventClick,
  handleTimeSlotMouseDown,
  handleTimeSlotMouseMove,
  handleTimeSlotMouseUp,
  isDraggingNewEvent,
  newEventStart,
  newEventEnd
}) => {
  const { t } = useTranslation();
  const gridRef = useRef(null);
  
  const timeSlots = generateTimeSlots(FIRST_HOUR, LAST_HOUR);
  
  // Determine the number of columns based on view
  const columns = view === 'week' ? 7 : 1;
  
  // Calculate new event position if dragging
  const getNewEventStyles = () => {
    if (!isDraggingNewEvent || !newEventStart || !newEventEnd) return null;
    
    // Calculate position similar to event position
    const startHour = newEventStart.getHours();
    const startMinute = newEventStart.getMinutes();
    const startInMinutes = startHour * 60 + startMinute;
    
    const endHour = newEventEnd.getHours();
    const endMinute = newEventEnd.getMinutes();
    const endInMinutes = endHour * 60 + endMinute;
    const durationInMinutes = endInMinutes - startInMinutes;
    
    // Calculate height based on duration
    const height = (durationInMinutes / 60) * TIME_SLOT_HEIGHT;
    
    // For week view, calculate the day of week (0-6, Monday to Sunday)
    let dayOfWeek = 0;
    if (view === 'week') {
      dayOfWeek = newEventStart.getDay();
      // Convert from Sunday=0 to Monday=0
      dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    }
    
    // Calculate positions
    const top = (startInMinutes / 60) * TIME_SLOT_HEIGHT;
    const left = view === 'week' ? (dayOfWeek / 7) * 100 : 0;
    const width = view === 'week' ? 100 / 7 : 100;
    
    return {
      top: `${top}px`,
      left: `${left}%`,
      height: `${height}px`,
      width: `${width}%`
    };
  };
  
  // Get time for a specific position in the grid
  const getTimeFromPosition = (y, column = 0) => {
    const rect = gridRef.current.getBoundingClientRect();
    const relativeY = y - rect.top;
    
    // Calculate hour based on position and slot height
    const totalMinutes = (relativeY / TIME_SLOT_HEIGHT) * 60;
    const hours = Math.floor(totalMinutes / 60) + FIRST_HOUR;
    const minutes = Math.floor(totalMinutes % 60);
    
    // Create a date object with the current date
    const time = new Date();
    time.setHours(hours, minutes, 0, 0);
    
    // Adjust for column (day of week) if in week view
    if (view === 'week' && column > 0) {
      time.setDate(time.getDate() - time.getDay() + column + (time.getDay() === 0 ? -6 : 1));
    }
    
    return time;
  };
  
  // Handle mouse down on the grid
  const onMouseDown = (e) => {
    if (e.target === gridRef.current || e.target.classList.contains(styles.timeSlot)) {
      const rect = gridRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const column = Math.floor((relativeX / rect.width) * columns);
      
      const time = getTimeFromPosition(e.clientY, column);
      handleTimeSlotMouseDown(time);
    }
  };
  
  // Handle mouse move on the grid
  const onMouseMove = (e) => {
    if (isDraggingNewEvent) {
      const rect = gridRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const column = Math.floor((relativeX / rect.width) * columns);
      
      const time = getTimeFromPosition(e.clientY, column);
      handleTimeSlotMouseMove(time);
      
      // Ensure autoscroll when dragging near the edges
      const containerRect = gridRef.current.parentElement.getBoundingClientRect();
      const scrollThreshold = 40;
      
      if (e.clientY - containerRect.top < scrollThreshold) {
        // Near top edge - scroll up
        gridRef.current.parentElement.scrollTop -= 10;
      } else if (containerRect.bottom - e.clientY < scrollThreshold) {
        // Near bottom edge - scroll down
        gridRef.current.parentElement.scrollTop += 10;
      }
    }
  };
  
  return (
    <div 
      className={styles.timeGridContainer}
      onMouseUp={handleTimeSlotMouseUp}
      onMouseLeave={handleTimeSlotMouseUp}
    >
      {/* Time labels column */}
      <div className={styles.timeLabels}>
        {timeSlots.map((slot, index) => (
          <div key={index} className={styles.timeLabel}>
            <span>{slot.label}</span>
          </div>
        ))}
      </div>
      
      {/* Main grid */}
      <div 
        className={styles.gridWrapper}
        style={{ 
          '--columns': columns,
          '--time-slot-height': `${TIME_SLOT_HEIGHT}px` 
        }}
      >
        <div 
          ref={gridRef}
          className={styles.grid}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
        >
          {/* Time grid slots */}
          {timeSlots.map((slot, rowIndex) => (
            <React.Fragment key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <div 
                  key={`${rowIndex}-${colIndex}`}
                  className={styles.timeSlot}
                  style={{
                    gridRow: rowIndex + 1,
                    gridColumn: colIndex + 1
                  }}
                />
              ))}
            </React.Fragment>
          ))}
          
          {/* Events */}
          {events.map(event => {
            const position = calculateEventPosition(event, view, TIME_SLOT_HEIGHT);
            
            return (
              <div
                key={event.id}
                className={`${styles.event} ${event.id === selectedEventId ? styles.selectedEvent : ''}`}
                style={{
                  top: position.top,
                  left: position.left,
                  height: position.height,
                  width: position.width,
                  backgroundColor: event.color1 || '#e1e1e1',
                  borderLeft: `4px solid ${event.color || '#4a90e2'}`
                }}
                onClick={() => handleEventClick(event)}
              >
                <div className={styles.eventContent}>
                  <div className={styles.eventTitle}>{event.title}</div>
                  <div className={styles.eventTime}>
                    {formatTime(new Date(event.start))} - {formatTime(new Date(event.end))}
                  </div>
                  {event.location && (
                    <div className={styles.eventLocation}>
                      {event.location}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
          {/* New event preview when dragging */}
          {isDraggingNewEvent && newEventStart && newEventEnd && (
            <div
              className={`${styles.event} ${styles.newEvent}`}
              style={{
                ...getNewEventStyles(),
                backgroundColor: 'rgba(74, 144, 226, 0.3)',
                borderLeft: '4px solid #4a90e2'
              }}
            >
              <div className={styles.eventContent}>
                <div className={styles.eventTitle}>
                  {t('dashboard.calendar.newEvent')}
                </div>
                <div className={styles.eventTime}>
                  {formatTime(newEventStart)} - {formatTime(newEventEnd)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimeGrid; 