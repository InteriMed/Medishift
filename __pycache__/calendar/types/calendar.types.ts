// Calendar System TypeScript Definitions
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  color: string;
  color1?: string;
  category: string;
  notes?: string;
  location?: string;
  employees?: string;
  isRecurring?: boolean;
  recurrenceId?: string;
  isValidated?: boolean;
  fromDatabase?: boolean;
  position?: EventPosition;
  type?: EventType;
  workspaceId?: string;
  userId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface EventPosition {
  top: number;
  left: number;
  width: number;
  height: number;
  zIndex?: number;
}

export type EventType = 
  | 'availability'
  | 'timeOffRequest'
  | 'meeting'
  | 'shift'
  | 'contract'
  | 'interim';

export type CalendarView = 'week' | 'day' | 'month';

export interface CalendarCategory {
  name: string;
  color: string;
  checked: boolean;
}

export interface WorkspaceContext {
  type: 'personal' | 'team';
  role: 'professional' | 'manager' | 'admin';
}

export interface CalendarState {
  // Core state
  events: CalendarEvent[];
  currentDate: Date;
  view: CalendarView;
  
  // UI state
  isMobileView: boolean;
  showMobileCalendar: boolean;
  isSidebarCollapsed: boolean;
  
  // Event selection
  selectedEvent: CalendarEvent | null;
  selectedEventId: string | null;
  selectedEventIds: string[];
  
  // Interaction state
  isDragging: boolean;
  isDraggingNewEvent: boolean;
  dragStartPosition: { x: number; y: number } | null;
  newEventStart: Date | null;
  newEventEnd: Date | null;
  
  // Modal/dialog state
  showDeleteConfirmation: boolean;
  eventToDelete: CalendarEvent | null;
  showMoveConfirmation: boolean;
  movedEvent: CalendarEvent | null;
  showModificationDialog: boolean;
  pendingModification: PendingModification | null;
  
  // Context menu
  showContextMenu: boolean;
  contextMenuPosition: { x: number; y: number };
  contextMenuEvent: CalendarEvent | null;
  
  // Dropdown state
  showHeaderDateDropdown: boolean;
  dropdownPosition: { x: number; y: number } | null;
  
  // Navigation
  weekScrollOffset: number;
  dayScrollOffset: number;
  slideDirection: 'left' | 'right' | null;
  
  // Categories
  categories: CalendarCategory[];
  
  // Data state
  pendingChanges: Set<string>;
  isSaving: boolean;
  history: CalendarEvent[][];
  currentHistoryIndex: number;
}

export interface PendingModification {
  type: ModificationType;
  event: CalendarEvent;
  originalData?: Partial<CalendarEvent>;
  newData?: Partial<CalendarEvent>;
}

export type ModificationType = 'move' | 'resize' | 'panel' | 'move_single';

export interface CalendarActions {
  // Core actions
  setEvents: (events: CalendarEvent[]) => void;
  addEvent: (event: CalendarEvent) => void;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  removeEvent: (id: string) => void;
  
  // Navigation
  setCurrentDate: (date: Date) => void;
  setView: (view: CalendarView) => void;
  navigateDate: (direction: number) => void;
  
  // UI state
  setIsMobileView: (isMobile: boolean) => void;
  setShowMobileCalendar: (show: boolean) => void;
  toggleSidebar: () => void;
  
  // Event selection
  setSelectedEvent: (event: CalendarEvent | null) => void;
  setSelectedEventId: (id: string | null) => void;
  clearSelectedEvent: () => void;
  
  // Categories
  toggleCategory: (index: number) => void;
  
  // Computed selectors
  getFilteredEvents: () => CalendarEvent[];
  getEventsForDay: (date: Date) => CalendarEvent[];
  getEventsForWeek: (startDate: Date) => CalendarEvent[];
  
  // History management
  addToHistory: (events: CalendarEvent[]) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // Dialog management
  showDeleteDialog: (event: CalendarEvent) => void;
  hideDeleteDialog: () => void;
  showMoveDialog: (event: CalendarEvent) => void;
  hideMoveDialog: () => void;
  hideContextMenu: () => void;
}

export interface EventHandlers {
  handleEventClick: (event: CalendarEvent, e: React.MouseEvent) => void;
  handleEventDoubleClick: (event: CalendarEvent, e: React.MouseEvent) => void;
  handleEventRightClick: (event: CalendarEvent, e: React.MouseEvent) => void;
  handleEventMove: (eventId: string, newStart: Date, newEnd: Date, isTemporary?: boolean) => void;
  handleEventResize: (eventId: string, newStart: Date, newEnd: Date, isTemporary?: boolean) => void;
  handleEventSave: (event: CalendarEvent, shouldClose?: boolean) => Promise<void>;
  handleEventDelete: (eventId: string, deleteType?: 'single' | 'all') => Promise<void>;
  handleTimeSlotMouseDown: (e: React.MouseEvent) => void;
}

export interface CalendarColors {
  name: string;
  color: string;
  color1: string;
}

export interface TimeSlot {
  hour: number;
  minute: number;
  displayTime: string;
}

export interface RecurrencePattern {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  daysOfWeek?: number[]; // 0-6, Sunday to Saturday
  endDate?: Date;
  occurrences?: number;
}

export interface DatabaseEvent extends Omit<CalendarEvent, 'start' | 'end'> {
  start: string; // ISO string in database
  end: string;   // ISO string in database
}

export interface EventValidationResult {
  isValid: boolean;
  conflicts: CalendarEvent[];
  warnings: string[];
  errors: string[];
}

export interface CalendarConfig {
  timeSlotDuration: number; // minutes
  businessHours: {
    start: string; // HH:mm format
    end: string;   // HH:mm format
  };
  weekStartsOn: number; // 0-6, Sunday to Saturday
  defaultView: CalendarView;
  allowEventOverlap: boolean;
  enableRecurringEvents: boolean;
}

export interface CalendarMetrics {
  totalEvents: number;
  eventsThisWeek: number;
  eventsThisMonth: number;
  mostActiveDay: string;
  averageEventDuration: number; // minutes
  lastSyncTime: Date | null;
  pendingChangesCount: number;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
}

export interface CalendarContainerProps {
  userData: any; // TODO: Replace with proper UserData type
}

export interface EventPanelProps {
  event: CalendarEvent;
  position: EventPosition;
  onClose: () => void;
  onSave: (event: CalendarEvent, shouldClose?: boolean) => Promise<void>;
  onDelete: () => void;
  colorOptions: CalendarColors[];
  accountType: string;
  userData: any;
  workspaceContext: WorkspaceContext;
}

export interface TimeGridProps {
  view: CalendarView;
  events: CalendarEvent[];
  selectedEventId: string | null;
  currentDate: Date;
  weekScrollOffset: number;
  onEventClick: (event: CalendarEvent, e: React.MouseEvent) => void;
  onEventDoubleClick: (event: CalendarEvent, e: React.MouseEvent) => void;
  onEventRightClick: (event: CalendarEvent, e: React.MouseEvent) => void;
  onEventMove: (eventId: string, newStart: Date, newEnd: Date, isTemporary?: boolean) => void;
  onEventResize: (eventId: string, newStart: Date, newEnd: Date, isTemporary?: boolean) => void;
  onTimeSlotMouseDown: (e: React.MouseEvent) => void;
  // Additional props as needed
}

// Utility types
export type EventCreateInput = Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>;
export type EventUpdateInput = Partial<Omit<CalendarEvent, 'id' | 'createdAt'>>;

// Store types for Zustand
export type CalendarStore = CalendarState & CalendarActions;

// Event handler hook return types
export interface UseEventInteractionsReturn {
  handleEventClick: EventHandlers['handleEventClick'];
  handleEventDoubleClick: EventHandlers['handleEventDoubleClick'];
  handleEventRightClick: EventHandlers['handleEventRightClick'];
}

export interface UseEventDragDropReturn {
  handleEventMove: EventHandlers['handleEventMove'];
  handleEventResize: EventHandlers['handleEventResize'];
}

export interface UseEventCRUDReturn {
  handleEventSave: EventHandlers['handleEventSave'];
  handleEventDelete: EventHandlers['handleEventDelete'];
}

export interface UseTimeSlotInteractionsReturn {
  handleTimeSlotMouseDown: EventHandlers['handleTimeSlotMouseDown'];
} 