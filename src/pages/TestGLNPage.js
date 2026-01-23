import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { healthRegistryAPI, companySearchAPI, companyDetailsAPI } from '../services/cloudFunctions';

const TestGLNPage = () => {
    const { t } = useTranslation('pages');
    const [gln, setGln] = useState('');
    const [isProfessional, setIsProfessional] = useState(true);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleTest = async () => {
        setLoading(true);
        setResult(null);
        setError('');
        try {
            let data;
            if (isProfessional) {
                data = await healthRegistryAPI(gln);
            } else {
                const searchResult = await companySearchAPI(gln);
                if (searchResult.success && searchResult.data.entries && searchResult.data.entries.length > 0) {
                    const companyId = searchResult.data.entries[0].id;
                    data = await companyDetailsAPI(companyId);
                } else {
                    data = searchResult;
                }
            }
            setResult(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-10 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">{t('testGLN.title')}</h1>

            <div className="bg-white p-6 rounded-xl shadow-md space-y-4">
                <div className="flex gap-4 mb-4">
                    <button
                        onClick={() => setIsProfessional(true)}
                        className={`px-4 py-2 rounded ${isProfessional ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                    >
                        {t('testGLN.professional')}
                    </button>
                    <button
                        onClick={() => setIsProfessional(false)}
                        className={`px-4 py-2 rounded ${!isProfessional ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                    >
                        {t('testGLN.facility')}
                    </button>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">{t('testGLN.glnLabel')}</label>
                    <input
                        type="text"
                        value={gln}
                        onChange={(e) => setGln(e.target.value)}
                        className="w-full p-2 border rounded"
                        placeholder={t('testGLN.placeholder')}
                    />
                </div>

                <button
                    onClick={handleTest}
                    disabled={loading || !gln}
                    className="w-full bg-green-600 text-white py-2 rounded font-bold disabled:opacity-50"
                >
                    {loading ? t('testGLN.testing') : t('testGLN.testButton')}
                </button>

                {error && (
                    <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
                        {error}
                    </div>
                )}

                {result && (
                    <div className="mt-6">
                        <h2 className="text-xl font-semibold mb-2">{t('testGLN.result')}</h2>
                        <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-[500px] text-sm">
                            {JSON.stringify(result, null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TestGLNPage;
