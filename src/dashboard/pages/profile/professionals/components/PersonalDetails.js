import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../../contexts/AuthContext';
import useProfileData from '../../../../hooks/useProfileData';
import { useDropdownOptions } from '../../utils/DropdownListsImports';
import { FiUser, FiMapPin, FiPhone, FiInfo, FiFileText } from 'react-icons/fi';

// --- Import Base Components ---
import InputField from '../../../../../components/BoxedInputFields/Personnalized-InputField';
import SimpleDropdown from '../../../../../components/BoxedInputFields/Dropdown-Field';
import TextareaField from '../../../../../components/BoxedInputFields/TextareaField';
import Button from '../../../../../components/BoxedInputFields/Button';

// --- 
const DEFAULT_BIO = "A recent graduate with a Master's degree in Pharmaceutical Sciences from ETH Zurich, specializing in research and immunology. William Abhamon possesses extensive hands-on experience in cutting-edge pharmaceutical research, including developing antibody fragments, investigating receptor aggregation, and studying protein-RNA interactions. Complementing his strong scientific background, he brings practical pharmacy experience, leadership skills from student associations, and proficiency in advanced scientific software and programming languages.";

// Tailwind styles
const styles = {
  sectionContainer: "flex flex-col gap-6 p-1 w-full max-w-[1000px] mx-auto",
  headerCard: "bg-card rounded-xl border border-border/60 p-6 pb-4 shadow-sm w-full max-w-[1000px] mx-auto",
  sectionTitle: "text-2xl font-semibold mb-0",
  sectionTitleStyle: { fontSize: '18px', color: 'hsl(var(--foreground))', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  sectionSubtitle: "text-sm font-medium text-muted-foreground",
  subtitleRow: "flex items-end justify-between gap-4",
  mandatoryFieldLegend: "text-xs text-muted-foreground",
  mandatoryMark: "text-destructive",
  sectionsWrapper: "personal-details-sections-wrapper flex flex-col gap-6 w-full max-w-[1000px] mx-auto",
  leftColumn: "flex flex-col gap-6 flex-1",
  rightColumn: "flex flex-col gap-6 flex-1",
  sectionCard: "bg-card rounded-xl border border-border/60 p-6 shadow-sm w-full",
  cardHeader: "flex items-center gap-4 mb-0",
  cardIconWrapper: "p-2 rounded-lg bg-primary/10 text-primary",
  cardTitle: "flex-1",
  cardTitleH3: "m-0",
  cardTitleH3Style: { color: 'hsl(var(--card-foreground))', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  grid: "grid grid-cols-1 gap-6",
  gridSingle: "grid grid-cols-1 gap-6",
  fieldWrapper: "space-y-2",
  fullWidth: "md:col-span-2",
  formActions: "flex justify-end gap-4 w-full max-w-[1000px] mx-auto"
};

const PersonalDetails = ({
  formData,
  config,
  errors,
  isSubmitting,
  onInputChange,
  onSaveAndContinue,
  onCancel,
  getNestedValue,
  onTriggerUpload,
  onStepGuideVisibilityChange,
}) => {
  const { t } = useTranslation(['dashboardProfile', 'dropdowns', 'common', 'validation']);
  const { currentUser } = useAuth();
  const { uploadImageAndRetrieveURL } = useProfileData();
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [pictureError, setPictureError] = useState('');
  const fileInputRef = useRef(null);
  const [showStepGuide] = useState(true);

  useEffect(() => {
    if (onStepGuideVisibilityChange) {
      onStepGuideVisibilityChange(showStepGuide);
    }
  }, [showStepGuide, onStepGuideVisibilityChange]);

  const {
    countryOptions,
    cantonOptions,
    residencyPermitOptions,
    availabilityStatusOptions,
    contractTypeOptions,
    educationLevelOptions,
    phonePrefixOptions
  } = useDropdownOptions();

  // Helper to get dropdown options
  const getDropdownOptions = useCallback((optionsKey) => {
    switch (optionsKey) {
      case 'countries': return countryOptions;
      case 'cantons': return cantonOptions;
      case 'workPermits': return residencyPermitOptions;
      case 'availability': return availabilityStatusOptions;
      case 'contractTypes': return contractTypeOptions;
      case 'education': return educationLevelOptions;
      case 'phonePrefixes': return phonePrefixOptions;
      default: return [];
    }
  }, [countryOptions, cantonOptions, residencyPermitOptions, availabilityStatusOptions, contractTypeOptions, educationLevelOptions, phonePrefixOptions]);

  // Group fields by their 'group' property
  const groupedFields = useMemo(() => {
    const fields = config?.fields?.personalDetails || [];
    const groups = {};

    // Define the order of groups (optional, but good for consistency)
    const order = ['identity', 'address', 'contact'];

    fields.forEach(field => {
      const groupKey = field.group || 'other';
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(field);
    });

    // Sort keys based on defined order, appending any others at the end
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      const indexA = order.indexOf(a);
      const indexB = order.indexOf(b);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.localeCompare(b);
    });

    return sortedKeys.map(key => ({
      key: key,
      fields: groups[key]
    }));
  }, [config]);

  const handleCancel = useCallback(() => {
    if (onCancel) onCancel();
    else window.location.reload();
  }, [onCancel]);

  const handleProfilePictureChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileSizeInMB = file.size / (1024 * 1024);
    if (fileSizeInMB > 2) {
      setPictureError(t('accountBasics.errors.fileTooLarge'));
      return;
    }

    if (!file.type.startsWith('image/')) {
      setPictureError(t('accountBasics.errors.invalidFileType'));
      return;
    }

    setIsUploadingPicture(true);
    setPictureError('');

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const photoURL = await uploadImageAndRetrieveURL(currentUser.uid, event.target.result);
        onInputChange('profilePicture', photoURL);
        setIsUploadingPicture(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      setPictureError(t('accountBasics.errors.uploadFailed'));
      setIsUploadingPicture(false);
    }
  };

  const displayProfile = formData || currentUser || {};
  const profilePicture = getNestedValue(formData, 'profilePicture') || formData?.profilePicture || currentUser?.photoURL;

  const renderField = (fieldConfig, groupKey) => {
    const { name, type, required, labelKey, optionsKey, placeholder } = fieldConfig;
    const label = t(labelKey, name);
    const value = getNestedValue(formData, name);
    const error = getNestedValue(errors, name);
    const fieldKey = name;

    const commonProps = {
      label: label,
      error: error,
      required: required,
      wrapperClassName: styles.fieldWrapper
    };

    if (type === 'date') {
      const maxDate = name === 'identity.dateOfBirth'
        ? new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]
        : undefined;
      const dateValue = value ? (typeof value === 'string' ? value : new Date(value).toISOString().split('T')[0]) : '';
      return (
        <div key={fieldKey} className={styles.fieldWrapper}>
          {label && (
            <label className={`boxed-date-label ${error ? 'boxed-date-label--error' : ''}`}>
              {label}
              {required && <span className="boxed-inputfield-required">*</span>}
            </label>
          )}
          <input
            type="date"
            value={dateValue}
            onChange={(e) => onInputChange(name, e.target.value || null)}
            max={maxDate}
            className={`w-full h-9 px-3 rounded-lg border bg-background text-xs text-left focus:outline-none focus:ring-2 focus:ring-ring transition-all ${error ? 'date-input-error' : ''}`}
            style={{
              fontFamily: 'var(--font-family-text, Roboto, sans-serif)',
              borderColor: error ? 'var(--boxed-inputfield-error-color)' : 'hsl(var(--border) / 0.6)',
              color: error ? 'var(--boxed-inputfield-error-color)' : 'inherit'
            }}
          />
        </div>
      );
    }

    if (type === 'dropdown') {
      return (
        <div key={fieldKey} className={styles.fieldWrapper}>
          <SimpleDropdown
            label={commonProps.label}
            options={getDropdownOptions(optionsKey)}
            value={value}
            onChange={(newValue) => onInputChange(name, newValue)}
            placeholder={placeholder ? t(placeholder) : t('common.selectPlaceholder')}
            required={commonProps.required}
            error={commonProps.error}
          />
        </div>
      );
    }

    return (
      <div key={fieldKey} className={styles.fieldWrapper}>
        <InputField
          {...commonProps}
          name={name}
          type={type === 'email' ? 'email' : (type === 'tel' ? 'tel' : 'text')}
          value={value || ''}
          onChange={(e) => onInputChange(name, e.target.value)}
          placeholder={placeholder ? t(placeholder) : ''}
        />
      </div>
    );
  };

  const renderContactFields = (fields) => {
    const phonePrefixField = fields.find(f => f.name === 'contact.primaryPhonePrefix');
    const phoneField = fields.find(f => f.name === 'contact.primaryPhone');
    const emailField = fields.find(f => f.name === 'contact.primaryEmail');

    return (
      <div className={styles.gridSingle}>
        {phonePrefixField && renderField(phonePrefixField, 'contact')}
        {phoneField && renderField(phoneField, 'contact')}
        {emailField && renderField(emailField, 'contact')}
      </div>
    );
  };

  const getGroupIcon = (groupKey) => {
    switch (groupKey) {
      case 'identity': return <FiUser />;
      case 'address': return <FiMapPin />;
      case 'contact': return <FiPhone />;
      default: return <FiInfo />;
    }
  };

  const getGroupTitle = (groupKey) => {
    // Map group keys to translation keys
    const titleMap = {
      'identity': 'personalDetails.identityInfo',
      'address': 'personalDetails.residentialAddress',
      'contact': 'personalDetails.contactInformation'
    };
    return t(titleMap[groupKey] || `personalDetails.${groupKey}`, groupKey.charAt(0).toUpperCase() + groupKey.slice(1));
  };

  return (
    <>
      <style>{`
        .personal-details-container {
          container-type: inline-size;
        }
        @container (min-width: 700px) {
          .personal-details-sections-wrapper {
            flex-direction: row;
          }
        }
      `}</style>
      <div className={`${styles.sectionContainer} personal-details-container`}>


        {/* Title Card */}
        <div className={styles.headerCard}>
          <div className="flex items-center gap-6 mb-4">
            <div
              className="relative group cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-border group-hover:border-primary transition-colors">
                {profilePicture ? (
                  <img
                    src={profilePicture}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center text-2xl font-bold text-muted-foreground">
                    {displayProfile?.firstName?.[0] || displayProfile?.identity?.legalFirstName?.[0] || 'U'}{displayProfile?.lastName?.[0] || displayProfile?.identity?.legalLastName?.[0] || ''}
                  </div>
                )}
              </div>
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs text-white font-medium">{t('common.edit')}</span>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleProfilePictureChange}
                accept="image/*"
                className="hidden"
              />
            </div>
            <div className="flex-1">
              <h2 className={styles.sectionTitle} style={styles.sectionTitleStyle}>{t('personalDetails.title')}</h2>
              <div className={styles.subtitleRow}>
                <p className={styles.sectionSubtitle} style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>{t('personalDetails.subtitle', 'Please ensure your personal details are accurate and up to date.')}</p>
                <div className={styles.mandatoryFieldLegend}><span className={styles.mandatoryMark}>*</span> {t('common.mandatoryFields')}</div>
              </div>
              {pictureError && <p className="text-red-500 text-sm mt-1">{pictureError}</p>}
              {isUploadingPicture && <p className="text-primary text-sm mt-1">{t('accountBasics.uploading')}</p>}
            </div>
          </div>
        </div>

        <div className={styles.sectionsWrapper}>
          {/* Left Column */}
          <div className={styles.leftColumn}>
            {groupedFields.filter(group => group.key === 'identity' || group.key === 'contact').map((group) => (
              <div key={group.key} className={styles.sectionCard}>
                {group.key === 'contact' ? (
                  <div className={styles.gridSingle}>
                    <div className={styles.cardHeader}>
                      <div className={styles.cardIconWrapper}>
                        {getGroupIcon(group.key)}
                      </div>
                      <div className={styles.cardTitle}>
                        <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>{getGroupTitle(group.key)}</h3>
                      </div>
                    </div>
                    {renderContactFields(group.fields)}
                  </div>
                ) : (
                  <div className={styles.grid}>
                    <div className={styles.cardHeader}>
                      <div className={styles.cardIconWrapper}>
                        {getGroupIcon(group.key)}
                      </div>
                      <div className={styles.cardTitle}>
                        <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>{getGroupTitle(group.key)}</h3>
                      </div>
                    </div>
                    {group.fields.map(field => renderField(field, group.key))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Right Column */}
          <div className={styles.rightColumn}>
            {groupedFields.filter(group => group.key === 'address').map((group) => (
              <div key={group.key} className={styles.sectionCard}>
                <div className={styles.grid}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardIconWrapper}>
                      {getGroupIcon(group.key)}
                    </div>
                    <div className={styles.cardTitle}>
                      <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>{getGroupTitle(group.key)}</h3>
                    </div>
                  </div>
                  {group.fields.map(field => renderField(field, group.key))}
                </div>
              </div>
            ))}

            {/* Summary Section */}
            <div className={styles.sectionCard}>
              <div className={styles.gridSingle}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardIconWrapper}>
                    <FiFileText />
                  </div>
                  <div className={styles.cardTitle}>
                    <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>{t('personalDetails.summary', 'Summary')}</h3>
                  </div>
                </div>
                <div className={styles.gridSingle}>
                  <TextareaField
                    label=""
                    name="bio"
                    value={getNestedValue(formData, 'bio') || DEFAULT_BIO}
                    onChange={(e) => onInputChange('bio', e.target.value)}
                    placeholder={t('personalDetails.summaryPlaceholder', 'Tell us about your professional background...')}
                    error={getNestedValue(errors, 'bio')}
                    maxLength={1000}
                    rows={8}
                    wrapperClassName={styles.fieldWrapper}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.sectionCard}>
          <div className={styles.formActions} style={{ marginTop: 0 }}>
            <Button
              onClick={handleCancel}
              variant="secondary"
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={onSaveAndContinue}
              variant="confirmation"
              disabled={isSubmitting}
            >
              {isSubmitting ? t('common.saving') : t('common.saveAndContinue')}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

PersonalDetails.propTypes = {
  formData: PropTypes.object.isRequired,
  config: PropTypes.shape({
    fields: PropTypes.shape({
      personalDetails: PropTypes.array
    })
  }).isRequired,
  errors: PropTypes.object.isRequired,
  isSubmitting: PropTypes.bool.isRequired,
  onInputChange: PropTypes.func.isRequired,
  onSaveAndContinue: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  getNestedValue: PropTypes.func.isRequired,
  onTriggerUpload: PropTypes.func,
  onStepGuideVisibilityChange: PropTypes.func
};

export default PersonalDetails;