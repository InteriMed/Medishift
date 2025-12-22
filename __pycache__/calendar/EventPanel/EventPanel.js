import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FiX, FiTrash2, FiClock, FiMapPin, FiFileText, FiRepeat, FiChevronDown, FiUser, FiCalendar } from 'react-icons/fi';
import { formatTime, formatDate } from '../utils/dateHelpers';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth } from 'firebase/auth';
import { useDashboard } from '../../../contexts/DashboardContext';
import styles from './eventPanel.module.css';

// Initialize Firebase functions
const functions = getFunctions();

// Define EVENT_TYPES according to workspace specification
const getEventTypesForWorkspace = (workspaceType, userRole, t) => {
  console.log('getEventTypesForWorkspace called with:', { workspaceType, userRole });
  
  // For personal workspace, only show availability
  if (workspaceType === 'personal') {
    console.log('Personal workspace: returning only availability');
    
    // Only return availability for personal workspace
    const availabilityLabel = t('eventTypeLabels.availability', 'Availability');
    
    const eventTypesArray = [{
      id: 'availability',
      label: availabilityLabel,
      workspace: workspaceType,
      role: userRole,
      targetCollection: 'professionalAvailabilities'
    }];
    
    console.log('Final personal event types array (availability only):', eventTypesArray);
    return eventTypesArray;
  }
  
  // For team workspace, filter by user role
  if (workspaceType === 'team') {
    const eventTypesKey = 'eventTypes.team';
    console.log('Using translation key:', eventTypesKey);
    
    const allTeamEventTypes = t(eventTypesKey, { returnObjects: true });
    console.log('All team event types from translations:', allTeamEventTypes);
    
    // Map admin role to manager role for event type filtering
    const effectiveRole = userRole === 'admin' ? 'manager' : userRole;
    console.log('Effective role for filtering:', effectiveRole);
    
    // Define which event types are available for each role
    const employeeEventTypes = ['timeOffRequest', 'shiftExchangeRequest', 'meeting'];
    const managerEventTypes = ['timeOffForEmployee', 'requestInterim', 'subletTeamMember', 'createTeamShift', 'meeting'];
    
    // Determine which event types to show based on role
    let allowedEventTypes;
    if (effectiveRole === 'employee') {
      allowedEventTypes = employeeEventTypes;
    } else if (effectiveRole === 'manager') {
      allowedEventTypes = managerEventTypes;
    } else {
      // Default to employee types for unknown roles
      allowedEventTypes = employeeEventTypes;
    }
    
    console.log('Allowed event types for role', effectiveRole, ':', allowedEventTypes);
    
    const eventTypesArray = [];
    if (typeof allTeamEventTypes === 'object') {
      Object.entries(allTeamEventTypes).forEach(([key, label]) => {
        // Only include event types that are allowed for this role
        if (allowedEventTypes.includes(key)) {
          let targetCollection = null;
          
          // Map event types to their target collections
          if (key === 'timeOffRequest') targetCollection = 'timeOffRequests';
          else if (key === 'timeOffForEmployee') targetCollection = 'timeOffRequests';
          else if (key === 'requestInterim') targetCollection = 'positions';
          else if (key === 'subletTeamMember') targetCollection = 'teamSchedules';
          else if (key === 'createTeamShift') targetCollection = 'teamSchedules';
          else if (key === 'shiftExchangeRequest') targetCollection = 'teamSchedules';
          
          eventTypesArray.push({
            id: key,
            label: label,
            workspace: workspaceType,
            role: effectiveRole,
            targetCollection: targetCollection
          });
        }
      });
    }
    
    console.log('Final team event types array for role', effectiveRole, ':', eventTypesArray);
    return eventTypesArray;
  }
  
  // Fallback to empty array
  console.log('No matching workspace type, returning empty array');
  return [];
};

const EventPanel = ({ 
  event, 
  onClose, 
  onSave, 
  onDelete,
  colorOptions,
  userData,
  workspaceContext = { type: 'personal' } // Add workspace context
}) => {
  const { t } = useTranslation('calendar');
  const { selectedWorkspace } = useDashboard();
  
  const [formData, setFormData] = useState({
    title: '',
    start: new Date(2024, 0, 1, 9, 0, 0, 0),
    end: new Date(2024, 0, 1, 10, 0, 0, 0),
    location: '',
    notes: '',
    employee: '', // Add employee field for team workspace manager events
    isRecurring: false,
    customRepeatConfig: {
      frequency: 1,
      unit: 'week',
      days: ['MON']
    },
    endRepeatDate: new Date(2024, 1, 1),
    type: 'availability'
  });
  
  const [showRecurringOptions, setShowRecurringOptions] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [isValidating, setIsValidating] = useState(false);
  
  // Debug workspace context
  useEffect(() => {
    console.log('EventPanel workspaceContext:', workspaceContext);
    console.log('EventPanel selectedWorkspace:', selectedWorkspace);
    console.log('Available event types:', getAvailableEventTypes());
  }, [workspaceContext, selectedWorkspace]);
  
  // Get available event types based on workspace context
  const getAvailableEventTypes = () => {
    console.log('Getting event types for workspace:', workspaceContext.type, 'role:', workspaceContext.role);
    const types = getEventTypesForWorkspace(workspaceContext.type, workspaceContext.role, t);
    console.log('Filtered event types:', types);
    return types;
  };

  // Get default event type for workspace
  const getDefaultEventType = () => {
    const availableTypes = getAvailableEventTypes();
    return availableTypes.length > 0 ? availableTypes[0].id : 'availability';
  };

  // Generate default title based on event type
  const getDefaultTitle = (eventType) => {
    return t(`eventTypeLabels.${eventType}`, eventType);
  };

  // Initialize form data from event
  useEffect(() => {
    if (event) {
      setFormData({
        id: event.id,
        title: event.title || getDefaultTitle(event.type || getDefaultEventType()),
        start: new Date(event.start),
        end: new Date(event.end),
        color: event.color || colorOptions[0].color,
        color1: event.color1 || colorOptions[0].color1,
        location: event.location || getDefaultLocation(),
        notes: event.notes || '',
        employee: event.employee || '',
        isRecurring: event.isRecurring || false,
        customRepeatConfig: event.customRepeatConfig || {
          frequency: 1,
          unit: 'week',
          days: ['MON']
        },
        endRepeatDate: event.endRepeatDate ? new Date(event.endRepeatDate) : new Date(2024, 1, 1),
        type: event.type || getDefaultEventType()
      });
      
      if (event.isRecurring) {
        setShowRecurringOptions(true);
      }
    } else {
      const start = event && event.start ? new Date(event.start) : new Date(2024, 0, 1, 9, 0, 0, 0);
      const end = event && event.end ? new Date(event.end) : new Date(2024, 0, 1, 10, 0, 0, 0);
      const defaultEndRepeatDate = new Date(2024, 1, 1);
      const defaultType = getDefaultEventType();
      
      setFormData({
        title: getDefaultTitle(defaultType),
        start,
        end,
        color: colorOptions[0].color,
        color1: colorOptions[0].color1,
        location: getDefaultLocation(),
        notes: '',
        employee: '',
        isRecurring: false,
        customRepeatConfig: {
          frequency: 1,
          unit: 'week',
          days: ['MON']
        },
        endRepeatDate: defaultEndRepeatDate,
        type: defaultType
      });
    }
  }, [event, colorOptions, workspaceContext, t, selectedWorkspace]);

  // Handle text input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear validation errors when user makes changes
    setValidationErrors([]);
    setConflicts([]);
  };

  // Handle type change
  const handleTypeChange = (e) => {
    const { value } = e.target;
    const updatedFormData = {
      ...formData,
      type: value,
      title: getDefaultTitle(value) // Auto-update title when type changes
    };
    
    // Clear employee field if it should not be shown for this event type
    const willShowEmployeeField = (
      workspaceContext.type === 'team' && 
      (workspaceContext.role === 'manager' || workspaceContext.role === 'admin') &&
      value !== 'requestInterim'
    );
    
    if (!willShowEmployeeField) {
      updatedFormData.employee = '';
    }
    
    setFormData(updatedFormData);
  };

  // Handle checkbox changes
  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    
    const updatedFormData = { ...formData };
    updatedFormData[name] = checked;
    
    if (name === 'isRecurring') {
      setShowRecurringOptions(checked);
      
      if (checked) {
        const startDayIndex = formData.start.getDay();
        const dayMap = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        const startDayString = dayMap[startDayIndex];
        
        updatedFormData.customRepeatConfig = {
          ...formData.customRepeatConfig,
          days: [startDayString],
          frequency: 1,
          unit: 'week'
        };
      }
    }
    
    setFormData(updatedFormData);
    e.stopPropagation();
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
    } else if (field === 'endRepeatDate') {
      const date = new Date(value);
      
      setFormData(prev => ({
        ...prev,
        endRepeatDate: date
      }));
    }
  };

  // Handle custom repeat frequency change
  const handleFrequencyChange = (value) => {
    const frequency = parseInt(value, 10);
    if (isNaN(frequency)) return;
    
    const updatedConfig = {
      ...formData.customRepeatConfig,
      frequency
    };
    
    setFormData(prev => ({
      ...prev,
      customRepeatConfig: updatedConfig
    }));
  };

  // Handle day selection in custom repeat
  const handleDaySelect = (day) => {
    const currentDays = [...formData.customRepeatConfig.days];
    const index = currentDays.indexOf(day);
    
    if (index === -1) {
      currentDays.push(day);
    } else {
      currentDays.splice(index, 1);
    }
    
    if (currentDays.length === 0) {
      return;
    }
    
    const updatedConfig = {
      ...formData.customRepeatConfig,
      days: currentDays
    };
    
    setFormData(prev => ({
      ...prev,
      customRepeatConfig: updatedConfig
    }));
  };

  // Format custom repeat value for display
  const formatCustomRepeatValue = () => {
    const { frequency, unit, days } = formData.customRepeatConfig;
    
    if (unit === 'week') {
      const weekdays = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
      const weekend = ['SAT', 'SUN'];
      
      if (days.length === 7) {
        return `Every ${frequency} ${frequency > 1 ? 'weeks' : 'week'} on every day`;
      } else if (weekdays.every(day => days.includes(day)) && 
                !weekend.some(day => days.includes(day))) {
        return `Every ${frequency} ${frequency > 1 ? 'weeks' : 'week'} on weekdays`;
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
        
        const formattedDays = days
          .sort((a, b) => {
            const dayOrder = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
            return dayOrder.indexOf(a) - dayOrder.indexOf(b);
          })
          .map(day => dayNames[day])
          .join(', ');
        
        return `Every ${frequency} ${frequency > 1 ? 'weeks' : 'week'} on ${formattedDays}`;
      }
    } else {
      return `Every ${frequency} ${frequency > 1 ? `${unit}s` : unit}`;
    }
  };

  // Validate event against database
  const validateEvent = async (eventData) => {
    console.log('EventPanel: validateEvent called with:', eventData);
    
    try {
      setIsValidating(true);
      const auth = getAuth();
      
      if (!auth.currentUser) {
        console.error('EventPanel: User not authenticated');
        throw new Error('User not authenticated');
      }

      console.log('EventPanel: User authenticated, preparing validation data');

      const validationData = {
        workspaceContext: workspaceContext,
        eventType: eventData.type,
        eventData: {
          startTime: eventData.start.toISOString(),
          endTime: eventData.end.toISOString(),
          title: eventData.title,
          notes: eventData.notes,
          location: eventData.location
        },
        targetUserId: auth.currentUser.uid,
        recurrenceSettings: eventData.isRecurring ? {
          isRecurring: true,
          repeatValue: formatCustomRepeatValue(),
          endRepeatValue: 'On Date',
          endRepeatDate: eventData.endRepeatDate.toISOString()
        } : null
      };

      console.log('EventPanel: Calling checkAndCreateEventHTTP API with:', validationData);

      // Get the current user's ID token for authentication
      const idToken = await auth.currentUser.getIdToken();

      // Call the function as an HTTP request
      const response = await fetch('https://us-central1-medishift.cloudfunctions.net/checkAndCreateEventHTTP', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(validationData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      console.log('EventPanel: API response:', result);
      
      if (result.success) {
        console.log('EventPanel: API returned success');
        return { success: true, data: result };
      } else if (result.error === 'conflict') {
        console.log('EventPanel: API returned conflicts');
        setConflicts(result.conflicts || []);
        return { success: false, error: 'conflicts', conflicts: result.conflicts };
      } else {
        console.error('EventPanel: API returned error:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('EventPanel: Validation error:', error);
      return { success: false, error: error.message || 'Unknown error occurred' };
    } finally {
      setIsValidating(false);
    }
  };

  // Handle save with validation
  const handleSave = async () => {
    console.log('EventPanel: handleSave called with formData:', formData);
    console.log('EventPanel: event prop:', event);
    
    // Basic validation
    const errors = [];
    
    if (formData.end <= formData.start) {
      errors.push('End time must be after start time');
    }
    
    // Validate required employee field
    if (shouldShowEmployeeField() && !formData.employee.trim()) {
      errors.push('Employee is required');
    }
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Ensure title is set to default if empty
    const finalFormData = {
      ...formData,
      title: formData.title.trim() || getDefaultTitle(formData.type)
    };

    console.log('EventPanel: Final form data prepared:', finalFormData);

    // Check if this is a real existing event from database or a temporary event
    const isRealExistingEvent = event && event.id && (event.fromDatabase === true || event.isFromDatabase === true);
    
    console.log('EventPanel: isRealExistingEvent:', isRealExistingEvent);

    // For real existing events from database, save directly (edit mode)
    if (isRealExistingEvent) {
      console.log('EventPanel: Updating existing database event');
      if (finalFormData.isRecurring) {
        finalFormData.repeatValue = formatCustomRepeatValue();
      } else {
        finalFormData.repeatValue = 'None';
      }
      
      onSave(finalFormData);
      return;
    }

    // For new events (including temporary events with IDs), validate against database first
    console.log('EventPanel: Creating new event, starting validation...');
    try {
      const validationResult = await validateEvent(finalFormData);
      console.log('EventPanel: Validation result:', validationResult);
      
      if (validationResult.success) {
        console.log('EventPanel: Validation successful, calling onSave with database result');
        // Event created successfully via validation function
        onSave({ 
          ...finalFormData, 
          id: validationResult.data.id,
          fromDatabase: true 
        });
        onClose();
      } else if (validationResult.error === 'conflicts') {
        console.log('EventPanel: Conflicts detected:', validationResult.conflicts);
        // Show conflicts to user - they can choose to continue or cancel
        setValidationErrors([`Conflicts detected with ${validationResult.conflicts.length} existing events`]);
      } else {
        console.error('EventPanel: Validation failed with error:', validationResult.error);
        setValidationErrors([validationResult.error || 'Failed to create event']);
      }
    } catch (error) {
      console.error('EventPanel: Exception during validation:', error);
      setValidationErrors([error.message || 'Failed to create event']);
    }
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

  // Helper function to determine if employee field should be shown
  const shouldShowEmployeeField = () => {
    // Show for team workspace, non-employee roles, and all event types except Request Interim
    return (
      workspaceContext.type === 'team' && 
      (workspaceContext.role === 'manager' || workspaceContext.role === 'admin') &&
      formData.type !== 'requestInterim'
    );
  };

  // Helper function to determine if location field should be shown
  const shouldShowLocationField = () => {
    // Only show for team workspace
    return workspaceContext.type === 'team';
  };

  // Helper function to get default location for team workspace
  const getDefaultLocation = () => {
    if (workspaceContext.type === 'team' && selectedWorkspace) {
      // Use the actual workspace name, removing "Team Workspace" suffix if present
      let locationName = selectedWorkspace.name || 'Pharmacy';
      if (locationName.includes(' - Team Workspace')) {
        locationName = locationName.replace(' - Team Workspace', '');
      }
      return locationName;
    }
    return '';
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div 
        className={styles.panel} 
        onClick={(e) => {
          console.log('EventPanel clicked:', e.target);
          e.stopPropagation();
        }} 
        data-event-panel="true"
      >
        <div className={styles.header}>
          <h3 className={styles.title}>
            {event && event.id 
              ? t('editEvent') 
              : t('createEvent')
            }
          </h3>
        </div>
        
        {/* Show validation errors */}
        {validationErrors.length > 0 && (
          <div className={styles.errorContainer}>
            {validationErrors.map((error, index) => (
              <div key={index} className={styles.errorMessage}>{error}</div>
            ))}
          </div>
        )}

        {/* Show conflicts */}
        {conflicts.length > 0 && (
          <div className={styles.conflictsContainer}>
            <h4>Conflicting Events:</h4>
            {conflicts.map((conflict, index) => (
              <div key={index} className={styles.conflictItem}>
                {conflict.summary}
              </div>
            ))}
          </div>
        )}
        
        <div className={styles.content}>
          {/* Two-column layout for desktop */}
          <div className={styles.formGrid}>
            {/* Left Column */}
            <div className={styles.leftColumn}>
              {/* Event Type Dropdown */}
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <FiFileText className={styles.sectionIcon} />
                  <h4 className={styles.sectionTitle}>{t('fields.eventType')}</h4>
                </div>
                <div className={styles.sectionContent}>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleTypeChange}
                    className={styles.select}
                  >
                    {getAvailableEventTypes().map(type => (
                      <option key={type.id} value={type.id}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Date and time */}
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <FiClock className={styles.sectionIcon} />
                  <h4 className={styles.sectionTitle}>{t('selectDate')}</h4>
                </div>
                <div className={styles.sectionContent}>
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
              </div>
              
              {/* Location */}
              {shouldShowLocationField() && (
                <div className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <FiMapPin className={styles.sectionIcon} />
                    <h4 className={styles.sectionTitle}>{t('location')}</h4>
                  </div>
                  <div className={styles.sectionContent}>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      placeholder={t('location')}
                      className={styles.input}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className={styles.rightColumn}>
              {/* Employee - moved here and made compulsory */}
              {shouldShowEmployeeField() && (
                <div className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <FiUser className={styles.sectionIcon} />
                    <h4 className={styles.sectionTitle}>{t('fields.employee')} *</h4>
                  </div>
                  <div className={styles.sectionContent}>
                    <input
                      type="text"
                      name="employee"
                      value={formData.employee}
                      onChange={handleChange}
                      placeholder={t('fields.employee')}
                      className={styles.input}
                      required
                    />
                  </div>
                </div>
              )}

              {/* Recurring options - moved before notes */}
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <FiRepeat className={styles.sectionIcon} />
                  <h4 className={styles.sectionTitle}>{t('isRecurring')}</h4>
                </div>
                <div className={styles.sectionContent}>
                  <div className={styles.recurringOptions}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        name="isRecurring"
                        checked={formData.isRecurring}
                        onChange={handleCheckboxChange}
                        className={styles.checkbox}
                      />
                      <span>{t('isRecurring')}</span>
                    </label>
                    
                    {showRecurringOptions && (
                      <div className={styles.recurringDetails}>
                        <div className={styles.customRepeat}>
                          <div className={styles.frequencySelection}>
                            <select
                              value={formData.customRepeatConfig.frequency}
                              onChange={(e) => handleFrequencyChange(e.target.value)}
                              className={styles.select}
                            >
                              <option value="1">Every week</option>
                              <option value="2">Every 2 weeks</option>
                              <option value="3">Every 3 weeks</option>
                              <option value="4">Every 4 weeks</option>
                            </select>
                          </div>
                          
                          <div className={styles.daySelector}>
                            <div className={styles.daySelectionLabel}>Repeat on:</div>
                            <div className={styles.dayButtons}>
                              {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => (
                                <button
                                  key={day}
                                  type="button"
                                  className={`${styles.dayButton} ${formData.customRepeatConfig.days.includes(day) ? styles.selected : ''}`}
                                  onClick={() => handleDaySelect(day)}
                                >
                                  {day.charAt(0)}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <div className={styles.endRepeatSection}>
                          <div className={styles.endRepeatLabel}>End repeat:</div>
                          <input
                            type="date"
                            value={formatDateForInput(formData.endRepeatDate)}
                            onChange={(e) => handleDateTimeChange('endRepeatDate', e.target.value)}
                            className={styles.dateInput}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes - moved after repeat */}
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <FiFileText className={styles.sectionIcon} />
                  <h4 className={styles.sectionTitle}>{t('notes')}</h4>
                </div>
                <div className={styles.sectionContent}>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder={t('notes')}
                    className={styles.textareaInput}
                    rows={4}
                  />
                </div>
              </div>
            </div>
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
              <span>{t('deleteEvent')}</span>
            </button>
          )}
          
          <div className={styles.actionButtons}>
            <button 
              className={styles.cancelButton}
              onClick={onClose}
              type="button"
            >
              {t('cancel')}
            </button>
            <button 
              className={styles.saveButton}
              onClick={handleSave}
              type="button"
              disabled={isValidating}
            >
              {isValidating ? 'Validating...' : t('save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventPanel; 