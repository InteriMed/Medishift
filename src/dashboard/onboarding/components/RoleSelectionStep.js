import React from 'react';
import { useTranslation } from 'react-i18next';
import { FiBriefcase, FiHome, FiLayers } from 'react-icons/fi';

const RoleSelectionStep = ({ data, updateField, saveProgress, onboardingType, errors }) => {
    const { t } = useTranslation(['dashboard']);

    const handleRoleChange = (role) => {
        updateField('role', role);
        if (saveProgress) {
            saveProgress();
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <header className="text-center mb-12">
                <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-3 tracking-tight">
                    {t('dashboard.onboarding.step2.title')}
                </h1>
                <p className="text-gray-600 text-base mt-2">
                    {t('dashboard.onboarding.step2.description', 'Select the role that best describes your situation.')}
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <div
                    onClick={() => onboardingType !== 'facility' && handleRoleChange('worker')}
                    className={`p-8 rounded-xl border-2 transition-all cursor-pointer hover:shadow-lg ${
                        data.role === 'worker'
                            ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20'
                            : 'border-gray-200 bg-white hover:border-primary/50'
                    } ${onboardingType === 'facility' ? 'opacity-50 grayscale pointer-events-none cursor-not-allowed' : ''}`}
                >
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto ${
                        data.role === 'worker' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'
                    }`}>
                        <FiBriefcase className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-semibold text-center mb-2 text-gray-900">
                        {t('dashboard.onboarding.step2.professional')}
                    </h3>
                    <p className="text-sm text-gray-600 text-center">
                        {t('dashboard.onboarding.step2.professionalDescription')}
                    </p>
                </div>

                <div
                    onClick={() => handleRoleChange('company')}
                    className={`p-8 rounded-xl border-2 transition-all cursor-pointer hover:shadow-lg ${
                        data.role === 'company'
                            ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20'
                            : 'border-gray-200 bg-white hover:border-primary/50'
                    }`}
                >
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto ${
                        data.role === 'company' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'
                    }`}>
                        <FiHome className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-semibold text-center mb-2 text-gray-900">
                        {t('dashboard.onboarding.step2.facility')}
                    </h3>
                    <p className="text-sm text-gray-600 text-center">
                        {t('dashboard.onboarding.step2.facilityDescription')}
                    </p>
                </div>

                <div
                    onClick={() => handleRoleChange('chain')}
                    className={`p-8 rounded-xl border-2 transition-all cursor-pointer hover:shadow-lg ${
                        data.role === 'chain'
                            ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20'
                            : 'border-gray-200 bg-white hover:border-primary/50'
                    }`}
                >
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto ${
                        data.role === 'chain' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'
                    }`}>
                        <FiLayers className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-semibold text-center mb-2 text-gray-900">
                        {t('dashboard.onboarding.step2.organization')}
                    </h3>
                    <p className="text-sm text-gray-600 text-center">
                        {t('dashboard.onboarding.step2.organizationDescription')}
                    </p>
                </div>
            </div>

            {errors?.role && (
                <div className="mt-4 text-center text-red-600 text-sm">
                    {errors.role}
                </div>
            )}
        </div>
    );
};

export default RoleSelectionStep;

