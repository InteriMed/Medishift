import React from 'react';
import PropTypes from 'prop-types';
import { format } from 'date-fns';
import { FiEdit, FiTrash2, FiDownload, FiClock, FiUser, FiBriefcase, FiMapPin, FiDollarSign, FiFileText, FiX, FiMail, FiGrid, FiFile } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import ContractStatusBadge from './contractStatusBadge';
import { cn } from '../../../../utils/cn';

const ContractDetails = ({ contract, onEdit, onDelete, onClose, isMobile = false, workspaceContext, userPermissions, onToggleView, isPdfView }) => {

  const { t } = useTranslation(['contracts']);

  const handleDelete = () => {
    if (window.confirm(t('deleteConfirmation'))) {
      onDelete(contract.id);
    }
  };

  const handleDownloadPdf = async () => {
    if (!contract?.platformMeta?.generatedContractUrl) {
      return;
    }

    try {
      const response = await fetch(contract.platformMeta.generatedContractUrl);
      if (!response.ok) {
        throw new Error(t('downloadPdfFailed'));
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const contractTitle = contract.title || contract.terms?.jobTitle || 'contract';
      const fileName = `${contractTitle.replace(/\s+/g, '_')}_${contract.id}.pdf`;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      window.open(contract.platformMeta.generatedContractUrl, '_blank');
    }
  };

  const formatDate = (date) => {
    if (!date) return t('notSpecified');
    try {
      if (date.toDate && typeof date.toDate === 'function') {
        return format(date.toDate(), 'MMM d, yyyy');
      }
      return format(new Date(date), 'MMM d, yyyy');
    } catch (error) {
      return t('invalidDate');
    }
  };

  const formatCurrency = (amount, currency = 'CHF') => {
    if (!amount) return t('notSpecified');
    return `${amount} ${currency}`;
  };

  const styles = {
    sectionContainer: "flex flex-col gap-6 p-1 w-full max-w-[1000px] mx-auto",
    headerCard: "bg-card rounded-xl border border-border/60 p-6 pb-4 shadow-sm w-full max-w-[1000px] mx-auto",
    sectionTitle: "text-2xl font-semibold mb-0",
    sectionTitleStyle: { fontSize: '18px', color: 'var(--black)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
    sectionSubtitle: "text-sm font-medium text-muted-foreground",
    subtitleRow: "flex items-end justify-between gap-4",
    sectionsWrapper: "flex flex-col md:flex-row gap-6",
    leftColumn: "flex flex-col gap-6 flex-1",
    rightColumn: "flex flex-col gap-6 flex-1",
    sectionCard: "bg-card rounded-xl border border-border/60 p-6 shadow-sm w-full",
    cardHeader: "flex items-center gap-4 mb-0",
    cardIconWrapper: "p-2 rounded-lg bg-primary/10 text-primary",
    cardTitle: "flex-1",
    cardTitleH3: "m-0 text-base font-semibold",
    cardTitleH3Style: { color: 'var(--grey-5)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' },
    sectionContent: "space-y-4",
    grid: "grid grid-cols-1 gap-6",
    fieldWrapper: "space-y-2"
  };

  const contractTitle = contract.title || contract.terms?.jobTitle || t('untitledContract');
  const contractStatus = contract.status || 'draft';
  const createdAt = formatDate(contract.createdAt || contract.statusLifecycle?.timestamps?.createdAt);

  return (
    <div className={cn("flex flex-col h-full w-full overflow-y-auto")} style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)', scrollbarGutter: 'stable' }}>
      <div className={cn(styles.sectionContainer, "p-6")}>
        <div className={styles.headerCard}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center shrink-0">
                <FiFileText className="w-6 h-6" style={{ color: 'var(--primary-color)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 mb-0">
                  <h2 className={styles.sectionTitle} style={styles.sectionTitleStyle}>
                    {contractTitle}
                  </h2>
                  <ContractStatusBadge status={contractStatus} />
                </div>
                <p className={styles.sectionSubtitle} style={{ fontSize: '12px', fontFamily: 'var(--font-family-text, Roboto, sans-serif)', margin: 0 }}>
                  {t('created')} {createdAt}
                  {contract.parties?.employer?.legalCompanyName && ` • ${contract.parties.employer.legalCompanyName}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {onToggleView && (
                <button
                  onClick={onToggleView}
                  className="p-2 h-9 w-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
                  style={{ color: 'var(--text-light-color)' }}
                  title={isPdfView ? t('standardView') : t('pdfView')}
                >
                  {isPdfView ? (
                    <FiGrid size={18} />
                  ) : (
                    <FiFile size={18} />
                  )}
                </button>
              )}
              {contract.platformMeta?.generatedContractUrl && (
                <button
                  onClick={handleDownloadPdf}
                  className="p-2 h-9 w-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
                  style={{ color: 'var(--text-light-color)' }}
                  title={t('downloadPdf')}
                >
                  <FiDownload size={18} />
                </button>
              )}
              {onEdit && (
                <button
                  onClick={() => onEdit(contract)}
                  className="p-2 h-9 w-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
                  style={{ color: 'var(--text-light-color)' }}
                  title={t('editContract')}
                >
                  <FiEdit size={18} />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={handleDelete}
                  className="p-2 h-9 w-9 flex items-center justify-center rounded-lg hover:bg-destructive/10 transition-colors"
                  style={{ color: 'var(--danger-color)' }}
                  title={t('deleteContract')}
                >
                  <FiTrash2 size={18} />
                </button>
              )}
              {onClose && !isMobile && (
                <button
                  onClick={onClose}
                  className="p-2 h-9 w-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
                  style={{ color: 'var(--text-light-color)' }}
                  title={t('closeDetails')}
                >
                  <FiX size={20} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className={styles.sectionsWrapper}>
          <div className={styles.leftColumn}>
            <div className={styles.sectionCard}>
              <div className={styles.grid}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardIconWrapper}>
                    <FiBriefcase />
                  </div>
                  <div className={styles.cardTitle}>
                    <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>{t('contractOverview')}</h3>
                  </div>
                </div>
                <div className={styles.fieldWrapper}>
                  <DetailRow label={t('labels.position')} value={contract.terms?.jobTitle} />
                  <DetailRow label={t('labels.type')} value={contract.terms?.contractType} />
                  <DetailRow label={t('labels.workPercentage')} value={contract.terms?.workPercentage ? `${contract.terms.workPercentage}%` : null} />
                  <DetailRow label={t('labels.startDate')} value={formatDate(contract.terms?.startDate)} />
                  <DetailRow label={t('labels.endDate')} value={formatDate(contract.terms?.endDate)} />
                </div>
              </div>
            </div>

            {(contract.terms?.salary || contract.terms?.annualVacationDays) && (
              <div className={styles.sectionCard}>
                <div className={styles.grid}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardIconWrapper}>
                      <FiDollarSign />
                    </div>
                    <div className={styles.cardTitle}>
                      <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>{t('compensationAndBenefits')}</h3>
                    </div>
                  </div>
                  <div className={styles.fieldWrapper}>
                    <DetailRow label={t('labels.salary')} value={
                      contract.terms?.salary ?
                        `${formatCurrency(contract.terms.salary.grossAmount, contract.terms.salary.currency)} / ${contract.terms.salary.period}` : null
                    } />
                    <DetailRow label={t('labels.vacation')} value={contract.terms?.annualVacationDays ? `${contract.terms.annualVacationDays} days/year` : null} />
                  </div>
                </div>
              </div>
            )}

            {(contract.terms?.probationPeriod || contract.terms?.noticePeriod || contract.terms?.workingHours || contract.terms?.benefits) && (
              <div className={styles.sectionCard}>
                <div className={styles.grid}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardIconWrapper}>
                      <FiClock />
                    </div>
                    <div className={styles.cardTitle}>
                      <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>{t('termsAndConditions')}</h3>
                    </div>
                  </div>
                  <div className={styles.fieldWrapper}>
                    <DetailRow label={t('labels.probation')} value={contract.terms?.probationPeriod} />
                    <DetailRow label={t('labels.noticePeriod')} value={contract.terms?.noticePeriod} />
                    <DetailRow label={t('labels.workingHours')} value={contract.terms?.workingHours} />
                    {contract.terms?.benefits && (
                      <div className="pt-2">
                        <span className="font-medium block mb-2" style={{ fontSize: '12px', color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>{t('labels.benefits')}</span>
                        <p className="p-3 rounded-lg bg-muted/30" style={{ fontSize: '12px', color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>{contract.terms.benefits}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className={styles.rightColumn}>
            {contract.parties && (
              <div className={styles.sectionCard}>
                <div className={styles.grid}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardIconWrapper}>
                      <FiUser />
                    </div>
                    <div className={styles.cardTitle}>
                      <h3 className={styles.cardTitleH3} style={styles.cardTitleH3Style}>{t('involvedParties')}</h3>
                    </div>
                  </div>
                  {contract.parties.employer && (
                    <div className="space-y-3 p-4 rounded-lg bg-muted/10 border border-border/40">
                      <div className="flex items-center gap-2 text-base font-semibold" style={{ color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                        <FiBriefcase className="w-4 h-4" style={{ color: 'var(--text-light-color)' }} />
                        {t('employer')}
                      </div>
                      <div className="space-y-2">
                        <p className="font-medium" style={{ fontSize: '12px', color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                          {contract.parties.employer.legalCompanyName}
                        </p>
                        {contract.parties.employer.address && (
                          <div className="flex items-start gap-2" style={{ color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                            <FiMapPin className="w-4 h-4 shrink-0 mt-0.5" />
                            <div>
                              <p style={{ fontSize: '12px', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>{contract.parties.employer.address.street} {contract.parties.employer.address.number}</p>
                              <p style={{ fontSize: '12px', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>{contract.parties.employer.address.postalCode} {contract.parties.employer.address.city}</p>
                            </div>
                          </div>
                        )}
                        {contract.parties.employer.contactEmail && (
                          <div className="flex items-center gap-2" style={{ fontSize: '12px', color: 'var(--primary-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                            <FiMail className="w-4 h-4 shrink-0" />
                            <span>{contract.parties.employer.contactEmail}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {contract.parties.professional && (
                    <div className="space-y-3 p-4 rounded-lg bg-muted/10 border border-border/40">
                      <div className="flex items-center gap-2 text-base font-semibold" style={{ color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                        <FiUser className="w-4 h-4" style={{ color: 'var(--text-light-color)' }} />
                        {t('professional')}
                      </div>
                      <div className="space-y-2">
                        <p className="font-medium" style={{ fontSize: '12px', color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                          {contract.parties.professional.legalFirstName} {contract.parties.professional.legalLastName}
                        </p>
                        {contract.parties.professional.address && (
                          <div className="flex items-start gap-2" style={{ color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                            <FiMapPin className="w-4 h-4 shrink-0 mt-0.5" />
                            <div>
                              <p style={{ fontSize: '12px', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>{contract.parties.professional.address.street} {contract.parties.professional.address.number}</p>
                              <p style={{ fontSize: '12px', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>{contract.parties.professional.address.postalCode} {contract.parties.professional.address.city}</p>
                            </div>
                          </div>
                        )}
                        {contract.parties.professional.email && (
                          <div className="flex items-center gap-2" style={{ fontSize: '12px', color: 'var(--primary-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                            <FiMail className="w-4 h-4 shrink-0" />
                            <span>{contract.parties.professional.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const DetailRow = ({ label, value }) => {
  if (!value || value === 'Not specified') return null;
  return (
    <div className="flex justify-between items-start" style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
      <span className="shrink-0 font-semibold" style={{ fontSize: '12px', color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>{label}</span>
      <span className="text-right ml-4" style={{ fontSize: '12px', color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>{value}</span>
    </div>
  );
};

DetailRow.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

ContractDetails.propTypes = {
  contract: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string,
    status: PropTypes.string,
    createdAt: PropTypes.oneOfType([PropTypes.object, PropTypes.string, PropTypes.instanceOf(Date)]),
    statusLifecycle: PropTypes.shape({
      timestamps: PropTypes.shape({
        createdAt: PropTypes.oneOfType([PropTypes.object, PropTypes.string, PropTypes.instanceOf(Date)])
      })
    }),
    platformMeta: PropTypes.shape({
      generatedContractUrl: PropTypes.string
    }),
    parties: PropTypes.shape({
      employer: PropTypes.shape({
        legalCompanyName: PropTypes.string,
        address: PropTypes.shape({
          street: PropTypes.string,
          number: PropTypes.string,
          postalCode: PropTypes.string,
          city: PropTypes.string
        }),
        contactEmail: PropTypes.string
      }),
      professional: PropTypes.shape({
        legalFirstName: PropTypes.string,
        legalLastName: PropTypes.string,
        address: PropTypes.shape({
          street: PropTypes.string,
          number: PropTypes.string,
          postalCode: PropTypes.string,
          city: PropTypes.string
        }),
        email: PropTypes.string
      })
    }),
    terms: PropTypes.shape({
      jobTitle: PropTypes.string,
      contractType: PropTypes.string,
      workPercentage: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      startDate: PropTypes.oneOfType([PropTypes.object, PropTypes.string, PropTypes.instanceOf(Date)]),
      endDate: PropTypes.oneOfType([PropTypes.object, PropTypes.string, PropTypes.instanceOf(Date)]),
      salary: PropTypes.shape({
        grossAmount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        currency: PropTypes.string,
        period: PropTypes.string
      }),
      annualVacationDays: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      probationPeriod: PropTypes.string,
      noticePeriod: PropTypes.string,
      workingHours: PropTypes.string,
      benefits: PropTypes.string
    })
  }).isRequired,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  onClose: PropTypes.func,
  isMobile: PropTypes.bool,
  workspaceContext: PropTypes.object,
  userPermissions: PropTypes.object,
  onToggleView: PropTypes.func,
  isPdfView: PropTypes.bool
};

export default ContractDetails;
