import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { useMobileView } from '../../../hooks/useMobileView';
import { cn } from '../../../../utils/cn';
import {
  FiUser,
  FiBriefcase,
  FiCreditCard,
  FiFileText,
  FiSettings,
  FiCheckCircle,
  FiCircle,
  FiChevronLeft,
  FiChevronRight
} from 'react-icons/fi';

const ProfileHeader = ({
  profile,
  config,
  activeTab,
  onTabChange,
  isTabCompleted,
  isTabAccessible,
  nextIncompleteSection,
  highlightTabId,
  collapsed = false,
  onToggle
}) => {
  const isMobile = useMobileView();
  const { t } = useTranslation(['dashboardProfile', 'tabs']);

  const tabs = config?.tabs || [];

  const handleTabClick = (tabId) => {
    if (isTabAccessible(profile, tabId, config)) {
      onTabChange(tabId);
    }
  };

  const getIconForTab = (tabId) => {
    switch (tabId) {
      case 'personalDetails':
        return <FiUser className="w-5 h-5 shrink-0" />;
      case 'professionalBackground':
        return <FiBriefcase className="w-5 h-5 shrink-0" />;
      case 'billingInformation':
        return <FiCreditCard className="w-5 h-5 shrink-0" />;
      case 'documentUploads':
        return <FiFileText className="w-5 h-5 shrink-0" />;
      case 'settings':
        return <FiSettings className="w-5 h-5 shrink-0" />;
      default:
        return <FiUser className="w-5 h-5 shrink-0" />;
    }
  };

  return (
    <div className={cn(
      "w-full h-fit bg-card rounded-xl border border-border/60 transition-all duration-300 ease-in-out overflow-x-hidden",
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
              "w-full h-10 rounded-md hover:bg-muted/50 text-muted-foreground/70 transition-colors flex items-center gap-2",
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
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isCompleted = isTabCompleted(profile, tab.id, config);
          const isAccessible = isTabAccessible(profile, tab.id, config);
          const isHighlighted = highlightTabId === tab.id && !isCompleted;

          if (!isAccessible) {
            return (
              <div
                key={tab.id}
                data-tab={tab.id}
                data-tutorial-disabled="true"
                className={cn(
                  "group relative flex gap-3 rounded-lg border min-w-0 transition-all duration-200 outline-none",
                  collapsed ? "p-2 justify-center" : "p-3",
                  "text-muted-foreground/40 cursor-not-allowed pointer-events-none select-none",
                  "border-transparent"
                )}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.nativeEvent && e.nativeEvent.stopImmediatePropagation && e.nativeEvent.stopImmediatePropagation();
                  console.log(`[ProfileHeader] Click prevented on ${tab.id} - tab is locked (rendered as div)`);
                  return false;
                }}
              >
                <div className={cn(
                  "w-1.5 h-full absolute left-0 top-0 bottom-0 rounded-l-lg"
                )} />
                <div className={cn(
                  "w-full flex items-center justify-between min-w-0",
                  collapsed ? "justify-center pl-0" : "pl-2"
                )}>
                  <div className={cn(
                    "flex items-center min-w-0",
                    collapsed ? "justify-center" : "gap-3"
                  )}>
                    <div className={cn(
                      "shrink-0",
                      "bg-muted/10 text-muted-foreground/40"
                    )}>
                      {getIconForTab(tab.id)}
                    </div>
                    {!collapsed && (
                      <span className={cn(
                        "text-sm font-medium truncate",
                        "text-muted-foreground/40"
                      )}>
                        {t(tab.labelKey, tab.id)}
                      </span>
                    )}
                  </div>
                  {!collapsed && (
                    <div className="ml-2 shrink-0">
                      <FiCircle className="w-4 h-4 text-muted-foreground/20" />
                    </div>
                  )}
                </div>
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap border border-border">
                    {t(tab.labelKey, tab.id)} (Locked)
                  </div>
                )}
              </div>
            );
          }

          return (
            <button
              key={tab.id}
              data-tab={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={cn(
                "group relative flex gap-3 rounded-lg hover:bg-muted/50 transition-all cursor-pointer border min-w-0",
                collapsed ? "p-2 justify-center" : "p-3",
                isActive && "bg-primary/5 border-primary/10",
                isHighlighted && "border-primary/30 bg-primary/10 ring-2 ring-primary/20",
                !isActive && !isHighlighted && "border-transparent"
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
                  <div className={cn(
                    "transition-colors shrink-0",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )}>
                    {getIconForTab(tab.id)}
                  </div>
                  {!collapsed && (
                    <span className={cn(
                      "text-sm font-medium truncate",
                      isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                    )}>
                      {t(tab.labelKey, tab.id)}
                    </span>
                  )}
                </div>
                {!collapsed && (
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
              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap border border-border">
                  {t(tab.labelKey, tab.id)}
                  {isCompleted && (
                    <span className="ml-1 text-green-500">✓</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

ProfileHeader.propTypes = {
  profile: PropTypes.object.isRequired,
  config: PropTypes.shape({
    tabs: PropTypes.array
  }).isRequired,
  activeTab: PropTypes.string.isRequired,
  onTabChange: PropTypes.func.isRequired,
  isTabCompleted: PropTypes.func.isRequired,
  isTabAccessible: PropTypes.func.isRequired,
  nextIncompleteSection: PropTypes.string,
  highlightTabId: PropTypes.string,
  collapsed: PropTypes.bool,
  onToggle: PropTypes.func
};

export default ProfileHeader;