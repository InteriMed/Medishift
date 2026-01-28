import React from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../../services/actions/catalog/common/utils';

const AdminPageHeader = ({ 
  title, 
  subtitle, 
  actions,
  badge,
  className 
}) => {
  return (
    <div className={cn("mb-6", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-foreground">
            {title}
          </h1>
          {badge && (
            <span className={cn(
              "px-3 py-1 text-sm font-medium rounded-full",
              badge.variant === 'warning' && "bg-yellow-100 text-yellow-800",
              badge.variant === 'error' && "bg-red-100 text-red-800",
              badge.variant === 'success' && "bg-green-100 text-green-800",
              badge.variant === 'info' && "bg-blue-100 text-blue-800"
            )}>
              {badge.text}
            </span>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-3">
            {actions}
          </div>
        )}
      </div>
      {subtitle && (
        <p className="text-muted-foreground mt-2">
          {subtitle}
        </p>
      )}
    </div>
  );
};

AdminPageHeader.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  actions: PropTypes.node,
  badge: PropTypes.shape({
    text: PropTypes.string.isRequired,
    variant: PropTypes.oneOf(['warning', 'error', 'success', 'info'])
  }),
  className: PropTypes.string
};

export default AdminPageHeader;

