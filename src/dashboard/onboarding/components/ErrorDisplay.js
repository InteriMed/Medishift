import React from 'react';
import { useTranslation } from 'react-i18next';
import { FiAlertCircle, FiInfo, FiLoader, FiCheckCircle, FiMail } from 'react-icons/fi';
import PersonnalizedInputField from '../../../components/BoxedInputFields/Personnalized-InputField';
import SimpleDropdown from '../../../components/BoxedInputFields/Dropdown-Field';

export const APILimitError = ({ errorRef, verificationError, countdownSeconds, t }) => {
  return (
    <div ref={errorRef} className="relative overflow-hidden p-6 bg-white border-2 border-[var(--yellow-2)] rounded-xl shadow-lg flex gap-4 text-[var(--yellow-4)] animate-in fade-in slide-in-from-bottom-2" style={{ boxShadow: 'var(--shadow-elevated)' }}>
      <div className="flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-[var(--yellow-2)]/20 flex items-center justify-center border-2 border-[var(--yellow-2)]">
          <FiInfo className="w-6 h-6 text-[var(--yellow-4)]" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-base mb-2 text-[var(--yellow-4)]">{t('dashboard.onboarding.errors.service_high_demand', 'Service High Demand')}</h4>
        <p className="text-sm mb-3 leading-relaxed text-[var(--yellow-4)]/90">{verificationError}</p>
        {countdownSeconds > 0 && (
          <div className="mt-4 flex items-center gap-3">
            <div className="flex items-center gap-3 bg-[var(--yellow-1)] px-4 py-2.5 rounded-lg border border-[var(--yellow-2)] shadow-sm">
              <div className="relative">
                <FiLoader className="w-5 h-5 animate-spin text-[var(--yellow-4)]" />
              </div>
              <span className="text-sm font-semibold text-[var(--yellow-4)]">
                {t('dashboard.onboarding.errors.wait_message', { seconds: countdownSeconds, defaultValue: `Please wait ${countdownSeconds} seconds before trying again` })}
              </span>
            </div>
          </div>
        )}
        {countdownSeconds === 0 && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-[var(--green-1)] rounded-lg border border-[var(--green-3)]">
            <FiCheckCircle className="w-4 h-4 text-[var(--green-4)]" />
            <p className="text-sm font-medium text-[var(--green-4)]">
              {t('dashboard.onboarding.errors.can_try_again', 'You can now try again.')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export const VerificationError = ({ 
  errorRef, 
  verificationError, 
  t, 
  contactMessage, 
  setContactMessage, 
  contactPhonePrefix, 
  setContactPhonePrefix, 
  contactPhoneNumber, 
  setContactPhoneNumber, 
  phonePrefixOptions, 
  onSendEmail 
}) => {
  return (
    <div ref={errorRef} className="mt-8 relative overflow-hidden p-6 bg-white rounded-xl border-2 border-[var(--red-2)] shadow-lg animate-in fade-in slide-in-from-bottom-4" style={{ boxShadow: 'var(--shadow-elevated)' }}>
      <div className="flex items-start gap-4 mb-5">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-[var(--red-2)]/20 flex items-center justify-center border-2 border-[var(--red-2)]">
            <FiAlertCircle className="w-6 h-6 text-[var(--red-4)]" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg mb-2 text-[var(--red-4)]">{t('dashboard.onboarding.errors.verification_failed', 'Verification Failed')}</h3>
          <p className="text-sm text-[var(--red-4)]/90 mb-2 leading-relaxed">{verificationError}</p>
          <p className="text-xs text-[var(--red-4)]/80 mt-3 leading-relaxed">
            {t('dashboard.onboarding.errors.review_inputs', 'Please review your inputs. If you believe this is an error, contact our urgent support below.')}
          </p>
        </div>
      </div>

      <div className="space-y-4 pt-5 border-t-2 border-[var(--red-2)]/30">
        <style>{`
          .error-form-inputs .boxed-inputfield-input,
          .error-form-inputs .boxed-dropdown-container {
            border: 1px solid black !important;
          }
          .error-form-inputs .boxed-inputfield-input:hover,
          .error-form-inputs .boxed-dropdown-container:hover {
            border: 1px solid black !important;
          }
          .error-form-inputs .boxed-inputfield-input:focus,
          .error-form-inputs .boxed-dropdown-container:focus {
            border: 1px solid black !important;
          }
        `}</style>
        <h4 className="font-semibold text-sm flex items-center gap-2 text-[var(--red-4)]">
          <div className="w-8 h-8 rounded-lg bg-[var(--red-1)] flex items-center justify-center">
            <FiMail className="w-4 h-4 text-[var(--red-4)]" />
          </div>
          {t('dashboard.onboarding.errors.contact_support', 'Contact Urgent Support')}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end error-form-inputs">
          <SimpleDropdown
            label={t('dashboardProfile:personalDetails.phonePrefix', 'Phone Prefix')}
            options={phonePrefixOptions}
            value={contactPhonePrefix}
            onChange={setContactPhonePrefix}
            placeholder="+41"
          />
          <PersonnalizedInputField
            label={t('dashboardProfile:personalDetails.phoneNumber', 'Phone Number')}
            value={contactPhoneNumber}
            onChange={(e) => setContactPhoneNumber(e.target.value)}
            placeholder="79 000 0000"
          />
        </div>

        <textarea
          value={contactMessage}
          onChange={(e) => setContactMessage(e.target.value)}
          placeholder={t('dashboard.onboarding.errors.describe_issue', 'Describe the issue you are facing...')}
          className="w-full px-4 py-3 border border-black rounded-lg bg-white min-h-[100px] text-sm focus:outline-none transition-all"
          style={{ fontFamily: 'var(--font-family-text)' }}
        />

        <button
          onClick={onSendEmail}
          disabled={!contactMessage.trim()}
          className="modal-btn modal-btn-secondary w-full"
          style={{
            fontFamily: 'var(--font-family-text)',
            transition: 'var(--transition-normal)'
          }}
        >
          {t('dashboard.onboarding.errors.report_issue', 'Report Issue via Email')}
        </button>
      </div>
    </div>
  );
};


