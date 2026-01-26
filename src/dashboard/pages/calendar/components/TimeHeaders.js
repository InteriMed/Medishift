import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getMultipleWeeks, getMultipleDays, getShortDays, isSameDay } from '../utils/dateHelpers';
import { cn } from '../../../../utils/cn';

const TimeHeaders = ({ currentDate, referenceDate: propReferenceDate, view, handleDayClick, scrollContainerRef, numWeeks = 7, numDays = 30, setView, onEventDropOnDay, nightView = false }) => {
  const { t, i18n } = useTranslation();
  const today = new Date();
  const referenceDate = propReferenceDate || currentDate;
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Generate days based on view type and night view
  let allDays;
  if (nightView) {
    // Night view: show previous day + next day for each date
    if (view === 'day') {
      const prevDay = new Date(referenceDate);
      prevDay.setDate(prevDay.getDate() - 1);
      const nextDay = new Date(referenceDate);
      nextDay.setDate(nextDay.getDate() + 1);
      allDays = [prevDay, nextDay];
    } else {
      const weeksBefore = numWeeks;
      const weeksAfter = numWeeks;
      const weeks = getMultipleWeeks(referenceDate, weeksBefore, weeksAfter);
      const baseDays = weeks.flat();
      const dayPairs = baseDays.map((date, index) => {
        const prevDay = new Date(date);
        prevDay.setDate(prevDay.getDate() - 1);
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        return [{ date: prevDay, originalIndex: index }, { date: nextDay, originalIndex: index }];
      });
      allDays = dayPairs.flat().sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        dateA.setHours(0, 0, 0, 0);
        dateB.setHours(0, 0, 0, 0);
        if (dateA.getTime() === dateB.getTime()) {
          return a.originalIndex - b.originalIndex;
        }
        return dateA.getTime() - dateB.getTime();
      }).map(item => item.date);
    }
  } else if (view === 'day') {
    // Day view: generate days centered around current date
    // Day view: generate single day (current date)
    const daysBefore = 0;
    const daysAfter = 0;
    allDays = getMultipleDays(referenceDate, daysBefore, daysAfter);
  } else {
    // Week view: generate weeks and flatten to days
    // getMultipleWeeks already returns weeks in Monday-Sunday order
    const weeksBefore = numWeeks;
    const weeksAfter = numWeeks;
    const weeks = getMultipleWeeks(referenceDate, weeksBefore, weeksAfter);
    allDays = weeks.flat();
  }
  
  const shortDays = getShortDays(i18n.language);

  return (
    <>
      <div
        className="time-headers flex py-2"
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

          const handleDragOver = (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';
            setDragOverIndex(index);
          };

          const handleDragLeave = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!e.currentTarget.contains(e.relatedTarget)) {
              setDragOverIndex(null);
            }
          };

          const handleDrop = (e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragOverIndex(null);

            try {
              const eventData = e.dataTransfer.getData('text/plain');
              if (eventData) {
                const draggedEvent = JSON.parse(eventData);

                if (draggedEvent.start && typeof draggedEvent.start === 'string') {
                  draggedEvent.start = new Date(draggedEvent.start);
                }
                if (draggedEvent.end && typeof draggedEvent.end === 'string') {
                  draggedEvent.end = new Date(draggedEvent.end);
                }

                const targetDate = new Date(date);
                targetDate.setHours(0, 0, 0, 0);

                if (onEventDropOnDay) {
                  onEventDropOnDay(draggedEvent, targetDate);
                }
              }
            } catch (error) {
              console.error('Error handling drop on day header:', error);
            }
          };

          return (
            <div
              key={index}
              data-date={date.toISOString()}
              data-day-index={index}
              className={`flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 pb-2 ${dragOverIndex === index ? 'drag-over bg-primary/20' : ''}`}
              style={{
                width: view === 'day' ? `${100 / allDays.length}%` : `${100 / allDays.length}%`,
                flexShrink: 0,
                minWidth: view === 'day' ? `${100 / allDays.length}%` : `${100 / allDays.length}%`,
                minHeight: '3rem'
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
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
              <div className="uppercase tracking-wider mb-1 text-muted-foreground" style={{ fontSize: 'var(--font-size-small)', fontWeight: 'var(--font-weight-medium)' }}>
                {shortDays[dayIndex]}
              </div>
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full transition-all",
                  isToday
                    ? 'bg-primary text-primary-foreground'
                    : isCurrentDay
                      ? 'bg-muted text-foreground'
                      : 'text-foreground'
                )}
                style={{ fontSize: 'var(--font-size-medium)', fontWeight: 'var(--font-weight-medium)' }}
              >
                {date.getDate()}
              </div>
            </div>
          );
        })}
      </div>

    </>
  );
};

export default TimeHeaders; 