import React from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../../utils/cn';

const PageHeader = React.forwardRef(({ 
  title, 
  subtitle, 
  actions,
  className
}, ref) => {
  return (
    <div 
      ref={ref}
      className={cn(
        "shrink-0 py-4 border-b border-border bg-card/30",
        className
      )}
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold text-foreground mb-3">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground leading-relaxed">
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
    </div>
  );
});

PageHeader.displayName = 'PageHeader';

PageHeader.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  actions: PropTypes.node,
  className: PropTypes.string
};

export default PageHeader;

