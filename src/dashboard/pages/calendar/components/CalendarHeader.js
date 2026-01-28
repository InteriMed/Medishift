import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiSliders, FiCalendar, FiClock, FiPlus, FiMoon, FiChevronRight, FiChevronLeft, FiGrid } from 'react-icons/fi';
import { cn } from '../../../../services/utils/formatting';
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
  nightView,
  setNightView,
  isBelow1200 = false,
  isOverlayExpanded = false,
  onToggleOverlay,
}) => {
  const { t } = useTranslation();
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryDropdownRef = useRef(null);

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
      "flex flex-wrap items-center justify-between gap-3 w-full relative",
      isTopBarMode && "min-h-[var(--boxed-inputfield-height)]"
    )}>
      {/* Left: Standardized Controls (Date Title + Filters) */}
      <div className={cn(
        "flex items-center gap-1.5 flex-1 min-w-max"
      )}>
        {/* Sidebar Toggle Button - Always visible on the left */}
        {toggleSidebar && (
          <button
            className={cn(
              "flex items-center justify-center rounded-xl transition-all shrink-0",
              !isSidebarCollapsed ? "bg-primary/10 text-primary" : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
            style={{ height: 'var(--boxed-inputfield-height)', width: 'var(--boxed-inputfield-height)', minWidth: 'var(--boxed-inputfield-height)' }}
            onClick={toggleSidebar}
            title={isSidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
          >
            {isSidebarCollapsed ? (
              <FiChevronRight className="w-4 h-4" />
            ) : (
              <FiChevronLeft className="w-4 h-4" />
            )}
          </button>
        )}

        {/* Mini Calendar Toggle */}
        <button
          className={cn(
            "flex items-center justify-center rounded-xl transition-all shrink-0",
            showMiniCalendar ? "bg-primary/10 text-primary" : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted/30"
          )}
          style={{ height: 'var(--boxed-inputfield-height)', width: 'var(--boxed-inputfield-height)', minWidth: 'var(--boxed-inputfield-height)' }}
          onClick={() => setShowMiniCalendar(!showMiniCalendar)}
          title={showMiniCalendar ? "Hide calendar" : "Show calendar"}
        >
          <FiCalendar className="w-4 h-4" />
        </button>

        {/* Upcoming Events Toggle */}
        <button
          className={cn(
            "flex items-center justify-center rounded-xl transition-all shrink-0",
            showUpcomingEvents ? "bg-primary/10 text-primary" : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted/30"
          )}
          style={{ height: 'var(--boxed-inputfield-height)', width: 'var(--boxed-inputfield-height)', minWidth: 'var(--boxed-inputfield-height)' }}
          onClick={() => setShowUpcomingEvents(!showUpcomingEvents)}
          title={showUpcomingEvents ? "Hide upcoming events" : "Show upcoming events"}
        >
          <FiClock className="w-4 h-4" />
        </button>

        <div className="h-6 w-px bg-border/50 hidden sm:block shrink-0" />

        {/* Today Button */}
        <button
          className={cn(
            "flex items-center gap-2 px-3 sm:px-4 text-sm font-medium rounded-xl transition-all border-2 shrink-0",
            "bg-background border-input text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
          )}
          style={{ height: 'var(--boxed-inputfield-height)' }}
          onClick={() => {
            const today = new Date();
            setCurrentDate(today);
          }}
          title={t('calendar:today')}
        >
          <span className="hidden sm:inline">{t('calendar:today')}</span>
          <span className="sm:hidden">{t('calendar:today')?.substring(0, 1) || 'T'}</span>
        </button>

        <div className="h-6 w-px bg-border/50 hidden sm:block shrink-0" />

        <div className="flex items-center px-0.5 py-0.5 bg-muted/50 rounded-xl border-2 border-input shrink-0" style={{ height: 'var(--boxed-inputfield-height)' }}>
          <button
            className={cn(
              "px-3 sm:px-4 text-sm font-medium rounded-lg transition-all flex items-center justify-center focus:outline-none h-full shrink-0 select-none",
              view === 'day'
                ? "bg-background text-foreground shadow-sm border-2"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50 border-2 border-transparent"
            )}
            style={view === 'day' ? { borderColor: 'var(--color-logo-1)' } : {}}
            onClick={() => setView('day')}
          >
            {t('calendar:dayView')}
          </button>
          <button
            className={cn(
              "px-3 sm:px-4 text-sm font-medium rounded-lg transition-all flex items-center justify-center focus:outline-none h-full shrink-0 select-none",
              view === 'week'
                ? "bg-background text-foreground shadow-sm border-2"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50 border-2 border-transparent"
            )}
            style={view === 'week' ? { borderColor: 'var(--color-logo-1)' } : {}}
            onClick={() => setView('week')}
          >
            {t('calendar:weekView')}
          </button>
        </div>
      </div>

      {/* Center/Middle section (if team workspace) */}
      {isTeamWorkspace && calendarMode && setCalendarMode && (
        <div className="flex items-center px-0.5 py-0.5 bg-muted/50 rounded-xl border-2 border-input shrink-0" style={{ height: 'var(--boxed-inputfield-height)' }}>
          <button
            className={cn(
              "px-4 text-sm font-medium rounded-lg transition-all flex items-center justify-center focus:outline-none h-full shrink-0 select-none",
              calendarMode === 'calendar'
                ? "bg-background text-foreground shadow-sm border-2"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50 border-2 border-transparent"
            )}
            style={calendarMode === 'calendar' ? { borderColor: 'var(--color-logo-1)' } : {}}
            onClick={() => setCalendarMode('calendar')}
            title={t('calendar:calendarView', 'Calendar')}
          >
            <FiCalendar className="w-4 h-4" />
          </button>
          <button
            className={cn(
              "px-4 text-sm font-medium rounded-lg transition-all flex items-center justify-center focus:outline-none h-full shrink-0 select-none",
              calendarMode === 'team'
                ? "bg-background text-foreground shadow-sm border-2"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50 border-2 border-transparent"
            )}
            style={calendarMode === 'team' ? { borderColor: 'var(--color-logo-1)' } : {}}
            onClick={() => setCalendarMode('team')}
            title={t('calendar:blockView', 'Block')}
          >
            <FiGrid className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Right: Filters & Actions */}
      <div className={cn(
        "flex items-center justify-end gap-1.5 flex-1 min-w-max"
      )}>
        {/* Night View Button - Show in both calendar and team modes */}
        <button
          className={cn(
            "flex items-center justify-center rounded-xl transition-all shrink-0",
            nightView ? "bg-primary/10 text-primary" : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted/30"
          )}
          style={{ height: 'var(--boxed-inputfield-height)', width: 'var(--boxed-inputfield-height)', minWidth: 'var(--boxed-inputfield-height)' }}
          onClick={() => setNightView(!nightView)}
          title={nightView ? "Day View" : "Night View"}
        >
          <FiMoon className="w-4 h-4" style={{ width: '16px', height: '16px' }} />
        </button>

        {/* Category Filter - Show in both calendar and team modes */}
        <div className="relative shrink-0" ref={categoryDropdownRef}>
          <button
            className={cn(
              "flex items-center justify-center rounded-xl transition-all",
              showCategoryDropdown || hasActiveFilters
                ? "bg-primary/10 text-primary"
                : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
            style={{ height: 'var(--boxed-inputfield-height)', width: 'var(--boxed-inputfield-height)', minWidth: 'var(--boxed-inputfield-height)' }}
            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
            title={t('calendar:filterCategories')}
          >
            <FiSliders className="w-4 h-4" style={{ width: '16px', height: '16px' }} />
          </button>

          {showCategoryDropdown && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-card rounded-lg shadow-xl border border-border p-2 z-30 animate-in fade-in zoom-in-95 duration-200">
              <div className="px-3 py-2 border-b border-border/50 mb-2 flex justify-between items-center">
                <span className="text-sm font-medium text-foreground">{t('calendar:categories')}</span>
                {hasActiveFilters && (
                  <button
                    onClick={() => {
                      onResetCategories();
                      setShowCategoryDropdown(false);
                    }}
                    className="text-xs text-primary hover:underline font-medium"
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
                      <span className="text-sm text-foreground">{category.name}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Create Event Button */}
        <button
          className="px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all shadow-sm flex items-center gap-2 shrink-0"
          style={{ height: 'var(--boxed-inputfield-height)' }}
          onClick={handleCreateEventClick}
          title={t('calendar:createEvent', 'Create Event')}
        >
          <FiPlus className="w-4 h-4" />
          {t('calendar:createEvent', 'Create Event')}
        </button>
      </div>
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
  setShowUpcomingEvents: PropTypes.func,
  nightView: PropTypes.bool,
  setNightView: PropTypes.func,
  isBelow1200: PropTypes.bool,
  isOverlayExpanded: PropTypes.bool,
  onToggleOverlay: PropTypes.func
};

export default CalendarHeader; 