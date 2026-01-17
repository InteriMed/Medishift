import React, { useState } from 'react';
import { healthRegistryAPI, companySearchAPI, companyDetailsAPI } from '../../../services/cloudFunctions';
import Button from '../../../components/BoxedInputFields/Button';
import PersonnalizedInputField from '../../../components/BoxedInputFields/Personnalized-InputField';
import './GLNTestPage.css';

const GLNTestPage = () => {
  const [gln, setGln] = useState('7601001419827');
  const [loading, setLoading] = useState(false);
  const [professionalResult, setProfessionalResult] = useState(null);
  const [companyResult, setCompanyResult] = useState(null);
  const [companyDetails, setCompanyDetails] = useState(null);
  const [error, setError] = useState(null);

  const handleExtract = async () => {
    if (!gln || gln.trim().length === 0) {
      setError('Please enter a GLN number');
      return;
    }

    const glnString = gln.trim();
    setLoading(true);
    setError(null);
    setProfessionalResult(null);
    setCompanyResult(null);
    setCompanyDetails(null);

    try {
      const professionalResponse = await healthRegistryAPI(glnString);
      setProfessionalResult(professionalResponse);

      if (professionalResponse.success && professionalResponse.data?.entries?.length > 0) {
        console.log('Professional GLN Data extracted:', JSON.stringify(professionalResponse.data, null, 2));
      }

      const companyResponse = await companySearchAPI(glnString);
      setCompanyResult(companyResponse);

      if (companyResponse.success && companyResponse.data?.entries?.length > 0) {
        const companyId = companyResponse.data.entries[0].id;
        const detailsResponse = await companyDetailsAPI(companyId);
        setCompanyDetails(detailsResponse);
        
        if (detailsResponse.success) {
          console.log('Company Details extracted:', JSON.stringify(detailsResponse.data, null, 2));
        }
      }
    } catch (err) {
      setError(err.message || 'An error occurred during GLN extraction');
      console.error('GLN Extraction Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gln-test-page">
      <div className="gln-test-container">
        <h1 className="gln-test-title">GLN Extraction Test</h1>
        <p className="gln-test-description">
          Enter a GLN number to extract data from the Swiss Health Registry
        </p>

        <div className="gln-test-input-section">
          <PersonnalizedInputField
            label="GLN Number"
            value={gln}
            onChange={(e) => setGln(e.target.value)}
            placeholder="Enter 13-digit GLN number"
            disabled={loading}
          />
          <Button
            onClick={handleExtract}
            variant="primary"
            disabled={loading}
            className="gln-test-button"
          >
            {loading ? 'Extracting...' : 'Extract GLN Data'}
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
              <h2 className="gln-test-result-title">Professional GLN Result (healthRegistryAPI)</h2>
              <div className="gln-test-json-container">
                <pre className="gln-test-json">
                  {JSON.stringify(professionalResult, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {companyResult && (
            <div className="gln-test-result-section">
              <h2 className="gln-test-result-title">Company GLN Result (companySearchAPI)</h2>
              <div className="gln-test-json-container">
                <pre className="gln-test-json">
                  {JSON.stringify(companyResult, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {companyDetails && (
            <div className="gln-test-result-section">
              <h2 className="gln-test-result-title">Company Details (companyDetailsAPI)</h2>
              <div className="gln-test-json-container">
                <pre className="gln-test-json">
                  {JSON.stringify(companyDetails, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GLNTestPage;











