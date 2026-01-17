import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { cn } from '../../../../utils/cn';
import { CALENDAR_COLORS } from '../utils/constants';

/**
 * Event Context Menu Component
 * 
 * Shows on right-click with:
 * - Delete button
 * - Color picker
 */
const EventContextMenu = ({
    event,
    position,
    onClose,
    onDelete,
    onColorChange,
    colorOptions = CALENDAR_COLORS
}) => {
    const { t } = useTranslation();
    const menuRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose();
            }
        };

        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    // Adjust position to keep menu in viewport
    const [adjustedPosition, setAdjustedPosition] = useState(position);

    useEffect(() => {
        if (menuRef.current) {
            const rect = menuRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let newX = position.x;
            let newY = position.y;

            if (position.x + rect.width > viewportWidth) {
                newX = viewportWidth - rect.width - 10;
            }

            if (position.y + rect.height > viewportHeight) {
                newY = viewportHeight - rect.height - 10;
            }

            setAdjustedPosition({ x: newX, y: newY });
        }
    }, [position]);

    const handleDelete = () => {
        onDelete?.(event);
        onClose();
    };

    const handleColorSelect = (color) => {
        onColorChange?.(event, color);
        onClose();
    };

    return (
        <div
            ref={menuRef}
            className={cn(
                "fixed z-40 min-w-[180px] rounded-lg shadow-xl",
                "bg-card/95 backdrop-blur-md border border-border/60",
                "py-2 animate-in fade-in zoom-in-95 duration-150"
            )}
            style={{
                left: `${adjustedPosition.x}px`,
                top: `${adjustedPosition.y}px`,
            }}
        >
            {/* Event Title Header */}
            <div className="px-3 py-2 border-b border-border/40">
                <span className="text-sm font-medium text-foreground truncate block">
                    {event.title || t('calendar:noTitle')}
                </span>
                <span className="text-xs text-muted-foreground">
                    {new Date(event.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    {' - '}
                    {new Date(event.end).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </span>
            </div>

            {/* Color Picker */}
            <div className="px-3 py-2 border-b border-border/40">
                <span className="text-xs text-muted-foreground mb-2 block">{t('calendar:color')}</span>
                <div className="flex gap-1.5 flex-wrap">
                    {colorOptions.map((colorOption) => (
                        <button
                            key={colorOption.id || colorOption.color}
                            className={cn(
                                "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110",
                                event.color === colorOption.color
                                    ? "border-white shadow-md ring-2 ring-offset-1 ring-offset-card"
                                    : "border-transparent"
                            )}
                            style={{
                                backgroundColor: colorOption.color,
                                ringColor: colorOption.color,
                            }}
                            onClick={() => handleColorSelect(colorOption)}
                            title={colorOption.name || colorOption.color}
                        />
                    ))}
                </div>
            </div>

            {/* Delete Button */}
            <div className="px-2 pt-2">
                <button
                    className={cn(
                        "w-full px-3 py-2 rounded-md text-sm font-medium",
                        "flex items-center gap-2",
                        "text-red-500 hover:bg-red-500/10 transition-colors"
                    )}
                    onClick={handleDelete}
                >
                    <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                    </svg>
                    {t('calendar:deleteEventAction')}
                </button>
            </div>
        </div>
    );
};

EventContextMenu.propTypes = {
    event: PropTypes.object.isRequired,
    position: PropTypes.shape({
        x: PropTypes.number.isRequired,
        y: PropTypes.number.isRequired
    }).isRequired,
    onClose: PropTypes.func.isRequired,
    onDelete: PropTypes.func,
    onColorChange: PropTypes.func,
    colorOptions: PropTypes.array
};

export default EventContextMenu;
