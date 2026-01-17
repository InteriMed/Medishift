import { 
  format, 
  parse, 
  parseISO, 
  isValid, 
  startOfDay, 
  endOfDay, 
  addDays, 
  subDays,
  formatDistance,
  isAfter,
  isBefore,
  differenceInDays
} from 'date-fns';

/**
 * Format a date with the specified format string
 * @param {Date|string|number} date - Date to format
 * @param {string} formatStr - Format string (default: 'MM/dd/yyyy')
 * @returns {string} Formatted date string
 */
export const formatDate = (date, formatStr = 'MM/dd/yyyy') => {
  if (!date) return '';
  
  try {
    // Handle various date types
    const validDate = date instanceof Date ? date : parseISO(date);
    
    if (!isValid(validDate)) return '';
    
    return format(validDate, formatStr);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

/**
 * Parse a date string into a Date object
 * @param {string} dateStr - Date string
 * @param {string} formatStr - Format string (default: 'MM/dd/yyyy')
 * @returns {Date|null} Parsed date or null if invalid
 */
export const parseDate = (dateStr, formatStr = 'MM/dd/yyyy') => {
  if (!dateStr) return null;
  
  try {
    const parsedDate = parse(dateStr, formatStr, new Date());
    return isValid(parsedDate) ? parsedDate : null;
  } catch (error) {
    console.error('Error parsing date:', error);
    return null;
  }
};

/**
 * Get the start of day for a date
 * @param {Date|string} date - Date to get start of day
 * @returns {Date} Start of day
 */
export const getStartOfDay = (date) => {
  if (!date) return startOfDay(new Date());
  
  const validDate = date instanceof Date ? date : parseISO(date);
  return startOfDay(validDate);
};

/**
 * Get the end of day for a date
 * @param {Date|string} date - Date to get end of day
 * @returns {Date} End of day
 */
export const getEndOfDay = (date) => {
  if (!date) return endOfDay(new Date());
  
  const validDate = date instanceof Date ? date : parseISO(date);
  return endOfDay(validDate);
};

/**
 * Add days to a date
 * @param {Date|string} date - Date to add days to
 * @param {number} days - Number of days to add
 * @returns {Date} Result date
 */
export const addDaysToDate = (date, days) => {
  if (!date) return addDays(new Date(), days);
  
  const validDate = date instanceof Date ? date : parseISO(date);
  return addDays(validDate, days);
};

/**
 * Subtract days from a date
 * @param {Date|string} date - Date to subtract days from
 * @param {number} days - Number of days to subtract
 * @returns {Date} Result date
 */
export const subtractDaysFromDate = (date, days) => {
  if (!date) return subDays(new Date(), days);
  
  const validDate = date instanceof Date ? date : parseISO(date);
  return subDays(validDate, days);
};

/**
 * Get relative time string (e.g., "2 days ago", "in 3 hours")
 * @param {Date|string} date - Date to compare
 * @param {Date} baseDate - Base date (default: now)
 * @returns {string} Relative time string
 */
export const getRelativeTimeString = (date, baseDate = new Date()) => {
  if (!date) return '';
  
  try {
    const validDate = date instanceof Date ? date : parseISO(date);
    
    if (!isValid(validDate)) return '';
    
    return formatDistance(validDate, baseDate, { addSuffix: true });
  } catch (error) {
    console.error('Error getting relative time:', error);
    return '';
  }
};

/**
 * Check if a date is after another date
 * @param {Date|string} date - Date to check
 * @param {Date|string} compareDate - Date to compare against
 * @returns {boolean} True if date is after compareDate
 */
export const isDateAfter = (date, compareDate) => {
  if (!date || !compareDate) return false;
  
  const validDate = date instanceof Date ? date : parseISO(date);
  const validCompareDate = compareDate instanceof Date ? compareDate : parseISO(compareDate);
  
  return isAfter(validDate, validCompareDate);
};

/**
 * Check if a date is before another date
 * @param {Date|string} date - Date to check
 * @param {Date|string} compareDate - Date to compare against
 * @returns {boolean} True if date is before compareDate
 */
export const isDateBefore = (date, compareDate) => {
  if (!date || !compareDate) return false;
  
  const validDate = date instanceof Date ? date : parseISO(date);
  const validCompareDate = compareDate instanceof Date ? compareDate : parseISO(compareDate);
  
  return isBefore(validDate, validCompareDate);
};

/**
 * Get number of days between two dates
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {number} Number of days
 */
export const getDaysBetweenDates = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  
  const validStartDate = startDate instanceof Date ? startDate : parseISO(startDate);
  const validEndDate = endDate instanceof Date ? endDate : parseISO(endDate);
  
  return differenceInDays(validEndDate, validStartDate);
};

export default {
  formatDate,
  parseDate,
  getStartOfDay,
  getEndOfDay,
  addDaysToDate,
  subtractDaysFromDate,
  getRelativeTimeString,
  isDateAfter,
  isDateBefore,
  getDaysBetweenDates
}; 