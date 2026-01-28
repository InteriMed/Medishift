import React from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { FiHome, FiShield } from 'react-icons/fi';
import Switch from '../../../components/boxedInputFields/switch';

const LegalConsiderationsStep = ({ data, updateField }) => {
    const { t } = useTranslation(['dashboard']);
    const { lang } = useParams();

    return (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <header className="text-center mb-12">
                <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-3 tracking-tight">
                    {t('dashboard.onboarding.step1.title')}
                </h1>
            </header>

            <div className="space-y-6 max-w-4xl mx-auto">
                <div className="bg-gray-50 p-6 md:p-8 rounded-xl border border-gray-200 shadow-sm leading-relaxed">
                    {data.belongsToFacility ? (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            <p className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4">
                                {t('dashboard.onboarding.step1.facilityLegalNotice')}
                            </p>
                            <div className="text-gray-700 space-y-3">
                                <p>{t('dashboard.onboarding.step1.facilityLegalText1')}</p>
                                <p>{t('dashboard.onboarding.step1.facilityLegalText2')}</p>
                                <p>{t('dashboard.onboarding.step1.facilityLegalText3')}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            <p className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4">
                                {t('dashboard.onboarding.step1.professionalLegalNotice')}
                            </p>
                            <div className="text-gray-700 space-y-3">
                                <p>{t('dashboard.onboarding.step1.professionalLegalText1')}</p>
                                <p>{t('dashboard.onboarding.step1.professionalLegalText2')}</p>
                                <p>{t('dashboard.onboarding.step1.professionalLegalText3')}</p>
                                <p>{t('dashboard.onboarding.step1.professionalLegalText4')}</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    {data.role === 'worker' && (
                        <div
                            className={`p-6 px-8 rounded-xl border transition-all flex items-center gap-6 cursor-pointer hover:shadow-sm ${
                                data.belongsToFacility 
                                    ? 'border-primary bg-primary/5 shadow-sm' 
                                    : 'border-gray-200 bg-white hover:border-primary/50'
                            }`}
                            onClick={(e) => {
                                if (!e.target.closest('.switch-wrapper')) {
                                    updateField('belongsToFacility', !data.belongsToFacility);
                                }
                            }}
                        >
                            <div className={`w-14 h-14 flex-shrink-0 rounded-xl flex items-center justify-center transition-all ${
                                data.belongsToFacility 
                                    ? 'bg-primary text-white shadow-md' 
                                    : 'bg-gray-100 text-gray-400'
                            }`}>
                                <FiHome className="w-7 h-7" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-gray-900 text-lg">
                                    {t('dashboard.onboarding.step1.areYouEmployed')}
                                </h3>
                                <p className="text-gray-600 text-sm text-left mt-1">
                                    {t('dashboard.onboarding.step1.areYouEmployedDescription')}
                                </p>
                            </div>
                            <Switch
                                checked={data.belongsToFacility || false}
                                onChange={(val) => updateField('belongsToFacility', val)}
                                switchColor="var(--color-logo-1)"
                                marginBottom="0"
                            />
                        </div>
                    )}

                    <div
                        className={`p-6 px-8 rounded-xl border transition-all flex items-center gap-6 cursor-pointer hover:shadow-sm ${
                            data.legalConsiderationsConfirmed 
                                ? 'border-primary bg-primary/5 shadow-sm' 
                                : 'border-gray-200 bg-white hover:border-primary/50'
                        }`}
                        onClick={(e) => {
                            if (!e.target.closest('.switch-wrapper') && !e.target.closest('a')) {
                                updateField('legalConsiderationsConfirmed', !data.legalConsiderationsConfirmed);
                            }
                        }}
                    >
                        <div className={`w-14 h-14 flex-shrink-0 rounded-xl flex items-center justify-center transition-all ${
                            data.legalConsiderationsConfirmed 
                                ? 'bg-primary text-white shadow-md' 
                                : 'bg-gray-100 text-gray-400'
                        }`}>
                            <FiShield className="w-7 h-7" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 text-lg">
                                {t('dashboard.onboarding.step1.termsAcceptance')}
                            </h3>
                            <p className="text-gray-600 text-sm text-left mt-1">
                                {t('dashboard.onboarding.step1.termsAcceptanceText')}{' '}
                                <a 
                                    href={`/${lang}/terms-of-service`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-primary hover:text-primary/80 underline font-medium"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {t('dashboard.onboarding.step1.termsOfService')}
                                </a>
                            </p>
                        </div>
                        <Switch
                            checked={data.legalConsiderationsConfirmed || false}
                            onChange={(val) => updateField('legalConsiderationsConfirmed', val)}
                            switchColor="var(--color-logo-1)"
                            marginBottom="0"
                        />
                    </div>

                    <div className="mt-6 p-4 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 text-xs leading-relaxed italic">
                        {t('dashboard.onboarding.step1.note')}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LegalConsiderationsStep;

