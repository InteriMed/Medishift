import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { FiTrash2, FiAlertCircle } from 'react-icons/fi';
import Button from '../../../../components/colorPicker/Button';
import { useDashboard } from '../../../contexts/dashboardContext';
import { useAuth } from '../../../../contexts/authContext';
import BoxedSwitchField from '../../../../components/boxedInputFields/BoxedSwitchField';
import modal from '../../../../components/basemodal/modal';
import EventFormFields from './components/EventFormFields';
import RecurringEventSettings from './components/RecurringEventSettings';
import { useEmployees } from './hooks/useEmployees';
import { useFacilitiesAndOrganizations } from './hooks/useFacilitiesAndOrganizations';
import { useFacilityOpeningHours } from './hooks/useFacilityOpeningHours';
import { formatTimeForInput, parseTimeString, calculateEndDate } from './utils/dateTimeUtils';


const EventPanel = ({
  event,
  onClose,
  onSave,
  onDelete
}) => {
  const mountTimeRef = useRef(Date.now());

  const { t } = useTranslation('calendar');
  const { selectedWorkspace, workspaces } = useDashboard();
  const { currentUser } = useAuth();
  const [, setSearchParams] = useSearchParams();

  const [formData, setFormData] = useState({
    title: '',
    start: new Date(),
    end: new Date(),
    startTime: null,
    endTime: null,
    location: '',
    notes: '',
    showNotes: false,
    employee: '',
    category: 'Schedule',
    facilityId: null,
    organizationId: null,
    isRecurring: false,
    repeatValue: 'Every Week',
    endRepeatValue: 'After',
    endRepeatCount: 10,
    endRepeatDate: null,
    type: 'availability',
    weeklyDays: [false, false, false, false, false, false, false],
    monthlyType: 'day',
    monthlyDay: 1,
    monthlyWeek: 'first',
    monthlyDayOfWeek: 0,
    matchFacilityHours: false,
    matchSchedulePerDay: false,
    dailyScheduleTimes: {
      0: { openingTime: '', closingTime: '' },
      1: { openingTime: '', closingTime: '' },
      2: { openingTime: '', closingTime: '' },
      3: { openingTime: '', closingTime: '' },
      4: { openingTime: '', closingTime: '' },
      5: { openingTime: '', closingTime: '' },
      6: { openingTime: '', closingTime: '' }
    }
  });

  const [validationErrors, setValidationErrors] = useState([]);
  const [isValidating, setIsValidating] = useState(false);

  const { facilities, organizations } = useFacilitiesAndOrganizations(currentUser, workspaces);
  const { employees, loadingEmployees } = useEmployees(formData.facilityId, formData.organizationId, selectedWorkspace);
  const facilityOpeningHours = useFacilityOpeningHours(formData.facilityId);

  const calculatedEndDate = calculateEndDate(formData);

  useEffect(() => {
    if (event) {
      const eventId = event.id || 'new';
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        newParams.set('event', eventId);
        return newParams;
      });
    } else {
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        newParams.delete('event');
        return newParams;
      });
    }
  }, [event, setSearchParams]);

  useEffect(() => {
    return () => {
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        newParams.delete('event');
        return newParams;
      });
    };
  }, [setSearchParams]);
  useEffect(() => {
    if (event && event.start && event.end) {
      const startDate = new Date(event.start);
      const endDate = new Date(event.end);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return;
      }

      const dayOfWeek = startDate.getDay();
      const mondayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const defaultWeeklyDays = [false, false, false, false, false, false, false];
      defaultWeeklyDays[mondayIndex] = true;

      const startTimeStr = formatTimeForInput(startDate);
      const endTimeStr = formatTimeForInput(endDate);

      setFormData({
        id: event.id,
        title: event.title || '',
        start: startDate,
        end: endDate,
        startTime: startTimeStr || null,
        endTime: endTimeStr || null,
        location: event.location || '',
        notes: event.notes || '',
        showNotes: !!event.notes,
        employee: event.employee || '',
        category: event.category || 'Schedule',
        facilityId: event.facilityId || null,
        organizationId: event.organizationId || null,
        isRecurring: event.isRecurring || false,
        repeatValue: event.repeatValue || 'Every Week',
        endRepeatValue: event.endRepeatValue || 'After',
        endRepeatCount: event.endRepeatCount || 10,
        endRepeatDate: event.endRepeatDate ? new Date(event.endRepeatDate) : null,
        type: event.type || 'availability',
        weeklyDays: event.weeklyDays || defaultWeeklyDays,
        monthlyType: event.monthlyType || 'day',
        monthlyDay: event.monthlyDay || startDate.getDate(),
        monthlyWeek: event.monthlyWeek || 'first',
        monthlyDayOfWeek: event.monthlyDayOfWeek !== undefined ? event.monthlyDayOfWeek : mondayIndex,
        matchFacilityHours: event.matchFacilityHours || false,
        matchSchedulePerDay: event.matchSchedulePerDay || false,
        dailyScheduleTimes: event.dailyScheduleTimes || {
          0: { openingTime: '', closingTime: '' },
          1: { openingTime: '', closingTime: '' },
          2: { openingTime: '', closingTime: '' },
          3: { openingTime: '', closingTime: '' },
          4: { openingTime: '', closingTime: '' },
          5: { openingTime: '', closingTime: '' },
          6: { openingTime: '', closingTime: '' }
        }
      });
    } else if (!event) {
      const now = new Date();
      const start = new Date(now);
      start.setMinutes(0, 0, 0);
      start.setSeconds(0, 0);
      const end = new Date(start);
      end.setHours(start.getHours() + 1);
      const dayOfWeek = start.getDay();
      const mondayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const defaultWeeklyDays = [false, false, false, false, false, false, false];
      defaultWeeklyDays[mondayIndex] = true;

      setFormData({
        title: '',
        start,
        end,
        startTime: null,
        endTime: null,
        location: '',
        notes: '',
        employee: '',
        category: 'Schedule',
        facilityId: null,
        organizationId: null,
        isRecurring: false,
        repeatValue: 'Every Week',
        endRepeatValue: 'After',
        endRepeatCount: 10,
        endRepeatDate: null,
        type: 'availability',
        weeklyDays: defaultWeeklyDays,
        monthlyType: 'day',
        monthlyDay: start.getDate(),
        monthlyWeek: 'first',
        monthlyDayOfWeek: mondayIndex,
        matchFacilityHours: false,
        matchSchedulePerDay: false,
        dailyScheduleTimes: {
          0: { openingTime: '', closingTime: '' },
          1: { openingTime: '', closingTime: '' },
          2: { openingTime: '', closingTime: '' },
          3: { openingTime: '', closingTime: '' },
          4: { openingTime: '', closingTime: '' },
          5: { openingTime: '', closingTime: '' },
          6: { openingTime: '', closingTime: '' }
        }
      });
    }
  }, [event]);

  useEffect(() => {
    if (formData.matchFacilityHours && facilityOpeningHours && formData.start) {
      const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const startDate = new Date(formData.start);
      const dayOfWeek = startDate.getDay();
      const dayKey = dayMap[dayOfWeek];
      
      const dayHours = facilityOpeningHours[dayKey];
      
      if (dayHours && dayHours !== 'closed' && dayHours.includes('-')) {
        const [openTime, closeTime] = dayHours.split('-').map(t => t.trim());
        
        setFormData(prev => ({
          ...prev,
          startTime: openTime,
          endTime: closeTime
        }));
      }
    }
  }, [formData.matchFacilityHours, facilityOpeningHours, formData.start]);

  const loadFacilityOpeningHoursForDays = () => {
    if (!facilityOpeningHours) return;

    const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const newDailyTimes = { ...formData.dailyScheduleTimes };

    formData.weeklyDays.forEach((isSelected, dayIndex) => {
      if (isSelected) {
        const dayKey = dayMap[dayIndex];
        const dayHours = facilityOpeningHours[dayKey];

        if (dayHours && dayHours !== 'closed' && dayHours.includes('-')) {
          const [openTime, closeTime] = dayHours.split('-').map(t => t.trim());
          newDailyTimes[dayIndex] = {
            openingTime: openTime,
            closingTime: closeTime
          };
        }
      }
    });

    setFormData(prev => ({
      ...prev,
      dailyScheduleTimes: newDailyTimes
    }));
  };

  const handleDateChange = (field, value) => {
    const key = field === 'startDate' ? 'start' : 'end';
    
    if (!value) {
      const newDate = new Date();
      newDate.setHours(0, 0, 0, 0);
      setFormData(prev => ({ ...prev, [key]: newDate }));
      return;
    }

    const dateValue = value instanceof Date ? value : new Date(value);
    if (isNaN(dateValue.getTime())) {
      return;
    }

    const timeKey = field === 'startDate' ? 'startTime' : 'endTime';
    if (formData[timeKey]) {
      const { hours, minutes } = parseTimeString(formData[timeKey]);
      if (hours !== null && minutes !== null) {
        const newDate = new Date(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate(), hours, minutes);
        if (!isNaN(newDate.getTime())) {
          setFormData(prev => ({ ...prev, [key]: newDate }));
          return;
        }
      }
    }
    
    const newDate = new Date(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate(), 0, 0);
    setFormData(prev => ({ ...prev, [key]: newDate }));
  };

  const handleTimeChange = (field, value) => {
    const key = field === 'startTime' ? 'start' : 'end';
    const current = new Date(formData[key]);

    if (!value || value.trim() === '') {
      setFormData(prev => ({ 
        ...prev, 
        [field]: null,
        [key]: new Date(current.getFullYear(), current.getMonth(), current.getDate(), 0, 0)
      }));
      return;
    }

    const { hours, minutes } = parseTimeString(value);
    if (hours === null || minutes === null) {
      return;
    }

    const newDate = new Date(current.getFullYear(), current.getMonth(), current.getDate(), hours, minutes);
    if (!isNaN(newDate.getTime())) {
      setFormData(prev => ({ ...prev, [key]: newDate, [field]: value }));
    }
  };

  const handleSaveWrapper = () => {
    const timeSinceMount = Date.now() - mountTimeRef.current;

    if (timeSinceMount < 500) {
      return;
    }

    if (formData.end <= formData.start) {
      setValidationErrors(['End time must be after start time']);
      return;
    }
    setIsValidating(true);
    setTimeout(() => {
      onSave({
        ...formData,
        isValidated: true,
        fromDatabase: true,
        color: '#0f54bc',
        color1: '#a8c1ff',
        color2: '#4da6fb'
      }, true);
      setIsValidating(false);
    }, 400);
  };

  const handleClose = () => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.delete('event');
      return newParams;
    });
    onClose();
  };

  return (
    <modal
      isOpen={true}
      onClose={handleClose}
      title="Title"
      size={formData.isRecurring ? 'xlarge' : 'small'}
      closeOnBackdropClick={true}
      actions={
        <div className="flex items-center justify-between w-full gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('cancel', 'Cancel')}
          </button>
          <div className="flex items-center gap-3 flex-1 justify-center">
            {event && event.id && onDelete && (
              <Button
                onClick={onDelete}
                variant="danger"
                type="button"
              >
                <FiTrash2 className="w-4 h-4" />
                {t('delete', 'Delete')}
              </Button>
            )}
          </div>
          <button
            onClick={handleSaveWrapper}
            disabled={isValidating}
            className="px-6 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-all hover:shadow-md active:scale-95 disabled:opacity-70 disabled:pointer-events-none flex items-center gap-2"
          >
            {isValidating && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {t('save', 'Save Event')}
          </button>
        </div>
      }
    >
      {validationErrors.length > 0 && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <FiAlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-bold text-sm mb-1 text-red-800">Validation Errors</h4>
              {validationErrors.map((err, i) => (
                <div key={i} className="text-sm text-red-700">{err}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {formData.isRecurring ? (
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <EventFormFields
                formData={formData}
                onFormDataChange={setFormData}
                employees={employees}
                loadingEmployees={loadingEmployees}
                facilities={facilities}
                organizations={organizations}
                selectedWorkspace={selectedWorkspace}
                handleDateChange={handleDateChange}
                handleTimeChange={handleTimeChange}
                showNotesSection={false}
              />

              <BoxedSwitchField
                label={t('recurringEvent', 'Repeat this event')}
                checked={formData.isRecurring}
                onChange={(checked) => setFormData(p => ({ ...p, isRecurring: checked }))}
              />
            </div>

            <RecurringEventSettings
              formData={formData}
              onFormDataChange={setFormData}
              calculatedEndDate={calculatedEndDate}
              selectedWorkspace={selectedWorkspace}
              onLoadFacilityOpeningHours={loadFacilityOpeningHoursForDays}
              isCompact={false}
            />
          </div>
        ) : (
          <>
            <EventFormFields
              formData={formData}
              onFormDataChange={setFormData}
              employees={employees}
              loadingEmployees={loadingEmployees}
              facilities={facilities}
              organizations={organizations}
              selectedWorkspace={selectedWorkspace}
              handleDateChange={handleDateChange}
              handleTimeChange={handleTimeChange}
              showNotesSection={true}
            />

            <BoxedSwitchField
              label={t('recurringEvent', 'Repeat this event')}
              checked={formData.isRecurring}
              onChange={(checked) => setFormData(p => ({ ...p, isRecurring: checked }))}
            />

            {formData.isRecurring && (
              <RecurringEventSettings
                formData={formData}
                onFormDataChange={setFormData}
                calculatedEndDate={calculatedEndDate}
                selectedWorkspace={selectedWorkspace}
                onLoadFacilityOpeningHours={loadFacilityOpeningHoursForDays}
                isCompact={true}
              />
            )}
          </>
        )}
      </div>
    </modal>
  );
};

export default EventPanel;