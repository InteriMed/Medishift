import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiAlertCircle, FiLoader } from 'react-icons/fi';
import PersonnalizedInputField from '../components/BoxedInputFields/Personnalized-InputField';
import SimpleDropdown from '../components/BoxedInputFields/Dropdown-Field';
import UploadFile from '../components/BoxedInputFields/UploadFile';
import Button from '../components/BoxedInputFields/Button';
import { DOCUMENT_TYPES } from '../dashboard/onboarding/constants/documentTypes';
import { useAuth } from '../contexts/AuthContext';

const GLNTestVerifPage = () => {
    const { t } = useTranslation(['dashboard', 'common', 'dashboardProfile', 'pages']);
    const { currentUser } = useAuth();
    const [gln, setGln] = useState('');
    const [profession, setProfession] = useState('');
    const [documentType, setDocumentType] = useState('');
    const [documentFile, setDocumentFile] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});
    const [verificationError, setVerificationError] = useState('');
    const [verificationStatus, setVerificationStatus] = useState(null);
    const [testMode, setTestMode] = useState('professional');
    const [simulatedError, setSimulatedError] = useState('');

    const handleTestValidation = () => {
        const glnString = gln.replace(/[^0-9]/g, '');
        const errors = {};

        if (glnString && glnString.length !== 13) {
            errors.gln = t('dashboard.onboarding.errors.gln_length', 'GLN must be exactly 13 digits');
        } else if (!glnString) {
            errors.gln = t('dashboard.onboarding.errors.gln_required', 'GLN is required');
        }
        if (testMode === 'professional' && !profession) {
            errors.profession = t('dashboard.onboarding.errors.missing_profession', 'Profession is required');
        }
        if (!documentType) {
            errors.documentType = t('dashboard.onboarding.errors.missing_document_type', 'Document type is required');
        }
        if (!documentFile) {
            errors.documentFile = t('dashboard.onboarding.errors.missing_document', 'Document is required');
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            setVerificationError('');
            return;
        }

        setFieldErrors({});
    };

    const handleSimulateError = (errorType) => {
        setFieldErrors({});
        setSimulatedError(errorType);
        setVerificationStatus('error');

        if (errorType === 'api_limit') {
            setVerificationError(t('pages.glnTestVerif.errors.apiLimit'));
        } else if (errorType === 'verification_failed') {
            setVerificationError(t('pages.glnTestVerif.errors.verificationFailed'));
        } else if (errorType === 'network_error') {
            setVerificationError(t('pages.glnTestVerif.errors.networkError'));
        } else if (errorType === 'clear') {
            setVerificationError('');
            setVerificationStatus(null);
            setSimulatedError('');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
                    <h1 className="text-3xl font-black text-slate-900 mb-2">{t('pages.glnTestVerif.title')}</h1>
                    <p className="text-slate-600">{t('pages.glnTestVerif.description')}</p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
                    <h2 className="text-xl font-bold text-slate-900 mb-6">{t('pages.glnTestVerif.testMode.title')}</h2>
                    <div className="flex gap-4 mb-6">
                        <button
                            onClick={() => {
                                setTestMode('professional');
                                setFieldErrors({});
                                setVerificationError('');
                            }}
                            className={`px-6 py-3 rounded-xl font-semibold transition-all ${testMode === 'professional'
                                ? 'bg-primary text-white shadow-lg'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                        >
                            {t('pages.glnTestVerif.testMode.professional')}
                        </button>
                        <button
                            onClick={() => {
                                setTestMode('facility');
                                setFieldErrors({});
                                setVerificationError('');
                            }}
                            className={`px-6 py-3 rounded-xl font-semibold transition-all ${testMode === 'facility'
                                ? 'bg-primary text-white shadow-lg'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                        >
                            {t('pages.glnTestVerif.testMode.facility')}
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
                    <h2 className="text-xl font-bold text-slate-900 mb-6">{t('pages.glnTestVerif.formFields.title')}</h2>
                    <div className="space-y-6">
                        <PersonnalizedInputField
                            label={testMode === 'professional' ? t('pages.glnTestVerif.formFields.professionalGLN') : t('pages.glnTestVerif.formFields.companyGLN')}
                            required
                            value={gln}
                            onChange={(e) => {
                                setGln(e.target.value);
                                setFieldErrors(p => ({ ...p, gln: '' }));
                            }}
                            placeholder="760100..."
                            error={fieldErrors.gln}
                        />

                        {testMode === 'professional' && (
                            <SimpleDropdown
                                options={[
                                    { value: 'Doctor', label: t('pages.glnTestVerif.formFields.professions.doctor') },
                                    { value: 'Nurse', label: t('pages.glnTestVerif.formFields.professions.nurse') },
                                    { value: 'Pharmacist', label: t('pages.glnTestVerif.formFields.professions.pharmacist') }
                                ]}
                                value={profession}
                                onChange={(v) => {
                                    setProfession(v);
                                    setFieldErrors(p => ({ ...p, profession: '' }));
                                }}
                                placeholder={t('pages.glnTestVerif.formFields.selectProfession')}
                                required
                                error={fieldErrors.profession}
                            />
                        )}

                        <SimpleDropdown
                            options={DOCUMENT_TYPES}
                            value={documentType}
                            onChange={(v) => {
                                setDocumentType(v);
                                setFieldErrors(p => ({ ...p, documentType: '' }));
                            }}
                            placeholder={t('pages.glnTestVerif.formFields.selectDocumentType')}
                            required
                            error={fieldErrors.documentType}
                        />

                        <UploadFile
                            onChange={(f) => {
                                setDocumentFile(f[0]);
                                setFieldErrors(p => ({ ...p, documentFile: '' }));
                            }}
                            label={t('pages.glnTestVerif.formFields.uploadDocument')}
                            error={fieldErrors.documentFile}
                            value={documentFile}
                        />

                        <div className="flex gap-4">
                            <Button
                                onClick={handleTestValidation}
                                variant="primary"
                                className="flex-1"
                            >
                                {t('pages.glnTestVerif.formFields.testValidation')}
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
                    <h2 className="text-xl font-bold text-slate-900 mb-6">{t('pages.glnTestVerif.simulate.title')}</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <button
                            onClick={() => handleSimulateError('api_limit')}
                            className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-xl hover:bg-yellow-100 transition-colors text-left"
                        >
                            <div className="font-semibold text-yellow-900 mb-1">{t('pages.glnTestVerif.simulate.apiLimit.title')}</div>
                            <div className="text-xs text-yellow-700">{t('pages.glnTestVerif.simulate.apiLimit.description')}</div>
                        </button>
                        <button
                            onClick={() => handleSimulateError('verification_failed')}
                            className="p-4 bg-red-50 border-2 border-red-300 rounded-xl hover:bg-red-100 transition-colors text-left"
                        >
                            <div className="font-semibold text-red-900 mb-1">{t('pages.glnTestVerif.simulate.verificationFailed.title')}</div>
                            <div className="text-xs text-red-700">{t('pages.glnTestVerif.simulate.verificationFailed.description')}</div>
                        </button>
                        <button
                            onClick={() => handleSimulateError('network_error')}
                            className="p-4 bg-orange-50 border-2 border-orange-300 rounded-xl hover:bg-orange-100 transition-colors text-left"
                        >
                            <div className="font-semibold text-orange-900 mb-1">{t('pages.glnTestVerif.simulate.networkError.title')}</div>
                            <div className="text-xs text-orange-700">{t('pages.glnTestVerif.simulate.networkError.description')}</div>
                        </button>
                        <button
                            onClick={() => handleSimulateError('clear')}
                            className="p-4 bg-slate-50 border-2 border-slate-300 rounded-xl hover:bg-slate-100 transition-colors text-left"
                        >
                            <div className="font-semibold text-slate-900 mb-1">{t('pages.glnTestVerif.simulate.clear.title')}</div>
                            <div className="text-xs text-slate-700">{t('pages.glnTestVerif.simulate.clear.description')}</div>
                        </button>
                    </div>
                </div>

                {verificationError && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 animate-in fade-in slide-in-from-top-2 mb-8">
                        <FiAlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <p className="text-sm font-medium">{verificationError}</p>
                    </div>
                )}

                {Object.keys(fieldErrors).length > 0 && (
                    <div className="bg-white rounded-2xl shadow-xl p-8">
                        <h2 className="text-xl font-bold text-slate-900 mb-4">{t('pages.glnTestVerif.fieldErrors')}</h2>
                        <div className="space-y-2">
                            {Object.entries(fieldErrors).map(([field, error]) => (
                                <div key={field} className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
                                    <div className="font-semibold text-red-900 capitalize">{field.replace(/([A-Z])/g, ' $1').trim()}</div>
                                    <div className="text-sm text-red-700">{error}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GLNTestVerifPage;

