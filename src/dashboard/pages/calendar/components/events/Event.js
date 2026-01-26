import React, { useState, useRef, useCallback } from 'react';
import { cn } from '../../../../../utils/cn';

/**
 * Event Component
 * 
 * Handles display and interaction of calendar events.
 * 
 * Interactions:
 * - Click: Opens event details panel
 * - Right Click: Opens context menu
 * - Drag: Moves event vertically (15-min increments, same day only)
 * - Resize: Drag top/bottom edges to adjust duration
 */
const Event = ({
  id,
  start,
  end,
  title,
  color,
  color1,
  isSelected,
  isMultiDay,
  isFirstDay,
  isLastDay,
  isRecurring = false,
  notes,
  location,
  employees,
  style,
  overlapInfo,
  currentDate,
  isOverlapping = false,
  isDraft = false,
  // Interaction handlers
  onMouseDown,
  onRightClick,
  onClick,
}) => {
  // Hover state for resize handles
  const [isHovered, setIsHovered] = useState(false);
  const eventRef = useRef(null);

  // Helper to ensure Date objects
  const startDate = start instanceof Date ? start : new Date(start);
  const endDate = end instanceof Date ? end : new Date(end);

  // Calculate event height in pixels (for showing/hiding content)
  const heightValue = style?.height ? parseInt(style.height) : 60;
  const isCompact = heightValue < 35;
  const isVeryCompact = heightValue < 25;

  // Color logic
  const hexToRgba = (hex, opacity) => {
    if (!hex) return `rgba(0, 0, 0, ${opacity})`;
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
      r = parseInt(hex.substring(1, 3), 16);
      g = parseInt(hex.substring(3, 5), 16);
      b = parseInt(hex.substring(5, 7), 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  const baseColor = color || '#2563eb'; // Blue fallback
  const bgColor = isDraft ? hexToRgba(baseColor, 0.25) : hexToRgba(baseColor, 0.15);
  const borderColor = baseColor;
  const textColor = baseColor;

  // Handle mouse down - pass to parent handler with type
  const handleMouseDown = useCallback((e, type = 'move') => {
    e.stopPropagation();
    onMouseDown?.(e, { id, start, end, title, color, color1, notes, location, employees, isRecurring }, type);
  }, [id, start, end, title, color, color1, notes, location, employees, isRecurring, onMouseDown]);

  // Handle right click
  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    onRightClick?.(e, { id, start, end, title, color, color1, notes, location, employees, isRecurring });
  }, [id, start, end, title, color, color1, notes, location, employees, isRecurring, onRightClick]);

  // Handle click (will be checked in parent if there was drag)
  const handleClick = useCallback((e) => {
    e.stopPropagation();
    onClick?.({ id, start, end, title, color, color1, notes, location, employees, isRecurring }, e);
  }, [id, start, end, title, color, color1, notes, location, employees, isRecurring, onClick]);

  // Use passed style or fallback
  const positionStyle = style || { display: 'none' };

  return (
    <div
      ref={eventRef}
      data-event-id={id}
      className={cn(
        "absolute rounded-md transition-shadow select-none overflow-hidden group",
        "cursor-grab",
        isSelected && "ring-2 ring-offset-1 ring-primary",
        isOverlapping && "opacity-90",
        isDraft && "opacity-70 border-dashed"
      )}
      style={{
        ...positionStyle,
        backgroundColor: bgColor,
        borderLeft: `3px solid ${borderColor}`,
        boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
        zIndex: isSelected ? 30 : (isHovered ? 20 : 10),
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={(e) => handleMouseDown(e, 'move')}
      onContextMenu={handleContextMenu}
      onClick={handleClick}
    >
      {/* Top Resize Handle */}
      {(!isMultiDay || isFirstDay) && (
        <div
          className={cn(
            "absolute top-0 left-0 right-0 h-2 cursor-ns-resize",
            "bg-transparent hover:bg-white/30 transition-colors",
            isHovered ? "opacity-100" : "opacity-0"
          )}
          style={{ zIndex: 40 }}
          onMouseDown={(e) => {
            e.stopPropagation();
            handleMouseDown(e, 'resize-top');
          }}
        />
      )}

      {/* Event Content */}
      <div className="flex flex-col h-full w-full px-2 py-1 text-xs leading-tight min-h-[0px] relative">
        {/* Title - Always show */}
        <span
          className="font-semibold truncate"
          style={{ fontSize: '16px', color: textColor }}
        >
          {title || (isDraft ? 'New Event' : '(No Title)')}
        </span>

        {/* Time - Hide if very compact */}
        {!isVeryCompact && (
          <span
            className="text-[10px] opacity-80 truncate"
            style={{ color: textColor }}
          >
            {startDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            {!isCompact && ` - ${endDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`}
          </span>
        )}

        {/* Location - Only if enough space */}
        {!isCompact && location && (
          <span
            className="text-[10px] opacity-70 truncate mt-0.5"
            style={{ color: textColor }}
          >
            📍 {location}
          </span>
        )}
      </div>

      {/* Recurring Indicator */}
      {isRecurring && (
        <div
          className="absolute top-1 right-1 text-[8px] opacity-60"
          style={{ color: textColor }}
        >
          <i className="fas fa-redo-alt" />
        </div>
      )}

      {/* Bottom Resize Handle */}
      {(!isMultiDay || isLastDay) && (
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize",
            "bg-transparent hover:bg-white/30 transition-colors",
            isHovered ? "opacity-100" : "opacity-0"
          )}
          style={{ zIndex: 40 }}
          onMouseDown={(e) => {
            e.stopPropagation();
            handleMouseDown(e, 'resize-bottom');
          }}
        />
      )}
    </div>
  );
};

export default Event;
