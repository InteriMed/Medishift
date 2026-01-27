import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import { CALENDAR_COLORS } from '../utils/constants';
import {
  saveEvent,
  updateEvent as updateEventInDb,
  deleteEvent as deleteEventFromDb,
  saveRecurringEvents
} from '../utils/eventDatabase';
import notificationStore from '../../../../utils/stores/notificationStore';

enableMapSet();

// Calendar state store with Zustand
const useCalendarStore = create(
  subscribeWithSelector(
    persist(
      immer((set, get) => ({
        // Context state (User/Workspace)
        userId: null,
        accountType: 'worker',
        workspaceContext: null,

        // Core state
        events: [],
        currentDate: new Date(),
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
        categories: CALENDAR_COLORS.map(c => ({ name: c.name, color: c.color, checked: true })),

        // Data persistence state
        pendingChanges: new Set(),
        lastSyncTime: Date.now(),
        validatedEvents: new Set(),
        isSaving: false,

        // Context Actions
        setContext: (userId, accountType, workspaceContext) => set((state) => {
          state.userId = userId;
          state.accountType = accountType;
          state.workspaceContext = workspaceContext;
        }),

        // Core Actions
        setEvents: (events) => set((state) => {
          state.events = events;
        }),

        addEvent: (event) => set((state) => {
          state.events.push(event);
        }),

        updateEventLocal: (eventId, updates) => set((state) => {
          const eventIndex = state.events.findIndex(e => e.id === eventId);
          if (eventIndex !== -1) {
            Object.assign(state.events[eventIndex], updates);
          }
        }),

        removeEventLocal: (eventId) => set((state) => {
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
          state.showDeleteConfirmation = false;
          state.eventToDelete = null;
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

        // Complex Event Operations (Migrated from useEventOperations)

        // Handle Event Click
        handleEventClick: (event, e) => {
          const state = get();

          // Handle multi-selection logic if needed
          if (e && (e.ctrlKey || e.metaKey)) {
            // ... multi-selection logic ...
            return;
          }

          // Clean click logic
          const clickedEvent = state.events.find(ev => ev.id === event.id) || event;

          set((state) => {
            state.originalEventPosition = {
              ...clickedEvent,
              start: new Date(clickedEvent.start),
              end: new Date(clickedEvent.end)
            };
            state.selectedEvent = clickedEvent;
            state.selectedEventId = event.id;
          });
        },

        // Handle Panel Close
        handlePanelClose: () => set((state) => {
          const { selectedEvent, events, originalEventPosition } = state;

          // Remove temp event if not saved
          if (selectedEvent && String(selectedEvent.id).startsWith('temp-')) {
            state.events = events.filter(e => e.id !== selectedEvent.id);
            state.selectedEvent = null;
            state.selectedEventId = null;
            state.originalEventPosition = null;
            return;
          }

          // Restore original position if modified but not saved
          if (originalEventPosition && selectedEvent && originalEventPosition.id === selectedEvent.id) {
            const currentEventIndex = events.findIndex(e => e.id === selectedEvent.id);
            if (currentEventIndex !== -1) {
              // ... simple check for modification ...
            }
          }

          state.selectedEvent = null;
          state.selectedEventId = null;
          state.originalEventPosition = null;
        }),

        // Save Event Logic
        saveEvent: async (eventWithDates, shouldClose) => {
          console.log('[useCalendarStore] saveEvent called', {
            eventId: eventWithDates.id,
            shouldClose,
            isRecurring: eventWithDates.isRecurring,
            fromDatabase: eventWithDates.fromDatabase
          });

          const { userId, accountType, events } = get();
          console.log('[useCalendarStore] Current state', { userId, accountType, eventsCount: events.length });

          // Optimistic Update
          set(state => {
            state.isSaving = shouldClose;
            const idx = state.events.findIndex(e => e.id === eventWithDates.id);
            if (idx !== -1) {
              state.events[idx] = { ...state.events[idx], ...eventWithDates };
              console.log('[useCalendarStore] Updated existing event in state', { idx, eventId: eventWithDates.id });
            } else {
              state.events.push(eventWithDates);
              console.log('[useCalendarStore] Added new event to state', { eventId: eventWithDates.id });
            }

            // If shouldClose, add to history
            if (shouldClose) {
              const newHistory = state.history.slice(0, state.currentHistoryIndex + 1);
              newHistory.push([...state.events]);
              state.history = newHistory;
              state.currentHistoryIndex = newHistory.length - 1;
            }
          });

          if (!shouldClose || !userId) {
            console.log('[useCalendarStore] Skipping database sync', { shouldClose, userId });
            if (shouldClose) {
              set(state => {
                state.selectedEvent = null;
                state.selectedEventId = null;
                state.originalEventPosition = null;
              });
            }
            return;
          }

          // Database Sync
          try {
            console.log('[useCalendarStore] Starting database sync');
            const eventToSave = {
              ...eventWithDates,
              userId,
              isAvailability: accountType === 'worker' ? true : eventWithDates.isAvailability,
              isValidated: true
            };

            // Recurring vs Single
            let result;
            const isTempEvent = typeof eventWithDates.id === 'string' && eventWithDates.id.startsWith('temp-');
            
            console.log('[useCalendarStore] Determining save strategy', {
              isRecurring: eventToSave.isRecurring,
              repeatValue: eventToSave.repeatValue,
              fromDatabase: eventWithDates.fromDatabase,
              isTempEvent
            });
            
            if (eventToSave.isRecurring && eventToSave.repeatValue && eventToSave.repeatValue !== 'None') {
              console.log('[useCalendarStore] Saving as recurring event');
              result = await saveRecurringEvents(eventToSave, userId);
              console.log('[useCalendarStore] Recurring event save result', result);
            } else if (!eventWithDates.fromDatabase || isTempEvent) {
              // New event or temp event - save it
              console.log('[useCalendarStore] Saving as new event (saveEvent)', { eventId: eventToSave.id });
              result = await saveEvent(eventToSave, userId);
              console.log('[useCalendarStore] New event save result', result);
            } else {
              // Existing event from database - update it
              console.log('[useCalendarStore] Updating existing event (updateEvent)', { eventId: eventToSave.id });
              result = await updateEventInDb(eventToSave.id, eventToSave, userId, accountType);
              console.log('[useCalendarStore] Update event result', result);
            }

            console.log('[useCalendarStore] Database operation completed', { success: result?.success, result });

            if (result.success) {
              console.log('[useCalendarStore] Event saved successfully, updating state');
              notificationStore.showNotification('Event saved successfully', 'success');
              set(state => {
                state.isSaving = false;
                state.validatedEvents.add(result.id || result.recurrenceId || eventWithDates.id);

                // Update ID if new
                if (result.id && result.id !== eventWithDates.id) {
                  const eIdx = state.events.findIndex(e => e.id === eventWithDates.id);
                  if (eIdx !== -1) {
                    state.events[eIdx].id = result.id;
                    state.events[eIdx].fromDatabase = true;
                    state.events[eIdx].isValidated = true;
                    console.log('[useCalendarStore] Updated event ID in state', { oldId: eventWithDates.id, newId: result.id });
                  }
                }

                if (shouldClose) {
                  state.selectedEvent = null;
                  state.selectedEventId = null;
                  state.originalEventPosition = null;
                }
              });
              console.log('[useCalendarStore] State updated, save complete');
            } else {
              console.error('[useCalendarStore] Event save failed', result);
              notificationStore.showNotification('Failed to save event', 'error');
              set(state => { state.isSaving = false; });
            }
          } catch (error) {
            console.error("[useCalendarStore] Save error", error);
            notificationStore.showNotification('Error saving event', 'error');
            set(state => { state.isSaving = false; });
          }
        },

        // Delete Event Logic
        deleteEvent: async (eventId, deleteType = 'single') => {
          const { userId, accountType, events } = get();
          const event = events.find(e => e.id === eventId);

          if (!event) return;

          // Optimistic Delete
          let newEvents = events.filter(e => e.id !== eventId);

          set(state => {
            state.events = newEvents;
            state.showDeleteConfirmation = false;
            state.eventToDelete = null;
            state.selectedEvent = null;
            state.selectedEventId = null;

            // History
            const newHist = state.history.slice(0, state.currentHistoryIndex + 1);
            newHist.push([...newEvents]);
            state.history = newHist;
            state.currentHistoryIndex = newHist.length - 1;
          });

          if (userId) {
            try {
              await deleteEventFromDb(eventId, userId, accountType, deleteType, event.recurrenceId);
            } catch (e) {
              console.error("Delete error", e);
            }
          }
        },

        // Create new event click
        handleCreateEventClick: (currentDate) => set((state) => {
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

          state.events.push(newEvent);
          state.originalEventPosition = { ...newEvent };
          state.selectedEvent = newEvent;
          state.selectedEventId = newEvent.id;
        }),

        // Auto Sync Logic (Migrated from useAutoSync)
        markEventForSync: (eventId) => set((state) => {
          state.pendingChanges.add(eventId);
        }),

        syncPendingChanges: async () => {
          const { pendingChanges, userId, accountType, events } = get();
          if (pendingChanges.size === 0 || !userId) return;

          const changesToSync = Array.from(pendingChanges);
          for (const eventId of changesToSync) {
            const event = events.find(e => e.id === eventId);
            if (event) {
              try {
                await updateEventInDb(eventId, event, userId, accountType, true);
                set(state => { state.pendingChanges.delete(eventId); });
              } catch (e) {
                console.error("Sync error", e);
              }
            } else {
              set(state => { state.pendingChanges.delete(eventId); });
            }
          }
        },

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

        // Interactive functions
        setIsDragging: (isDragging) => set((state) => {
          state.isDragging = isDragging;
          if (isDragging) state.dragStartTime = Date.now();
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
          dayScrollOffset: state.dayScrollOffset,
          // Offline persistence for events (NEW)
          events: state.events
        })
      }
    )
  )
);

export default useCalendarStore;