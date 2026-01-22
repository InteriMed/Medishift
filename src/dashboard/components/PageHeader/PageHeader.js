import React from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../../utils/cn';

const PageHeader = ({ 
  title, 
  subtitle, 
  actions,
  className,
  variant = 'default'
}) => {
  return (
    <div 
      className={cn(
        "shrink-0 px-6 sm:px-8 py-8 border-b border-border/60 transition-all duration-300",
        variant === 'default' && "bg-gradient-to-r from-card/50 via-card/30 to-transparent",
        variant === 'solid' && "bg-card/50",
        variant === 'minimal' && "bg-transparent",
        className
      )}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2 tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
        
        {actions && (
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 self-start sm:self-center">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

PageHeader.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  actions: PropTypes.node,
  className: PropTypes.string,
  variant: PropTypes.oneOf(['default', 'solid', 'minimal'])
};

export default PageHeader;

