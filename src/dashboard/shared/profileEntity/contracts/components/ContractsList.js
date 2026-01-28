import React from 'react';
import PropTypes from 'prop-types';
import { format } from 'date-fns';
import { FiFileText, FiChevronRight } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import ContractStatusBadge from './ContractStatusBadge';
import { cn } from '../../../../utils/cn';

const ContractsList = ({ contracts, selectedContractId, onSelectContract }) => {
  const { t } = useTranslation(['contracts']);
  if (!contracts.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center" style={{ color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
        <p style={{ margin: 0 }}>{t('noContractsFound')}</p>
      </div>
    );
  }

  const formatDate = (date) => {
    if (!date) return '';

    try {
      if (date.toDate && typeof date.toDate === 'function') {
        const d = date.toDate();
        return format(d, 'MMM d, yyyy');
      }
      return format(new Date(date), 'MMM d, yyyy');
    } catch (error) {
      return '';
    }
  };

  const getContractTitle = (contract) => {
    return contract.title || contract.terms?.jobTitle || t('untitledContract');
  };

  const getContractSubtitle = (contract) => {
    const parts = [];
    if (contract.parties?.employer?.legalCompanyName) {
      parts.push(contract.parties.employer.legalCompanyName);
    } else if (contract.companyName) {
      parts.push(contract.companyName);
    }
    return parts.join(' • ');
  };

  const getStatusColor = (status) => {
    const statusKey = status?.toLowerCase() || 'unknown';
    switch (statusKey) {
      case 'pending':
        return 'var(--yellow-3)';
      case 'active':
        return 'var(--green-4)';
      case 'signed':
        return 'var(--green-4)';
      case 'sent':
        return 'var(--blue-4)';
      case 'draft':
        return 'var(--grey-4)';
      case 'completed':
        return 'var(--grey-4)';
      case 'cancelled':
        return 'var(--red-4)';
      default:
        return 'var(--grey-4)';
    }
  };

  return (
    <div className="flex flex-col gap-0">
      {contracts.map((contract, index) => {
        const isSelected = contract.id === selectedContractId;
        const title = getContractTitle(contract);
        const subtitle = getContractSubtitle(contract);
        const date = formatDate(contract.createdAt || contract.statusLifecycle?.timestamps?.createdAt);
        const status = contract.status || 'draft';
        const statusColor = getStatusColor(status);

        return (
          <button
            key={contract.id}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Contract button clicked:', contract.id);
              onSelectContract(contract.id);
            }}
            className={cn(
              "w-full flex items-center gap-4 pl-8 py-3 pr-0 transition-all text-left border-b border-border/40 last:border-b-0",
              "hover:bg-muted/30 cursor-pointer",
              isSelected
                ? "bg-white border-l-4"
                : "border-l-4 border-l-transparent hover:border-l-primary/30"
            )}
            style={{
              borderLeftColor: isSelected ? statusColor : 'transparent'
            }}
            type="button"
          >
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors",
              isSelected
                ? "bg-white"
                : "bg-muted/30"
            )}>
              <FiFileText
                className="w-6 h-6"
                style={{ color: isSelected ? statusColor : 'var(--text-light-color)' }}
              />
            </div>

            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
              <div className="flex items-start justify-between gap-2">
                <h3 className={cn(
                  "text-sm font-semibold truncate flex-1",
                  isSelected ? "" : ""
                )} style={{ color: isSelected ? statusColor : 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)', margin: 0 }}>
                  {title}
                </h3>
                <ContractStatusBadge status={status} isActive={isSelected} />
              </div>

              {subtitle && (
                <p className="text-xs truncate" style={{ color: isSelected ? statusColor : 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)', margin: 0 }}>
                  {subtitle}
                </p>
              )}

              {date && (
                <p className="text-xs" style={{ color: isSelected ? statusColor : 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)', margin: 0 }}>
                  {date}
                </p>
              )}
            </div>

            <FiChevronRight
              className={cn(
                "w-5 h-5 shrink-0 transition-colors",
                isSelected ? "" : "opacity-0"
              )}
              style={{ color: isSelected ? statusColor : 'var(--text-light-color)' }}
            />
          </button>
        );
      })}
    </div>
  );
};

ContractsList.propTypes = {
  contracts: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string,
    terms: PropTypes.shape({
      jobTitle: PropTypes.string
    }),
    parties: PropTypes.shape({
      employer: PropTypes.shape({
        legalCompanyName: PropTypes.string
      })
    }),
    companyName: PropTypes.string,
    createdAt: PropTypes.oneOfType([PropTypes.object, PropTypes.string, PropTypes.instanceOf(Date)]),
    statusLifecycle: PropTypes.shape({
      timestamps: PropTypes.shape({
        createdAt: PropTypes.oneOfType([PropTypes.object, PropTypes.string, PropTypes.instanceOf(Date)])
      })
    }),
    status: PropTypes.string
  })).isRequired,
  selectedContractId: PropTypes.string,
  onSelectContract: PropTypes.func.isRequired
};

export default ContractsList;
