import React from 'react';
import './styles/boxedInputFields.css';

const daySelector = ({ selectedDays, onChange, error, onErrorReset }) => {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  
  const toggleDay = (index) => {
    const newSelectedDays = [...selectedDays];
    newSelectedDays[index] = !newSelectedDays[index];
    onChange(newSelectedDays);
    
    // Reset error on selection
    if (error && onErrorReset) {
      onErrorReset();
    }
  };

  return (
    <div className="day-selector">
      {days.map((day, index) => (
        <button
          key={index}
          className={`day-button ${selectedDays[index] ? 'selected' : ''}`}
          onClick={() => toggleDay(index)}
          tabIndex="-1"
        >
          {day}
        </button>
      ))}
    </div>
  );
};

export default daySelector; 