import React, { useState, useRef, useEffect } from 'react';
import { FiX } from 'react-icons/fi';
import { HexColorPicker } from 'react-colorful';
import { CALENDAR_COLORS } from '../../pages/calendar/utils/constants';
import { cn } from '../../../utils/cn';

const ColorPicker = ({ 
  color, 
  color1, 
  onChange, 
  size = 32,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customColor, setCustomColor] = useState(color || CALENDAR_COLORS[0].color);
  const [brightness, setBrightness] = useState(100);
  const pickerRef = useRef(null);
  const buttonRef = useRef(null);
  const popupRef = useRef(null);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const [showPopup, setShowPopup] = useState(false);
  const positionTimeoutRef = useRef(null);

  useEffect(() => {
    if (color) {
      setCustomColor(color);
    }
  }, [color]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        pickerRef.current && 
        popupRef.current &&
        !pickerRef.current.contains(event.target) &&
        !popupRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setShowPopup(false);
      }
    };

    if (isOpen && showPopup) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, showPopup]);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const calculatePosition = () => {
        const buttonRect = buttonRef.current.getBoundingClientRect();
        const popupHeight = 450;
        const popupWidth = 320;
        const spaceBelow = window.innerHeight - buttonRect.bottom;
        const spaceAbove = buttonRect.top;
        
        let top = buttonRect.bottom + window.scrollY + 8;
        let left = buttonRect.left + window.scrollX + (buttonRect.width / 2) - (popupWidth / 2);
        
        if (spaceBelow < popupHeight && spaceAbove > spaceBelow) {
          top = buttonRect.top + window.scrollY - popupHeight - 8;
        }
        
        if (left < 8) left = 8;
        if (left + popupWidth > window.innerWidth - 8) {
          left = window.innerWidth - popupWidth - 8;
        }
        
        setPopupPosition({ top, left });
        
        positionTimeoutRef.current = setTimeout(() => {
          setShowPopup(true);
        }, 100);
      };
      
      setShowPopup(false);
      calculatePosition();
      
      return () => {
        if (positionTimeoutRef.current) {
          clearTimeout(positionTimeoutRef.current);
        }
      };
    } else {
      setShowPopup(false);
    }
  }, [isOpen]);

  const adjustBrightness = (hex, percent) => {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.floor((num >> 16) * (percent / 100)));
    const g = Math.min(255, Math.floor(((num >> 8) & 0x00FF) * (percent / 100)));
    const b = Math.min(255, Math.floor((num & 0x0000FF) * (percent / 100)));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  };

  const handlePresetColorClick = (colorOption) => {
    const newColor = colorOption.color;
    const newColor1 = colorOption.color1;
    setCustomColor(newColor);
    onChange(newColor, newColor1);
    setIsOpen(false);
    setShowPopup(false);
  };

  const handleColorChange = (newColor) => {
    setCustomColor(newColor);
    const adjustedColor1 = adjustBrightness(newColor, brightness);
    onChange(newColor, adjustedColor1);
  };

  const handleBrightnessChange = (e) => {
    const newBrightness = parseInt(e.target.value);
    setBrightness(newBrightness);
    const adjustedColor1 = adjustBrightness(customColor, newBrightness);
    onChange(customColor, adjustedColor1);
  };

  const displayColor = color1 || color || CALENDAR_COLORS[0].color1;

  return (
    <>
      <div className={cn("relative", className)} ref={pickerRef}>
        <button
          ref={buttonRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (isOpen) {
              setIsOpen(false);
              setShowPopup(false);
            } else {
              setIsOpen(true);
            }
          }}
          className="rounded-full border-2 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2"
          style={{
            width: `${size}px`,
            height: `${size}px`,
            backgroundColor: displayColor,
            borderColor: 'rgba(37, 99, 235, 0.3)',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
          }}
          aria-label="Select color"
        />
      </div>

      {isOpen && showPopup && (
        <div 
          ref={popupRef}
          className="fixed p-4 bg-white rounded-xl shadow-2xl border border-border"
          style={{ 
            width: '320px',
            top: `${popupPosition.top}px`,
            left: `${popupPosition.left}px`,
            maxHeight: '90vh',
            overflowY: 'auto',
            zIndex: 'var(--z-index-popup, 11000)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-foreground">Select Color</h4>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                setShowPopup(false);
              }}
              className="p-1 hover:bg-muted rounded transition-colors"
              aria-label="Close"
            >
              <FiX className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                Preset Colors
              </label>
              <div className="flex gap-2 flex-wrap">
                {CALENDAR_COLORS.map((colorOption) => {
                  const isSelected = color === colorOption.color;
                  return (
                    <button
                      key={colorOption.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePresetColorClick(colorOption);
                      }}
                      className={cn(
                        "w-8 h-8 rounded-full border-2 transition-all hover:scale-110",
                        isSelected ? '' : 'border-transparent'
                      )}
                      style={{
                        backgroundColor: colorOption.color1 || colorOption.color,
                        borderColor: isSelected ? 'var(--color-logo-1)' : 'transparent',
                        boxShadow: isSelected ? '0 0 0 2px var(--color-logo-1), 0 0 0 4px rgba(37, 99, 235, 0.1)' : 'none'
                      }}
                      title={colorOption.name}
                      aria-label={colorOption.name}
                    />
                  );
                })}
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                Custom Color
              </label>
              <div className="space-y-3">
                <div className="flex justify-center">
                  <HexColorPicker
                    color={customColor}
                    onChange={handleColorChange}
                    style={{ width: '100%' }}
                  />
                </div>
                
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={customColor}
                    onChange={(e) => {
                      const newColor = e.target.value;
                      if (/^#[0-9A-F]{6}$/i.test(newColor)) {
                        handleColorChange(newColor);
                      }
                    }}
                    className="flex-1 px-2 py-1 text-sm border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="#000000"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">
                    Brightness: {brightness}%
                  </label>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    value={brightness}
                    onChange={handleBrightnessChange}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, ${adjustBrightness(customColor, 20)} 0%, ${adjustBrightness(customColor, 100)} 100%)`
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="mt-1 text-xs text-muted-foreground">
                    Preview: <span style={{ color: adjustBrightness(customColor, brightness) }}>●</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ColorPicker;
