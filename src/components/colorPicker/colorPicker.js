import React, { useState, useRef, useEffect } from 'react';
import { FiCheck } from 'react-icons/fi';
import { HexColorPicker } from 'react-colorful';
import { cn } from '../../services/utils/formatting';

const PRESET_COLORS = [
  { id: 'logo-1', name: 'Logo 1', color: '#2563eb', color1: '#2563eb' },
  { id: 'logo-2', name: 'Logo 2', color: '#0f172a', color1: '#0f172a' },
  { id: 'green', name: 'Green', color: '#16a34a', color1: '#16a34a' },
  { id: 'purple', name: 'Purple', color: '#9333ea', color1: '#9333ea' },
  { id: 'pink', name: 'Pink', color: '#db2777', color1: '#db2777' }
];

const ColorPicker = ({ 
  color, 
  color1, 
  onChange, 
  size = 20,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customColor, setCustomColor] = useState(color || PRESET_COLORS[0].color);
  const [displayColor, setDisplayColor] = useState(color || PRESET_COLORS[0].color);
  const pickerRef = useRef(null);
  const buttonRef = useRef(null);
  const popupRef = useRef(null);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const [showPopup, setShowPopup] = useState(false);
  const positionTimeoutRef = useRef(null);

  useEffect(() => {
    const currentColor = color || PRESET_COLORS[0].color;
    setCustomColor(currentColor);
    setDisplayColor(currentColor);
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
        const popupHeight = 280;
        const popupWidth = 224;
        const spaceBelow = window.innerHeight - buttonRect.bottom;
        const spaceAbove = buttonRect.top;
        
        const isInModal = buttonRef.current.closest('[role="modal"]') !== null;
        
        let top = buttonRect.bottom + window.scrollY + 6;
        let left;
        
        if (isInModal) {
          left = buttonRect.left + window.scrollX + (buttonRect.width / 2) - (popupWidth / 2);
        } else {
          left = buttonRect.right + window.scrollX - popupWidth;
        }
        
        if (spaceBelow < popupHeight && spaceAbove > spaceBelow) {
          top = buttonRect.top + window.scrollY - popupHeight - 6;
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
      
      const handleResize = () => {
        calculatePosition();
      };
      
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', calculatePosition, true);
      
      return () => {
        if (positionTimeoutRef.current) {
          clearTimeout(positionTimeoutRef.current);
        }
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', calculatePosition, true);
      };
    } else {
      setShowPopup(false);
    }
  }, [isOpen]);

  const handlePresetColorClick = (colorOption) => {
    const newColor = colorOption.color;
    const newColor1 = colorOption.color1;
    setCustomColor(newColor);
    setDisplayColor(newColor);
    onChange(newColor, newColor1);
    setIsOpen(false);
    setShowPopup(false);
  };

  const handleColorChange = (newColor) => {
    setCustomColor(newColor);
    setDisplayColor(newColor);
    onChange(newColor, newColor);
  };

  const buttonDisplayColor = color1 || color || PRESET_COLORS[0].color1;

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
          className="rounded-md transition-all hover:bg-white/5 flex items-center justify-center"
          style={{
            width: `${size}px`,
            height: `${size}px`,
            border: '2px solid var(--boxed-inputfield-border-color, #e2e8f0)',
            backgroundColor: buttonDisplayColor,
            borderRadius: 'var(--boxed-inputfield-radius, 12px)'
          }}
          aria-label="Select color"
        />
      </div>

      {isOpen && showPopup && (
        <div 
          ref={popupRef}
          className="fixed bg-card rounded-lg border border-border/50 shadow-lg animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
          style={{ 
            width: '224px',
            top: `${popupPosition.top}px`,
            left: `${popupPosition.left}px`,
            zIndex: 200001,
            backgroundColor: 'var(--background-div-color, #ffffff)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-1">
            <div className="px-3 py-2 mb-1">
              <div className="text-xs font-medium text-muted-foreground mb-2">Preset Colors</div>
              <div className="flex gap-1.5 flex-wrap">
                {PRESET_COLORS.map((colorOption) => {
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
                        "w-6 h-6 rounded-md border-2 transition-all",
                        isSelected ? 'border-primary' : 'border-transparent hover:border-border'
                      )}
                      style={{
                        backgroundColor: colorOption.color1 || colorOption.color
                      }}
                      title={colorOption.name}
                      aria-label={colorOption.name}
                    >
                      {isSelected && <FiCheck className="w-3 h-3 text-white m-auto" strokeWidth={2} style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }} />}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="border-t border-border/50 pt-2 px-3 pb-2">
              <div className="text-xs font-medium text-muted-foreground mb-2">Custom Color</div>
              <div className="space-y-2">
                <input
                  type="text"
                  value={displayColor || color || PRESET_COLORS[0].color}
                  onChange={(e) => {
                    const newColor = e.target.value;
                    setDisplayColor(newColor);
                    if (/^#[0-9A-F]{6}$/i.test(newColor)) {
                      handleColorChange(newColor);
                    }
                  }}
                  onBlur={(e) => {
                    const newColor = e.target.value;
                    if (!/^#[0-9A-F]{6}$/i.test(newColor)) {
                      const validColor = color || PRESET_COLORS[0].color;
                      setDisplayColor(validColor);
                      setCustomColor(validColor);
                    }
                  }}
                  className="w-full px-2 py-1 text-xs border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary mb-2 text-foreground"
                  placeholder="#000000"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex justify-center">
                  <HexColorPicker
                    color={customColor}
                    onChange={handleColorChange}
                    style={{ width: '100%', height: '120px' }}
                  />
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
