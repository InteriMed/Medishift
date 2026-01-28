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

export const formatDate = (date: Date | string | number, formatStr: string = 'MM/dd/yyyy'): string => {
  if (!date) return '';

  try {
    const validDate = date instanceof Date ? date : parseISO(String(date));

    if (!isValid(validDate)) return '';

    return format(validDate, formatStr);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

export const parseDate = (dateStr: string, formatStr: string = 'MM/dd/yyyy'): Date | null => {
  if (!dateStr) return null;

  try {
    const parsedDate = parse(dateStr, formatStr, new Date());
    return isValid(parsedDate) ? parsedDate : null;
  } catch (error) {
    console.error('Error parsing date:', error);
    return null;
  }
};

export const getStartOfDay = (date?: Date | string): Date => {
  if (!date) return startOfDay(new Date());

  const validDate = date instanceof Date ? date : parseISO(date);
  return startOfDay(validDate);
};

export const getEndOfDay = (date?: Date | string): Date => {
  if (!date) return endOfDay(new Date());

  const validDate = date instanceof Date ? date : parseISO(date);
  return endOfDay(validDate);
};

export const addDaysToDate = (date: Date | string | null, days: number): Date => {
  if (!date) return addDays(new Date(), days);

  const validDate = date instanceof Date ? date : parseISO(date);
  return addDays(validDate, days);
};

export const subtractDaysFromDate = (date: Date | string | null, days: number): Date => {
  if (!date) return subDays(new Date(), days);

  const validDate = date instanceof Date ? date : parseISO(date);
  return subDays(validDate, days);
};

export const getRelativeTimeString = (date: Date | string, baseDate: Date = new Date()): string => {
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

export const isDateAfter = (date: Date | string, compareDate: Date | string): boolean => {
  if (!date || !compareDate) return false;

  const validDate = date instanceof Date ? date : parseISO(date);
  const validCompareDate = compareDate instanceof Date ? compareDate : parseISO(compareDate);

  return isAfter(validDate, validCompareDate);
};

export const isDateBefore = (date: Date | string, compareDate: Date | string): boolean => {
  if (!date || !compareDate) return false;

  const validDate = date instanceof Date ? date : parseISO(date);
  const validCompareDate = compareDate instanceof Date ? compareDate : parseISO(compareDate);

  return isBefore(validDate, validCompareDate);
};

export const getDaysBetweenDates = (startDate: Date | string, endDate: Date | string): number => {
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

