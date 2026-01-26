import React, { useState, useEffect } from 'react';
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
  FiChevronRight,
  FiZap,
  FiAlertCircle,
  FiHome
} from 'react-icons/fi';
import { useAuth } from '../../../../contexts/AuthContext';
import Dialog from '../../../../components/Dialog/Dialog';
import Button from '../../../../components/BoxedInputFields/Button';
import { LOCALSTORAGE_KEYS } from '../../../../config/keysDatabase';

const SideMenu = ({
  profile,
  config,
  activeTab,
  onTabChange,
  isTabCompleted,
  isTabAccessible,
  nextIncompleteSection,
  highlightTabId,
  collapsed = false,
  onToggle,
  onAutofill,
  customMobileState
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showRestartPopup, setShowRestartPopup] = useState(false);
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
  
  const globalIsMobile = useMobileView();
  const isMobile = customMobileState !== undefined ? customMobileState : globalIsMobile;
  const isOneColumnLayout = customMobileState === true;
  const showTextInHorizontal = isOneColumnLayout && windowWidth >= 700;
  const { t } = useTranslation(['dashboardProfile', 'tabs']);
  const { currentUser, userProfile } = useAuth();

  const isAdmin = !!(userProfile?.adminData && userProfile?.adminData.isActive !== false);
  const glnVerified = currentUser?.GLN_certified === true || currentUser?.GLN_certified === 'ADMIN_OVERRIDE' || profile?.GLN_certified === true || profile?.GLN_certified === 'ADMIN_OVERRIDE';

  const isAutofillHighlighted = false;

  const tabs = config?.tabs || [];

  const isFacilityProfile = tabs.some(tab => ['facilityCoreDetails', 'facilityLegalBilling'].includes(tab.id));
  const facilityTabs = ['facilityCoreDetails', 'facilityLegalBilling', 'settings'];

  const tabOrder = ['personalDetails', 'professionalBackground', 'billingInformation', 'documentUploads', 'settings', 'account', 'facilityCoreDetails', 'facilityLegalBilling'];

  // Profile.js computes the correct highlightTabId (first incomplete accessible tab)
  const computedHighlightTabId = highlightTabId;

  const handleTabClick = (tabId) => {
    isTabAccessible(profile, tabId, config);
    onTabChange(tabId);
  };


  const handleRestartTutorial = () => {
    restartOnboarding?.();
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
      case 'facilityCoreDetails':
        return <FiUser className="w-5 h-5 shrink-0" />;
      case 'facilityLegalBilling':
        return <FiCreditCard className="w-5 h-5 shrink-0" />;
      case 'settings':
        return <FiBriefcase className="w-5 h-5 shrink-0" />;
      case 'marketplace':
        return <FiHome className="w-5 h-5 shrink-0" />;
      case 'account':
        return <FiSettings className="w-5 h-5 shrink-0" />;
      default:
        return <FiUser className="w-5 h-5 shrink-0" />;
    }
  };

  const getSingleWordLabel = (labelKey) => {
    const fullLabel = t(labelKey);
    const firstWord = fullLabel.split(' ')[0];
    return firstWord;
  };

  const renderTabItem = (tab) => {
    const isActive = activeTab === tab.id;
    const isCompleted = isTabCompleted(profile, tab.id, config);
    isTabAccessible(profile, tab.id, config);
    const isHighlighted = false;

    return (
      <button
        key={tab.id}
        data-tab={tab.id}
        onClick={() => handleTabClick(tab.id)}
        className={cn(
          "group relative flex gap-3 rounded-lg hover:bg-muted/50 transition-all cursor-pointer border-2 border-transparent",
          isOneColumnLayout 
            ? "p-2 flex-1 min-w-0"
            : (collapsed ? "p-2 justify-center shrink-0" : "p-3 w-full"),
          isActive && "bg-primary/5 border-primary/10",
          isHighlighted && "tutorial-highlight"
        )}
      >
        <div className={cn(
          isOneColumnLayout 
            ? "w-full h-1 absolute bottom-0 left-0 right-0 rounded-b-lg"
            : "w-1.5 h-full absolute left-0 top-0 bottom-0 rounded-l-lg",
          isActive && "bg-primary"
        )} />
        <div className={cn(
          "w-full flex items-center justify-between",
          isOneColumnLayout ? (showTextInHorizontal ? "justify-center gap-1.5 px-1" : "justify-center") : (collapsed ? "justify-center pl-0" : "pl-2")
        )}>
          <div className={cn(
            "flex items-center",
            isOneColumnLayout ? (showTextInHorizontal ? "justify-center gap-1.5" : "justify-center") : (collapsed ? "justify-center" : "gap-3")
          )}>
            <div className={cn(
              "transition-colors shrink-0",
              isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
            )}>
              {getIconForTab(tab.id)}
            </div>
            {showTextInHorizontal && (
              <span className={cn(
                "text-xs font-medium truncate",
                isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
              )}>
                {getSingleWordLabel(tab.labelKey)}
              </span>
            )}
            {!collapsed && !isOneColumnLayout && (
              <span className={cn(
                "text-sm font-medium truncate",
                isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
              )}>
                {t(tab.labelKey, tab.id)}
              </span>
            )}
          </div>
          {!collapsed && !isOneColumnLayout && (
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
        {(collapsed || isOneColumnLayout) && (
          <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap border border-border">
            {t(tab.labelKey, tab.id)}
            {isCompleted && (
              <span className="ml-1 text-green-500">✓</span>
            )}
          </div>
        )}
      </button>
    );
  };

  return (
    <div
      className={cn(
        "w-full h-fit bg-card rounded-xl border border-border hover:shadow-md transition-shadow content-sidebar-menu",
        collapsed ? "p-2" : "p-4",
        isOneColumnLayout && "p-3"
      )}
    >
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
            title={collapsed ? t('common:expand') : t('common:collapse')}
          >
            {collapsed ? (
              <FiChevronRight size={18} />
            ) : (
              <>
                <FiChevronLeft size={18} />
                <span className="text-sm font-medium">{t('common:collapse')}</span>
              </>
            )}
          </button>
        </div>
      )}

      <div className={cn(
        "content-sidebar-tabs",
        isOneColumnLayout ? "flex flex-row gap-2 w-full" : "flex flex-col gap-3"
      )}>
        {tabs.map(renderTabItem)}
      </div>

      {onAutofill && (
        <div className="mt-4 pt-4 border-t border-border relative content-sidebar-autofill">
          {showMenu && (
            <div className={cn(
              "absolute bottom-full left-0 w-full mb-2 bg-white border-2 border-[var(--red-2)] rounded-lg shadow-xl z-[200000] animate-in slide-in-from-bottom-2 duration-200 overflow-hidden",
              collapsed && "left-full ml-2 w-64 bottom-0 mb-0"
            )} style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}>
              <div className="px-4 py-3 bg-white border-b-2 border-[var(--red-2)] text-[var(--red-4)] flex gap-3 items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-[var(--red-2)]/20 flex items-center justify-center border-2 border-[var(--red-2)]">
                    <FiZap className="w-4 h-4 text-[var(--red-4)]" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-[var(--red-4)]">{t('dashboardProfile:common.autofillOptions')}</h4>
                </div>
              </div>
              <div className="px-4 py-3 flex items-center justify-between gap-3">
                <button
                  onClick={() => {
                    onAutofill('current');
                    setShowMenu(false);
                  }}
                  className="flex-1 text-left px-4 py-2.5 text-sm text-[var(--red-4)]/90 hover:bg-[var(--red-2)]/10 transition-colors flex items-center gap-2 rounded"
                >
                  <FiZap className="w-3.5 h-3.5 text-[var(--red-4)]" />
                  {t('dashboardProfile:common.fillCurrentTab')}
                </button>
                <button
                  onClick={() => {
                    onAutofill('all');
                    setShowMenu(false);
                  }}
                  className="flex-1 text-right px-4 py-2.5 text-sm font-semibold text-[var(--red-4)] hover:bg-[var(--red-2)]/10 transition-colors flex items-center justify-end gap-2 rounded"
                >
                  {t('dashboardProfile:common.fillAll')}
                  <FiZap className="w-3.5 h-3.5 text-[var(--red-4)]" />
                </button>
              </div>
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-[var(--red-2)]"></div>
              </div>
            </div>
          )}
          <button
            onClick={() => setShowMenu(!showMenu)}
            data-tutorial="profile-upload-button"
            className={cn(
              "w-full flex items-center justify-center gap-3 p-3 rounded-lg transition-all relative text-muted-foreground hover:bg-muted/50 hover:text-foreground select-none",
              collapsed ? "px-2" : "px-3",
              showMenu && "bg-muted/30"
            )}
            title={t('dashboardProfile:common.autofillOptions')}
          >
            <FiZap className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="text-sm font-bold uppercase tracking-wider">{t('dashboardProfile:common.betaFill')}</span>}
          </button>
        </div>
      )}

      <RestartTutorialPopup
        isOpen={showRestartPopup}
        onClose={() => setShowRestartPopup(false)}
        onRestartTutorial={handleRestartTutorial}
      />

    </div>
  );
};

SideMenu.propTypes = {
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
  onToggle: PropTypes.func,
  onAutofill: PropTypes.func,
  customMobileState: PropTypes.bool
};

export default SideMenu;
