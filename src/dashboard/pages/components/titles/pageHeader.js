import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { cn } from '../../../../services/utils/formatting';

const PageHeader = ({ 
  title, 
  subtitle, 
  tabs = [], 
  activeTab, 
  onTabChange,
  actions,
  className
}) => {
  const { t } = useTranslation();

  return (
    <div className={cn("w-full bg-card border-b border-border", className)}>
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-3">
              {actions}
            </div>
          )}
        </div>

        {tabs.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange?.(tab.id)}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap",
                  "hover:bg-muted/50",
                  activeTab === tab.id
                    ? "bg-primary text-white"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

PageHeader.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  tabs: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired
    })
  ),
  activeTab: PropTypes.string,
  onTabChange: PropTypes.func,
  actions: PropTypes.node,
  className: PropTypes.string
};

export default PageHeader;

