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
  // Get active category colors
  const activeCategories = categories.reduce((acc, category) => {
    if (category.checked) {
      acc.push(category.color);
    }
    return acc;
  }, []);
  
  // If no categories are active, show all events
  if (activeCategories.length === 0) {
    return events;
  }
  
  // Filter events based on category colors
  return events.filter(event => {
    // Handle validated events
    if (event.isValidated === true) {
      return activeCategories.includes(calendarColors.find(c => c.id === 'blue').color);
    }
    
    // Handle unvalidated events
    if (event.isValidated === false) {
      return activeCategories.includes(calendarColors.find(c => c.id === 'grey').color);
    }
    
    // For events with explicit category colors, use direct matching
    return activeCategories.includes(event.color);
  });
}; 