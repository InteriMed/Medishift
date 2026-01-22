import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import MiniCalendar from '../miniCalendar/MiniCalendar';
import { cn } from '../../../../utils/cn';
import { FiCalendar, FiClock, FiMapPin, FiChevronRight } from 'react-icons/fi';

const CalendarSidebar = ({
  currentDate,
  setCurrentDate,
  handleDayClick,
  events,
  handleUpcomingEventClick,
  isSidebarCollapsed,
  toggleSidebar,
  view,
  visibleWeekStart,
  visibleWeekEnd,
  showMiniCalendar = true,
  showUpcomingEvents = true
}) => {
  const { t } = useTranslation();

  if (isSidebarCollapsed) {
    return null;
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      {showMiniCalendar && (
        <MiniCalendar
          currentDate={currentDate}
          onDateClick={handleDayClick}
          events={events}
          view={view}
          visibleWeekStart={visibleWeekStart}
          visibleWeekEnd={visibleWeekEnd}
        />
      )}

      {showUpcomingEvents && (
        <div className="flex-1 flex flex-col min-h-0 bg-card backdrop-blur-sm rounded-2xl overflow-hidden">
          <div className="flex flex-col px-6 py-3 border-b border-border mb-4">
            <h4 className="text-xl font-bold m-0" style={{ color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
              {t('calendar:upcomingEvents')}
            </h4>
          </div>

          <div className="flex-1 overflow-y-auto p-4" style={{ scrollbarGutter: 'stable' }}>
            {events && events.length > 0 ? (
              <div className="space-y-1">
                {events
                  .filter(event => new Date(event.start) > new Date())
                  .sort((a, b) => new Date(a.start) - new Date(b.start))
                  .slice(0, 5)
                  .map((event, index) => (
                    <div
                      key={index}
                      className="group flex gap-3 p-3 rounded-lg hover:bg-muted/50 transition-all duration-200 cursor-pointer border border-transparent hover:border-border/50"
                      onClick={() => handleUpcomingEventClick(event.start)}
                    >
                      <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-primary/5 border border-primary/10 shrink-0 group-hover:bg-primary/10 transition-colors">
                        <span className="text-[10px] uppercase font-bold text-primary/70">
                          {new Date(event.start).toLocaleDateString(undefined, { month: 'short' })}
                        </span>
                        <span className="text-lg font-bold text-primary leading-none mt-0.5">
                          {new Date(event.start).getDate()}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <h5 className="text-xs font-medium text-foreground truncate">{event.title || t('calendar:untitledEvent')}</h5>
                        <div className="flex items-center gap-3 mt-1 text-muted-foreground">
                          <span className="flex items-center gap-1" style={{ fontSize: '10px' }}>
                            <FiClock className="w-2.5 h-2.5" />
                            <span style={{ fontSize: '10px' }}>
                              {new Date(event.start).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })} - {new Date(event.end).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}
                            </span>
                          </span>
                          {event.location && (
                            <span className="flex items-center gap-1 truncate">
                              <FiMapPin className="w-2.5 h-2.5" />
                              <span className="truncate max-w-[100px]" style={{ fontSize: '10px' }}>{event.location}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 duration-200">
                        <FiChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 ring-4 ring-background">
                  <FiCalendar className="w-8 h-8" style={{ color: 'var(--primary-color)' }} />
                </div>
                <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>{t('calendar:noUpcomingEvents')}</h2>
                <p className="mb-6" style={{ color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>{t('calendar:checkBackLater')}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

CalendarSidebar.propTypes = {
  currentDate: PropTypes.instanceOf(Date).isRequired,
  setCurrentDate: PropTypes.func.isRequired,
  handleDayClick: PropTypes.func.isRequired,
  events: PropTypes.array.isRequired,
  handleUpcomingEventClick: PropTypes.func.isRequired,
  isSidebarCollapsed: PropTypes.bool.isRequired,
  toggleSidebar: PropTypes.func.isRequired,
  view: PropTypes.oneOf(['day', 'week']),
  visibleWeekStart: PropTypes.instanceOf(Date),
  visibleWeekEnd: PropTypes.instanceOf(Date),
  showMiniCalendar: PropTypes.bool,
  showUpcomingEvents: PropTypes.bool
};

export default CalendarSidebar;