import React from 'react';
import { formatTime } from '../utils/dateHelpers';
import styles from './event.module.css';

const Event = ({ 
  event, 
  position, 
  isSelected, 
  onClick,
  onDelete
}) => {
  const handleClick = (e) => {
    e.stopPropagation();
    onClick(event);
  };
  
  const handleDeleteClick = (e) => {
    e.stopPropagation();
    onDelete(event);
  };
  
  return (
    <div 
      className={`${styles.event} ${isSelected ? styles.selected : ''}`}
      style={{
        top: `${position.top}px`,
        left: position.left,
        height: `${position.height}px`,
        width: position.width,
        backgroundColor: event.color1 || '#e9f2ff',
        borderLeft: `4px solid ${event.color || '#4a90e2'}`
      }}
      onClick={handleClick}
      data-event-id={event.id}
    >
      <div className={styles.eventContent}>
        <div className={styles.eventTitle}>{event.title}</div>
        {position.height > 40 && (
          <>
            <div className={styles.eventTime}>
              {formatTime(new Date(event.start))} - {formatTime(new Date(event.end))}
            </div>
            {event.location && position.height > 60 && (
              <div className={styles.eventLocation}>{event.location}</div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Event; 