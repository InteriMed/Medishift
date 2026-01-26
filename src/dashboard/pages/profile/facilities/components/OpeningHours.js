import React, { useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { get } from 'lodash';
import { FiClock } from 'react-icons/fi';

import InputField from '../../../../../components/BoxedInputFields/Personnalized-InputField';
import Button from '../../../../../components/BoxedInputFields/Button';
import Switch from '../../../../../components/BoxedInputFields/Switch';

const styles = {
  sectionContainer: "flex flex-col gap-6 p-1 w-full max-w-[1400px] mx-auto",
  sectionsWrapper: "flex flex-col gap-6 w-full max-w-[1400px] mx-auto",
  sectionCard: "bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow w-full relative overflow-visible",
  cardHeader: "flex items-center gap-3 mb-4 pb-3 border-b border-border/40",
  cardIconWrapper: "p-2.5 rounded-xl bg-primary/10 flex-shrink-0",
  cardIconStyle: { color: 'var(--primary-color)' },
  cardTitle: "flex-1 min-w-0",
  cardTitleH3: "m-0 text-sm font-semibold truncate",
  cardTitleH3Style: { color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  grid: "grid grid-cols-1 gap-6 overflow-visible",
  openingHoursGrid: "grid grid-cols-1 md:grid-cols-2 gap-3",
  dayRow: "flex flex-col gap-3 p-4 border border-border/60 rounded-lg bg-card/50 transition-all hover:border-primary/30",
  dayRowClosed: "opacity-60",
  dayHeader: "flex items-center justify-between mb-1",
  dayLabel: "font-semibold text-sm text-foreground",
  timeInputsRow: "flex items-end gap-2 mt-1",
  timeInputWrapper: "flex-1 min-w-0",
  closedToggle: "flex items-center gap-2",
  closedBadge: "px-2 py-1 text-xs font-medium rounded-md bg-muted text-muted-foreground",
  timeSeparator: "self-end mb-2 text-muted-foreground font-medium",
  formActions: "flex justify-end gap-4 w-full max-w-[1400px] mx-auto",
  errorUpload: "border-destructive"
};

const DAYS_OF_WEEK = [
  { key: 'monday', labelKey: 'operations.monday' },
  { key: 'tuesday', labelKey: 'operations.tuesday' },
  { key: 'wednesday', labelKey: 'operations.wednesday' },
  { key: 'thursday', labelKey: 'operations.thursday' },
  { key: 'friday', labelKey: 'operations.friday' },
  { key: 'saturday', labelKey: 'operations.saturday' },
  { key: 'sunday', labelKey: 'operations.sunday' }
];

const OpeningHours = ({
  formData,
  config,
  errors,
  isSubmitting,
  onInputChange,
  onSaveAndContinue,
  onCancel,
  getNestedValue,
  showActions = true,
}) => {
  const { t } = useTranslation(['dashboardProfile', 'common', 'validation']);

  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    }
  }, [onCancel]);

  const openingHours = useMemo(() => {
    const hours = getNestedValue(formData, 'operationalSettings.standardOpeningHours') || {};
    return DAYS_OF_WEEK.map(day => {
      const dayValue = hours[day.key] || '';
      const isClosed = dayValue === 'closed' || dayValue === '';
      let openingTime = '08:00';
      let closingTime = '18:00';

      if (!isClosed && dayValue.includes('-')) {
        const parts = dayValue.split('-');
        openingTime = parts[0]?.trim() || '08:00';
        closingTime = parts[1]?.trim() || '18:00';
      }

      return {
        ...day,
        isClosed,
        openingTime,
        closingTime,
        rawValue: dayValue
      };
    });
  }, [formData, getNestedValue]);

  const handleDayHoursChange = useCallback((dayKey, field, value) => {
    const currentHours = getNestedValue(formData, 'operationalSettings.standardOpeningHours') || {};
    const dayData = openingHours.find(d => d.key === dayKey);

    if (field === 'isClosed') {
      const newValue = value ? 'closed' : `${dayData.openingTime}-${dayData.closingTime}`;
      onInputChange(`operationalSettings.standardOpeningHours.${dayKey}`, newValue);
    } else {
      const newOpeningTime = field === 'openingTime' ? value : dayData.openingTime;
      const newClosingTime = field === 'closingTime' ? value : dayData.closingTime;
      const newValue = dayData.isClosed ? 'closed' : `${newOpeningTime}-${newClosingTime}`;
      onInputChange(`operationalSettings.standardOpeningHours.${dayKey}`, newValue);
    }
  }, [formData, openingHours, onInputChange, getNestedValue]);

  return (
    <div className={styles.sectionContainer}>
      <div className={styles.sectionsWrapper}>
        <div className={styles.sectionCard} style={{ position: 'relative', zIndex: 8 }}>
          <div className={styles.grid}>
            <div className={styles.cardHeader}>
              <div className={styles.cardIconWrapper}><FiClock className="w-4 h-4" style={styles.cardIconStyle} /></div>
              <div className={styles.cardTitle}>
                <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>
                  {t('operations.openingHoursTitle')}
                </h3>
              </div>
            </div>

            <div className={styles.openingHoursGrid}>
            {openingHours.map(day => {
              const hasError = getNestedValue(errors, `operationalSettings.standardOpeningHours.${day.key}`);
              const borderClass = hasError ? `${styles.errorUpload} border-2` : 'border-border/60 hover:border-primary/30';

              const handleDayRowClick = (e) => {
                const target = e.target;
                const isInput = target.tagName === 'INPUT' || target.closest('input');
                const isButton = target.tagName === 'BUTTON' || target.closest('button');
                const isInputField = target.closest('.boxed-inputfield-wrapper') || target.closest('.boxed-inputfield-container');
                
                if (isInput || isButton || isInputField) {
                  return;
                }
                
                e.preventDefault();
                e.stopPropagation();
                handleDayHoursChange(day.key, 'isClosed', day.isClosed);
              };

              const handleSwitchChange = (checked) => {
                handleDayHoursChange(day.key, 'isClosed', !checked);
              };

              return (
                <div
                  key={day.key}
                  onClick={handleDayRowClick}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleDayRowClick(e);
                    }
                  }}
                  className={`flex flex-col gap-4 p-4 border rounded-lg bg-card/50 transition-all cursor-pointer select-none ${borderClass} ${day.isClosed ? styles.dayRowClosed : ''}`}
                  style={{ userSelect: 'none' }}
                >
                  <div className="flex items-center justify-between pointer-events-none">
                    <div className="font-semibold text-sm" style={{ color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                      {t(day.labelKey)}
                    </div>
                    <div className="flex items-center gap-2 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                      <div onClick={(e) => e.stopPropagation()}>
                        <Switch
                          label=""
                          checked={!day.isClosed}
                          onChange={handleSwitchChange}
                          marginBottom="0"
                        />
                      </div>
                      <span className="text-xs font-medium" style={{ 
                        color: day.isClosed ? 'var(--text-light-color)' : 'var(--primary-color)'
                      }}>
                        {day.isClosed ? t('operations.closed', 'Closed') : t('operations.open', 'Open')}
                      </span>
                    </div>
                  </div>
                  {day.isClosed ? (
                    <div className="boxed-inputfield-wrapper pointer-events-none">
                      <div className="boxed-inputfield-container">
                        <div className="p-3 text-sm font-medium text-center" style={{ color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                          {t('operations.closed', 'Closed')}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-end gap-2 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                      <div className="flex-1 min-w-0">
                        <InputField
                          label={t('operations.openingTime', 'Opening Time')}
                          type="time"
                          value={day.openingTime}
                          onChange={(e) => handleDayHoursChange(day.key, 'openingTime', e.target.value)}
                          error={getNestedValue(errors, `operationalSettings.standardOpeningHours.${day.key}`)}
                          marginBottom="0"
                        />
                      </div>
                      <span className="text-sm font-medium mb-2" style={{ color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>-</span>
                      <div className="flex-1 min-w-0">
                        <InputField
                          label={t('operations.closingTime', 'Closing Time')}
                          type="time"
                          value={day.closingTime}
                          onChange={(e) => handleDayHoursChange(day.key, 'closingTime', e.target.value)}
                          error={getNestedValue(errors, `operationalSettings.standardOpeningHours.${day.key}`)}
                          marginBottom="0"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          </div>
        </div>
      </div>

      {showActions && (
        <div className={styles.sectionCard}>
          <div className={styles.formActions} style={{ marginTop: 0 }}>
            <Button onClick={handleCancel} variant="secondary" disabled={isSubmitting}>
              {t('common.cancel')}
            </Button>
            <Button onClick={onSaveAndContinue} variant="confirmation" disabled={isSubmitting}>
              {isSubmitting ? t('common.saving') : t('common.saveAndContinue')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpeningHours;

