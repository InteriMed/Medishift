import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTutorial } from '../../contexts/TutorialContext';
import { FiX } from 'react-icons/fi';
import Button from '../../../components/BoxedInputFields/Button';

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
      pauseTutorial();
    }
  }, [isOpen, pauseTutorial]);

  // Handle close (cancel)
  const handleClose = () => {

    if (resumeOnClose) {
      resumeTutorial();
    }

    if (onClose) {
      onClose();
    }
  };

  // Handle save and continue
  const handleSave = async () => {

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
        <div className="modal-body custom-scrollbar">
          {children}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          {footer ? (
            footer
          ) : (
            <>
              <Button
                onClick={handleClose}
                variant="secondary"
                type="button"
              >
                {cancelButtonText}
              </Button>
              {onSave && (
                <Button
                  onClick={handleSave}
                  variant="primary"
                  type="button"
                  disabled={disableSave}
                >
                  {saveButtonText}
                </Button>
              )}
            </>
          )}
        </div>

        {/* Debug info in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="modal-debug p-2 bg-yellow-100/50 text-[10px] text-muted-foreground border-t border-border">
            Tutorial paused: {isPaused ? 'Yes' : 'No'} |
            Resume on save: {resumeOnSave ? 'Yes' : 'No'} |
            Resume on close: {resumeOnClose ? 'Yes' : 'No'}
          </div>
        )}
      </div>
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
