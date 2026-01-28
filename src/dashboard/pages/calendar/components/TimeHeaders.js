import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getMultipleWeeks, getMultipleDays, getShortDays, isSameDay } from '../utils/dateHelpers';
import { cn } from '../../../../utils/cn';

const TimeHeaders = ({ currentDate, referenceDate: propReferenceDate, view, handleDayClick, scrollContainerRef, numWeeks = 7, numDays = 30, setView, onEventDropOnDay, nightView = false, isTeamMode = false, isBottom = false }) => {
  const { i18n } = useTranslation();
  const today = new Date();
  const referenceDate = propReferenceDate || currentDate;
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const showAllTimes = windowWidth >= 1000;

  // Generate days based on view type and night view
  let allDays;
  if (nightView && isBottom) {
    // Bottom header in night mode: Tuesday to Monday (shift each week by 1 day forward)
    if (view === 'day') {
      const monday = new Date(referenceDate);
      const dayOfWeek = monday.getDay();
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      monday.setDate(monday.getDate() + daysToMonday);
      const tuesday = new Date(monday);
      tuesday.setDate(monday.getDate() + 1);
      allDays = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(tuesday);
        date.setDate(tuesday.getDate() + i);
        allDays.push(date);
      }
    } else {
      const weeksBefore = numWeeks;
      const weeksAfter = numWeeks;
      const weeks = getMultipleWeeks(referenceDate, weeksBefore, weeksAfter);
      allDays = weeks.map(week => {
        const tuesday = new Date(week[1]);
        const weekDays = [];
        for (let i = 0; i < 7; i++) {
          const date = new Date(tuesday);
          date.setDate(tuesday.getDate() + i);
          weekDays.push(date);
        }
        return weekDays;
      }).flat();
    }
  } else if (nightView) {
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
        className="flex py-2 bg-white"
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

          const isBottomNightMode = nightView && isBottom;
          const textColor = isBottomNightMode ? 'text-red-500' : 'text-muted-foreground';
          const dayNumberColor = isBottomNightMode && (isToday || isCurrentDay) ? 'text-red-500' : '';

          return (
            <div
              key={index}
              data-date={date.toISOString()}
              data-day-index={index}
              className={cn(
                "flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 py-2 transition-colors",
                dragOverIndex === index && 'bg-blue-50 border-2 border-blue-200',
                "border-r border-gray-200 last:border-r-0"
              )}
              style={{
                width: view === 'day' ? `${100 / allDays.length}%` : `${100 / allDays.length}%`,
                flexShrink: 0,
                minWidth: view === 'day' ? `${100 / allDays.length}%` : `${100 / allDays.length}%`,
                minHeight: '3.5rem'
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
              <div className={cn("uppercase tracking-wider mb-1.5 text-xs font-medium", isBottomNightMode ? 'text-red-500' : 'text-gray-500')}>
                {shortDays[dayIndex]}
              </div>
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full transition-all text-sm font-medium",
                  isToday && !isBottomNightMode
                    ? 'bg-blue-600 text-white'
                    : isCurrentDay && !isBottomNightMode
                      ? 'bg-gray-100 text-gray-900'
                      : isBottomNightMode && (isToday || isCurrentDay)
                        ? 'text-red-500'
                        : 'text-gray-900'
                )}
              >
                {date.getDate()}
              </div>
              {isTeamMode && (
                <div className="flex items-end justify-between w-full px-1 mt-1 text-[9px] font-semibold text-gray-500" style={{ height: '14px' }}>
                  {showAllTimes && <span>{nightView ? '18:00' : '06:00'}</span>}
                  <span className={!showAllTimes ? 'mx-auto' : ''}>{nightView ? '00:00' : '12:00'}</span>
                  {showAllTimes && <span>{nightView ? '06:00' : '18:00'}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </>
  );
};

export default TimeHeaders; 