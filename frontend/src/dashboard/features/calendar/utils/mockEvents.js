import { CALENDAR_COLORS } from './constants';

// Helper to generate a random ID
const generateId = () => Math.random().toString(36).substring(2, 9);

// Get a random color from the CALENDAR_COLORS array
const getRandomColor = () => {
  const randomIndex = Math.floor(Math.random() * CALENDAR_COLORS.length);
  return CALENDAR_COLORS[randomIndex];
};

// Create a date in the current week
const createDateInCurrentWeek = (dayOffset = 0, hour = 9, minute = 0) => {
  const date = new Date();
  const currentDay = date.getDay();
  
  // Adjust to Monday (1) through Sunday (7)
  const dayAdjustment = dayOffset - currentDay + (currentDay === 0 ? -6 : 1);
  
  date.setDate(date.getDate() + dayAdjustment);
  date.setHours(hour, minute, 0, 0);
  
  return date;
};

// Generate mock events for the current week
export const generateMockEvents = (numberOfEvents = 10) => {
  const events = [];
  
  for (let i = 0; i < numberOfEvents; i++) {
    // Random day in the current week (0-6, Monday to Sunday)
    const day = Math.floor(Math.random() * 7);
    
    // Random start hour (9-16)
    const startHour = Math.floor(Math.random() * 8) + 9;
    
    // Random duration (30 min to 2 hours)
    const durationHours = Math.random() * 2 + 0.5;
    
    // Get random color
    const color = getRandomColor();
    
    // Create start and end dates
    const start = createDateInCurrentWeek(day, startHour, 0);
    const end = new Date(start);
    end.setHours(start.getHours() + Math.floor(durationHours));
    end.setMinutes((durationHours % 1) * 60);
    
    // Create the event
    events.push({
      id: generateId(),
      title: `Event ${i + 1}`,
      start: start.toISOString(),
      end: end.toISOString(),
      color: color.color,
      color1: color.color1,
      location: Math.random() > 0.5 ? `Location ${i + 1}` : '',
      notes: Math.random() > 0.7 ? `Notes for event ${i + 1}` : '',
      isRecurring: Math.random() > 0.8,
      recurrencePattern: 'weekly'
    });
  }
  
  return events;
};

// Export some predefined mock events
export const mockEvents = generateMockEvents(15);

export default mockEvents; 