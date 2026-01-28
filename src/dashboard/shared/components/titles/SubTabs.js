import React from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../../../services/actions/catalog/common/utils';
import { FiCheckCircle, FiCircle } from 'react-icons/fi';

const SubTabs = ({ 
  tabs = [], 
  activeTab, 
  onTabChange,
  isTabCompleted,
  className,
  orientation = 'horizontal'
}) => {
  const isVertical = orientation === 'vertical';

  return (
    <div 
      className={cn(
        "bg-card rounded-lg border border-border p-3",
        isVertical ? "flex flex-col gap-2" : "flex flex-row gap-2 overflow-x-auto scrollbar-hide",
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const isCompleted = isTabCompleted?.(tab.id);

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange?.(tab.id)}
            className={cn(
              "group relative flex items-center gap-3 rounded-lg hover:bg-muted/50 transition-all cursor-pointer border-2 border-transparent",
              isVertical ? "p-3 w-full" : "p-2 px-4 whitespace-nowrap",
              isActive && "bg-primary/5 border-primary/10"
            )}
          >
            {isVertical && (
              <div className={cn(
                "w-1.5 h-full absolute left-0 top-0 bottom-0 rounded-l-lg",
                isActive && "bg-primary"
              )} />
            )}
            {!isVertical && (
              <div className={cn(
                "w-full h-1 absolute bottom-0 left-0 right-0 rounded-b-lg",
                isActive && "bg-primary"
              )} />
            )}
            
            <div className={cn(
              "flex items-center justify-between w-full",
              isVertical ? "pl-2" : ""
            )}>
              <span className={cn(
                "text-sm font-medium",
                isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
              )}>
                {tab.label}
              </span>
              
              {isVertical && (
                <div className="ml-2 shrink-0">
                  {isCompleted ? (
                    <FiCheckCircle className="w-4 h-4 text-green-500/80" />
                  ) : (
                    <FiCircle className={cn(
                      "w-4 h-4",
                      isActive ? "text-primary/40" : "text-muted-foreground/20"
                    )} />
                  )}
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};

SubTabs.propTypes = {
  tabs: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired
    })
  ).isRequired,
  activeTab: PropTypes.string,
  onTabChange: PropTypes.func,
  isTabCompleted: PropTypes.func,
  className: PropTypes.string,
  orientation: PropTypes.oneOf(['horizontal', 'vertical'])
};

export default SubTabs;



