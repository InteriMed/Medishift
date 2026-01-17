import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { CALENDAR_COLORS } from './utils/constants';
import { getWeekDates, getMultipleWeeks } from './utils/dateHelpers';
import { getUserTypeFromData, getUserIdFromData } from './utils/userHelpers';
import { getEventsForCurrentWeek, filterEventsByCategories } from './utils/eventUtils';
import CalendarHeader from './components/CalendarHeader';
import CalendarSidebar from './components/CalendarSidebar';
import TimeHeaders from './components/TimeHeaders';
import TimeGrid from './components/TimeGrid';
import DeleteConfirmationDialog from './components/DeleteConfirmationDialog';
import EventContextMenu from './components/EventContextMenu';
import EventPanel from './EventPanel/EventPanel';
import { useDashboard } from '../../contexts/DashboardContext';
import { useSidebar } from '../../contexts/SidebarContext';
import { useTutorial } from '../../contexts/TutorialContext';
import { useCalendarState } from './hooks/useCalendarState';
import { useEventOperations } from './hooks/useEventOperations';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useAutoSync } from './hooks/useAutoSync';
import { useCalendarEvents } from './utils/eventDatabase';
import { cn } from '../../../utils/cn';
import { FiX, FiCalendar } from 'react-icons/fi';
import ResourceGrid from './components/ResourceGrid';
import useProfileData from '../../hooks/useProfileData';

import PropTypes from 'prop-types';

const Calendar = ({ userData }) => {
  const { t } = useTranslation(['dashboard', 'calendar']);
  const { isTutorialActive, activeTutorial } = useTutorial();
  const { selectedWorkspace } = useDashboard();

  const accountType = getUserTypeFromData(userData);
  const userId = getUserIdFromData(userData);
  const { isMainSidebarCollapsed } = useSidebar();
  const [showFiltersOverlay, setShowFiltersOverlay] = useState(false);
  const scrollContainerRef = useRef(null);
  const headerScrollRef = useRef(null);

  const [calendarMode, setCalendarMode] = useState('calendar');

  const isTeamWorkspace = selectedWorkspace?.type === 'team';
  
  const { profileData, isLoading: isLoadingProfile, updateProfileData } = useProfileData();

  const [contextMenu, setContextMenu] = useState(null);

  const getWorkspaceContext = () => {
    if (!selectedWorkspace) {
      return { type: 'personal', role: 'professional' };
    }
    let role = selectedWorkspace.role;
    if (role === 'admin') role = 'manager';
    return { type: selectedWorkspace.type, role: role };
  };

  const workspaceContext = getWorkspaceContext();

  const {
    currentDate, setCurrentDate, view, setView,
    categories, setCategories, isSidebarCollapsed, setIsSidebarCollapsed,
    showHeaderDateDropdown, setShowHeaderDateDropdown, dropdownPosition,
    navigateDate: originalNavigateDate,
    handleDayClick: originalHandleDayClick,
    handleUpcomingEventClick: originalHandleUpcomingEventClick,
    handleCategoryToggle,
    handleHeaderDateClick, toggleSidebar
  } = useCalendarState();

  // Track the actual visible week for MiniCalendar highlighting
  // These are calculated from the horizontal scroll position of the grid
  const [visibleWeekStart, setVisibleWeekStart] = useState(() => {
    const start = new Date(currentDate);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday
    start.setDate(start.getDate() + diff);
    start.setHours(0, 0, 0, 0);
    return start;
  });
  const [visibleWeekEnd, setVisibleWeekEnd] = useState(() => {
    const end = new Date(currentDate);
    const day = end.getDay();
    const diff = day === 0 ? 0 : 7 - day; // Sunday
    end.setDate(end.getDate() + diff);
    end.setHours(23, 59, 59, 999);
    return end;
  });

  // Use original navigation handlers directly
  const navigateDate = originalNavigateDate;
  const handleDayClick = originalHandleDayClick;
  const handleUpcomingEventClick = originalHandleUpcomingEventClick;

  // Single week display mode (no horizontal scrolling buffer)
  // Only render the current week to ensure stability and correct focus
  const numWeeks = 0;
  const [numDays, setNumDays] = useState(30);
  const prevNumDays = useRef(numDays);

  const isLoadingMoreDays = useRef(false);
  const hasInitialScrolled = useRef(false);

  // Scroll Compensation for day view only (week view uses fixed numWeeks)
  useLayoutEffect(() => {
    const gridScroll = scrollContainerRef.current;
    if (!gridScroll) return;

    if (view === 'day' && numDays > prevNumDays.current) {
      const delta = numDays - prevNumDays.current;
      const widthPerDay = gridScroll.clientWidth;
      gridScroll.scrollLeft += delta * widthPerDay;
    }

    prevNumDays.current = numDays;
  }, [numDays, view, scrollContainerRef]);



  // Scroll to selected date when it changes (navigation, minicalendar click, etc.)
  useEffect(() => {
    const gridScroll = scrollContainerRef.current;
    if (!gridScroll || view !== 'week') return;

    // Calculate which week contains currentDate
    const weekStart = new Date(currentDate);
    const day = weekStart.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday
    weekStart.setDate(weekStart.getDate() + diff);
    weekStart.setHours(0, 0, 0, 0);

    // Generate all weeks in the grid
    const weeks = getMultipleWeeks(currentDate, numWeeks, numWeeks);

    // Find which week index contains our target date
    let targetWeekIndex = -1;
    for (let i = 0; i < weeks.length; i++) {
      const wStart = new Date(weeks[i][0]);
      wStart.setHours(0, 0, 0, 0);
      const wEnd = new Date(weeks[i][6]);
      wEnd.setHours(23, 59, 59, 999);

      if (weekStart >= wStart && weekStart <= wEnd) {
        targetWeekIndex = i;
        break;
      }
    }

    if (targetWeekIndex === -1) return;

    // Calculate scroll position to center the target week
    const totalWeeks = weeks.length;
    const containerWidth = gridScroll.clientWidth;
    const targetScrollLeft = targetWeekIndex * containerWidth;

    // Scroll to position (smooth on subsequent navigations, instant on first load)
    gridScroll.scrollTo({
      left: targetScrollLeft,
      behavior: hasInitialScrolled.current ? 'smooth' : 'auto'
    });

    if (!hasInitialScrolled.current) {
      hasInitialScrolled.current = true;
    }
  }, [currentDate, view, numWeeks]);

  // Track scroll position to update visible week for mini calendar highlighting
  useEffect(() => {
    const gridScroll = scrollContainerRef.current;
    if (!gridScroll || view !== 'week') return;

    let scrollTimeout;
    const handleScrollUpdate = () => {
      const scrollLeft = gridScroll.scrollLeft;
      const containerWidth = gridScroll.clientWidth;

      if (containerWidth === 0) return;

      // Calculate which week is currently visible (centered in viewport)
      const visibleWeekIndex = Math.round(scrollLeft / containerWidth);

      // Generate all weeks
      const weeks = getMultipleWeeks(currentDate, numWeeks, numWeeks);

      if (visibleWeekIndex >= 0 && visibleWeekIndex < weeks.length) {
        const visibleWeek = weeks[visibleWeekIndex];

        const weekStart = new Date(visibleWeek[0]);
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(visibleWeek[6]);
        weekEnd.setHours(23, 59, 59, 999);

        // Only update if the week actually changed
        const currentStartKey = `${visibleWeekStart.getFullYear()}-${visibleWeekStart.getMonth()}-${visibleWeekStart.getDate()}`;
        const newStartKey = `${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`;

        if (currentStartKey !== newStartKey) {
          setVisibleWeekStart(weekStart);
          setVisibleWeekEnd(weekEnd);
        }
      }
    };

    // Debounce scroll updates
    const throttledScrollUpdate = () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(handleScrollUpdate, 150);
    };

    gridScroll.addEventListener('scroll', throttledScrollUpdate, { passive: true });

    // Initial update
    handleScrollUpdate();

    return () => {
      gridScroll.removeEventListener('scroll', throttledScrollUpdate);
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, [scrollContainerRef, view, currentDate, numWeeks, visibleWeekStart]);

  const { saveEventsToLocalStorage, setPendingChanges, pendingChanges } = useAutoSync(userId, accountType);

  const {
    events, setEvents, selectedEvent, setSelectedEvent, selectedEventId, setSelectedEventId,
    history, currentHistoryIndex, validatedEvents,
    showDeleteConfirmation, setShowDeleteConfirmation, eventToDelete, setEventToDelete,
    originalEventPosition, setOriginalEventPosition,
    handleEventSave, handleEventDelete, handlePanelClose, handleCreateEventClick,
    addToHistory, undo, redo
  } = useEventOperations(userId, accountType, workspaceContext, currentDate, setCurrentDate, CALENDAR_COLORS, saveEventsToLocalStorage, setPendingChanges);

  /**
   * Handle event click - opens event panel
   */
  const handleEventClick = useCallback((event, e) => {
    // Close context menu if open
    setContextMenu(null);

    // Find full event data
    const fullEvent = events.find(ev => ev.id === event.id) || event;

    // Store original position for potential restoration
    setOriginalEventPosition({
      id: fullEvent.id,
      start: new Date(fullEvent.start),
      end: new Date(fullEvent.end),
      title: fullEvent.title,
      color: fullEvent.color,
      color1: fullEvent.color1,
      notes: fullEvent.notes,
      location: fullEvent.location,
      employees: fullEvent.employees,
      ...fullEvent
    });

    // Open event panel
    setSelectedEventId(event.id);
    setSelectedEvent(fullEvent);
  }, [events, setSelectedEvent, setSelectedEventId, setOriginalEventPosition]);

  /**
   * Handle event right-click - opens context menu
   */
  const handleEventRightClick = useCallback((e, event) => {
    e.preventDefault();
    e.stopPropagation();

    setContextMenu({
      event: event,
      position: { x: e.clientX, y: e.clientY }
    });
  }, []);

  /**
   * Handle context menu close
   */
  const handleContextMenuClose = useCallback(() => {
    setContextMenu(null);
  }, []);

  /**
   * Handle event color change from context menu
   */
  const handleEventColorChange = useCallback((event, colorOption) => {
    const updatedEvents = events.map(e => {
      if (e.id === event.id) {
        return {
          ...e,
          color: colorOption.color,
          color1: colorOption.color1,
          color2: colorOption.color2,
          category: colorOption.name
        };
      }
      return e;
    });

    setEvents(updatedEvents);
    addToHistory(updatedEvents);
  }, [events, setEvents, addToHistory]);

  /**
   * Handle event delete from context menu
   */
  const handleContextMenuDelete = useCallback((event) => {
    setEventToDelete(event);
    setShowDeleteConfirmation(true);
  }, [setEventToDelete, setShowDeleteConfirmation]);

  /**
   * Handle grid event move (15-min increments, same day only)
   */
  const handleGridEventMove = useCallback((eventId, newStart, newEnd, isTemporary = false) => {
    // Find the event
    const eventIndex = events.findIndex(e => e.id === eventId);
    if (eventIndex === -1) return;

    const currentEvent = events[eventIndex];

    // On first move (temporary), store the original position
    // Check if we're starting a new drag (event is not currently being moved)
    if (isTemporary && !currentEvent.isBeingMoved) {
      setOriginalEventPosition({
        id: currentEvent.id,
        start: new Date(currentEvent.start),
        end: new Date(currentEvent.end),
        title: currentEvent.title,
        color: currentEvent.color,
        color1: currentEvent.color1,
        notes: currentEvent.notes,
        location: currentEvent.location,
        employees: currentEvent.employees,
        ...currentEvent
      });
    }

    const updatedEvents = [...events];
    updatedEvents[eventIndex] = {
      ...updatedEvents[eventIndex],
      start: newStart,
      end: newEnd,
      isBeingMoved: isTemporary
    };

    setEvents(updatedEvents);

    // When drag completes (not temporary), open panel for confirmation
    if (!isTemporary) {
      const movedEvent = updatedEvents[eventIndex];

      // Validate that the event is within valid time boundaries (00:00:01 to 23:59:59)
      // Grid starts at 00:00:01 to prevent date shifts to previous day
      const startOfDay = new Date(newStart);
      startOfDay.setHours(0, 0, 1, 0);
      const endOfDay = new Date(newStart);
      endOfDay.setHours(23, 59, 59, 999);

      // Check if event is within valid day boundaries
      const isValidPosition = newStart >= startOfDay && newStart <= endOfDay &&
        newEnd >= startOfDay && newEnd <= endOfDay &&
        newEnd > newStart;

      if (!isValidPosition) {
        // Event is outside valid boundaries, don't open panel
        // Restore to original position if available
        if (originalEventPosition && originalEventPosition.id === eventId) {
          const restoredEvents = [...events];
          const restoreIndex = restoredEvents.findIndex(e => e.id === eventId);
          if (restoreIndex !== -1) {
            restoredEvents[restoreIndex] = {
              ...restoredEvents[restoreIndex],
              start: new Date(originalEventPosition.start),
              end: new Date(originalEventPosition.end),
              isBeingMoved: false
            };
            setEvents(restoredEvents);
          }
        }
        return;
      }

      console.log('Event moved - opening panel for confirmation');

      // Open panel to confirm or cancel the move
      setSelectedEvent(movedEvent);
      setSelectedEventId(movedEvent.id);

      // Don't auto-save - let user confirm via Save button
      // If they cancel, handlePanelClose will restore originalEventPosition
    }
  }, [events, setEvents, setSelectedEvent, setSelectedEventId, setOriginalEventPosition, originalEventPosition]);

  /**
   * Handle grid event resize (15-min increments)
   */
  const handleGridEventResize = useCallback((eventId, newStart, newEnd, isTemporary = false) => {
    // Find the event
    const eventIndex = events.findIndex(e => e.id === eventId);
    if (eventIndex === -1) return;

    const currentEvent = events[eventIndex];

    // On first resize (temporary), store the original position
    if (isTemporary && !currentEvent.isBeingResized) {
      console.log('Resize started - storing original position');
      setOriginalEventPosition({
        id: currentEvent.id,
        start: new Date(currentEvent.start),
        end: new Date(currentEvent.end),
        title: currentEvent.title,
        color: currentEvent.color,
        color1: currentEvent.color1,
        notes: currentEvent.notes,
        location: currentEvent.location,
        employees: currentEvent.employees,
        ...currentEvent
      });
    }

    const updatedEvents = [...events];
    updatedEvents[eventIndex] = {
      ...updatedEvents[eventIndex],
      start: newStart,
      end: newEnd,
      isBeingResized: isTemporary
    };

    setEvents(updatedEvents);

    // When resize completes, open panel for confirmation
    if (!isTemporary) {
      const resizedEvent = updatedEvents[eventIndex];

      console.log('Event resized - opening panel for confirmation');

      // Open panel to confirm or cancel the resize
      setSelectedEvent(resizedEvent);
      setSelectedEventId(resizedEvent.id);

      // Don't auto-save - let user confirm via Save button
    }
  }, [events, setEvents, setSelectedEvent, setSelectedEventId, setOriginalEventPosition]);

  /**
   * Handle grid event creation
   */
  const handleGridCreateEvent = useCallback((newEvent, openPanel = true) => {
    console.log('handleGridCreateEvent called:', { newEvent, openPanel });

    // Add default color if not set
    const eventWithDefaults = {
      ...newEvent,
      color: newEvent.color || CALENDAR_COLORS[0].color,
      color1: newEvent.color1 || CALENDAR_COLORS[0].color1,
      color2: CALENDAR_COLORS[0].color2,
      category: CALENDAR_COLORS[0].name,
      title: newEvent.title || '',
      notes: '',
      location: '',
      employees: '',
    };

    console.log('Event with defaults:', eventWithDefaults);

    // ALWAYS add to events array immediately so it's visible in the UI
    const updatedEvents = [...events, eventWithDefaults];
    setEvents(updatedEvents);
    addToHistory(updatedEvents);
    console.log('Event added to array, count:', updatedEvents.length);

    if (openPanel) {
      console.log('Opening panel for event:', eventWithDefaults.id);

      // Store original position
      setOriginalEventPosition({
        ...eventWithDefaults,
        start: new Date(eventWithDefaults.start),
        end: new Date(eventWithDefaults.end)
      });

      // Open the panel
      setSelectedEvent(eventWithDefaults);
      setSelectedEventId(eventWithDefaults.id);

      console.log('Panel opened, event visible in UI');
    } else {
      console.log('Event added without panel (should not happen now)');
    }
  }, [events, setEvents, addToHistory, setSelectedEvent, setSelectedEventId, setOriginalEventPosition]);

  const { handleKeyboardShortcuts } = useKeyboardShortcuts(
    () => undo(events, setEvents),
    () => redo(events, setEvents),
    selectedEvent,
    showDeleteConfirmation,
    // onDeleteEvent wrapper
    (event) => {
      setEventToDelete(event);
      setShowDeleteConfirmation(true);
    },
    // onPanelClose wrapper
    () => handlePanelClose(events, setEvents)
  );

  const filteredEvents = filterEventsByCategories(events, categories, CALENDAR_COLORS);

  const { events: calendarEvents } = useCalendarEvents(userId, accountType);
  const prevCalendarEventsRef = useRef(null);

  useEffect(() => {
    if (calendarEvents) {
      const calendarEventsKey = JSON.stringify(calendarEvents.map(e => ({ id: e.id, start: e.start?.getTime(), end: e.end?.getTime() })));
      const prevCalendarEventsKey = prevCalendarEventsRef.current ? 
        JSON.stringify(prevCalendarEventsRef.current.map(e => ({ id: e.id, start: e.start?.getTime(), end: e.end?.getTime() }))) : null;
      
      if (calendarEventsKey === prevCalendarEventsKey) {
        return;
      }
      
      prevCalendarEventsRef.current = calendarEvents;
      
      const eventsWithDbFlag = calendarEvents.map(event => ({
        ...event, fromDatabase: true, isValidated: true
      }));
      
      setEvents(prevEvents => {
        const tempEvents = prevEvents.filter(e => !e.fromDatabase);
        
        const activeEvents = prevEvents.filter(e => e.isBeingMoved || e.isBeingResized);
        const activeEventIds = new Set(activeEvents.map(e => e.id));
        
        const dbEventsMap = new Map(eventsWithDbFlag.map(e => [e.id, e]));
        
        const mergedEvents = [];
        
        for (const dbEvent of eventsWithDbFlag) {
          if (activeEventIds.has(dbEvent.id)) {
            const activeEvent = activeEvents.find(e => e.id === dbEvent.id);
            mergedEvents.push(activeEvent);
          } else {
            mergedEvents.push(dbEvent);
          }
        }
        
        for (const activeEvent of activeEvents) {
          if (!dbEventsMap.has(activeEvent.id)) {
            mergedEvents.push(activeEvent);
          }
        }
        
        mergedEvents.push(...tempEvents);
        
        const mergedEventsKey = JSON.stringify(mergedEvents.map(e => ({ id: e.id, start: e.start?.getTime(), end: e.end?.getTime() })));
        const prevEventsKey = JSON.stringify(prevEvents.map(e => ({ id: e.id, start: e.start?.getTime(), end: e.end?.getTime() })));
        const historyKey = history[currentHistoryIndex] ? 
          JSON.stringify(history[currentHistoryIndex].map(e => ({ id: e.id, start: e.start?.getTime(), end: e.end?.getTime() }))) : null;
        
        if (mergedEventsKey !== prevEventsKey && mergedEventsKey !== historyKey) {
          addToHistory(mergedEvents);
        }
        
        return mergedEvents;
      });
    }
  }, [calendarEvents, setEvents, addToHistory, history, currentHistoryIndex]);

  // Auto-scroll to 8 AM
  useEffect(() => {
    const timeSlots = document.querySelector('.time-slots');
    if (timeSlots) timeSlots.scrollTop = (8 - 1) * 60;
  }, []);

  // Sync header and grid horizontal scroll
  useEffect(() => {
    const headerScroll = headerScrollRef.current;
    const gridScroll = scrollContainerRef.current;

    if (!headerScroll || !gridScroll) return;

    let isSyncing = false;

    const syncFromGrid = () => {
      if (!isSyncing) {
        isSyncing = true;
        if (headerScroll) headerScroll.scrollLeft = gridScroll.scrollLeft;
        requestAnimationFrame(() => { isSyncing = false; });
      }
    };

    const syncFromHeader = () => {
      if (!isSyncing) {
        isSyncing = true;
        if (gridScroll) gridScroll.scrollLeft = headerScroll.scrollLeft;
        requestAnimationFrame(() => { isSyncing = false; });
      }
    };

    gridScroll.addEventListener('scroll', syncFromGrid);
    headerScroll.addEventListener('scroll', syncFromHeader);

    return () => {
      gridScroll.removeEventListener('scroll', syncFromGrid);
      headerScroll.removeEventListener('scroll', syncFromHeader);
    };
  }, []);


  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardShortcuts);
    return () => document.removeEventListener('keydown', handleKeyboardShortcuts);
  }, [handleKeyboardShortcuts]);

  // Debug: Log when selectedEvent changes
  useEffect(() => {
    console.log('selectedEvent changed:', selectedEvent);
    console.log('selectedEventId changed:', selectedEventId);
  }, [selectedEvent, selectedEventId]);

  // Close context menu on outside click
  useEffect(() => {
    const handleGlobalClick = () => {
      if (contextMenu) {
        setContextMenu(null);
      }
    };

    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, [contextMenu]);

  const handleResetCategories = useCallback(() => {
    setCategories(prev => prev.map(c => ({ ...c, checked: true })));
  }, [setCategories]);

  const hasActiveFilters = categories.some(cat => !cat.checked);

  return (
    <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500">
      {/* 1. Top Bar */}
      <div className="shrink-0 w-full z-20 bg-card/95 backdrop-blur-sm border-b border-border shadow-sm flex items-center justify-between gap-4 px-6 h-16">
        {/* Tutorial Mock: Calendar View Options */}
        {isTutorialActive && activeTutorial === 'calendar' && (
          <div className="calendar-view-options flex gap-2 mr-4">
            <button className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium">{t('calendar:dayView')}</button>
            <button className="px-3 py-1.5 bg-muted text-muted-foreground rounded-md text-sm font-medium">{t('calendar:weekView')}</button>
            <button className="px-3 py-1.5 bg-muted text-muted-foreground rounded-md text-sm font-medium">{t('calendar:monthView')}</button>
          </div>
        )}
        <CalendarHeader
          currentDate={currentDate}
          view={view}
          setView={setView}
          navigateDate={navigateDate}
          setCurrentDate={setCurrentDate}
          isSidebarCollapsed={false}
          toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          categories={categories}
          handleCategoryToggle={handleCategoryToggle}
          onResetCategories={handleResetCategories}
          isTopBarMode={true}
          onShowFiltersOverlay={setShowFiltersOverlay}
          scrollContainerRef={scrollContainerRef}
          calendarMode={calendarMode}
          setCalendarMode={setCalendarMode}
          isTeamWorkspace={isTeamWorkspace}
        />
      </div>

      {/* 2. Main Split Content */}
      <div className={cn(
        "flex-1 flex overflow-hidden relative",
        calendarMode === 'team' ? "p-0" : "p-4 gap-4"
      )}>
        {calendarMode === 'team' && isTeamWorkspace ? (
          <div className="w-full h-full">
            <ResourceGrid
              currentDate={currentDate}
              events={filteredEvents}
              employees={[]}
              onEventClick={handleEventClick}
              onCreateEvent={handleGridCreateEvent}
              view={view}
              onDateClick={handleDayClick}
              onEventMove={handleGridEventMove}
              profileData={profileData}
              onUpdateProfileData={updateProfileData}
              isLoadingProfile={isLoadingProfile}
            />
          </div>
        ) : (
          <>
            {/* Left: Sidebar */}
            <div className={cn(
              "flex flex-col transition-all duration-300 w-full md:w-[320px] lg:w-[360px]",
              isMainSidebarCollapsed ? "flex" : (isSidebarCollapsed ? "hidden lg:flex w-0 overflow-hidden" : "flex")
            )}>
              {/* Tutorial Mock: New Appointment Button */}
              {isTutorialActive && activeTutorial === 'calendar' && (
                <div className="mb-4">
                  <button className="new-appointment-button w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                    <FiCalendar className="w-4 h-4" />
                    {t('calendar:newAppointment')}
                  </button>
                </div>
              )}
              <CalendarSidebar
                currentDate={currentDate}
                setCurrentDate={setCurrentDate}
                handleUpcomingEventClick={handleUpcomingEventClick}
                events={filteredEvents}
                isSidebarCollapsed={isSidebarCollapsed}
                handleCreateEventClick={() => handleCreateEventClick(currentDate)}
                handleDayClick={handleDayClick}
                showHeaderDateDropdown={showHeaderDateDropdown}
                setShowHeaderDateDropdown={setShowHeaderDateDropdown}
                handleHeaderDateClick={handleHeaderDateClick}
                dropdownPosition={dropdownPosition}
                toggleSidebar={toggleSidebar}
                view={view}
                visibleWeekStart={visibleWeekStart}
                visibleWeekEnd={visibleWeekEnd}
              />
            </div>

            {/* Right: Main Calendar Grid */}
        <div className="flex-1 flex flex-col relative min-w-0 transition-all duration-300 bg-card border border-border/60 rounded-xl overflow-hidden">
          <div className="flex-1 overflow-hidden relative calendar-grid flex flex-col">
            {/* Time Headers - scrollable horizontally (no scrollbar) */}
            <div className="flex flex-shrink-0" style={{ margin: 0, padding: 0 }}>
              {/* Time column header - above day headers */}
              <div
                className="flex-shrink-0 bg-background/95 backdrop-blur-sm z-10 flex items-end justify-center pb-2"
                style={{
                  width: '4rem',
                  minHeight: '3rem',
                  borderLeft: '1px solid hsl(var(--border))',
                  borderRight: '1px solid hsl(var(--border))',
                  boxSizing: 'border-box',
                  margin: 0,
                  padding: 0
                }}
              >
                {/* Empty space for time column alignment */}
              </div>

              {/* Scrollable day headers */}
              <div
                className="flex-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                ref={headerScrollRef}
                onScroll={(e) => {
                  if (scrollContainerRef.current) {
                    scrollContainerRef.current.scrollLeft = e.target.scrollLeft;
                  }
                }}
              >
                <TimeHeaders
                  currentDate={currentDate}
                  referenceDate={currentDate}
                  view={view}
                  handleDayClick={handleDayClick}
                  scrollContainerRef={headerScrollRef}
                  numWeeks={numWeeks}
                  numDays={numDays}
                />
              </div>
            </div>

            {/* Scrollable Grid Area (no scrollbars) */}
            <div className="flex-1 time-slots bg-muted/5 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div className="relative min-h-full flex" style={{ margin: 0, padding: 0 }}>
                {/* Time Labels - fixed, doesn't scroll horizontally - OUTSIDE scroll container */}
                <div
                  className="sticky flex-shrink-0 bg-background/95 backdrop-blur-sm z-10"
                  style={{
                    width: '4rem',
                    height: '1440px',
                    position: 'sticky',
                    left: 0,
                    top: 0,
                    alignSelf: 'flex-start',
                    borderLeft: '1px solid hsl(var(--border))',
                    borderRight: '1px solid hsl(var(--border))',
                    boxSizing: 'border-box',
                    margin: 0,
                    padding: 0
                  }}
                >
                  {Array.from({ length: 24 }, (_, i) => {
                    const hour = i;
                    return (
                      <div key={i} className="h-[60px] text-[10px] text-muted-foreground text-right pr-4 relative">
                        <span className="text-[10px] pb-1">
                          {hour < 10 ? `0${hour}:00` : `${hour}:00`}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Scrollable Grid Container - horizontal scroll only with week snapping */}
                <div
                  className="flex-1 calendar-scroll-container overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                  style={{ scrollSnapType: 'x mandatory', scrollBehavior: 'smooth' }}
                  ref={scrollContainerRef}
                  onScroll={(e) => {
                    if (headerScrollRef.current) {
                      headerScrollRef.current.scrollLeft = e.target.scrollLeft;
                    }
                  }}
                >
                  <div className="relative min-h-full min-w-max">
                    {/* The Actual Grid */}
                    <div className="time-grid h-full relative min-w-max">
                      <TimeGrid
                        view={view}
                        events={filteredEvents}
                        selectedEventId={selectedEventId}
                        currentDate={currentDate}
                        referenceDate={currentDate}
                        getEventsForCurrentWeek={() => getEventsForCurrentWeek(events, getWeekDates(currentDate))}
                        validatedEvents={validatedEvents}
                        onEventClick={handleEventClick}
                        onEventRightClick={handleEventRightClick}
                        onEventMove={handleGridEventMove}
                        onEventResize={handleGridEventResize}
                        onCreateEvent={handleGridCreateEvent}
                        scrollContainerRef={scrollContainerRef}
                        numWeeks={numWeeks}
                        numDays={numDays}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
          </>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <EventContextMenu
          event={contextMenu.event}
          position={contextMenu.position}
          onClose={handleContextMenuClose}
          onDelete={handleContextMenuDelete}
          onColorChange={handleEventColorChange}
          colorOptions={CALENDAR_COLORS}
        />
      )}

      {/* Event Panel */}
      {selectedEvent && (
        <>

          <EventPanel
            event={selectedEvent}
            onClose={() => {
              handlePanelClose(events, setEvents);
            }}
            onSave={handleEventSave}
            onDelete={() => {
              if (selectedEvent && selectedEvent.id) {
                setEventToDelete(selectedEvent);
                setShowDeleteConfirmation(true);
              }
            }}
            colorOptions={CALENDAR_COLORS}
            accountType={accountType}
            userData={userData}
            workspaceContext={workspaceContext}
          />
        </>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirmation && eventToDelete && (
        <DeleteConfirmationDialog
          event={eventToDelete}
          currentDate={new Date(eventToDelete.start)}
          onConfirm={(deleteType) => handleEventDelete(eventToDelete.id, deleteType, events, setEvents)}
          onCancel={() => { setShowDeleteConfirmation(false); setEventToDelete(null); }}
        />
      )}

      {/* Filters Overlay */}
      {showFiltersOverlay && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowFiltersOverlay(false)}
          />
          <div className={cn(
            "fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border rounded-t-2xl shadow-2xl",
            "animate-in slide-in-from-bottom duration-300"
          )} style={{ height: '75vh' }}>
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-semibold m-0">{t('calendar:categoryFilters')}</h3>
              <button
                onClick={() => setShowFiltersOverlay(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-2" style={{ height: 'calc(75vh - 73px)', scrollbarGutter: 'stable' }}>
              {categories.map((category, index) => (
                <label
                  key={index}
                  className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
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
                  <span className="text-sm font-medium">{category.name}</span>
                </label>
              ))}
              {hasActiveFilters && (
                <button
                  onClick={() => {
                    handleResetCategories();
                    setShowFiltersOverlay(false);
                  }}
                  className="w-full h-10 rounded-lg border border-input bg-background text-sm font-medium hover:bg-muted transition-all mt-4"
                >
                  {t('calendar:resetAll')}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

Calendar.propTypes = {
  userData: PropTypes.object
};

export default Calendar;