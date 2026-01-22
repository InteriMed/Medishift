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
  const [pendingTabId, setPendingTabId] = useState(null);
  const isMobile = useMobileView();
  const { t } = useTranslation(['dashboardProfile', 'tabs']);
  const { isTutorialActive, stepData, accessMode, restartOnboarding, setAccessMode, maxAccessedProfileTab, setShowAccessLevelModal, setAllowAccessLevelModalClose } = useTutorial();
  const { currentUser } = useAuth();
  
  const glnVerified = currentUser?.GLN_certified === true || currentUser?.GLN_certified === 'ADMIN_OVERRIDE' || profile?.GLN_certified === true || profile?.GLN_certified === 'ADMIN_OVERRIDE';

  const isAutofillHighlighted = isTutorialActive && stepData?.highlightUploadButton;

  const tabs = config?.tabs || [];

  const tabOrder = ['personalDetails', 'professionalBackground', 'billingInformation', 'documentUploads', 'facilityCoreDetails', 'facilityLegalBilling', 'facilityDocuments'];

  const getMaxHighlightableIndex = () => {
    if (!maxAccessedProfileTab) return 0;
    const maxIndex = tabOrder.indexOf(maxAccessedProfileTab);
    if (maxIndex === -1) return 0;
    const maxCompleted = isTabCompleted(profile, maxAccessedProfileTab, config);
    return maxCompleted ? maxIndex + 1 : maxIndex;
  };

  const computedHighlightTabId = (() => {
    const maxHighlightIdx = getMaxHighlightableIndex();
    if (!highlightTabId) return null;
    const highlightIdx = tabOrder.indexOf(highlightTabId);
    if (highlightIdx === -1) return highlightTabId;
    if (highlightIdx <= maxHighlightIdx) return highlightTabId;
    const clampedTab = tabOrder[maxHighlightIdx];
    if (clampedTab && !isTabCompleted(profile, clampedTab, config)) {
      return clampedTab;
    }
    return null;
  })();

  // Tabs that are locked for Team Access mode
  const lockedTabsForTeam = ['professionalBackground', 'billingInformation', 'documentUploads'];

  const handleTabClick = (tabId) => {
    const popupShownKey = `accessLevelPopup_${currentUser?.uid}_personalToProf`;
    const wasShown = localStorage.getItem(popupShownKey);
    
    // During tutorial, trigger local AccessLevelChoicePopup when clicking Professional Background for first time (only once)
    if (isTutorialActive && tabId === 'professionalBackground' && maxAccessedProfileTab === 'personalDetails') {
      if (!wasShown) {
        console.log('[ProfileHeader] Tutorial active - showing local AccessLevelChoicePopup and blocking tab switch');
        setPendingTabId(tabId);
        setShowAccessLevelPopup(true);
        return;
      } else {
        console.log('[ProfileHeader] Popup already shown before, allowing tab access');
      }
    }

    // Check if tab is locked for team/loading access mode (after tutorial) - only if accessMode is 'team' or 'loading' and tutorial is NOT active
    if ((accessMode === 'team' || accessMode === 'loading') && !isTutorialActive && lockedTabsForTeam.includes(tabId)) {
      console.log('[ProfileHeader] Tab locked for Team/Loading Access, showing AccessLevelChoicePopup:', tabId);
      setPendingTabId(tabId);
      setShowAccessLevelPopup(true);
      return;
    }

    if (isTabAccessible(profile, tabId, config)) {
      onTabChange(tabId);
    }
  };

  const handleContinueOnboarding = () => {
    console.log('[ProfileHeader] Continue Profile clicked - current tab:', activeTab, 'pending tab:', pendingTabId);
    
    const popupShownKey = `accessLevelPopup_${currentUser?.uid}_personalToProf`;
    localStorage.setItem(popupShownKey, 'true');
    
    if (activeTab !== 'personalDetails' && !pendingTabId) {
      console.log('[ProfileHeader] Not on personalDetails, navigating there first');
      if (isTabAccessible(profile, 'personalDetails', config)) {
        onTabChange('personalDetails');
      }
    } else if (pendingTabId && isTabAccessible(profile, pendingTabId, config)) {
      console.log('[ProfileHeader] Moving to pending tab:', pendingTabId);
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

  const handleRestartTutorial = () => {
    console.log('[ProfileHeader] Restarting tutorial for full access');
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
      case 'facilityDocuments':
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

  return (
    <div className={cn(
      "w-full h-fit bg-card rounded-2xl border border-border/50 shadow-lg backdrop-blur-sm transition-all duration-300 ease-in-out overflow-x-hidden",
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

      <nav className={cn("flex flex-col overflow-y-auto max-h-[calc(100vh-280px)]", "gap-3")} style={{ scrollbarWidth: 'thin' }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isCompleted = isTabCompleted(profile, tab.id, config);
          const isAccessible = isTabAccessible(profile, tab.id, config);
          const isHighlighted = computedHighlightTabId === tab.id && !isCompleted;
          const isLockedForTeam = accessMode === 'team' && lockedTabsForTeam.includes(tab.id);

          // For Team Access locked tabs, render as clickable but with lock icon
          if (isLockedForTeam) {
            return (
              <button
                key={tab.id}
                data-tab={tab.id}
                data-tutorial-locked="true"
                onClick={() => handleTabClick(tab.id)}
                className={cn(
                  "group relative flex gap-3 rounded-lg border min-w-0 transition-all duration-200 outline-none",
                  collapsed ? "p-2 justify-center" : "p-3",
                  "text-muted-foreground/50 cursor-pointer select-none",
                  "border-border/30 bg-muted/10",
                  "hover:bg-muted/20 hover:border-muted/40"
                )}
              >
                <div className={cn(
                  "w-1.5 h-full absolute left-0 top-0 bottom-0 rounded-l-lg",
                  "bg-muted/30"
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
                      "bg-muted/10 text-muted-foreground/50"
                    )}>
                      {getIconForTab(tab.id)}
                    </div>
                    {!collapsed && (
                      <span className={cn(
                        "text-sm font-medium truncate",
                        "text-muted-foreground/50"
                      )}>
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
              <div
                key={tab.id}
                data-tab={tab.id}
                data-tutorial-disabled="true"
                className={cn(
                  "group relative flex gap-3 rounded-lg border min-w-0 transition-all duration-200 outline-none tab-lock",
                  collapsed ? "p-2 justify-center" : "p-3",
                  "text-muted-foreground/40 cursor-not-allowed select-none",
                  "border-transparent",
                  "hover:bg-muted/20 hover:border-muted/30"
                )}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.nativeEvent && e.nativeEvent.stopImmediatePropagation && e.nativeEvent.stopImmediatePropagation();
                  console.log(`[ProfileHeader] Click prevented on ${tab.id} - tab is locked (rendered as div)`);
                  return false;
                }}
              >
                <div className={cn(
                  "w-1.5 h-full absolute left-0 top-0 bottom-0 rounded-l-lg",
                  "bg-muted/20"
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
                    {t(tab.labelKey, tab.id)} ({t('common:locked')})
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
                isHighlighted && "tutorial-highlight",
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

        {onAutofill && (
          <div className="mt-4 pt-4 border-t border-border relative">
            {showMenu && (
              <div className={cn(
                "absolute bottom-full left-0 w-full mb-2 bg-popover border border-border rounded-lg shadow-xl z-[200000] overflow-hidden animate-in slide-in-from-bottom-2 duration-200",
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
                "w-full flex items-center gap-3 p-3 rounded-lg transition-all relative overflow-hidden",
                "bg-amber-500/10 hover:bg-amber-500/20 text-black border border-amber-500/20",
                collapsed ? "justify-center px-2" : "px-3",
                showMenu && "bg-amber-500/20 ring-2 ring-amber-500/30",
                isAutofillHighlighted && "tutorial-highlight"
              )}
              title={t('dashboardProfile:common.autofillOptions')}
            >
              <FiZap className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="text-sm font-bold uppercase tracking-wider text-black">{t('dashboardProfile:common.betaFill')}</span>}
            </button>
          </div>
        )}
      </nav>

      {/* Restart Tutorial Popup for Team Access users */}
      <RestartTutorialPopup
        isOpen={showRestartPopup}
        onClose={() => setShowRestartPopup(false)}
        onRestartTutorial={handleRestartTutorial}
      />

      {/* Access Level Choice Popup before accessing tab 2 */}
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