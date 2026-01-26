import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { useMobileView } from '../../../hooks/useMobileView';
import { cn } from '../../../../utils/cn';
import {
  FiUsers,
  FiChevronLeft,
  FiChevronRight,
  FiBriefcase
} from 'react-icons/fi';

const OrganizationHeader = ({
  activeTab,
  onTabChange,
  collapsed = false,
  onToggle
}) => {
  const [windowWidth, setWindowWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth;
    }
    return 1200;
  });
  
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = useMobileView();
  const isReducedWidth = windowWidth < 700;
  const { t } = useTranslation(['organization', 'tabs']);

  const getSingleWordLabel = (labelKey) => {
    const fullLabel = t(labelKey);
    const firstWord = fullLabel.split(' ')[0];
    return firstWord;
  };

  const facilitySubTabs = [
    { id: 'organigram', labelKey: 'organization:tabs.organigram', icon: FiUsers },
    { id: 'hrCore', labelKey: 'organization:tabs.hrCore', icon: FiBriefcase }
  ];

  const handleTabClick = (tabId) => {
    onTabChange(tabId);
  };

  const getIconForTab = (tabId) => {
    switch (tabId) {
      case 'organigram':
        return <FiUsers className="w-5 h-5 shrink-0" />;
      case 'hrCore':
        return <FiBriefcase className="w-5 h-5 shrink-0" />;
      default:
        return <FiUsers className="w-5 h-5 shrink-0" />;
    }
  };

  const isPharmacyActive = activeTab === 'organigram' || activeTab === 'facility' || activeTab === 'hrCore';

  if (!isPharmacyActive) {
    return null;
  }

  return (
    <div className={cn(
      "w-full h-fit bg-card rounded-xl border border-border transition-all duration-300 ease-in-out overflow-x-hidden shadow-md",
      collapsed ? "p-2" : "p-4"
    )}>
      {onToggle && !isMobile && (
        <div className={cn(
          "border-b border-border mb-3",
          collapsed ? "px-1 pb-2" : "px-1 pb-3"
        )}>
          <button
            onClick={onToggle}
            className={cn(
              "w-full py-2 rounded-md hover:bg-muted/50 text-muted-foreground/70 transition-colors flex items-center gap-2",
              collapsed ? "justify-center px-2" : "justify-start px-2"
            )}
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? (
              <FiChevronRight size={18} />
            ) : (
              <>
                <FiChevronLeft size={18} />
                <span className="text-sm font-medium">Collapse</span>
              </>
            )}
          </button>
        </div>
      )}

      <nav className={cn("flex flex-col", "gap-3")}>
        {facilitySubTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              data-tab={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={cn(
                "group relative flex gap-3 rounded-lg hover:bg-muted/50 transition-all cursor-pointer border min-w-0",
                collapsed ? "p-2 justify-center" : "p-3",
                isActive && "bg-primary/5 border-primary/10",
                !isActive && "border-transparent"
              )}
            >
              <div className={cn(
                "w-1.5 h-full absolute left-0 top-0 bottom-0 rounded-l-lg",
                isActive && "bg-primary"
              )} />
              <div className={cn(
                "w-full flex items-center justify-between min-w-0",
                collapsed ? "justify-center pl-0" : "pl-2"
              )}>
                <div className={cn(
                  "flex items-center min-w-0",
                  collapsed ? "justify-center" : "gap-3"
                )}>
                  {!isReducedWidth && (
                    <div className={cn(
                      "transition-colors shrink-0",
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    )}>
                      {getIconForTab(tab.id)}
                    </div>
                  )}
                  {!collapsed && (
                    <span className={cn(
                      "text-sm font-medium truncate",
                      isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                    )}>
                      {getSingleWordLabel(tab.labelKey)}
                    </span>
                  )}
                </div>
                {!collapsed && (
                  <div className="ml-2 shrink-0">
                  </div>
                )}
              </div>
              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap border border-border">
                  {t(tab.labelKey, tab.id)}
                </div>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

OrganizationHeader.propTypes = {
  activeTab: PropTypes.string.isRequired,
  onTabChange: PropTypes.func.isRequired,
  collapsed: PropTypes.bool,
  onToggle: PropTypes.func
};

export default OrganizationHeader;
