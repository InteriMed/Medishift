import React from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../../../utils/cn';

const ContractStatusBadge = ({ status, isActive }) => {
  const getStatusLabel = () => {
    switch (status) {
      case 'draft': return 'Draft';
      case 'sent': return 'Sent';
      case 'signed': return 'Signed';
      case 'active': return 'Active';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      case 'pending': return 'Pending';
      default: return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
    }
  };

  const getStatusStyles = () => {
    const statusKey = status?.toLowerCase() || 'unknown';

    if (isActive) {
      switch (statusKey) {
        case 'pending':
          return {
            backgroundColor: '#ffffff',
            color: 'var(--yellow-3)',
            borderColor: 'var(--yellow-3)'
          };
        case 'active':
          return {
            backgroundColor: '#ffffff',
            color: 'var(--green-4)',
            borderColor: 'var(--green-4)'
          };
        case 'signed':
          return {
            backgroundColor: '#ffffff',
            color: 'var(--green-4)',
            borderColor: 'var(--green-4)'
          };
        case 'sent':
          return {
            backgroundColor: '#ffffff',
            color: 'var(--blue-4)',
            borderColor: 'var(--blue-4)'
          };
        case 'draft':
          return {
            backgroundColor: '#ffffff',
            color: 'var(--grey-4)',
            borderColor: 'var(--grey-4)'
          };
        case 'completed':
          return {
            backgroundColor: '#ffffff',
            color: 'var(--grey-4)',
            borderColor: 'var(--grey-4)'
          };
        case 'cancelled':
          return {
            backgroundColor: '#ffffff',
            color: 'var(--red-4)',
            borderColor: 'var(--red-4)'
          };
        default:
          return {
            backgroundColor: '#ffffff',
            color: 'var(--grey-4)',
            borderColor: 'var(--grey-4)'
          };
      }
    }

    switch (statusKey) {
      case 'draft':
        return {
          backgroundColor: 'transparent',
          color: 'var(--grey-3)',
          borderColor: 'var(--grey-3)'
        };
      case 'sent':
        return {
          backgroundColor: 'transparent',
          color: 'var(--color-logo-1)',
          borderColor: 'var(--color-logo-1)'
        };
      case 'signed':
        return {
          backgroundColor: 'transparent',
          color: 'var(--green-3)',
          borderColor: 'var(--green-3)'
        };
      case 'active':
        return {
          backgroundColor: 'transparent',
          color: 'var(--green-3)',
          borderColor: 'var(--green-3)'
        };
      case 'completed':
        return {
          backgroundColor: 'transparent',
          color: 'var(--grey-3)',
          borderColor: 'var(--grey-3)'
        };
      case 'cancelled':
        return {
          backgroundColor: 'transparent',
          color: 'var(--red-3)',
          borderColor: 'var(--red-3)'
        };
      case 'pending':
        return {
          backgroundColor: 'transparent',
          color: 'var(--yellow-3)',
          borderColor: 'var(--yellow-3)'
        };
      default:
        return {
          backgroundColor: 'transparent',
          color: 'var(--grey-3)',
          borderColor: 'var(--grey-3)'
        };
    }
  };

  return (
    <span
      className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border")}
      style={getStatusStyles()}
    >
      {getStatusLabel()}
    </span>
  );
};

ContractStatusBadge.propTypes = {
  status: PropTypes.string,
  isActive: PropTypes.bool
};

export default ContractStatusBadge;