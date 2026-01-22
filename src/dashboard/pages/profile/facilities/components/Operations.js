import React, { useMemo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { get, set } from 'lodash';
import { FiClock, FiUsers, FiPlus, FiX, FiTrash2 } from 'react-icons/fi';

import InputField from '../../../../../components/BoxedInputFields/Personnalized-InputField';
import Button from '../../../../../components/BoxedInputFields/Button';
import DropdownField from '../../../../../components/BoxedInputFields/Dropdown-Field';
import Switch from '../../../../../components/BoxedInputFields/Switch';

const styles = {
  sectionContainer: "flex flex-col gap-6 p-1 w-full max-w-[1400px] mx-auto",
  headerCard: "bg-card rounded-xl border border-border px-6 py-2 shadow-md w-full max-w-[1400px] mx-auto h-16 flex items-center",
  sectionTitle: "text-2xl font-semibold mb-0",
  sectionTitleStyle: { fontSize: '18px', color: 'hsl(var(--foreground))', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  sectionSubtitle: "text-sm font-medium text-muted-foreground",
  subtitleRow: "flex items-end justify-between gap-4",
  mandatoryFieldLegend: "text-xs text-muted-foreground",
  mandatoryMark: "text-destructive",
  sectionsWrapper: "flex flex-col gap-6 w-full max-w-[1400px] mx-auto",
  sectionCard: "bg-card rounded-xl border border-border p-6 shadow-md w-full",
  cardHeader: "flex items-center gap-4 mb-6",
  cardIconWrapper: "p-2 rounded-lg bg-primary/10 text-primary",
  cardTitle: "flex-1",
  cardTitleH3: "m-0",
  cardTitleH3Style: { color: 'hsl(var(--card-foreground))', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  grid: "grid grid-cols-1 gap-6",
  fieldWrapper: "space-y-2",
  formActions: "flex justify-end gap-4 w-full max-w-[1400px] mx-auto",
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
  workerRequirementCard: "border border-border/60 rounded-lg p-5 mb-4 bg-card/50 transition-all hover:border-primary/30",
  workerRequirementHeader: "flex items-center justify-between mb-4",
  workerRequirementTitle: "font-semibold text-sm text-foreground",
  weekdaySelector: "flex flex-wrap gap-2 mb-4",
  weekdayChip: "px-3 py-1.5 rounded-full text-xs font-medium border cursor-pointer transition-all",
  weekdayChipActive: "bg-primary text-primary-foreground border-primary shadow-sm",
  weekdayChipInactive: "bg-card border-border text-muted-foreground hover:border-primary/50 hover:bg-primary/5",
  removeButton: "p-1.5 text-destructive hover:bg-destructive/10 rounded transition-colors",
  everydayPill: "px-3 py-1.5 rounded-full text-xs font-medium border cursor-pointer transition-all mb-3",
  everydayPillActive: "bg-primary text-primary-foreground border-primary shadow-sm",
  everydayPillInactive: "bg-card border-border text-muted-foreground hover:border-primary/50 hover:bg-primary/5",
  dayTimeDisplay: "text-xs text-muted-foreground mt-1"
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

const WORKER_TYPES = [
  { value: 'pharmacist', labelKey: 'operations.workerTypes.pharmacist' },
  { value: 'cashier', labelKey: 'operations.workerTypes.cashier' },
  { value: 'assistant', labelKey: 'operations.workerTypes.assistant' },
  { value: 'pharmacy_technician', labelKey: 'operations.workerTypes.pharmacyTechnician' },
  { value: 'other', labelKey: 'operations.workerTypes.other' }
];

const Operations = ({
  formData,
  config,
  errors,
  isSubmitting,
  onInputChange,
  onSaveAndContinue,
  onCancel,
  getNestedValue,
}) => {
  const { t } = useTranslation(['dashboardProfile', 'dropdowns', 'common', 'validation']);

  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    }
    window.location.reload();
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

  const workerRequirements = useMemo(() => {
    return getNestedValue(formData, 'operationalSettings.workerRequirements') || [];
  }, [formData, getNestedValue]);

  const handleAddWorkerRequirement = useCallback(() => {
    const current = workerRequirements || [];
    const newRequirement = {
      id: Date.now().toString(),
      workerType: 'pharmacist',
      workerTypeOther: '',
      quantity: 1,
      appliesToAllDays: true,
      specificDays: []
    };
    const updated = [...current, newRequirement];
    onInputChange('operationalSettings.workerRequirements', updated);
  }, [workerRequirements, onInputChange]);

  const handleUpdateWorkerRequirement = useCallback((id, field, value) => {
    const updated = workerRequirements.map(req => {
      if (req.id === id) {
        if (field === 'appliesToAllDays') {
          return { ...req, appliesToAllDays: value, specificDays: value ? [] : req.specificDays };
        }
        if (field === 'toggleDay') {
          const dayIndex = req.specificDays.indexOf(value);
          const newDays = dayIndex >= 0
            ? req.specificDays.filter(d => d !== value)
            : [...req.specificDays, value];
          return { ...req, specificDays: newDays };
        }
        return { ...req, [field]: value };
      }
      return req;
    });
    onInputChange('operationalSettings.workerRequirements', updated);
  }, [workerRequirements, onInputChange]);

  const handleRemoveWorkerRequirement = useCallback((id) => {
    const updated = workerRequirements.filter(req => req.id !== id);
    onInputChange('operationalSettings.workerRequirements', updated);
  }, [workerRequirements, onInputChange]);

  const getWorkerTypeOptions = useCallback(() => {
    return WORKER_TYPES.map(type => ({
      value: type.value,
      label: t(type.labelKey)
    }));
  }, [t]);

  return (
    <div className={styles.sectionContainer}>
      <div className={styles.headerCard}>
        <h2 className={styles.sectionTitle} style={styles.sectionTitleStyle}>
          {t('operations.title')}
        </h2>
        <div className={styles.subtitleRow}>
          <p className={styles.sectionSubtitle} style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
            {t('operations.subtitle')}
          </p>
          <div className={styles.mandatoryFieldLegend}>
            <span className={styles.mandatoryMark}>*</span> {t('common.mandatoryFields')}
          </div>
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
            {openingHours.map(day => (
              <div
                key={day.key}
                className={`${styles.dayRow} ${day.isClosed ? styles.dayRowClosed : ''}`}
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
            ))}
          </div>
        </div>

        <div className={styles.sectionCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardIconWrapper}><FiUsers /></div>
            <div className={styles.cardTitle}>
              <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>
                {t('operations.workerRequirementsTitle')}
              </h3>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-4">
              {t('operations.workerRequirementsDescription')}
            </p>
            <Button
              onClick={handleAddWorkerRequirement}
              variant="secondary"
              style={{ marginBottom: '16px' }}
            >
              <FiPlus className="mr-2" />
              {t('operations.addWorkerRequirement')}
            </Button>
          </div>

          {workerRequirements.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {t('operations.noWorkerRequirements')}
            </div>
          )}

          {workerRequirements.map((requirement) => (
            <div key={requirement.id} className={styles.workerRequirementCard}>
              <div className={styles.workerRequirementHeader}>
                <h4 className={styles.workerRequirementTitle}>
                  {t('operations.workerRequirement')} #{workerRequirements.indexOf(requirement) + 1}
                </h4>
                <button
                  onClick={() => handleRemoveWorkerRequirement(requirement.id)}
                  className={styles.removeButton}
                  type="button"
                >
                  <FiTrash2 size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="flex items-end">
                  <div className="w-full">
                    <DropdownField
                      label={t('operations.workerType')}
                      options={getWorkerTypeOptions()}
                      value={requirement.workerType}
                      onChange={(value) => handleUpdateWorkerRequirement(requirement.id, 'workerType', value)}
                      placeholder={t('operations.selectWorkerType')}
                    />
                  </div>
                </div>
                <div className="flex items-end">
                  <div className="w-full">
                    <InputField
                      label={t('operations.quantity')}
                      type="number"
                      value={requirement.quantity || 1}
                      onChange={(e) => handleUpdateWorkerRequirement(requirement.id, 'quantity', parseInt(e.target.value) || 1)}
                      min={1}
                    />
                  </div>
                </div>
              </div>

              {requirement.workerType === 'other' && (
                <div className="mb-4">
                  <InputField
                    label={t('operations.workerTypeOther')}
                    type="text"
                    value={requirement.workerTypeOther || ''}
                    onChange={(e) => handleUpdateWorkerRequirement(requirement.id, 'workerTypeOther', e.target.value)}
                    placeholder={t('operations.workerTypeOtherPlaceholder')}
                  />
                </div>
              )}

              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => handleUpdateWorkerRequirement(requirement.id, 'appliesToAllDays', !requirement.appliesToAllDays)}
                  className={`${styles.everydayPill} ${requirement.appliesToAllDays ? styles.everydayPillActive : styles.everydayPillInactive
                    }`}
                >
                  {t('operations.everyday')}
                </button>
              </div>

              {!requirement.appliesToAllDays && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('operations.selectDays')}
                  </label>
                  <div className={styles.weekdaySelector}>
                    {DAYS_OF_WEEK.map(day => {
                      const isSelected = requirement.specificDays?.includes(day.key);
                      const dayHours = openingHours.find(d => d.key === day.key);
                      const dayTime = dayHours && !dayHours.isClosed
                        ? `${dayHours.openingTime} - ${dayHours.closingTime}`
                        : null;

                      return (
                        <div key={day.key} className="flex flex-col items-center">
                          <button
                            type="button"
                            onClick={() => handleUpdateWorkerRequirement(requirement.id, 'toggleDay', day.key)}
                            className={`${styles.weekdayChip} ${isSelected ? styles.weekdayChipActive : styles.weekdayChipInactive
                              }`}
                          >
                            {t(day.labelKey)}
                          </button>
                          {isSelected && dayTime && (
                            <span className={styles.dayTimeDisplay}>
                              {dayTime}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
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

export default Operations;

