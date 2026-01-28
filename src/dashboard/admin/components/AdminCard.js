import React from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../../services/utils/formatting'

const AdminCard = ({ 
  title, 
  subtitle,
  children, 
  className,
  actions,
  loading = false,
  noPadding = false
}) => {
  return (
    <div className={cn(
      "bg-card rounded-xl border border-border hover:shadow-md transition-shadow",
      !noPadding && "p-6",
      className
    )}>
      {(title || subtitle || actions) && (
        <div className={cn(
          "flex items-center justify-between mb-4",
          noPadding && "px-6 pt-6"
        )}>
          <div>
            {title && (
              <h3 className="text-lg font-semibold text-foreground">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      )}
      
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className={cn(noPadding && "px-6 pb-6")}>
          {children}
        </div>
      )}
    </div>
  );
};

AdminCard.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  actions: PropTypes.node,
  loading: PropTypes.bool,
  noPadding: PropTypes.bool
};

export default AdminCard;



