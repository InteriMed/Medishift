import React from 'react';
import { useTranslation } from 'react-i18next';
import MiniCalendar from './miniCalendar/MiniCalendar';
import styles from './calendarSidebar.module.css';

const CalendarSidebar = ({ 
  currentDate, 
  setCurrentDate, 
  handleDayClick,
  categories,
  handleCategoryToggle,
  events 
}) => {
  const { t } = useTranslation();
  
  return (
    <div className={styles.sidebarContainer}>
      <div className={styles.section}>
        <MiniCalendar 
          currentDate={currentDate}
          onDateClick={handleDayClick}
          events={events}
        />
      </div>
      
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('dashboard.calendar.categories')}</h3>
        <div className={styles.categoriesList}>
          {categories.map((category, index) => (
            <div key={index} className={styles.categoryItem}>
              <label className={styles.categoryLabel}>
                <input 
                  type="checkbox"
                  checked={category.checked}
                  onChange={() => handleCategoryToggle(index)}
                  className={styles.categoryCheckbox}
                />
                <span 
                  className={styles.categoryColor} 
                  style={{ backgroundColor: category.color }}
                />
                <span className={styles.categoryName}>{category.name}</span>
              </label>
            </div>
          ))}
        </div>
      </div>
      
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('dashboard.calendar.upcomingEvents')}</h3>
        {events && events.length > 0 ? (
          <div className={styles.upcomingEventsList}>
            {events
              .filter(event => new Date(event.start) >= new Date())
              .sort((a, b) => new Date(a.start) - new Date(b.start))
              .slice(0, 3)
              .map((event, index) => (
                <div key={index} className={styles.upcomingEvent}>
                  <div 
                    className={styles.eventIndicator}
                    style={{ backgroundColor: event.color }}
                  />
                  <div className={styles.eventDetails}>
                    <h4 className={styles.eventTitle}>{event.title}</h4>
                    <p className={styles.eventTime}>
                      {new Date(event.start).toLocaleTimeString(undefined, { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: false 
                      })}
                      {event.location && (
                        <span className={styles.eventLocation}> • {event.location}</span>
                      )}
                    </p>
                  </div>
                </div>
              ))
            }
          </div>
        ) : (
          <p className={styles.noEvents}>{t('dashboard.calendar.noUpcomingEvents')}</p>
        )}
      </div>
    </div>
  );
};

export default CalendarSidebar; 