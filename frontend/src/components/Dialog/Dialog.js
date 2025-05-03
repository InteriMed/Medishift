import React, { useState, useEffect, useCallback } from 'react';
import './Dialog.css';

const Dialog = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  actions,
  size = 'medium',
  closeOnEscape = true,
  closeOnBackdropClick = true
}) => {
  const [isVisible, setIsVisible] = useState(isOpen);

  // Handle dialog visibility
  useEffect(() => {
    setIsVisible(isOpen);
    
    // When dialog opens, prevent body scroll
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    // Cleanup
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle escape key press
  const handleKeyDown = useCallback((e) => {
    if (closeOnEscape && e.key === 'Escape' && isVisible) {
      onClose();
    }
  }, [closeOnEscape, isVisible, onClose]);

  // Add keyboard event listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  // Don't render if not open
  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className={`dialog-backdrop ${isVisible ? 'visible' : ''}`}
      onClick={handleBackdropClick}
    >
      <div className={`dialog dialog-${size} ${isVisible ? 'visible' : ''}`}>
        {title && (
          <div className="dialog-header">
            <h3 className="dialog-title">{title}</h3>
            <button className="dialog-close" onClick={onClose}>&times;</button>
          </div>
        )}
        
        <div className="dialog-content">
          {children}
        </div>
        
        {actions && (
          <div className="dialog-actions">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dialog; 