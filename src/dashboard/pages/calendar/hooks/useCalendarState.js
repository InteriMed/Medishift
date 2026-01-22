import { useState, useCallback } from 'react';
import { getDefaultCategories } from '../utils/calendar';

/**
 * Custom hook for managing calendar state
 * Centralizes date, view, navigation, and UI state management
 * 
 * Extracted from Calendar.js to reduce component complexity and improve testability
 */
export const useCalendarState = (initialDate = new Date()) => {
  // Date and navigation state
  const [currentDate, setCurrentDate] = useState(() => {
    // Ensure we always have a valid Date object
    if (initialDate instanceof Date) {
      return initialDate;
    }
    return new Date();
  });
  const [view, setView] = useState('week'); // 'week' or 'day'
  const [slideDirection, setSlideDirection] = useState(null);

  // Scroll state for infinite scrolling
  const [weekScrollOffset, setWeekScrollOffset] = useState(0);
  const [dayScrollOffset, setDayScrollOffset] = useState(0);

  // Sidebar state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Filter categories state
  const [categories, setCategories] = useState(getDefaultCategories());

  // UI component states
  const [showHeaderDateDropdown, setShowHeaderDateDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState(null);

  // Context menu state
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [contextMenuEvent, setContextMenuEvent] = useState(null);

  // Navigation helpers
  const navigateDate = useCallback((direction) => {
    const newDate = new Date(currentDate);
    // Preserve the time components (hours, minutes, seconds, milliseconds)
    const hours = newDate.getHours();
    const minutes = newDate.getMinutes();
    const seconds = newDate.getSeconds();
    const milliseconds = newDate.getMilliseconds();

    if (view === 'week') {
      newDate.setDate(newDate.getDate() + (direction * 7));
      setWeekScrollOffset(0); // Reset scroll to Monday-Sunday
    } else if (view === 'day') {
      setSlideDirection(direction > 0 ? 'left' : 'right');
      newDate.setDate(newDate.getDate() + direction);
      setDayScrollOffset(0); // Reset day scroll to center
    } else {
      newDate.setMonth(newDate.getMonth() + direction);
    }

    // Restore the time components after date change
    newDate.setHours(hours, minutes, seconds, milliseconds);
    setCurrentDate(newDate);
  }, [currentDate, view]);

  // Week scroll navigation
  const handleWeekScroll = useCallback((direction, isInternalScroll = false) => {
    if (isInternalScroll) {
      setWeekScrollOffset(prevOffset => {
        const newOffset = prevOffset + direction;
        return Math.max(-7, Math.min(7, newOffset));
      });
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
  }, [currentDate]);

  // Day scroll navigation
  const handleDayScroll = useCallback((direction, isInternalScroll = false) => {
    if (isInternalScroll) {
      setDayScrollOffset(prevOffset => {
        const newOffset = prevOffset + direction;
        return Math.max(-7, Math.min(7, newOffset));
      });
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
  }, [currentDate]);

  const handleDayClick = useCallback((date) => {
    const direction = date > currentDate ? 1 : -1;
    setSlideDirection(direction > 0 ? 'left' : 'right');
    setWeekScrollOffset(0);
    setDayScrollOffset(0);

    setCurrentDate(date);
  }, [currentDate]);

  // Handle upcoming event click
  const handleUpcomingEventClick = useCallback((eventDate) => {
    const direction = eventDate > currentDate ? 1 : -1;
    setSlideDirection(direction > 0 ? 'left' : 'right');
    setCurrentDate(new Date(eventDate));

    // Reset scroll to Monday-Sunday when clicking on upcoming events
    setWeekScrollOffset(0);

    setView('week');
  }, [currentDate]);

  // Category management
  const handleCategoryToggle = useCallback((index) => {
    setCategories(prevCategories => {
      const newCategories = [...prevCategories];
      newCategories[index] = {
        ...newCategories[index],
        checked: !newCategories[index].checked
      };
      return newCategories;
    });
  }, []);

  // Header date click handler
  const handleHeaderDateClick = useCallback((e) => {
    e.stopPropagation();

    if (e.target.tagName !== 'INPUT') {
      const rect = e.currentTarget.getBoundingClientRect();
      setDropdownPosition({
        x: 0,
        y: rect.height + 8
      });
      setShowHeaderDateDropdown(!showHeaderDateDropdown);
    }
  }, [showHeaderDateDropdown]);

  // Sidebar toggle
  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  }, [isSidebarCollapsed]);

  // Back to mini calendar
  const handleBackToMiniCalendar = useCallback(() => {
    // No-op: kept for API compatibility
  }, []);

  // Context menu handlers
  const showContextMenuAt = useCallback((event, position) => {
    setContextMenuEvent(event);
    setContextMenuPosition(position);
    setShowContextMenu(true);
  }, []);

  const hideContextMenu = useCallback(() => {
    setShowContextMenu(false);
    setContextMenuEvent(null);
  }, []);

  // Context menu edit handler
  const handleContextMenuEdit = useCallback(() => {
    if (contextMenuEvent) {
      // This would be handled by the parent component
      hideContextMenu();
    }
  }, [contextMenuEvent, hideContextMenu]);

  // Context menu duplicate handler
  const handleContextMenuDuplicate = useCallback(() => {
    if (contextMenuEvent) {
      // This would be handled by the parent component
      hideContextMenu();
    }
  }, [contextMenuEvent, hideContextMenu]);

  // Context menu delete handler
  const handleContextMenuDelete = useCallback(() => {
    if (contextMenuEvent) {
      // This would be handled by the parent component
      hideContextMenu();
    }
  }, [contextMenuEvent, hideContextMenu]);

  return {
    // Date and navigation state
    currentDate,
    setCurrentDate,
    view,
    setView,
    slideDirection,
    setSlideDirection,

    // Scroll state
    weekScrollOffset,
    setWeekScrollOffset,
    dayScrollOffset,
    setDayScrollOffset,

    // Sidebar state
    isSidebarCollapsed,
    setIsSidebarCollapsed,

    // Categories
    categories,
    setCategories,

    // UI components
    showHeaderDateDropdown,
    setShowHeaderDateDropdown,
    dropdownPosition,
    setDropdownPosition,

    // Context menu
    showContextMenu,
    contextMenuPosition,
    contextMenuEvent,

    // Navigation functions
    navigateDate,
    handleWeekScroll,
    handleDayScroll,
    handleDayClick,
    handleUpcomingEventClick,
    handleCategoryToggle,
    handleHeaderDateClick,
    toggleSidebar,
    handleBackToMiniCalendar,

    // Context menu functions
    showContextMenuAt,
    hideContextMenu,
    handleContextMenuEdit,
    handleContextMenuDuplicate,
    handleContextMenuDelete
  };
}; 