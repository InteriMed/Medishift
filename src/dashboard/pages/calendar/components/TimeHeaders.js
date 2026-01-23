import React from 'react';
import { useTranslation } from 'react-i18next';
import { getMultipleWeeks, getMultipleDays, getShortDays, isSameDay } from '../utils/dateHelpers';

const TimeHeaders = ({ currentDate, referenceDate: propReferenceDate, view, handleDayClick, scrollContainerRef, numWeeks = 7, numDays = 30, setView }) => {
  const { t, i18n } = useTranslation();
  const today = new Date();
  const referenceDate = propReferenceDate || currentDate;

  // Generate days based on view type
  let allDays;
  if (view === 'day') {
    // Day view: generate days centered around current date
    // Day view: generate single day (current date)
    const daysBefore = 0;
    const daysAfter = 0;
    allDays = getMultipleDays(referenceDate, daysBefore, daysAfter);
  } else {
    // Week view: generate weeks and flatten to days
    const weeksBefore = numWeeks;
    const weeksAfter = numWeeks;
    const weeks = getMultipleWeeks(referenceDate, weeksBefore, weeksAfter);
    allDays = weeks.flat();
  }
  const shortDays = getShortDays(i18n.language);

  return (
    <div
      className="flex py-2"
      style={{
        width: view === 'day' ? `${allDays.length * 100}%` : `${allDays.length * (100 / 7)}%`,
        minWidth: view === 'day' ? `${allDays.length * 100}%` : `${allDays.length * (100 / 7)}%`
      }}
    >
      {/* Day headers - show all days from multiple weeks */}
      {allDays.map((date, index) => {
        const isToday = isSameDay(date, today);
        const isCurrentDay = isSameDay(date, currentDate);
        const dayOfWeek = date.getDay();
        const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0, Sunday = 6

        return (
          <div
            key={index}
            className="flex flex-col items-center justify-center cursor-pointer transition-colors hover:bg-muted/50 pb-2"
            style={{
              width: view === 'day' ? `${100 / allDays.length}%` : `${100 / allDays.length}%`,
              flexShrink: 0,
              minWidth: view === 'day' ? `${100 / allDays.length}%` : `${100 / allDays.length}%`,
              minHeight: '3rem'
            }}
            onClick={() => {
              const clickedDate = new Date(date);
              clickedDate.setHours(0, 0, 0, 0);
              const currDate = new Date(currentDate);
              currDate.setHours(0, 0, 0, 0);
              
              const isSameDate = clickedDate.getTime() === currDate.getTime();
              
              if (isSameDate && view === 'day' && setView) {
                setView('week');
              } else if (!isSameDate) {
                handleDayClick(date);
                if (setView) {
                  setView('day');
                }
              } else if (isSameDate && view === 'week' && setView) {
                setView('day');
              }
            }}
          >
            <div className="uppercase text-muted-foreground tracking-wider mb-1" style={{ fontSize: 'var(--font-size-small)', fontWeight: 'var(--font-weight-medium)' }}>
              {shortDays[dayIndex]}
            </div>
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full transition-all ${isToday
                ? 'bg-primary text-primary-foreground'
                : isCurrentDay
                  ? 'bg-muted text-foreground'
                  : 'text-foreground'
                }`}
              style={{ fontSize: 'var(--font-size-medium)', fontWeight: 'var(--font-weight-medium)' }}
            >
              {date.getDate()}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TimeHeaders; 