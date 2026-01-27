import React, { useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FiInfo } from 'react-icons/fi';

import InputField from '../../../../../components/BoxedInputFields/Personnalized-InputField';
import BoxedSwitchField from '../../../../../components/BoxedInputFields/BoxedSwitchField';
import CheckboxField from '../../../../../components/BoxedInputFields/CheckboxField';

const styles = {
  sectionContainer: "flex flex-col gap-4 w-full",
  infoBox: "flex items-start gap-3 p-4 rounded-xl border bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 mb-4",
  infoIcon: "flex-shrink-0 mt-0.5",
  infoIconStyle: { color: '#3b82f6', width: '18px', height: '18px' },
  infoText: "text-sm",
  infoTextStyle: { color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  openingHoursGrid: "grid grid-cols-1 md:grid-cols-2 gap-4",
  dayRow: "flex flex-col gap-3",
  timeInputsRow: "flex items-end gap-2",
  timeInputWrapper: "flex-1 min-w-0",
  allDayCheckbox: "ml-2"
};

const DAYS_OF_WEEK = [
  { key: 'monday', labelKey: 'preferenceDays.monday' },
  { key: 'tuesday', labelKey: 'preferenceDays.tuesday' },
  { key: 'wednesday', labelKey: 'preferenceDays.wednesday' },
  { key: 'thursday', labelKey: 'preferenceDays.thursday' },
  { key: 'friday', labelKey: 'preferenceDays.friday' },
  { key: 'saturday', labelKey: 'preferenceDays.saturday' },
  { key: 'sunday', labelKey: 'preferenceDays.sunday' }
];

const PreferenceDays = ({
  formData,
  onInputChange,
  getNestedValue,
  errors
}) => {
  const { t } = useTranslation(['dashboardProfile', 'common']);

  const preferenceDays = useMemo(() => {
    const days = getNestedValue(formData, 'platformSettings.preferenceDays') || {};
    return DAYS_OF_WEEK.map(day => {
      const dayValue = days[day.key] || {};
      const isAvailable = dayValue.available !== false;
      const isAllDay = dayValue.allDay === true;
      let startTime = dayValue.startTime || '08:00';
      let endTime = dayValue.endTime || '18:00';

      return {
        ...day,
        isAvailable,
        isAllDay,
        startTime,
        endTime
      };
    });
  }, [formData, getNestedValue]);

  const handleDayChange = useCallback((dayKey, field, value) => {
    const currentDays = getNestedValue(formData, 'platformSettings.preferenceDays') || {};
    const currentDayData = currentDays[dayKey] || {};

    let newDayData = { ...currentDayData };

    if (field === 'isAvailable') {
      newDayData = {
        available: value,
        allDay: currentDayData.allDay || false,
        startTime: currentDayData.startTime || '08:00',
        endTime: currentDayData.endTime || '18:00'
      };
    } else if (field === 'isAllDay') {
      newDayData = {
        ...currentDayData,
        available: true,
        allDay: value
      };
    } else if (field === 'startTime' || field === 'endTime') {
      newDayData = {
        ...currentDayData,
        available: true,
        [field]: value
      };
    }

    const updatedDays = {
      ...currentDays,
      [dayKey]: newDayData
    };

    onInputChange('platformSettings.preferenceDays', updatedDays);
  }, [formData, onInputChange, getNestedValue]);

  return (
    <div className={styles.sectionContainer}>
      <div className={styles.infoBox}>
        <FiInfo className={styles.infoIcon} style={styles.infoIconStyle} />
        <p className={styles.infoText} style={styles.infoTextStyle}>
          {t('preferenceDays.hint', 'These preferences will be applied to marketplace searches and will be visible to facility managers when they review your profile.')}
        </p>
      </div>

      <div className={styles.openingHoursGrid}>
        {preferenceDays.map(day => {
          const dayError = getNestedValue(errors, `platformSettings.preferenceDays.${day.key}`);

          const handleSwitchChange = (checked) => {
            handleDayChange(day.key, 'isAvailable', checked);
          };

          return (
            <div key={day.key} className={styles.dayRow}>
              <BoxedSwitchField
                label={t(day.labelKey, day.key)}
                checked={day.isAvailable}
                onChange={handleSwitchChange}
                error={dayError}
                marginBottom={day.isAvailable ? "12px" : "0"}
              />
              {day.isAvailable && (
                <>
                  <div className={styles.allDayCheckbox}>
                    <CheckboxField
                      label={t('preferenceDays.allDay', 'All day')}
                      checked={day.isAllDay}
                      onChange={(checked) => handleDayChange(day.key, 'isAllDay', checked)}
                      marginBottom="12px"
                    />
                  </div>
                  {!day.isAllDay && (
                    <div className={styles.timeInputsRow}>
                      <div className={styles.timeInputWrapper}>
                        <InputField
                          label={t('preferenceDays.startTime', 'Start Time')}
                          type="time"
                          value={day.startTime}
                          onChange={(e) => handleDayChange(day.key, 'startTime', e.target.value)}
                          error={dayError}
                          marginBottom="0"
                        />
                      </div>
                      <span className="text-sm font-medium mb-2" style={{ color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>-</span>
                      <div className={styles.timeInputWrapper}>
                        <InputField
                          label={t('preferenceDays.endTime', 'End Time')}
                          type="time"
                          value={day.endTime}
                          onChange={(e) => handleDayChange(day.key, 'endTime', e.target.value)}
                          error={dayError}
                          marginBottom="0"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PreferenceDays;

