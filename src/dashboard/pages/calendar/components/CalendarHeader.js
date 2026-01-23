import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiSliders, FiX, FiCalendar, FiClock, FiPlus } from 'react-icons/fi';
import { cn } from '../../../../utils/cn';
const CalendarHeader = ({
  currentDate,
  view,
  setView,
  navigateDate,
  setCurrentDate,
  categories,
  handleCategoryToggle,
  onResetCategories,
  isTopBarMode = false,
  onShowFiltersOverlay,
  scrollContainerRef,
  isSidebarCollapsed,
  toggleSidebar,
  calendarMode,
  setCalendarMode,
  isTeamWorkspace = false,
  handleCreateEventClick,
  showMiniCalendar,
  setShowMiniCalendar,
  showUpcomingEvents,
  setShowUpcomingEvents,
}) => {
  const { t } = useTranslation();
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryDropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target)) {
        setShowCategoryDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeCategoriesCount = categories.filter(cat => cat.checked).length;
  const totalCategories = categories.length;
  const hasActiveFilters = activeCategoriesCount < totalCategories;

  return (
    <div className={cn(
      "flex flex-col md:flex-row items-center justify-between gap-4 w-full",
      isTopBarMode && "h-full"
    )}>
      {/* Left: Standardized Controls (Date Title + Filters) */}
      <div className="flex items-center gap-3 flex-1">
        {/* Mini Calendar Toggle */}
        <button
          className={cn(
            "flex items-center justify-center rounded-xl transition-all border-2",
            showMiniCalendar ? "bg-primary/10 text-primary border-primary/30" : "bg-background border-input text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
          )}
          style={{ height: 'var(--boxed-inputfield-height)', width: 'var(--boxed-inputfield-height)' }}
          onClick={() => setShowMiniCalendar(!showMiniCalendar)}
          title={showMiniCalendar ? "Hide calendar" : "Show calendar"}
        >
          <FiCalendar className="w-4 h-4" />
        </button>

        {/* Upcoming Events Toggle */}
        <button
          className={cn(
            "flex items-center justify-center rounded-xl transition-all border-2",
            showUpcomingEvents ? "bg-primary/10 text-primary border-primary/30" : "bg-background border-input text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
          )}
          style={{ height: 'var(--boxed-inputfield-height)', width: 'var(--boxed-inputfield-height)' }}
          onClick={() => setShowUpcomingEvents(!showUpcomingEvents)}
          title={showUpcomingEvents ? "Hide upcoming events" : "Show upcoming events"}
        >
          <FiClock className="w-4 h-4" />
        </button>

        <div className="h-6 w-px bg-border/50 hidden md:block" />

        {/* Today Button */}
        <button
          className={cn(
            "flex items-center gap-2 px-4 text-sm font-medium rounded-xl transition-all border-2",
            "bg-background border-input text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
          )}
          style={{ height: 'var(--boxed-inputfield-height)' }}
          onClick={() => {
            const today = new Date();
            setCurrentDate(today);
          }}
          title={t('calendar:today')}
        >
          {t('calendar:today')}
        </button>

        {calendarMode === 'calendar' && (
          <>
            <div className="h-6 w-px bg-border/50 hidden md:block" />

            {/* View Toggle - Only show in calendar mode */}
            <div className="flex items-center px-0.5 py-0.5 bg-muted/50 rounded-xl border-2 border-input" style={{ height: 'var(--boxed-inputfield-height)' }}>
              <button
                className={cn(
                  "px-3 text-sm font-medium rounded-lg transition-all flex items-center justify-center focus:outline-none h-full shrink-0 select-none",
                  view === 'day'
                    ? "bg-background text-foreground shadow-sm border-2 border-primary/60"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50 border-2 border-transparent"
                )}
                onClick={() => {
                  setView('day');
                }}
              >
                {t('calendar:dayView')}
              </button>
              <button
                className={cn(
                  "px-3 text-sm font-medium rounded-lg transition-all flex items-center justify-center focus:outline-none h-full shrink-0 select-none",
                  view === 'week'
                    ? "bg-background text-foreground shadow-sm border-2 border-primary/60"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50 border-2 border-transparent"
                )}
                onClick={() => setView('week')}
              >
                {t('calendar:weekView')}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Center: New Appointment Button - Always visible in calendar mode */}
      {calendarMode === 'calendar' && (
        <div className="flex items-center justify-center">
          <button
            className="new-appointment-button flex items-center gap-2 px-4 text-sm font-medium rounded-xl transition-all bg-primary text-primary-foreground hover:bg-primary/90"
            style={{ height: 'var(--boxed-inputfield-height)' }}
            onClick={handleCreateEventClick}
            title={t('calendar:newAppointment')}
          >
            <FiPlus className="w-4 h-4" />
            <span className="hidden sm:inline">{t('calendar:newAppointment')}</span>
          </button>
        </div>
      )}

      {/* Center: Calendar/Team Toggle - Only show for team workspaces */}
      {isTeamWorkspace && (
        <div className="flex items-center px-0.5 py-0.5 bg-muted/50 rounded-xl border-2 border-input absolute left-1/2 -translate-x-1/2" style={{ height: 'var(--boxed-inputfield-height)' }}>
          <button
            className={cn(
              "px-4 text-sm font-medium rounded-lg transition-all flex items-center justify-center focus:outline-none h-full shrink-0",
              calendarMode === 'calendar'
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
            onClick={() => setCalendarMode('calendar')}
          >
            {t('calendar:calendarView', 'Calendar')}
          </button>
          <button
            className={cn(
              "px-4 text-sm font-medium rounded-lg transition-all flex items-center justify-center focus:outline-none h-full shrink-0",
              calendarMode === 'team'
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
            onClick={() => setCalendarMode('team')}
          >
            {t('calendar:teamView', 'Team')}
          </button>
        </div>
      )}

      {/* Right: Filters & Actions - Only show in calendar mode */}
      {calendarMode === 'calendar' && (
        <div className="flex items-center gap-2 flex-1 justify-end">

        {/* Category Filter */}
        <div className="relative" ref={categoryDropdownRef}>
          <button
            className={cn(
              "p-1.5 rounded-full transition-colors relative",
              showCategoryDropdown
                ? "bg-primary/10 text-primary"
                : "hover:bg-muted text-muted-foreground"
            )}
            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
            title={t('calendar:filterCategories')}
          >
            <FiSliders className="w-4 h-4" />
          </button>

          {showCategoryDropdown && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-card rounded-lg shadow-xl border border-border p-2 z-30 animate-in fade-in zoom-in-95 duration-200">
              <div className="px-3 py-2 border-b border-border/50 mb-2 flex justify-between items-center">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('calendar:categories')}</span>
                {hasActiveFilters && (
                  <button
                    onClick={onResetCategories}
                    className="text-[10px] text-primary hover:underline"
                  >
                    {t('calendar:reset')}
                  </button>
                )}
              </div>
              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                {categories.map((category, index) => (
                  <label
                    key={index}
                    className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors group"
                  >
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        checked={category.checked}
                        onChange={() => handleCategoryToggle(index)}
                        className="peer h-4 w-4 rounded border text-primary focus:ring-1 focus:ring-primary/20 cursor-pointer transition-all appearance-none bg-background"
                        style={{
                          backgroundColor: category.checked ? category.color : 'transparent',
                          borderColor: category.color,
                          borderWidth: '1px'
                        }}
                      />
                      <svg
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="3"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>

                    <div className="flex items-center gap-2 select-none">
                      <span className="text-xs font-medium text-foreground">{category.name}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Clear Filters Button */}
        <button
          onClick={onResetCategories}
          className={cn(
            "flex items-center justify-center rounded-xl border-2 border-input hover:bg-muted hover:border-muted-foreground/30 text-muted-foreground transition-all",
            !hasActiveFilters && "opacity-50 cursor-not-allowed hover:bg-transparent hover:border-input"
          )}
          style={{ height: 'var(--boxed-inputfield-height)', width: 'var(--boxed-inputfield-height)' }}
          disabled={!hasActiveFilters}
          title={t('calendar:resetAll')}
        >
          <FiX className="w-4 h-4" />
        </button>
      </div>
      )}
    </div>
  );
};

CalendarHeader.propTypes = {
  currentDate: PropTypes.instanceOf(Date).isRequired,
  view: PropTypes.oneOf(['day', 'week']).isRequired,
  setView: PropTypes.func.isRequired,
  navigateDate: PropTypes.func.isRequired,
  setCurrentDate: PropTypes.func.isRequired,
  categories: PropTypes.arrayOf(
    PropTypes.shape({
      checked: PropTypes.bool,
      name: PropTypes.string,
      color: PropTypes.string
    })
  ).isRequired,
  handleCategoryToggle: PropTypes.func.isRequired,
  onResetCategories: PropTypes.func.isRequired,
  isTopBarMode: PropTypes.bool,
  onShowFiltersOverlay: PropTypes.func,
  scrollContainerRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.instanceOf(Element) })
  ]),
  isSidebarCollapsed: PropTypes.bool,
  toggleSidebar: PropTypes.func,
  calendarMode: PropTypes.oneOf(['calendar', 'team']),
  setCalendarMode: PropTypes.func,
  isTeamWorkspace: PropTypes.bool,
  handleCreateEventClick: PropTypes.func,
  showMiniCalendar: PropTypes.bool,
  setShowMiniCalendar: PropTypes.func,
  showUpcomingEvents: PropTypes.bool,
  setShowUpcomingEvents: PropTypes.func
};

export default CalendarHeader; 