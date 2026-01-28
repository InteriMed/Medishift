import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FiSliders, FiCalendar, FiClock, FiPlus, FiMoon, FiChevronRight, FiChevronLeft, FiGrid } from 'react-icons/fi';
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
    <div className="flex flex-wrap items-center justify-between gap-4 w-full">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {toggleSidebar && (
          <button
            className={cn(
              "flex items-center justify-center w-9 h-9 rounded-lg transition-all shrink-0",
              !isSidebarCollapsed 
                ? "bg-blue-50 text-blue-600 hover:bg-blue-100" 
                : "bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50 border border-gray-200"
            )}
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

        <button
          className={cn(
            "flex items-center justify-center w-9 h-9 rounded-lg transition-all shrink-0",
            showMiniCalendar 
              ? "bg-blue-50 text-blue-600 hover:bg-blue-100" 
              : "bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50 border border-gray-200"
          )}
          onClick={() => setShowMiniCalendar(!showMiniCalendar)}
          title={showMiniCalendar ? "Hide calendar" : "Show calendar"}
        >
          <FiCalendar className="w-4 h-4" />
        </button>

        <button
          className={cn(
            "flex items-center justify-center w-9 h-9 rounded-lg transition-all shrink-0",
            showUpcomingEvents 
              ? "bg-blue-50 text-blue-600 hover:bg-blue-100" 
              : "bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50 border border-gray-200"
          )}
          onClick={() => setShowUpcomingEvents(!showUpcomingEvents)}
          title={showUpcomingEvents ? "Hide upcoming events" : "Show upcoming events"}
        >
          <FiClock className="w-4 h-4" />
        </button>

        <div className="h-6 w-px bg-gray-200 hidden sm:block shrink-0" />

        <button
          className="flex items-center gap-2 px-4 h-9 text-sm font-medium rounded-lg transition-all shrink-0 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300"
          onClick={() => {
            const today = new Date();
            setCurrentDate(today);
          }}
          title={t('calendar:today')}
        >
          <span className="hidden sm:inline">{t('calendar:today')}</span>
          <span className="sm:hidden">{t('calendar:today')?.substring(0, 1) || 'T'}</span>
        </button>

        <div className="h-6 w-px bg-gray-200 hidden sm:block shrink-0" />

        <div className="flex items-center p-0.5 bg-gray-100 rounded-lg border border-gray-200 shrink-0 h-9">
          <button
            className={cn(
              "px-3 sm:px-4 h-full text-sm font-medium rounded-md transition-all flex items-center justify-center focus:outline-none shrink-0 select-none",
              view === 'day'
                ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                : "text-gray-600 hover:text-gray-900 hover:bg-white/50 border border-transparent"
            )}
            onClick={() => setView('day')}
          >
            {t('calendar:dayView')}
          </button>
          <button
            className={cn(
              "px-3 sm:px-4 h-full text-sm font-medium rounded-md transition-all flex items-center justify-center focus:outline-none shrink-0 select-none",
              view === 'week'
                ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                : "text-gray-600 hover:text-gray-900 hover:bg-white/50 border border-transparent"
            )}
            onClick={() => setView('week')}
          >
            {t('calendar:weekView')}
          </button>
        </div>
      </div>

      {isTeamWorkspace && calendarMode && setCalendarMode && (
        <div className="flex items-center p-0.5 bg-gray-100 rounded-lg border border-gray-200 shrink-0 h-9">
          <button
            className={cn(
              "px-4 h-full text-sm font-medium rounded-md transition-all flex items-center justify-center focus:outline-none shrink-0 select-none",
              calendarMode === 'calendar'
                ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                : "text-gray-600 hover:text-gray-900 hover:bg-white/50 border border-transparent"
            )}
            onClick={() => setCalendarMode('calendar')}
            title={t('calendar:calendarView', 'Calendar')}
          >
            <FiCalendar className="w-4 h-4" />
          </button>
          <button
            className={cn(
              "px-4 h-full text-sm font-medium rounded-md transition-all flex items-center justify-center focus:outline-none shrink-0 select-none",
              calendarMode === 'team'
                ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                : "text-gray-600 hover:text-gray-900 hover:bg-white/50 border border-transparent"
            )}
            onClick={() => setCalendarMode('team')}
            title={t('calendar:blockView', 'Block')}
          >
            <FiGrid className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 flex-1 min-w-0">
        <button
          className={cn(
            "flex items-center justify-center w-9 h-9 rounded-lg transition-all shrink-0",
            nightView 
              ? "bg-blue-50 text-blue-600 hover:bg-blue-100" 
              : "bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50 border border-gray-200"
          )}
          onClick={() => setNightView(!nightView)}
          title={nightView ? "Day View" : "Night View"}
        >
          <FiMoon className="w-4 h-4" />
        </button>

        <div className="relative shrink-0" ref={categoryDropdownRef}>
          <button
            className={cn(
              "flex items-center justify-center w-9 h-9 rounded-lg transition-all",
              showCategoryDropdown || hasActiveFilters
                ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
                : "bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50 border border-gray-200"
            )}
            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
            title={t('calendar:filterCategories')}
          >
            <FiSliders className="w-4 h-4" />
          </button>

          {showCategoryDropdown && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 p-2 z-30 animate-in fade-in zoom-in-95 duration-200">
              <div className="px-3 py-2 border-b border-gray-200 mb-2 flex justify-between items-center">
                <span className="text-sm font-medium text-gray-900">{t('calendar:categories')}</span>
                {hasActiveFilters && (
                  <button
                    onClick={() => {
                      onResetCategories();
                      setShowCategoryDropdown(false);
                    }}
                    className="text-xs text-blue-600 hover:underline font-medium"
                  >
                    {t('calendar:reset')}
                  </button>
                )}
              </div>
              <div className="space-y-1 max-h-[300px] overflow-y-auto scrollbar-hide">
                {categories.map((category, index) => (
                  <label
                    key={index}
                    className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 cursor-pointer transition-colors group"
                  >
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        checked={category.checked}
                        onChange={() => handleCategoryToggle(index)}
                        className="peer h-4 w-4 rounded border-2 focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition-all appearance-none bg-white"
                        style={{
                          backgroundColor: category.checked ? category.color : 'transparent',
                          borderColor: category.color,
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
                    <span className="text-sm text-gray-900">{category.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          className="px-4 h-9 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-all shadow-sm flex items-center gap-2 shrink-0"
          onClick={handleCreateEventClick}
          title={t('calendar:createEvent', 'Create Event')}
        >
          <FiPlus className="w-4 h-4" />
          <span className="hidden sm:inline">{t('calendar:createEvent', 'Create Event')}</span>
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