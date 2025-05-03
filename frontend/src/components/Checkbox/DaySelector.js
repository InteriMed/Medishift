import React, { useState } from 'react';
import './DaySelector.css';

const DaySelector = ({ selectedDays, onChange }) => {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  
  const toggleDay = (index) => {
    const newSelectedDays = [...selectedDays];
    newSelectedDays[index] = !newSelectedDays[index];
    onChange(newSelectedDays);
  };

  return (
    <div className="day-selector">
      {days.map((day, index) => (
        <button
          key={index}
          className={`day-button ${selectedDays[index] ? 'selected' : ''}`}
          onClick={() => toggleDay(index)}
        >
          {day}
        </button>
      ))}
    </div>
  );
};

export default DaySelector; 