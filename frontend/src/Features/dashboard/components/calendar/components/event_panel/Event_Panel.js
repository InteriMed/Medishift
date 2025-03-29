import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import '../../../../../../components/Boxed-InputFields/combined_css.css';
import DateTimeValue from '../datetime_dropdown/Datetime_Dropdown';
import InputField from '../../../../../../components/Boxed-InputFields/Personnalized-InputField/Personnalized-InputField';
import DropdownField from '../../../../../../components/Boxed-InputFields/Dropdown-Field/Dropdown-Field';
import InputFieldParagraph from '../../../../../../components/Boxed-InputFields/InputField-Paragraph/InputField-Paragraph';
import { FaTrash } from "react-icons/fa";
import DeleteConfirmationDialog from '../delete_confirmation_dialog/Delete_Confirmation_Dialog';
import './Event_Panel.css';
import DropdownDate from '../../../../../../components/Boxed-InputFields/Dropdown-Date/Dropdown-Date';

const EventPanel = ({ event, onClose, onSave, onDelete, position, colorOptions }) => {
  const { t } = useTranslation();
  const [expandedSections, setExpandedSections] = useState({
    datetime: false,
    location: false,
    notes: false
  });
  const [isClosing, setIsClosing] = useState(false);
  const panelRef = useRef(null);
  const [editingDateTime, setEditingDateTime] = useState({
    startMonth: false,
    startDay: false,
    startYear: false,
    startHour: false,
    startMinute: false,
    endMonth: false,
    endDay: false,
    endYear: false,
    endHour: false,
    endMinute: false
  });
  const [showRepeatDropdown, setShowRepeatDropdown] = useState(false);
  const [showCustomRepeat, setShowCustomRepeat] = useState(false);
  const [repeatValue, setRepeatValue] = useState(event.repeatValue || 'None');
  const [isRecurring, setIsRecurring] = useState(event.isRecurring || false);
  const [customRepeatConfig, setCustomRepeatConfig] = useState(event.customRepeatConfig || {
    frequency: 1,
    unit: 'week',
    days: ['MON']
  });
  const [showEndRepeatDropdown, setShowEndRepeatDropdown] = useState(false);
  const [endRepeatValue, setEndRepeatValue] = useState(event.endRepeatValue || 'Never');
  const [endRepeatCount, setEndRepeatCount] = useState(event.endRepeatCount || 1);
  const [endRepeatDate, setEndRepeatDate] = useState(event.endRepeatDate ? new Date(event.endRepeatDate) : new Date());
  const [editingEndRepeatDate, setEditingEndRepeatDate] = useState({
    month: false,
    day: false,
    year: false
  });
  const [title, setTitle] = useState(event.title || '');
  const [notes, setNotes] = useState(event.notes || '');
  const [location, setLocation] = useState(event.location || '');
  const [employees, setEmployees] = useState(event.employees || '');
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const [selectedColor, setSelectedColor] = useState(event.color || colorOptions[0].color);
  const [selectedColor1, setSelectedColor1] = useState(event.color1 || colorOptions[0].color1);
  const [selectedColor2, setSelectedColor2] = useState(event.color2 || colorOptions[0].color2);
  const [closingSection, setClosingSection] = useState(null);
  const [isColorDropdownClosing, setIsColorDropdownClosing] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [showEndRepeatInput, setShowEndRepeatInput] = useState(false);
  const [showEndRepeatDatePicker, setShowEndRepeatDatePicker] = useState(false);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const [expandedSection, setExpandedSection] = useState('datetime'); // 'datetime' or 'details'

  const locationOptions = [
    'Office',
    'Meeting Room 1',
    'Meeting Room 2',
    'Video Call',
    'Phone Call'
  ];

  const employeeOptions = [
    'John Doe',
    'Jane Smith',
    'Mike Johnson',
    'Sarah Williams'
  ];

  const handleClose = (e) => {
    if (e.target === e.currentTarget) {
      setIsClosing(true);
      setTimeout(() => {
        const finalEvent = {
          ...event,
          id: event.id,
          title,
          color: selectedColor,
          color1: selectedColor1,
          color2: selectedColor2,
          start: event.start,
          end: event.end,
          notes,
          location,
          employees,
          repeatValue,
          endRepeatValue,
          endRepeatCount,
          endRepeatDate,
          customRepeatConfig,
          isRecurring: repeatValue !== 'None'
        };
        onSave(finalEvent, true);
        onClose();
      }, 200);
    }
  };

  const toggleSection = (section) => {
    if (expandedSections[section]) {
      // Start closing animation
      setClosingSection(section);
      
      if (section === 'datetime' && expandedDateTimeRef.current) {
        // First fade out the content
        const content = expandedDateTimeRef.current.querySelector('.datetime-content');
        if (content) {
          content.style.opacity = '0';
        }
        
        // Then start the slide up animation
        setTimeout(() => {
          expandedDateTimeRef.current.style.transform = 'translateY(-20px)';
          expandedDateTimeRef.current.style.maxHeight = '0px';
          expandedDateTimeRef.current.style.padding = '0px';
          expandedDateTimeRef.current.style.margin = '0px';
        }, 50);

        // Finally update the state
        setTimeout(() => {
          setExpandedSections(prev => ({
            ...prev,
            [section]: false
          }));
          setClosingSection(null);
        }, 300); // Increased duration to match the transition
      }
    } else {
      setExpandedSections(prev => ({
        ...prev,
        [section]: true
      }));
      
      if (section === 'datetime' && expandedDateTimeRef.current) {
        // Reset styles for opening
        expandedDateTimeRef.current.style.transform = 'translateY(0)';
        const content = expandedDateTimeRef.current.querySelector('.datetime-content');
        
        requestAnimationFrame(() => {
          expandedDateTimeRef.current.style.maxHeight = `${expandedDateTimeRef.current.scrollHeight}px`;
          expandedDateTimeRef.current.style.padding = '16px';
          expandedDateTimeRef.current.style.margin = '8px 0';
          
          // Fade in the content slightly delayed
          setTimeout(() => {
            if (content) {
              content.style.opacity = '1';
            }
          }, 50);
        });
      }
    }
  };

  const formatDateTime = (date) => {
    return date.toLocaleString('default', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleStartDateChange = (newDate) => {
    const updatedEvent = {
      ...event,
      start: new Date(newDate)
    };
    onSave(updatedEvent, false);
  };

  const handleEndDateChange = (newDate) => {
    const updatedEvent = {
      ...event,
      end: new Date(newDate)
    };
    onSave(updatedEvent, false);
  };

  const handleRepeatClick = (event) => {
    event.stopPropagation();
    // Close end repeat dropdown if open
    if (showEndRepeatDropdown) {
      setShowEndRepeatDropdown(false);
    }
    setShowRepeatDropdown(prev => !prev);
  };

  const handleRepeatOptionSelect = (e, value) => {
    e.stopPropagation();
    
    // Close both dropdowns
    setShowRepeatDropdown(false);
    setShowEndRepeatDropdown(false);
    
    if (value === 'Custom...') {
      setTimeout(() => {
        setShowCustomRepeat(true);
      }, 50);
      return;
    }
    
    setRepeatValue(value);
    setIsRecurring(value !== 'None');
    if (value === 'None') {
      setEndRepeatValue('Never');
      setEndRepeatCount(1);
      setEndRepeatDate(new Date());
    }
    
    // Create updated event object with repeat type information
    const updatedEvent = {
      ...event,
      repeatValue: value,
      endRepeatValue: value === 'None' ? 'Never' : endRepeatValue,
      endRepeatCount: value === 'None' ? 1 : endRepeatCount,
      endRepeatDate: value === 'None' ? new Date() : endRepeatDate,
      customRepeatConfig,
      isRecurring: value !== 'None',
      repeatInterval: value === 'Every Day' ? 'day' : 
                     value === 'Every Week' ? 'week' :
                     value === 'Every Month' ? 'month' : null
    };
    
    onSave(updatedEvent, false);
  };

  const handleCustomRepeatSave = () => {
    setShowCustomRepeat(false);
    
    let newRepeatValue = '';
    let repeatInterval = customRepeatConfig.unit;
    
    // Format the repeat value based on configuration
    if (customRepeatConfig.unit === 'week') {
      const weekdays = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
      const weekend = ['SAT', 'SUN'];
      const selectedDays = customRepeatConfig.days;
      
      if (selectedDays.length === 7) {
        newRepeatValue = `Custom: Every ${customRepeatConfig.frequency} ${customRepeatConfig.unit}${customRepeatConfig.frequency > 1 ? 's' : ''} on every day`;
      } else if (weekdays.every(day => selectedDays.includes(day)) && 
                !weekend.some(day => selectedDays.includes(day))) {
        newRepeatValue = `Custom: Every ${customRepeatConfig.frequency} ${customRepeatConfig.unit}${customRepeatConfig.frequency > 1 ? 's' : ''} on weekdays`;
      } else {
        const dayNames = {
          'MON': 'Monday',
          'TUE': 'Tuesday',
          'WED': 'Wednesday',
          'THU': 'Thursday',
          'FRI': 'Friday',
          'SAT': 'Saturday',
          'SUN': 'Sunday'
        };
        
        const formattedDays = selectedDays
          .sort((a, b) => {
            const dayOrder = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
            return dayOrder.indexOf(a) - dayOrder.indexOf(b);
          })
          .map(day => dayNames[day])
          .join(', ');
        
        newRepeatValue = `Custom: Every ${customRepeatConfig.frequency} ${customRepeatConfig.unit}${customRepeatConfig.frequency > 1 ? 's' : ''} on ${formattedDays}`;
      }
    } else {
      newRepeatValue = `Custom: Every ${customRepeatConfig.frequency} ${customRepeatConfig.unit}${customRepeatConfig.frequency > 1 ? 's' : ''}`;
    }
    
    setRepeatValue(newRepeatValue);
    
    const updatedEvent = {
      ...event,
      repeatValue: newRepeatValue,
      customRepeatConfig,
      endRepeatValue,
      endRepeatCount,
      endRepeatDate,
      isRecurring: true,
      totalEvents: calculateTotalEvents(),
      repeatInterval: repeatInterval
    };
    
    onSave(updatedEvent, false);
  };

  const handleEndRepeatClick = (event) => {
    event.stopPropagation();
    // Close repeat dropdown if open
    if (showRepeatDropdown) {
      setShowRepeatDropdown(false);
    }
    setShowEndRepeatDropdown(prev => !prev);
  };

  const handleEndRepeatSelect = (e, value) => {
    e.stopPropagation();
    setEndRepeatValue(value);
    
    // Close both dropdowns
    setShowEndRepeatDropdown(false);
    setShowRepeatDropdown(false);
    
    if (value === 'After') {
      setShowEndRepeatInput(true);
      setShowEndRepeatDatePicker(false);
    } else if (value === 'On Date') {
      setShowEndRepeatInput(false);
      setShowEndRepeatDatePicker(true);
    } else {
      setShowEndRepeatInput(false);
      setShowEndRepeatDatePicker(false);
    }
    
    // Save the changes
    const updatedEvent = {
      ...event,
      endRepeatValue: value,
      endRepeatCount: value === 'After' ? endRepeatCount : null,
      endRepeatDate: value === 'On Date' ? endRepeatDate : null,
      isRecurring: repeatValue !== 'None'
    };
    
    onSave(updatedEvent, false);
  };

  const handleEndRepeatCountChange = (e) => {
    const count = parseInt(e.target.value) || 1;
    setEndRepeatCount(count);
    
    const updatedEvent = {
      ...event,
      endRepeatCount: count,
      endRepeatValue: 'After',
      isRecurring: repeatValue !== 'None',
      totalEvents: calculateTotalEvents(),
      customRepeatConfig
    };
    
    onSave(updatedEvent, false);
  };

  const handleEndRepeatDateChange = (type, value) => {
    const newDate = new Date(endRepeatDate);
    
    switch(type) {
      case 'month':
        newDate.setMonth(value);
        break;
      case 'day':
        newDate.setDate(value);
        break;
      case 'year':
        newDate.setFullYear(value);
        break;
    }
    
    setEndRepeatDate(newDate);
    
    const updatedEvent = {
      ...event,
      endRepeatDate: newDate,
      endRepeatValue: 'On Date',
      isRecurring: repeatValue !== 'None'
    };
    
    onSave(updatedEvent, false);
  };

  // Add useEffect for handling click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close repeat dropdown if click is outside
      if (showRepeatDropdown && 
          !event.target.closest('.repeat-section')) {
        setShowRepeatDropdown(false);
      }
      
      // Close end repeat dropdown if click is outside
      if (showEndRepeatDropdown && 
          !event.target.closest('.end-repeat-display')) {
        setShowEndRepeatDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showRepeatDropdown, showEndRepeatDropdown]);

  // Add useEffect for handling click outside color dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close color dropdown if click is outside
      if (showColorDropdown && 
          !event.target.closest('.button-container')) {
        handleColorDropdownClose();
      }
      
      // Keep existing click outside handlers
      if (showRepeatDropdown && 
          !event.target.closest('.repeat-section')) {
        setShowRepeatDropdown(false);
      }
      
      if (showEndRepeatDropdown && 
          !event.target.closest('.end-repeat-display')) {
        setShowEndRepeatDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColorDropdown, showRepeatDropdown, showEndRepeatDropdown]);

  const handlePanelClick = (e) => {
    // Don't close if clicking inside an expanded section
    if (e.target.closest('.expanded-datetime') || 
        e.target.closest('.datetime-display') ||
        e.target.closest('.repeat-section') ||
        e.target.closest('.end-repeat-display')) {
      return;
    }

    // Close expanded sections if clicking anywhere else in the panel
    if (e.target.closest('.event-panel')) {
      setExpandedSections({
        datetime: false,
        location: false,
        notes: false
      });
    }
  };

  const handleColorSelect = (color, color1, color2) => {
    setSelectedColor(color);
    setSelectedColor1(color1);
    setSelectedColor2(color2);
    
    const updatedEvent = {
      ...event,
      color: color,
      color1: color1,
      color2: color2,
      title,
      notes,
      location,
      employees
    };
    
    onSave(updatedEvent, false);
  };

  const handleColorDropdownClose = () => {
    setShowColorDropdown(false);
    setIsColorDropdownClosing(false);
  };

  const handleColorButtonClick = (e) => {
    e.stopPropagation();
    if (showColorDropdown) {
      handleColorDropdownClose();
    } else {
      setShowColorDropdown(true);
    }
  };

  // Add new ref for expanded datetime
  const expandedDateTimeRef = useRef(null);

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    onSave({ 
      ...event,
      title: newTitle 
    }, false);
  };

  const handleNotesChange = (e) => {
    const newNotes = e.target.value;
    setNotes(newNotes);
    // Save immediately
    onSave({
      ...event,
      notes: newNotes,
      title,
      location,
      employees,
      repeatValue,
      endRepeatValue,
      endRepeatCount,
      endRepeatDate,
      customRepeatConfig,
      isRecurring: repeatValue !== 'None'
    }, false);
  };

  const handleLocationChange = (value) => {
    setLocation(value);
    // Save immediately
    onSave({
      ...event,
      location: value,
      title,
      notes,
      employees,
      repeatValue,
      endRepeatValue,
      endRepeatCount,
      endRepeatDate,
      customRepeatConfig,
      isRecurring: repeatValue !== 'None'
    }, false);
  };

  const handleEmployeesChange = (value) => {
    setEmployees(value);
    // Save immediately
    onSave({
      ...event,
      employees: value,
      title,
      notes,
      location,
      repeatValue,
      endRepeatValue,
      endRepeatCount,
      endRepeatDate,
      customRepeatConfig,
      isRecurring: repeatValue !== 'None'
    }, false);
  };

  const handleEditingChange = (type, part, value) => {
    setEditingDateTime(prev => ({
      ...prev,
      [`${type}${part.charAt(0).toUpperCase() + part.slice(1)}`]: value
    }));
  };

  const handleDeleteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Create a properly formatted event object with all necessary properties
    const eventToDelete = {
      ...event,
      id: event.id,
      start: new Date(event.start),
      end: new Date(event.end),
      title,
      notes,
      location,
      employees,
      repeatValue,
      endRepeatValue,
      endRepeatCount,
      endRepeatDate,
      customRepeatConfig,
      isRecurring: repeatValue !== 'None' || String(event.id).includes('-')
    };

    setShowDeleteConfirmation(true);
    setEventToDelete(eventToDelete);
  };

  const handleDeleteConfirm = (deleteType) => {
    if (onDelete) {
      onDelete(eventToDelete.id, deleteType);
      setShowDeleteConfirmation(false);
      setEventToDelete(null);
      setIsClosing(true);
      setTimeout(() => {
        onClose();
      }, 200);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirmation(false);
    setEventToDelete(null);
  };

  // Update isRecurring when repeatValue changes
  useEffect(() => {
    setIsRecurring(repeatValue !== 'None');
  }, [repeatValue]);

  // Add effect to handle custom repeat calculations
  useEffect(() => {
    if (repeatValue.includes('Every') || repeatValue.includes('Custom')) {
      const updatedEvent = {
        ...event,
        endRepeatValue,
        endRepeatCount,
        endRepeatDate,
        customRepeatConfig,
        isRecurring: true,
        totalEvents: calculateTotalEvents()
      };
      onSave(updatedEvent, false);
    }
  }, [repeatValue, endRepeatValue, endRepeatCount, endRepeatDate, customRepeatConfig]);

  // Update calculateTotalEvents function
  const calculateTotalEvents = () => {
    if (repeatValue === 'Every Day') {
      // For daily repeats, each occurrence is a day
      return endRepeatCount;
    } else if (repeatValue === 'Every Month') {
      // For monthly repeats, each occurrence is a month
      return endRepeatCount;
    } else if (repeatValue.includes('week') || (customRepeatConfig.unit === 'week' && repeatValue.includes('Custom'))) {
      // For weekly repeats, calculate based on selected days
      const selectedDays = customRepeatConfig.days?.length || 1;
      const frequency = customRepeatConfig.frequency || 1;
      return Math.ceil(endRepeatCount * selectedDays / frequency);
    }
    // For other repeat types, occurrence equals number of events
    return endRepeatCount;
  };

  const formatEndRepeatText = (endRepeatValue, endRepeatCount, repeatValue) => {
    if (endRepeatValue === 'Never' || endRepeatValue === 'On Date') {
      return endRepeatValue;
    }

    // Handle custom repeat configurations
    if (repeatValue.includes('Custom')) {
      const unit = repeatValue.includes('week') ? 'weeks' :
                  repeatValue.includes('day') ? 'days' :
                  repeatValue.includes('month') ? 'months' : 'occurrences';
      return `After ${endRepeatCount} ${unit}`;
    }

    // Handle standard repeat configurations
    switch (repeatValue) {
      case 'Every Day':
        return `After ${endRepeatCount} days`;
      case 'Every Week':
        return `After ${endRepeatCount} weeks`;
      case 'Every Month':
        return `After ${endRepeatCount} months`;
      default:
        return `After ${endRepeatCount} occurrences`;
    }
  };

  const toggleDetails = () => {
    setExpandedSection(expandedSection === 'details' ? null : 'details');
  };

  const toggleDateTime = () => {
    setExpandedSection(expandedSection === 'datetime' ? null : 'datetime');
  };

  return (
    <div 
      className={`event-panel-overlay ${isClosing ? 'closing' : ''}`} 
      onClick={handleClose}
    >
      {showDeleteConfirmation && (
        <DeleteConfirmationDialog
          event={eventToDelete}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          isRecurring={repeatValue !== 'None' || String(event.id).includes('-')}
          currentDate={new Date(event.start)}
        />
      )}
      <div 
        ref={panelRef}
        className={`event-panel ${isClosing ? 'closing' : ''}`}
      >
        <div className="panel-header">
          <div className="button-container" style={{ color: selectedColor2 }}>
            {showColorDropdown && (
              <div className={`calendar-select-dropdown ${isColorDropdownClosing ? 'closing' : ''}`}>
                {colorOptions.map((option) => (
                  <div
                    key={option.id}
                    className="color-option"
                    style={{ backgroundColor: option.color2 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleColorSelect(option.color, option.color1, option.color2);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
          
          <InputField
            label={t('dashboard.calendar.eventDetails.title')}
            placeholder={t('dashboard.calendar.eventDetails.titlePlaceholder')}
            value={title}
            onChange={handleTitleChange}
            marginBottom="0"
          />
        </div>

        <button 
          className="event-panel-close-button"
          onClick={(e) => {
            e.stopPropagation();
            handleClose(e);
          }}
        >×</button>

        <div className={`collapsible-section ${expandedSection === 'datetime' ? 'expanded' : 'collapsed'}`}>
          <div className="section-header" onClick={toggleDateTime}>
            <span className="section-header-text">{t('dashboard.calendar.eventDetails.timeAndDuration')}</span>
            <div className={`section-arrow ${expandedSection === 'datetime' ? 'expanded' : ''}`}>
              <i className="fas fa-chevron-down"></i>
            </div>
          </div>
          
          <div className="section-content">
            <div className="datetime-section">
              <div className="datetime-column">
                <div className="datetime-row">
                  <span className="datetime-row-label">{t('dashboard.calendar.eventDetails.time.start')}</span>
                  <div className="datetime-parts">
                    <DropdownDate
                      label={t('dashboard.calendar.eventDetails.time.start')}
                      value={event.start.toISOString().split('T')[0]}
                      onChange={handleStartDateChange}
                      marginBottom="0"
                    />
                  </div>
                </div>

                <div className="datetime-row">
                  <span className="datetime-row-label">{t('dashboard.calendar.eventDetails.time.end')}</span>
                  <div className="datetime-parts">
                    <DropdownDate
                      label={t('dashboard.calendar.eventDetails.time.end')}
                      value={event.end.toISOString().split('T')[0]}
                      onChange={handleEndDateChange}
                      marginBottom="0"
                    />
                  </div>
                </div>
              </div>

              <div className="datetime-column">
                <div className="datetime-row">
                  <span className="datetime-row-label">{t('dashboard.calendar.eventDetails.time.start')}</span>
                  <div className="datetime-parts">
                    <DateTimeValue 
                      date={event.start} 
                      type="start" 
                      part="hour"
                      onDateTimeChange={handleDateTimeChange}
                      inputDisabled={true}
                    />
                    <span className="time-colon">:</span>
                    <DateTimeValue 
                      date={event.start} 
                      type="start" 
                      part="minute"
                      onDateTimeChange={handleDateTimeChange}
                      inputDisabled={true}
                    />
                  </div>
                </div>
                
                <div className="datetime-row">
                  <span className="datetime-row-label">{t('dashboard.calendar.eventDetails.time.end')}</span>
                  <div className="datetime-parts">
                    <DateTimeValue 
                      date={event.end} 
                      type="end" 
                      part="hour"
                      onDateTimeChange={handleDateTimeChange}
                      inputDisabled={true}
                    />
                    <span className="time-colon">:</span>
                    <DateTimeValue 
                      date={event.end} 
                      type="end" 
                      part="minute"
                      onDateTimeChange={handleDateTimeChange}
                      inputDisabled={true}
                    />
                  </div>
                </div>
              </div>

              <div className="datetime-column">
                <div className="occurence-row">
                  <span className="datetime-row-label">{t('dashboard.calendar.eventDetails.repeat.label')}</span>
                  <div className="value repeat-section">
                    <span onClick={handleRepeatClick} className="repeat-value">
                      {repeatValue}
                    </span>
                    {showRepeatDropdown && (
                      <div className="repeat-frequency-dropdown" onClick={(e) => e.stopPropagation()}>
                        <div 
                          className={`repeat-option ${repeatValue === 'None' ? 'selected' : ''}`}
                          onClick={(e) => handleRepeatOptionSelect(e, 'None')}
                        >
                          {t('dashboard.calendar.eventDetails.repeat.never')}
                        </div>
                        <div 
                          className={`repeat-option ${repeatValue === 'Every Day' ? 'selected' : ''}`}
                          onClick={(e) => handleRepeatOptionSelect(e, 'Every Day')}
                        >
                          {t('dashboard.calendar.eventDetails.repeat.everyDay')}
                        </div>
                        <div 
                          className={`repeat-option ${repeatValue === 'Every Week' ? 'selected' : ''}`}
                          onClick={(e) => handleRepeatOptionSelect(e, 'Every Week')}
                        >
                          {t('dashboard.calendar.eventDetails.repeat.everyWeek')}
                        </div>
                        <div 
                          className={`repeat-option ${repeatValue === 'Every Month' ? 'selected' : ''}`}
                          onClick={(e) => handleRepeatOptionSelect(e, 'Every Month')}
                        >
                          {t('dashboard.calendar.eventDetails.repeat.everyMonth')}
                        </div>
                        <div className="repeat-option-divider"></div>
                        <div 
                          className="repeat-option" 
                          onClick={(e) => handleRepeatOptionSelect(e, 'Custom...')}
                        >
                          {t('dashboard.calendar.eventDetails.repeat.custom')}
                        </div>
                      </div>
                    )}
                    {showCustomRepeat && (
                      <div className="custom-repeat-modal">
                        <div className="custom-repeat-header">
                          <span>{t('dashboard.calendar.eventDetails.repeat.custom')}</span>
                          <span className="custom-repeat-close" onClick={() => setShowCustomRepeat(false)}>×</span>
                        </div>
                        <div className="custom-repeat-content">
                          <div className="custom-repeat-row">
                            <span>{t('dashboard.calendar.eventDetails.repeat.every')}</span>
                            <input 
                              type="number" 
                              min="1" 
                              value={customRepeatConfig.frequency}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Allow empty string but set minimum to 1 when saving
                                setCustomRepeatConfig({
                                  ...customRepeatConfig,
                                  frequency: value === '' ? '' : parseInt(value)
                                });
                              }}
                              onBlur={(e) => {
                                // When input loses focus, ensure value is at least 1
                                const value = e.target.value;
                                setCustomRepeatConfig({
                                  ...customRepeatConfig,
                                  frequency: value === '' || parseInt(value) < 1 ? 1 : parseInt(value)
                                });
                              }}
                            />
                            <select
                              value={customRepeatConfig.unit}
                              onChange={(e) => setCustomRepeatConfig({
                                ...customRepeatConfig,
                                unit: e.target.value
                              })}
                              className="custom-repeat-unit"
                            >
                              <option value="day">{t('dashboard.calendar.eventDetails.repeat.units.days')}</option>
                              <option value="week">{t('dashboard.calendar.eventDetails.repeat.units.weeks')}</option>
                              <option value="month">{t('dashboard.calendar.eventDetails.repeat.units.months')}</option>
                              <option value="year">year</option>
                            </select>
                          </div>
                          
                          {customRepeatConfig.unit === 'week' && (
                            <>
                              <div className="custom-repeat-subheader">Repeat on:</div>
                              <div className="weekday-selector">
                                {[
                                  { key: 'MON', label: 'M' },
                                  { key: 'TUE', label: 'T' },
                                  { key: 'WED', label: 'W' },
                                  { key: 'THU', label: 'T' },
                                  { key: 'FRI', label: 'F' },
                                  { key: 'SAT', label: 'S' },
                                  { key: 'SUN', label: 'S' }
                                ].map((day) => (
                                  <div
                                    key={day.key}
                                    className={`weekday-button ${customRepeatConfig.days.includes(day.key) ? 'selected' : ''}`}
                                    onClick={() => {
                                      const newDays = customRepeatConfig.days.includes(day.key)
                                        ? customRepeatConfig.days.filter(d => d !== day.key)
                                        : [...customRepeatConfig.days, day.key];
                                      setCustomRepeatConfig({...customRepeatConfig, days: newDays});
                                    }}
                                  >
                                    {day.label}
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                          
                          <div className="custom-repeat-actions">
                            <button onClick={() => setShowCustomRepeat(false)}>Cancel</button>
                            <button 
                              onClick={handleCustomRepeatSave} 
                              className="ok-button"
                              disabled={customRepeatConfig.unit === 'week' && customRepeatConfig.days.length === 0}
                            >
                              OK
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="datetime-column">
                <div className="occurence-row">
                  <span className="datetime-row-label">End</span>
                  <div className="value repeat-section">
                    <div className="end-repeat-display">
                      <span onClick={handleEndRepeatClick} className="repeat-value">
                        {formatEndRepeatText(endRepeatValue, endRepeatCount, repeatValue)}
                      </span>
                      {showEndRepeatDropdown && (
                        <div className="repeat-end-dropdown" onClick={(e) => e.stopPropagation()}>
                          <div 
                            className={`repeat-option ${endRepeatValue === 'Never' ? 'selected' : ''}`}
                            onClick={(e) => handleEndRepeatSelect(e, 'Never')}
                          >
                            {t('dashboard.calendar.eventDetails.repeat.never')}
                          </div>
                          <div 
                            className={`repeat-option ${endRepeatValue === 'After' ? 'selected' : ''}`}
                            onClick={(e) => handleEndRepeatSelect(e, 'After')}
                          >
                            After
                          </div>
                          {showEndRepeatInput && (
                            <div className="end-repeat-input-container">
                              <input
                                type="number"
                                min="1"
                                value={endRepeatCount}
                                onChange={handleEndRepeatCountChange}
                                className="end-repeat-input"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <span>
                                {repeatValue === 'Every Day' ? 'days' :
                                 repeatValue === 'Every Week' ? 'weeks' :
                                 repeatValue === 'Every Month' ? 'months' :
                                 repeatValue.includes('Custom') && repeatValue.includes('week') ? 'weeks' :
                                 repeatValue.includes('Custom') && repeatValue.includes('day') ? 'days' :
                                 repeatValue.includes('Custom') && repeatValue.includes('month') ? 'months' :
                                 'occurrences'}
                              </span>
                            </div>
                          )}
                          <div 
                            className={`repeat-option ${endRepeatValue === 'On Date' ? 'selected' : ''}`}
                            onClick={(e) => handleEndRepeatSelect(e, 'On Date')}
                          >
                            On Date
                          </div>
                          {showEndRepeatDatePicker && (
                            <div className="end-repeat-date-container">
                              <div className="end-repeat-date-parts">
                                <DateTimeValue 
                                  date={endRepeatDate}
                                  type="end"
                                  part="month"
                                  onDateTimeChange={(_, part, value) => handleEndRepeatDateChange(part, value)}
                                  inputDisabled={true}
                                />
                                <DateTimeValue 
                                  date={endRepeatDate}
                                  type="end"
                                  part="day"
                                  onDateTimeChange={(_, part, value) => handleEndRepeatDateChange(part, value)}
                                  inputDisabled={true}
                                />
                                <DateTimeValue 
                                  date={endRepeatDate}
                                  type="end"
                                  part="year"
                                  onDateTimeChange={(_, part, value) => handleEndRepeatDateChange(part, value)}
                                  inputDisabled={true}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`collapsible-section ${expandedSection === 'details' ? 'expanded' : 'collapsed'}`}>
          <div className="section-header" onClick={toggleDetails}>
            <span className="section-header-text">More Details</span>
            <div className={`section-arrow ${expandedSection === 'details' ? 'expanded' : ''}`}>
              <i className="fas fa-chevron-down"></i>
            </div>
          </div>
          
          <div className="section-content">
            <div className="panel-section">
              <DropdownField
                label="Employees"
                placeholder="Add employees"
                options={employeeOptions}
                value={employees}
                onChange={handleEmployeesChange}
                marginBottom="0"
              />
            </div>

            <div className="panel-section">
              <DropdownField
                label="Location"
                placeholder="Add Location"
                options={locationOptions}
                value={location}
                onChange={handleLocationChange}
                marginBottom="0"
              />
            </div>

            <div className="panel-section">
              <div className="notes-section">
                <InputFieldParagraph
                  label="Notes"
                  placeholder="Add notes"
                  value={notes}
                  onChange={handleNotesChange}
                  marginBottom="0"
                />
              </div>
            </div>
          </div>
        </div>

        <button 
          className="delete-button"
          onClick={handleDeleteClick}
          type="button"
        >
          <FaTrash size={12} />
          <span className="delete-button-text">{t('dashboard.calendar.eventDetails.delete')}</span>
        </button>
      </div>
    </div>
  );
};

export default EventPanel;
