import React, { useState, useEffect, useRef } from 'react';
import { cn } from '../../../../utils/cn';

import { FiCalendar } from 'react-icons/fi';

const CustomDateInput = ({
  value,
  onChange,
  className
}) => {
  // Parse initial value (yyyy-mm-dd) into separate parts
  const parseValue = (val) => {
    if (!val) return { day: '', month: '', year: '' };
    try {
      const date = new Date(val);
      if (isNaN(date.getTime())) return { day: '', month: '', year: '' };
      return {
        day: String(date.getDate()).padStart(2, '0'),
        month: String(date.getMonth() + 1).padStart(2, '0'),
        year: String(date.getFullYear())
      };
    } catch {
      return { day: '', month: '', year: '' };
    }
  };

  const [dateParts, setDateParts] = useState(parseValue(value));
  const dayRef = useRef(null);
  const monthRef = useRef(null);
  const yearRef = useRef(null);
  const containerRef = useRef(null);
  const hiddenInputRef = useRef(null);

  const lastValueRef = useRef(value);

  // Sync with external value changes only if the value actually changes
  useEffect(() => {
    // Check if the value is different from what we last saw
    if (value !== lastValueRef.current) {
      lastValueRef.current = value;

      const currentStr = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
      const incoming = parseValue(value);
      const incomingStr = `${incoming.year}-${incoming.month}-${incoming.day}`;

      // Only update local state if the new value is different from our current local state
      // This allows us to keep local edits (like partial years) without being reset
      // by the parent passing back the old valid value.
      if (incomingStr !== currentStr) {
        setDateParts(incoming);
      }
    }
  }, [value]);

  const emitChange = (newParts) => {
    const { day, month, year } = newParts;
    // Only emit if we have a potentially valid date (year 4 digits, others present)
    if (day && month && year && year.length === 4) {
      // Validate date object
      const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      if (!isNaN(Date.parse(dateStr))) {
        onChange(dateStr);
      }
    }
  };

  const handleFocus = (e) => {
    e.target.select();
  };

  const handleDayChange = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 2) val = val.slice(0, 2);

    const newParts = { ...dateParts, day: val };
    setDateParts(newParts);

    // Auto-switch to month if 2 chars entered
    // This handles "01" -> switch case
    if (val.length === 2) {
      monthRef.current?.focus();
    }

    emitChange(newParts);
  };

  const handleMonthChange = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 2) val = val.slice(0, 2);

    const newParts = { ...dateParts, month: val };
    setDateParts(newParts);

    // Auto-switch to year if 2 chars entered
    if (val.length === 2) {
      yearRef.current?.focus();
    }

    // Handle backspace to day if empty is handled in onKeyDown

    emitChange(newParts);
  };

  const handleYearChange = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 4) val = val.slice(0, 4);

    const newParts = { ...dateParts, year: val };
    setDateParts(newParts);
    // Year editing doesn't auto-switch forward, just emits
    emitChange(newParts);
  };

  const handleHiddenInputChange = (e) => {
    const val = e.target.value;
    if (val) {
      const newParts = parseValue(val);
      setDateParts(newParts);
      emitChange(newParts);
    }
  };

  const handleKeyDown = (e, field) => {
    // Backspace navigation
    if (e.key === 'Backspace' && e.target.value === '') {
      if (field === 'month') {
        e.preventDefault();
        dayRef.current?.focus();
      }
      if (field === 'year') {
        e.preventDefault();
        monthRef.current?.focus();
      }
    }

    // Arrow Key Navigation
    if (e.key === 'ArrowRight' && e.target.selectionStart === e.target.value.length) {
      if (field === 'day') monthRef.current?.focus();
      if (field === 'month') yearRef.current?.focus();
    }
    if (e.key === 'ArrowLeft' && e.target.selectionStart === 0) {
      if (field === 'year') monthRef.current?.focus();
      if (field === 'month') dayRef.current?.focus();
    }
  }

  // Handle focus on container to focus first input
  const handleContainerClick = (e) => {
    // Check if the click target is the container itself or the gap between inputs
    // but NOT if it's one of the inputs or the icon
    if (e.target === containerRef.current || e.target.classList.contains('flex')) {
      // Find the first empty field or focus day
      if (!dateParts.day) dayRef.current?.focus();
      else if (!dateParts.month) monthRef.current?.focus();
      else if (!dateParts.year) yearRef.current?.focus();
      else dayRef.current?.focus();
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 cursor-text relative group min-w-[180px] w-full",
        "bg-background/50 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        "border border-input rounded-md px-3 py-2", // Match inputClasses padding
        className
      )}
      style={{ height: '38px' }}
      onClick={handleContainerClick}
      ref={containerRef}
    >
      <input
        ref={dayRef}
        type="text"
        inputMode="numeric"
        placeholder="DD"
        value={dateParts.day}
        onChange={handleDayChange}
        onKeyDown={(e) => handleKeyDown(e, 'day')}
        onFocus={handleFocus}
        onClick={handleFocus}
        className="w-[28px] bg-transparent border-none p-0 text-center focus:outline-none focus:ring-0 placeholder:text-muted-foreground/50 text-sm font-medium"
        maxLength={2}
      />
      <span className="text-muted-foreground/40 select-none">/</span>
      <input
        ref={monthRef}
        type="text"
        inputMode="numeric"
        placeholder="MM"
        value={dateParts.month}
        onChange={handleMonthChange}
        onKeyDown={(e) => handleKeyDown(e, 'month')}
        onFocus={handleFocus}
        onClick={handleFocus}
        className="w-[28px] bg-transparent border-none p-0 text-center focus:outline-none focus:ring-0 placeholder:text-muted-foreground/50 text-sm font-medium"
        maxLength={2}
      />
      <span className="text-muted-foreground/40 select-none">/</span>
      <input
        ref={yearRef}
        type="text"
        inputMode="numeric"
        placeholder="YYYY"
        value={dateParts.year}
        onChange={handleYearChange}
        onKeyDown={(e) => handleKeyDown(e, 'year')}
        onFocus={handleFocus}
        onClick={handleFocus}
        className="w-[42px] bg-transparent border-none p-0 text-center focus:outline-none focus:ring-0 placeholder:text-muted-foreground/50 text-sm font-medium"
        maxLength={4}
      />

      {/* Calendar Icon & Hidden Input */}
      <div className="ml-auto pl-2 flex items-center border-l border-border h-5">
        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            try {
              hiddenInputRef.current?.showPicker();
            } catch (err) {
              console.warn('showPicker not supported', err);
              // Fallback: try to focus/click? 
              // Usually showPicker is the only way to open native picker programmatically securely
            }
          }}
          className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer outline-none focus:text-foreground p-0.5"
          title="Open calendar"
        >
          <FiCalendar size={16} />
        </button>
        <input
          ref={hiddenInputRef}
          type="date"
          className="w-0 h-0 opacity-0 absolute bottom-0 right-0 pointer-events-none"
          tabIndex={-1}
          value={value || ''}
          onChange={handleHiddenInputChange}
        />
      </div>
    </div>
  );
};

export default CustomDateInput;
