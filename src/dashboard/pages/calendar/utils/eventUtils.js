// Filter events for current week
export const getEventsForCurrentWeek = (events, weekDates) => {
  const weekStart = new Date(weekDates[0]);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekDates[6]);
  weekEnd.setHours(23, 59, 59, 999);

  return events.filter(event => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    return eventStart <= weekEnd && eventEnd >= weekStart;
  });
};

// Filter events based on active categories
export const filterEventsByCategories = (events, categories, calendarColors) => {
  if (!events || !Array.isArray(events)) {
    return [];
  }

  // Get active category colors
  const activeCategories = categories.reduce((acc, category) => {
    if (category && category.checked) {
      acc.push(category.color);
    }
    return acc;
  }, []);

  // If no categories are active, show all events
  if (activeCategories.length === 0) {
    return events;
  }

  // Find blue and grey colors from calendarColors with safety check
  const blueColorObj = calendarColors?.find(c => c && c.id === 'blue');
  const greyColorObj = calendarColors?.find(c => c && c.id === 'grey');
  const blueColor = blueColorObj?.color;
  const greyColor = greyColorObj?.color;

  // Filter events based on category colors
  return events.filter(event => {
    if (!event) return false;
    
    // ALWAYS show temp events (newly created, not yet saved)
    if (event.id && String(event.id).startsWith('temp-')) {
      return true;
    }
    
    // ALWAYS show draft events
    if (event.isDraft) {
      return true;
    }

    // Handle validated events - only show if blue category is active
    if (event.isValidated === true) {
      return blueColor ? activeCategories.includes(blueColor) : false;
    }

    // Handle unvalidated events - only show if grey category is active
    if (event.isValidated === false) {
      return greyColor ? activeCategories.includes(greyColor) : false;
    }

    // For events without isValidated flag or with explicit category colors, use direct color matching
    if (event.color && activeCategories.includes(event.color)) {
      return true;
    }

    // Default: don't show if no match
    return false;
  });
}; 