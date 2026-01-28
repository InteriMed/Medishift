export const formatTimeForInput = (d) => {
  if (!d) return '';
  try {
    const date = d instanceof Date ? d : new Date(d);
    if (isNaN(date.getTime())) return '';
    const hours = date.getHours();
    const minutes = date.getMinutes();
    if (hours === 0 && minutes === 0) return null;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  } catch (e) {
    return '';
  }
};

export const formatDateForInput = (d) => {
  if (!d) return '';
  try {
    const date = d instanceof Date ? d : new Date(d);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) {
    return '';
  }
};

export const parseDateSafely = (value) => {
  if (!value || value.trim() === '') {
    return null;
  }
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(value)) {
    return null;
  }
  const dateValue = new Date(value);
  if (isNaN(dateValue.getTime())) {
    return null;
  }
  return dateValue;
};

export const parseTimeString = (value) => {
  if (!value || value.trim() === '') {
    return { hours: null, minutes: null };
  }

  let h, m;
  if (value.includes('AM') || value.includes('PM')) {
    const [timePart, period] = value.split(' ');
    const timeParts = timePart.split(':');
    h = parseInt(timeParts[0], 10);
    m = parseInt(timeParts[1], 10);
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
  } else {
    const timeParts = value.split(':');
    h = parseInt(timeParts[0], 10);
    m = parseInt(timeParts[1], 10);
  }

  if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    return { hours: null, minutes: null };
  }

  return { hours: h, minutes: m };
};

export const calculateEndDate = (formData) => {
  if (!formData.isRecurring) return null;

  const startDate = new Date(formData.start);
  let endDate = null;

  if (formData.endRepeatValue === 'On Date' && formData.endRepeatDate) {
    endDate = new Date(formData.endRepeatDate);
  } else if (formData.endRepeatValue === 'After') {
    const occurrences = formData.endRepeatCount || 10;

    if (formData.repeatValue === 'Every Day') {
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + (occurrences - 1));
    } else if (formData.repeatValue === 'Every Week') {
      const selectedDays = formData.weeklyDays || [false, false, false, false, false, false, false];
      const selectedCount = selectedDays.filter(Boolean).length || 1;
      const weeksNeeded = Math.ceil(occurrences / selectedCount);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + (weeksNeeded * 7));
    } else if (formData.repeatValue === 'Every Month') {
      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + (occurrences - 1));
    }
  } else if (formData.endRepeatValue === 'Never') {
    endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 2);
  }

  return endDate;
};

export const getFullDayNames = (language) => {
  const mondayDate = new Date(2000, 0, 3);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(mondayDate);
    date.setDate(mondayDate.getDate() + i);
    return date.toLocaleString(language, { weekday: 'long' });
  });
};

