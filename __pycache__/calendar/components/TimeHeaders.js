import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getShortDays, getWeekDates, getDaysAroundCurrent, getScrollableWeekDates, getScrollableShortDays, isSameDay, getScrollableDaysAroundCurrent } from '../utils/dateHelpers';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const TimeHeaders = ({ 
  view, 
  currentDate, 
  setView, 
  handleDayClick, 
  slideDirection, 
  setSlideDirection, 
  onEventDropOnDay,
  weekScrollOffset = 0,
  onWeekScroll,
  dayScrollOffset = 0,
  onDayScroll
}) => {
  const { t, i18n } = useTranslation();
  const [dragOverDay, setDragOverDay] = useState(null);

  // Handler specifically for day header clicks - always opens day view
  const handleDayHeaderClick = (date) => {
    const direction = date > currentDate ? 1 : -1;
    setSlideDirection(direction > 0 ? 'left' : 'right');
    
    // Set the current date
    handleDayClick(date);
    
    // Always set to day view when clicking on day headers
    setView('day');
  };

  const handleDragOver = (e, date) => {
    e.preventDefault();
    setDragOverDay(date);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOverDay(null);
  };

  const handleDrop = (e, date) => {
    e.preventDefault();
    setDragOverDay(null);
    
    // Get the dragged event data
    const eventData = e.dataTransfer.getData('text/plain');
    if (eventData && onEventDropOnDay) {
      try {
        const draggedEvent = JSON.parse(eventData);
        onEventDropOnDay(draggedEvent, date);
      } catch (error) {
        console.error('Error parsing dragged event data:', error);
      }
    }
  };

  const renderDayViewHeaders = () => {
    const surroundingDays = getScrollableDaysAroundCurrent(currentDate, dayScrollOffset);
    
    const handleScrollbarChange = (e) => {
      const value = parseInt(e.target.value);
      const direction = value - dayScrollOffset;
      
      // Allow internal scrolling during drag - no day navigation yet
      if (direction !== 0) {
        onDayScroll(direction, true);
      }
    };

    const handleScrollbarMouseUp = (e) => {
      const value = parseInt(e.target.value);
      
      // Check if we're at the extremities for day navigation on release
      if (value === -7) {
        // At left extremity - navigate to previous day and reset to center
        onDayScroll(-1, false);
      } else if (value === 7) {
        // At right extremity - navigate to next day and reset to center
        onDayScroll(1, false);
      }
    };
    
    return (        
      <div className="time-headers sticky-dates time-headers-padded day-view-headers">
        {surroundingDays.map((date, index) => {
          const isCurrentDay = date.getDate() === currentDate.getDate() &&
            date.getMonth() === currentDate.getMonth() &&
            date.getFullYear() === currentDate.getFullYear();
          
          const distanceFromCenter = Math.abs(3 - index);
          const yOffset = distanceFromCenter * 3;
          const isDragOver = dragOverDay && dragOverDay.getTime() === date.getTime();
          
          return (
            <div 
              key={index} 
              className={`day-header ${slideDirection ? `sliding-${slideDirection}` : ''} ${isDragOver ? 'drag-over' : ''}`}
              onClick={() => handleDayHeaderClick(date)}
              onDragOver={(e) => handleDragOver(e, date)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, date)}
              onAnimationEnd={() => {
                if (isCurrentDay) {
                  setSlideDirection(null);
                }
              }}
              style={{ 
                cursor: 'pointer',
                opacity: 1 - (distanceFromCenter * 0.3),
                '--y-offset': `${yOffset}px`,
                transform: `translateY(${yOffset}px)`,
                fontSize: `${100 - (distanceFromCenter * 20)}%`,
                backgroundColor: isDragOver ? 'var(--color-logo-1)' : 'transparent',
                borderRadius: isDragOver ? '8px' : '0',
                transition: 'all 0.2s ease'
              }}
            >
              <div className="day-name">
                {date.toLocaleString(i18n.language, { weekday: 'short' }).slice(0, 3)}
              </div>
              <div className="day-number">{date.getDate()}</div>
            </div>
          );
        })}
        
        {/* Day scrollbar positioned within header */}
        <div className="week-scrollbar-header">
          <input
            type="range"
            min="-7"
            max="7"
            value={dayScrollOffset}
            onChange={handleScrollbarChange}
            onMouseUp={handleScrollbarMouseUp}
            onTouchEnd={handleScrollbarMouseUp}
            className="week-scrollbar-horizontal"
          />
        </div>
      </div>
    );
  };

  const renderWeekViewHeaders = () => {
    const scrollableWeekDates = getScrollableWeekDates(currentDate, weekScrollOffset);
    const scrollableShortDays = getScrollableShortDays('en-US', weekScrollOffset);

    const handleScrollbarChange = (e) => {
      const value = parseInt(e.target.value);
      const direction = value - weekScrollOffset;
      
      // Allow internal scrolling during drag - no week navigation yet
      if (direction !== 0) {
        onWeekScroll(direction, true);
      }
    };

    const handleScrollbarMouseUp = (e) => {
      const value = parseInt(e.target.value);
      
      // Check if we're at the extremities for week navigation on release
      if (value === -7) {
        // At left extremity - navigate to previous week and reset to center
        onWeekScroll(-1, false);
      } else if (value === 7) {
        // At right extremity - navigate to next week and reset to center
        onWeekScroll(1, false);
      }
    };

    return (
      <div className="time-headers">
        {scrollableWeekDates.map((date, index) => (
          <div
            key={index}
            className={`day-header ${isSameDay(date, new Date()) ? 'current-day' : ''}`}
            onClick={() => handleDayHeaderClick(date)}
            onDragOver={(e) => handleDragOver(e, date)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, date)}
          >
            <div className="day-name">{scrollableShortDays[index]}</div>
            <div className="day-number">{date.getDate()}</div>
          </div>
        ))}
        
        {/* Week scrollbar positioned within header */}
        <div className="week-scrollbar-header">
          <input
            type="range"
            min="-7"
            max="7"
            value={weekScrollOffset}
            onChange={handleScrollbarChange}
            onMouseUp={handleScrollbarMouseUp}
            onTouchEnd={handleScrollbarMouseUp}
            className="week-scrollbar-horizontal"
          />
        </div>
      </div>
    );
  };

  return view === 'day' ? renderDayViewHeaders() : renderWeekViewHeaders();
};

export default TimeHeaders; 