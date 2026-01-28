import React, { useState, useEffect, useCallback, useRef, useLayoutEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CALENDAR_COLORS } from './utils/constants';
import { getMultipleWeeks } from './utils/dateHelpers';
import { getUserTypeFromData, getUserIdFromData } from './utils/userHelpers';
import { filterEventsByCategories } from './utils/eventUtils';
import CalendarHeader from './components/CalendarHeader';
import CalendarSidebar from './components/CalendarSidebar';
import TimeHeaders from './components/TimeHeaders';
import TimeGrid from './components/TimeGrid';
import DeleteConfirmationmodal from './components/DeleteConfirmationDialog';
import EventContextMenu from './components/EventContextMenu';
import EventPanel from './eventPanel/EventPanel';
import { useDashboard } from '../../../dashboard/contexts/dashboardContext';
import { useSidebar } from '../../onboarding/sidebarContext';
import { useCalendarState } from './hooks/useCalendarState';
import { useCalendarEvents } from './utils/eventDatabase';
import { cn } from '../../../utils/cn';
import { FiX, FiPlus } from 'react-icons/fi';
import { useSearchParams } from 'react-router-dom';
import ResourceGrid from './components/ResourceGrid';
import useProfileData from '../../hooks/useProfileData';
import useCalendarStore from './hooks/useCalendarStore';
import { WORKSPACE_TYPES } from '../../../config/workspaceDefinitions';
import { useAction } from '../../../services/actions/hook';

import PropTypes from 'prop-types';

const Calendar = ({ userData }) => {
  const { t } = useTranslation(['dashboard', 'calendar', 'dashboardProfile']);
  const { selectedWorkspace } = useDashboard();
  const [searchParams, setSearchParams] = useSearchParams();
  const { execute } = useAction();

  const accountType = getUserTypeFromData(userData);
  const userId = getUserIdFromData(userData);
  const { isMainSidebarCollapsed } = useSidebar();
  const [showFiltersOverlay, setShowFiltersOverlay] = useState(false);
  const scrollContainerRef = useRef(null);
  const headerScrollRef = useRef(null);

  const isTeamWorkspace = selectedWorkspace?.type === WORKSPACE_TYPES.TEAM || selectedWorkspace?.type === WORKSPACE_TYPES.FACILITY || selectedWorkspace?.type === 'organization' || !!selectedWorkspace?.facilityId;

  const getInitialCalendarMode = () => {
    const mode = searchParams.get('mode');
    if (mode === 'calendar') return 'calendar';
    if (mode === 'team') return 'team';
    return isTeamWorkspace ? 'team' : 'calendar';
  };

  const getInitialNightView = () => {
    const night = searchParams.get('night');
    return night === 'true';
  };

  const [calendarMode, setCalendarMode] = useState(getInitialCalendarMode);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const isBelow1200Initial = typeof window !== 'undefined' ? window.innerWidth < 1200 : false;
  const [showMiniCalendar, setShowMiniCalendar] = useState(!isBelow1200Initial);
  const [showUpcomingEvents, setShowUpcomingEvents] = useState(!isBelow1200Initial);
  const [nightView, setNightView] = useState(getInitialNightView);
  const [openAddRoleModal, setOpenAddRoleModal] = useState(false);
  const processedModalRef = useRef(null);
  const [isOverlayExpanded, setIsOverlayExpanded] = useState(false);

  const { profileData, isLoading: isLoadingProfile, updateProfileData } = useProfileData();

  useEffect(() => {
    const handleResize = () => {
      const newWidth = window.innerWidth;
      setWindowWidth(newWidth);
      if (newWidth >= 1200) {
        setIsOverlayExpanded(false);
        setShowMiniCalendar(true);
        setShowUpcomingEvents(true);
      } else {
        setShowMiniCalendar(false);
        setShowUpcomingEvents(false);
        setIsOverlayExpanded(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isBelow1200 = windowWidth < 1200;

  const handleToggleOverlay = () => {
    if (isOverlayExpanded) {
      setIsOverlayExpanded(false);
      setShowMiniCalendar(false);
      setShowUpcomingEvents(false);
    } else {
      setIsOverlayExpanded(true);
      setShowMiniCalendar(true);
      setShowUpcomingEvents(true);
    }
  };

  const handleArrowToggle = () => {
    const newCollapsedState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newCollapsedState);
    
    if (newCollapsedState) {
      setShowMiniCalendar(false);
      setShowUpcomingEvents(false);
    } else {
      setShowMiniCalendar(true);
      setShowUpcomingEvents(true);
    }
  };

  const handleMiniCalendarToggle = () => {
    const newValue = !showMiniCalendar;
    setShowMiniCalendar(newValue);
    
    if (newValue) {
      setIsOverlayExpanded(true);
      if (showUpcomingEvents || newValue) {
        setIsSidebarCollapsed(false);
      }
    } else {
      if (!showUpcomingEvents) {
        setIsOverlayExpanded(false);
        setIsSidebarCollapsed(true);
      }
    }
  };

  const handleUpcomingEventsToggle = () => {
    const newValue = !showUpcomingEvents;
    setShowUpcomingEvents(newValue);
    
    if (newValue) {
      setIsOverlayExpanded(true);
      if (showMiniCalendar || newValue) {
        setIsSidebarCollapsed(false);
      }
    } else {
      if (!showMiniCalendar) {
        setIsOverlayExpanded(false);
        setIsSidebarCollapsed(true);
      }
    }
  };

  const workspaceContext = useMemo(() => {
    if (!selectedWorkspace) {
      return { type: 'personal', role: 'professional' };
    }
    let role = selectedWorkspace.role;
    if (role === 'admin') role = 'manager';
    return { type: selectedWorkspace.type, role: role };
  }, [selectedWorkspace]);

  // Initialize Store Context and inject execute function
  useEffect(() => {
    useCalendarStore.getState().setContext(userId, accountType, workspaceContext);
    useCalendarStore.getState().setExecute(execute);
  }, [userId, accountType, workspaceContext, execute]);

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
  const setEventToDelete = useCalendarStore(state => state.showDeletemodal);
  const setShowDeleteConfirmation = (show) => !show && useCalendarStore.getState().hideDeletemodal();
  const setContextMenu = (val) => !val && useCalendarStore.getState().hideContextMenu();
  const handleCreateEventClick = useCalendarStore(state => state.handleCreateEventClick);
  const undo = useCalendarStore(state => state.undo);
  const redo = useCalendarStore(state => state.redo);
  const syncPendingChanges = useCalendarStore(state => state.syncPendingChanges);

  const calendarState = useCalendarState();
  const {
    currentDate, setCurrentDate, view, setView: setViewState,
    categories, setCategories, isSidebarCollapsed = false, setIsSidebarCollapsed,
    showHeaderDateDropdown, setShowHeaderDateDropdown, dropdownPosition,
    navigateDate, handleDayClick, handleUpcomingEventClick,
    handleCategoryToggle, handleHeaderDateClick, toggleSidebar
  } = calendarState;

  const isUpdatingURL = useRef(false);
  const isReadingFromURL = useRef(false);
  const prevSearchParams = useRef(searchParams.toString());

  const updateURLParams = useCallback((updates) => {
    if (isUpdatingURL.current) return;
    
    isUpdatingURL.current = true;
    const newParams = new URLSearchParams(searchParams);
    let hasChanges = false;
    
    Object.entries(updates).forEach(([key, value]) => {
      const currentValue = newParams.get(key);
      const newValue = value === null || value === undefined || value === '' || value === false ? null : String(value);
      
      if (currentValue !== newValue) {
        hasChanges = true;
        if (newValue === null) {
          newParams.delete(key);
        } else {
          newParams.set(key, newValue);
        }
      }
    });
    
    if (hasChanges) {
      setSearchParams(newParams, { replace: true });
      prevSearchParams.current = newParams.toString();
    }
    isUpdatingURL.current = false;
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const currentParams = searchParams.toString();
    if (currentParams === prevSearchParams.current) return;
    
    prevSearchParams.current = currentParams;
    isReadingFromURL.current = true;
    isUpdatingURL.current = true;
    
    const viewParam = searchParams.get('view');
    const modeParam = searchParams.get('mode');
    const nightParam = searchParams.get('night');

    if (viewParam && (viewParam === 'day' || viewParam === 'week') && view !== viewParam) {
      setViewState(viewParam);
    }
    if (modeParam && (modeParam === 'team' || modeParam === 'calendar') && calendarMode !== modeParam) {
      setCalendarMode(modeParam);
    }
    if (nightParam === 'true' && !nightView) {
      setNightView(true);
    } else if (nightParam !== 'true' && nightView && nightParam !== null) {
      setNightView(false);
    }
    
    isReadingFromURL.current = false;
    isUpdatingURL.current = false;
  }, [searchParams, view, calendarMode, nightView, setViewState]);

  useEffect(() => {
    if (!isReadingFromURL.current) {
      updateURLParams({ view: view !== 'week' ? view : null });
    }
  }, [view, updateURLParams]);

  useEffect(() => {
    if (!isReadingFromURL.current) {
      updateURLParams({ mode: calendarMode !== 'calendar' ? calendarMode : null });
    }
  }, [calendarMode, updateURLParams]);

  useEffect(() => {
    if (!isReadingFromURL.current) {
      updateURLParams({ night: nightView ? 'true' : null });
    }
  }, [nightView, updateURLParams]);

  useEffect(() => {
    const modalParam = searchParams.get('modal');
    const eventId = searchParams.get('eventId');
    const currentModalKey = `${modalParam}-${eventId || ''}`;
    
    if (processedModalRef.current === currentModalKey) {
      return;
    }
    
    if (modalParam === 'event' && eventId && events.length > 0) {
      const event = events.find(e => e.id === eventId);
      if (event && !selectedEvent) {
        handleEventClick(event);
        processedModalRef.current = currentModalKey;
      }
    } else if (modalParam === 'addRole') {
      if (!openAddRoleModal) {
        setOpenAddRoleModal(true);
        processedModalRef.current = currentModalKey;
      }
    } else if (modalParam === 'filters') {
      if (!showFiltersOverlay) {
        setShowFiltersOverlay(true);
        processedModalRef.current = currentModalKey;
      }
    } else if (!modalParam) {
      processedModalRef.current = null;
      if (openAddRoleModal) {
        setOpenAddRoleModal(false);
      }
      if (showFiltersOverlay) {
        setShowFiltersOverlay(false);
      }
    }
  }, [searchParams, events, selectedEvent, openAddRoleModal, showFiltersOverlay, handleEventClick]);

  const handlePanelCloseWithURL = useCallback(() => {
    handlePanelClose();
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('modal');
    newParams.delete('eventId');
    setSearchParams(newParams, { replace: true });
  }, [handlePanelClose, searchParams, setSearchParams]);

  const handleAddRoleModalClose = useCallback(() => {
    setOpenAddRoleModal(false);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('modal');
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleFiltersOverlayClose = useCallback(() => {
    setShowFiltersOverlay(false);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('modal');
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleEventClickWithURL = useCallback((event) => {
    handleEventClick(event);
    if (event?.id) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('modal', 'event');
      newParams.set('eventId', event.id);
      setSearchParams(newParams, { replace: true });
    }
  }, [handleEventClick, searchParams, setSearchParams]);

  const handleOpenAddRoleModal = useCallback(() => {
    setOpenAddRoleModal(true);
    const modalParam = searchParams.get('modal');
    if (modalParam !== 'addRole') {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('modal', 'addRole');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleOpenFiltersOverlay = useCallback(() => {
    setShowFiltersOverlay(true);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('modal', 'filters');
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const setView = useCallback((newView) => {
    setViewState(newView);
  }, [setViewState]);

  const setCalendarModeWithURL = useCallback((mode) => {
    setCalendarMode(mode);
  }, []);

  const setNightViewWithURL = useCallback((night) => {
    setNightView(night);
  }, []);

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
  const [numDays] = useState(30);
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
      behavior: 'auto'
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


  // Sync scroll headers
  useEffect(() => {
    const headerScroll = headerScrollRef.current;
    const gridScroll = scrollContainerRef.current;
    if (!headerScroll || !gridScroll) return;
    let isSyncing = false;

    const syncFromHeader = () => {
      if (!isSyncing) {
        isSyncing = true;
        if (gridScroll) gridScroll.scrollLeft = headerScroll.scrollLeft;
        requestAnimationFrame(() => { isSyncing = false; });
      }
    };

    const syncFromGrid = () => {
      if (!isSyncing) {
        isSyncing = true;
        if (headerScroll) headerScroll.scrollLeft = gridScroll.scrollLeft;
        requestAnimationFrame(() => { isSyncing = false; });
      }
    };

    // Night Mode Header Visibility Logic
    const handleScroll = () => {
      syncFromGrid();

      if (nightView) {
        const { scrollTop, scrollHeight, clientHeight } = gridScroll;
        const topHeader = document.querySelector('.calendar-top-header-instance');
        const bottomHeader = document.querySelector('.calendar-bottom-header-instance');

        if (topHeader && bottomHeader) {
          // Fade out top header as we scroll down (first 300px)
          const topVisibleOffset = 300;
          const topOpacity = Math.max(0, 1 - (scrollTop / topVisibleOffset));
          topHeader.style.opacity = topOpacity;
          topHeader.style.pointerEvents = topOpacity < 0.1 ? 'none' : 'auto';

          // Fade in bottom header as we scroll to the bottom
          const bottomVisibleThreshold = scrollHeight - clientHeight - 300;
          const bottomOpacity = scrollTop > bottomVisibleThreshold
            ? Math.min(1, (scrollTop - bottomVisibleThreshold) / 300)
            : 0;
          bottomHeader.style.opacity = bottomOpacity;
          bottomHeader.style.pointerEvents = bottomOpacity < 0.1 ? 'none' : 'auto';
        }
      } else {
        // Reset opacities if not in night view
        const topHeader = document.querySelector('.calendar-top-header-instance');
        if (topHeader) {
          topHeader.style.opacity = 1;
          topHeader.style.pointerEvents = 'auto';
        }
      }
    };

    gridScroll.addEventListener('scroll', handleScroll);
    headerScroll.addEventListener('scroll', syncFromHeader);
    return () => {
      gridScroll.removeEventListener('scroll', handleScroll);
      headerScroll.removeEventListener('scroll', syncFromHeader);
    };
  }, [nightView]);

  // Keyboard Shortcuts (Inline Adapter)
  useEffect(() => {
    const handleKeys = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((e.ctrlKey && e.shiftKey && e.key === 'Z') || (e.ctrlKey && e.key === 'y')) { e.preventDefault(); redo(); }
      else if (e.key === 'Delete' && selectedEventId && !showDeleteConfirmation) { e.preventDefault(); useCalendarStore.getState().showDeletemodal(selectedEvent); }
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
      useCalendarStore.getState().showMovemodal(event, useCalendarStore.getState().originalEventPosition, { start, end });
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
      useCalendarStore.getState().showMovemodal(event, {
        start: new Date(event.start),
        end: new Date(event.end)
      }, { start: newStart, end: newEnd });
      useCalendarStore.getState().updateEventLocal(draggedEvent.id, { start: newStart, end: newEnd, isBeingMoved: false });
      useCalendarStore.getState().markEventForSync(draggedEvent.id);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className={cn(
        "flex-1 flex relative min-h-0 mx-4 my-4",
        "gap-6"
      )} style={{ overflow: 'visible' }}>
        {(
          <>
            {!isBelow1200 && (showMiniCalendar || showUpcomingEvents) && (
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
                    toggleSidebar={toggleSidebar}
                    handleCreateEventClick={() => handleCreateEventClick(currentDate)}
                    handleDayClick={handleDayClick}
                    showHeaderDateDropdown={showHeaderDateDropdown}
                    setShowHeaderDateDropdown={setShowHeaderDateDropdown}
                    handleHeaderDateClick={handleHeaderDateClick}
                    dropdownPosition={dropdownPosition}
                    view={view}
                    visibleWeekStart={visibleWeekStart}
                    visibleWeekEnd={visibleWeekEnd}
                    showMiniCalendar={showMiniCalendar}
                    showUpcomingEvents={showUpcomingEvents}
                    isOverlay={false}
                  />
                </div>
              </div>
            )}

            {isBelow1200 && isOverlayExpanded && (showMiniCalendar || showUpcomingEvents) && (
              <>
                <div
                  className="fixed inset-0 bg-black/50 z-[45]"
                  onClick={() => {
                    setIsOverlayExpanded(false);
                    setShowMiniCalendar(false);
                    setShowUpcomingEvents(false);
                  }}
                />
                <div className={cn(
                  "fixed right-0 top-14 bottom-0 w-80 bg-card border-l border-border shadow-2xl z-[50] overflow-y-auto",
                  "transform transition-transform duration-300 ease-in-out",
                  isOverlayExpanded ? "translate-x-0" : "translate-x-full"
                )}>
                  <CalendarSidebar
                    currentDate={currentDate}
                    setCurrentDate={setCurrentDate}
                    handleUpcomingEventClick={handleUpcomingEventClick}
                    events={filteredEvents}
                    isSidebarCollapsed={false}
                    toggleSidebar={toggleSidebar}
                    handleCreateEventClick={() => handleCreateEventClick(currentDate)}
                    handleDayClick={handleDayClick}
                    showHeaderDateDropdown={showHeaderDateDropdown}
                    setShowHeaderDateDropdown={setShowHeaderDateDropdown}
                    handleHeaderDateClick={handleHeaderDateClick}
                    dropdownPosition={dropdownPosition}
                    view={view}
                    visibleWeekStart={visibleWeekStart}
                    visibleWeekEnd={visibleWeekEnd}
                    showMiniCalendar={showMiniCalendar}
                    showUpcomingEvents={showUpcomingEvents}
                    isOverlay={true}
                  />
                </div>
              </>
            )}

            <div className={cn(
              "dashboard-main-content",
              "dashboard-main-content-desktop",
              (isSidebarCollapsed || !(showMiniCalendar || showUpcomingEvents)) && "flex-1"
            )}>
              <div className="dashboard-main-inner flex flex-col h-full">
                <div className="shrink-0 w-full bg-card border-b border-border px-6 py-2" style={{ minHeight: 'var(--boxed-inputfield-height)' }}>
                  <CalendarHeader
                    currentDate={currentDate}
                    view={view}
                    setView={setView}
                    navigateDate={navigateDate}
                    setCurrentDate={setCurrentDate}
                    isSidebarCollapsed={isSidebarCollapsed}
                    toggleSidebar={handleArrowToggle}
                    categories={categories}
                    handleCategoryToggle={handleCategoryToggle}
                    onResetCategories={handleResetCategories}
                    isTopBarMode={true}
                    onShowFiltersOverlay={handleOpenFiltersOverlay}
                    scrollContainerRef={scrollContainerRef}
                    calendarMode={calendarMode}
                    setCalendarMode={setCalendarModeWithURL}
                    isTeamWorkspace={isTeamWorkspace}
                    handleCreateEventClick={() => handleCreateEventClick(currentDate)}
                    showMiniCalendar={showMiniCalendar}
                    setShowMiniCalendar={handleMiniCalendarToggle}
                    showUpcomingEvents={showUpcomingEvents}
                    setShowUpcomingEvents={handleUpcomingEventsToggle}
                    nightView={nightView}
                    setNightView={setNightViewWithURL}
                    isBelow1200={isBelow1200}
                    isOverlayExpanded={isOverlayExpanded}
                    onToggleOverlay={handleToggleOverlay}
                  />
                </div>

                <div className="flex-1 h-full flex flex-col calendar-grid overflow-hidden">
                  <div className={cn(
                    "flex shrink-0 calendar-top-header-instance",
                    nightView && "sticky top-0 z-[30]"
                  )}>
                    <div
                      className={cn(
                        "shrink-0 bg-background/95 backdrop-blur-sm z-10 flex items-center justify-center",
                        calendarMode === 'team' && isTeamWorkspace && "border-r border-b border-border"
                      )}
                      style={{ width: calendarMode === 'team' && isTeamWorkspace ? '14rem' : '4rem', minHeight: '3rem' }}
                    >
                      {calendarMode === 'team' && isTeamWorkspace && (
                        <button
                          className="px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all shadow-sm flex items-center gap-2 shrink-0"
                          style={{ height: 'var(--boxed-inputfield-height)' }}
                          onClick={handleOpenAddRoleModal}
                        >
                          <FiPlus className="w-4 h-4" />
                          {t('dashboardProfile:operations.addWorker', 'Add Worker')}
                        </button>
                      )}
                    </div>
                    <div
                      className="flex-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                      ref={headerScrollRef}
                    >
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
                        isBottom={false}
                        isTeamMode={calendarMode === 'team' && isTeamWorkspace}
                      />
                    </div>
                  </div>

                  <div className={cn(
                    "flex-1 time-slots bg-muted/5 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
                    nightView && "pt-0"
                  )}>
                    <div className="relative min-h-full flex">
                      {calendarMode === 'team' && isTeamWorkspace ? (
                        <ResourceGrid
                          currentDate={currentDate}
                          events={filteredEvents}
                          employees={[]}
                                onEventClick={handleEventClickWithURL}
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
                          openAddRoleModal={openAddRoleModal}
                          onAddRoleModalClose={handleAddRoleModalClose}
                        />
                      ) : (
                        <>
                          <div
                            className="sticky shrink-0 bg-background/95 backdrop-blur-sm z-10"
                            style={{ width: '4rem', height: '1440px', left: 0, top: 0, alignSelf: 'flex-start' }}
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
                                {Array.from({ length: 11 }, (_, i) => (
                                  <div key={`next-${i}`} className="h-[60px] text-[10px] text-right pr-4 relative">
                                    <span className={cn("text-[10px] pb-1", i === 0 ? "text-red-500 font-semibold" : "text-muted-foreground")}>
                                      {i < 10 ? `0${i}:00` : `${i}:00`}
                                    </span>
                                  </div>
                                ))}
                                <div key="next-11" className="h-[60px] text-[10px] text-right pr-4 relative border-b-0">
                                  <span className="text-[10px] pb-1 text-red-500 font-semibold">
                                    11:00
                                  </span>
                                </div>
                                <div key="next-12" className="h-[60px] text-[10px] text-right pr-4 relative border-b-0">
                                  <span className="text-[10px] pb-1 text-red-500 font-semibold">
                                    12:00
                                  </span>
                                </div>
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
                            style={{ scrollSnapType: 'x mandatory', scrollBehavior: 'auto' }}
                            ref={scrollContainerRef}
                            onScroll={(e) => {
                              if (headerScrollRef.current) {
                                headerScrollRef.current.scrollLeft = e.target.scrollLeft;
                              }
                            }}
                          >
                            <div className="relative">
                              <TimeGrid
                                view={view}
                                events={filteredEvents}
                                selectedEventId={selectedEventId}
                                currentDate={currentDate}
                                referenceDate={currentDate}
                                getEventsForCurrentWeek={() => { }}
                                validatedEvents={useCalendarStore.getState().validatedEvents}
                                onEventClick={handleEventClickWithURL}
                                onEventRightClick={(e, event) => useCalendarStore.getState().showContextMenuAt({ x: e.clientX, y: e.clientY }, event)}
                                onEventMove={handleGridEventMove}
                                onEventResize={handleGridEventResize}
                                onCreateEvent={handleGridCreateEvent}
                                scrollContainerRef={scrollContainerRef}
                                numWeeks={numWeeks}
                                numDays={numDays}
                                nightView={nightView}
                              />

                              {nightView && (
                                <div className="calendar-bottom-header-instance sticky bottom-0 left-0 right-0 z-20 flex">
                                  <div className="shrink-0 bg-background/95 backdrop-blur-sm pointer-events-none" style={{ width: '4rem' }} />
                                  <div className="flex-1 bg-background/95 backdrop-blur-sm border-t border-border shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
                                    <TimeHeaders
                                      currentDate={currentDate}
                                      referenceDate={currentDate}
                                      view={view}
                                      handleDayClick={handleDayClick}
                                      numWeeks={numWeeks}
                                      numDays={numDays}
                                      setView={setView}
                                      onEventDropOnDay={handleEventDropOnDay}
                                      nightView={nightView}
                                      isBottom={true}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
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
          onDelete={() => useCalendarStore.getState().showDeletemodal(contextMenu.event)}
          onColorChange={(event, color) => useCalendarStore.getState().updateEventLocal(event.id, { color: color.color, category: color.name })}
          colorOptions={CALENDAR_COLORS}
        />
      )}

      {selectedEvent && (
        <EventPanel
          event={selectedEvent}
          onClose={handlePanelCloseWithURL}
          onSave={handleEventSave}
          onDelete={() => setEventToDelete(selectedEvent)}
          colorOptions={CALENDAR_COLORS}
          accountType={accountType}
          userData={userData}
          workspaceContext={workspaceContext}
        />
      )}

      {showDeleteConfirmation && eventToDelete && (
        <DeleteConfirmationmodal
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
            onClick={handleFiltersOverlayClose}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-300" style={{ height: '75vh' }}>
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-semibold m-0">{t('calendar:categoryFilters')}</h3>
              <button onClick={handleFiltersOverlayClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
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
                  onClick={() => { handleResetCategories(); handleFiltersOverlayClose(); }}
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