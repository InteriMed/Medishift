import React from 'react';
import { useTranslation } from 'react-i18next';
import { FiCheckCircle } from 'react-icons/fi';
import VerificationDetails from './VerificationDetails';

export const SuccessDisplay = ({ isProfessional, professionalVerificationDetails, facilityIdVerificationDetails, facilityBillVerificationDetails, t }) => {
  return (
    <>
      {isProfessional && professionalVerificationDetails && (
        <VerificationDetails
          verificationDetails={professionalVerificationDetails}
          documentName="Identity Document"
        />
      )}
      {!isProfessional && facilityIdVerificationDetails && (
        <VerificationDetails
          verificationDetails={facilityIdVerificationDetails}
          documentName="Responsible Person ID"
        />
      )}
      {!isProfessional && facilityBillVerificationDetails && (
        <VerificationDetails
          verificationDetails={facilityBillVerificationDetails}
          documentName="Billing Document"
        />
      )}

      <div className="p-6 bg-black/95 border border-gray-800 rounded-xl flex items-start gap-4 text-left animate-in fade-in slide-in-from-bottom-2 shadow-xl">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
            <FiCheckCircle className="w-7 h-7 text-white" />
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-1">
            {t('dashboard.onboarding.success.verified_title', 'Account Successfully Verified!')}
          </h3>
          <p className="text-gray-300 text-sm">
            {isProfessional
              ? t('dashboard.onboarding.success.professional_redirect', 'Your professional profile is now active. Redirecting to complete your profile setup...')
              : t('dashboard.onboarding.success.facility_redirect', 'Your facility profile is now active. Redirecting to complete your profile setup...')
            }
          </p>
        </div>
      </div>
    </>
  );
};


