import React, { useState, useEffect, useRef } from 'react';
import './SlideBar.css';

const SlideBar = ({
  onChange,
  label = "",
  beforeLabel = "beforeLabel",
  minValue = 0,
  maxValue = 100,
  initialValue = 0,
  ticksNumber = 21,
  specialTicks = ["0", "25", "50", "75", "100"],
  continuousSlide = false,
  bottomMargin = "20px",
  sliderColor1 = "#5ee7df",
  sliderColor2 = "#b490ca",
  colorDot = "#b490ca",
  colorRightBar = "rgb(230, 230, 230)",
  colorBorder = "rgb(230, 230, 230)",
  thumbSize = "28px",
  stepSize = 1,  // Add this new prop
}) => {
  const [value, setValue] = useState(initialValue || minValue);
  const trackRef = useRef(null);
  const thumbRef = useRef(null);

  // Adjust ticksNumber based on specialTicks
  const adjustedTicksNumber = ticksNumber !== 0 ? (specialTicks.length > 0 ? specialTicks.length * 5 + 1 : ticksNumber) : 0;

  const getStepSize = () => {
    if (ticksNumber == 0) {
      return (maxValue - minValue) / (specialTicks.length - 1);
    } else if (ticksNumber > 0) {
      return (maxValue - minValue) / (ticksNumber - 1);
    } else {
      return 1; // Default to 1 if no ticks are specified
    }
  };

  const handleChange = (event) => {
    const rawValue = parseFloat(event.target.value);
    let newValue;
    
    if (continuousSlide) {
      newValue = Math.min(Math.max(rawValue, minValue), maxValue);
    } else {
      // Calculate the number of steps
      const steps = (maxValue - minValue) / stepSize;
      
      // Round to the nearest step
      newValue = Math.round((rawValue - minValue) / stepSize) * stepSize + minValue;
    }
    
    setValue(newValue);
    if (onChange) {
      onChange(newValue);
    }
  };

  const handleIncrement = () => {
    const newValue = Math.min(value + stepSize, maxValue);
    setValue(newValue);
    if (onChange) {
      onChange(newValue);
    }
  };

  const handleDecrement = () => {
    const newValue = Math.max(value - stepSize, minValue);
    setValue(newValue);
    if (onChange) {
      onChange(newValue);
    }
  };

  useEffect(() => {
    // Set CSS variables
    document.documentElement.style.setProperty('--bottom-margin', bottomMargin);
    document.documentElement.style.setProperty('--slider-color-1', sliderColor1);
    document.documentElement.style.setProperty('--slider-color-2', sliderColor2);
    document.documentElement.style.setProperty('--color-dot', colorDot);
    document.documentElement.style.setProperty('--color-right-bar', colorRightBar);
    document.documentElement.style.setProperty('--color-border', colorBorder);
    document.documentElement.style.setProperty('--thumb-size', thumbSize);

    const updateSliderPosition = () => {
      if (trackRef.current && thumbRef.current) {
        const percentage = ((value - minValue) / (maxValue - minValue)) * 100;
        const thumbWidth = thumbRef.current.offsetWidth;
        const trackWidth = trackRef.current.offsetWidth;
        
        // Calculate max thumb position based on the width of the track
        const maxThumbPosition = trackWidth - thumbWidth;
        const thumbPosition = (percentage / 100) * maxThumbPosition;

        // Update the thumb's position, the fill's width, and the count position
        thumbRef.current.style.left = `${thumbPosition}px`;
        trackRef.current.style.setProperty('--fill-width', `${percentage+1-(percentage/100)}%`);
        trackRef.current.style.setProperty('--count-left', `${thumbPosition}px`);
      }
    };

    updateSliderPosition();
    window.addEventListener('resize', updateSliderPosition);
    return () => window.removeEventListener('resize', updateSliderPosition);
  }, [value, minValue, maxValue]);

  const renderTicks = () => {
    const ticks = [];
    const range = maxValue - minValue;
    const normalTicksNumber = adjustedTicksNumber - specialTicks.length;
    const tickStep = range / (adjustedTicksNumber - 1);

    // Generate normal ticks
    for (let i = 0; i < normalTicksNumber; i++) {
      const tickValue = minValue + i * tickStep;
      const percentage = (i / (normalTicksNumber - 1)) * 100;

      ticks.push(
        <div
          key={`tick-${tickValue}`}
          className="slide-bar-tick"
          style={{ left: `${percentage}%` }}
        />
      );
    }

    // Add special ticks
    specialTicks.forEach((specialTick, index) => {
      // Calculate tickValue by scaling it based on position in array
      let tickValue = ((range / (specialTicks.length - 1)) * index + minValue);
      
      // Override for first and last tick to ensure they're at minValue and maxValue
      if (index === 0) {
        tickValue = minValue;
      } else if (index === specialTicks.length - 1) {
        tickValue = maxValue;
      }
      
      // Only add tick if it's within the min and max range
      if (tickValue >= minValue && tickValue <= maxValue) {
        const percentage = ((tickValue - minValue) / (range)) * 100;
        ticks.push(
          <div
            key={`tick-${tickValue}`}
            className="slide-bar-tick slide-bar-tick-special"
            style={{ left: `${percentage}%`, opacity: 1, bottom: 0 }} // Ensure special ticks are always visible and at the bottom
          >
            <span className="slide-bar-tick-label">{specialTick}</span>
          </div>
        );
      }
    });
  
    return ticks;
  };

  return (
    <div className="slide-bar-container">
      {beforeLabel && <div className="slide-bar-before-label">{beforeLabel}</div>}
      {label && <div className="slide-bar-label">{label}</div>}
      <div className="slide-bar-content">
        <div className="slide-bar-icon" onClick={handleDecrement}>-</div>
        <div className="slide-bar-wrapper">
          <div className="slide-bar-track" ref={trackRef}>
            <div className="slide-bar-fill"></div>
            <div className="slide-bar-thumb" ref={thumbRef}>
              <div className="slide-bar-thumb-inner"></div>
            </div>
            <div className="slide-bar-count">{value}</div>
            <input
              type="range"
              min={minValue}
              max={maxValue}
              value={value}
              step={stepSize}
              className="slide-bar-input"
              onChange={handleChange}
            />
          </div>
          <div className="slide-bar-ticks-container">
            <div className="slide-bar-ticks">{renderTicks()}</div>
          </div>
        </div>
        <div className="slide-bar-icon" onClick={handleIncrement}>+</div>
      </div>
    </div>
  );
};

export default SlideBar;
