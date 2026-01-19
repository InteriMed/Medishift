import React from 'react';
import { useTranslation } from 'react-i18next';
import PersonnalizedInputField from '../../../components/BoxedInputFields/Personnalized-InputField';

const GLNInputSection = ({ 
  isProfessional, 
  hasGLN, 
  gln, 
  onGLNChange, 
  verificationError, 
  showContactForm, 
  isAPILimitError, 
  hideGLNInfo,
  t 
}) => {
  if (!hasGLN) return null;

  return (
    <div className={hideGLNInfo ? "w-full space-y-6" : "w-full space-y-6"}>
      <div className={`space-y-6 flex flex-col text-left ${hideGLNInfo ? 'w-full' : ''}`}>
        <h2 className="text-2xl font-black text-slate-900 mb-2 px-2">
          {isProfessional ? t('dashboard.onboarding.input.professional_gln', 'Professional GLN') : t('dashboard.onboarding.input.company_gln', 'Company GLN')}
        </h2>

        <div className="pt-2">
          <div className="animate-in fade-in">
            <PersonnalizedInputField
              label={
                isProfessional
                  ? (hasGLN ? t('dashboard.onboarding.input.professional_gln', 'Professional GLN') : t('dashboard.onboarding.input.professional_gln_optional', 'Professional GLN (Optional)'))
                  : t('dashboard.onboarding.input.company_gln_optional', 'Company GLN (Optional)')
              }
              required={isProfessional && hasGLN}
              value={gln}
              onChange={onGLNChange}
              placeholder="760100..."
              error={verificationError && !showContactForm && !isAPILimitError ? verificationError : ''}
            />
          </div>
        </div>
      </div>

      {!hideGLNInfo && (
        <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 shadow-sm leading-relaxed">
          {isProfessional ? (
            <div className="space-y-4 animate-in fade-in duration-300">
              <p className="text-xl font-black text-slate-900 border-b border-slate-200 pb-3">
                {t('dashboard.onboarding.professional_gln.title', 'GLN information')}
              </p>
              <p className="text-slate-700">
                {t('dashboard.onboarding.professional_gln.text1', 'Professional number required for certified medical professionals in Switzerland (pharmacists, dentists, doctors, etc.).')}
              </p>
              <p className="text-slate-700">
                {t('dashboard.onboarding.professional_gln.text2', 'For other professions (nurses, assistants, etc.), this number is not mandatory.')}
              </p>
              <p className="text-slate-700 font-semibold">
                {t('dashboard.onboarding.professional_gln.text3', 'Enable if you have your own GLN number.')}
              </p>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in duration-300">
              <p className="text-xl font-black text-slate-900 border-b border-slate-200 pb-3">
                {t('dashboard.onboarding.company_gln.title', 'GLN information')}
              </p>
              <p className="text-slate-700">
                {t('dashboard.onboarding.company_gln.text1', 'The GLN (Global Location Number) is a unique identifier for your facility or company.')}
              </p>
              <p className="text-slate-700">
                {t('dashboard.onboarding.company_gln.text2', 'Providing your GLN helps us verify your business details automatically and speeds up the verification process.')}
              </p>
              <p className="text-slate-700">
                {t('dashboard.onboarding.company_gln.text3', 'This field is optional, but recommended for faster account verification.')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GLNInputSection;

