import React from 'react';
import styles from './colorPicker.module.css';

const ColorPicker = ({ colors, selectedColor, onSelect }) => {
  return (
    <div className={styles.colorPickerContainer}>
      {colors.map((colorObj, index) => (
        <button
          key={index}
          className={`${styles.colorOption} ${colorObj.color === selectedColor ? styles.selected : ''}`}
          style={{ backgroundColor: colorObj.color }}
          onClick={() => onSelect(colorObj)}
          type="button"
          aria-label={`Select ${colorObj.name} color`}
        />
      ))}
    </div>
  );
};

export default ColorPicker; 