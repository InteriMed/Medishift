import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTutorial } from '../../contexts/TutorialContext';
import { FiX } from 'react-icons/fi';

/**
 * TutorialAwareModal - A reusable modal component that automatically
 * pauses the tutorial when opened and resumes when closed via "Save"
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {function} props.onClose - Callback when modal is closed
 * @param {function} props.onSave - Callback when "Save and Continue" is clicked (optional)
 * @param {boolean} props.resumeOnClose - Whether to resume tutorial when modal closes (default: false)
 * @param {boolean} props.resumeOnSave - Whether to resume tutorial when save is clicked (default: true)
 * @param {string} props.title - Modal title
 * @param {React.ReactNode} props.children - Modal content
 * @param {React.ReactNode} props.footer - Custom footer (optional, replaces default buttons)
 * @param {string} props.saveButtonText - Text for save button (default: "Save and Continue")
 * @param {string} props.cancelButtonText - Text for cancel button (default: "Cancel")
 * @param {boolean} props.showCloseButton - Show X button in header (default: true)
 * @param {boolean} props.disableSave - Disable save button (default: false)
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.size - Modal size: 'small', 'medium', 'large' (default: 'medium')
 */
const TutorialAwareModal = ({
  isOpen,
  onClose,
  onSave,
  resumeOnClose = false,
  resumeOnSave = true,
  title,
  children,
  footer,
  saveButtonText = 'Save and Continue',
  cancelButtonText = 'Cancel',
  showCloseButton = true,
  disableSave = false,
  className = '',
  size = 'medium',
}) => {
  const { pauseTutorial, resumeTutorial, isPaused } = useTutorial();

  // Pause tutorial when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('[TutorialAwareModal] Modal opened, pausing tutorial');
      pauseTutorial();
    }
  }, [isOpen, pauseTutorial]);

  // Handle close (cancel)
  const handleClose = () => {
    console.log('[TutorialAwareModal] Modal closed via cancel');

    if (resumeOnClose) {
      resumeTutorial();
    }

    if (onClose) {
      onClose();
    }
  };

  // Handle save and continue
  const handleSave = async () => {
    console.log('[TutorialAwareModal] Save and Continue clicked');

    // Call the onSave callback if provided
    if (onSave) {
      await onSave();
    }

    // Resume tutorial if configured to do so
    if (resumeOnSave) {
      resumeTutorial();
    }

    // Close the modal
    if (onClose) {
      onClose();
    }
  };

  // Don't render if modal is not open
  if (!isOpen) return null;

  // Determine modal size class
  const sizeClass = {
    small: 'modal-small',
    medium: 'modal-medium',
    large: 'modal-large',
  }[size] || 'modal-medium';

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className={`modal-content ${sizeClass} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          {showCloseButton && (
            <button
              onClick={handleClose}
              className="modal-close-btn"
              aria-label="Close modal"
            >
              <FiX />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="modal-body">
          {children}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          {footer ? (
            footer
          ) : (
            <>
              <button
                onClick={handleClose}
                className="btn-cancel"
                type="button"
              >
                {cancelButtonText}
              </button>
              {onSave && (
                <button
                  onClick={handleSave}
                  className="btn-save"
                  type="button"
                  disabled={disableSave}
                >
                  {saveButtonText}
                </button>
              )}
            </>
          )}
        </div>

        {/* Debug info in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="modal-debug">
            <small>
              Tutorial paused: {isPaused ? 'Yes' : 'No'} |
              Resume on save: {resumeOnSave ? 'Yes' : 'No'} |
              Resume on close: {resumeOnClose ? 'Yes' : 'No'}
            </small>
          </div>
        )}
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: var(--z-index-popup, 11000);
          padding: 20px;
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .modal-content {
          background: var(--background, #fff);
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          display: flex;
          flex-direction: column;
          max-height: 90vh;
          animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .modal-small {
          width: 100%;
          max-width: 400px;
        }

        .modal-medium {
          width: 100%;
          max-width: 600px;
        }

        .modal-large {
          width: 100%;
          max-width: 900px;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border-color, #e5e7eb);
        }

        .modal-title {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-primary, #111);
        }

        .modal-close-btn {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          padding: 4px;
          color: var(--text-muted, #6b7280);
          transition: color 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-close-btn:hover {
          color: var(--text-primary, #111);
        }

        .modal-body {
          padding: 24px;
          overflow-y: auto;
          flex: 1;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 20px 24px;
          border-top: 1px solid var(--border-color, #e5e7eb);
        }

        .btn-cancel {
          padding: 10px 20px;
          background: var(--background-secondary, #f3f4f6);
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          color: var(--text-primary, #111);
          transition: all 0.2s;
        }

        .btn-cancel:hover {
          background: var(--background-secondary-hover, #e5e7eb);
        }

        .btn-save {
          padding: 10px 20px;
          background: var(--primary-color, #3b82f6);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }

        .btn-save:hover:not(:disabled) {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        .btn-save:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .modal-debug {
          padding: 10px 24px;
          background: var(--background-debug, #fef3c7);
          border-top: 1px solid var(--border-color, #e5e7eb);
          font-family: 'Courier New', monospace;
          font-size: 11px;
          color: var(--text-muted, #6b7280);
        }

        @media (max-width: 640px) {
          .modal-overlay {
            padding: 10px;
          }

          .modal-content {
            max-height: 95vh;
          }

          .modal-small,
          .modal-medium,
          .modal-large {
            max-width: 100%;
          }

          .modal-header,
          .modal-body,
          .modal-footer {
            padding: 16px;
          }

          .modal-footer {
            flex-direction: column-reverse;
          }

          .btn-cancel,
          .btn-save {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

TutorialAwareModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func,
  resumeOnClose: PropTypes.bool,
  resumeOnSave: PropTypes.bool,
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  footer: PropTypes.node,
  saveButtonText: PropTypes.string,
  cancelButtonText: PropTypes.string,
  showCloseButton: PropTypes.bool,
  disableSave: PropTypes.bool,
  className: PropTypes.string,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
};

export default TutorialAwareModal;
