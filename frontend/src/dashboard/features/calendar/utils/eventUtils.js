import { isSameDay, getWeekDates } from './dateHelpers';

// Get events for the current week
export const getEventsForCurrentWeek = (events, currentDate) => {
  if (!events || !Array.isArray(events)) return [];
  
  const weekDates = getWeekDates(currentDate);
  const startOfWeek = weekDates[0];
  const endOfWeek = weekDates[6];
  
  return events.filter(event => {
    const eventStart = new Date(event.start);
    
    // Event starts before or during this week
    return (
      (eventStart >= startOfWeek && eventStart <= endOfWeek) ||
      // For multi-day events that start before this week but end during or after it
      (event.end && new Date(event.end) >= startOfWeek && eventStart <= endOfWeek)
    );
  });
};

// Filter events by selected categories
export const filterEventsByCategories = (events, categories) => {
  if (!events || !Array.isArray(events)) return [];
  if (!categories || !Array.isArray(categories)) return events;
  
  // Get array of checked category colors
  const checkedColors = categories
    .filter(cat => cat.checked)
    .map(cat => cat.color);
  
  // If all categories are unchecked, show no events
  if (checkedColors.length === 0) return [];
  
  // If all categories are checked, return all events
  if (checkedColors.length === categories.length) return events;
  
  // Otherwise, filter events by category color
  return events.filter(event => checkedColors.includes(event.color));
};

// Calculate event position and dimensions for display
export const calculateEventPosition = (event, view, timeSlotHeight) => {
  const start = new Date(event.start);
  const end = new Date(event.end);
  
  // Calculate top position based on start time
  const startHour = start.getHours();
  const startMinute = start.getMinutes();
  const startInMinutes = startHour * 60 + startMinute;
  
  // Calculate duration in minutes
  const endHour = end.getHours();
  const endMinute = end.getMinutes();
  const endInMinutes = endHour * 60 + endMinute;
  const durationInMinutes = endInMinutes - startInMinutes;
  
  // Calculate height based on duration
  const height = (durationInMinutes / 60) * timeSlotHeight;
  
  // For week view, calculate the day of week (0-6, Monday to Sunday)
  let dayOfWeek = 0;
  if (view === 'week') {
    dayOfWeek = start.getDay();
    // Convert from Sunday=0 to Monday=0
    dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  }
  
  // Calculate positions
  const top = (startInMinutes / 60) * timeSlotHeight;
  const left = view === 'week' ? (dayOfWeek / 7) * 100 : 0;
  const width = view === 'week' ? 100 / 7 : 100;
  
  return {
    top,
    left: `${left}%`,
    height,
    width: `${width}%`
  };
};

// Check for overlapping events
export const checkOverlappingEvents = (events, eventId) => {
  if (!events || !Array.isArray(events)) return [];
  
  const currentEvent = events.find(e => e.id === eventId);
  if (!currentEvent) return [];
  
  const start = new Date(currentEvent.start);
  const end = new Date(currentEvent.end);
  
  return events.filter(event => {
    if (event.id === eventId) return false;
    
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    
    return (
      // Event starts during current event
      (eventStart >= start && eventStart < end) ||
      // Event ends during current event
      (eventEnd > start && eventEnd <= end) ||
      // Event completely contains current event
      (eventStart <= start && eventEnd >= end)
    );
  });
}; 