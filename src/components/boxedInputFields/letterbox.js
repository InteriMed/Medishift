import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import './styles/boxedInputFields.css';
import daySelector from './daySelector';

const Letterbox = ({ onClose, onSave, initialData }) => {
  const { t } = useTranslation(['common']);
  const [formData, setFormData] = useState(initialData);
  const [selectedDays, setSelectedDays] = useState(new Array(7).fill(false));
  const [showConfirmation, setShowConfirmation] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (boxRef.current && !boxRef.current.contains(event.target)) {
        setShowConfirmation(true);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleValidate = () => {
    onSave({ ...formData, selectedDays });
    onClose();
  };

  const handleCancel = () => {
    setShowConfirmation(true);
  };

  const handleConfirmClose = (shouldClose) => {
    setShowConfirmation(false);
    if (shouldClose) {
      onClose();
    }
  };

  return (
    <div className="letterbox-overlay">
      <div className="letterbox-container" ref={boxRef}>
        {/* Form content */}
        <div className="letterbox-content">
          {/* Your existing form fields here */}
          
          {/* Day selector for weekly/monthly repetitions */}
          <div className="repetition-section">
            <h3>Select Days</h3>
            <daySelector
              selectedDays={selectedDays}
              onChange={setSelectedDays}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="letterbox-actions">
          <button className="btn-validate" onClick={handleValidate}>
            Validate
          </button>
          <button className="btn-cancel" onClick={handleCancel}>
            Cancel Modifications
          </button>
          <button className="btn-delete" onClick={onClose}>
            Delete
          </button>
        </div>

        {/* Confirmation popup */}
        {showConfirmation && (
          <div className="confirmation-popup">
            <div className="confirmation-content">
              <p>{t('common:confirmDiscard', 'Your modifications will not be saved. Continue?')}</p>
              <div className="confirmation-actions">
                <button onClick={() => handleConfirmClose(true)}>{t('common:yes', 'Yes')}</button>
                <button onClick={() => handleConfirmClose(false)}>{t('common:cancel', 'Cancel')}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Letterbox;
