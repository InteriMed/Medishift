import React, { useState, useRef, useEffect } from 'react';
import HeaderWorkspaceSelector from './WorkspaceSelector/HeaderWorkspaceSelector';
import TutorialSelectionModal from '../modals/TutorialSelectionModal';
import PropTypes from 'prop-types';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiBell, FiSearch, FiUser, FiChevronDown, FiBriefcase, FiSettings, FiLogOut, FiX, FiMenu, FiArrowLeft, FiHelpCircle, FiRefreshCw } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { cn } from '../../../utils/cn';
import { getPageConfig } from '../../config/pageConfig';
import { useDashboard } from '../../contexts/DashboardContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useTutorial } from '../../contexts/TutorialContext';
import { normalizePathname } from '../../utils/pathUtils';
import useProfileData from '../../hooks/useProfileData';
import { useNotification } from '../../../contexts/NotificationContext';

export function Header({ collapsed = false, onMobileMenuToggle, isMobileMenuOpen = false, onBackButtonClick, showBackButton = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const {
    user,
    workspaces,
    selectedWorkspace,
    switchWorkspace,
    isLoading
  } = useDashboard();

  // Use auth for logout
  const { logout } = useAuth();

  const { resetProfile } = useProfileData();
  const { showNotification } = useNotification();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleResetProfile = async () => {
    setIsResetting(true);
    try {
      await resetProfile();
      showNotification(t('dashboard.header.profileResetSuccess', 'Profile reset successfully'), 'success');
      setShowResetConfirm(false);
      setProfileMenuOpen(false);
      window.location.reload();
    } catch (error) {
      console.error('Error resetting profile:', error);
      showNotification(t('dashboard.header.profileResetError', 'Failed to reset profile'), 'error');
    } finally {
      setIsResetting(false);
    }
  };

  // Tutorial context
  const {
    restartOnboarding,
    startFacilityOnboarding,
    startTutorial,
    startAllTutorials,
    skipTutorial,
    isTutorialActive,
    activeTutorial,
    showFirstTimeModal,
    showTutorialSelectionModal,
    setShowTutorialSelectionModal,
    isReady: isTutorialReady = false
  } = useTutorial();

  // Local state
  const [workspaceSelectorOpen, setWorkspaceSelectorOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const notificationsRef = useRef(null);
  const profileMenuRef = useRef(null);

  const [notifications] = useState([
    { id: 1, title: 'New Event', message: 'Team meeting at 3 PM', time: '10m ago', read: false },
    { id: 2, title: 'Confirmation', message: 'Your shift transfer was approved', time: '1h ago', read: false },
    { id: 3, title: 'System', message: 'Profile updated successfully', time: '2h ago', read: true }
  ]);

  const [unreadCount] = useState(2);

  const normalizedPathname = React.useMemo(() => normalizePathname(location.pathname), [location.pathname]);

  const pageConfig = React.useMemo(() => {
    return getPageConfig(normalizedPathname);
  }, [normalizedPathname]);

  const titleKey = pageConfig?.titleKey;

  const Icon = React.useMemo(() => {
    return pageConfig?.icon;
  }, [pageConfig]);

  const title = React.useMemo(() => {
    if (pageConfig && titleKey) {
      const translated = t(titleKey);
      return translated || '';
    }
    return '';
  }, [pageConfig, titleKey, t]);

  // Generic click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sort workspaces to show current workspace first
  const sortedWorkspaces = React.useMemo(() => {
    if (!workspaces || !Array.isArray(workspaces)) return [];
    return [...workspaces].sort((a, b) => {
      if (selectedWorkspace?.id === a.id) return -1;
      if (selectedWorkspace?.id === b.id) return 1;
      return 0;
    });
  }, [workspaces, selectedWorkspace]);

  const isProfessional = user?.role === 'professional';
  const isFacility = user?.role === 'facility' || user?.role === 'company';
  const hasFacilityMemberships = user?.facilityMemberships && Array.isArray(user.facilityMemberships) && user.facilityMemberships.length > 0;
  const hasWorkspaces = workspaces && Array.isArray(workspaces) && workspaces.length > 0;
  const forceShowWorkspaceSelector = isFacility; // Always show for facilities to allow adding profiles

  const shouldShowWorkspaceSelector = !isLoading && isTutorialReady && !showFirstTimeModal && (isProfessional || isFacility || hasFacilityMemberships || hasWorkspaces || forceShowWorkspaceSelector);

  const getHeaderColor = () => {
    if (selectedWorkspace?.type === 'team' || isFacility) {
      return 'var(--color-logo-2, #29517b)';
    }
    return 'var(--color-logo-1, #70a4cf)';
  };

  const handleCreateBusiness = () => {
    // Start facility onboarding flow
    startFacilityOnboarding();
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  // Helper function to determine which tutorial to start based on current page
  const getCurrentPageTutorial = () => {
    const path = location.pathname;

    // Detect the current page and return the appropriate tutorial name
    if (path.includes('/messages')) {
      return 'messages';
    } else if (path.includes('/contracts')) {
      return 'contracts';
    } else if (path.includes('/calendar')) {
      return 'calendar';
    } else if (path.includes('/marketplace')) {
      return 'marketplace';
    } else if (path.includes('/payroll')) {
      return 'payroll';
    } else if (path.includes('/organization')) {
      return 'organization';
    } else if (path.includes('/settings')) {
      return 'settings';
    } else if (path.includes('/profile')) {
      // For profile page, use profile tutorial (not profileTabs which is for onboarding)
      return 'profile';
    } else {
      // Default to dashboard tutorial for overview/dashboard pages
      return 'dashboard';
    }
  };

  // Handle tutorial button click with page-specific logic
  const handleTutorialButtonClick = () => {
    console.log("Tutorial button clicked from header");

    // Check if we're in onboarding mode (mandatory tutorial flow)
    // Only consider it onboarding if the modal is showing OR if we're in the profileTabs tutorial
    const isInOnboarding = showFirstTimeModal || activeTutorial === 'profileTabs';

    // During onboarding, use the existing restartOnboarding behavior
    if (isInOnboarding) {
      console.log("In onboarding mode, using restartOnboarding");
      restartOnboarding();
      return;
    }

    // Toggle behavior: if tutorial is active, stop it
    if (isTutorialActive) {
      console.log(`Stopping active tutorial: ${activeTutorial}`);
      skipTutorial();
    } else {
      // Show the tutorial selection modal
      console.log("Showing tutorial selection modal");
      setShowTutorialSelectionModal(true);
    }
  };

  const headerColor = getHeaderColor();

  return (
    <header
      className={cn(
        "min-h-16 border-b border-transparent",
        "flex items-center justify-between px-4 sm:px-6 sticky top-0 transition-all duration-300",
        "shadow-sm"
      )}
      style={{
        zIndex: workspaceSelectorOpen ? 20000 : 50,
        backgroundColor: headerColor,
        color: '#ffffff'
      }}
    >

      {/* Left: Mobile Menu Button & Page Title */}
      <div className="flex items-center gap-4 flex-shrink-0">
        {/* Mobile: Back Button (when in detail view) or Menu Button */}
        {showBackButton && onBackButtonClick ? (
          <button
            onClick={onBackButtonClick}
            className="md:hidden p-2 rounded-lg hover:bg-white/10 text-white transition-colors flex-shrink-0"
            aria-label="Go back"
          >
            <FiArrowLeft className="h-5 w-5" />
          </button>
        ) : (
          onMobileMenuToggle && (
            <button
              onClick={onMobileMenuToggle}
              className="md:hidden p-2 rounded-lg hover:bg-white/10 text-white transition-colors flex-shrink-0"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <FiX className="h-5 w-5" />
              ) : (
                <FiMenu className="h-5 w-5" />
              )}
            </button>
          )
        )}

        {/* Page Icon & Title */}
        {Icon && (
          <div key={`${location.pathname}-${i18n.language}`} className="flex items-center gap-2 pr-4 border-r border-white/20 flex-shrink-0">
            <Icon className="w-5 h-5 text-white" />
            <h1 className="text-base font-medium text-white flex items-center m-0 p-0" style={{ fontFamily: 'var(--font-family-headings, Roboto, sans-serif)' }}>
              {title}
            </h1>
          </div>
        )}
      </div>

      {/* Center: Workspace Selector */}
      {!isLoading && shouldShowWorkspaceSelector && (
        <div className="flex items-center justify-center flex-1 min-w-0 px-4">
          <HeaderWorkspaceSelector
            workspaces={sortedWorkspaces}
            selectedWorkspace={selectedWorkspace}
            onSelectWorkspace={switchWorkspace}
            onOpenChange={setWorkspaceSelectorOpen}
          >
            {isProfessional && !hasFacilityMemberships && (
              <>
                {workspaces && workspaces.length > 0 && (
                  <div className="my-1 h-px bg-border" />
                )}
                <button
                  onClick={handleCreateBusiness}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                    "hover:bg-muted/50 text-primary"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-lg",
                    "bg-primary/10",
                    "border border-primary/20"
                  )}>
                    <FiBriefcase className={cn("w-4 h-4", "text-primary")} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-foreground">
                      {t('dashboard.header.createBusiness', 'Create a business')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t('dashboard.header.createBusinessDesc', 'Set up your facility profile')}
                    </div>
                  </div>
                </button>
              </>
            )}
            {isFacility && (
              <>
                {workspaces && workspaces.length > 0 && (
                  <div className="my-1 h-px bg-border" />
                )}
                <button
                  // Action to create professional profile or switch context
                  onClick={() => console.log("Action: Create/Switch to Professional Profile")}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                    "hover:bg-muted/50 text-primary"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-lg",
                    "bg-primary/10",
                    "border border-primary/20"
                  )}>
                    <FiUser className={cn("w-4 h-4", "text-primary")} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-foreground">
                      {t('dashboard.header.createProfessional', 'Create Professional Profile')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t('dashboard.header.createProfessionalDesc', 'Switch to personal account')}
                    </div>
                  </div>
                </button>
              </>
            )}
          </HeaderWorkspaceSelector>
        </div>
      )}

      {/* Right: Search, Notifications, Profile */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        <div className="relative hidden lg:block">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
          <input
            type="text"
            placeholder={t('dashboard.header.search', 'Search...')}
            className="h-9 w-48 xl:w-64 rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm pl-9 pr-3 text-sm text-white placeholder:text-white/70 outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 transition-all"
            style={{ color: '#ffffff' }}
          />
        </div>

        {/* Notifications */}
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative rounded-lg p-2 hover:bg-white/10 text-white transition-colors flex-shrink-0"
            aria-label="Notifications"
          >
            <FiBell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 border-2 border-white animate-pulse" />
            )}
          </button>

          {/* Notifications Dropdown */}
          {notificationsOpen && (
            <div className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-card rounded-xl border border-border shadow-xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden max-h-[500px] flex flex-col" style={{ zIndex: 11000, backgroundColor: 'var(--background-div-color, #ffffff)' }}>
              <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
                <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
                {unreadCount > 0 && (
                  <button className="text-xs text-primary hover:text-primary/80 font-medium">
                    Mark all as read
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto max-h-[300px] custom-scrollbar" style={{ scrollbarGutter: 'stable' }}>
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-sm text-muted-foreground">No notifications</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {notifications.map((notification) => (
                      <div key={notification.id} className={cn("p-4 hover:bg-muted/30 transition-colors relative", !notification.read && "bg-primary/5")}>
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="text-sm font-medium">{notification.title}</h4>
                          <span className="text-xs text-muted-foreground">{notification.time}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Onboarding Help Button */}
        <button
          data-tutorial="onboarding-help-button"
          className={cn(
            "relative rounded-lg p-2 transition-colors flex-shrink-0",
            (isTutorialActive || showFirstTimeModal)
              ? "bg-white/20 text-white hover:bg-white/30 ring-1 ring-white/30"
              : "hover:bg-white/10 text-white"
          )}
          aria-label="Start Tutorial"
          onClick={handleTutorialButtonClick}
          title="Start Tutorial"
        >
          <FiHelpCircle className="h-5 w-5" />
        </button>

        {/* Profile */}
        <div className="relative" ref={profileMenuRef}>
          <button
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-white/10 transition-colors border border-transparent hover:border-white/20"
          >
            <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center border border-white/30 cursor-pointer transition-all flex-shrink-0">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="h-full w-full rounded-lg object-cover" />
              ) : (
                <FiUser className="h-4 w-4 text-white" />
              )}
            </div>
            <FiChevronDown className={cn("w-3.5 h-3.5 text-white transition-transform hidden md:block", profileMenuOpen && "rotate-180")} />
          </button>

          {/* Profile Dropdown */}
          {profileMenuOpen && (
            <div className="absolute top-full right-0 mt-2 w-56 bg-card rounded-xl border border-border shadow-xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden" style={{ zIndex: 11000, backgroundColor: 'var(--background-div-color, #ffffff)' }}>
              <div className="p-3 border-b border-border bg-muted/30">
                <div className="text-sm font-semibold truncate">{user?.displayName || 'User'}</div>
                <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
              </div>
              <div className="p-1">
                <button onClick={() => { navigate('/dashboard/profile'); setProfileMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 text-sm">
                  <FiUser className="w-4 h-4" /> Profile
                </button>
                <button onClick={() => { navigate('/dashboard/profile/settings'); setProfileMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 text-sm">
                  <FiSettings className="w-4 h-4" /> Settings
                </button>
                <div className="my-1 h-px bg-border" />
                <button 
                  onClick={() => { setShowResetConfirm(true); }} 
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-destructive/10 text-destructive text-sm"
                >
                  <FiRefreshCw className="w-4 h-4" /> {t('dashboard.header.resetProfile', 'Reset Profile')}
                </button>
                <div className="my-1 h-px bg-border" />
                <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-destructive/10 text-destructive text-sm">
                  <FiLogOut className="w-4 h-4" /> Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tutorial Selection Modal */}
      <TutorialSelectionModal
        isOpen={showTutorialSelectionModal}
        onClose={() => setShowTutorialSelectionModal(false)}
        onStartAll={startAllTutorials}
        onStartCurrent={() => startTutorial(getCurrentPageTutorial())}
        currentPageName={getCurrentPageTutorial()}
      />

      {/* Reset Profile Confirmation Dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[20000]" onClick={() => !isResetting && setShowResetConfirm(false)}>
          <div className="bg-card rounded-xl border border-border shadow-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">{t('dashboard.header.resetProfileTitle', 'Reset Profile')}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('dashboard.header.resetProfileMessage', 'Are you sure you want to reset your profile? This will remove all your data and set your account back to the initial onboarding state. This action cannot be undone.')}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowResetConfirm(false)}
                disabled={isResetting}
                className="px-4 py-2 rounded-lg border border-border hover:bg-muted/50 transition-colors disabled:opacity-50"
              >
                {t('common:cancel', 'Cancel')}
              </button>
              <button
                onClick={handleResetProfile}
                disabled={isResetting}
                className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                {isResetting ? t('common:processing', 'Processing...') : t('dashboard.header.resetConfirm', 'Reset Profile')}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

Header.propTypes = {
  collapsed: PropTypes.bool,
  onMobileMenuToggle: PropTypes.func,
  isMobileMenuOpen: PropTypes.bool,
  onBackButtonClick: PropTypes.func,
  showBackButton: PropTypes.bool
};
