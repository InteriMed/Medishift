import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GrFormPrevious } from "react-icons/gr";
import { MdNavigateNext } from "react-icons/md";
import './NavigationBar.css';

const NavigationBar = ({
  zIndex,
  currentPage,
  totalPages,
  onPrevious,
  onNext,
  onDotClick,
  isMobile,
  dotActiveColor = '#000000',
  dotInactiveColor = '#e0e0e0',
  dotBorderColor = '#000000',
  dotBorderWidth = '0',
  maxWidth = '533px',
  hidePrevious = false, // New prop to hide previous button
  hideNext = false, // New prop to hide next button
  isFixed = true, // Change default to true
  isNotEmployed = false, // Add this new prop
}) => {
  const { lang } = useParams();
  const navigate = useNavigate();
  const [isNavigating, setIsNavigating] = useState(false);
  const [isNextHidden, setIsNextHidden] = useState(hideNext);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);

  useEffect(() => {
    document.documentElement.style.setProperty('--max-content-width', maxWidth);
    document.documentElement.style.setProperty('--nav-position', isFixed ? 'fixed' : 'static');

    if (!hideNext && isNextHidden) {
      setIsNextHidden(false);
    } else if (hideNext && !isNextHidden) {
      setIsNextHidden(true);
    }
  }, [maxWidth, hideNext, isNextHidden, isFixed]);

  const handleNavigation = (direction) => {
    if (isNavigating || isButtonDisabled) return;

    setIsButtonDisabled(true);
    setIsNavigating(true);
    
    if (direction === 'prev') {
      onPrevious(lang);
    } else {
      onNext(lang);
    }

    setTimeout(() => {
      setIsNavigating(false);
      setIsButtonDisabled(false);
    }, 1000);
  };

  const handleDotClick = (page) => {
    if (!isNotEmployed && page <= currentPage && page !== currentPage) {
      onDotClick(page, lang);
    }
  };

  return (
    <div className={`navigation-bar ${isFixed ? 'fixed' : ''}`} style={{ zIndex }}>
      <button 
        className={`nav-button ${hidePrevious ? 'hidden' : ''}`}
        onClick={() => handleNavigation('prev')} 
        disabled={currentPage === 1 || isNavigating || isButtonDisabled}
        style={{ zIndex }}
      >
        <GrFormPrevious />
        {!isMobile && <span>Previous</span>}
      </button>
      <div className="pagination" style={{ zIndex }}>
        {[...Array(totalPages)].map((_, index) => (
          <span 
            key={index} 
            className={`dot ${index + 1 <= currentPage ? "active-dot" : ""} ${!isNotEmployed && index + 1 <= currentPage ? "clickable" : "non-clickable"}`}
            onClick={() => handleDotClick(index + 1)}
            style={{
              backgroundColor: index + 1 <= currentPage ? dotActiveColor : dotInactiveColor,
              border: `${dotBorderWidth} solid ${dotBorderColor}`,
              zIndex,
            }}
          ></span>
        ))}
      </div>
      <button 
        className={`nav-button ${isNextHidden ? 'hidden' : ''}`}
        onClick={() => handleNavigation('next')} 
        disabled={currentPage === totalPages || isNavigating || isButtonDisabled}
        style={{ zIndex }}
      >
        {!isMobile && <span>Next</span>}
        <MdNavigateNext />
      </button>
    </div>
  );
};

export default NavigationBar;
