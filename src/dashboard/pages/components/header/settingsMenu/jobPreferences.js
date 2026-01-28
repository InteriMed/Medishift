import React, { useMemo } from 'react'; // Removed useState, useEffect, useRef for main data
import { useTranslation } from 'react-i18next';
import InputField from '../../../../../components/boxedInputFields/personnalizedInputField';
import DropdownField from '../../../../../components/boxedInputFields/dropdownField';
import Slider from '../../../../../components/boxedInputFields/slider'; // Assuming you have this component
import CheckboxField from '../../../../../components/boxedInputFields/checkboxField';
import Button from '../../../../../components/boxedInputFields/button';
import styles from './styles/profileUnified.module.css';

// Helper to generate options
const generateOptionsFromObject = (optionsObject, t, translationPrefix) => {
  if (!optionsObject) return [];
  return Object.entries(optionsObject).map(([key, value]) => ({
    value: key,
    label: translationPrefix ? t(`${translationPrefix}.${key}`) : value,
  }));
};


const JobPreferences = ({
  formData, // Contains all job preference fields
  errors,
  isSubmitting,
  onInputChange, // (name, value)
  onNestedInputChange, // (section, fieldName, value) for desiredWorkPercentage, targetHourlyRate
  setErrors, // To clear specific field errors
  onSaveAndContinue,
  onCancel,
  isOnboarding,
}) => {
  const { t, i18n } = useTranslation(['dashboardProfile', 'dropdowns']);

  const clearSpecificError = (fieldName, subFieldName = null) => {
    if (setErrors) {
      setErrors(prevErrors => {
        const newErrors = { ...prevErrors };
        if (subFieldName && newErrors[fieldName] && typeof newErrors[fieldName] === 'object') {
          const updatedSubErrors = { ...newErrors[fieldName] };
          delete updatedSubErrors[subFieldName];
          newErrors[fieldName] = Object.keys(updatedSubErrors).length > 0 ? updatedSubErrors : null;
        } else {
          delete newErrors[fieldName];
        }
        return newErrors;
      });
    }
  };

  const availabilityStatusOptions = useMemo(() => {
    const availabilityObj = t('dropdowns:availability', { returnObjects: true });
    return availabilityObj && typeof availabilityObj === 'object'
      ? Object.entries(availabilityObj).map(([key, value]) => ({
          value: key,
          label: value
        }))
      : [];
  }, [t]);

  const contractTypeOptions = useMemo(() => {
    const contractTypesObj = t('dropdowns:contractTypes', { returnObjects: true });
    return contractTypesObj && typeof contractTypesObj === 'object'
      ? Object.entries(contractTypesObj).map(([key, value]) => ({
          value: key,
          label: value
        }))
      : [];
  }, [t]);

  // Handle slider changes for nested objects like desiredWorkPercentage and targetHourlyRate
  const handleRangeSliderChange = (objectName, values) => {
    // Assuming values is an array [min, max]
    onNestedInputChange(objectName, 'min', values[0]);
    onNestedInputChange(objectName, 'max', values[1]);
    clearSpecificError(objectName);
  };

  const handleSingleSliderChange = (fieldName, value) => {
    // Assuming value is a single number from a slider
    onInputChange(fieldName, value);
    clearSpecificError(fieldName);
  };

  const isNotLooking = formData?.availabilityStatus === 'not_looking'; // Example value

  return (
    <div className={styles.sectionContainer}>
      <h2 className={styles.sectionTitle}>{t('jobPreferences.title')}</h2>
      <p className={styles.sectionSubtitle}>{t('jobPreferences.subtitle')}</p>
      {errors?.jobPreferences && <p className={styles.errorText}>{errors.jobPreferences}</p>}

      {/* Availability Status */}
      <h3 className={styles.subsectionTitle}>{t('jobPreferences.availability')}</h3>
      <DropdownField
        label={<>{t('jobPreferences.availabilityStatus')} <span className={styles.mandatoryMark}></span></>}
        options={availabilityStatusOptions}
        value={formData?.availabilityStatus || ''}
        onChange={option => { onInputChange('availabilityStatus', option ? option.value : ''); clearSpecificError('availabilityStatus');}}
        error={errors?.availabilityStatus}
        required
      />

      {/* Conditional rendering based on availability status */}
      {!isNotLooking && (
        <>
          {/* Work Parameters */}
          <h3 className={styles.subsectionTitle}>{t('jobPreferences.workParametersTitle')}</h3>
          <div className={styles.formGroupRow}>
            <div className={styles.formGroup}>
              <label htmlFor="desiredWorkPercentageSlider">{t('jobPreferences.desiredWorkPercentage')} <span className={styles.mandatoryMark}></span></label>
              <Slider
                id="desiredWorkPercentageSlider"
                min={0} max={100} step={5}
                values={[formData?.desiredWorkPercentage?.min || 0, formData?.desiredWorkPercentage?.max || 100]}
                onChange={values => handleRangeSliderChange('desiredWorkPercentage', values)}
              />
              {errors?.desiredWorkPercentage && <p className={styles.errorText}>{errors.desiredWorkPercentage.min || errors.desiredWorkPercentage.max || errors.desiredWorkPercentage}</p>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="preferredWorkRadiusKmSlider">{t('jobPreferences.preferredWorkRadius')} <span className={styles.mandatoryMark}></span> ({t('jobPreferences.km')})</label>
              <Slider
                id="preferredWorkRadiusKmSlider"
                min={0} max={200} step={5} // Example range
                values={[formData?.preferredWorkRadiusKm || 0]}
                onChange={values => handleSingleSliderChange('preferredWorkRadiusKm', values[0])}
              />
              {errors?.preferredWorkRadiusKm && <p className={styles.errorText}>{errors.preferredWorkRadiusKm}</p>}
            </div>
          </div>

          {/* Compensation */}
          <h3 className={styles.subsectionTitle}>{t('jobPreferences.compensationTitle')}</h3>
          <div className={styles.formGroupRow}>
            <div className={styles.formGroup}>
              <label htmlFor="targetHourlyRateSlider">{t('jobPreferences.targetHourlyRate')} <span className={styles.mandatoryMark}></span> ({formData?.currency || 'CHF'})</label>
              <Slider
                id="targetHourlyRateSlider"
                min={0} max={300} step={5} // Example range
                values={[formData?.targetHourlyRate?.min || 0, formData?.targetHourlyRate?.max || 100]}
                onChange={values => handleRangeSliderChange('targetHourlyRate', values)}
              />
              {errors?.targetHourlyRate && <p className={styles.errorText}>{errors.targetHourlyRate.min || errors.targetHourlyRate.max || errors.targetHourlyRate}</p>}
            </div>

            {/* Current Work Percentage - Shown regardless of looking status based on original file */}
            <div className={styles.formGroup}>
              <label htmlFor="currentWorkPercentageSlider">{t('jobPreferences.currentWorkPercentageOptional')}</label>
              <Slider
                id="currentWorkPercentageSlider"
                min={0} max={100} step={5}
                values={[formData?.currentWorkPercentage || 0]}
                onChange={values => handleSingleSliderChange('currentWorkPercentage', values[0])}
              />
              {/* No error shown for optional field usually */}
            </div>
          </div>
        </>
      )}

      {/* Preferred Shifts / Contract Types - Placeholder for more complex fields */}
      {/* <h3 className={styles.subsectionTitle}>{t('jobPreferences.preferredShiftsAndContracts')}</h3> */}
      {/* Example: <MultiSelectDropdown options={shiftOptions} ... /> */}
      {/* Example: <CheckboxGroup options={contractTypeOptions} ... /> */}

      <div className={styles.onboardingActions}>
        <Button onClick={onCancel} variant="secondary" disabled={isSubmitting}>
          {t('common.cancel')}
        </Button>
        <Button onClick={onSaveAndContinue} variant="confirmation" disabled={isSubmitting}>
          {isSubmitting ? t('common.saving') : (isOnboarding ? t('common.saveAndContinue') : t('common.save'))}
        </Button>
      </div>
    </div>
  );
};

export default JobPreferences;