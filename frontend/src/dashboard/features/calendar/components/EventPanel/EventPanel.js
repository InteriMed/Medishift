import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FiX, FiTrash2, FiClock, FiMapPin, FiFileText, FiRepeat } from 'react-icons/fi';
import { formatTime, formatDate } from '../../utils/dateHelpers';
import ColorPicker from './ColorPicker';
import styles from './eventPanel.module.css';

const EventPanel = ({ 
  event, 
  onClose, 
  onSave, 
  onDelete,
  colorOptions 
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    title: '',
    start: new Date(),
    end: new Date(),
    color: '',
    color1: '',
    location: '',
    notes: '',
    isRecurring: false,
    recurrencePattern: 'weekly'
  });
  
  // Initialize form data from event
  useEffect(() => {
    if (event) {
      setFormData({
        id: event.id,
        title: event.title || '',
        start: new Date(event.start),
        end: new Date(event.end),
        color: event.color || colorOptions[0].color,
        color1: event.color1 || colorOptions[0].color1,
        location: event.location || '',
        notes: event.notes || '',
        isRecurring: event.isRecurring || false,
        recurrencePattern: event.recurrencePattern || 'weekly'
      });
    } else {
      // Default new event - 1 hour from now
      const start = new Date();
      start.setHours(start.getHours() + 1, 0, 0, 0);
      
      const end = new Date(start);
      end.setHours(end.getHours() + 1);
      
      setFormData({
        title: '',
        start,
        end,
        color: colorOptions[0].color,
        color1: colorOptions[0].color1,
        location: '',
        notes: '',
        isRecurring: false,
        recurrencePattern: 'weekly'
      });
    }
  }, [event, colorOptions]);
  
  // Handle text input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle checkbox changes
  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };
  
  // Handle date/time changes
  const handleDateTimeChange = (field, value) => {
    if (field === 'startDate') {
      const date = new Date(value);
      const newStart = new Date(formData.start);
      newStart.setFullYear(date.getFullYear());
      newStart.setMonth(date.getMonth());
      newStart.setDate(date.getDate());
      
      setFormData(prev => ({
        ...prev,
        start: newStart
      }));
    } else if (field === 'startTime') {
      const [hours, minutes] = value.split(':');
      const newStart = new Date(formData.start);
      newStart.setHours(parseInt(hours, 10));
      newStart.setMinutes(parseInt(minutes, 10));
      
      setFormData(prev => ({
        ...prev,
        start: newStart
      }));
    } else if (field === 'endDate') {
      const date = new Date(value);
      const newEnd = new Date(formData.end);
      newEnd.setFullYear(date.getFullYear());
      newEnd.setMonth(date.getMonth());
      newEnd.setDate(date.getDate());
      
      setFormData(prev => ({
        ...prev,
        end: newEnd
      }));
    } else if (field === 'endTime') {
      const [hours, minutes] = value.split(':');
      const newEnd = new Date(formData.end);
      newEnd.setHours(parseInt(hours, 10));
      newEnd.setMinutes(parseInt(minutes, 10));
      
      setFormData(prev => ({
        ...prev,
        end: newEnd
      }));
    }
  };
  
  // Handle color selection
  const handleColorSelect = (colorObj) => {
    setFormData(prev => ({
      ...prev,
      color: colorObj.color,
      color1: colorObj.color1
    }));
  };
  
  // Handle save
  const handleSave = () => {
    // Basic validation
    if (!formData.title.trim()) {
      // Show error
      return;
    }
    
    // Ensure end time is after start time
    if (formData.end <= formData.start) {
      // Set end time to 1 hour after start
      const newEnd = new Date(formData.start);
      newEnd.setHours(newEnd.getHours() + 1);
      
      setFormData(prev => ({
        ...prev,
        end: newEnd
      }));
      
      // Show warning
      return;
    }
    
    onSave(formData);
  };
  
  // Format date string for input
  const formatDateForInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  // Format time string for input
  const formatTimeForInput = (date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };
  
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            {event && event.id 
              ? t('dashboard.calendar.editEvent') 
              : t('dashboard.calendar.createEvent')
            }
          </h3>
          <button 
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close"
          >
            <FiX />
          </button>
        </div>
        
        <div className={styles.content}>
          {/* Title */}
          <div className={styles.field}>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder={t('dashboard.calendar.eventTitle')}
              className={styles.titleInput}
              autoFocus
            />
          </div>
          
          {/* Date and time */}
          <div className={styles.fieldGroup}>
            <div className={styles.fieldIcon}>
              <FiClock />
            </div>
            <div className={styles.dateTimeFields}>
              <div className={styles.dateTimeRow}>
                <input
                  type="date"
                  value={formatDateForInput(formData.start)}
                  onChange={(e) => handleDateTimeChange('startDate', e.target.value)}
                  className={styles.dateInput}
                />
                <input
                  type="time"
                  value={formatTimeForInput(formData.start)}
                  onChange={(e) => handleDateTimeChange('startTime', e.target.value)}
                  className={styles.timeInput}
                />
              </div>
              <div className={styles.dateTimeRow}>
                <input
                  type="date"
                  value={formatDateForInput(formData.end)}
                  onChange={(e) => handleDateTimeChange('endDate', e.target.value)}
                  className={styles.dateInput}
                />
                <input
                  type="time"
                  value={formatTimeForInput(formData.end)}
                  onChange={(e) => handleDateTimeChange('endTime', e.target.value)}
                  className={styles.timeInput}
                />
              </div>
            </div>
          </div>
          
          {/* Location */}
          <div className={styles.fieldGroup}>
            <div className={styles.fieldIcon}>
              <FiMapPin />
            </div>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder={t('dashboard.calendar.location')}
              className={styles.input}
            />
          </div>
          
          {/* Notes */}
          <div className={styles.fieldGroup}>
            <div className={styles.fieldIcon}>
              <FiFileText />
            </div>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder={t('dashboard.calendar.notes')}
              className={styles.textareaInput}
              rows={3}
            />
          </div>
          
          {/* Recurring options */}
          <div className={styles.fieldGroup}>
            <div className={styles.fieldIcon}>
              <FiRepeat />
            </div>
            <div className={styles.recurringOptions}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="isRecurring"
                  checked={formData.isRecurring}
                  onChange={handleCheckboxChange}
                  className={styles.checkbox}
                />
                <span>{t('dashboard.calendar.isRecurring')}</span>
              </label>
              
              {formData.isRecurring && (
                <select
                  name="recurrencePattern"
                  value={formData.recurrencePattern}
                  onChange={handleChange}
                  className={styles.select}
                >
                  <option value="daily">{t('dashboard.calendar.daily')}</option>
                  <option value="weekly">{t('dashboard.calendar.weekly')}</option>
                  <option value="monthly">{t('dashboard.calendar.monthly')}</option>
                </select>
              )}
            </div>
          </div>
          
          {/* Color selection */}
          <div className={styles.colorSelection}>
            <span className={styles.colorLabel}>{t('dashboard.calendar.eventColor')}</span>
            <ColorPicker
              colors={colorOptions}
              selectedColor={formData.color}
              onSelect={handleColorSelect}
            />
          </div>
        </div>
        
        <div className={styles.footer}>
          {event && event.id && (
            <button 
              className={styles.deleteButton}
              onClick={() => onDelete(event)}
              type="button"
            >
              <FiTrash2 />
              {t('common.delete')}
            </button>
          )}
          
          <div className={styles.actionButtons}>
            <button 
              className={styles.cancelButton}
              onClick={onClose}
              type="button"
            >
              {t('common.cancel')}
            </button>
            <button 
              className={styles.saveButton}
              onClick={handleSave}
              type="button"
            >
              {t('common.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventPanel; 