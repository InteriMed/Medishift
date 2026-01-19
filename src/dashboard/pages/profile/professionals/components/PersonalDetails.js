import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../../contexts/AuthContext';
import useProfileData from '../../../../hooks/useProfileData';
import useAutoSave from '../../../../hooks/useAutoSave';
import { useDropdownOptions } from '../../utils/DropdownListsImports';
import { FiUser, FiMapPin, FiPhone, FiInfo, FiFileText, FiEdit2, FiEye, FiTrash2, FiX } from 'react-icons/fi';
import { generateBasicProfilePicture, isGoogleUser } from '../../../../../utils/profilePictureUtils';
import '../../../../../styles/modals.css';

// --- Import Base Components ---
import InputField from '../../../../../components/BoxedInputFields/Personnalized-InputField';
import SimpleDropdown from '../../../../../components/BoxedInputFields/Dropdown-Field';
import TextareaField from '../../../../../components/BoxedInputFields/TextareaField';
import Button from '../../../../../components/BoxedInputFields/Button';

// --- 
// Default bio is now empty to allow AI extraction or manual entry
const DEFAULT_BIO = "";

// Tailwind styles
const styles = {
  sectionContainer: "flex flex-col gap-6 p-1 w-full max-w-[1400px] mx-auto",
  headerCard: "bg-card rounded-xl border border-border/60 p-6 pb-4 shadow-sm w-full max-w-[1400px] mx-auto",
  sectionTitle: "text-2xl font-semibold mb-0",
  sectionTitleStyle: { fontSize: '18px', color: 'hsl(var(--foreground))', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  sectionSubtitle: "text-sm font-medium text-muted-foreground",
  subtitleRow: "flex items-end justify-between gap-4",
  mandatoryFieldLegend: "text-xs text-muted-foreground",
  mandatoryMark: "text-destructive",
  sectionsWrapper: "personal-details-sections-wrapper flex flex-col gap-6 w-full max-w-[1400px] mx-auto",
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
  formActions: "flex justify-end gap-4 w-full max-w-[1400px] mx-auto"
};

const PersonalDetails = ({
  formData,
  config,
  errors,
  isSubmitting,
  onInputChange,
  onSaveAndContinue,
  onSave,
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
  const [showPicturePopup, setShowPicturePopup] = useState(false);
  const [popupImageSrc, setPopupImageSrc] = useState(null);

  useAutoSave({
    formData,
    config,
    activeTab: 'personalDetails',
    onInputChange,
    onSave,
    getNestedValue
  });

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
        setPopupImageSrc(event.target.result);
        setShowPicturePopup(true);
        setIsUploadingPicture(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error reading profile picture:', error);
      setPictureError(t('accountBasics.errors.uploadFailed'));
      setIsUploadingPicture(false);
    }
  };

  const handleViewPicture = (e) => {
    e.stopPropagation();
    if (profilePicture) {
      setPopupImageSrc(profilePicture);
      setShowPicturePopup(true);
    }
  };

  const handleDeletePicture = async (e) => {
    e.stopPropagation();
    if (window.confirm(t('common.confirmDeletePicture', 'Are you sure you want to delete your profile picture?'))) {
      try {
        const displayProfile = formData || currentUser || {};
        const firstName = displayProfile?.firstName || displayProfile?.identity?.legalFirstName || '';
        const lastName = displayProfile?.lastName || displayProfile?.identity?.legalLastName || '';

        setIsUploadingPicture(true);
        try {
          if (isGoogleUser(currentUser) && currentUser?.photoURL) {
            const basicPictureDataUrl = generateBasicProfilePicture(firstName, lastName);
            const photoURL = await uploadImageAndRetrieveURL(currentUser.uid, basicPictureDataUrl);
            onInputChange('documents.profile_picture', photoURL);
            onInputChange('profilePicture', photoURL);
            if (onSave) {
              await onSave();
            }
            setPictureError('');
          } else {
            onInputChange('documents.profile_picture', null);
            onInputChange('profilePicture', null);
            if (onSave) {
              await onSave();
            }
            setPictureError('');
          }
        } catch (error) {
          console.error('Error deleting profile picture:', error);
          setPictureError(t('accountBasics.errors.uploadFailed'));
        } finally {
          setIsUploadingPicture(false);
        }
      } catch (error) {
        console.error('Error deleting profile picture:', error);
        setPictureError(t('accountBasics.errors.uploadFailed'));
        setIsUploadingPicture(false);
      }
    }
  };

  const handleEditPicture = (e) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleConfirmUpload = async () => {
    if (!popupImageSrc) return;

    setIsUploadingPicture(true);
    setPictureError('');

    try {
      const photoURL = await uploadImageAndRetrieveURL(currentUser.uid, popupImageSrc);
      onInputChange('documents.profile_picture', photoURL);
      onInputChange('profilePicture', photoURL);
      if (onSave) {
        await onSave();
      }
      setShowPicturePopup(false);
      setPopupImageSrc(null);
      setIsUploadingPicture(false);
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      setPictureError(t('accountBasics.errors.uploadFailed'));
      setIsUploadingPicture(false);
    }
  };

  const handleCancelUpload = () => {
    setShowPicturePopup(false);
    const isViewingExisting = popupImageSrc === profilePicture;
    if (!isViewingExisting && fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (!isViewingExisting) {
      setPopupImageSrc(null);
    }
  };

  const handleClosePopup = () => {
    setShowPicturePopup(false);
    const isViewingExisting = popupImageSrc === profilePicture;
    if (!isViewingExisting) {
      setPopupImageSrc(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const displayProfile = formData || currentUser || {};
  const profilePicture = getNestedValue(formData, 'documents.profile_picture') || getNestedValue(formData, 'profilePicture') || formData?.profilePicture || currentUser?.photoURL;

  const renderField = (fieldConfig, groupKey) => {
    const { name, type, required, labelKey, optionsKey, placeholder, disabled, readOnly } = fieldConfig;
    const label = t(labelKey, name);
    const value = getNestedValue(formData, name);
    const error = getNestedValue(errors, name);
    const fieldKey = name;

    const commonProps = {
      label: label,
      error: error,
      required: required,
      wrapperClassName: styles.fieldWrapper,
      disabled: disabled || readOnly,
      readOnly: readOnly
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
              className="relative group cursor-pointer md:cursor-default"
              onClick={(e) => {
                if (window.innerWidth < 768) {
                  handleEditPicture(e);
                }
              }}
            >
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-border group-hover:border-primary transition-colors md:cursor-default">
                {profilePicture ? (
                  <img
                    src={profilePicture}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center text-2xl font-bold text-muted-foreground" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {displayProfile?.firstName?.[0] || displayProfile?.identity?.legalFirstName?.[0] || 'U'}{displayProfile?.lastName?.[0] || displayProfile?.identity?.legalLastName?.[0] || ''}
                  </div>
                )}
              </div>
              <div className="absolute inset-0 bg-black/50 rounded-full hidden md:flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {profilePicture ? (
                  <>
                    <button
                      onClick={handleViewPicture}
                      className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                      title={t('common.view', 'View')}
                    >
                      <FiEye className="w-4 h-4 text-white" />
                    </button>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={handleEditPicture}
                        className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                        title={t('common.edit', 'Edit')}
                      >
                        <FiEdit2 className="w-4 h-4 text-white" />
                      </button>
                      <button
                        onClick={handleDeletePicture}
                        className="p-2 rounded-full bg-white/20 hover:bg-red-500/50 transition-colors"
                        title={t('common.delete', 'Delete')}
                      >
                        <FiTrash2 className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={handleEditPicture}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                    title={t('common.edit', 'Edit')}
                  >
                    <FiEdit2 className="w-4 h-4 text-white" />
                  </button>
                )}
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

      </div>

      {showPicturePopup && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleClosePopup();
            }
          }}
        >
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>{popupImageSrc === profilePicture ? t('common.view', 'View Profile Picture') : t('common.preview', 'Preview Profile Picture')}</h2>
              <button
                className="modal-close-btn"
                onClick={handleClosePopup}
                aria-label={t('common.close', 'Close')}
              >
                <FiX />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '24px' }}>
              {popupImageSrc && (
                <img
                  src={popupImageSrc}
                  alt="Profile Preview"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '60vh',
                    objectFit: 'contain',
                    borderRadius: '8px'
                  }}
                />
              )}
            </div>
            {popupImageSrc !== profilePicture && (
              <div className="modal-footer">
                <button
                  onClick={handleCancelUpload}
                  className="modal-btn modal-btn-secondary"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  onClick={handleConfirmUpload}
                  className="modal-btn modal-btn-primary"
                  disabled={isUploadingPicture}
                >
                  {isUploadingPicture ? t('accountBasics.uploading', 'Uploading...') : t('common.confirm', 'Confirm')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
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
  onSave: PropTypes.func,
  onCancel: PropTypes.func.isRequired,
  getNestedValue: PropTypes.func.isRequired,
  onTriggerUpload: PropTypes.func,
  onStepGuideVisibilityChange: PropTypes.func
};

export default PersonalDetails;