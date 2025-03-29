import React, { useState } from 'react';
import './Event.css';

const Event = ({ start, end, title, color, color1, isSelected, onClick, onResize, onMove, onChangeComplete, isMultiDay, isFirstDay, isLastDay, isRecurring = false, notes, location, employees }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const calculatePosition = () => {
    const dayWidth = 100 / 7;
    const dayIndex = start.getDay() === 0 ? 6 : start.getDay() - 1;
    const hour = start.getHours() + start.getMinutes() / 60;
    const duration = isMultiDay 
      ? (isLastDay ? end.getHours() + end.getMinutes() / 60 : 24) - 
        (isFirstDay ? hour : 0)
      : (end.getHours() + end.getMinutes() / 60) - hour;

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
  };

  const handleDragStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.target.classList.contains('resize-handle-top') || 
        e.target.classList.contains('resize-handle-bottom')) {
      return;
    }

    const startTime = new Date(start);
    const endTime = new Date(end);
    const duration = endTime - startTime;
    const initialMouseY = e.clientY;
    const initialMouseX = e.clientX;
    const timeGrid = e.currentTarget.closest('.time-grid');
    const gridRect = timeGrid.getBoundingClientRect();
    const initialDayIndex = Math.floor(((e.clientX - gridRect.left) / gridRect.width) * 7);

    const handleMouseMove = (e) => {
      e.preventDefault();
      e.stopPropagation();

      const deltaY = e.clientY - initialMouseY;
      const currentX = e.clientX - gridRect.left;
      const newDayIndex = Math.floor((currentX / gridRect.width) * 7);
      
      // Calculate hour delta based on vertical movement
      const hourDelta = Math.round(deltaY / 50);
      
      // Only update if we're within the grid bounds
      if (newDayIndex >= 0 && newDayIndex < 7) {
        const daysDelta = newDayIndex - initialDayIndex;
        
        const newStart = new Date(startTime);
        const newEnd = new Date(endTime);

        // Adjust hours
        const updatedHours = startTime.getHours() + hourDelta;
        if (updatedHours >= 0 && updatedHours < 24) {
          newStart.setHours(updatedHours);
          newEnd.setTime(newStart.getTime() + duration);
        }

        // Adjust days
        if (daysDelta !== 0) {
          newStart.setDate(newStart.getDate() + daysDelta);
          newEnd.setDate(newEnd.getDate() + daysDelta);
        }

        onMove(newStart, newEnd);
      }
    };

    const handleMouseUp = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      onChangeComplete();
    };

    setIsDragging(true);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleResizeStart = (e, direction) => {
    e.preventDefault();
    e.stopPropagation();
    
    const startTime = new Date(start);
    const endTime = new Date(end);
    const initialMouseY = e.clientY;
    const initialMouseX = e.clientX;
    const timeGrid = e.currentTarget.closest('.time-grid');
    const gridRect = timeGrid.getBoundingClientRect();
    const initialDayIndex = Math.floor(((e.clientX - gridRect.left) / gridRect.width) * 7);

    const handleMouseMove = (e) => {
      e.preventDefault();
      e.stopPropagation();

      const deltaY = e.clientY - initialMouseY;
      const currentX = e.clientX - gridRect.left;
      const newDayIndex = Math.floor((currentX / gridRect.width) * 7);
      const hourDelta = Math.round(deltaY / 50);

      // Only proceed if we're within grid bounds
      if (newDayIndex >= 0 && newDayIndex < 7) {
        const daysDelta = newDayIndex - initialDayIndex;
        
        if (direction === 'top') {
          const newStart = new Date(startTime);
          const updatedHours = startTime.getHours() + hourDelta;
          
          if (updatedHours >= 0 && updatedHours < 24) {
            newStart.setHours(updatedHours);
            if (daysDelta !== 0) {
              newStart.setDate(newStart.getDate() + daysDelta);
            }
            // Only update if the new start is before end
            if (newStart < endTime) {
              if (isRecurring) {
                onResize(newStart, end, true);
              } else {
                onResize(newStart, end);
              }
            }
          }
        } else {
          const newEnd = new Date(endTime);
          const updatedHours = endTime.getHours() + hourDelta;
          
          if (updatedHours > 0 && updatedHours <= 24) {
            newEnd.setHours(updatedHours);
            if (daysDelta !== 0) {
              newEnd.setDate(newEnd.getDate() + daysDelta);
            }
            // Only update if the new end is after start
            if (newEnd > startTime) {
              if (isRecurring) {
                onResize(start, newEnd, true);
              } else {
                onResize(start, newEnd);
              }
            }
          }
        }
      }
    };

    const handleMouseUp = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      if (isRecurring) {
        onResize(start, end, false, true);
      }
      onChangeComplete();
    };

    setIsResizing(true);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleEventClick = (e) => {
    if (!isResizing && !isDragging) {
      onClick(e);
    }
  };

  const formatEventTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).toLowerCase();
  };

  const position = calculatePosition();
  
  const hexToRgba = (hex, opacity) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  return (
    <div
      className={`calendar-event ${isSelected ? 'selected' : ''} ${isMultiDay ? 'multi-day' : ''} ${isDragging ? 'dragging' : ''}`}
      style={{
        ...position,
        backgroundColor: hexToRgba(color1, 0.5),
        borderLeft: `4px solid ${color}`,
        position: 'absolute',
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onClick={handleEventClick}
      onMouseDown={handleDragStart}
      onDoubleClick={(e) => e.preventDefault()}
    >
      {isRecurring && (
        <div className="recurring-indicator">
          <i className="fas fa-redo-alt" style={{ color: color }}></i>
        </div>
      )}
      <div 
        className="resize-handle-top"
        onMouseDown={(e) => handleResizeStart(e, 'top')}
      />
      <div className="event-content">
        <div className="event-title" style={{ color }}>{title || 'New Event'}</div>
        <div className="event-time" style={{ color }}>{formatEventTime(start)} - {formatEventTime(end)}</div>
        {location && <div className="event-location" style={{ color }}>📍 {location}</div>}
        {employees && <div className="event-employees" style={{ color }}>👥 {employees}</div>}
        {notes && <div className="event-notes" style={{ color }}>{notes}</div>}
      </div>
      <div 
        className="resize-handle-bottom"
        onMouseDown={(e) => handleResizeStart(e, 'bottom')}
      />
    </div>
  );
};

export default Event;
