import React, { useEffect, useRef } from 'react';
import './dialogbox.css';

/**
 * A generic dialog box component.
 * 
 * @param {Object} props - Component props.
 * @param {string} props.title - The title of the dialog.
 * @param {string} props.message - The main message/content of the dialog.
 * @param {Array<Object>} props.buttons - Array of button objects.
 *   Each button object should have:
 *   - {string} text: The text displayed on the button.
 *   - {function} onClick: The function called when the button is clicked.
 *   - {string} [className]: Optional additional CSS class for the button.
 * @param {function} props.onClose - Function called when the dialog should close (e.g., click outside).
 */
const DialogBox = ({ title, message, buttons = [], onClose }) => {
  const dialogRef = useRef(null);

  // Log props for debugging
  console.log('DIALOG BOX RENDERED with props:', { 
    title, 
    message, 
    buttonCount: buttons.length,
    buttonTypes: buttons.map(b => ({
      text: b.text,
      hasOnClick: typeof b.onClick === 'function',
      className: b.className
    }))
  });

  // Handle clicks outside the dialog to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target)) {
        onClose(); // Call the onClose prop when clicking outside
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleButtonClick = (button, index) => {
    // Call the handler if it exists
    if (typeof button.onClick === 'function') {
      button.onClick();
    }
    
    // Unless specified otherwise, close the dialog after clicking
    if (button.keepOpen !== true) {
      onClose();
    }
  };

  return (
    <div className="dialog-overlay"> 
      <div ref={dialogRef} className="dialog-box">
        {title && <h3>{title}</h3>}
        {message && <p>{message}</p>}
        <div className="dialog-actions">
          {buttons.map((button, index) => (
            <button
              key={index}
              className={`dialog-button ${button.className || ''}`.trim()} // Apply base and custom class
              onClick={() => handleButtonClick(button, index)}
            >
              {button.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DialogBox;
