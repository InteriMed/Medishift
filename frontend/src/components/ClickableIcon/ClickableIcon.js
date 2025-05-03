import React, { useState, useEffect, useRef } from 'react';
import './ClickableIcon.css';

const ClickableIcon = ({ icon, alt, onClick, isSelected, onNavigate, text }) => {
  const [ripple, setRipple] = useState(null);
  const iconRef = useRef(null);

  useEffect(() => {
    if (ripple) {
      const timer = setTimeout(() => {
        setRipple(null);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [ripple]);

  const handleClick = (e) => {
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setRipple({ x, y });
      onClick();
      if (onNavigate) {
        onNavigate();
      }
      // Add a class to change the background color
      iconRef.current.classList.add('ripple-active');
      setTimeout(() => {
        if (iconRef.current) {
          iconRef.current.classList.remove('ripple-active');
        }
      }, 1000);
    }
  };

  return (
    <div 
      ref={iconRef}
      className={`clickable-icon ${isSelected ? 'selected' : ''}`} 
      onClick={handleClick}
    >
      <div className="icon-container">
        <img src={icon} alt={alt} />
        {ripple && (
          <span
            className="ripple"
            style={{
              left: ripple.x,
              top: ripple.y,
            }}
          />
        )}
      </div>
      <p>{text}</p>
    </div>
  );
};

export default ClickableIcon;
