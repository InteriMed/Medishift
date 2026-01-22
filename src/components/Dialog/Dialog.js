import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn';
import { FiX, FiAlertTriangle, FiCheckCircle, FiInfo, FiAlertCircle } from 'react-icons/fi';

const Dialog = ({
  isOpen,
  onClose,
  title,
  children,
  actions,
  size = 'medium',
  closeOnEscape = true,
  closeOnBackdropClick = true,
  messageType = 'default',
  blurred_background = true,
  position = null,
  showCloseButton = true,
  centerTitle = false
}) => {
  // Initialize isVisible based on isOpen for immediate display (especially for tooltips)
  const [isVisible, setIsVisible] = useState(isOpen && !!position);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      console.log('[Dialog] Opening dialog:', { title, position, isOpen });
      setIsAnimating(true);
      // Set visible immediately for positioned dialogs (tooltips) to avoid delay
      // For centered dialogs, use double RAF for animation
      if (position) {
        // Positioned dialogs (tooltips) should appear immediately
        setIsVisible(true);
      } else {
        // Centered dialogs use animation
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            console.log('[Dialog] Setting visible to true');
            setIsVisible(true);
          });
        });
      }
      if (!position) {
        document.body.style.overflow = 'hidden';
      }
    } else {
      console.log('[Dialog] Closing dialog');
      setIsVisible(false);
      const timer = setTimeout(() => {
        setIsAnimating(false);
        if (!position) {
          document.body.style.overflow = '';
        }
      }, 300);
      return () => {
        clearTimeout(timer);
        if (!position) {
          document.body.style.overflow = '';
        }
      };
    }
  }, [isOpen, position, title]);

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

  const accentClasses = {
    default: 'border-t-4 border-t-slate-200',
    warning: 'border-t-4 border-t-amber-500',
    error: 'border-t-4 border-t-red-500',
    success: 'border-t-4 border-t-green-500',
    info: 'border-t-4 border-t-blue-500'
  };

  const getHeaderIcon = () => {
    switch (messageType) {
      case 'warning':
        return <div className="p-3 rounded-full bg-amber-50 text-amber-600 mb-4 w-fit"><FiAlertTriangle size={24} /></div>;
      case 'error':
        return <div className="p-3 rounded-full bg-red-50 text-red-600 mb-4 w-fit"><FiAlertCircle size={24} /></div>;
      case 'success':
        return <div className="p-3 rounded-full bg-green-50 text-green-600 mb-4 w-fit"><FiCheckCircle size={24} /></div>;
      case 'info':
        return <div className="p-3 rounded-full bg-blue-50 text-blue-600 mb-4 w-fit"><FiInfo size={24} /></div>;
      default:
        return null;
    }
  };

  if (position) {
    const { transform: positionTransform, ...positionStyles } = position;
    const dialogStyle = {
      position: 'fixed',
      ...positionStyles,
      zIndex: 200000,
      pointerEvents: 'auto',
      maxWidth: window.innerWidth < 768 ? 'calc(100vw - 20px)' : sizeClasses[size] === 'max-w-md' ? '28rem' : sizeClasses[size] === 'max-w-xl' ? '36rem' : sizeClasses[size] === 'max-w-3xl' ? '48rem' : '95vw',
      width: 'auto'
    };

    const innerTransform = isVisible ? "scale(1)" : "scale(0.95)";
    const combinedTransform = positionTransform 
      ? `${positionTransform} ${innerTransform}`
      : innerTransform;

    return createPortal(
      <div
        className={cn(
          "transition-all duration-300",
          isVisible ? "opacity-100" : "opacity-0"
        )}
        style={dialogStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={cn(
            "bg-white rounded-2xl overflow-hidden flex flex-col relative transition-all duration-300 shadow-2xl border border-slate-200",
            accentClasses[messageType] || accentClasses.default
          )}
          style={{
            transform: combinedTransform,
            opacity: isVisible ? 1 : 0
          }}
        >
          <div className={position ? "p-6" : "p-8"}>
            <div className={cn("flex items-start", centerTitle ? "flex-col" : "justify-between")}>
              {showCloseButton && !centerTitle && (
                <div className="flex-1">
                  {getHeaderIcon()}
                  {title && (
                    <h2 className={cn(
                      position ? "text-lg" : "text-2xl",
                      "font-bold text-slate-900 mb-2 tracking-tight"
                    )} style={{ fontFamily: 'var(--font-family-headings, inherit)' }}>
                      {title}
                    </h2>
                  )}
                </div>
              )}
              {centerTitle && (
                <div className="w-full text-center relative">
                  {getHeaderIcon()}
                  {title && (
                    <h2 className={cn(
                      position ? "text-lg" : "text-2xl",
                      "font-bold text-slate-900 mb-2 tracking-tight"
                    )} style={{ fontFamily: 'var(--font-family-headings, inherit)' }}>
                      {title}
                    </h2>
                  )}
                  {showCloseButton && (
                    <button
                      onClick={onClose}
                      className="absolute top-0 right-0 p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-900"
                    >
                      <FiX size={20} />
                    </button>
                  )}
                </div>
              )}
              {showCloseButton && !centerTitle && (
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-900"
                >
                  <FiX size={20} />
                </button>
              )}
            </div>

            <div className="text-slate-600 leading-relaxed custom-scrollbar overflow-y-auto max-h-[60vh]">
              {children}
            </div>

            {actions && (
              <div className={cn("flex justify-end gap-3", position ? "mt-6" : "mt-8")}>
                {actions}
              </div>
            )}
          </div>
        </div>
      </div>,
      document.body
    );
  }

  const backdropStyle = blurred_background
    ? {
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: isVisible ? 'blur(4px)' : 'blur(0px)',
        WebkitBackdropFilter: isVisible ? 'blur(4px)' : 'blur(0px)'
      }
    : {
        backgroundColor: 'transparent',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none'
      };

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[200000] flex items-center justify-center p-4 transition-all duration-300",
        isVisible ? "opacity-100" : "opacity-0"
      )}
      onClick={handleBackdropClick}
    >
      <div
        style={backdropStyle}
        className="fixed inset-0"
        onClick={handleBackdropClick}
      />
      <div
        className={cn(
          "bg-white w-full rounded-2xl overflow-hidden flex flex-col relative transform transition-all duration-300 shadow-2xl border border-slate-200",
          sizeClasses[size],
          accentClasses[messageType] || accentClasses.default,
          isVisible ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 translate-y-4"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8">
          <div className={cn("flex items-start", centerTitle ? "flex-col" : "justify-between")}>
            {!centerTitle && (
              <div className="flex-1">
                {getHeaderIcon()}
                {title && (
                  <h2 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight" style={{ fontFamily: 'var(--font-family-headings, inherit)' }}>
                    {title}
                  </h2>
                )}
              </div>
            )}
            {centerTitle && (
              <div className="w-full text-center relative">
                {getHeaderIcon()}
                {title && (
                  <h2 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight" style={{ fontFamily: 'var(--font-family-headings, inherit)' }}>
                    {title}
                  </h2>
                )}
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="absolute top-0 right-0 p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-900"
                  >
                    <FiX size={20} />
                  </button>
                )}
              </div>
            )}
            {!centerTitle && showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-900"
              >
                <FiX size={20} />
              </button>
            )}
          </div>

          <div className="text-slate-600 leading-relaxed custom-scrollbar overflow-y-auto max-h-[60vh]">
            {children}
          </div>

          {actions && (
            <div className="mt-8 flex justify-end gap-3">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export const getTextBoxStyles = (messageType) => {
  // Keep this for backward compatibility if other components rely on it, 
  // but typically we should migrate away from inline styles.
  // Returning empty object to let CSS/Tailwind handle it if possible, 
  // or keep minimal specific colors if strictly necessary.
  return {};
};

export default Dialog;
