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
  visibleWeekEnd
}) => {
  const { t } = useTranslation();

  if (isSidebarCollapsed) {
    return null;
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div className={cn(
      "h-full flex flex-col overflow-y-auto custom-scrollbar",
      isMobile ? "gap-0" : "gap-4"
    )} style={{ scrollbarGutter: 'stable' }}>
      {/* Mini Calendar Section */}
      <div className={isMobile ? "mb-0" : ""}>
        <MiniCalendar
          currentDate={currentDate}
          onDateClick={handleDayClick}
          events={events}
          view={view}
          visibleWeekStart={visibleWeekStart}
          visibleWeekEnd={visibleWeekEnd}
        />
      </div>

      {/* Upcoming Events Section - Redesigned */}
      <div className={cn(
        "flex-1 flex flex-col min-h-0 bg-card border p-0 overflow-hidden shadow-sm",
        isMobile ? "rounded-none border-x-0 border-b-0 border-t" : "rounded-xl border-border/60"
      )}>
        <div className="flex items-center justify-center px-4 pt-4 pb-2 border-b border-border/50 bg-muted/20">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 m-0">
            <FiCalendar className="w-4 h-4 text-primary" />
            {t('calendar:upcomingEvents')}
          </h4>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2" style={{ scrollbarGutter: 'stable' }}>
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
                    {/* Date Box */}
                    <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-primary/5 border border-primary/10 shrink-0 group-hover:bg-primary/10 transition-colors">
                      <span className="text-[10px] uppercase font-bold text-primary/70">
                        {new Date(event.start).toLocaleDateString(undefined, { month: 'short' })}
                      </span>
                      <span className="text-xl font-bold text-primary leading-none mt-0.5">
                        {new Date(event.start).getDate()}
                      </span>
                    </div>

                    {/* Event Details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h5 className="text-sm font-medium text-foreground truncate">{event.title || t('calendar:untitledEvent')}</h5>
                      <div className="flex items-center gap-3 mt-1 text-muted-foreground">
                        <span className="flex items-center gap-1" style={{ fontSize: 'var(--font-size-small)' }}>
                          <FiClock className="w-3 h-3" />
                          <span style={{ fontSize: 'var(--font-size-small)' }}>
                            {new Date(event.start).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })} - {new Date(event.end).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}
                          </span>
                        </span>
                        {event.location && (
                          <span className="flex items-center gap-1 truncate">
                            <FiMapPin className="w-3 h-3" />
                            <span className="truncate max-w-[100px]">{event.location}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 duration-200">
                      <FiChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground">
              <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                <FiCalendar className="w-5 h-5 opacity-40" />
              </div>
              <p className="text-sm font-medium">{t('calendar:noUpcomingEvents')}</p>
              <p className="text-xs opacity-60 mt-1">{t('calendar:checkBackLater')}</p>
            </div>
          )}
        </div>
      </div>
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
  visibleWeekEnd: PropTypes.instanceOf(Date)
};

export default CalendarSidebar;