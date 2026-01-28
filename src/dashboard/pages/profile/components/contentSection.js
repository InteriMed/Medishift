import React from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../../../utils/cn';

const ContentSection = ({ 
  title, 
  subtitle,
  children, 
  className,
  noPadding = false,
  loading = false
}) => {
  return (
    <div className={cn(
      "w-full bg-card rounded-lg border border-border hover:shadow-md transition-shadow",
      !noPadding && "p-6",
      className
    )}>
      {(title || subtitle) && (
        <div className={cn("mb-6", noPadding && "px-6 pt-6")}>
          {title && (
            <h3 className="text-lg font-semibold text-foreground mb-1">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-sm text-muted-foreground">
              {subtitle}
            </p>
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

ContentSection.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  noPadding: PropTypes.bool,
  loading: PropTypes.bool
};

export default ContentSection;

