import React, { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

// Performance monitoring
import { useRenderPerformance, useInteractionTracking } from './utils/performanceMonitor';

// Components
import CalendarErrorBoundary from './components/CalendarErrorBoundary';
import CalendarHeader from './components/CalendarHeader';
import CalendarSidebar from './components/CalendarSidebar';
import TimeHeaders from './components/TimeHeaders';
import TimeGrid from './components/TimeGrid';
import DeleteConfirmationDialog from './components/DeleteConfirmationDialog';
import EventPanel from './EventPanel/EventPanel';
import DialogBox from '../../../components/Dialog/Dialog';
import LoadingSpinner from '../../../components/LoadingSpinner/LoadingSpinner';
import OptimizedEvent from './components/events/OptimizedEvent';

// Hooks and utilities
import useCalendarStore from './hooks/useCalendarStore';
import { 
  useEventInteractions, 
  useEventDragDrop, 
  useEventCRUD, 
  useKeyboardShortcuts,
  useTimeSlotInteractions 
} from './hooks/useEventHandlers';
import { useCalendarEvents } from './utils/eventDatabase';
import { getUserTypeFromData, getUserIdFromData } from './utils/userHelpers';
import { getScrollableWeekDates } from './utils/dateHelpers';
import { CALENDAR_COLORS } from './utils/constants';

// Context
import { useDashboard } from '../../contexts/DashboardContext';

// Icons
import { FaCheck, FaTimes, FaEdit, FaCopy } from 'react-icons/fa';

// Styles
import './styles/Calendar.css';

const CalendarContainer = ({ userData }) => {
  const { t, i18n } = useTranslation();
  const { lang, uid } = useParams();
  
  // Performance tracking
  useRenderPerformance('CalendarContainer');
  const { trackInteraction } = useInteractionTracking();
  
  // Get workspace context from DashboardContext
  const { selectedWorkspace } = useDashboard();
  
  // Determine account type and user ID from userData
  const accountType = getUserTypeFromData(userData);
  const userId = getUserIdFromData(userData);
  
  // Calendar store state
  const {
    // Core state
    events,
    currentDate,
    view,
    
    // UI state
    isMobileView,
    showMobileCalendar,
    isSidebarCollapsed,
    
    // Event selection
    selectedEvent,
    selectedEventId,
    selectedEventIds,
    
    // Interaction state
    isDragging,
    isDraggingNewEvent,
    newEventStart,
    newEventEnd,
    
    // Modal/dialog state
    showDeleteConfirmation,
    eventToDelete,
    showMoveConfirmation,
    movedEvent,
    showModificationDialog,
    pendingModification,
    
    // Context menu
    showContextMenu,
    contextMenuPosition,
    contextMenuEvent,
    
    // Dropdown state
    showHeaderDateDropdown,
    dropdownPosition,
    
    // Navigation
    weekScrollOffset,
    dayScrollOffset,
    slideDirection,
    
    // Categories
    categories,
    
    // Data state
    pendingChanges,
    isSaving,
    
    // Actions
    setEvents,
    setCurrentDate,
    setView,
    getFilteredEvents,
    setIsMobileView,
    setShowMobileCalendar,
    toggleSidebar,
    addToHistory,
    clearSelectedEvent,
    hideDeleteDialog,
    hideMoveDialog,
    hideContextMenu,
    toggleCategory,
    setWeekScrollOffset,
    setDayScrollOffset,
    setSlideDirection
  } = useCalendarStore();

  // Generate workspace context
  const getWorkspaceContext = useCallback(() => {
    if (!selectedWorkspace) {
      return { 
        type: 'personal',
        role: 'professional'
      };
    }
    
    let role = selectedWorkspace.role;
    if (role === 'admin') {
      role = 'manager';
    }
    
    return {
      type: selectedWorkspace.type,
      role: role
    };
  }, [selectedWorkspace]);
  
  const workspaceContext = getWorkspaceContext();
  
  // Real-time event data
  const { 
    events: calendarEvents, 
    loading: eventsLoading, 
    error: eventsError 
  } = useCalendarEvents(userId, accountType);
  
  // Event handling hooks
  const { handleEventClick, handleEventDoubleClick, handleEventRightClick } = 
    useEventInteractions(userId, accountType);
  const { handleEventMove, handleEventResize } = 
    useEventDragDrop(userId, accountType);
  const { handleEventSave, handleEventDelete } = 
    useEventCRUD(userId, accountType);
  const { handleTimeSlotMouseDown } = 
    useTimeSlotInteractions();
  
  // Keyboard shortcuts
  useKeyboardShortcuts(userId, accountType);
  
  // Get filtered events
  const filteredEvents = getFilteredEvents();
  
  // Mobile view detection
  useEffect(() => {
    const checkMobileView = () => {
      const isMobile = window.innerWidth <= 1110;
      setIsMobileView(isMobile);
      if (isMobile) {
        setShowMobileCalendar(false);
      }
    };
    
    checkMobileView();
    window.addEventListener('resize', checkMobileView);
    
    return () => window.removeEventListener('resize', checkMobileView);
  }, [setIsMobileView, setShowMobileCalendar]);
  
  // Update events from real-time listener
  useEffect(() => {
    if (calendarEvents && calendarEvents.length > 0) {
      console.log('Events updated from real-time listener:', calendarEvents);
      
      const eventsWithDbFlag = calendarEvents.map(event => ({
        ...event,
        fromDatabase: true,
        isValidated: true
      }));
      
      setEvents(eventsWithDbFlag);
      
      if (eventsWithDbFlag.length > 0) {
        addToHistory(eventsWithDbFlag);
      }
    }
  }, [calendarEvents, setEvents, addToHistory]);

  // Auto-scroll to 8 AM on component mount
  useEffect(() => {
    const timeSlots = document.querySelector('.time-slots');
    if (timeSlots) {
      const scrollPosition = 8 * 49;
      timeSlots.scrollTop = scrollPosition;
    }
  }, []);

  // Navigation handlers
  const navigateDate = useCallback((direction) => {
    const newDate = new Date(currentDate);
    if (view === 'week') {
      newDate.setDate(newDate.getDate() + (direction * 7));
      setWeekScrollOffset(0);
    } else if (view === 'day') {
      setSlideDirection(direction > 0 ? 'left' : 'right');
      newDate.setDate(newDate.getDate() + direction);
      setDayScrollOffset(0);
    } else {
      newDate.setMonth(newDate.getMonth() + direction);
    }
    setCurrentDate(newDate);
  }, [currentDate, view, setCurrentDate, setWeekScrollOffset, setDayScrollOffset, setSlideDirection]);

  const handleDayClick = useCallback((date) => {
    const direction = date > currentDate ? 1 : -1;
    setSlideDirection(direction > 0 ? 'left' : 'right');
    setCurrentDate(date);
    
    setWeekScrollOffset(0);
    setDayScrollOffset(0);
    
    if (isMobileView) {
      setView('day');
      setShowMobileCalendar(true);
      return;
    }
    
    const isMobile = window.innerWidth <= 1110;
    if (isMobile) {
      setView('day');
      setTimeout(() => {
        const calendarMain = document.querySelector('.calendar-main');
        if (calendarMain) {
          calendarMain.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      setView('week');
    }
  }, [currentDate, isMobileView, setCurrentDate, setSlideDirection, setWeekScrollOffset, setDayScrollOffset, setView, setShowMobileCalendar]);

  const handleUpcomingEventClick = useCallback((eventDate) => {
    const direction = eventDate > currentDate ? 1 : -1;
    setSlideDirection(direction > 0 ? 'left' : 'right');
    setCurrentDate(new Date(eventDate));
    setWeekScrollOffset(0);
    
    if (isMobileView) {
      setView('day');
      setShowMobileCalendar(true);
      return;
    }
    
    const isMobile = window.innerWidth <= 1110;
    if (!isMobile) {
      setView('week');
    } else {
      setView('day');
      setTimeout(() => {
        const calendarMain = document.querySelector('.calendar-main');
        if (calendarMain) {
          calendarMain.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  }, [currentDate, isMobileView, setCurrentDate, setSlideDirection, setWeekScrollOffset, setView, setShowMobileCalendar]);

  const handleBackToMiniCalendar = useCallback(() => {
    if (isMobileView) {
      setShowMobileCalendar(false);
    }
  }, [isMobileView, setShowMobileCalendar]);

  // Week/day scroll handlers
  const handleWeekScroll = useCallback((direction, isInternalScroll = false) => {
    if (isInternalScroll) {
      setWeekScrollOffset(prevOffset => Math.max(-7, Math.min(7, prevOffset + direction)));
    } else if (direction === -1) {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() - 7);
      setCurrentDate(newDate);
      setWeekScrollOffset(0);
    } else if (direction === 1) {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + 7);
      setCurrentDate(newDate);
      setWeekScrollOffset(0);
    }
  }, [currentDate, setCurrentDate, setWeekScrollOffset]);

  const handleDayScroll = useCallback((direction, isInternalScroll = false) => {
    if (isInternalScroll) {
      setDayScrollOffset(prevOffset => Math.max(-7, Math.min(7, prevOffset + direction)));
    } else if (direction === -1) {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() - 1);
      setCurrentDate(newDate);
      setDayScrollOffset(0);
    } else if (direction === 1) {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + 1);
      setCurrentDate(newDate);
      setDayScrollOffset(0);
    }
  }, [currentDate, setCurrentDate, setDayScrollOffset]);

  // Event drop handler
  const handleEventDropOnDay = useCallback((draggedEvent, targetDate) => {
    if (!draggedEvent || !targetDate) return;
    
    const originalStart = new Date(draggedEvent.start);
    const originalEnd = new Date(draggedEvent.end);
    const duration = originalEnd.getTime() - originalStart.getTime();
    
    const newStart = new Date(targetDate);
    newStart.setHours(originalStart.getHours(), originalStart.getMinutes(), 0, 0);
    const newEnd = new Date(newStart.getTime() + duration);
    
    handleEventMove(draggedEvent.id, newStart, newEnd, false);
  }, [handleEventMove]);

  // Context menu handlers
  const handleContextMenuDelete = useCallback(() => {
    if (contextMenuEvent) {
      useCalendarStore.getState().showDeleteDialog(contextMenuEvent);
      hideContextMenu();
    }
  }, [contextMenuEvent, hideContextMenu]);

  const handleContextMenuEdit = useCallback(() => {
    if (contextMenuEvent) {
      useCalendarStore.getState().setSelectedEvent(contextMenuEvent);
      useCalendarStore.getState().setSelectedEventId(contextMenuEvent.id);
      hideContextMenu();
    }
  }, [contextMenuEvent, hideContextMenu]);

  const handleContextMenuDuplicate = useCallback(() => {
    if (contextMenuEvent) {
      const originalEvent = contextMenuEvent;
      const newStartTime = new Date(originalEvent.start);
      const newEndTime = new Date(originalEvent.end);
      
      newStartTime.setHours(newStartTime.getHours() + 1);
      newEndTime.setHours(newEndTime.getHours() + 1);
      
      const duplicatedEvent = {
        ...originalEvent,
        id: `duplicate-${Date.now()}`,
        start: newStartTime,
        end: newEndTime,
        title: `${originalEvent.title} (Copy)`,
        isValidated: false,
        recurrenceId: undefined,
        isRecurring: false
      };

      const newEvents = [...events, duplicatedEvent];
      setEvents(newEvents);
      addToHistory(newEvents);
      
      useCalendarStore.getState().setSelectedEvent(duplicatedEvent);
      useCalendarStore.getState().setSelectedEventId(duplicatedEvent.id);
      hideContextMenu();
    }
  }, [contextMenuEvent, events, setEvents, addToHistory, hideContextMenu]);

  // Create new event handler
  const handleCreateEventClick = useCallback(() => {
    const startTime = new Date(currentDate);
    startTime.setHours(9, 0, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setHours(10, 0, 0, 0);

    const newEvent = {
      id: `temp-${Date.now()}`,
      title: '',
      start: startTime,
      end: endTime,
      color: CALENDAR_COLORS[0].color,
      color1: CALENDAR_COLORS[0].color1,
      category: CALENDAR_COLORS[0].name,
      notes: '',
      location: '',
      employees: '',
      isRecurring: false,
      position: { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    };

    useCalendarStore.getState().setOriginalEventPosition({
      ...newEvent,
      start: new Date(startTime),
      end: new Date(endTime)
    });

    useCalendarStore.getState().setSelectedEvent(newEvent);
  }, [currentDate]);

  // Modification confirmation handlers
  const handleModificationConfirm = useCallback((modificationType) => {
    // Implementation would go here based on the original Calendar.js logic
    // This is a simplified version
    console.log('Modification confirmed:', modificationType);
    hideMoveDialog();
  }, [hideMoveDialog]);

  // Panel close handler
  const handlePanelClose = useCallback(() => {
    const originalEventPosition = useCalendarStore.getState().originalEventPosition;
    
    if (originalEventPosition && selectedEvent && originalEventPosition.id === selectedEvent.id) {
      const currentEventIndex = events.findIndex(e => e.id === selectedEvent.id);
      
      if (currentEventIndex !== -1) {
        const currentEvent = events[currentEventIndex];
        const isModified = (
          currentEvent.start.getTime() !== originalEventPosition.start.getTime() ||
          currentEvent.end.getTime() !== originalEventPosition.end.getTime() ||
          currentEvent.title !== originalEventPosition.title ||
          currentEvent.notes !== originalEventPosition.notes ||
          currentEvent.location !== originalEventPosition.location ||
          currentEvent.employees !== originalEventPosition.employees ||
          currentEvent.color !== originalEventPosition.color
        );
        
        if (isModified) {
          const restoredEvents = [...events];
          restoredEvents[currentEventIndex] = {
            ...originalEventPosition,
            start: new Date(originalEventPosition.start),
            end: new Date(originalEventPosition.end)
          };
          setEvents(restoredEvents);
        }
      }
    }
    
    clearSelectedEvent();
  }, [selectedEvent, events, setEvents, clearSelectedEvent]);

  return (
    <CalendarErrorBoundary userId={userId}>
      <div className="calendar-page">
        <div className="calendar-container">
          {/* Mobile View */}
          {isMobileView ? (
            <div className={`mobile-calendar-container ${showMobileCalendar ? 'show-calendar' : 'show-mini'}`}>
              {/* Mobile Mini Calendar View */}
              <div className="mobile-mini-view">
                <CalendarSidebar
                  currentDate={currentDate}
                  setCurrentDate={(date) => {
                    setCurrentDate(date);
                    setWeekScrollOffset(0);
                  }}
                  view={view}
                  handleDayClick={handleDayClick}
                  headerDateRef={null}
                  showHeaderDateDropdown={showHeaderDateDropdown}
                  setShowHeaderDateDropdown={useCalendarStore.getState().setShowHeaderDateDropdown}
                  handleHeaderDateClick={null}
                  dropdownPosition={dropdownPosition}
                  handleCreateEventClick={handleCreateEventClick}
                  events={filteredEvents}
                  handleUpcomingEventClick={handleUpcomingEventClick}
                  isSidebarCollapsed={false}
                  toggleSidebar={() => {}}
                  isMobileView={true}
                />
              </div>
              
              {/* Mobile Day Calendar View */}
              <div className="mobile-calendar-view">
                <div className="mobile-calendar-header">
                  <button 
                    className="mobile-back-button"
                    onClick={handleBackToMiniCalendar}
                    aria-label="Back to calendar"
                  >
                    <FaTimes size={20} />
                  </button>
                  <h3 className="mobile-calendar-title">
                    {currentDate.toLocaleDateString(undefined, { 
                      weekday: 'long',
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </h3>
                </div>
                
                <div className="mobile-calendar-grid" data-view="day">
                  <TimeHeaders
                    view="day"
                    currentDate={currentDate}
                    setView={setView}
                    handleDayClick={handleDayClick}
                    slideDirection={slideDirection}
                    setSlideDirection={setSlideDirection}
                    onEventDropOnDay={handleEventDropOnDay}
                    weekScrollOffset={weekScrollOffset}
                    onWeekScroll={handleWeekScroll}
                    dayScrollOffset={dayScrollOffset}
                    onDayScroll={handleDayScroll}
                  />
                  <div className="time-slots">
                    <div className="time-labels">
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i < 10 ? `0${i}:00` : `${i}:00`;
                        return <div key={i} className="time-label">{hour}</div>;
                      })}
                    </div>
                    <TimeGrid 
                      key={`mobile-day-${currentDate.toISOString()}`}
                      view="day"
                      events={filteredEvents}
                      selectedEventId={selectedEventId}
                      handleEventClick={handleEventClick}
                      handleEventDoubleClick={handleEventDoubleClick}
                      handleEventRightClick={handleEventRightClick}
                      handleEventResize={handleEventResize}
                      handleEventMove={handleEventMove}
                      handleEventChangeComplete={() => addToHistory(events)}
                      onMouseDown={handleTimeSlotMouseDown}
                      onMouseMove={() => {}}
                      onMouseUp={() => {}}
                      onMouseLeave={() => {}}
                      setIsDraggingNewEvent={useCalendarStore.getState().setIsDraggingNewEvent}
                      setDragStartPosition={useCalendarStore.getState().setDragStartPosition}
                      newEventStart={newEventStart}
                      newEventEnd={null}
                      isDraggingNewEvent={isDraggingNewEvent}
                      currentDate={currentDate}
                      weekScrollOffset={weekScrollOffset}
                      getEventsForCurrentWeek={(events) => events}
                      getWeekDates={() => getScrollableWeekDates(currentDate, weekScrollOffset)}
                      validatedEvents={new Set()}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Desktop View */
            <div className="calendar-layout">
              {/* Sidebar */}
              <div 
                className={`calendar-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}
                onClick={isSidebarCollapsed ? toggleSidebar : undefined}
                style={{ cursor: isSidebarCollapsed ? 'pointer' : 'default' }}
              >
                <CalendarSidebar
                  currentDate={currentDate}
                  setCurrentDate={(date) => {
                    setCurrentDate(date);
                    setWeekScrollOffset(0);
                  }}
                  view={view}
                  handleDayClick={handleDayClick}
                  headerDateRef={null}
                  showHeaderDateDropdown={showHeaderDateDropdown}
                  setShowHeaderDateDropdown={useCalendarStore.getState().setShowHeaderDateDropdown}
                  handleHeaderDateClick={null}
                  dropdownPosition={dropdownPosition}
                  handleCreateEventClick={handleCreateEventClick}
                  events={filteredEvents}
                  handleUpcomingEventClick={handleUpcomingEventClick}
                  isSidebarCollapsed={isSidebarCollapsed}
                  toggleSidebar={toggleSidebar}
                />
              </div>

              {/* Main Calendar Section */}
              <div className="calendar-main">
                <CalendarHeader
                  currentDate={currentDate}
                  view={view}
                  setView={setView}
                  navigateDate={navigateDate}
                  setCurrentDate={(date) => {
                    setCurrentDate(date);
                    setWeekScrollOffset(0);
                  }}
                  isSidebarCollapsed={isSidebarCollapsed}
                  toggleSidebar={toggleSidebar}
                  categories={categories}
                  handleCategoryToggle={toggleCategory}
                />

                <div className="calendar-grid" data-view={view}>
                  <TimeHeaders
                    view={view}
                    currentDate={currentDate}
                    setView={setView}
                    handleDayClick={handleDayClick}
                    slideDirection={slideDirection}
                    setSlideDirection={setSlideDirection}
                    onEventDropOnDay={handleEventDropOnDay}
                    weekScrollOffset={weekScrollOffset}
                    onWeekScroll={handleWeekScroll}
                    dayScrollOffset={dayScrollOffset}
                    onDayScroll={handleDayScroll}
                  />
                  <div className="time-slots">
                    <div className="time-labels">
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i < 10 ? `0${i}:00` : `${i}:00`;
                        return <div key={i} className="time-label">{hour}</div>;
                      })}
                    </div>
                    <TimeGrid 
                      key={`${view}-${currentDate.toISOString()}`}
                      view={view}
                      events={filteredEvents}
                      selectedEventId={selectedEventId}
                      handleEventClick={handleEventClick}
                      handleEventDoubleClick={handleEventDoubleClick}
                      handleEventRightClick={handleEventRightClick}
                      handleEventResize={handleEventResize}
                      handleEventMove={handleEventMove}
                      handleEventChangeComplete={() => addToHistory(events)}
                      onMouseDown={handleTimeSlotMouseDown}
                      onMouseMove={() => {}}
                      onMouseUp={() => {}}
                      onMouseLeave={() => {}}
                      setIsDraggingNewEvent={useCalendarStore.getState().setIsDraggingNewEvent}
                      setDragStartPosition={useCalendarStore.getState().setDragStartPosition}
                      newEventStart={newEventStart}
                      newEventEnd={null}
                      isDraggingNewEvent={isDraggingNewEvent}
                      currentDate={currentDate}
                      weekScrollOffset={weekScrollOffset}
                      getEventsForCurrentWeek={(events) => events}
                      getWeekDates={() => getScrollableWeekDates(currentDate, weekScrollOffset)}
                      validatedEvents={new Set()}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Event Panel */}
        {selectedEvent && (
          <EventPanel
            event={selectedEvent}
            position={selectedEvent.position}
            onClose={handlePanelClose}
            onSave={handleEventSave}
            onDelete={() => {
              if (selectedEvent && selectedEvent.id) {
                useCalendarStore.getState().showDeleteDialog(selectedEvent);
              }
            }}
            colorOptions={CALENDAR_COLORS}
            accountType={accountType}
            userData={userData}
            workspaceContext={workspaceContext}
          />
        )}

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirmation && eventToDelete && (
          <DeleteConfirmationDialog
            event={eventToDelete}
            currentDate={new Date(eventToDelete.start)}
            onConfirm={(deleteType) => handleEventDelete(eventToDelete.id, deleteType)}
            onCancel={hideDeleteDialog}
            isRecurring={eventToDelete.isRecurring || String(eventToDelete.id).includes('-')}
          />
        )}

        {/* Move Confirmation Dialog */}
        {showMoveConfirmation && movedEvent && (
          <DialogBox
            title={t('dashboard.calendar.moveConfirmation.title')}
            message={
              movedEvent.isRecurring 
                ? t('dashboard.calendar.moveConfirmation.messageRecurring')
                : t('dashboard.calendar.moveConfirmation.message')
            }
            buttons={[
              {
                text: t('dashboard.calendar.moveConfirmation.confirm'),
                onClick: () => handleModificationConfirm('single'),
                className: 'success',
                icon: <FaCheck size={14} />
              },
              {
                text: t('dashboard.calendar.moveConfirmation.cancel'),
                onClick: () => handleModificationConfirm('cancel'),
                className: 'cancel',
                icon: <FaTimes size={14} />
              }
            ]}
            onClose={() => handleModificationConfirm('cancel')}
          />
        )}

        {/* Context Menu */}
        {showContextMenu && contextMenuEvent && (
          <div 
            className="context-menu"
            style={{
              position: 'fixed',
              left: `${contextMenuPosition.x}px`,
              top: `${contextMenuPosition.y}px`,
              zIndex: 10000
            }}
          >
            <div className="context-menu-item danger" onClick={handleContextMenuDelete}>
              <FaTimes size={12} />
              <span>Delete Event</span>
            </div>
            <div className="context-menu-item" onClick={handleContextMenuEdit}>
              <FaEdit size={12} />
              <span>Edit Event</span>
            </div>
            <div className="context-menu-item" onClick={handleContextMenuDuplicate}>
              <FaCopy size={12} />
              <span>Duplicate Event</span>
            </div>
          </div>
        )}

        {/* Loading Spinner Overlay */}
        {isSaving && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20000
          }}>
            <LoadingSpinner size="large" color="primary" />
          </div>
        )}

        {/* Pending Changes Indicator */}
        {pendingChanges.size > 0 && (
          <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            backgroundColor: '#f39c12',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '4px',
            fontSize: '14px',
            zIndex: 10000,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}>
            {pendingChanges.size} unsaved change{pendingChanges.size > 1 ? 's' : ''} • Auto-sync in progress
          </div>
        )}
      </div>
    </CalendarErrorBoundary>
  );
};

export default CalendarContainer; 