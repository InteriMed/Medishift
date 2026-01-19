import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn';
import { FiX } from 'react-icons/fi';

const Dialog = ({
  isOpen,
  onClose,
  title,
  children,
  actions,
  size = 'medium',
  closeOnEscape = true,
  closeOnBackdropClick = true,
  messageType
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      // Small delay to trigger entrance animation
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
      document.body.style.overflow = 'hidden';
    } else {
      setIsVisible(false);
      // Wait for exit animation before removing from DOM
      const timer = setTimeout(() => {
        setIsAnimating(false);
        document.body.style.overflow = '';
      }, 300);
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  const handleKeyDown = useCallback((e) => {
    if (closeOnEscape && e.key === 'Escape' && isOpen) onClose();
  }, [closeOnEscape, isOpen, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleBackdropClick = (e) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) onClose();
  };

  if (!isOpen && !isAnimating) return null;

  const sizeClasses = {
    small: 'max-w-md',
    medium: 'max-w-xl',
    large: 'max-w-3xl',
    full: 'max-w-[95vw]'
  };

  const headerColorClasses = {
    warning: '',
    error: '',
    success: '',
    info: '',
    default: ''
  };

  const headerColorStyles = {
    warning: {
      color: 'var(--red-4)',
      background: 'var(--red-1)',
      borderColor: 'var(--red-2)'
    },
    error: {
      color: 'var(--red-4)',
      background: 'var(--red-1)',
      borderColor: 'var(--red-2)'
    },
    success: {
      color: 'var(--green-4)',
      background: 'var(--green-1)',
      borderColor: 'var(--green-3)'
    },
    info: {
      color: 'hsl(var(--primary))',
      background: 'hsl(var(--primary) / 0.1)',
      borderColor: 'hsl(var(--primary) / 0.3)'
    },
    default: {}
  };

  const contentColorStyles = {
    warning: {
      color: 'var(--red-4)'
    },
    error: {
      color: 'var(--red-4)'
    },
    success: {
      color: 'var(--green-4)'
    },
    info: {
      color: 'hsl(var(--primary))'
    },
    default: {}
  };

  const textBoxStyles = {
    warning: {
      backgroundColor: 'var(--red-1)',
      borderColor: 'var(--red-2)',
      color: 'var(--red-4)'
    },
    error: {
      backgroundColor: 'var(--red-1)',
      borderColor: 'var(--red-2)',
      color: 'var(--red-4)'
    },
    success: {
      backgroundColor: 'var(--green-1)',
      borderColor: 'var(--green-3)',
      color: 'var(--green-4)'
    },
    info: {
      backgroundColor: 'hsl(var(--primary) / 0.1)',
      borderColor: 'hsl(var(--primary) / 0.3)',
      color: 'hsl(var(--primary))'
    },
    default: {}
  };

  const currentHeaderClass = messageType ? headerColorClasses[messageType] : headerColorClasses.default;
  const currentHeaderStyle = messageType ? headerColorStyles[messageType] : headerColorStyles.default;
  const currentContentStyle = messageType ? contentColorStyles[messageType] : contentColorStyles.default;


  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[200000] flex items-center justify-center p-4 transition-all duration-300",
        isVisible ? "opacity-100" : "opacity-0"
      )}
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: isVisible ? 'blur(8px)' : 'blur(0px)',
        WebkitBackdropFilter: isVisible ? 'blur(8px)' : 'blur(0px)'
      }}
      onClick={handleBackdropClick}
    >
      <div
        className={cn(
          "bg-card w-full rounded-2xl overflow-hidden flex flex-col relative transform transition-all duration-300",
          sizeClasses[size],
          isVisible ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 translate-y-4"
        )}
        style={{
          boxShadow: 'var(--shadow-2xl)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          willChange: 'transform, opacity'
        }}
      >
        {/* Gradient overlay for depth */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            background: 'radial-gradient(circle at top right, hsl(var(--primary) / 0.1) 0%, transparent 70%)'
          }}
        />

        {title && (
          <div
            className={cn(
              "flex items-center justify-between px-6 py-5 border-b relative z-10 transition-all duration-300",
              currentHeaderClass
            )}
            style={{
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              ...currentHeaderStyle
            }}
          >
            <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-black/10 active:bg-black/15 transition-all duration-200 text-current opacity-70 hover:opacity-100 hover:scale-110"
              style={{
                transform: 'scale(1)',
                transition: 'all 0.2s var(--ease-smooth)'
              }}
            >
              <FiX size={20} />
            </button>
          </div>
        )}

        <div
          className="p-6 leading-relaxed relative z-10 overflow-y-auto max-h-[70vh] custom-scrollbar"
          style={currentContentStyle}
        >
          {children}
        </div>

        {actions && (
          <div
            className="px-6 py-4 border-t border-border/50 flex justify-end gap-3 relative z-10 backdrop-blur-sm"
            style={{
              background: 'linear-gradient(to top, rgba(255, 255, 255, 0.5), transparent)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)'
            }}
          >
            {actions}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export const getTextBoxStyles = (messageType) => {
  const textBoxStyles = {
    warning: {
      backgroundColor: 'var(--red-1)',
      borderColor: 'var(--red-2)',
      color: 'var(--red-4)'
    },
    error: {
      backgroundColor: 'var(--red-1)',
      borderColor: 'var(--red-2)',
      color: 'var(--red-4)'
    },
    success: {
      backgroundColor: 'var(--green-1)',
      borderColor: 'var(--green-3)',
      color: 'var(--green-4)'
    },
    info: {
      backgroundColor: 'hsl(var(--primary) / 0.1)',
      borderColor: 'hsl(var(--primary) / 0.3)',
      color: 'hsl(var(--primary))'
    },
    default: {}
  };
  return messageType ? textBoxStyles[messageType] : textBoxStyles.default;
};

export default Dialog; 