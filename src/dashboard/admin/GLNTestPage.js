import React, { useState } from 'react';
import { healthRegistryAPI, companySearchAPI, companyDetailsAPI, gesRegAPI, commercialRegistrySearchAPI } from '../../services/cloudFunctions';
import Button from '../../components/BoxedInputFields/Button';
import PersonnalizedInputField from '../../components/BoxedInputFields/Personnalized-InputField';
import './GLNTestPage.css';

const GLNTestPage = () => {
  const [gln, setGln] = useState('7601001676183');
  const [registry, setRegistry] = useState('all');
  const [loading, setLoading] = useState(false);
  const [professionalResult, setProfessionalResult] = useState(null);
  const [companyResult, setCompanyResult] = useState(null);
  const [companyDetails, setCompanyDetails] = useState(null);
  const [gesRegResult, setGesRegResult] = useState(null);
  const [commercialRegistryResult, setCommercialRegistryResult] = useState(null);
  const [error, setError] = useState(null);

  const extractMedRegData = (entry) => {
    if (!entry) return null;
    const profession = entry.professions?.[0]?.profession;
    return {
      name: `${entry.firstName || ''} ${entry.name || ''}`,
      gln: entry.gln,
      professionEn: profession?.textEn,
      professionFr: profession?.textFr,
      professionDe: profession?.textDe,
      nationality: entry.nationality?.textEn,
      gender: entry.gender?.textEn
    };
  };

  const extractFacilityData = (entry, details) => {
    if (!entry && !details) return null;
    const source = details || entry;
    return {
      name: source.name,
      additionalName: source.additionalName,
      type: source.companyType?.textEn || source.companyType?.textFr,
      uid: source.uid,
      address: `${source.street || ''} ${source.streetNumber || ''}, ${source.zip || ''} ${source.city || ''}`,
      canton: source.canton,
      responsiblePersons: source.responsiblePersons?.map(p => p.name || `${p.firstName} ${p.lastName}`).join(', ')
    };
  };

  const extractGesRegData = (result) => {
    if (!result?.data) return null;
    const entries = result.data.Data || result.data.entries || (Array.isArray(result.data) ? result.data : [result.data]);
    if (!entries || entries.length === 0) return null;
    const entry = entries[0];

    return {
      name: `${entry.PersonFirstName || ''} ${entry.PersonLastName || ''}`,
      gln: entry.PersonGlnNumber,
      professions: entry.Diplomas?.map(d => d.ProfessionName).join(', ') || entry.ProfessionName,
      status: entry.CodeSearchLicenceStatus,
      canton: entry.CodeLicenceCanton
    };
  };

  const extractCommercialRegistryData = (result) => {
    if (!result?.data) return null;
    if (result.data.results && result.data.results.length > 0) {
      const entry = result.data.results[0];
      return {
        name: entry.name || '',
        uid: entry.uid || '',
        seat: entry.seat || '',
        legalForm: entry.legalForm || '',
        legalFormCode: entry.legalFormCode || '',
        chNum: entry.chNum || '',
        idCantonal: entry.idCantonal || '',
        status: entry.status || false
      };
    }
    return null;
  };

  const handleExtract = async () => {
    if (!gln || gln.trim().length === 0) {
      setError('Please enter a GLN number');
      return;
    }

    const glnString = gln.trim();
    setLoading(true);
    setError(null);

    if (registry === 'all' || registry === 'medReg') setProfessionalResult(null);
    if (registry === 'all' || registry === 'facilities') {
      setCompanyResult(null);
      setCompanyDetails(null);
    }
    if (registry === 'all' || registry === 'gesReg') setGesRegResult(null);
    if (registry === 'all' || registry === 'commercialRegistry') setCommercialRegistryResult(null);

    const promises = [];

    if (registry === 'all' || registry === 'medReg') {
      promises.push(
        healthRegistryAPI(glnString)
          .then(res => {
            setProfessionalResult(res);
            return { type: 'medReg', success: true };
          })
          .catch(err => {
            console.error('MedReg Error:', err);
            setProfessionalResult({ success: false, error: err.message });
          })
      );
    }

    if (registry === 'all' || registry === 'facilities') {
      promises.push(
        companySearchAPI(glnString)
          .then(async res => {
            setCompanyResult(res);
            if (res.success && res.data?.entries?.length > 0) {
              const companyId = res.data.entries[0].id;
              try {
                const detailsRes = await companyDetailsAPI(companyId);
                setCompanyDetails(detailsRes);
              } catch (detailErr) {
                setCompanyDetails({ success: false, error: detailErr.message });
              }
            }
            return { type: 'company', success: true };
          })
          .catch(err => {
            console.error('Company Search Error:', err);
            setCompanyResult({ success: false, error: err.message });
          })
      );
    }

    if (registry === 'all' || registry === 'gesReg') {
      promises.push(
        gesRegAPI(glnString)
          .then(res => {
            setGesRegResult(res);
            return { type: 'gesReg', success: true };
          })
          .catch(err => {
            console.error('GesReg Error:', err);
            setGesRegResult({ success: false, error: err.message });
          })
      );
    }

    if (registry === 'all' || registry === 'commercialRegistry') {
      promises.push(
        commercialRegistrySearchAPI(glnString)
          .then(res => {
            setCommercialRegistryResult(res);
            return { type: 'commercialRegistry', success: true };
          })
          .catch(err => {
            console.error('Commercial Registry Error:', err);
            setCommercialRegistryResult({ success: false, error: err.message });
          })
      );
    }

    await Promise.allSettled(promises);
    setLoading(false);
  };

  return (
    <div className="gln-test-page">
      <div className="gln-test-container">
        <h1 className="gln-test-title">GLN Extraction Test</h1>
        <p className="gln-test-description">
          Search specific registries: MedReg (Professionals), Facilities (Companies), GesReg (Health Professions), or Commercial Registry (Organizations).
        </p>

        <div className="gln-test-input-section">
          <div style={{ display: 'flex', gap: '1rem', width: '100%', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <PersonnalizedInputField
                label={registry === 'commercialRegistry' ? "Commercial Registry Number (UID/CHE)" : "GLN Number"}
                value={gln}
                onChange={(e) => setGln(e.target.value)}
                placeholder={registry === 'commercialRegistry' ? "CHE-106.029.451" : "Enter 13-digit GLN number"}
                disabled={loading}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="text-sm font-medium mb-1 block">Target Registry</label>
              <select
                value={registry}
                onChange={(e) => setRegistry(e.target.value)}
                className="w-full p-2 border rounded-md h-[42px] bg-background text-foreground"
                disabled={loading}
              >
                <option value="all">Check All Registries</option>
                <option value="medReg">MedReg (Medical Professionals)</option>
                <option value="facilities">Facilities (Company Registry)</option>
                <option value="gesReg">GesReg (Health Professions)</option>
                <option value="commercialRegistry">Commercial Registry (Organizations)</option>
              </select>
            </div>
          </div>

          <Button
            onClick={handleExtract}
            variant="primary"
            disabled={loading}
            className="gln-test-button mt-4"
          >
            {loading ? 'Extracting...' : 'Extract Data'}
          </Button>
        </div>

        {error && (
          <div className="gln-test-error">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="gln-test-results">
          {professionalResult && (
            <div className="gln-test-result-section">
              <h2 className="gln-test-result-title">1. MedReg Result</h2>
              {professionalResult.success && professionalResult.data?.entries?.[0] && (
                <div className="bg-blue-50 p-4 border rounded mb-4 text-sm">
                  <strong>Extracted Profile Data:</strong>
                  <pre>{JSON.stringify(extractMedRegData(professionalResult.data.entries[0]), null, 2)}</pre>
                </div>
              )}
              <div className="gln-test-json-container">
                <pre className="gln-test-json">{JSON.stringify(professionalResult, null, 2)}</pre>
              </div>
            </div>
          )}

          {(companyResult || companyDetails) && (
            <div className="gln-test-result-section">
              <h2 className="gln-test-result-title">2. Facilities Result</h2>
              {(companyResult?.data?.entries?.[0] || companyDetails?.data) && (
                <div className="bg-blue-50 p-4 border rounded mb-4 text-sm">
                  <strong>Extracted Facility Data:</strong>
                  <pre>{JSON.stringify(extractFacilityData(companyResult?.data?.entries?.[0], companyDetails?.data), null, 2)}</pre>
                </div>
              )}
              <div className="gln-test-json-container">
                <pre className="gln-test-json">
                  {JSON.stringify({ search: companyResult, details: companyDetails }, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {gesRegResult && (
            <div className="gln-test-result-section">
              <h2 className="gln-test-result-title">3. GesReg Result</h2>
              {gesRegResult.success && (
                <div className="bg-blue-50 p-4 border rounded mb-4 text-sm">
                  <strong>Extracted GesReg Data:</strong>
                  <pre>{JSON.stringify(extractGesRegData(gesRegResult), null, 2)}</pre>
                </div>
              )}
              <div className="gln-test-json-container">
                <pre className="gln-test-json">{JSON.stringify(gesRegResult, null, 2)}</pre>
              </div>
            </div>
          )}

          {commercialRegistryResult && (
            <div className="gln-test-result-section">
              <h2 className="gln-test-result-title">4. Commercial Registry Result</h2>
              {commercialRegistryResult.success && (
                <div className="bg-blue-50 p-4 border rounded mb-4 text-sm">
                  <strong>Extracted Commercial Registry Data:</strong>
                  <pre>{JSON.stringify(extractCommercialRegistryData(commercialRegistryResult), null, 2)}</pre>
                </div>
              )}
              <div className="gln-test-json-container">
                <pre className="gln-test-json">{JSON.stringify(commercialRegistryResult, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GLNTestPage;

