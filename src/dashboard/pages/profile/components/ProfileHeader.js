import React, { useState } from 'react';
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
  FiLock
} from 'react-icons/fi';
import { useTutorial } from '../../../contexts/TutorialContext';
import { useAuth } from '../../../../contexts/AuthContext';
import RestartTutorialPopup from './RestartTutorialPopup';
import AccessLevelChoicePopup from './AccessLevelChoicePopup';
import FacilityAccessLevelPopup from './FacilityAccessLevelPopup';
import { LOCALSTORAGE_KEYS } from '../../../../config/keysDatabase';

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
  onToggle,
  onAutofill
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showRestartPopup, setShowRestartPopup] = useState(false);
  const [showAccessLevelPopup, setShowAccessLevelPopup] = useState(false);
  const [showFacilityAccessPopup, setShowFacilityAccessPopup] = useState(false);
  const [pendingTabId, setPendingTabId] = useState(null);
  const isMobile = useMobileView();
  const { t } = useTranslation(['dashboardProfile', 'tabs']);
  const { isTutorialActive, stepData, accessLevelChoice, restartOnboarding, setAccessMode, maxAccessedProfileTab, setShowAccessLevelModal, setAllowAccessLevelModalClose } = useTutorial();
  const { currentUser } = useAuth();

  const glnVerified = currentUser?.GLN_certified === true || currentUser?.GLN_certified === 'ADMIN_OVERRIDE' || profile?.GLN_certified === true || profile?.GLN_certified === 'ADMIN_OVERRIDE';

  const isAutofillHighlighted = isTutorialActive && stepData?.highlightUploadButton;

  const tabs = config?.tabs || [];

  const isFacilityProfile = tabs.some(tab => ['facilityCoreDetails', 'facilityLegalBilling'].includes(tab.id));
  const facilityTabs = ['facilityCoreDetails', 'facilityLegalBilling', 'settings'];

  const tabOrder = ['personalDetails', 'professionalBackground', 'billingInformation', 'documentUploads', 'facilityCoreDetails', 'facilityLegalBilling'];

  // Profile.js computes the correct highlightTabId (first incomplete accessible tab)
  const computedHighlightTabId = highlightTabId;

  const lockedTabsForTeam = ['professionalBackground', 'billingInformation', 'documentUploads'];

  const handleTabClick = (tabId) => {
    const popupShownKey = LOCALSTORAGE_KEYS.POPUP_SHOWN(`accessLevelPopup_${currentUser?.uid}_personalToProf`);
    const facilityPopupKey = LOCALSTORAGE_KEYS.POPUP_SHOWN(`facilityAccessPopup_${currentUser?.uid}`);
    const wasShown = localStorage.getItem(popupShownKey);
    const facilityPopupShown = localStorage.getItem(facilityPopupKey);

    if (isFacilityProfile && !facilityPopupShown && facilityTabs.includes(tabId)) {
      setPendingTabId(tabId);
      setShowFacilityAccessPopup(true);
      return;
    }

    if (isTutorialActive && tabId === 'professionalBackground' && maxAccessedProfileTab === 'personalDetails') {
      const isChoiceAlreadyMade = accessLevelChoice === 'loading' || accessLevelChoice === 'team' || accessLevelChoice === 'full';

      if (!wasShown && !isChoiceAlreadyMade) {
        setPendingTabId(tabId);
        setShowAccessLevelPopup(true);
        return;
      } else {
        if (!isChoiceAlreadyMade) {
          setAccessMode('loading');
        }
      }
    }

    if ((accessLevelChoice === 'team' || accessLevelChoice === 'loading') && !isTutorialActive && lockedTabsForTeam.includes(tabId)) {
      setPendingTabId(tabId);
      setShowAccessLevelPopup(true);
      return;
    }

    onTabChange(tabId);
  };

  const handleContinueOnboarding = () => {
    const popupShownKey = LOCALSTORAGE_KEYS.POPUP_SHOWN(`accessLevelPopup_${currentUser?.uid}_personalToProf`);
    localStorage.setItem(popupShownKey, 'true');

    if (activeTab !== 'personalDetails' && !pendingTabId) {
      if (isTabAccessible(profile, 'personalDetails', config)) {
        onTabChange('personalDetails');
      }
    } else if (pendingTabId && isTabAccessible(profile, pendingTabId, config)) {
      onTabChange(pendingTabId);
    }

    setPendingTabId(null);
    setShowAccessLevelPopup(false);
  };

  const handleSelectTeamAccess = async () => {
    if (setAccessMode) {
      await setAccessMode('team');
    }
    setShowAccessLevelPopup(false);
    setPendingTabId(null);
  };

  const handleFacilityAccessPopupClose = () => {
    const facilityPopupKey = LOCALSTORAGE_KEYS.POPUP_SHOWN(`facilityAccessPopup_${currentUser?.uid}`);
    localStorage.setItem(facilityPopupKey, 'true');
    setShowFacilityAccessPopup(false);

    if (pendingTabId && isTabAccessible(profile, pendingTabId, config)) {
      onTabChange(pendingTabId);
    }
    setPendingTabId(null);
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
        return <FiSettings className="w-5 h-5 shrink-0" />;
      default:
        return <FiUser className="w-5 h-5 shrink-0" />;
    }
  };

  const renderTabItem = (tab) => {
    const isActive = activeTab === tab.id;
    const isCompleted = isTabCompleted(profile, tab.id, config);
    const isAccessible = isTabAccessible(profile, tab.id, config);
    // Use computedHighlightTabId which properly clamps the highlight to accessible tabs
    const isHighlighted = isTutorialActive && computedHighlightTabId === tab.id;

    const isLockedForTeam = accessLevelChoice === 'team' && lockedTabsForTeam.includes(tab.id);
    const isLockedForIncompleteAccess = !isTutorialActive && accessLevelChoice !== 'full' && lockedTabsForTeam.includes(tab.id);
    const shouldShowLocked = isLockedForTeam || isLockedForIncompleteAccess;

    if (shouldShowLocked) {
      return (
        <button
          key={tab.id}
          data-tab={tab.id}
          data-tutorial-locked="true"
          onClick={() => handleTabClick(tab.id)}
          className={cn(
            "group relative flex gap-3 rounded-lg border-2 border-transparent transition-all duration-200 outline-none",
            collapsed ? "p-2 justify-center" : "p-3",
            "text-muted-foreground/50 cursor-pointer select-none",
            "bg-muted/10",
            "hover:bg-muted/20 hover:border-muted/40",
            isHighlighted && "tutorial-highlight"
          )}
        >
          <div className={cn(
            "w-1.5 h-full absolute left-0 top-0 bottom-0 rounded-l-lg",
            "bg-muted/30"
          )} />
          <div className={cn(
            "w-full flex items-center justify-between",
            collapsed ? "justify-center pl-0" : "pl-2"
          )}>
            <div className={cn(
              "flex items-center",
              collapsed ? "justify-center" : "gap-3"
            )}>
              <div className="shrink-0 bg-muted/10 text-muted-foreground/50">
                {getIconForTab(tab.id)}
              </div>
              {!collapsed && (
                <span className="text-sm font-medium truncate text-muted-foreground/50">
                  {t(tab.labelKey, tab.id)}
                </span>
              )}
            </div>
            {!collapsed && (
              <FiLock className="w-4 h-4 text-muted-foreground/40" />
            )}
          </div>
        </button>
      );
    }

    if (!isAccessible) {
      return (
        <button
          key={tab.id}
          data-tab={tab.id}
          data-tutorial-disabled="true"
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "group relative flex gap-3 rounded-lg border-2 border-transparent transition-all duration-200 outline-none tab-lock",
            collapsed ? "p-2 justify-center" : "p-3",
            "text-muted-foreground/40 cursor-pointer select-none",
            "hover:bg-muted/20 hover:border-muted/30",
            isHighlighted && "tutorial-highlight"
          )}
        >
          <div className={cn(
            "w-1.5 h-full absolute left-0 top-0 bottom-0 rounded-l-lg",
            "bg-muted/20"
          )} />
          <div className={cn(
            "w-full flex items-center justify-between",
            collapsed ? "justify-center pl-0" : "pl-2"
          )}>
            <div className={cn(
              "flex items-center",
              collapsed ? "justify-center" : "gap-3"
            )}>
              <div className="shrink-0 bg-muted/10 text-muted-foreground/40">
                {getIconForTab(tab.id)}
              </div>
              {!collapsed && (
                <span className="text-sm font-medium truncate text-muted-foreground/40">
                  {t(tab.labelKey, tab.id)}
                </span>
              )}
            </div>
            {!collapsed && (
              <div className="ml-2 shrink-0">
                <FiLock className="w-4 h-4 text-muted-foreground/30" />
              </div>
            )}
          </div>
          {collapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap border border-border">
              {t(tab.labelKey, tab.id)} ({t('common:locked')})
            </div>
          )}
        </button>
      );
    }

    return (
      <button
        key={tab.id}
        data-tab={tab.id}
        onClick={() => handleTabClick(tab.id)}
        className={cn(
          "group relative flex gap-3 rounded-lg hover:bg-muted/50 transition-all cursor-pointer border-2 border-transparent",
          collapsed ? "p-2 justify-center" : "p-3",
          isActive && "bg-primary/5 border-primary/10",
          isHighlighted && "tutorial-highlight"
        )}
      >
        <div className={cn(
          "w-1.5 h-full absolute left-0 top-0 bottom-0 rounded-l-lg",
          isActive && "bg-primary"
        )} />
        <div className={cn(
          "w-full flex items-center justify-between",
          collapsed ? "justify-center pl-0" : "pl-2"
        )}>
          <div className={cn(
            "flex items-center",
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
  };

  return (
    <div
      className={cn(
        "w-full h-fit bg-card rounded-2xl border border-border/50 shadow-lg backdrop-blur-sm transition-all duration-300 ease-in-out profile-sidebar-menu",
        collapsed ? "p-2" : "p-4"
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

      <div className="flex flex-col gap-3 profile-sidebar-tabs">
        {tabs.map(renderTabItem)}
      </div>

      {onAutofill && (
        <div className="mt-4 pt-4 border-t border-border relative profile-sidebar-autofill">
          {showMenu && (
            <div className={cn(
              "absolute bottom-full left-0 w-full mb-2 bg-popover border border-border rounded-lg shadow-xl z-[200000] animate-in slide-in-from-bottom-2 duration-200",
              collapsed && "left-full ml-2 w-48 bottom-0 mb-0"
            )}>
              <button
                onClick={() => {
                  onAutofill('current');
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-muted transition-colors flex items-center gap-2 border-b border-border"
              >
                <FiZap className="w-3.5 h-3.5 text-amber-500" />
                {t('dashboardProfile:common.fillCurrentTab')}
              </button>
              <button
                onClick={() => {
                  onAutofill('all');
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-muted transition-colors flex items-center gap-2 text-amber-600"
              >
                <FiZap className="w-3.5 h-3.5" />
                {t('dashboardProfile:common.fillAll')}
              </button>
            </div>
          )}
          <button
            onClick={() => setShowMenu(!showMenu)}
            data-tutorial="profile-upload-button"
            className={cn(
              "w-full flex items-center justify-center gap-3 p-3 rounded-lg transition-all relative text-muted-foreground hover:bg-muted/50 hover:text-black select-none",
              collapsed ? "px-2" : "px-3",
              showMenu && "bg-muted/30",
              isAutofillHighlighted && "tutorial-highlight"
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

      <AccessLevelChoicePopup
        isOpen={showAccessLevelPopup}
        onClose={() => {
          setShowAccessLevelPopup(false);
          setPendingTabId(null);
        }}
        onContinueOnboarding={handleContinueOnboarding}
        onSelectTeamAccess={handleSelectTeamAccess}
        glnVerified={glnVerified}
      />

      <FacilityAccessLevelPopup
        isOpen={showFacilityAccessPopup}
        onClose={handleFacilityAccessPopupClose}
        allowClose={false}
      />
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
  onToggle: PropTypes.func,
  onAutofill: PropTypes.func
};

export default ProfileHeader;
