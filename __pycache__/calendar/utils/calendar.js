import { CALENDAR_COLORS } from './constants';
import { getShortDays, getDaysAroundCurrent, getWeekDates } from './dateHelpers';

export const getDefaultCategories = () => {
  return CALENDAR_COLORS.map(cat => ({
    name: cat.name,
    color: cat.color,
    checked: true
  }));
};

export const safeMap = (array, callback) => {
  if (!array || !Array.isArray(array)) return [];
  return array.map(callback);
};

export { getShortDays, getDaysAroundCurrent, getWeekDates }; 