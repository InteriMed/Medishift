// Helper function to compare only the date part (Y, M, D)
export const isDateBefore = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  return d1 < d2;
};

// Helper function to compare if dates are the same day
export const isSameDay = (date1, date2) => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

// Get week dates starting from Monday
export const getWeekDates = (currentDate) => {
  const start = new Date(currentDate);
  start.setDate(start.getDate() - start.getDay() + (start.getDay() === 0 ? -6 : 1)); // Start from Monday
  const dates = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    dates.push(date);
  }
  
  return dates;
};

// Get short weekday names for the current locale
export const getShortDays = (locale = undefined) => {
  const days = [];
  // Start with Monday (1) through Sunday (0)
  for (let i = 1; i <= 7; i++) {
    const day = i % 7;
    const date = new Date(2021, 0, 3 + day); // January 3, 2021 was a Sunday
    days.push(date.toLocaleString(locale, { weekday: 'short' }));
  }
  return days;
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

// Generate time slots for the calendar grid
export const generateTimeSlots = (firstHour = 0, lastHour = 23) => {
  const slots = [];
  for (let hour = firstHour; hour <= lastHour; hour++) {
    slots.push({
      hour,
      label: `${hour}:00`
    });
  }
  return slots;
};

// Format time for display
export const formatTime = (date) => {
  return date.toLocaleTimeString(undefined, { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false
  });
};

// Format date for display
export const formatDate = (date) => {
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}; 