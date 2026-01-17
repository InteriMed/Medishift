import React, { useState } from 'react';
import { uidAPI } from '../../../services/cloudFunctions';
import Button from '../../../components/BoxedInputFields/Button';
import PersonnalizedInputField from '../../../components/BoxedInputFields/Personnalized-InputField';
import './UIDTestPage.css';

const UIDTestPage = () => {
  const [uid, setUid] = useState('CHE-109.813.122');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFetch = async () => {
    if (!uid || uid.trim().length === 0) {
      setError('Please enter a UID number');
      return;
    }

    const uidString = uid.trim();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await uidAPI(uidString);
      setResult(response);

      if (response.success && response.data) {
        console.log('UID Data fetched:', JSON.stringify(response.data, null, 2));
      } else if (response.error) {
        setError(response.error);
      }
    } catch (err) {
      const errorMsg = err.details || err.message || 'An error occurred during UID fetch';
      setError(errorMsg);
      console.error('UID Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="uid-test-page">
      <div className="uid-test-container">
        <h1 className="uid-test-title">UID Business Information Test</h1>
        <p className="uid-test-description">
          Enter a UID number to fetch business information from the Swiss UID Registry
        </p>

        <div className="uid-test-input-section">
          <PersonnalizedInputField
            label="UID Number"
            value={uid}
            onChange={(e) => setUid(e.target.value)}
            placeholder="Enter UID (e.g., CHE-109.813.122)"
            disabled={loading}
          />
          <Button
            onClick={handleFetch}
            variant="primary"
            disabled={loading}
            className="uid-test-button"
          >
            {loading ? 'Fetching...' : 'Fetch UID Data'}
          </Button>
        </div>

        {error && (
          <div className="uid-test-error">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="uid-test-results">
          {result && (
            <div className="uid-test-result-section">
              <h2 className="uid-test-result-title">UID Business Information</h2>
              {result.success && result.data ? (
                <div className="uid-test-data-container">
                  <div className="uid-test-data-section">
                    <h3 className="uid-test-data-title">Core Information</h3>
                    <div className="uid-test-data-grid">
                      <div className="uid-test-data-item">
                        <span className="uid-test-data-label">UID:</span>
                        <span className="uid-test-data-value">{result.data.uid || 'N/A'}</span>
                      </div>
                      <div className="uid-test-data-item">
                        <span className="uid-test-data-label">Name:</span>
                        <span className="uid-test-data-value">{result.data.name || 'N/A'}</span>
                      </div>
                      {result.data.additionalName && (
                        <div className="uid-test-data-item">
                          <span className="uid-test-data-label">Additional Name:</span>
                          <span className="uid-test-data-value">{result.data.additionalName}</span>
                        </div>
                      )}
                      {result.data.translation && (
                        <div className="uid-test-data-item">
                          <span className="uid-test-data-label">Translation:</span>
                          <span className="uid-test-data-value">{result.data.translation}</span>
                        </div>
                      )}
                      {result.data.legalForm && (
                        <div className="uid-test-data-item">
                          <span className="uid-test-data-label">Legal Form:</span>
                          <span className="uid-test-data-value">{result.data.legalForm}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="uid-test-data-section">
                    <h3 className="uid-test-data-title">Address Information</h3>
                    <div className="uid-test-data-grid">
                      {result.data.street && (
                        <div className="uid-test-data-item">
                          <span className="uid-test-data-label">Street:</span>
                          <span className="uid-test-data-value">{result.data.street}</span>
                        </div>
                      )}
                      {result.data.postalCode && (
                        <div className="uid-test-data-item">
                          <span className="uid-test-data-label">Postal Code:</span>
                          <span className="uid-test-data-value">{result.data.postalCode}</span>
                        </div>
                      )}
                      {result.data.city && (
                        <div className="uid-test-data-item">
                          <span className="uid-test-data-label">City:</span>
                          <span className="uid-test-data-value">{result.data.city}</span>
                        </div>
                      )}
                      {result.data.canton && (
                        <div className="uid-test-data-item">
                          <span className="uid-test-data-label">Canton:</span>
                          <span className="uid-test-data-value">{result.data.canton}</span>
                        </div>
                      )}
                      {result.data.country && (
                        <div className="uid-test-data-item">
                          <span className="uid-test-data-label">Country:</span>
                          <span className="uid-test-data-value">{result.data.country}</span>
                        </div>
                      )}
                      {result.data.municipality && (
                        <div className="uid-test-data-item">
                          <span className="uid-test-data-label">Municipality:</span>
                          <span className="uid-test-data-value">{result.data.municipality}</span>
                        </div>
                      )}
                      {result.data.municipalityNumber && (
                        <div className="uid-test-data-item">
                          <span className="uid-test-data-label">Municipality Number:</span>
                          <span className="uid-test-data-value">{result.data.municipalityNumber}</span>
                        </div>
                      )}
                      {result.data.egid && (
                        <div className="uid-test-data-item">
                          <span className="uid-test-data-label">EGID:</span>
                          <span className="uid-test-data-value">{result.data.egid}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="uid-test-data-section">
                    <h3 className="uid-test-data-title">Commercial Register</h3>
                    <div className="uid-test-data-grid">
                      {result.data.hrStatus && (
                        <div className="uid-test-data-item">
                          <span className="uid-test-data-label">HR Status:</span>
                          <span className="uid-test-data-value">{result.data.hrStatus}</span>
                        </div>
                      )}
                      {result.data.hrReference && (
                        <div className="uid-test-data-item">
                          <span className="uid-test-data-label">HR Reference:</span>
                          <span className="uid-test-data-value">{result.data.hrReference}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="uid-test-data-section">
                    <h3 className="uid-test-data-title">VAT Information</h3>
                    <div className="uid-test-data-grid">
                      {result.data.vatStatus && (
                        <div className="uid-test-data-item">
                          <span className="uid-test-data-label">VAT Status:</span>
                          <span className="uid-test-data-value">{result.data.vatStatus}</span>
                        </div>
                      )}
                      {result.data.vatNumber && (
                        <div className="uid-test-data-item">
                          <span className="uid-test-data-label">VAT Number:</span>
                          <span className="uid-test-data-value">{result.data.vatNumber}</span>
                        </div>
                      )}
                      {result.data.vatStartDate && (
                        <div className="uid-test-data-item">
                          <span className="uid-test-data-label">VAT Start Date:</span>
                          <span className="uid-test-data-value">{result.data.vatStartDate}</span>
                        </div>
                      )}
                      {result.data.vatEndDate && (
                        <div className="uid-test-data-item">
                          <span className="uid-test-data-label">VAT End Date:</span>
                          <span className="uid-test-data-value">{result.data.vatEndDate}</span>
                        </div>
                      )}
                      {result.data.vatGroupUID && (
                        <div className="uid-test-data-item">
                          <span className="uid-test-data-label">VAT Group UID:</span>
                          <span className="uid-test-data-value">{result.data.vatGroupUID}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="uid-test-json-container">
                  <pre className="uid-test-json">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UIDTestPage;

