import React from 'react';
import { format } from 'date-fns';
import { FiFileText, FiX } from 'react-icons/fi';
import Button from '../../../../components/colorPicker/button';

const ContractPdfView = ({ contract, onClose }) => {
  const formatDate = (date) => {
    if (!date) return '';
    try {
      if (date.toDate && typeof date.toDate === 'function') {
        return format(date.toDate(), 'MMMM d, yyyy');
      }
      return format(new Date(date), 'MMMM d, yyyy');
    } catch (error) {
      return '';
    }
  };

  const formatCurrency = (amount, currency = 'CHF') => {
    if (!amount) return '';
    return `${amount} ${currency}`;
  };

  const contractTitle = contract.title || contract.terms?.jobTitle || 'Employment Contract';
  const createdAt = formatDate(contract.createdAt || contract.statusLifecycle?.timestamps?.createdAt);
  const startDate = formatDate(contract.terms?.startDate);
  const endDate = formatDate(contract.terms?.endDate);

  return (
    <div className="relative w-full max-w-[210mm] mx-auto bg-white shadow-lg" style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
      <style>{`
        .contract-pdf-close-button:hover {
          background-color: var(--grey-1) !important;
          border-color: var(--grey-3) !important;
        }
      `}</style>
      {onClose && (
        <div className="absolute top-4 right-4 z-10">
          <Button
            onClick={onClose}
            variant="primary"
            className="closeButton contract-pdf-close-button"
            style={{
              width: '40px',
              height: '40px',
              padding: 0,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--white)',
              border: '1px solid var(--grey-2)',
              boxShadow: 'var(--box-shadow-md)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}
          >
            <FiX 
              size={20} 
              style={{ color: 'var(--text-color)' }}
            />
          </Button>
        </div>
      )}
      <div className="p-[25mm] min-h-[297mm]" style={{ 
        fontFamily: 'var(--font-family-text, Roboto, sans-serif)',
        color: '#000000',
        lineHeight: '1.6'
      }}>
        <div className="mb-8 pb-6 border-b-2 border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <FiFileText className="w-8 h-8" style={{ color: 'var(--primary-color)' }} />
            <h1 className="text-3xl font-bold m-0" style={{ color: '#000000', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
              EMPLOYMENT CONTRACT
            </h1>
          </div>
          {createdAt && (
            <p className="text-sm m-0" style={{ color: '#666666', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
              Contract Date: {createdAt}
            </p>
          )}
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 m-0 uppercase tracking-wide" style={{ fontSize: '18px', color: '#000000', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
            {contractTitle}
          </h2>
        </div>

        <div className="mb-8 space-y-6">
          <section>
            <h3 className="text-lg font-bold mb-3 m-0 uppercase border-b border-gray-300 pb-2" style={{ color: '#000000', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
              1. PARTIES
            </h3>
            <div className="space-y-4">
              {contract.parties?.employer && (
                <div>
                  <p className="font-bold mb-2 m-0" style={{ color: '#000000', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                    Employer:
                  </p>
                  <p className="m-0 mb-1" style={{ color: '#000000', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                    {contract.parties.employer.legalCompanyName}
                  </p>
                  {contract.parties.employer.address && (
                    <div className="text-sm" style={{ color: '#000000', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                      <p className="m-0">
                        {contract.parties.employer.address.street} {contract.parties.employer.address.number}
                      </p>
                      <p className="m-0">
                        {contract.parties.employer.address.postalCode} {contract.parties.employer.address.city}
                      </p>
                    </div>
                  )}
                  {contract.parties.employer.contactEmail && (
                    <p className="text-sm m-0 mt-1" style={{ color: '#000000', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                      Email: {contract.parties.employer.contactEmail}
                    </p>
                  )}
                </div>
              )}

              {contract.parties?.professional && (
                <div>
                  <p className="font-bold mb-2 m-0" style={{ color: '#000000', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                    Employee:
                  </p>
                  <p className="m-0 mb-1" style={{ color: '#000000', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                    {contract.parties.professional.legalFirstName} {contract.parties.professional.legalLastName}
                  </p>
                  {contract.parties.professional.address && (
                    <div className="text-sm" style={{ color: '#000000', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                      <p className="m-0">
                        {contract.parties.professional.address.street} {contract.parties.professional.address.number}
                      </p>
                      <p className="m-0">
                        {contract.parties.professional.address.postalCode} {contract.parties.professional.address.city}
                      </p>
                    </div>
                  )}
                  {contract.parties.professional.email && (
                    <p className="text-sm m-0 mt-1" style={{ color: '#000000', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                      Email: {contract.parties.professional.email}
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold mb-3 m-0 uppercase border-b border-gray-300 pb-2" style={{ color: '#000000', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
              2. POSITION AND TERMS
            </h3>
            <div className="space-y-2 text-sm" style={{ color: '#000000', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
              {contract.terms?.jobTitle && (
                <p className="m-0">
                  <span className="font-semibold">Position:</span> {contract.terms.jobTitle}
                </p>
              )}
              {contract.terms?.contractType && (
                <p className="m-0">
                  <span className="font-semibold">Contract Type:</span> {contract.terms.contractType}
                </p>
              )}
              {contract.terms?.workPercentage && (
                <p className="m-0">
                  <span className="font-semibold">Work Percentage:</span> {contract.terms.workPercentage}%
                </p>
              )}
              {startDate && (
                <p className="m-0">
                  <span className="font-semibold">Start Date:</span> {startDate}
                </p>
              )}
              {endDate && (
                <p className="m-0">
                  <span className="font-semibold">End Date:</span> {endDate}
                </p>
              )}
              {contract.terms?.workingHours && (
                <p className="m-0">
                  <span className="font-semibold">Working Hours:</span> {contract.terms.workingHours}
                </p>
              )}
            </div>
          </section>

          {contract.terms?.salary && (
            <section>
              <h3 className="text-lg font-bold mb-3 m-0 uppercase border-b border-gray-300 pb-2" style={{ color: '#000000', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                3. COMPENSATION
              </h3>
              <div className="space-y-2 text-sm" style={{ color: '#000000', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                <p className="m-0">
                  <span className="font-semibold">Salary:</span> {formatCurrency(contract.terms.salary.grossAmount, contract.terms.salary.currency)} per {contract.terms.salary.period}
                </p>
                {contract.terms?.annualVacationDays && (
                  <p className="m-0">
                    <span className="font-semibold">Annual Vacation:</span> {contract.terms.annualVacationDays} days per year
                  </p>
                )}
              </div>
            </section>
          )}

          {(contract.terms?.probationPeriod || contract.terms?.noticePeriod || contract.terms?.benefits) && (
            <section>
              <h3 className="text-lg font-bold mb-3 m-0 uppercase border-b border-gray-300 pb-2" style={{ color: '#000000', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                4. TERMS AND CONDITIONS
              </h3>
              <div className="space-y-2 text-sm" style={{ color: '#000000', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                {contract.terms?.probationPeriod && (
                  <p className="m-0">
                    <span className="font-semibold">Probation Period:</span> {contract.terms.probationPeriod}
                  </p>
                )}
                {contract.terms?.noticePeriod && (
                  <p className="m-0">
                    <span className="font-semibold">Notice Period:</span> {contract.terms.noticePeriod}
                  </p>
                )}
                {contract.terms?.benefits && (
                  <div className="mt-3">
                    <p className="font-semibold mb-2 m-0">Benefits:</p>
                    <p className="m-0 whitespace-pre-wrap">{contract.terms.benefits}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          <section className="mt-12 pt-6 border-t-2 border-gray-800">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="font-bold mb-8 m-0" style={{ color: '#000000', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                  Employer Signature:
                </p>
                <div className="border-b border-gray-800 mb-2" style={{ minHeight: '40px' }}></div>
                <p className="text-xs m-0" style={{ color: '#666666', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                  {contract.parties?.employer?.legalCompanyName || 'Employer'}
                </p>
                <p className="text-xs m-0" style={{ color: '#666666', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                  Date: _______________
                </p>
              </div>
              <div>
                <p className="font-bold mb-8 m-0" style={{ color: '#000000', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                  Employee Signature:
                </p>
                <div className="border-b border-gray-800 mb-2" style={{ minHeight: '40px' }}></div>
                <p className="text-xs m-0" style={{ color: '#666666', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                  {contract.parties?.professional ? `${contract.parties.professional.legalFirstName} ${contract.parties.professional.legalLastName}` : 'Employee'}
                </p>
                <p className="text-xs m-0" style={{ color: '#666666', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                  Date: _______________
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ContractPdfView;

