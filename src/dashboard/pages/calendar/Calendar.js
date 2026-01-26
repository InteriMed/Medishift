import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CALENDAR_COLORS } from './utils/constants';
import { getMultipleWeeks, getMultipleDays, getShortDays, isSameDay } from './utils/dateHelpers';
import { getUserTypeFromData, getUserIdFromData } from './utils/userHelpers';
import { filterEventsByCategories } from './utils/eventUtils';
import CalendarHeader from './components/CalendarHeader';
import CalendarSidebar from './components/CalendarSidebar';
import TimeHeaders from './components/TimeHeaders';
import TimeGrid from './components/TimeGrid';
import DeleteConfirmationDialog from './components/DeleteConfirmationDialog';
import EventContextMenu from './components/EventContextMenu';
import EventPanel from './EventPanel/EventPanel';
import { useDashboard } from '../../contexts/DashboardContext';
import { useSidebar } from '../../contexts/SidebarContext';
import { useCalendarState } from './hooks/useCalendarState';
import { useCalendarEvents } from './utils/eventDatabase';
import { cn } from '../../../utils/cn';
import { FiX } from 'react-icons/fi';
import ResourceGrid from './components/ResourceGrid';
import useProfileData from '../../hooks/useProfileData';
import useCalendarStore from './hooks/useCalendarStore';
import { WORKSPACE_TYPES } from '../../../utils/sessionAuth';

import PropTypes from 'prop-types';

const Calendar = ({ userData }) => {
  const { t, i18n } = useTranslation(['dashboard', 'calendar']);
  const { selectedWorkspace } = useDashboard();

  const accountType = getUserTypeFromData(userData);
  const userId = getUserIdFromData(userData);
  const { isMainSidebarCollapsed } = useSidebar();
  const [showFiltersOverlay, setShowFiltersOverlay] = useState(false);
  const scrollContainerRef = useRef(null);
  const headerScrollRef = useRef(null);

  const [calendarMode, setCalendarMode] = useState('calendar');
  const [showMiniCalendar, setShowMiniCalendar] = useState(true);
  const [showUpcomingEvents, setShowUpcomingEvents] = useState(true);
  const [nightView, setNightView] = useState(false);
  const [showTopHeader, setShowTopHeader] = useState(true);
  const [showBottomHeader, setShowBottomHeader] = useState(false);
  const timeSlotsScrollRef = useRef(null);

  const isTeamWorkspace = selectedWorkspace?.type === WORKSPACE_TYPES.TEAM || selectedWorkspace?.type === WORKSPACE_TYPES.FACILITY || !!selectedWorkspace?.facilityId;

  const { profileData, isLoading: isLoadingProfile, updateProfileData } = useProfileData();

  const getWorkspaceContext = () => {
    if (!selectedWorkspace) {
      return { type: 'personal', role: 'professional' };
    }
    let role = selectedWorkspace.role;
    if (role === 'admin') role = 'manager';
    return { type: selectedWorkspace.type, role: role };
  };

  const workspaceContext = getWorkspaceContext();

  // Initialize Store Context
  useEffect(() => {
    useCalendarStore.getState().setContext(userId, accountType, workspaceContext);
  }, [userId, accountType, JSON.stringify(workspaceContext)]);

  // Connect to Zustand Store
  const events = useCalendarStore(state => state.events);
  const setEvents = useCalendarStore(state => state.setEvents);
  const selectedEvent = useCalendarStore(state => state.selectedEvent);
  const selectedEventId = useCalendarStore(state => state.selectedEventId);
  const showDeleteConfirmation = useCalendarStore(state => state.showDeleteConfirmation);
  const eventToDelete = useCalendarStore(state => state.eventToDelete);
  const contextMenu = useCalendarStore(state => state.showContextMenu ? { event: state.contextMenuEvent, position: state.contextMenuPosition } : null);

  // Store actions
  const handleEventClick = useCalendarStore(state => state.handleEventClick);
  const handlePanelClose = useCalendarStore(state => state.handlePanelClose);
  const handleEventSave = useCalendarStore(state => state.saveEvent);
  const handleEventDelete = useCalendarStore(state => state.deleteEvent);
  const setEventToDelete = useCalendarStore(state => state.showDeleteDialog);
  const setShowDeleteConfirmation = (show) => !show && useCalendarStore.getState().hideDeleteDialog();
  const setContextMenu = (val) => !val && useCalendarStore.getState().hideContextMenu();
  const handleCreateEventClick = useCalendarStore(state => state.handleCreateEventClick);
  const addToHistory = useCalendarStore(state => state.addToHistory);
  const undo = useCalendarStore(state => state.undo);
  const redo = useCalendarStore(state => state.redo);
  const syncPendingChanges = useCalendarStore(state => state.syncPendingChanges);

  // Calendar State Hook (kept separate effectively as UI state)
  const {
    currentDate, setCurrentDate, view, setView,
    categories, setCategories, isSidebarCollapsed, setIsSidebarCollapsed,
    showHeaderDateDropdown, setShowHeaderDateDropdown, dropdownPosition,
    navigateDate, handleDayClick, handleUpcomingEventClick,
    handleCategoryToggle, handleHeaderDateClick, toggleSidebar
  } = useCalendarState();

  // Track the actual visible week for MiniCalendar highlighting
  const [visibleWeekStart, setVisibleWeekStart] = useState(() => {
    const start = new Date(currentDate);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
    start.setHours(0, 0, 0, 0);
    return start;
  });
  const [visibleWeekEnd, setVisibleWeekEnd] = useState(() => {
    const end = new Date(currentDate);
    const day = end.getDay();
    const diff = day === 0 ? 0 : 7 - day;
    end.setDate(end.getDate() + diff);
    end.setHours(23, 59, 59, 999);
    return end;
  });

  const numWeeks = 0;
  const [numDays, setNumDays] = useState(30);
  const prevNumDays = useRef(numDays);
  const hasInitialScrolled = useRef(false);

  // Scroll Compensation
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

  // Scroll to selected date
  useEffect(() => {
    const gridScroll = scrollContainerRef.current;
    if (!gridScroll || view !== 'week') return;

    const weekStart = new Date(currentDate);
    const day = weekStart.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    weekStart.setDate(weekStart.getDate() + diff);
    weekStart.setHours(0, 0, 0, 0);

    const weeks = getMultipleWeeks(currentDate, numWeeks, numWeeks);
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

    const containerWidth = gridScroll.clientWidth;
    const targetScrollLeft = targetWeekIndex * containerWidth;

    gridScroll.scrollTo({
      left: targetScrollLeft,
      behavior: hasInitialScrolled.current ? 'smooth' : 'auto'
    });

    if (!hasInitialScrolled.current) {
      hasInitialScrolled.current = true;
    }
  }, [currentDate, view, numWeeks]);

  // Track scroll position
  useEffect(() => {
    const gridScroll = scrollContainerRef.current;
    if (!gridScroll || view !== 'week') return;

    let scrollTimeout;
    const handleScrollUpdate = () => {
      const scrollLeft = gridScroll.scrollLeft;
      const containerWidth = gridScroll.clientWidth;
      if (containerWidth === 0) return;

      const visibleWeekIndex = Math.round(scrollLeft / containerWidth);
      const weeks = getMultipleWeeks(currentDate, numWeeks, numWeeks);

      if (visibleWeekIndex >= 0 && visibleWeekIndex < weeks.length) {
        const visibleWeek = weeks[visibleWeekIndex];
        const weekStart = new Date(visibleWeek[0]);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(visibleWeek[6]);
        weekEnd.setHours(23, 59, 59, 999);

        const currentStartKey = `${visibleWeekStart.getFullYear()}-${visibleWeekStart.getMonth()}-${visibleWeekStart.getDate()}`;
        const newStartKey = `${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`;

        if (currentStartKey !== newStartKey) {
          setVisibleWeekStart(weekStart);
          setVisibleWeekEnd(weekEnd);
        }
      }
    };

    const throttledScrollUpdate = () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(handleScrollUpdate, 150);
    };

    gridScroll.addEventListener('scroll', throttledScrollUpdate, { passive: true });
    handleScrollUpdate();
    return () => {
      gridScroll.removeEventListener('scroll', throttledScrollUpdate);
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, [scrollContainerRef, view, currentDate, numWeeks, visibleWeekStart]);

  // Periodic Auto-Sync
  useEffect(() => {
    const syncInterval = setInterval(() => {
      syncPendingChanges();
    }, 5 * 60 * 1000);
    return () => clearInterval(syncInterval);
  }, [syncPendingChanges]);

  const { events: calendarEvents } = useCalendarEvents(userId, accountType);
  const prevCalendarEventsRef = useRef(null);

  // Merge Database Events with Local State
  useEffect(() => {
    if (!userId || !Array.isArray(calendarEvents)) return;

    const eventsWithDbFlag = calendarEvents.map(event => ({
      ...event,
      fromDatabase: true,
      isValidated: event.isValidated !== undefined ? event.isValidated : true
    }));

    const currentEvents = useCalendarStore.getState().events;
    const tempEvents = currentEvents.filter(e => !e.fromDatabase);

    // Merge: DB events + Local Temp events
    const merged = [...eventsWithDbFlag, ...tempEvents];

    // Update store
    setEvents(merged);
  }, [calendarEvents, userId, setEvents]);

  // Auto-scroll to 8 AM
  useEffect(() => {
    const timeSlots = document.querySelector('.time-slots');
    if (timeSlots) timeSlots.scrollTop = (8 - 1) * 60;
  }, []);

  // Handle scroll for night mode header visibility
  useEffect(() => {
    if (!nightView) {
      setShowTopHeader(true);
      setShowBottomHeader(false);
      return;
    }
    
    const timeSlots = timeSlotsScrollRef.current || document.querySelector('.time-slots');
    if (!timeSlots) return;

    const handleScroll = () => {
      const scrollTop = timeSlots.scrollTop;
      const scrollHeight = timeSlots.scrollHeight;
      const clientHeight = timeSlots.clientHeight;
      const scrollBottom = scrollHeight - scrollTop - clientHeight;
      
      setShowTopHeader(scrollTop < 50);
      setShowBottomHeader(scrollBottom < 50);
    };

    timeSlots.addEventListener('scroll', handleScroll);
    handleScroll();
    
    return () => {
      timeSlots.removeEventListener('scroll', handleScroll);
    };
  }, [nightView]);

  // Sync scroll headers
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

  // Keyboard Shortcuts (Inline Adapter)
  useEffect(() => {
    const handleKeys = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((e.ctrlKey && e.shiftKey && e.key === 'Z') || (e.ctrlKey && e.key === 'y')) { e.preventDefault(); redo(); }
      else if (e.key === 'Delete' && selectedEventId && !showDeleteConfirmation) { e.preventDefault(); useCalendarStore.getState().showDeleteDialog(selectedEvent); }
      else if (e.key === 'Escape') { e.preventDefault(); handlePanelClose(); }
    };
    document.addEventListener('keydown', handleKeys);
    return () => document.removeEventListener('keydown', handleKeys);
  }, [undo, redo, selectedEventId, showDeleteConfirmation, selectedEvent, handlePanelClose]);


  const handleResetCategories = useCallback(() => {
    setCategories(prev => prev.map(c => ({ ...c, checked: true })));
  }, [setCategories]);

  const hasActiveFilters = categories.some(cat => !cat.checked);
  const filteredEvents = filterEventsByCategories(events, categories, CALENDAR_COLORS);

  // Simplified Grid Handlers passing to store
  const handleGridCreateEvent = (event) => {
    // Logic for new event creation on grid interact
    useCalendarStore.getState().addEvent(event);
    useCalendarStore.getState().setSelectedEvent(event);
    useCalendarStore.getState().setOriginalEventPosition(event);
  };

  const handleGridEventMove = (id, start, end, isTemporary) => {
    // Direct manipulation of store events for drag
    // This requires a "updateEventPosition" action to be specific or usage of updateEventLocal
    if (isTemporary) {
      useCalendarStore.getState().setIsDragging(true);
      useCalendarStore.getState().updateEventLocal(id, { start, end, isBeingMoved: true });
    } else {
      useCalendarStore.getState().setIsDragging(false);
      // Open confirmation or verify
      const event = events.find(e => e.id === id);
      useCalendarStore.getState().showMoveDialog(event, useCalendarStore.getState().originalEventPosition, { start, end });
      // Note: originalEventPosition logic might need to be set on DragStart
      // For now, assuming direct update
      useCalendarStore.getState().updateEventLocal(id, { start, end, isBeingMoved: false });
      useCalendarStore.getState().markEventForSync(id);
    }
  };

  const handleGridEventResize = (id, start, end, isTemporary) => {
    useCalendarStore.getState().updateEventLocal(id, { start, end });
    if (!isTemporary) useCalendarStore.getState().markEventForSync(id);
  };

  const handleEventDropOnDay = (draggedEvent, targetDate) => {
    const originalStart = new Date(draggedEvent.start);
    const originalEnd = new Date(draggedEvent.end);
    const duration = originalEnd.getTime() - originalStart.getTime();

    const newStart = new Date(targetDate);
    newStart.setHours(originalStart.getHours(), originalStart.getMinutes(), originalStart.getSeconds(), 0);

    const newEnd = new Date(newStart.getTime() + duration);

    const event = events.find(e => e.id === draggedEvent.id);
    if (event) {
      const originalEventPosition = {
        ...event,
        start: new Date(event.start),
        end: new Date(event.end)
      };
      
      useCalendarStore.getState().setOriginalEventPosition(originalEventPosition);
      useCalendarStore.getState().showMoveDialog(event, {
        start: new Date(event.start),
        end: new Date(event.end)
      }, { start: newStart, end: newEnd });
      useCalendarStore.getState().updateEventLocal(draggedEvent.id, { start: newStart, end: newEnd, isBeingMoved: false });
      useCalendarStore.getState().markEventForSync(draggedEvent.id);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500">
      <div className={cn(
        "flex-1 flex relative min-h-0 mx-4 my-4",
        "gap-6"
      )} style={{ overflow: 'visible' }}>
        {(
          <>
            {(showMiniCalendar || showUpcomingEvents) && (
              <div className={cn(
                "dashboard-sidebar-container",
                isMainSidebarCollapsed ? "flex" : (isSidebarCollapsed ? "hidden lg:flex w-0" : "flex"),
                "dashboard-sidebar-container-desktop calendar-sidebar pr-0"
              )} style={{ overflow: 'visible' }}>
                <div className={cn(
                  "dashboard-sidebar-inner",
                  "p-0 !bg-transparent !border-0 !shadow-none"
                )} style={{ overflow: 'visible' }}>
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
                    showMiniCalendar={showMiniCalendar}
                    showUpcomingEvents={showUpcomingEvents}
                  />
                </div>
              </div>
            )}

            <div className={cn(
              "dashboard-main-content",
              "dashboard-main-content-desktop",
              !(showMiniCalendar || showUpcomingEvents) && "flex-1"
            )}>
              <div className="dashboard-main-inner flex flex-col h-full">
                <div className="shrink-0 w-full bg-card border-b border-border px-6 py-2" style={{ minHeight: 'var(--boxed-inputfield-height)' }}>
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
                handleCreateEventClick={() => handleCreateEventClick(currentDate)}
                showMiniCalendar={showMiniCalendar}
                setShowMiniCalendar={setShowMiniCalendar}
                showUpcomingEvents={showUpcomingEvents}
                setShowUpcomingEvents={setShowUpcomingEvents}
                nightView={nightView}
                setNightView={setNightView}
              />
                </div>

                  <div className="flex-1 h-full flex flex-col calendar-grid overflow-hidden">
                  {calendarMode !== 'team' || !isTeamWorkspace ? (
                    <div className="flex shrink-0">
                      <div
                        className="shrink-0 bg-background/95 backdrop-blur-sm z-10 flex items-end justify-center pb-2"
                        style={{ width: '4rem', minHeight: '3rem' }}
                      />
                      <div
                        className="flex-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                        ref={headerScrollRef}
                      >
                      <div className={cn(
                        "transition-opacity duration-200",
                        nightView && !showTopHeader ? "opacity-0 pointer-events-none" : "opacity-100"
                      )}>
                        <TimeHeaders
                          currentDate={currentDate}
                          referenceDate={currentDate}
                          view={view}
                          handleDayClick={handleDayClick}
                          scrollContainerRef={headerScrollRef}
                          numWeeks={numWeeks}
                          numDays={numDays}
                          setView={setView}
                          onEventDropOnDay={handleEventDropOnDay}
                          nightView={nightView}
                        />
                      </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex-1 time-slots bg-muted/5 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" ref={timeSlotsScrollRef}>
                    <div className="relative min-h-full flex">
                      {calendarMode === 'team' && isTeamWorkspace ? (
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
                          scrollContainerRef={scrollContainerRef}
                          headerScrollRef={headerScrollRef}
                          nightView={nightView}
                        />
                      ) : (
                        <>
                          <div
                            className="sticky shrink-0 bg-background/95 backdrop-blur-sm z-10"
                            style={{ width: '4rem', height: nightView ? '1440px' : '1440px', left: 0, top: 0, alignSelf: 'flex-start' }}
                          >
                            {nightView ? (
                              <>
                                {Array.from({ length: 12 }, (_, i) => {
                                  const hour = i + 12;
                                  return (
                                    <div key={`prev-${i}`} className="h-[60px] text-[10px] text-right pr-4 relative">
                                      <span className={cn("text-[10px] pb-1", i === 0 ? "text-red-500 font-semibold" : "text-muted-foreground")}>
                                        {hour < 10 ? `0${hour}:00` : `${hour}:00`}
                                      </span>
                                    </div>
                                  );
                                })}
                                {Array.from({ length: 12 }, (_, i) => (
                                  <div key={`next-${i}`} className="h-[60px] text-[10px] text-right pr-4 relative">
                                    <span className={cn("text-[10px] pb-1", i === 0 ? "text-red-500 font-semibold" : "text-muted-foreground")}>
                                      {i < 10 ? `0${i}:00` : `${i}:00`}
                                    </span>
                                  </div>
                                ))}
                              </>
                            ) : (
                              Array.from({ length: 24 }, (_, i) => (
                                <div key={i} className="h-[60px] text-[10px] text-muted-foreground text-right pr-4 relative">
                                  <span className="text-[10px] pb-1">{i < 10 ? `0${i}:00` : `${i}:00`}</span>
                                </div>
                              ))
                            )}
                          </div>
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
                            <TimeGrid
                              view={view}
                              events={filteredEvents}
                              selectedEventId={selectedEventId}
                              currentDate={currentDate}
                              referenceDate={currentDate}
                              getEventsForCurrentWeek={() => { }}
                              validatedEvents={useCalendarStore.getState().validatedEvents}
                              onEventClick={handleEventClick}
                              onEventRightClick={(e, event) => useCalendarStore.getState().showContextMenuAt({ x: e.clientX, y: e.clientY }, event)}
                              onEventMove={handleGridEventMove}
                              onEventResize={handleGridEventResize}
                              onCreateEvent={handleGridCreateEvent}
                              scrollContainerRef={scrollContainerRef}
                              numWeeks={numWeeks}
                              numDays={numDays}
                              nightView={nightView}
                            />
                          </div>
                          {nightView && (() => {
                            const shortDays = getShortDays(i18n.language || 'en');
                            const today = new Date();
                            
                            let allDays;
                            if (view === 'day') {
                              const nextDay = new Date(currentDate);
                              nextDay.setDate(nextDay.getDate() + 1);
                              allDays = [nextDay];
                            } else {
                              const weeks = getMultipleWeeks(currentDate, numWeeks, numWeeks);
                              const baseDays = weeks.flat();
                              allDays = baseDays.map(date => {
                                const nextDay = new Date(date);
                                nextDay.setDate(nextDay.getDate() + 1);
                                return nextDay;
                              });
                            }
                            
                            return (
                              <div
                                className={cn(
                                  "sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm z-10 border-t-2 border-red-500 transition-opacity duration-200",
                                  showBottomHeader ? "opacity-100" : "opacity-0 pointer-events-none"
                                )}
                                style={{ marginLeft: '4rem' }}
                              >
                                <div
                                  className="time-headers flex py-2"
                                  style={{
                                    width: view === 'day' ? `${allDays.length * 100}%` : `${allDays.length * (100 / 7)}%`,
                                    minWidth: view === 'day' ? `${allDays.length * 100}%` : `${allDays.length * (100 / 7)}%`
                                  }}
                                >
                                  {allDays.map((date, index) => {
                                    const isToday = isSameDay(date, today);
                                    const dayOfWeek = date.getDay();
                                    const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                                    
                                    return (
                                      <div
                                        key={`bottom-${index}`}
                                        className="flex flex-col items-center justify-center cursor-pointer transition-colors hover:bg-muted/50 pb-2"
                                        style={{
                                          width: view === 'day' ? `${100 / allDays.length}%` : `${100 / allDays.length}%`,
                                          flexShrink: 0,
                                          minWidth: view === 'day' ? `${100 / allDays.length}%` : `${100 / allDays.length}%`,
                                          minHeight: '3rem'
                                        }}
                                        onClick={() => {
                                          const clickedDate = new Date(date);
                                          clickedDate.setHours(0, 0, 0, 0);
                                          handleDayClick(clickedDate);
                                          if (setView) {
                                            setView('day');
                                          }
                                        }}
                                      >
                                        <div className="uppercase text-red-500 font-semibold tracking-wider mb-1" style={{ fontSize: 'var(--font-size-small)', fontWeight: 'var(--font-weight-medium)' }}>
                                          {shortDays[dayIndex]}
                                        </div>
                                        <div
                                          className={cn(
                                            "flex items-center justify-center w-8 h-8 rounded-full transition-all",
                                            isToday ? 'bg-red-500 text-white' : 'text-red-500'
                                          )}
                                          style={{ fontSize: 'var(--font-size-medium)', fontWeight: 'var(--font-weight-medium)' }}
                                        >
                                          {date.getDate()}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {contextMenu && (
        <EventContextMenu
          event={contextMenu.event}
          position={contextMenu.position}
          onClose={() => setContextMenu(null)}
          onDelete={() => useCalendarStore.getState().showDeleteDialog(contextMenu.event)}
          onColorChange={(event, color) => useCalendarStore.getState().updateEventLocal(event.id, { color: color.color, category: color.name })}
          colorOptions={CALENDAR_COLORS}
        />
      )}

      {selectedEvent && (
        <EventPanel
          event={selectedEvent}
          onClose={handlePanelClose}
          onSave={handleEventSave}
          onDelete={() => setEventToDelete(selectedEvent)}
          colorOptions={CALENDAR_COLORS}
          accountType={accountType}
          userData={userData}
          workspaceContext={workspaceContext}
        />
      )}

      {showDeleteConfirmation && eventToDelete && (
        <DeleteConfirmationDialog
          event={eventToDelete}
          currentDate={new Date(eventToDelete.start)}
          onConfirm={(deleteType) => handleEventDelete(eventToDelete.id, deleteType)}
          onCancel={() => setShowDeleteConfirmation(false)}
        />
      )}

      {showFiltersOverlay && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowFiltersOverlay(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-300" style={{ height: '75vh' }}>
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-semibold m-0">{t('calendar:categoryFilters')}</h3>
              <button onClick={() => setShowFiltersOverlay(false)} className="p-2 hover:bg-muted rounded-lg transition-colors">
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-2" style={{ height: 'calc(75vh - 73px)', scrollbarGutter: 'stable' }}>
              {categories.map((category, index) => (
                <label key={index} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors">
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
                    <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium">{category.name}</span>
                </label>
              ))}
              {hasActiveFilters && (
                <button
                  onClick={() => { handleResetCategories(); setShowFiltersOverlay(false); }}
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