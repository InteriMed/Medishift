import React, { useState, useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { healthRegistryAPI, companySearchAPI, companyDetailsAPI } from '../../../services/cloudFunctions';
import PersonnalizedInputField from '../../../components/BoxedInputFields/Personnalized-InputField';
import UploadFile from '../../../components/BoxedInputFields/UploadFile';
import SimpleDropdown from '../../../components/BoxedInputFields/Dropdown-Field';
import { useDropdownOptions } from '../../pages/profile/utils/DropdownListsImports';
import { FiLoader } from 'react-icons/fi';

import { DOCUMENT_TYPES } from '../constants/documentTypes';
import { processAndSaveProfessional, processAndSaveFacility } from '../services/documentProcessingService';
import { handleVerificationError, sendErrorEmail } from '../utils/errorHandler';
import { useDocumentRestore } from '../hooks/useDocumentRestore';
import GLNInputSection from './GLNInputSection';
import DocumentDisplay from './DocumentDisplay';
import { APILimitError, VerificationError } from './ErrorDisplay';
import { SuccessDisplay } from './SuccessDisplay';

const MANUAL_PROFESSION_OPTIONS = [
  { value: 'Pharmacy Assistant', label: 'Pharmacy Assistant' },
  { value: 'Dental Assistant', label: 'Dental Assistant' },
  { value: 'Nurse', label: 'Nurse' }
];


const GLNVerificationStep = React.forwardRef(({ role, onComplete, onBack, showHeader = true, hasGLN = true, hideMainButton = false, onVerifyClick, onReadyChange, onProcessingChange, hideGLNInfo = false, mode = 'full' }, ref) => {
  const { t } = useTranslation(['dashboard', 'common', 'dashboardProfile']);
  const { currentUser } = useAuth();
  const { phonePrefixOptions, jobRolesOptions } = useDropdownOptions();

  const [gln, setGln] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [verificationError, setVerificationError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const [isAPILimitError, setIsAPILimitError] = useState(false);

  const [showContactForm, setShowContactForm] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(0);

  const [contactMessage, setContactMessage] = useState('');
  const [contactPhonePrefix, setContactPhonePrefix] = useState('');
  const [contactPhoneNumber, setContactPhoneNumber] = useState('');

  const identityInputRef = useRef(null);
  const billingInputRef = useRef(null);

  const [documentType, setDocumentType] = useState('');
  const [documentFile, setDocumentFile] = useState(null);
  const [identityProgress, setIdentityProgress] = useState(0);
  const [professionalVerificationDetails, setProfessionalVerificationDetails] = useState(null);

  const [internalRef, setInternalRef] = useState('');
  const [profession, setProfession] = useState('');
  const [billingFile, setBillingFile] = useState(null);
  const [billingProgress, setBillingProgress] = useState(0);
  const [facilityIdVerificationDetails, setFacilityIdVerificationDetails] = useState(null);
  const [facilityBillVerificationDetails, setFacilityBillVerificationDetails] = useState(null);

  const [uploadedDocuments, setUploadedDocuments] = useState({
    identity: null,
    billing: null
  });

  const isProfessional = role === 'worker';
  const isFacility = role === 'company';
  const isResponsiblePersonMode = isFacility && mode === 'responsiblePerson';
  const isFacilityInfoMode = isFacility && mode === 'facilityInfo';

  const errorRef = useRef(null);
  const handleVerifyRef = React.useRef(null);

  const isReadyToVerify = React.useMemo(() => {
    if (hasGLN) {
      if (!gln || gln.length < 13) return false;
    }

    if (isProfessional) {
      const isFileAndTypeReady = !!(documentFile && documentType);
      if (!hasGLN) {
        return !!(isFileAndTypeReady && profession);
      }
      return isFileAndTypeReady;
    } else if (isResponsiblePersonMode) {
      return !!(documentFile && documentType);
    } else if (isFacilityInfoMode) {
      return !!billingFile;
    } else {
      return !!(documentFile && billingFile);
    }
  }, [hasGLN, gln, isProfessional, isResponsiblePersonMode, isFacilityInfoMode, documentFile, documentType, billingFile]);

  React.useImperativeHandle(ref, () => ({
    isProcessing,
    isReadyToVerify: isReadyToVerify
  }), [isProcessing, isReadyToVerify]);

  React.useEffect(() => {
    if (onReadyChange && typeof onReadyChange === 'function') {
      onReadyChange(isReadyToVerify);
    }
  }, [isReadyToVerify, onReadyChange]);

  React.useEffect(() => {
    if (onProcessingChange && typeof onProcessingChange === 'function') {
      onProcessingChange(isProcessing);
    }
  }, [isProcessing, onProcessingChange]);

  useDocumentRestore(currentUser, setDocumentFile, setBillingFile, setDocumentType, setUploadedDocuments, setVerificationError);


  const handleGLNChange = (e) => {
    const value = e?.target?.value ?? e ?? '';
    setGln(value);

    // Clear GLN error when user types
    if (fieldErrors.gln) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.gln;
        return newErrors;
      });
    }

    if (verificationStatus === 'error') {
      setVerificationStatus(null);
      setVerificationError('');
      setIsAPILimitError(false);
      setCountdownSeconds(0);
    }
  };


  const handleFileChange = useCallback((files, type) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (type === 'identity') {
      setDocumentFile(file);
    } else if (type === 'billing') {
      setBillingFile(file);
    }

    // Clear specific field error
    if (type === 'identity' && fieldErrors.identityDoc) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.identityDoc;
        return newErrors;
      });
    } else if (type === 'billing' && fieldErrors.billing) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.billing;
        return newErrors;
      });
    }

    setVerificationStatus(null);
    setVerificationError('');
    setIsAPILimitError(false);
    setCountdownSeconds(0);
  }, [fieldErrors]);



  const handleRemoveFile = useCallback((type) => {
    if (type === 'identity') {
      setDocumentFile(null);
      setIdentityProgress(0);
      setUploadedDocuments(prev => ({ ...prev, identity: null }));
    } else if (type === 'billing') {
      setBillingFile(null);
      setBillingProgress(0);
      setUploadedDocuments(prev => ({ ...prev, billing: null }));
    }

    // Clear specific field error
    if (type === 'identity' && fieldErrors.identityDoc) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.identityDoc;
        return newErrors;
      });
    } else if (type === 'billing' && fieldErrors.billing) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.billing;
        return newErrors;
      });
    }

    setVerificationStatus(null);
    setVerificationError('');
    setIsAPILimitError(false);
    setCountdownSeconds(0);
  }, [fieldErrors]);

  const handleProfessionChange = (value) => {
    setProfession(value);
    if (fieldErrors.profession) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.profession;
        return newErrors;
      });
    }
  };

  const handleDocumentTypeChange = (value) => {
    setDocumentType(value);
    // Document type helps resolve identity type errors
    if (fieldErrors.identityType) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.identityType;
        return newErrors;
      });
    }
  };



  const handleVerifyAccount = async () => {
    const glnString = gln.trim();
    const isGLNProvided = glnString.length > 0 || hasGLN; // Treat as provided (required) if hasGLN is checked
    const newFieldErrors = {};

    if (isProfessional && hasGLN) {
      if (!glnString) {
        newFieldErrors.gln = t('dashboard.onboarding.errors.missing_gln', 'Please enter your GLN.');
      } else if (!/^\d{13}$/.test(glnString)) {
        newFieldErrors.gln = t('dashboard.onboarding.errors.gln_length', 'GLN must be exactly 13 digits.');
      }
    } else if (isGLNProvided && glnString && !isProfessional) {
      // Only validate optional GLN for companies if provided
      if (!/^\d{13}$/.test(glnString)) {
        newFieldErrors.gln = t('dashboard.onboarding.errors.gln_length', 'GLN must be exactly 13 digits.');
      }
    }

    if (isProfessional) {
      if (!hasGLN && !profession) {
        newFieldErrors.profession = t('dashboard.onboarding.errors.missing_profession', 'Please select your profession');
      }

      if (!documentFile) {
        newFieldErrors.identityDoc = t('dashboard.onboarding.errors.missing_document', 'Missing verification document');
      }
      if (!documentType) {
        newFieldErrors.identityType = t('dashboard.onboarding.errors.missing_document_type', 'Missing document type');
      }

    } else if (isResponsiblePersonMode) {
      if (!documentFile) {
        newFieldErrors.identityDoc = t('dashboard.onboarding.errors.missing_document', 'Missing verification document');
      }
      if (!documentType) {
        newFieldErrors.identityType = t('dashboard.onboarding.errors.missing_document_type', 'Missing document type');
      }

    } else if (isFacilityInfoMode) {
      if (!billingFile) {
        newFieldErrors.billing = t('dashboard.onboarding.errors.missing_document', 'Missing verification document');
      }

    } else {
      if (!documentFile) {
        newFieldErrors.identityDoc = t('dashboard.onboarding.errors.missing_document', 'Missing verification document');
      }
      if (!documentType) {
        newFieldErrors.identityType = t('dashboard.onboarding.errors.missing_document_type', 'Missing document type');
      }

      if (!billingFile) {
        newFieldErrors.billing = t('dashboard.onboarding.errors.missing_document', 'Missing verification document');
      }

    }

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      setVerificationError('');
      return;
    }

    setIsProcessing(true);
    setVerificationStatus(null);
    setVerificationError('');
    setFieldErrors({});

    setIsAPILimitError(false);
    setShowContactForm(false);
    setIdentityProgress(0);
    setBillingProgress(0);

    try {
      let glnData = null;
      const userId = currentUser.uid;

      if (isGLNProvided) {
        let result;
        if (isProfessional || isResponsiblePersonMode) {
          result = await healthRegistryAPI(glnString);
        } else {
          result = await companySearchAPI(glnString);
        }

        if (result.success && result.data) {
          if (isProfessional || isResponsiblePersonMode) {
            if (result.data.entries && result.data.entries.length > 0) {
              glnData = result.data.entries[0];

              // Extract profession if available (prioritize English)
              if (glnData.professions && glnData.professions.length > 0) {
                const profObj = glnData.professions[0].profession;
                const extracted = profObj.textEn || profObj.textFr || profObj.textDe || profObj.textIt;
                if (extracted && isProfessional) {
                  // Update local variable for saving (state update might be too slow)
                  // We don't verify against 'profession' state here as API truth overrides manual input
                  // but we can update state for UI consistency if needed
                  setProfession(extracted);
                }
              }
            } else {
              throw new Error('No professional found with this GLN');
            }
          } else {
            if (result.data.entries && result.data.entries.length > 0) {
              const companyId = result.data.entries[0].id;
              const detailsResult = await companyDetailsAPI(companyId);
              if (detailsResult.success) {
                glnData = detailsResult.data;
              } else {
                throw new Error('Could not retrieve company details');
              }
            } else {
              throw new Error('No company found with this GLN');
            }
          }
        } else {
          throw new Error(result.error || 'Failed to verify GLN');
        }
      }

      if (isProfessional) {
        await processAndSaveProfessional(
          documentFile,
          documentType,
          userId,
          glnData,
          isGLNProvided,
          gln,
          currentUser,
          setIdentityProgress,
          setProfessionalVerificationDetails,
          setVerificationError,
          setUploadedDocuments,
          // Use extracted profession from glnData if available, otherwise use state
          (glnData && glnData.professions && glnData.professions.length > 0 && glnData.professions[0].profession.textEn)
            ? glnData.professions[0].profession.textEn
            : profession
        );
      } else if (isResponsiblePersonMode) {
        await processAndSaveFacility(
          documentFile,
          null,
          documentType,
          userId,
          glnData,
          isGLNProvided,
          gln,
          '',
          currentUser,
          setIdentityProgress,
          setBillingProgress,
          setFacilityIdVerificationDetails,
          setFacilityBillVerificationDetails,
          setUploadedDocuments
        );
      } else if (isFacilityInfoMode) {
        await processAndSaveFacility(
          null,
          billingFile,
          '',
          userId,
          glnData,
          isGLNProvided,
          gln,
          internalRef,
          currentUser,
          setIdentityProgress,
          setBillingProgress,
          setFacilityIdVerificationDetails,
          setFacilityBillVerificationDetails,
          setUploadedDocuments
        );
      } else {
        await processAndSaveFacility(
          documentFile,
          billingFile,
          documentType,
          userId,
          glnData,
          isGLNProvided,
          gln,
          internalRef,
          currentUser,
          setIdentityProgress,
          setBillingProgress,
          setFacilityIdVerificationDetails,
          setFacilityBillVerificationDetails,
          setUploadedDocuments
        );
      }

      setVerificationStatus('complete');

    } catch (error) {
      handleVerificationError(
        error,
        setVerificationError,
        setIsAPILimitError,
        setShowContactForm,
        setCountdownSeconds,
        setVerificationStatus
      );
    } finally {
      setIsProcessing(false);
    }
  };

  React.useEffect(() => {
    handleVerifyRef.current = handleVerifyAccount;
    if (onVerifyClick && typeof onVerifyClick === 'function') {
      onVerifyClick(handleVerifyAccount);
    }
  }, [onVerifyClick]);

  useEffect(() => {
    if (verificationStatus === 'complete') {
      setTimeout(() => onComplete(), 1500);
    }
  }, [verificationStatus, onComplete]);

  useEffect(() => {
    if ((isAPILimitError || showContactForm) && errorRef.current) {
      setTimeout(() => {
        errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }, [isAPILimitError, showContactForm]);

  useEffect(() => {
    if (countdownSeconds > 0) {
      const timer = setInterval(() => {
        setCountdownSeconds((prev) => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [countdownSeconds]);

  const handleSendErrorEmail = () => {
    sendErrorEmail(contactMessage, contactPhonePrefix, contactPhoneNumber, currentUser, role, gln, verificationError);
  };



  return (
    <div className="space-y-6 min-h-full flex flex-col justify-center">
      {showHeader && (
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold">
            {t('dashboard.onboarding.verify_account', 'Verify Your Account')}
          </h2>
          <p className="text-muted-foreground text-sm mt-2">
            {t('dashboard.onboarding.verify_intro', 'Please provide your details below. We use secure AI verification to certify your account.')}
          </p>

        </div>
      )}

      <GLNInputSection
        isProfessional={isProfessional || isResponsiblePersonMode}
        hasGLN={hasGLN}
        gln={gln}
        onGLNChange={handleGLNChange}
        verificationError={fieldErrors.gln || verificationError}
        showContactForm={showContactForm}
        isAPILimitError={isAPILimitError}
        hideGLNInfo={hideGLNInfo}
        t={t}
      />

      {isProfessional && !hasGLN && (
        <div className="pt-2">
          <div className="text-left w-full space-y-1 mb-2">
            <h3 className="font-semibold text-lg">{t('dashboard.onboarding.profession.title', 'Profession')}</h3>
          </div>
          <SimpleDropdown
            label=""
            options={MANUAL_PROFESSION_OPTIONS}
            value={profession}
            onChange={handleProfessionChange}
            placeholder={t('dashboard.onboarding.profession.select', 'Select Profession')}
            required={true}
            error={fieldErrors.profession || null}
            className={fieldErrors.profession ? "border-red-500" : ""}
          />
        </div>
      )}


      <div className="space-y-6 pt-4">
        <h3 className="font-semibold text-lg">{t('dashboard.onboarding.docs.title', 'Verification Documents')}</h3>

        {isFacility && (mode === 'responsiblePerson' || mode === 'full') && (
          <div className="space-y-3">
            <label className={`block text-sm font-medium ${fieldErrors.identityType ? 'text-destructive' : ''}`}>{t('dashboard.onboarding.docs.facility_id.label', '1. Responsible Person Identity Document')}</label>
            <p className={`text-xs ${fieldErrors.identityType ? 'text-destructive' : 'text-muted-foreground'} mb-0`}>{t('dashboard.onboarding.docs.facility_id.desc', 'Upload ID card of a responsible person listed in the registry.')}</p>
            <SimpleDropdown
              label=""
              options={DOCUMENT_TYPES}
              value={documentType}
              onChange={handleDocumentTypeChange}
              placeholder={t('dashboard.onboarding.docs.select_id_type', 'Select ID Type')}
              required={false}
              error={fieldErrors.identityType && !documentType ? fieldErrors.identityType : null}
            />

            <input
              ref={identityInputRef}
              type="file"
              accept=".pdf,.jpg,.png,.jpeg"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileChange(e.target.files, 'identity');
                }
              }}
            />

            {documentFile ? (
              <DocumentDisplay
                file={documentFile}
                onReplace={() => identityInputRef.current?.click()}
                onRemove={() => handleRemoveFile('identity')}
                hasError={!!fieldErrors.identityDoc}
                inputRef={identityInputRef}
              />
            ) : (
              <UploadFile
                onChange={(f) => handleFileChange(f, 'identity')}
                accept=".pdf,.jpg,.png,.jpeg"
                maxFileSize={5}
                label={t('dashboard.onboarding.docs.upload_id', 'Upload ID')}
                documentName="responsible_id"
                value={[]}
                isLoading={isProcessing}
                progress={identityProgress}
                error={fieldErrors.identityDoc}
                className={fieldErrors.identityDoc ? "border-destructive" : ""}
              />
            )}
          </div>
        )}

        {isFacility && (mode === 'facilityInfo' || mode === 'full') && (
          <>
            <div className="space-y-3 pt-4 border-t border-border/50">
              <label className={`block text-sm font-medium ${fieldErrors.billing ? 'text-destructive' : ''}`}>{t('dashboard.onboarding.docs.facility_bill.label', '2. Billing / Tax Document')}</label>
              <p className={`text-xs ${fieldErrors.billing ? 'text-destructive' : 'text-muted-foreground'} mb-0`}>{t('dashboard.onboarding.docs.facility_bill.desc', 'Upload a recent bill or tax document for facility verification.')}</p>

              <input
                ref={billingInputRef}
                type="file"
                accept=".pdf,.jpg,.png,.jpeg"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileChange(e.target.files, 'billing');
                  }
                }}
              />

              {billingFile ? (
                <DocumentDisplay
                  file={billingFile}
                  onReplace={() => billingInputRef.current?.click()}
                  onRemove={() => handleRemoveFile('billing')}
                  hasError={!!fieldErrors.billing}
                  inputRef={billingInputRef}
                />
              ) : (
                <UploadFile
                  onChange={(f) => handleFileChange(f, 'billing')}
                  accept=".pdf,.jpg,.png,.jpeg"
                  maxFileSize={5}
                  label={t('dashboard.onboarding.docs.upload_bill', 'Upload Bill')}
                  documentName="billing_doc"
                  value={[]}
                  isLoading={isProcessing}
                  progress={billingProgress}
                  error={fieldErrors.billing}
                  className={fieldErrors.billing ? "border-destructive" : ""}
                />
              )}
            </div>

            <div className="pt-2">
              <PersonnalizedInputField
                label={t('dashboard.onboarding.docs.internal_ref', 'Internal Reference / PO Number (Optional)')}
                value={internalRef}
                onChange={(e) => setInternalRef(e.target.value)}
                placeholder="e.g. PO-2024-001"
                error=""
              />
            </div>
          </>
        )}

        {isProfessional && (
          <div className="space-y-3">
            {hasGLN && (
              <p className="text-xs text-muted-foreground mt-0 mb-2">
                {t('dashboard.onboarding.profession.locked_notice', 'Note: The confirmed profession cannot be changed later. Please contact support for corrections.')}
              </p>
            )}

            <SimpleDropdown
              label=""
              options={DOCUMENT_TYPES}
              value={documentType}
              onChange={handleDocumentTypeChange}
              placeholder={t('dashboard.onboarding.docs.select_doc_type', 'Select document type')}

              required={false}
              error={fieldErrors.identityType}
              className={fieldErrors.identityType ? "border-red-500" : ""}
            />


            <input
              ref={identityInputRef}
              type="file"
              accept=".pdf,.jpg,.png,.jpeg"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileChange(e.target.files, 'identity');
                }
              }}
            />

            {documentFile ? (
              <DocumentDisplay
                file={documentFile}
                onReplace={() => identityInputRef.current?.click()}
                onRemove={() => handleRemoveFile('identity')}
                hasError={!!fieldErrors.identityDoc}
                inputRef={identityInputRef}
              />

            ) : (
              <UploadFile
                onChange={(f) => handleFileChange(f, 'identity')}
                accept=".pdf,.jpg,.png,.jpeg"
                maxFileSize={5}
                label=""
                documentName=""
                value={[]}
                isLoading={isProcessing}
                progress={identityProgress}
                error={fieldErrors.identityDoc}
                className={fieldErrors.identityDoc ? "border-red-500" : ""}
              />

            )}
          </div>
        )}
      </div>

      {isProcessing && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4">
            <FiLoader className="animate-spin text-4xl text-primary" />
            <p className="text-lg font-semibold">{t('dashboard.onboarding.buttons.verifying', 'Verifying Account...')}</p>
          </div>
        </div>
      )}

      {!hideMainButton && (
        <button
          onClick={handleVerifyAccount}
          disabled={isProcessing}
          className="modal-btn modal-btn-primary w-full py-4 shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <FiLoader className="animate-spin" />
              {t('dashboard.onboarding.buttons.verifying', 'Verifying Account...')}
            </>
          ) : (
            t('dashboard.onboarding.buttons.verify_account', 'Verify Account')
          )}
        </button>
      )}

      {isAPILimitError && (
        <APILimitError
          errorRef={errorRef}
          verificationError={verificationError}
          countdownSeconds={countdownSeconds}
          t={t}
        />
      )}

      {showContactForm && (
        <VerificationError
          errorRef={errorRef}
          verificationError={verificationError}
          t={t}
          contactMessage={contactMessage}
          setContactMessage={setContactMessage}
          contactPhonePrefix={contactPhonePrefix}
          setContactPhonePrefix={setContactPhonePrefix}
          contactPhoneNumber={contactPhoneNumber}
          setContactPhoneNumber={setContactPhoneNumber}
          phonePrefixOptions={phonePrefixOptions}
          onSendEmail={handleSendErrorEmail}
        />
      )}

      {verificationStatus === 'complete' && (
        <SuccessDisplay
          isProfessional={isProfessional}
          professionalVerificationDetails={professionalVerificationDetails}
          facilityIdVerificationDetails={facilityIdVerificationDetails}
          facilityBillVerificationDetails={facilityBillVerificationDetails}
          t={t}
        />
      )}
    </div>
  );
});

GLNVerificationStep.propTypes = {
  role: PropTypes.string.isRequired,
  onComplete: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
  showHeader: PropTypes.bool,
  hasGLN: PropTypes.bool,
  hideMainButton: PropTypes.bool,
  onVerifyClick: PropTypes.func,
  onReadyChange: PropTypes.func,
  onProcessingChange: PropTypes.func,
  hideGLNInfo: PropTypes.bool,
  mode: PropTypes.oneOf(['full', 'responsiblePerson', 'facilityInfo'])
};

export default GLNVerificationStep;
