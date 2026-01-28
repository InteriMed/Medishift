import React from 'react';
import { useTranslation } from 'react-i18next';
import { FiCalendar } from 'react-icons/fi';
import SimpleDropdown from '../../../../../components/boxedInputFields/dropdownField';
import PersonnalizedInputField from '../../../../../components/boxedInputFields/personnalizedInputField';
import InputField from '../../../../../components/boxedInputFields/personnalizedInputField';
import DateField from '../../../../../components/BoxedInputFields/DateField';
import WeekDaySelector from '../../../../../components/colorPicker/WeekDaySelector';
import BoxedSwitchField from '../../../../../components/BoxedInputFields/BoxedSwitchField';
import { cn } from '../../../../../utils/cn';

const Label = ({ children }) => (
  <label className="text-sm font-medium text-muted-foreground mb-1.5">{children}</label>
);

const RecurringEventSettings = ({
  formData,
  onFormDataChange,
  calculatedEndDate,
  selectedWorkspace,
  onLoadFacilityOpeningHours,
  isCompact = false
}) => {
  const { t, i18n } = useTranslation('calendar');

  const getFullDayNames = (language) => {
    const mondayDate = new Date(2000, 0, 3);
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(mondayDate);
      date.setDate(mondayDate.getDate() + i);
      return date.toLocaleString(language, { weekday: 'long' });
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    onFormDataChange(prev => ({ ...prev, [name]: value }));
  };

  const containerClass = isCompact 
    ? "pl-4 pr-4 py-4 rounded-lg border border-border bg-muted/5 space-y-4 animate-in slide-in-from-top-2 duration-200"
    : "space-y-5 bg-gradient-to-br from-primary/8 via-primary/5 to-primary/8 border-2 border-primary/25 p-6 rounded-xl shadow-lg backdrop-blur-sm";

  return (
    <div className={containerClass}>
      <div className="grid grid-cols-2 gap-4">
        <SimpleDropdown
          label="Repeat"
          options={[
            { value: 'Every Day', label: 'Every Day' },
            { value: 'Every Week', label: 'Every Week' },
            { value: 'Every Month', label: 'Every Month' }
          ]}
          value={formData.repeatValue}
          onChange={(value) => onFormDataChange(prev => ({ ...prev, repeatValue: value }))}
          placeholder="Select repeat"
        />

        <SimpleDropdown
          label="End Repeat"
          options={[
            { value: 'After', label: 'After' },
            { value: 'On Date', label: 'On Date' },
            { value: 'Never', label: 'Never' }
          ]}
          value={formData.endRepeatValue}
          onChange={(value) => onFormDataChange(prev => ({ ...prev, endRepeatValue: value }))}
          placeholder="Select end repeat"
        />
      </div>

      {formData.repeatValue === 'Every Week' && (
        <div className="space-y-2 pt-2">
          <WeekDaySelector
            selectedDays={formData.weeklyDays}
            onChange={(days) => onFormDataChange(p => ({ ...p, weeklyDays: days }))}
          />
          
          {!isCompact && formData.weeklyDays.some(day => day) && (
            <BoxedSwitchField
              label={selectedWorkspace?.type === 'personal' 
                ? t('matchPreferences', 'Match schedule to preferences for each day')
                : t('matchOpeningHours', 'Match schedule to opening hours for each day')}
              checked={formData.matchSchedulePerDay}
              onChange={(checked) => {
                onFormDataChange(p => ({ ...p, matchSchedulePerDay: checked }));
                if (checked && selectedWorkspace?.type !== 'personal') {
                  onLoadFacilityOpeningHours?.();
                }
              }}
            />
          )}

          {!isCompact && formData.matchSchedulePerDay && formData.weeklyDays.some(day => day) && (
            <div className="space-y-3 pl-4 pt-2 border-l-2 border-primary/20">
              {formData.weeklyDays.map((isSelected, dayIndex) => {
                if (!isSelected) return null;
                const dayName = getFullDayNames(i18n.language)[dayIndex];
                return (
                  <div key={dayIndex} className="space-y-2">
                    <div className="text-sm font-medium text-foreground">{dayName}</div>
                    <div className="grid grid-cols-2 gap-2">
                      <InputField
                        label={t('startTime', 'Start Time')}
                        type="time"
                        value={formData.dailyScheduleTimes[dayIndex]?.openingTime || ''}
                        onChange={(e) => onFormDataChange(p => ({
                          ...p,
                          dailyScheduleTimes: {
                            ...p.dailyScheduleTimes,
                            [dayIndex]: {
                              ...p.dailyScheduleTimes[dayIndex],
                              openingTime: e.target.value
                            }
                          }
                        }))}
                        marginBottom="0"
                      />
                      <InputField
                        label={t('endTime', 'End Time')}
                        type="time"
                        value={formData.dailyScheduleTimes[dayIndex]?.closingTime || ''}
                        onChange={(e) => onFormDataChange(p => ({
                          ...p,
                          dailyScheduleTimes: {
                            ...p.dailyScheduleTimes,
                            [dayIndex]: {
                              ...p.dailyScheduleTimes[dayIndex],
                              closingTime: e.target.value
                            }
                          }
                        }))}
                        marginBottom="0"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {formData.repeatValue === 'Every Month' && (
        <div className="space-y-4 pt-2">
          <SimpleDropdown
            label="Repeat on"
            options={[
              { value: 'day', label: 'Day of month' },
              { value: 'weekday', label: 'Day of week' }
            ]}
            value={formData.monthlyType}
            onChange={(value) => onFormDataChange(prev => ({ ...prev, monthlyType: value }))}
            placeholder="Select type"
          />

          {formData.monthlyType === 'day' && (
            <PersonnalizedInputField
              label="Day number"
              name="monthlyDay"
              type="number"
              value={formData.monthlyDay}
              onChange={handleChange}
              min="1"
              max="31"
            />
          )}

          {formData.monthlyType === 'weekday' && (
            <div className="grid grid-cols-2 gap-4">
              <SimpleDropdown
                label="Week"
                options={[
                  { value: 'first', label: 'First' },
                  { value: 'second', label: 'Second' },
                  { value: 'third', label: 'Third' },
                  { value: 'fourth', label: 'Fourth' },
                  { value: 'last', label: 'Last' }
                ]}
                value={formData.monthlyWeek}
                onChange={(value) => onFormDataChange(prev => ({ ...prev, monthlyWeek: value }))}
                placeholder="Select week"
              />
              <div className="">
                <Label>Day of week</Label>
                <div className="flex flex-wrap gap-2">
                  {getFullDayNames(i18n.language).map((dayName, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => onFormDataChange(p => ({ ...p, monthlyDayOfWeek: index }))}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
                        "border border-input hover:bg-muted",
                        formData.monthlyDayOfWeek === index
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground"
                      )}
                    >
                      {dayName}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {(formData.endRepeatValue === 'After' || formData.endRepeatValue === 'On Date') && (
        <div className={`gap-4 pt-2 ${isCompact ? 'grid grid-cols-2' : 'grid grid-cols-2'}`}>
          {formData.endRepeatValue === 'After' && (
            <PersonnalizedInputField
              label="Number of occurrences"
              name="endRepeatCount"
              type="number"
              value={formData.endRepeatCount}
              onChange={handleChange}
              min="1"
              max="365"
            />
          )}

          {formData.endRepeatValue === 'On Date' && (
            <DateField
              label="End Date"
              value={formData.endRepeatDate}
              onChange={(value) => onFormDataChange(prev => ({ ...prev, endRepeatDate: value }))}
              marginBottom="0"
            />
          )}
        </div>
      )}

      {calculatedEndDate && (
        <div className="flex items-center gap-2.5 p-4 rounded-lg bg-primary/10 border border-primary/30 backdrop-blur-sm">
          <div className="p-1.5 rounded-md bg-primary/20">
            <FiCalendar className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
              {t('calculatedEndDate', 'Calculated end date')}
            </div>
            <div className="text-sm font-semibold text-foreground">
              {calculatedEndDate.toLocaleDateString(i18n.language, { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecurringEventSettings;

