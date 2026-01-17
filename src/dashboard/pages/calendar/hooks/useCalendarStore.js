import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Calendar state store with Zustand
const useCalendarStore = create(
  subscribeWithSelector(
    persist(
      immer((set, get) => ({
        // Core state
        events: [],
        currentDate: new Date(2024, 0, 1), // Fixed date: January 1, 2024
        view: 'week', // 'week' or 'day'
        
        // UI state
        isMobileView: false,
        showMobileCalendar: false,
        isSidebarCollapsed: false,
        
        // Event selection state
        selectedEvent: null,
        selectedEventId: null,
        selectedEventIds: [],
        
        // Interaction state
        isDragging: false,
        dragStartTime: null,
        isDraggingNewEvent: false,
        dragStartPosition: null,
        newEventStart: null,
        newEventEnd: null,
        
        // History state
        history: [[]],
        currentHistoryIndex: 0,
        
        // Modal/dialog state
        showDeleteConfirmation: false,
        eventToDelete: null,
        showMoveConfirmation: false,
        movedEvent: null,
        showModificationDialog: false,
        pendingModification: null,
        
        // Context menu state
        showContextMenu: false,
        contextMenuPosition: { x: 0, y: 0 },
        contextMenuEvent: null,
        
        // Dropdown state
        showHeaderDateDropdown: false,
        dropdownPosition: null,
        
        // Click handling state
        clickTimeout: null,
        clickCount: 0,
        
        // Calendar navigation state
        weekScrollOffset: 0,
        dayScrollOffset: 0,
        slideDirection: null,
        
        // Event dates state
        originalEventDates: null,
        newEventDates: null,
        originalEventPosition: null,
        
        // Categories state
        categories: [
          { name: 'Personal', color: '#0f54bc', checked: true },
          { name: 'Missing employees', color: '#f54455', checked: true },
          { name: 'Waiting for confirmation', color: '#6c6ce7', checked: true },
          { name: 'Approved employee', color: '#0da71c', checked: true },
          { name: 'Unvalidated', color: '#8c8c8c', checked: true },
        ],
        
        // Data persistence state
        pendingChanges: new Set(),
        lastSyncTime: Date.now(),
        validatedEvents: new Set(),
        isSaving: false,
        
        // Actions
        setEvents: (events) => set((state) => {
          state.events = events;
        }),
        
        addEvent: (event) => set((state) => {
          state.events.push(event);
        }),
        
        updateEvent: (eventId, updates) => set((state) => {
          const eventIndex = state.events.findIndex(e => e.id === eventId);
          if (eventIndex !== -1) {
            Object.assign(state.events[eventIndex], updates);
          }
        }),
        
        removeEvent: (eventId) => set((state) => {
          state.events = state.events.filter(e => e.id !== eventId);
        }),
        
        setCurrentDate: (date) => set((state) => {
          state.currentDate = date;
          state.weekScrollOffset = 0;
          state.dayScrollOffset = 0;
        }),
        
        setView: (view) => set((state) => {
          state.view = view;
        }),
        
        setSelectedEvent: (event) => set((state) => {
          state.selectedEvent = event;
          state.selectedEventId = event?.id || null;
        }),
        
        setSelectedEventId: (eventId) => set((state) => {
          state.selectedEventId = eventId;
          if (eventId) {
            const event = state.events.find(e => e.id === eventId);
            state.selectedEvent = event || null;
          } else {
            state.selectedEvent = null;
          }
        }),
        
        clearSelectedEvent: () => set((state) => {
          state.selectedEvent = null;
          state.selectedEventId = null;
          state.originalEventPosition = null;
        }),
        
        setMultiSelectedEvents: (eventIds) => set((state) => {
          state.selectedEventIds = eventIds;
        }),
        
        addToMultiSelection: (eventId) => set((state) => {
          if (!state.selectedEventIds.includes(eventId)) {
            state.selectedEventIds.push(eventId);
          }
        }),
        
        removeFromMultiSelection: (eventId) => set((state) => {
          state.selectedEventIds = state.selectedEventIds.filter(id => id !== eventId);
        }),
        
        clearMultiSelection: () => set((state) => {
          state.selectedEventIds = [];
        }),
        
        setIsDragging: (isDragging) => set((state) => {
          state.isDragging = isDragging;
          if (isDragging) {
            state.dragStartTime = Date.now();
          }
        }),
        
        setDragStartPosition: (position) => set((state) => {
          state.dragStartPosition = position;
        }),
        
        setNewEventDates: (start, end) => set((state) => {
          state.newEventStart = start;
          state.newEventEnd = end;
        }),
        
        setIsDraggingNewEvent: (isDragging) => set((state) => {
          state.isDraggingNewEvent = isDragging;
        }),
        
        // History actions
        addToHistory: (events) => set((state) => {
          const newHistory = state.history.slice(0, state.currentHistoryIndex + 1);
          newHistory.push([...events]);
          state.history = newHistory;
          state.currentHistoryIndex = newHistory.length - 1;
        }),
        
        undo: () => set((state) => {
          if (state.currentHistoryIndex > 0) {
            const newIndex = state.currentHistoryIndex - 1;
            state.currentHistoryIndex = newIndex;
            state.events = [...state.history[newIndex]];
            
            // Clear selected event if it no longer exists
            const previousEvents = state.history[newIndex];
            if (state.selectedEvent && !previousEvents.find(e => e.id === state.selectedEvent.id)) {
              state.selectedEvent = null;
              state.selectedEventId = null;
            }
          }
        }),
        
        redo: () => set((state) => {
          if (state.currentHistoryIndex < state.history.length - 1) {
            const newIndex = state.currentHistoryIndex + 1;
            state.currentHistoryIndex = newIndex;
            state.events = [...state.history[newIndex]];
            
            // Clear selected event if it no longer exists
            const nextEvents = state.history[newIndex];
            if (state.selectedEvent && !nextEvents.find(e => e.id === state.selectedEvent.id)) {
              state.selectedEvent = null;
              state.selectedEventId = null;
            }
          }
        }),
        
        // Modal/dialog actions
        showDeleteDialog: (event) => set((state) => {
          state.showDeleteConfirmation = true;
          state.eventToDelete = event;
        }),
        
        hideDeleteDialog: () => set((state) => {
          state.showDeleteConfirmation = false;
          state.eventToDelete = null;
        }),
        
        showMoveDialog: (event, originalDates, newDates) => set((state) => {
          state.showMoveConfirmation = true;
          state.movedEvent = event;
          state.originalEventDates = originalDates;
          state.newEventDates = newDates;
        }),
        
        hideMoveDialog: () => set((state) => {
          state.showMoveConfirmation = false;
          state.movedEvent = null;
          state.originalEventDates = null;
          state.newEventDates = null;
        }),
        
        setPendingModification: (modification) => set((state) => {
          state.pendingModification = modification;
          state.showModificationDialog = !!modification;
        }),
        
        clearPendingModification: () => set((state) => {
          state.pendingModification = null;
          state.showModificationDialog = false;
        }),
        
        // Context menu actions
        showContextMenuAt: (position, event) => set((state) => {
          state.showContextMenu = true;
          state.contextMenuPosition = position;
          state.contextMenuEvent = event;
        }),
        
        hideContextMenu: () => set((state) => {
          state.showContextMenu = false;
          state.contextMenuEvent = null;
        }),
        
        // Navigation actions
        setWeekScrollOffset: (offset) => set((state) => {
          state.weekScrollOffset = Math.max(-7, Math.min(7, offset));
        }),
        
        setDayScrollOffset: (offset) => set((state) => {
          state.dayScrollOffset = Math.max(-7, Math.min(7, offset));
        }),
        
        setSlideDirection: (direction) => set((state) => {
          state.slideDirection = direction;
        }),
        
        // Category actions
        toggleCategory: (index) => set((state) => {
          if (state.categories[index]) {
            state.categories[index].checked = !state.categories[index].checked;
          }
        }),
        
        // Data sync actions
        addPendingChange: (eventId) => set((state) => {
          state.pendingChanges.add(eventId);
        }),
        
        removePendingChange: (eventId) => set((state) => {
          state.pendingChanges.delete(eventId);
        }),
        
        clearPendingChanges: () => set((state) => {
          state.pendingChanges.clear();
        }),
        
        addValidatedEvent: (eventId) => set((state) => {
          state.validatedEvents.add(eventId);
        }),
        
        setLastSyncTime: (time) => set((state) => {
          state.lastSyncTime = time;
        }),
        
        setIsSaving: (isSaving) => set((state) => {
          state.isSaving = isSaving;
        }),
        
        // Mobile/responsive actions
        setIsMobileView: (isMobile) => set((state) => {
          state.isMobileView = isMobile;
          if (isMobile) {
            state.showMobileCalendar = false;
          }
        }),
        
        setShowMobileCalendar: (show) => set((state) => {
          state.showMobileCalendar = show;
        }),
        
        toggleSidebar: () => set((state) => {
          state.isSidebarCollapsed = !state.isSidebarCollapsed;
        }),
        
        setSidebarCollapsed: (collapsed) => set((state) => {
          state.isSidebarCollapsed = collapsed;
        }),
        
        // Original event position for restore functionality
        setOriginalEventPosition: (event) => set((state) => {
          state.originalEventPosition = event ? {
            ...event,
            start: new Date(event.start),
            end: new Date(event.end)
          } : null;
        }),
        
        // Header dropdown actions
        setShowHeaderDateDropdown: (show) => set((state) => {
          state.showHeaderDateDropdown = show;
        }),
        
        setDropdownPosition: (position) => set((state) => {
          state.dropdownPosition = position;
        }),
        
        // Click handling actions
        setClickTimeout: (timeout) => set((state) => {
          state.clickTimeout = timeout;
        }),
        
        setClickCount: (count) => set((state) => {
          state.clickCount = count;
        }),
        
        // Computed selectors
        getFilteredEvents: () => {
          const state = get();
          const activeCategories = state.categories
            .filter(cat => cat.checked)
            .map(cat => cat.color);
          
          if (activeCategories.length === 0) {
            return state.events;
          }
          
          return state.events.filter(event => {
            // Handle validated events
            if (event.isValidated === true) {
              return activeCategories.includes('#0f54bc'); // Blue
            }
            
            // Handle unvalidated events
            if (event.isValidated === false) {
              return activeCategories.includes('#8c8c8c'); // Grey
            }
            
            // For events with explicit category colors
            return activeCategories.includes(event.color);
          });
        },
        
        canUndo: () => {
          const state = get();
          return state.currentHistoryIndex > 0;
        },
        
        canRedo: () => {
          const state = get();
          return state.currentHistoryIndex < state.history.length - 1;
        },
        
        hasPendingChanges: () => {
          const state = get();
          return state.pendingChanges.size > 0;
        }
      })),
      {
        name: 'calendar-storage',
        partialize: (state) => ({
          // Only persist certain parts of the state
          currentDate: state.currentDate,
          view: state.view,
          categories: state.categories,
          isSidebarCollapsed: state.isSidebarCollapsed,
          weekScrollOffset: state.weekScrollOffset,
          dayScrollOffset: state.dayScrollOffset
        })
      }
    )
  )
);

export default useCalendarStore; 