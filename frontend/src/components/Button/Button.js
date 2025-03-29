import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Button.module.css';

const Button = ({ text, color, textColor, focusColor, width, height, onClick, borderColor, to }) => {
  const navigate = useNavigate();
  
  const handleClick = (e) => {
    if (to) {
      navigate(to);
    }
    if (onClick) {
      onClick(e);
    }
  };

  const buttonStyle = {
    backgroundColor: color,
    color: textColor,
    width: width,
    height: height,
    '--button-focus-color': focusColor,
    '--button-border-color': borderColor,
  };

  return (
    <button className={styles.customButton} style={buttonStyle} onClick={handleClick}>
      {text}
    </button>
  );
};

export default Button;
