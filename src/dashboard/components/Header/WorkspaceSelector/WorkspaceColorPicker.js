import React, { useState, useRef, useEffect } from 'react';
import { FiCheck } from 'react-icons/fi';
import styles from './workspaceColorPicker.module.css';

const PRESET_COLORS = [
  '#2563eb',
  '#0f172a',
  '#22c55e',
  '#dc2626',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
  '#f97316',
  '#6366f1',
  '#14b8a6'
];

const WorkspaceColorPicker = ({ workspace, currentColor, onColorChange, onClose }) => {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setShowPicker(false);
        if (onClose) onClose();
      }
    };

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPicker, onClose]);

  const handleColorSelect = (color) => {
    if (onColorChange) {
      onColorChange(workspace, color);
    }
    setShowPicker(false);
    if (onClose) onClose();
  };

  return (
    <div className={styles.colorPickerContainer} ref={pickerRef}>
      <button
        className={styles.colorCircleButton}
        onClick={(e) => {
          e.stopPropagation();
          setShowPicker(!showPicker);
        }}
        style={{ backgroundColor: currentColor }}
        title="Change workspace color"
      >
        {showPicker && <FiCheck className={styles.checkIcon} />}
      </button>

      {showPicker && (
        <div className={styles.colorPicker}>
          <div className={styles.colorGrid}>
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                className={`${styles.colorOption} ${currentColor === color ? styles.selected : ''}`}
                style={{ backgroundColor: color }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleColorSelect(color);
                }}
                title={color}
              >
                {currentColor === color && <FiCheck className={styles.checkIcon} />}
              </button>
            ))}
          </div>
          <input
            type="color"
            value={currentColor}
            onChange={(e) => handleColorSelect(e.target.value)}
            className={styles.colorInput}
            title="Custom color"
          />
        </div>
      )}
    </div>
  );
};

export default WorkspaceColorPicker;

