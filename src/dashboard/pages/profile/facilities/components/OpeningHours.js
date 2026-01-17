import React, { useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { get } from 'lodash';
import { FiClock } from 'react-icons/fi';

import InputField from '../../../../../components/BoxedInputFields/Personnalized-InputField';
import Button from '../../../../../components/BoxedInputFields/Button';
import Switch from '../../../../../components/BoxedInputFields/Switch';

const styles = {
  sectionContainer: "flex flex-col gap-6 p-1 w-full max-w-[1000px] mx-auto",
  headerCard: "bg-card rounded-xl border border-border p-6 pb-4 shadow-md w-full max-w-[1000px] mx-auto",
  sectionTitle: "text-2xl font-semibold",
  sectionTitleStyle: { fontSize: '18px', color: 'hsl(var(--foreground))', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  sectionSubtitle: "text-sm font-medium text-muted-foreground",
  subtitleRow: "flex items-end justify-between gap-4",
  mandatoryFieldLegend: "text-xs text-muted-foreground",
  mandatoryMark: "text-destructive",
  sectionsWrapper: "flex flex-col gap-6 w-full max-w-[1000px] mx-auto",
  sectionCard: "bg-card rounded-xl border border-border p-6 shadow-md w-full",
  cardHeader: "flex items-center gap-4 mb-6",
  cardIconWrapper: "p-2 rounded-lg bg-primary/10 text-primary",
  cardTitle: "flex-1",
  cardTitleH3: "m-0",
  cardTitleH3Style: { color: 'hsl(var(--card-foreground))', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
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
  formActions: "flex justify-end gap-4 w-full max-w-[1000px] mx-auto",
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
      <div className={styles.headerCard}>
        <h2 className={styles.sectionTitle} style={styles.sectionTitleStyle}>
          {t('operations.openingHoursTitle')}
        </h2>
        <div className={styles.subtitleRow}>
          <p className={styles.sectionSubtitle} style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
            {t('operations.subtitle')}
          </p>
        </div>
      </div>

      <div className={styles.sectionsWrapper}>
        <div className={styles.sectionCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardIconWrapper}><FiClock /></div>
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
              if (hasError) console.log(`OpeningHours Render: Error found for ${day.key}`, hasError);


              return (
                <div
                  key={day.key}
                  className={`flex flex-col gap-3 p-4 border rounded-lg bg-card/50 transition-all ${borderClass} ${day.isClosed ? styles.dayRowClosed : ''}`}
                >
                  <div className={styles.dayHeader}>
                    <div className={styles.dayLabel}>{t(day.labelKey)}</div>
                    <div className={styles.closedToggle}>
                      <Switch
                        label=""
                        checked={!day.isClosed}
                        onChange={(checked) => handleDayHoursChange(day.key, 'isClosed', !checked)}
                        marginBottom="0"
                      />
                      <span className="text-xs text-muted-foreground ml-1">
                        {t('operations.open', 'Open')}
                      </span>
                    </div>
                  </div>
                  {day.isClosed ? (
                    <div className={styles.closedBadge}>
                      {t('operations.closed')}
                    </div>
                  ) : (
                    <div className={styles.timeInputsRow}>
                      <div className={styles.timeInputWrapper}>
                        <InputField
                          label={t('operations.openingTime')}
                          type="time"
                          value={day.openingTime}
                          onChange={(e) => handleDayHoursChange(day.key, 'openingTime', e.target.value)}
                          error={getNestedValue(errors, `operationalSettings.standardOpeningHours.${day.key}`)}
                        />
                      </div>
                      <span className={styles.timeSeparator}>-</span>
                      <div className={styles.timeInputWrapper}>
                        <InputField
                          label={t('operations.closingTime')}
                          type="time"
                          value={day.closingTime}
                          onChange={(e) => handleDayHoursChange(day.key, 'closingTime', e.target.value)}
                          error={getNestedValue(errors, `operationalSettings.standardOpeningHours.${day.key}`)}
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
    </div>
  );
};

export default OpeningHours;

