import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../../contexts/AuthContext';
import useProfileData from '../../../../hooks/useProfileData';
import useAutoSave from '../../../../hooks/useAutoSave';
import { useDropdownOptions } from '../../utils/DropdownListsImports';
import { FiUser, FiMapPin, FiPhone, FiInfo, FiFileText, FiEdit2, FiEye, FiTrash2, FiX, FiZap } from 'react-icons/fi';
import { generateBasicProfilePicture, isGoogleUser } from '../../../../../utils/profilePictureUtils';
import '../../../../../styles/modals.css';

import InputField from '../../../../../components/BoxedInputFields/Personnalized-InputField';
import SimpleDropdown from '../../../../../components/BoxedInputFields/Dropdown-Field';
import TextareaField from '../../../../../components/BoxedInputFields/TextareaField';
import DateField from '../../../../../components/BoxedInputFields/DateField';
import Button from '../../../../../components/BoxedInputFields/Button';
import UploadFile from '../../../../../components/BoxedInputFields/UploadFile';
import LoadingSpinner from '../../../../../components/LoadingSpinner/LoadingSpinner';
import { cn } from '../../../../../utils/cn';

// --- 
// Default bio is now empty to allow AI extraction or manual entry
const DEFAULT_BIO = "";

// Tailwind styles
const styles = {
  sectionContainer: "flex flex-col gap-6 p-1 w-full max-w-[1400px] mx-auto",
  headerCard: "bg-card rounded-2xl border border-border/50 px-6 py-4 shadow-lg backdrop-blur-sm w-full max-w-[1400px] mx-auto flex flex-col personal-details-header",
  sectionTitle: "text-2xl font-semibold mb-0",
  sectionTitleStyle: { fontSize: '18px', color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  sectionSubtitle: "text-sm font-medium",
  sectionSubtitleStyle: { color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  subtitleRow: "flex items-end justify-between gap-4",
  headerGrid: "grid grid-cols-1 gap-4 w-full",
  headerTitleCol: "flex flex-col gap-1 items-start text-left",
  headerCompletionCol: "flex items-center justify-center",
  headerAutofillCol: "flex items-center justify-end",
  mandatoryFieldLegend: "text-xs",
  mandatoryFieldLegendStyle: { color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
  mandatoryMark: "text-destructive",
  sectionsWrapper: "personal-details-sections-wrapper w-full max-w-[1400px] mx-auto",
  leftColumn: "flex flex-col gap-6 flex-1",
  rightColumn: "flex flex-col gap-6 flex-1",
  sectionCard: "bg-card rounded-2xl border border-border/50 p-6 shadow-lg backdrop-blur-sm w-full",
  cardHeader: "flex items-center gap-3 mb-4 pb-3 border-b border-border/40",
  cardIconWrapper: "p-2.5 rounded-xl bg-primary/10 flex-shrink-0",
  cardIconStyle: { color: 'var(--primary-color)' },
  cardTitle: "flex-1 min-w-0",
  cardTitleH3: "m-0 text-sm font-semibold truncate",
  cardTitleH3Style: { color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
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
  onSave,
  onCancel,
  getNestedValue,
  onTriggerUpload,
  onStepGuideVisibilityChange,
  validateCurrentTabData,
  onTabCompleted,
  isTutorialActive,
  completionPercentage,
  handleAutoFillClick,
  isUploading,
  isAnalyzing,
  autoFillButtonRef,
  uploadInputRef,
  handleFileUpload,
  uploadProgress,
  t: tProp,
  stepData
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
    getNestedValue,
    validateCurrentTabData,
    onTabCompleted,
    isTutorialActive
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
      // Error reading profile picture
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
          // Error deleting profile picture
          setPictureError(t('accountBasics.errors.uploadFailed'));
        } finally {
          setIsUploadingPicture(false);
        }
      } catch (error) {
        // Error deleting profile picture
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
      // Error uploading profile picture
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
      disabled: disabled || readOnly,
      readOnly: readOnly
    };

    if (type === 'date') {
      const maxDate = name === 'identity.dateOfBirth'
        ? new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]
        : undefined;
      const dateValue = value ? (typeof value === 'string' ? new Date(value) : value instanceof Date ? value : new Date(value)) : null;
      return (
        <DateField
          key={fieldKey}
          label={label}
          value={dateValue}
          onChange={(date) => {
            const syntheticEvent = {
              target: {
                name: name,
                value: date ? date.toISOString().split('T')[0] : null
              }
            };
            onInputChange(name, syntheticEvent.target.value);
          }}
          max={maxDate}
          required={required}
          error={error}
          onErrorReset={() => { }}
          disabled={disabled || readOnly}
          readOnly={readOnly}
          marginBottom={0}
        />
      );
    }

    if (type === 'dropdown') {
      const dropdownOptions = getDropdownOptions(optionsKey);
      const normalizedValue = value !== null && value !== undefined && value !== '' ? value : null;

      return (
        <SimpleDropdown
          key={fieldKey}
          label={commonProps.label}
          options={dropdownOptions}
          value={normalizedValue}
          onChange={(newValue) => {
            const normalizedNewValue = newValue !== null && newValue !== undefined && newValue !== '' ? newValue : null;
            onInputChange(name, normalizedNewValue);
          }}
          required={commonProps.required}
          error={commonProps.error}
        />
      );
    }

    return (
      <InputField
        key={fieldKey}
        {...commonProps}
        name={name}
        type={type === 'email' ? 'email' : (type === 'tel' ? 'tel' : 'text')}
        value={value || ''}
        onChange={(e) => onInputChange(name, e.target.value)}
        placeholder={placeholder ? t(placeholder) : ''}
      />
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
      case 'identity': return <FiUser className="w-4 h-4" style={styles.cardIconStyle} />;
      case 'address': return <FiMapPin className="w-4 h-4" style={styles.cardIconStyle} />;
      case 'contact': return <FiPhone className="w-4 h-4" style={styles.cardIconStyle} />;
      default: return <FiInfo className="w-4 h-4" style={styles.cardIconStyle} />;
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
        
        .personal-details-header-grid {
          display: grid;
          gap: 1.5rem;
          width: 100%;
          grid-template-columns: 1fr 1fr;
          grid-template-areas: 
            "title title"
            "completion autofill";
          align-items: center;
        }

        .header-title-row {
          grid-area: title;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .header-completion-centered {
          grid-area: completion;
          display: flex;
          justify-content: flex-start;
          width: 100%;
        }

        .header-autofill-right {
          grid-area: autofill;
          display: flex;
          justify-content: flex-end;
        }

        .personal-details-sections-wrapper {
          container-type: inline-size;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        @container (max-width: 700px) {
          .personal-details-sections-wrapper {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <div className={`${styles.sectionContainer} personal-details-container`}>


        {/* Title Card */}
        <div className={styles.headerCard}>
          <div className="personal-details-header-grid">
            <div className="header-title-row">
              <h2 className={styles.sectionTitle} style={styles.sectionTitleStyle}>{t('personalDetails.title')}</h2>
              <p className={styles.sectionSubtitle} style={styles.sectionSubtitleStyle}>{t('personalDetails.subtitle', 'Please ensure your personal details are accurate and up to date.')}</p>
            </div>

            {isTutorialActive && (
              <>
                <div className="header-completion-centered">
                  {formData && completionPercentage !== undefined && (
                    <div className="flex items-center gap-3 px-4 bg-muted/30 rounded-xl border-2 border-input" style={{ height: 'var(--boxed-inputfield-height)' }}>
                      <span className="text-sm font-medium text-muted-foreground">{t('dashboardProfile:profile.profileCompletion')}</span>
                      <div className="w-32 h-2.5 bg-muted rounded-full overflow-hidden shadow-inner">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 rounded-full"
                          style={{ width: `${completionPercentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-foreground">{completionPercentage}%</span>
                    </div>
                  )}
                </div>

                <div className="header-autofill-right">
                  <div className="relative" ref={autoFillButtonRef}>
                    <button
                      onClick={handleAutoFillClick}
                      disabled={isUploading || isAnalyzing}
                      className={cn(
                        "group px-4 flex items-center justify-center gap-2 rounded-xl transition-all shrink-0",
                        (isUploading || isAnalyzing) && "opacity-50 cursor-not-allowed",
                        (stepData?.highlightUploadButton) && "tutorial-highlight"
                      )}
                      style={{ height: 'var(--boxed-inputfield-height)', backgroundColor: 'rgba(255, 191, 14, 1)' }}
                      data-tutorial="profile-upload-button"
                    >
                      {isAnalyzing ? <LoadingSpinner size="sm" /> : <FiZap className="w-4 h-4 text-muted-foreground group-hover:text-black transition-colors" />}
                      <span className="text-sm font-medium text-muted-foreground group-hover:text-black transition-colors">
                        {isAnalyzing
                          ? t('dashboardProfile:documents.analyzing', 'Analyzing...')
                          : t('dashboardProfile:documents.autofill', 'Auto Fill')
                        }
                      </span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {isTutorialActive && uploadInputRef && (
            <UploadFile
              ref={uploadInputRef}
              onChange={handleFileUpload}
              isLoading={isUploading}
              progress={uploadProgress}
              accept=".pdf,.doc,.docx,.jpg,.png"
              label=""
              className="hidden"
            />
          )}
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
                    <FiFileText className="w-4 h-4" style={styles.cardIconStyle} />
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
                <Button
                  onClick={handleCancelUpload}
                  variant="secondary"
                >
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button
                  onClick={handleConfirmUpload}
                  variant="primary"
                  disabled={isUploadingPicture}
                >
                  {isUploadingPicture ? t('accountBasics.uploading', 'Uploading...') : t('common.confirm', 'Confirm')}
                </Button>
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
  onSave: PropTypes.func,
  onCancel: PropTypes.func.isRequired,
  getNestedValue: PropTypes.func.isRequired,
  onTriggerUpload: PropTypes.func,
  onStepGuideVisibilityChange: PropTypes.func
};

export default PersonalDetails;