import React from 'react';
import { FaInfoCircle } from 'react-icons/fa'; // Using a standard info icon
import './styles/boxedInputFields.css';

const Hint = ({ text, xPos = '50%', yPos = '125%', arrowPosition = 'bottom', marginUp = '0px', marginDown = '0px', width = '200px', textAlign = 'left', variant = 'info' }) => {
  // Calculate margin-left dynamically based on xPos if it's a percentage
  const marginLeft = xPos.endsWith('%') ? `-${parseFloat(xPos) / 2}%` : '0';

  const tooltipStyle = {
    left: xPos,
    bottom: yPos,
    marginLeft: marginLeft,
    marginTop: marginUp,
    marginBottom: marginDown,
    textAlign: textAlign,
    width: width,
  };

  return (
    <div className="hint-container"
      style={{
        marginTop: marginUp,
        marginBottom: marginDown,
      }}
    >

      <FaInfoCircle className={`hint-icon ${variant === 'danger' ? 'hint-icon-danger' : ''}`} />
      <span
        className={`hint-tooltip ${variant === 'danger' ? 'hint-tooltip-danger' : ''}`}
        style={tooltipStyle}
        data-arrow-position={arrowPosition}
      >
        {text}
      </span>
    </div>
  );
};

export default Hint;
