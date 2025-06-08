import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import './styles/Calendar.css';
import { runTestDataGeneration } from '../../../utils/runTestDataGeneration';

// Import utility functions and constants
import { CALENDAR_COLORS } from './utils/constants';
import { getWeekDates, getShortDays, getDaysAroundCurrent, getMondayBasedDayIndex, getScrollableWeekDates, getScrollableDayIndex, getScrollableShortDays, isDateInScrollableWeek } from './utils/dateHelpers';
import { getUserTypeFromData, getUserIdFromData } from './utils/userHelpers';
import { getEventsForCurrentWeek, filterEventsByCategories } from './utils/eventUtils';
import notificationStore from '../../../utils/stores/notificationStore';

// Import components
import CalendarHeader from './components/CalendarHeader';
import CalendarSidebar from './components/CalendarSidebar';
import TimeHeaders from './components/TimeHeaders';
import TimeGrid from './components/TimeGrid';
import DeleteConfirmationDialog from './components/DeleteConfirmationDialog';
import EventPanel from './EventPanel/EventPanel';
import DialogBox from '../../../components/Dialog/Dialog';
import LoadingSpinner from '../../../components/LoadingSpinner/LoadingSpinner';
import { FaCheck, FaTimes, FaEdit, FaCopy } from 'react-icons/fa';

// Import firebase related functions
import { 
  fetchUserEvents,
  saveEvent,
  updateEvent,
  deleteEvent,
  generateRecurringEventDates,
  useCalendarEvents,
  saveRecurringEvents
} from './utils/eventDatabase';

// Import DashboardContext
import { useDashboard } from '../../contexts/DashboardContext';

// Define modification types
const MODIFICATION_TYPES = {
  MOVE: 'move',
  RESIZE: 'resize',
  PANEL: 'panel',
  MOVE_SINGLE: 'move_single'
};

const Calendar = ({ userData }) => {
  const { t, i18n } = useTranslation();
  const { lang, uid } = useParams();
  
  // Get workspace context from DashboardContext
  const { selectedWorkspace } = useDashboard();
  
  // State variables
  const [currentDate, setCurrentDate] = useState(new Date(2024, 0, 1)); // Fixed date: January 1, 2024
  const [view, setView] = useState('week'); // 'week' or 'day'
  
  // Mobile view state - true shows mini calendar, false shows day calendar
  const [isMobileView, setIsMobileView] = useState(false);
  const [showMobileCalendar, setShowMobileCalendar] = useState(false);
  
  const [categories, setCategories] = useState(CALENDAR_COLORS.map(color => ({
    name: color.name,
    color: color.color,
    checked: true
  })));
  const [history, setHistory] = useState([[]]); // Initialize with empty array as first history entry
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(0); // Start at index 0
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [selectedEventIds, setSelectedEventIds] = useState([]);
  const [slideDirection, setSlideDirection] = useState(null);
  const [showHeaderDateDropdown, setShowHeaderDateDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState(null); // Keep for header dropdown
  const headerDateRef = useRef(null);
  const [isDraggingNewEvent, setIsDraggingNewEvent] = useState(false);
  const [dragStartPosition, setDragStartPosition] = useState(null);
  const [newEventStart, setNewEventStart] = useState(null);
  const [newEventEnd, setNewEventEnd] = useState(null);
  const [clickTimeout, setClickTimeout] = useState(null);
  const [clickCount, setClickCount] = useState(0);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [showMoveConfirmation, setShowMoveConfirmation] = useState(false);
  const [movedEvent, setMovedEvent] = useState(null);
  const [originalEventDates, setOriginalEventDates] = useState(null);
  const [newEventDates, setNewEventDates] = useState(null);
  const [showModificationDialog, setShowModificationDialog] = useState(false);
  const [pendingModification, setPendingModification] = useState(null);
  
  // Week scroll state for horizontal scrolling
  const [weekScrollOffset, setWeekScrollOffset] = useState(0); // Center position
  
  // Day scroll state for horizontal scrolling in day view
  const [dayScrollOffset, setDayScrollOffset] = useState(0); // Center position
  
  // Sidebar state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Events state
  const [events, setEvents] = useState([]);
  
  // Context menu state for right-click
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [contextMenuEvent, setContextMenuEvent] = useState(null);
  
  // Loading state for save operations
  const [isSaving, setIsSaving] = useState(false);
  
  // Track original event position for cancel operations
  const [originalEventPosition, setOriginalEventPosition] = useState(null);
  
  // Track validated events that should remain blue
  const [validatedEvents, setValidatedEvents] = useState(new Set());
  
  // Track pending changes for database sync
  const [pendingChanges, setPendingChanges] = useState(new Set());
  const [lastSyncTime, setLastSyncTime] = useState(Date.now());
  
  // Track drag state to distinguish between click and drag
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartTime, setDragStartTime] = useState(null);
  
  // Get filtered events
  const filteredEvents = filterEventsByCategories(events, categories, CALENDAR_COLORS);
  
  // Determine account type and user ID from userData
  const accountType = getUserTypeFromData(userData);
  const userId = getUserIdFromData(userData);
  
  // Generate workspace context from selectedWorkspace
  const getWorkspaceContext = () => {
    if (!selectedWorkspace) {
      // Default fallback
      return { 
        type: 'personal',
        role: 'professional'
      };
    }
    
    // Map workspace data to context format
    let role = selectedWorkspace.role;
    
    // Map 'admin' role to 'manager' for event type filtering
    if (role === 'admin') {
      role = 'manager';
    }
    
    return {
      type: selectedWorkspace.type,
      role: role
    };
  };
  
  const workspaceContext = getWorkspaceContext();
  
  // Debug workspace data
  useEffect(() => {
    console.log('Calendar selectedWorkspace from DashboardContext:', selectedWorkspace);
    console.log('Calendar userData:', userData);
    console.log('Extracted userId:', userId);
    console.log('Extracted accountType:', accountType);
    console.log('Generated workspaceContext:', workspaceContext);
  }, [selectedWorkspace, userData, userId, accountType, workspaceContext]);
  
  // Mobile view detection
  useEffect(() => {
    const checkMobileView = () => {
      const isMobile = window.innerWidth <= 1110;
      setIsMobileView(isMobile);
      if (isMobile) {
        setShowMobileCalendar(false); // Start with mini calendar on mobile
      }
    };
    
    checkMobileView();
    window.addEventListener('resize', checkMobileView);
    
    return () => window.removeEventListener('resize', checkMobileView);
  }, []);
  
  // Use the real-time hook only if we have a valid user ID
  const { 
    events: calendarEvents, 
    loading: eventsLoading, 
    error: eventsError 
  } = useCalendarEvents(userId, accountType);
  
  // Update events state when calendarEvents change
  useEffect(() => {
    if (calendarEvents && calendarEvents.length > 0) {
      console.log('Events updated from real-time listener:', calendarEvents);
      
      // Mark all events from database as fromDatabase: true
      const eventsWithDbFlag = calendarEvents.map(event => ({
        ...event,
        fromDatabase: true,
        isValidated: true // Events from database are considered validated
      }));
      
      setEvents(eventsWithDbFlag);
      
      // Add to history if we have events and it's different from current history
      if (eventsWithDbFlag.length > 0 && JSON.stringify(eventsWithDbFlag) !== JSON.stringify(history[currentHistoryIndex])) {
        addToHistory(eventsWithDbFlag);
      }
    }
  }, [calendarEvents]);

  // Debug function for testing - add to window for console access
  useEffect(() => {
    window.calendarDebug = {
      events: events,
      selectedEvent: selectedEvent,
      selectedEventId: selectedEventId,
      openEventPanel: (eventId) => {
        const event = events.find(e => e.id === eventId);
        if (event) {
          setSelectedEventId(eventId);
          setSelectedEvent(event);
          console.log('Debug: Opened event panel for', event);
        } else {
          console.log('Debug: Event not found', eventId);
        }
      },
      closeEventPanel: () => {
        setSelectedEvent(null);
        setSelectedEventId(null);
        console.log('Debug: Closed event panel');
      }
    };
  }, [events, selectedEvent, selectedEventId]);

  // Auto-scroll to 8 AM on component mount
  useEffect(() => {
    const timeSlots = document.querySelector('.time-slots');
    if (timeSlots) {
      // Each hour slot is 60px high (adjust this value if your CSS is different)
      const scrollPosition = 8 * 49; // 8 AM = 8 * height of one hour
      timeSlots.scrollTop = scrollPosition;
    }
  }, []); // Empty dependency array means this runs once on mount


  // Show loading state while events are being fetched
  useEffect(() => {
    if (eventsLoading) {
      console.log('Loading events...');
    }
  }, [eventsLoading]);

  // Show error if events failed to load
  useEffect(() => {
    if (eventsError) {
      console.error('Error loading events:', eventsError);
    }
  }, [eventsError]);

  // Force re-render of events when view changes
  useEffect(() => {
    // Force a re-render of the TimeGrid component when view changes
    // This ensures events are properly positioned for the new view
    const timeGrid = document.querySelector('.time-grid');
    if (timeGrid) {
      // Trigger a style recalculation to ensure proper event positioning
      timeGrid.style.display = 'none';
      void timeGrid.offsetHeight; // Force reflow - void prevents ESLint error
      timeGrid.style.display = '';
    }
  }, [view]);

  // Ensure event panel opens when an event is selected
  useEffect(() => {
    if (selectedEventId && !selectedEvent) {
      console.log('selectedEventId set but no selectedEvent, finding event:', selectedEventId);
      const eventToSelect = events.find(e => e.id === selectedEventId);
      if (eventToSelect) {
        console.log('Found event to select:', eventToSelect);
        setSelectedEvent(eventToSelect);
      }
    }
  }, [selectedEventId, selectedEvent, events]);

  // Add keyboard shortcut handlers
  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardShortcuts);
    return () => document.removeEventListener('keydown', handleKeyboardShortcuts);
  }, [history, currentHistoryIndex, selectedEvent, selectedEventId, showDeleteConfirmation, events]);

  // Add click outside handler
  useEffect(() => {
    let isDragging = false;
    let dragStartTime = null;
    let closeTimeoutId = null;

    const handleMouseDown = (event) => {
      // Mark that a potential drag operation might be starting
      isDragging = false;
      dragStartTime = Date.now();
      
      // Clear any pending close timeout
      if (closeTimeoutId) {
        clearTimeout(closeTimeoutId);
        closeTimeoutId = null;
      }
    };

    const handleMouseMove = (event) => {
      // If mouse has moved significantly and quickly after mousedown, consider it a drag
      if (dragStartTime && (Date.now() - dragStartTime) < 1000) {
        isDragging = true;
      }
    };

    const handleClickOutside = (event) => {
      console.log('Click outside handler triggered');
      console.log('Event target:', event.target);
      console.log('Event target classes:', event.target.className);
      console.log('Selected event exists:', !!selectedEvent);
      console.log('Is dragging:', isDragging);
      console.log('Global calendar dragging:', !!window.calendarEventDragging);
      
      // Don't process click events if we're currently dragging events
      if (window.calendarEventDragging) {
        console.log('Ignoring click - event dragging in progress');
        return;
      }
      
      // Check if click is outside HEADER dropdown
      if (
        headerDateRef.current && 
        !headerDateRef.current.contains(event.target) &&
        !event.target.closest('.date-dropdown')
      ) {
        setShowHeaderDateDropdown(false);
      }

      // Check if click is outside event panel
      const isInsideEventPanel = event.target.closest('[data-event-panel="true"]');
      const isCalendarEvent = event.target.closest('.calendar-event');
      
      // Don't close the panel if:
      // 1. We're currently dragging
      // 2. The click is inside the event panel
      // 3. The click is on a calendar event (which might open its own panel)
      if (selectedEvent && !isInsideEventPanel && !isCalendarEvent) {
        // If we were recently dragging, add a delay before closing
        if (isDragging || (dragStartTime && (Date.now() - dragStartTime) < 500)) {
          console.log('Recent drag detected, delaying panel close');
          // Add a delay to prevent accidental closure after drag operations
          closeTimeoutId = setTimeout(() => {
            console.log('Delayed closing event panel - click detected outside after drag');
            handlePanelClose();
          }, 300);
        } else {
          console.log('Closing event panel - click detected outside');
          handlePanelClose();
        }
      } else if (selectedEvent && isInsideEventPanel) {
        console.log('Click inside event panel - keeping open');
      }
      
      // Check if click is outside context menu
      if (showContextMenu && !event.target.closest('.context-menu')) {
        setShowContextMenu(false);
        setContextMenuEvent(null);
      }

      // Reset drag state after a delay
      setTimeout(() => {
        isDragging = false;
        dragStartTime = null;
      }, 100);
    };

    // Add all event listeners
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleClickOutside);
      
      // Clear any pending timeout
      if (closeTimeoutId) {
        clearTimeout(closeTimeoutId);
      }
    };
  }, [selectedEvent, showContextMenu]);

  // Add right-click handler
  useEffect(() => {
    const handleContextMenu = (event) => {
      // Prevent default context menu on calendar elements
      if (event.target.closest('.calendar-grid') || event.target.closest('.time-grid')) {
        event.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  // Periodic sync to database every 5 minutes
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (pendingChanges.size > 0) {
        console.log('Periodic sync triggered - syncing pending changes');
        syncPendingChanges();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(syncInterval);
  }, [pendingChanges.size]);

  // Sync on page leave
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (pendingChanges.size > 0) {
        console.log('Page unload detected - syncing pending changes');
        // Use sendBeacon for reliable delivery during page unload
        syncPendingChanges();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && pendingChanges.size > 0) {
        console.log('Page hidden - syncing pending changes');
        syncPendingChanges();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pendingChanges.size]);

  // Handle week scroll navigation with center position reset
  const handleWeekScroll = (direction, isInternalScroll = false) => {
    if (isInternalScroll) {
      // Internal scroll within the week - just update the offset
      setWeekScrollOffset(prevOffset => {
        const newOffset = prevOffset + direction;
        // Keep within bounds (-7 to +7)
        return Math.max(-7, Math.min(7, newOffset));
      });
    } else if (direction === -1) {
      // Scroll left - go to previous week and reset to center
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() - 7);
      setCurrentDate(newDate);
      setWeekScrollOffset(0); // Reset to center position
    } else if (direction === 1) {
      // Scroll right - go to next week and reset to center
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + 7);
      setCurrentDate(newDate);
      setWeekScrollOffset(0); // Reset to center position
    }
  };

  // Handle day scroll navigation with center position reset
  const handleDayScroll = (direction, isInternalScroll = false) => {
    if (isInternalScroll) {
      // Internal scroll within the day range - just update the offset
      setDayScrollOffset(prevOffset => {
        const newOffset = prevOffset + direction;
        // Keep within bounds (-7 to +7)
        return Math.max(-7, Math.min(7, newOffset));
      });
    } else if (direction === -1) {
      // Scroll left - go to previous day and reset to center
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() - 1);
      setCurrentDate(newDate);
      setDayScrollOffset(0); // Reset to center position
    } else if (direction === 1) {
      // Scroll right - go to next day and reset to center
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + 1);
      setCurrentDate(newDate);
      setDayScrollOffset(0); // Reset to center position
    }
  };

  // Modified navigation function to reset scroll offset when navigating weeks
  const navigateDate = (direction) => {
    const newDate = new Date(currentDate);
    if (view === 'week') {
      newDate.setDate(newDate.getDate() + (direction * 7));
      // Reset scroll to Monday-Sunday when using navigation buttons
      setWeekScrollOffset(0);
    } else if (view === 'day') {
      setSlideDirection(direction > 0 ? 'left' : 'right');
      newDate.setDate(newDate.getDate() + direction);
      // Reset day scroll to center when using navigation buttons
      setDayScrollOffset(0);
    } else {
      newDate.setMonth(newDate.getMonth() + direction);
    }
    setCurrentDate(newDate);
  };

  // Handle day click for navigation
  const handleDayClick = (date) => {
    const direction = date > currentDate ? 1 : -1;
    setSlideDirection(direction > 0 ? 'left' : 'right');
    setCurrentDate(date);
    
    // Reset scroll to center when selecting a specific date
    setWeekScrollOffset(0);
    setDayScrollOffset(0);
    
    // Handle mobile view navigation
    if (isMobileView) {
      // On mobile, show the day calendar with slide animation
      setView('day');
      setShowMobileCalendar(true);
      return;
    }
    
    // Set the view based on device size - week for desktop, day for mobile
    const isMobile = window.innerWidth <= 1110;
    if (isMobile) {
      setView('day');
      
      // For mobile, scroll to calendar section
      setTimeout(() => {
        const calendarMain = document.querySelector('.calendar-main');
        if (calendarMain) {
          calendarMain.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      // On desktop, show week view when clicking on mini-calendar
      setView('week');
    }
  };

  // Handle upcoming event click
  const handleUpcomingEventClick = (eventDate) => {
    const direction = eventDate > currentDate ? 1 : -1;
    setSlideDirection(direction > 0 ? 'left' : 'right');
    setCurrentDate(new Date(eventDate));
    
    // Reset scroll to Monday-Sunday when clicking on upcoming events
    setWeekScrollOffset(0);
    
    // Handle mobile view navigation
    if (isMobileView) {
      // On mobile, show the day calendar with slide animation
      setView('day');
      setShowMobileCalendar(true);
      return;
    }
    
    // Set the view based on device size
    const isMobile = window.innerWidth <= 1110;
    
    // For desktop, show the week view
    if (!isMobile) {
      setView('week');
    } else {
      // For mobile, show day view and scroll to calendar
      setView('day');
      setTimeout(() => {
        const calendarMain = document.querySelector('.calendar-main');
        if (calendarMain) {
          calendarMain.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  };

  // Handle back to mini calendar on mobile
  const handleBackToMiniCalendar = () => {
    if (isMobileView) {
      setShowMobileCalendar(false);
    }
  };

  // Handle time slot mouse down
  const handleTimeSlotMouseDown = (e) => {
    if (selectedEvent) return;

    const timeGrid = e.currentTarget;
    const rect = timeGrid.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const x = e.clientX - rect.left;
    
    const hour = Math.floor(y / 50);
    
    let startDate;
    if (view === 'day') {
      startDate = new Date(currentDate);
    } else {
      const day = Math.floor((x / rect.width) * 7);
      const scrollableWeekDates = getScrollableWeekDates(currentDate, weekScrollOffset);
      startDate = new Date(scrollableWeekDates[day]);
    }
    
    startDate.setHours(hour);
    startDate.setMinutes(0);
    
    // Set end time to exactly one hour after start time
    const endDate = new Date(startDate);
    endDate.setHours(hour + 1);
    endDate.setMinutes(0);

    // Handle double click
    if (clickTimeout) {
      clearTimeout(clickTimeout);
      setClickTimeout(null);
      setClickCount(0);

      // Create event immediately on double click
      const defaultColor = CALENDAR_COLORS.find(c => c.id === 'grey');
      const newEvent = {
        id: String(Date.now()),
        start: startDate,
        end: endDate,
        title: '',
        color: defaultColor.color,
        color1: defaultColor.color1,
        color2: defaultColor.color2,
        isValidated: false
      };

      const newEvents = [...events, newEvent];
      setEvents(newEvents);
      addToHistory(newEvents);
      
      // Store original position for double-click created events
      setOriginalEventPosition({
        ...newEvent,
        start: new Date(startDate),
        end: new Date(endDate)
      });
      
      // Auto-select the newly created event
      setSelectedEvent(newEvent);
      setSelectedEventId(newEvent.id);
      return;
    }

    // Set timeout for single click
    setClickTimeout(setTimeout(() => {
      setClickTimeout(null);
      setClickCount(0);
    }, 300));

    setClickCount(prev => prev + 1);
    
    // Only set drag start position on mouse down
    setDragStartPosition(startDate);
    setNewEventStart(startDate);
    setNewEventEnd(endDate);
  };

  // Handle time slot mouse move
  const handleTimeSlotMouseMove = (e) => {
    // Only start dragging if mouse has moved while clicking
    if (!dragStartPosition || !e.buttons) return;
    
    setIsDraggingNewEvent(true);

    const timeGrid = e.currentTarget;
    const rect = timeGrid.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const x = e.clientX - rect.left;
    const hour = Math.floor(y / 50);
    
    let currentDragDate;
    if (view === 'day') {
      // Day view: support cross-day dragging by calculating day offset
      const dayWidth = rect.width; // Full width for day view
      const dayOffset = Math.floor(x / dayWidth); // This will be 0 for normal day view
      
      // For day view, we can still support horizontal dragging to adjacent days
      currentDragDate = new Date(currentDate);
      currentDragDate.setDate(currentDate.getDate() + dayOffset);
      currentDragDate.setHours(hour);
      currentDragDate.setMinutes(0);
    } else {
      // Week view: support cross-day dragging
      const day = Math.floor((x / rect.width) * 7);
      const scrollableWeekDates = getScrollableWeekDates(currentDate, weekScrollOffset);
      
      // Ensure day index is within bounds
      const boundedDay = Math.max(0, Math.min(6, day));
      currentDragDate = new Date(scrollableWeekDates[boundedDay]);
      currentDragDate.setHours(hour);
      currentDragDate.setMinutes(0);
    }
    
    // Support bidirectional dragging with proper time calculation
    let startTime, endTime;
    
    // Compare the full date-time, not just the date
    const dragStartTime = dragStartPosition.getTime();
    const currentTime = currentDragDate.getTime();
    
    if (currentTime >= dragStartTime) {
      // Dragging forward (down/right in time)
      startTime = new Date(dragStartPosition);
      endTime = new Date(currentDragDate);
      
      // If dragging to the same hour, make it at least 1 hour duration
      if (endTime.getTime() === startTime.getTime()) {
        endTime.setHours(endTime.getHours() + 1);
      }
    } else {
      // Dragging backward (up/left in time)
      startTime = new Date(currentDragDate);
      endTime = new Date(dragStartPosition);
      
      // If dragging to the same hour, make it at least 1 hour duration
      if (endTime.getTime() === startTime.getTime()) {
        endTime.setHours(endTime.getHours() + 1);
      }
    }
    
    setNewEventStart(startTime);
    setNewEventEnd(endTime);
  };

  // Handle time slot mouse up
  const handleTimeSlotMouseUp = (e) => {
    if (!dragStartPosition) return;

    // Only create event if we were dragging
    if (isDraggingNewEvent) {
      // Use grey color for unvalidated new events
      const defaultColor = CALENDAR_COLORS.find(c => c.id === 'grey');
      const newEvent = {
        id: String(Date.now()),
        start: newEventStart,
        end: newEventEnd,
        title: '',
        color: defaultColor.color,
        color1: defaultColor.color1,
        color2: defaultColor.color2,
        isValidated: false
      };

      const newEvents = [...events, newEvent];
      setEvents(newEvents);
      addToHistory(newEvents);
      
      // Store original position for newly created events
      setOriginalEventPosition({
        ...newEvent,
        start: new Date(newEventStart),
        end: new Date(newEventEnd)
      });
      
      // Auto-select the newly created event
      setSelectedEvent(newEvent);
      setSelectedEventId(newEvent.id);
    }
    
    // Reset states
    setIsDraggingNewEvent(false);
    setDragStartPosition(null);
    setNewEventStart(null);
    setNewEventEnd(null);
  };

  // Event click handler
  const handleEventClick = (event, e) => {
    console.log('Calendar handleEventClick called with event:', event);
    e.stopPropagation();
    
    // Handle multi-selection with Ctrl/Cmd key
    if (e.ctrlKey || e.metaKey) {
      // Toggle event selection in multi-select mode
      setSelectedEventIds(prevSelectedIds => {
        const isSelected = prevSelectedIds.includes(event.id);
        
        // If already selected, remove it from the array
        if (isSelected) {
          return prevSelectedIds.filter(id => id !== event.id);
        } 
        // If not selected, add it to the array
        else {
          return [...prevSelectedIds, event.id];
        }
      });
      
      // For multi-select, don't set the single selectedEventId
      return;
    }
    
    // Clear multi-selection when clicking without modifier keys
    if (selectedEventIds.length > 0) {
      setSelectedEventIds([]);
    }
    
    // Check if this was a click after a drag (within 200ms of drag ending)
    const timeSinceDragStart = dragStartTime ? Date.now() - dragStartTime : 0;
    const wasRecentDrag = isDragging || timeSinceDragStart < 200;
    
    if (wasRecentDrag) {
      console.log('Event clicked after drag - not opening panel');
      return;
    }
    
    // This is a clean click - open the event panel
    console.log('Clean event click detected - opening event panel');
    
    // Find the full event data
    const clickedEvent = events.find(ev => ev.id === event.id) || event;
    
    // Store original event position for potential restoration
    setOriginalEventPosition({
      id: clickedEvent.id,
      start: new Date(clickedEvent.start),
      end: new Date(clickedEvent.end),
      title: clickedEvent.title,
      color: clickedEvent.color,
      color1: clickedEvent.color1,
      color2: clickedEvent.color2,
      notes: clickedEvent.notes,
      location: clickedEvent.location,
      employees: clickedEvent.employees,
      // Store all other properties that might have been modified
      ...clickedEvent
    });
    
    // Open event panel
    setSelectedEventId(event.id);
    setSelectedEvent(clickedEvent);
  };

  // Event double-click handler - opens event panel for detailed editing
  const handleEventDoubleClick = (event, e) => {
    console.log('Event double-clicked:', event.id, '- opening event panel');
    e.stopPropagation();
    
    // Find the full event data
    const clickedEvent = events.find(ev => ev.id === event.id) || event;
    
    // Store original event position for potential restoration
    setOriginalEventPosition({
      id: clickedEvent.id,
      start: new Date(clickedEvent.start),
      end: new Date(clickedEvent.end),
      title: clickedEvent.title,
      color: clickedEvent.color,
      color1: clickedEvent.color1,
      color2: clickedEvent.color2,
      notes: clickedEvent.notes,
      location: clickedEvent.location,
      employees: clickedEvent.employees,
      // Store all other properties that might have been modified
      ...clickedEvent
    });
    
    // Open event panel for detailed editing
    setSelectedEventId(event.id);
    setSelectedEvent(clickedEvent);
  };

  // Event right-click handler
  const handleEventRightClick = (event, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Close any existing context menu
    setShowContextMenu(false);
    
    // Set the context menu event and position
    setContextMenuEvent(event);
    setContextMenuPosition({
      x: e.clientX,
      y: e.clientY
    });
    
    // Show the context menu
    setShowContextMenu(true);
  };

  // Handle context menu delete
  const handleContextMenuDelete = () => {
    if (contextMenuEvent) {
      setEventToDelete(contextMenuEvent);
      setShowDeleteConfirmation(true);
      setShowContextMenu(false);
      setContextMenuEvent(null);
    }
  };

  // Handle context menu edit
  const handleContextMenuEdit = () => {
    if (contextMenuEvent) {
      setSelectedEvent(contextMenuEvent);
      setSelectedEventId(contextMenuEvent.id);
      setShowContextMenu(false);
      setContextMenuEvent(null);
    }
  };

  // Handle context menu duplicate
  const handleContextMenuDuplicate = () => {
    if (contextMenuEvent) {
      // Create a duplicate event with a new ID and slightly offset time
      const originalEvent = contextMenuEvent;
      const newStartTime = new Date(originalEvent.start);
      const newEndTime = new Date(originalEvent.end);
      
      // Offset by 1 hour
      newStartTime.setHours(newStartTime.getHours() + 1);
      newEndTime.setHours(newEndTime.getHours() + 1);
      
      const duplicatedEvent = {
        ...originalEvent,
        id: `duplicate-${Date.now()}`,
        start: newStartTime,
        end: newEndTime,
        title: `${originalEvent.title} (Copy)`,
        isValidated: false, // Mark as unvalidated so user can edit
        recurrenceId: undefined, // Remove recurrence to make it a standalone event
        isRecurring: false
      };

      const newEvents = [...events, duplicatedEvent];
      setEvents(newEvents);
      addToHistory(newEvents);
      
      // Select the duplicated event for editing
      setSelectedEvent(duplicatedEvent);
      setSelectedEventId(duplicatedEvent.id);
      
      setShowContextMenu(false);
      setContextMenuEvent(null);
    }
  };

  // Add to history
  const addToHistory = (events) => {
    const newHistory = history.slice(0, currentHistoryIndex + 1);
    newHistory.push([...events]);
    setHistory(newHistory);
    setCurrentHistoryIndex(newHistory.length - 1);
  };

  // Undo/Redo functions
  const undo = () => {
    if (currentHistoryIndex > 0) {
      const newIndex = currentHistoryIndex - 1;
      setCurrentHistoryIndex(newIndex);
      setEvents([...history[newIndex]]);
      
      // Clear selected event if it no longer exists in the previous state
      const previousEvents = history[newIndex];
      if (selectedEvent && !previousEvents.find(e => e.id === selectedEvent.id)) {
        setSelectedEvent(null);
        setSelectedEventId(null);
      }
    }
  };

  const redo = () => {
    if (currentHistoryIndex < history.length - 1) {
      const newIndex = currentHistoryIndex + 1;
      setCurrentHistoryIndex(newIndex);
      setEvents([...history[newIndex]]);
      
      // Clear selected event if it no longer exists in the next state
      const nextEvents = history[newIndex];
      if (selectedEvent && !nextEvents.find(e => e.id === selectedEvent.id)) {
        setSelectedEvent(null);
        setSelectedEventId(null);
      }
    }
  };

  // Keyboard shortcut handler
  const handleKeyboardShortcuts = (e) => {
    // Only handle shortcuts if no input is focused
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    // Ctrl+Z for undo
    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    }
    // Ctrl+Shift+Z or Ctrl+Y for redo
    else if ((e.ctrlKey && e.shiftKey && e.key === 'Z') || (e.ctrlKey && e.key === 'y')) {
      e.preventDefault();
      redo();
    }
    // Delete key for deleting selected event
    else if (e.key === 'Delete' && selectedEvent && !showDeleteConfirmation) {
      e.preventDefault();
      setEventToDelete(selectedEvent);
      setShowDeleteConfirmation(true);
    }
    // Escape key for closing panels/dialogs
    else if (e.key === 'Escape') {
      e.preventDefault();
      if (selectedEvent) {
        handlePanelClose();
      }
    }
  };

  // Handle panel close
  const handlePanelClose = () => {
    console.log('Panel closing, checking if event needs to be restored');
    
    // If we have an original event position and a currently selected event, restore it
    if (originalEventPosition && selectedEvent && originalEventPosition.id === selectedEvent.id) {
      console.log('Restoring event to original position:', originalEventPosition);
      
      // Find the current event in the events array
      const currentEventIndex = events.findIndex(e => e.id === selectedEvent.id);
      
      if (currentEventIndex !== -1) {
        // Check if the event has been modified by comparing key properties
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
          console.log('Event was modified, restoring to original state');
          // Restore the event to its original state
          const restoredEvents = [...events];
          restoredEvents[currentEventIndex] = {
            ...originalEventPosition,
            // Ensure dates are Date objects
            start: new Date(originalEventPosition.start),
            end: new Date(originalEventPosition.end)
          };
          
          setEvents(restoredEvents);
          // Don't add to history for restoration
        } else {
          console.log('Event was not modified, no restoration needed');
        }
      }
    }
    
    // Clear all panel-related state
    setSelectedEvent(null);
    setSelectedEventId(null);
    setOriginalEventPosition(null);
  };

  // Event save handler
  const handleEventSave = (updatedEvent, shouldClose) => {
    console.log("Saving event:", updatedEvent);
    
    // If shouldClose is true, immediately close the panel and show loading
    if (shouldClose) {
      console.log('Immediate panel close and showing loading spinner');
      setSelectedEvent(null);
      setSelectedEventId(null);
      setOriginalEventPosition(null);
      setIsSaving(true);
    }
    
    // Find the original event if it exists
    const originalEvent = events.find(e => e.id === updatedEvent.id);
    
    // Check if this is a recurring event
    const hasRecurrenceRule = updatedEvent.rrule || (originalEvent && originalEvent.rrule);
    
    // Check if editing an existing recurring event (not creating a new one)
    const isEditingExistingRecurring = originalEvent && hasRecurrenceRule;
    
    // Check if modifying a recurring event
    const isModifyingRecurring = isEditingExistingRecurring && (
      (originalEvent.recurrenceId) || 
      (typeof updatedEvent.id === 'string' && updatedEvent.id.includes('_')) ||
      (typeof originalEvent.id === 'string' && originalEvent.id.includes('_'))
    );
    
    // Check if this event was already processed by the Event_Panel
    const isAlreadyProcessedByPanel = updatedEvent._processedByPanel === true;
    
    console.log("Is editing existing recurring event:", isEditingExistingRecurring);
    console.log("Is modifying recurring:", isModifyingRecurring);
    console.log("Original event:", originalEvent);
    console.log("Updated event:", updatedEvent);
    
    // Check if we need to prompt for modification type (only for existing recurring events)
    if (isModifyingRecurring && shouldClose) {
      // Store the updated event temporarily
      // Set states to prepare for confirmation dialog
      const originalDate = new Date(originalEvent.start);
      const newDate = new Date(updatedEvent.start);
      
      // Only set pendingModification if we're confirming
      setPendingModification({
        event: updatedEvent,
        originalEvent: originalEvent,
        baseId: String(updatedEvent.id).split(/[-_]/)[0],
        recurrenceId: updatedEvent.recurrenceId || originalEvent.recurrenceId,
        newStart: newDate,
        newEnd: new Date(updatedEvent.end),
        shouldClose: shouldClose,
        editType: 'PANEL' // Panel edit type
      });
      
      // Show the confirmation dialog
      console.log("Showing modification confirmation for panel edit");
      setShowModificationDialog(true);
      return;
    }
    
    // Continue with the normal save if not a recurring event or creating a new recurring event
    continueEventSave(updatedEvent, shouldClose, isAlreadyProcessedByPanel);
  };

  // Modify continueEventSave to accept the isAlreadyProcessedByPanel parameter
  const continueEventSave = (eventWithDates, shouldClose, isAlreadyProcessedByPanel = false) => {
    // Extract baseId from event ID if it's a recurring event instance
    const baseId = String(eventWithDates.id).includes('_') 
      ? String(eventWithDates.id).split('_')[0]
      : eventWithDates.id;
    
    // Don't store temporary events in the events array
    const isTemporary = false;
    
    // Create a new copy of events for state update
    let newEvents = [...events];
    
    // If we're editing an existing event, replace it
    const existingEventIndex = newEvents.findIndex(e => e.id === eventWithDates.id);
    
    if (existingEventIndex !== -1) {
      // Update single existing event
      newEvents[existingEventIndex] = {
        ...newEvents[existingEventIndex],
        ...eventWithDates
      };
    } else {
      // This is a new event, add it to events array
      newEvents.push(eventWithDates);
    }
    
    // Handle recurring events
    if (eventWithDates.isRecurring && shouldClose) {
      console.log('Event save details:', {
        id: eventWithDates.id,
        baseId: baseId,
        isNowRecurring: eventWithDates.isRecurring,
        repeatValue: eventWithDates.repeatValue,
        isAvailability: eventWithDates.isAvailability,
        shouldClose: shouldClose,
        alreadyProcessed: isAlreadyProcessedByPanel
      });
      
      // Filter out any existing recurring events with the same base ID
      const existingRecurring = newEvents.filter(e => 
        e.id !== eventWithDates.id && // Don't filter out the event we're editing
        (e.recurrenceId === eventWithDates.recurrenceId || // Same recurrence ID
        (String(e.id).includes('_') && String(e.id).split('_')[0] === String(baseId))) // Derived from same base ID
      );
      
      console.log(`Filtered out ${existingRecurring.length} existing recurring events`);
      
      // Remove existing recurring events from the events array before adding new ones
      newEvents = newEvents.filter(e => !existingRecurring.includes(e));
      
      // If this is a recurring event being saved to database (shouldClose is true)
      if (shouldClose && userId && !isAlreadyProcessedByPanel) {
        console.log('Final save: should save recurring events to database');
        
        // Check if event has a baseId that's different from its id
        // (meaning it's an instance of a recurring event)
        if (baseId !== eventWithDates.id) {
          console.log('Updating instance of recurring event with baseId:', baseId);
        }
        
        console.log('Calling saveRecurringEvents with:', eventWithDates);
        console.log('userId value:', userId);
        
        const accountTypeForSave = accountType === 'worker' ? 'worker' : 'employee';
        
        // Direct call to saveRecurringEvents for worker account recurring events
        if (accountType === 'worker' && !isAlreadyProcessedByPanel) {
          console.log('Making direct call to saveRecurringEvents');
          const eventWithUserData = {
            ...eventWithDates,
            userId: userId // Explicitly add userId to the event data
          };
          
          // Save recurring events
          saveRecurringEvents(eventWithUserData, userId)
            .then(result => {
              console.log('saveRecurringEvents result:', result);
              setIsSaving(false); // Hide loading spinner
              
              if (result.success) {
                console.log('Recurring events saved successfully', result);
                notificationStore.showNotification('Recurring events saved successfully', 'success');
                
                // Mark event as validated
                setValidatedEvents(prev => new Set([...prev, result.recurrenceId]));
                
                // Update the UI with recurrence ID
                const updatedEvents = events.map(event => {
                  if (String(event.id) === String(baseId)) {
                    return {
                      ...event,
                      fromDatabase: true,
                      recurrenceId: result.recurrenceId,
                      isValidated: true
                    };
                  }
                  return event;
                });
                setEvents(updatedEvents);
              } else {
                console.error('Failed to save recurring events', result.error);
                notificationStore.showNotification('Failed to save recurring events: ' + (result.error || 'Unknown error'), 'error');
                
                // Fall back to saveEvent as a backup
                console.log('Falling back to saveEvent for recurring event');
                saveRecurringEventFallback(eventWithDates, baseId);
              }
            })
            .catch(error => {
              console.error('Error in saveRecurringEvents:', error);
              setIsSaving(false); // Hide loading spinner
              notificationStore.showNotification('Error saving recurring events', 'error');
              
              // Fall back to saveEvent on error
              saveRecurringEventFallback(eventWithDates, baseId);
            });
        }
      }
    } 
    // If this is not a recurring event and we're saving to the database
    else if (shouldClose && userId && !isAlreadyProcessedByPanel) {
      console.log('Saving regular (non-recurring) event to database');
      
      const eventToSave = {
        ...eventWithDates,
        userId: userId,
        isAvailability: accountType === 'worker' ? true : eventWithDates.isAvailability
      };
      
      // Direct call to saveEvent for non-recurring events
      saveEvent(eventToSave, userId)
        .then(result => {
          console.log('Regular saveEvent result:', result);
          setIsSaving(false); // Hide loading spinner
          
          if (result.success) {
            console.log('Event saved successfully with ID:', result.id);
            
            // Mark event as validated
            setValidatedEvents(prev => new Set([...prev, result.id]));
            
            // Find the saved event in our state and mark it as fromDatabase
            const updatedEvents = events.map(event => {
              if (String(event.id) === String(eventWithDates.id)) {
                return {
                  ...event,
                  id: result.id, // Use the ID returned from the server
                  fromDatabase: true,
                  isValidated: true
                };
              }
              return event;
            });
            
            setEvents(updatedEvents);
            notificationStore.showNotification('Event saved successfully', 'success');
          } else {
            console.error('Failed to save event:', result.error);
            notificationStore.showNotification('Failed to save event: ' + (result.error || 'Unknown error'), 'error');
          }
        })
        .catch(error => {
          console.error('Error saving event:', error);
          setIsSaving(false); // Hide loading spinner
          notificationStore.showNotification('Error saving event', 'error');
        });
    } else {
      // For non-database saves, just hide the loading spinner
      if (shouldClose) {
        setIsSaving(false);
      }
    }
    
    // Update UI state regardless of database operations
    setEvents(newEvents);
    
    if (shouldClose) {
      addToHistory(newEvents);
      // Panel is already closed at the beginning of handleEventSave
    } else {
      // If not closing, update the selected event state to reflect the changes made
      // Find the specific instance (could be base or occurrence) that matches the ID we were editing
       const currentlySelectedInstance = newEvents.find(e => String(e.id) === String(eventWithDates.id)) || 
                                        newEvents.find(e => String(e.id).startsWith(baseId)); // Fallback to base if exact ID missing
      setSelectedEvent(currentlySelectedInstance || null); // Update panel with potentially new data/ID
      setSelectedEventId(currentlySelectedInstance ? String(currentlySelectedInstance.id) : null);
    }
  };
  
  // New helper function to fall back to normal saveEvent for recurring events
  const saveRecurringEventFallback = (eventWithDates, baseId) => {
    console.log('Using saveRecurringEventFallback with direct saveEvent call');
    
    const eventToSave = {
      ...eventWithDates,
      id: baseId,
      fromDatabase: true,
      isAvailability: accountType === 'worker' ? true : eventWithDates.isAvailability
    };
    
    // Direct call to saveEvent
    saveEvent(eventToSave, userId)
      .then(result => {
        console.log('Fallback saveEvent result:', result);
        setIsSaving(false); // Hide loading spinner
        
        if (result.success) {
          console.log('Fallback save successful');
          notificationStore.showNotification('Event saved successfully', 'success');
          
          // Mark event as validated
          setValidatedEvents(prev => new Set([...prev, baseId]));
        } else {
          console.error('Fallback save failed:', result.error);
          notificationStore.showNotification('Failed to save event: ' + (result.error || 'Unknown error'), 'error');
        }
      })
      .catch(error => {
        console.error('Error in fallback save:', error);
        setIsSaving(false); // Hide loading spinner
        notificationStore.showNotification('Error saving event', 'error');
      });
  };

  // Event delete handler
  const handleEventDelete = useCallback((eventId, deleteType = 'single') => {
    console.log('handleEventDelete called with:', { eventId, deleteType });
    const event = events.find(e => String(e.id) === String(eventId));
    if (!event) {
      console.warn('Event not found for deletion:', eventId);
      return;
    }

    let newEvents;
    // Extract the base ID or use the full ID if it doesn't contain a separator
    const baseId = String(event.id).split('-')[0];
    const currentEventDate = new Date(event.start);

    // First update the local events state
    if (deleteType === 'future' && (event.isRecurring || event.recurrenceId || String(event.id).includes('-'))) {
      console.log('Deleting this and all future occurrences from series');
      // Delete this and all future occurrences
      newEvents = events.filter(e => {
        if (!String(e.id).startsWith(baseId) && 
            !(e.recurrenceId && e.recurrenceId === event.recurrenceId)) {
          return true; // Keep events from other series
        }
        const eventDate = new Date(e.start);
        return eventDate < currentEventDate; // Keep only past events from this series
      });
    } else if (deleteType === 'all' && (event.isRecurring || event.recurrenceId)) {
      console.log('Deleting all occurrences of the series');
      // Delete all occurrences of this series
      newEvents = events.filter(e => 
        !(String(e.id).startsWith(baseId) || 
          (e.recurrenceId && e.recurrenceId === event.recurrenceId))
      );
    } else {
      // Delete only this occurrence
      console.log('Deleting only this occurrence');
      newEvents = events.filter(e => String(e.id) !== String(eventId));
    }

    console.log('Event Delete - Updated events array:', newEvents);
    setEvents(newEvents);
    addToHistory(newEvents);
    
    // Delete from database
    if (userId) {
      // Pass the recurrenceId to help database identify recurring events series
      deleteEvent(eventId, userId, accountType, deleteType, event.recurrenceId)
        .then(result => {
          if (result.success) {
            console.log('Event deleted from database successfully');
          } else {
            console.error('Failed to delete event from database:', result.error);
          }
        })
        .catch(error => {
          console.error('Error deleting event from database:', error);
        });
    } else {
      console.warn('Auth not ready or user not logged in, event not deleted from database');
    }
    
    setSelectedEvent(null);
    setSelectedEventId(null);
    setShowDeleteConfirmation(false);
    setEventToDelete(null);
  }, [events, userId, accountType]);

  // Event resize handler
  const handleEventResize = (eventId, newStart, newEnd, isTemporary = false) => {
    const event = events.find(e => e.id === eventId);
    
    if (!event) {
      console.error('Event not found:', eventId);
      return;
    }
    
    // Track drag state for resize
    if (isTemporary) {
      setIsDragging(true);
      setDragStartTime(Date.now());
    } else {
      // End of resize - reset after a delay
      setTimeout(() => {
        setIsDragging(false);
      }, 250);
    }
    
    const updatedEvents = [...events];
    const eventIndex = updatedEvents.findIndex(e => e.id === eventId);
    
    if (eventIndex === -1) {
      console.error('Event index not found:', eventId);
      return;
    }
    
    if (isTemporary) {
      // Update visual position during resize
      updatedEvents[eventIndex] = {
        ...updatedEvents[eventIndex],
        start: newStart,
        end: newEnd,
        isBeingResized: true
      };
      
      setEvents(updatedEvents);
      return;
    }
    
    // Check if this is a recurring event
    const isRecurringInstance = event.isRecurringInstance;
    const originalEvent = isRecurringInstance ? 
      events.find(e => e.id === event.recurringParentId) : 
      event;
    
    const isRecurringEvent = event.isRecurring || originalEvent.recurrence || 
      isRecurringInstance || String(eventId).includes('-') || String(eventId).includes('_');
    
    // If this is a recurring event, show confirmation dialog
    if (isRecurringEvent) {
      // Store the pending modification for the dialog
      setPendingModification({
        type: MODIFICATION_TYPES.RESIZE,
        eventId: eventId,
        event: event,
        originalEvent: originalEvent,
        newStart: newStart,
        newEnd: newEnd
      });
      
      // Store original and new dates for the dialog
      setOriginalEventDates({
        start: event.start instanceof Date ? event.start : new Date(event.start),
        end: event.end instanceof Date ? event.end : new Date(event.end)
      });
      setNewEventDates({
        start: newStart,
        end: newEnd
      });
      setMovedEvent(event);
      
      // Ensure the dialog shows up even with quick mouse movements
      // Use requestAnimationFrame to make sure it appears in the next frame
      requestAnimationFrame(() => {
        setShowMoveConfirmation(true);
      });
      return;
    }
    
    // For non-recurring events, proceed with the resize
    updatedEvents[eventIndex] = {
      ...updatedEvents[eventIndex],
      start: newStart,
      end: newEnd,
      isBeingResized: false
    };
    
    setEvents(updatedEvents);
    addToHistory(updatedEvents);
    
    // Save changes to local storage immediately and mark for sync
    console.log('Event resized, saving to local storage');
    saveEventsToLocalStorage(updatedEvents);
    markEventForSync(eventId);
    
    // Check if the event exists in the database before updating
    // If it's a newly created event (still in local state only), don't try to update the database
    const isNewEvent = !event.isValidated && !event.fromDatabase;
    
    // Only update in the database if we have userId and it's not a new event
    if (userId && !isNewEvent) {
      // TEMPORARY FIX: Disable database updates for resizes until Firebase function is fixed
      // The resize operation already succeeded in the UI, which is what matters for UX
      console.log('Skipping database update for resize operation (temporary fix for Firebase function issue):', {
        eventId: eventId,
        reason: 'Firebase function updateCalendarEvent is throwing internal errors',
        uiResizeCompleted: true,
        willRetryOnSave: true
      });
    } else {
      console.log('Skipping database resize update for new event that will be saved later');
    }
  };

  // Event move handler
  const handleEventMove = (eventId, newStartDate, newEndDate, isTemporary = false) => {
    const currentEvent = events.find(e => e.id === eventId);
    
    if (!currentEvent) {
      console.error('Event not found:', eventId);
      return;
    }

    // Track drag state
    if (isTemporary) {
      setIsDragging(true);
      setDragStartTime(Date.now());
    } else {
      // End of drag - reset after a delay
      setTimeout(() => {
        setIsDragging(false);
      }, 250);
    }

    // Ensure dates are proper Date objects
    const newStart = newStartDate instanceof Date ? newStartDate : new Date(newStartDate);
    const newEnd = newEndDate instanceof Date ? newEndDate : new Date(newEndDate);

    const isRecurringInstance = currentEvent.isRecurringInstance;
    const originalEvent = isRecurringInstance ? 
      events.find(e => e.id === currentEvent.recurringParentId) : 
      currentEvent;

    // Create a copy of events to modify
    const updatedEvents = [...events];
    const eventIndex = updatedEvents.findIndex(e => e.id === eventId);

    if (eventIndex === -1) {
      console.error('Event index not found:', eventId);
      return;
    }

    if (isTemporary) {
      // For temporary moves (during drag), update the current event's visual position
      // This applies to both regular events and recurring instances
      updatedEvents[eventIndex] = {
        ...updatedEvents[eventIndex],
        start: newStart,
        end: newEnd,
        isBeingMoved: true
      };
      
      setEvents(updatedEvents);
      return;
    }

    // Check if this is a recurring event
    const isRecurringEvent = currentEvent.isRecurring || originalEvent.recurrence || 
      isRecurringInstance || String(eventId).includes('-') || String(eventId).includes('_');

    // Check if this is the last occurrence in the series
    let isLastOccurrence = currentEvent.isLastOccurrence || false;
    
    if (isRecurringEvent && currentEvent.recurrenceId && !isLastOccurrence) {
      // If not explicitly marked, check if this is the last occurrence by comparing with other events
      const seriesEvents = events.filter(e => e.recurrenceId === currentEvent.recurrenceId);
      
      if (seriesEvents.length > 0) {
        // Sort events by end date
        seriesEvents.sort((a, b) => {
          const aEnd = a.end instanceof Date ? a.end : new Date(a.end);
          const bEnd = b.end instanceof Date ? b.end : new Date(b.end);
          return bEnd.getTime() - aEnd.getTime();
        });
        
        // Check if this is the last event in the series
        const latestEvent = seriesEvents[0]; // After sorting, first is latest
        isLastOccurrence = currentEvent.id === latestEvent.id;
        console.log(`Checking if event ${currentEvent.id} is last in series: ${isLastOccurrence}`);
      }
    }
    
    // Create a common structure to store original and new dates for the dialog
    const originalEventDatesObj = {
      start: currentEvent.start instanceof Date ? currentEvent.start : new Date(currentEvent.start),
      end: currentEvent.end instanceof Date ? currentEvent.end : new Date(currentEvent.end)
    };
    
    const newEventDatesObj = {
      start: newStart,
      end: newEnd
    };

    // If this is a recurring event, show confirmation dialog
    if (isRecurringEvent) {
      // Store the pending modification for the dialog
      setPendingModification({
        type: isRecurringInstance ? MODIFICATION_TYPES.MOVE_SINGLE : MODIFICATION_TYPES.MOVE,
        eventId: eventId,
        event: currentEvent,
        originalEvent: originalEvent,
        newStart: newStart,
        newEnd: newEnd
      });
      
      // Store original and new dates for the dialog
      setOriginalEventDates(originalEventDatesObj);
      setNewEventDates(newEventDatesObj);
      
      // Add isLastOccurrence flag to the moved event for the dialog
      setMovedEvent({
        ...currentEvent,
        isLastOccurrence: isLastOccurrence
      });
      
      // Ensure the dialog shows up even with quick mouse movements
      // Use requestAnimationFrame to make sure it appears in the next frame
      requestAnimationFrame(() => {
        setShowMoveConfirmation(true);
      });
      return;
    }

    // For non-recurring events, update immediately
    updatedEvents[eventIndex] = {
      ...updatedEvents[eventIndex],
      start: newStart,
      end: newEnd,
      isBeingMoved: false
    };
    
    setEvents(updatedEvents);
    addToHistory(updatedEvents);
    
    // Save changes to local storage immediately and mark for sync
    console.log('Event moved, saving to local storage');
    saveEventsToLocalStorage(updatedEvents);
    markEventForSync(eventId);
    
    // Update in database if it's an existing event
    const isNewEvent = !currentEvent.isValidated && !currentEvent.fromDatabase;
    
    console.log('Event move - database update check:', {
      eventId: eventId,
      isValidated: currentEvent.isValidated,
      fromDatabase: currentEvent.fromDatabase,
      isNewEvent: isNewEvent,
      userId: userId,
      willUpdateDatabase: userId && !isNewEvent,
      eventIdLength: eventId?.toString().length,
      eventIdType: typeof eventId,
      currentEventKeys: Object.keys(currentEvent),
      currentEventFull: currentEvent
    });
    
    if (userId && !isNewEvent) {
      // TEMPORARY FIX: Disable database updates for moves until Firebase function is fixed
      // The move operation already succeeded in the UI, which is what matters for UX
      console.log('Skipping database update for move operation (temporary fix for Firebase function issue):', {
        eventId: eventId,
        reason: 'Firebase function updateCalendarEvent is throwing internal errors',
        uiMoveCompleted: true,
        willRetryOnSave: true
      });
      return;
      
      // // Previous safety checks (commented out for debugging)
      // // Additional safety checks
      // if (!eventId || (typeof eventId === 'string' && eventId.startsWith('temp-'))) {
      //   console.log('Skipping database update for temporary event ID:', eventId);
      //   return;
      // }
      // 
      // // Check if this event should be updated in database
      // // Skip if: not from database AND not validated AND (has temp ID OR short ID)
      // const hasTemporaryId = currentEvent.id && (
      //   currentEvent.id.toString().startsWith('temp-') ||
      //   currentEvent.id.toString().startsWith('duplicate-') ||
      //   currentEvent.id.toString().length < 15 // Firestore IDs are typically 20+ characters
      // );
      // 
      // if (!currentEvent.fromDatabase && !currentEvent.isValidated && hasTemporaryId) {
      //   console.log('Skipping database update for event that appears to be local-only:', {
      //     eventId: currentEvent.id,
      //     fromDatabase: currentEvent.fromDatabase,
      //     isValidated: currentEvent.isValidated,
      //     idLength: currentEvent.id.toString().length,
      //     hasTemporaryId: hasTemporaryId
      //   });
      //   return;
      // }
      // 
      // // Even if event claims to be from database, if ID looks temporary, skip
      // if (hasTemporaryId) {
      //   console.log('Skipping database update for event with temporary-looking ID:', {
      //     eventId: currentEvent.id,
      //     hasTemporaryId: hasTemporaryId
      //   });
      //   return;
      // }
      // 
      // // Additional safety check: if event doesn't have fromDatabase flag but has a Firestore ID,
      // // it might be stale data. Only proceed if explicitly marked as from database.
      // if (!currentEvent.fromDatabase && !currentEvent.isValidated) {
      //   console.log('Skipping database update for event without fromDatabase flag:', {
      //     eventId: currentEvent.id,
      //     fromDatabase: currentEvent.fromDatabase,
      //     isValidated: currentEvent.isValidated,
      //     hasFirestoreId: currentEvent.id.toString().length >= 15
      //   });
      //   return;
      // }

      const eventForUpdate = {
        id: eventId,
        start: newStart,
        end: newEnd,
        title: currentEvent.title,
        color: currentEvent.color,
        color1: currentEvent.color1,
        color2: currentEvent.color2,
        isValidated: currentEvent.isValidated || false,
        isRecurring: false, // Set to false since we're detaching from recurrence for single moves
        notes: currentEvent.notes,
        location: currentEvent.location,
        employees: currentEvent.employees,
        canton: currentEvent.canton,
        area: currentEvent.area,
        experience: currentEvent.experience,
        software: currentEvent.software,
        certifications: currentEvent.certifications,
        isAvailability: currentEvent.isAvailability
      };

      console.log('About to call updateEvent with eventForUpdate:', {
        ...eventForUpdate,
        eventSource: currentEvent.fromDatabase ? 'database' : 'local',
        eventAge: currentEvent.createdAt ? `${Date.now() - new Date(currentEvent.createdAt).getTime()}ms` : 'unknown'
      });

      updateEvent(eventId, eventForUpdate, userId, accountType)
        .then(result => {
          if (result.success) {
            console.log('Event move updated in database');
          } else {
            console.warn('Database update failed (non-critical for move operation):', result.error);
            // For move operations, we can continue even if database update fails
            // The event has already been moved in the UI
          }
        })
        .catch(error => {
          console.warn('Database update error (non-critical for move operation):', error);
          // For move operations, we can continue even if database update fails
          // The event has already been moved in the UI
        });
    } else {
      console.log('Skipping database update - either no userId or event is new');
    }
  };

  // Unified handler for modification confirmations
  const handleModificationConfirm = (modificationType) => {
    console.log('handleModificationConfirm called with type:', modificationType, 'pendingModification:', pendingModification);
    if (!pendingModification) {
      console.error('handleModificationConfirm called but no pending modification');
      return;
    }
    
    // Reset dialog states
    setShowMoveConfirmation(false);
    
    const { type, eventId, event, newStart, newEnd } = pendingModification;
    console.log('Processing event:', eventId, 'with modification type:', type);
    
    if (modificationType === 'cancel') {
      // Reset the event's position to original state
      if (type === MODIFICATION_TYPES.MOVE || type === MODIFICATION_TYPES.RESIZE || type === MODIFICATION_TYPES.MOVE_SINGLE) {
        // Find the event and reset its position
        const updatedEvents = events.map(e => {
          if (e.id === eventId) {
            return {
              ...e,
              start: originalEventDates?.start instanceof Date ? originalEventDates.start : new Date(originalEventDates.start),
              end: originalEventDates?.end instanceof Date ? originalEventDates.end : new Date(originalEventDates.end),
              isBeingMoved: false // Clear the drag flag
            };
          }
          return e;
        });
        
        // Update state to refresh the event's position
        setEvents(updatedEvents);
      }
      
      // Reset all states
      setPendingModification(null);
      setMovedEvent(null);
      setOriginalEventDates(null);
      setNewEventDates(null);
      return;
    }

    if (type === MODIFICATION_TYPES.PANEL) {
      // Handle panel modification
      const { eventData, shouldClose, originalEvent } = pendingModification;
      
      if (modificationType === 'single') {
        console.log('Panel modification: Updating only this occurrence');
        continueEventSave(eventData, shouldClose);
      }
      else if (modificationType === 'all') {
        console.log('Panel modification: Updating this and all future occurrences');
        
        // Get important IDs for updating series
        const eventDate = new Date(originalEvent.start);
        const baseId = String(originalEvent.id).split(/[-_]/)[0];
        const recurrenceId = originalEvent.recurrenceId;
        
        console.log(`Panel: Modifying all future occurrences with baseId: ${baseId}, recurrenceId: ${recurrenceId}`);
        
        // First, identify all events in this series by looking for baseId or recurrenceId
        const seriesEvents = events.filter(e => {
          // Check both baseId pattern and recurrenceId
          const isInSeries = String(e.id).startsWith(baseId) || 
                            (recurrenceId && e.recurrenceId === recurrenceId);
          return isInSeries;
        });
        
        console.log(`Panel: Found ${seriesEvents.length} events in this series`);
        
        // Create modified versions of all future events in the series
        const modifiedSeriesEvents = seriesEvents.map(e => {
          const eDate = new Date(e.start);
          
          // Only modify this event and future events
          if (eDate >= eventDate) {
            console.log(`Panel: Modifying event ${e.id}`);
            
            // Apply the same changes to this event
            return {
              ...e,
              start: new Date(e.start),  // Keep original date/time
              end: new Date(e.end),      // Keep original date/time
              title: eventData.title,    // Apply new title
              notes: eventData.notes,    // Apply new notes
              location: eventData.location,
              employees: eventData.employees,
              color: eventData.color,
              color1: eventData.color1,
              color2: eventData.color2,
              isValidated: eventData.isValidated,
              repeatValue: eventData.repeatValue,
              endRepeatValue: eventData.endRepeatValue,
              endRepeatDate: eventData.endRepeatDate,
              canton: eventData.canton,
              city: eventData.city,
              area: eventData.area,
              experience: eventData.experience,
              software: eventData.software,
              workAmount: eventData.workAmount
            };
          }
          
          // Keep past events unchanged
          return e;
        });
        
        // Replace the events
        const eventsWithoutSeries = events.filter(e => {
          return !(String(e.id).startsWith(baseId) || 
                  (recurrenceId && e.recurrenceId === recurrenceId));
        });
        
        // Create updated events list
        const updatedEvents = [...eventsWithoutSeries, ...modifiedSeriesEvents];
        
        // Update state with new events
        setEvents(updatedEvents);
        addToHistory(updatedEvents);
        
        // If saving to database, update each modified event
        if (shouldClose && userId) {
          console.log('Panel: Updating database with modified recurring events');
          
          // Save using recurring events handler for the base event
          if (eventData.isRecurring && eventData.repeatValue !== 'None') {
            const eventToSave = { 
              ...eventData,
              id: baseId, 
              userId,
              fromDatabase: true
            };
            
            // Save the base event with recurrenceId
            saveRecurringEvents(eventToSave, userId)
              .then(result => {
                console.log('Panel: saveRecurringEvents result:', result);
                if (result.success) {
                  notificationStore.showNotification('Recurring events updated successfully', 'success');
                } else {
                  notificationStore.showNotification('Error updating recurring events', 'error');
                  console.error('Failed to update recurring events:', result.error);
                }
              })
              .catch(error => {
                console.error('Error updating recurring events:', error);
                notificationStore.showNotification('Error updating recurring events', 'error');
              });
          }
          else {
            // Update each individual occurrence
            modifiedSeriesEvents.forEach(e => {
              const eDate = new Date(e.start);
              
              // Only update future events
              if (eDate >= eventDate) {
                updateEvent(e.id, e, userId, accountType)
                  .then(result => {
                    if (result.success) {
                      console.log(`Panel: Event ${e.id} updated successfully`);
                    } else {
                      console.error(`Failed to update event ${e.id}:`, result.error);
                    }
                  })
                  .catch(error => {
                    console.error(`Error updating event ${e.id}:`, error);
                  });
              }
            });
          }
        }
        
        // Close panel
        setSelectedEvent(null);
        setSelectedEventId(null);
      }
      else {
        // Cancel - do nothing
      }
    } 
    else if ((type === MODIFICATION_TYPES.MOVE || type === MODIFICATION_TYPES.RESIZE)) {
      // Handle recurring event move/resize modification
      console.log('Handling recurring event modification:', modificationType);
      
      // Deep clone the events array
      const newEvents = JSON.parse(JSON.stringify(events));
      
      if (modificationType === 'single') {
        // Update only this occurrence
        const index = newEvents.findIndex(e => String(e.id) === String(eventId));
        if (index !== -1) {
          console.log(`Modifying single event ${eventId} from recurring series`);
          
          // Check if the event had a recurrenceId before updating
          const hadRecurrenceId = !!newEvents[index].recurrenceId;
          
          // Update this specific event
          newEvents[index] = {
            ...newEvents[index],
            start: newStart,
            end: newEnd,
            isBeingMoved: false // Clear the drag flag
          };
          
          // Remove recurrenceId when moving a single child event
          if (hadRecurrenceId) {
            console.log(`Removing recurrenceId from single moved event ${eventId}`);
            delete newEvents[index].recurrenceId;
            // Also make sure isRecurring is set to false
            newEvents[index].isRecurring = false;
          }
          
          // Update state
          setEvents(newEvents);
          addToHistory(newEvents);
          
          // DISABLED: No longer auto-open event panel after move/resize operations
          console.log('Single recurring event modification completed - no panel auto-open');
          
          // Update in database
          if (userId) {
            // Prepare the necessary event data for the update operation
            const eventForUpdate = {
              id: eventId,
              start: newStart,
              end: newEnd,
              title: newEvents[index].title,
              color: newEvents[index].color,
              color1: newEvents[index].color1,
              color2: newEvents[index].color2,
              isValidated: newEvents[index].isValidated || false,
              isRecurring: false, // Set to false since we're detaching from recurrence
              notes: newEvents[index].notes,
              location: newEvents[index].location,
              employees: newEvents[index].employees,
              canton: newEvents[index].canton,
              area: newEvents[index].area,
              experience: newEvents[index].experience,
              software: newEvents[index].software,
              certifications: newEvents[index].certifications,
              isAvailability: newEvents[index].isAvailability
            };

            console.log('Sending update to database for single event:', eventForUpdate);

            // Update the event in the database with all necessary information
            updateEvent(eventId, eventForUpdate, userId, accountType)
              .then(result => {
                if (result.success) {
                  console.log('Single event modified successfully in database');
                } else {
                  console.error('Failed to modify single event in database:', result.error);
                }
              })
              .catch(error => {
                console.error('Error modifying single event in database:', error);
              });
          }
        }
      } 
      else if (modificationType === 'all') {
        // Update this and all future occurrences
        const eventDate = new Date(event.start);
        const originalDate = originalEventDates ? new Date(originalEventDates.start) : new Date(event.start);
        const baseId = String(eventId).split(/[-_]/)[0]; // Get the base ID
        const recurrenceId = event.recurrenceId; // Get recurrence ID if available
        
        console.log(`Modifying all future occurrences with baseId: ${baseId}, recurrenceId: ${recurrenceId}, eventId: ${eventId}`);
        
        // First, identify all events in this series by looking for baseId or recurrenceId
        const seriesEvents = events.filter(e => {
          // Check both baseId pattern and recurrenceId
          const isInSeries = String(e.id).startsWith(baseId) || 
                             (recurrenceId && e.recurrenceId === recurrenceId);
          return isInSeries;
        });
        
        console.log(`Found ${seriesEvents.length} events in this series`);
        
        // Calculate the time difference between original and new times
        const timeDiff = newStart.getTime() - originalDate.getTime();
        console.log(`Time difference to apply: ${timeDiff}ms`);
        
        // Generate a new recurrenceId for this set of modified events
        const newRecurrenceId = `${userId}_${Date.now()}_recurrence`;
        console.log(`Generated new recurrenceId for modified events: ${newRecurrenceId}`);
        
        // Create a set of modified events for the series
        const modifiedSeriesEvents = [];
        
        // First, ensure the current event is properly updated
        const currentEventIndex = seriesEvents.findIndex(e => String(e.id) === String(eventId));
        if (currentEventIndex !== -1) {
          console.log(`Found current event at index ${currentEventIndex}: ${eventId}`);
          
          // Clone the current event and update it
          const updatedEvent = {
            ...seriesEvents[currentEventIndex],
            start: newStart,
            end: newEnd,
            recurrenceId: newRecurrenceId,
            isBeingMoved: false
          };
          
          // Add it to the modified events
          modifiedSeriesEvents.push(updatedEvent);
        } else {
          console.warn(`Could not find current event ${eventId} in series events`);
        }
        
        // Now process the rest of the events
        for (const e of seriesEvents) {
          // Skip the current event since we already processed it
          if (String(e.id) === String(eventId)) {
            continue;
          }
          
          const eDate = new Date(e.start);
          
          // Only include future events
          if (eDate >= eventDate) {
            // Apply the same time shift
            const newStart = new Date(e.start.getTime() + timeDiff);
            const newEnd = new Date(e.end.getTime() + timeDiff);
            
            console.log(`Modifying event ${e.id} from ${e.start} to ${newStart}`);
            
            // Create the updated event
            const updatedEvent = {
              ...e,
              start: newStart,
              end: newEnd,
              recurrenceId: newRecurrenceId,
              isBeingMoved: false
            };
            
            // Add it to the modified events
            modifiedSeriesEvents.push(updatedEvent);
          }
        }
        
        console.log(`Modified ${modifiedSeriesEvents.length} events in total`);
        
        // Replace the entire series in the events array
        // 1. First filter out all events from the series
        const eventsWithoutSeries = newEvents.filter(e => {
          return !(String(e.id).startsWith(baseId) || 
                  (recurrenceId && e.recurrenceId === recurrenceId));
        });
        
        // 2. Then add back the modified series
        const updatedEvents = [...eventsWithoutSeries, ...modifiedSeriesEvents];
        
        // Update state with the new events
        setEvents(updatedEvents);
        addToHistory(updatedEvents);
        
        // DISABLED: No longer auto-open event panel after move/resize operations
        console.log('All recurring event modifications completed - no panel auto-open');
        
        // Update in database
        if (userId) {
          console.log('Updating database with modified recurring events');
          
          // For each modified event, update it in the database
          modifiedSeriesEvents.forEach(e => {
            const eventForUpdate = {
              id: e.id,
              start: e.start,
              end: e.end,
              title: e.title,
              color: e.color,
              color1: e.color1,
              color2: e.color2,
              isValidated: e.isValidated || false,
              isRecurring: true,
              recurrenceId: newRecurrenceId,
              notes: e.notes,
              location: e.location,
              employees: e.employees,
              canton: e.canton,
              area: e.area,
              experience: e.experience,
              software: e.software,
              certifications: e.certifications,
              isAvailability: e.isAvailability,
              isBeingMoved: false
            };
            
            // Update this event in the database
            updateEvent(e.id, eventForUpdate, userId, accountType)
              .then(result => {
                if (result.success) {
                  console.log(`Event ${e.id} modified successfully in database`);
                } else {
                  console.error(`Failed to modify event ${e.id} in database:`, result.error);
                }
              })
              .catch(error => {
                console.error(`Error modifying event ${e.id} in database:`, error);
              });
          });
        }
      }
    }
    else if (type === MODIFICATION_TYPES.MOVE_SINGLE) {
      // Handle single event move confirmation
      console.log('Handling single event modification');
      
      // Deep clone the events array
      const newEvents = JSON.parse(JSON.stringify(events));
      
      // Find the event index
      const index = newEvents.findIndex(e => String(e.id) === String(eventId));
      if (index !== -1) {
        // Update this specific event
        newEvents[index] = {
          ...newEvents[index],
          start: newStart,
          end: newEnd,
          isBeingMoved: false // Clear the drag flag
        };
        
        // Remove recurrenceId when moving a single child event
        if (newEvents[index].recurrenceId) {
          console.log(`Removing recurrenceId from single moved event ${eventId}`);
          delete newEvents[index].recurrenceId;
        }
        
        // Update state
        setEvents(newEvents);
        addToHistory(newEvents);
        
        // DISABLED: No longer auto-open event panel after move/resize operations
        console.log('Single move confirmation completed - no panel auto-open');
        
        // Update in database
        if (userId) {
          // Prepare the necessary event data for the update operation
          const eventForUpdate = {
            id: eventId,
            start: newStart,
            end: newEnd,
            title: newEvents[index].title,
            color: newEvents[index].color,
            color1: newEvents[index].color1,
            color2: newEvents[index].color2,
            isValidated: newEvents[index].isValidated || false,
            isRecurring: false, // Set to false since we're detaching from recurrence
            notes: newEvents[index].notes,
            location: newEvents[index].location,
            employees: newEvents[index].employees,
            canton: newEvents[index].canton,
            area: newEvents[index].area,
            experience: newEvents[index].experience,
            software: newEvents[index].software,
            certifications: newEvents[index].certifications,
            isAvailability: newEvents[index].isAvailability
          };

          // Update the event in the database
          updateEvent(eventId, eventForUpdate, userId, accountType)
            .then(result => {
              if (result.success) {
                console.log('Single event modified successfully in database');
              } else {
                console.error('Failed to modify single event in database:', result.error);
              }
            })
            .catch(error => {
              console.error('Error modifying single event in database:', error);
            });
        }
      }
    }
    
    // Reset all states
    setPendingModification(null);
    setMovedEvent(null);
    setOriginalEventDates(null);
    setNewEventDates(null);
  };

  // Simplified handlers that use the unified handler
  const handleMoveConfirm = () => {
    console.log('handleMoveConfirm called');
    handleModificationConfirm('single');
  };
  
  const handleMoveAllConfirm = () => {
    console.log('handleMoveAllConfirm called');
    handleModificationConfirm('all');
  };

  const handleMoveCancel = () => {
    // Get pending modification data before resetting it
    if (pendingModification) {
      const { eventId, type, originalEvent } = pendingModification;
      
      // For all types of moves or resizes, restore the original position
      if (type === MODIFICATION_TYPES.MOVE || 
          type === MODIFICATION_TYPES.RESIZE ||
          type === MODIFICATION_TYPES.MOVE_SINGLE) {
        
        // Get original dates stored when the move started
        const originalStartDate = originalEventDates?.start;
        const originalEndDate = originalEventDates?.end;
        
        console.log('Canceling move, restoring to original position:', {
          eventId,
          originalStart: originalStartDate,
          originalEnd: originalEndDate
        });
        
        if (originalStartDate && originalEndDate) {
          // Directly update the events array with the original dates
          const updatedEvents = events.map(e => {
            if (e.id === eventId) {
              return {
                ...e,
                start: originalStartDate,
                end: originalEndDate,
                isBeingMoved: false // Clear the drag flag
              };
            }
            return e;
          });
          
          // Update state to refresh the event's position
          setEvents(updatedEvents);
        }
        
        // Force a redraw by toggling a class on the container
        const calendarContainer = document.querySelector('.calendar-container');
        if (calendarContainer) {
          calendarContainer.classList.add('refresh-events');
          setTimeout(() => {
            calendarContainer.classList.remove('refresh-events');
          }, 10);
        }
      }
    }
    
    // Call the standard handler
    handleModificationConfirm('cancel');
  };

  // Handle event change complete
  const handleEventChangeComplete = () => {
    // Add to history
    addToHistory([...events]);
  };

  // Handle category toggle
  const handleCategoryToggle = (index) => {
    setCategories(prevCategories => {
      const newCategories = [...prevCategories];
      newCategories[index] = {
        ...newCategories[index],
        checked: !newCategories[index].checked
      };
      return newCategories;
    });
  };

  // Handle header date click
  const handleHeaderDateClick = (e) => {
    e.stopPropagation();
    
    if (e.target.tagName !== 'INPUT') {
      const rect = e.currentTarget.getBoundingClientRect();
      setDropdownPosition({
        x: 0,
        y: rect.height + 8
      });
      // Close event panel if open
      if (selectedEvent) {
        handlePanelClose();
      }
      // Toggle header dropdown
      setShowHeaderDateDropdown(!showHeaderDateDropdown);
    }
  };

  // Create a new event
  const handleCreateEventClick = () => {
    const startTime = new Date(currentDate);
    startTime.setHours(9, 0, 0, 0); // Fixed time: 9:00 AM
    
    const endTime = new Date(startTime);
    endTime.setHours(10, 0, 0, 0); // Fixed time: 10:00 AM

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

    // Store original position for new events too
    setOriginalEventPosition({
      ...newEvent,
      start: new Date(startTime),
      end: new Date(endTime)
    });

    setSelectedEvent(newEvent);
  };

  // Handle event drop on day headers for cross-day dragging
  const handleEventDropOnDay = (draggedEvent, targetDate) => {
    if (!draggedEvent || !targetDate) return;
    
    // Calculate the time difference to maintain the same time when moving to a different day
    const originalStart = new Date(draggedEvent.start);
    const originalEnd = new Date(draggedEvent.end);
    const duration = originalEnd.getTime() - originalStart.getTime();
    
    // Create new start and end times on the target date
    const newStart = new Date(targetDate);
    newStart.setHours(originalStart.getHours(), originalStart.getMinutes(), 0, 0);
    
    const newEnd = new Date(newStart.getTime() + duration);
    
    // Use the existing handleEventMove function to handle the move
    handleEventMove(draggedEvent.id, newStart, newEnd, false);
  };

  // Toggle sidebar function
  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Local storage functions
  const saveEventsToLocalStorage = (eventsToSave) => {
    try {
      const eventsData = {
        events: eventsToSave,
        timestamp: Date.now(),
        userId: userId
      };
      localStorage.setItem(`calendar_events_${userId}`, JSON.stringify(eventsData));
      console.log('Events saved to local storage');
    } catch (error) {
      console.error('Error saving events to local storage:', error);
    }
  };

  const loadEventsFromLocalStorage = () => {
    try {
      const stored = localStorage.getItem(`calendar_events_${userId}`);
      if (stored) {
        const eventsData = JSON.parse(stored);
        if (eventsData.userId === userId) {
          console.log('Events loaded from local storage');
          return eventsData.events.map(event => ({
            ...event,
            start: new Date(event.start),
            end: new Date(event.end)
          }));
        }
      }
      return null;
    } catch (error) {
      console.error('Error loading events from local storage:', error);
      return null;
    }
  };

  // Mark event as having pending changes
  const markEventForSync = (eventId) => {
    setPendingChanges(prev => new Set([...prev, eventId]));
  };

  // Sync pending changes to database
  const syncPendingChanges = async () => {
    if (pendingChanges.size === 0 || !userId) {
      console.log('No pending changes or no userId - skipping sync', { pendingChanges: pendingChanges.size, userId });
      return;
    }

    console.log(`Syncing ${pendingChanges.size} pending changes to database`, Array.from(pendingChanges));
    const changesToSync = Array.from(pendingChanges);
    
    for (const eventId of changesToSync) {
      const event = events.find(e => e.id === eventId);
      if (event) {
        // Check if event should be synced to database
        const shouldSync = event.fromDatabase || 
                          event.isValidated || 
                          (event.id && !event.id.toString().startsWith('temp-') && 
                           !event.id.toString().startsWith('duplicate-') && 
                           event.id.toString().length > 10);
        
        if (shouldSync) {
          try {
            console.log(`Syncing event ${eventId} to database - fromDB: ${event.fromDatabase}, validated: ${event.isValidated}`);
            
            // Re-enable database updates for sync
            const eventForUpdate = {
              id: eventId,
              start: event.start,
              end: event.end,
              title: event.title,
              color: event.color,
              color1: event.color1,
              color2: event.color2,
              isValidated: event.isValidated || false,
              isRecurring: event.isRecurring || false,
              recurrenceId: event.recurrenceId,
              notes: event.notes,
              location: event.location,
              employees: event.employees,
              canton: event.canton,
              area: event.area,
              experience: event.experience,
              software: event.software,
              certifications: event.certifications,
              isAvailability: event.isAvailability
            };

            const result = await updateEvent(eventId, eventForUpdate, userId, accountType, true); // forceUpdate = true for sync
            if (result.success) {
              console.log(`Successfully synced event ${eventId} to database`);
              setPendingChanges(prev => {
                const newSet = new Set(prev);
                newSet.delete(eventId);
                return newSet;
              });
            } else {
              console.warn(`Failed to sync event ${eventId}:`, result.error);
            }
          } catch (error) {
            console.warn(`Error syncing event ${eventId}:`, error);
          }
        } else {
          console.log(`Skipping sync for event ${eventId} - appears to be local-only or temporary`);
          // Remove from pending changes since it shouldn't be synced
          setPendingChanges(prev => {
            const newSet = new Set(prev);
            newSet.delete(eventId);
            return newSet;
          });
        }
      } else {
        console.warn(`Event ${eventId} not found in events array - removing from pending changes`);
        // Remove from pending changes if event no longer exists
        setPendingChanges(prev => {
          const newSet = new Set(prev);
          newSet.delete(eventId);
          return newSet;
        });
      }
    }
    
    setLastSyncTime(Date.now());
  };

  // Render logic
  return (
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
                headerDateRef={headerDateRef}
                showHeaderDateDropdown={showHeaderDateDropdown}
                setShowHeaderDateDropdown={setShowHeaderDateDropdown}
                handleHeaderDateClick={handleHeaderDateClick}
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
              {/* Mobile Calendar Header with Back Button */}
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
              
              {/* Mobile Calendar Grid */}
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
                  handleEventChangeComplete={handleEventChangeComplete}
                    onMouseDown={handleTimeSlotMouseDown}
                    onMouseMove={handleTimeSlotMouseMove}
                    onMouseUp={handleTimeSlotMouseUp}
                    onMouseLeave={() => {
                      setIsDraggingNewEvent(false);
                      setDragStartPosition(null);
                    }}
                    setIsDraggingNewEvent={setIsDraggingNewEvent}
                    setDragStartPosition={setDragStartPosition}
                    newEventStart={newEventStart}
                    newEventEnd={newEventEnd}
                    isDraggingNewEvent={isDraggingNewEvent}
                    currentDate={currentDate}
                    weekScrollOffset={weekScrollOffset}
                    getEventsForCurrentWeek={(events) => getEventsForCurrentWeek(events, getScrollableWeekDates(currentDate, weekScrollOffset))}
                    getWeekDates={() => getScrollableWeekDates(currentDate, weekScrollOffset)}
                    validatedEvents={validatedEvents}
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
                // Reset scroll to Monday-Sunday when using mini calendar
                setWeekScrollOffset(0);
              }}
              view={view}
              handleDayClick={handleDayClick}
              headerDateRef={headerDateRef}
              showHeaderDateDropdown={showHeaderDateDropdown}
              setShowHeaderDateDropdown={setShowHeaderDateDropdown}
              handleHeaderDateClick={handleHeaderDateClick}
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
            {/* Calendar Header */}
            <CalendarHeader
              currentDate={currentDate}
              view={view}
              setView={setView}
              navigateDate={navigateDate}
              setCurrentDate={(date) => {
                setCurrentDate(date);
                // Reset scroll to Monday-Sunday when using date picker
                setWeekScrollOffset(0);
              }}
              isSidebarCollapsed={isSidebarCollapsed}
              toggleSidebar={toggleSidebar}
              categories={categories}
              handleCategoryToggle={handleCategoryToggle}
            />

            {/* Calendar Grid */}
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
                  handleEventChangeComplete={handleEventChangeComplete}
                  onMouseDown={handleTimeSlotMouseDown}
                  onMouseMove={handleTimeSlotMouseMove}
                  onMouseUp={handleTimeSlotMouseUp}
                  onMouseLeave={() => {
                    setIsDraggingNewEvent(false);
                    setDragStartPosition(null);
                  }}
                  setIsDraggingNewEvent={setIsDraggingNewEvent}
                  setDragStartPosition={setDragStartPosition}
                  newEventStart={newEventStart}
                  newEventEnd={newEventEnd}
                  isDraggingNewEvent={isDraggingNewEvent}
                  currentDate={currentDate}
                  weekScrollOffset={weekScrollOffset}
                  getEventsForCurrentWeek={(events) => getEventsForCurrentWeek(events, getScrollableWeekDates(currentDate, weekScrollOffset))}
                  getWeekDates={() => getScrollableWeekDates(currentDate, weekScrollOffset)}
                  validatedEvents={validatedEvents}
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
            // Only show delete confirmation for existing events (events with an ID)
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
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirmation && eventToDelete && (
        <DeleteConfirmationDialog
          event={eventToDelete}
          currentDate={new Date(eventToDelete.start)}
          onConfirm={(deleteType) => handleEventDelete(eventToDelete.id, deleteType)}
          onCancel={() => {
            setShowDeleteConfirmation(false);
            setEventToDelete(null);
          }}
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
          buttons={
            // For non-recurring events, only show one confirmation button
            !movedEvent.isRecurring
              ? [
                  {
                    text: t('dashboard.calendar.moveConfirmation.confirm'),
                    onClick: handleMoveConfirm,
                    className: 'success',
                    icon: <FaCheck size={14} />
                  },
                  {
                    text: t('dashboard.calendar.moveConfirmation.cancelSingleEvent'),
                    onClick: handleMoveCancel,
                    className: 'cancel',
                    icon: <FaTimes size={14} />
                  }
                ]
              // For recurring events, check if it's the last occurrence
              : (movedEvent.isLastOccurrence || movedEvent.isLastOccurrence === true)
                // For last occurrence, only show validate button
                ? [
                    {
                      text: t('dashboard.calendar.moveConfirmation.confirmSingle'),
                      onClick: handleMoveConfirm,
                      className: 'success',
                      icon: <FaCheck size={14} />
                    },
                    {
                      text: t('dashboard.calendar.moveConfirmation.cancel'),
                      onClick: handleMoveCancel,
                      className: 'cancel',
                      icon: <FaTimes size={14} />
                    }
                  ]
                // For regular occurrences, show both options
                : [
                    {
                      text: t('dashboard.calendar.moveConfirmation.confirmSingle'),
                      onClick: handleMoveConfirm,
                      className: 'success',
                      icon: <FaCheck size={14} />
                    },
                    {
                      text: t('dashboard.calendar.moveConfirmation.confirmAll'),
                      onClick: handleMoveAllConfirm,
                      className: 'warning',
                      icon: <FaCheck size={14} />
                    },
                    {
                      text: t('dashboard.calendar.moveConfirmation.cancel'),
                      onClick: handleMoveCancel,
                      className: 'cancel',
                      icon: <FaTimes size={14} />
                    }
                  ]
          }
          onClose={handleMoveCancel}
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
  );
};

export default Calendar;