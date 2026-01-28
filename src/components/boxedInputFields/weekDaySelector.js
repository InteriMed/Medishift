import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../services/utils/formatting';

const WeekDaySelector = ({ selectedDays, onChange }) => {
  const { i18n } = useTranslation();
  
  const getFullDayNames = (language) => {
    const mondayDate = new Date(2000, 0, 3);
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(mondayDate);
      date.setDate(mondayDate.getDate() + i);
      return date.toLocaleString(language, { weekday: 'long' });
    });
  };

  const dayNames = getFullDayNames(i18n.language);
  
  const toggleDay = (index) => {
    const newSelectedDays = [...(selectedDays || [false, false, false, false, false, false, false])];
    newSelectedDays[index] = !newSelectedDays[index];
    onChange(newSelectedDays);
  };

  const selectedDaysArray = selectedDays || [false, false, false, false, false, false, false];

  return (
    <div className="flex flex-wrap gap-2">
      {dayNames.map((dayName, index) => (
        <button
          key={index}
          type="button"
          onClick={() => toggleDay(index)}
          className={cn(
            "px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
            "border border-input hover:bg-muted",
            selectedDaysArray[index]
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-foreground"
          )}
        >
          {dayName.charAt(0)}
        </button>
      ))}
    </div>
  );
};

export default WeekDaySelector;





