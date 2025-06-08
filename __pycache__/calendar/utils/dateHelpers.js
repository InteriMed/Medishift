// Helper function to compare only the date part (Y, M, D)
export const isDateBefore = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  return d1 < d2;
};

// Helper function to get Monday-based day index (Monday = 0, Sunday = 6)
export const getMondayBasedDayIndex = (date) => {
  const jsDay = date.getDay(); // JavaScript's getDay: Sunday = 0, Monday = 1, ..., Saturday = 6
  return jsDay === 0 ? 6 : jsDay - 1; // Convert to Monday = 0, Sunday = 6
};

// Get week dates starting from Monday
export const getWeekDates = (currentDate) => {
  const start = new Date(currentDate);
  const mondayIndex = getMondayBasedDayIndex(start);
  start.setDate(start.getDate() - mondayIndex); // Start from Monday
  const dates = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    dates.push(date);
  }
  return dates;
};

// Get short day names based on locale, starting from Monday
export const getShortDays = (language) => {
  // Create dates for Monday through Sunday
  const mondayDate = new Date(2000, 0, 3); // January 3, 2000 was a Monday
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(mondayDate);
    date.setDate(mondayDate.getDate() + i);
    const day = date.toLocaleString(language, { weekday: 'short' }).slice(0, 3);
    return day.charAt(0).toUpperCase() + day.slice(1);
  });
};

// Generate time slots for the day view
export const generateTimeSlots = () => {
  const times = [];
  for (let i = 0; i < 24; i++) {
    const hour = i < 10 ? `0${i}:00` : `${i}:00`;
    times.push(hour);
  }
  return times;
};

// Get the week number for a given date
export const getWeekNumber = (date) => {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
};

// Get days around current date for day view
export const getDaysAroundCurrent = (currentDate) => {
  const days = [];
  const middleIndex = 3; // We'll show 7 days total, with current day in middle
  
  for (let i = -middleIndex; i <= middleIndex; i++) {
    const date = new Date(currentDate);
    date.setDate(currentDate.getDate() + i);
    days.push(date);
  }
  return days;
};

// Get scrollable days around current date for day view with scroll offset
export const getScrollableDaysAroundCurrent = (currentDate, scrollOffset = 0) => {
  const days = [];
  const middleIndex = 3; // We'll show 7 days total, with current day in middle
  
  for (let i = -middleIndex; i <= middleIndex; i++) {
    const date = new Date(currentDate);
    date.setDate(currentDate.getDate() + i + scrollOffset);
    days.push(date);
  }
  return days;
};

/**
 * Check if two dates are the same day
 * @param {Date} date1 - First date to compare
 * @param {Date} date2 - Second date to compare
 * @returns {boolean} True if dates are on the same day
 */
export const isSameDay = (date1, date2) => {
  if (!date1 || !date2) return false;
  
  // Ensure we're working with Date objects
  const d1 = date1 instanceof Date ? date1 : new Date(date1);
  const d2 = date2 instanceof Date ? date2 : new Date(date2);
  
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

// Get week dates with custom scroll offset (0 = Monday-Sunday, 1 = Tuesday-Monday, etc.)
export const getScrollableWeekDates = (currentDate, scrollOffset = 0) => {
  const start = new Date(currentDate);
  const mondayIndex = getMondayBasedDayIndex(start);
  
  // Start from Monday of the current week, then apply scroll offset
  // For negative offsets, we need to go backwards in days
  start.setDate(start.getDate() - mondayIndex + scrollOffset);
  
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    dates.push(date);
  }
  return dates;
};

// Get day index for scrollable week (0-6 where 0 is the first day of the scrolled week)
export const getScrollableDayIndex = (date, scrollOffset = 0) => {
  // Safety check for undefined or null date
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    console.warn('Invalid date passed to getScrollableDayIndex:', date);
    return 0; // Return default index
  }
  
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  // Convert to Monday-based index (0 = Monday, 6 = Sunday)
  const mondayBasedIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  // Apply scroll offset and wrap around
  // Use proper modulo for negative numbers
  const scrolledIndex = ((mondayBasedIndex - scrollOffset) % 7 + 7) % 7;
  
  return scrolledIndex;
};

// Get short day names for scrollable week
export const getScrollableShortDays = (language, scrollOffset = 0) => {
  // Create dates for Monday through Sunday
  const mondayDate = new Date(2000, 0, 3); // January 3, 2000 was a Monday
  const allDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(mondayDate);
    date.setDate(mondayDate.getDate() + i);
    const day = date.toLocaleString(language, { weekday: 'short' }).slice(0, 3);
    return day.charAt(0).toUpperCase() + day.slice(1);
  });
  
  // Apply scroll offset with proper modulo for negative numbers
  const scrolledDays = [];
  for (let i = 0; i < 7; i++) {
    const dayIndex = ((i + scrollOffset) % 7 + 7) % 7;
    scrolledDays.push(allDays[dayIndex]);
  }
  
  return scrolledDays;
};

// Check if a date falls within the scrollable week range
export const isDateInScrollableWeek = (date, currentDate, scrollOffset = 0) => {
  const weekDates = getScrollableWeekDates(currentDate, scrollOffset);
  const weekStart = weekDates[0];
  const weekEnd = weekDates[6];
  
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const weekStartOnly = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
  const weekEndOnly = new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate());
  
  return dateOnly >= weekStartOnly && dateOnly <= weekEndOnly;
}; 