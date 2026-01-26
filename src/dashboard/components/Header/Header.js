import React, { useState, useRef, useEffect } from 'react';
import HeaderWorkspaceSelector from './WorkspaceSelector/WorkspaceSelector';
import PropTypes from 'prop-types';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiBell, FiUser, FiChevronDown, FiBriefcase, FiSettings, FiLogOut, FiX, FiMenu, FiArrowLeft, FiHelpCircle, FiRefreshCw, FiGlobe, FiCheck, FiSearch, FiMessageSquare } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { cn } from '../../../utils/cn';
import { getPageConfig } from '../../config/pageConfig';
import { useDashboard } from '../../contexts/DashboardContext';
import { useAuth } from '../../../contexts/AuthContext';
import { normalizePathname } from '../../utils/pathUtils';
import useProfileData from '../../hooks/useProfileData';
import { useNotification } from '../../../contexts/NotificationContext';
import { WORKSPACE_TYPES } from '../../../utils/sessionAuth';
import { ServiceSearchBar } from '../../../service_tree';
import { useTutorial } from '../../contexts/TutorialContext';
import ContactFormPopup from '../../../components/ContactFormPopup/ContactFormPopup';

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
  const { setShowTutorialSelectionModal } = useTutorial();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleResetProfile = async () => {
    setIsResetting(true);
    try {
      // Determine which profile to reset based on current workspace type
      const isFacilityWorkspace = selectedWorkspace?.type === WORKSPACE_TYPES.FACILITY;
      const targetRole = isFacilityWorkspace ? 'facility' : 'professional';
      const targetProfileType = user?.profileType;


      await resetProfile(targetRole, targetProfileType);

      showNotification(t('dashboard.header.profileResetSuccess', 'Profile reset successfully'), 'success');
      setShowResetConfirm(false);
      if (setProfileMenuOpen) setProfileMenuOpen(false);
      window.location.reload();
    } catch (error) {
      showNotification(t('dashboard.header.profileResetError', 'Failed to reset profile'), 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const startFacilityOnboarding = () => {};
  const resetProfileTabAccess = () => {};

  const [workspaceSelectorOpen, setWorkspaceSelectorOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [helpMenuOpen, setHelpMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);

  const notificationsRef = useRef(null);
  const profileMenuRef = useRef(null);
  const helpMenuRef = useRef(null);
  const searchRef = useRef(null);
  const languageRef = useRef(null);

  const [notifications] = useState([
    { id: 1, title: typeof t('dashboard.header.notifications.newEvent.title') === 'object' ? t('dashboard.header.notifications.newEvent.title').title : t('dashboard.header.notifications.newEvent.title', 'New Event'), message: t('dashboard.header.notifications.newEvent.message', 'Team meeting at 3 PM'), time: t('dashboard.header.notifications.newEvent.time', '10m ago'), read: false },
    { id: 2, title: typeof t('dashboard.header.notifications.confirmation.title') === 'object' ? t('dashboard.header.notifications.confirmation.title').title : t('dashboard.header.notifications.confirmation.title', 'Confirmation'), message: t('dashboard.header.notifications.confirmation.message', 'Your shift transfer was approved'), time: t('dashboard.header.notifications.confirmation.time', '1h ago'), read: false },
    { id: 3, title: typeof t('dashboard.header.notifications.system.title') === 'object' ? t('dashboard.header.notifications.system.title').title : t('dashboard.header.notifications.system.title', 'System'), message: t('dashboard.header.notifications.system.message', 'Profile updated successfully'), time: t('dashboard.header.notifications.system.time', '2h ago'), read: true }
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
      if (typeof translated === 'object' && translated !== null) {
        return translated.title || '';
      }
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
      if (helpMenuRef.current && !helpMenuRef.current.contains(event.target)) {
        setHelpMenuOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false);
      }
      if (languageRef.current && !languageRef.current.contains(event.target)) {
        setLanguageOpen(false);
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

  const shouldShowWorkspaceSelector = !isLoading;

  const getHeaderColor = () => {
    if (selectedWorkspace?.type === WORKSPACE_TYPES.ADMIN) {
      return '#dc2626';
    }
    if (selectedWorkspace?.type === WORKSPACE_TYPES.FACILITY || selectedWorkspace?.type === 'team') {
      return 'var(--color-logo-2, #0f172a)';
    }
    return 'var(--color-logo-1, #2563eb)';
  };

  const handleCreateBusiness = () => {
    // Start facility onboarding flow
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      // Logout failed
    }
  };

  const handleTutorialButtonClick = async () => {
    setHelpMenuOpen(!helpMenuOpen);
  };

  const handleTutorialClick = () => {
    setShowTutorialSelectionModal(true);
    setHelpMenuOpen(false);
  };

  const handleSupportClick = () => {
    setShowContactForm(true);
    setHelpMenuOpen(false);
  };

  const headerColor = getHeaderColor();

  return (
    <header
      className={cn(
        "h-14 w-full",
        "flex items-center px-3 sm:px-4 md:px-5 fixed top-0 left-0 right-0 transition-all duration-200",
        "border-b border-white/10"
      )}
      style={{
        zIndex: workspaceSelectorOpen ? 20000 : 50,
        backgroundColor: headerColor,
        color: '#ffffff'
      }}
    >
      {/* Left: Logo & Mobile Menu Button */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 min-w-0">
        {/* Logo Section */}
        <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
          <img
            src="/logo white.png"
            alt={t('common:header.logoAlt', 'MediShift')}
            className="h-5 sm:h-6 w-auto object-contain shrink-0"
          />
          <span className="text-sm sm:text-base font-medium text-white hidden md:block truncate">
            {t('common:header.brandName', 'MediShift')}
          </span>
        </div>

        {/* Mobile: Back Button (when in detail view) or Menu Button */}
        {showBackButton && onBackButtonClick ? (
          <button
            onClick={onBackButtonClick}
            className="md:hidden p-1.5 rounded-md hover:bg-white/5 text-white transition-colors flex-shrink-0"
            aria-label={t('common:header.goBack', 'Go back')}
          >
            <FiArrowLeft className="h-4 w-4" />
          </button>
        ) : (
          onMobileMenuToggle && (
            <button
              onClick={onMobileMenuToggle}
              className="xl1200:hidden p-1.5 rounded-md hover:bg-white/5 text-white transition-colors flex-shrink-0"
              aria-label={t('common:header.toggleMenu', 'Toggle menu')}
            >
              {isMobileMenuOpen ? (
                <FiX className="h-4 w-4" />
              ) : (
                <FiMenu className="h-4 w-4" />
              )}
            </button>
          )
        )}
      </div>

      {/* Left-Center: Page Title & Workspace Selector */}
      <div className="flex-1 flex items-center justify-center min-w-0 px-2 sm:px-3 ml-2 sm:ml-3 gap-2 sm:gap-3 lg:gap-4">
        {/* Page Icon & Title */}
        {Icon && (
          <div key={`${location.pathname}-${i18n.language}`} className="hidden lg:flex items-center gap-1.5 flex-shrink-0">
            <Icon className="w-3.5 h-3.5 text-white/90" />
            <h1 className="text-xs lg:text-sm font-normal text-white/90 flex items-center m-0 p-0 truncate" style={{ fontFamily: 'var(--font-family-headings, Roboto, sans-serif)' }}>
              {title}
            </h1>
          </div>
        )}

        {/* Workspace Selector */}
        {!isLoading && shouldShowWorkspaceSelector && (
          <div className="flex-shrink min-w-0">
            <HeaderWorkspaceSelector
              workspaces={sortedWorkspaces}
              selectedWorkspace={selectedWorkspace}
              onSelectWorkspace={switchWorkspace}
              onOpenChange={setWorkspaceSelectorOpen}
            >
              {isProfessional && (
                <>
                  {workspaces && workspaces.length > 0 && (
                    <div className="my-1 h-px bg-border" />
                  )}
                  <button
                    onClick={handleCreateBusiness}
                    className={cn(
                      "w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-lg transition-all",
                      "hover:bg-muted/50 text-primary"
                    )}
                  >
                    <div className={cn(
                      "p-1.5 sm:p-2 rounded-lg flex-shrink-0",
                      "bg-primary/10",
                      "border border-primary/20"
                    )}>
                      <FiBriefcase className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", "text-primary")} />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="text-xs sm:text-sm font-medium text-foreground truncate">
                        {typeof t('dashboard.header.createBusiness') === 'object' ? t('dashboard.header.createBusiness').title : t('dashboard.header.createBusiness', 'Create a business')}
                      </div>
                      <div className="text-xs text-muted-foreground truncate hidden sm:block">
                        {typeof t('dashboard.header.createBusinessDesc') === 'object' ? t('dashboard.header.createBusinessDesc').title : t('dashboard.header.createBusinessDesc', 'Set up your facility profile')}
                      </div>
                    </div>
                  </button>
                </>
              )}
              {isFacility && !user?.hasProfessionalProfile && (
                <>
                  {workspaces && workspaces.length > 0 && (
                    <div className="my-1 h-px bg-border" />
                  )}
                  <button
                    onClick={() => { }}
                    className={cn(
                      "w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-lg transition-all",
                      "hover:bg-muted/50 text-primary"
                    )}
                  >
                    <div className={cn(
                      "p-1.5 sm:p-2 rounded-lg flex-shrink-0",
                      "bg-primary/10",
                      "border border-primary/20"
                    )}>
                      <FiUser className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", "text-primary")} />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="text-xs sm:text-sm font-medium text-foreground truncate">
                        {typeof t('dashboard.header.createProfessional') === 'object' ? t('dashboard.header.createProfessional').title : t('dashboard.header.createProfessional', 'Create Professional Profile')}
                      </div>
                      <div className="text-xs text-muted-foreground truncate hidden sm:block">
                        {typeof t('dashboard.header.createProfessionalDesc') === 'object' ? t('dashboard.header.createProfessionalDesc').title : t('dashboard.header.createProfessionalDesc', 'Switch to personal account')}
                      </div>
                    </div>
                  </button>
                </>
              )}
            </HeaderWorkspaceSelector>
          </div>
        )}
      </div>

      {/* Right: Search, Notifications, Profile */}
      <div data-tutorial="header-right-actions" className="flex items-center gap-1 sm:gap-1.5 md:gap-2 flex-shrink-0">
        {/* Search - Desktop version */}
        <div className="relative hidden xl1200:block" ref={searchRef}>
          <ServiceSearchBar
            className="header-service-search"
            placeholder={t('common:header.search', 'Search...')}
          />
        </div>

        {/* Search - Icon button (1200px and below) */}
        <button
          onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
          className="xl1200:hidden relative text-white/90 hover:text-white hover:bg-white/5 transition-all flex-shrink-0 flex items-center justify-center rounded-md p-2"
          aria-label={t('common:header.search', 'Search')}
        >
          <FiSearch className="h-4 w-4" />
        </button>

        {/* Notifications - Hidden on mobile, moved to profile menu */}
        <div className="relative hidden md:block" ref={notificationsRef}>
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative text-white/90 hover:text-white hover:bg-white/5 transition-all flex-shrink-0 flex items-center justify-center rounded-md p-2"
            aria-label={t('common:header.notifications', 'Notifications')}
          >
            <FiBell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-red-400" />
            )}
          </button>

          {/* Notifications Dropdown */}
          {notificationsOpen && (
            <div className="absolute top-full right-0 mt-1.5 w-[calc(100vw-2rem)] max-w-[320px] sm:max-w-[384px] bg-card rounded-lg border border-border/50 shadow-lg animate-in fade-in zoom-in-95 duration-150 overflow-hidden max-h-[min(500px,calc(100vh-5rem))] flex flex-col" style={{ zIndex: 11000, backgroundColor: 'var(--background-div-color, #ffffff)' }}>
              <div className="p-3 border-b border-border/50 flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">{typeof t('dashboard.header.notifications.title') === 'object' ? t('dashboard.header.notifications.title').title : t('dashboard.header.notifications.title', 'Notifications')}</h3>
                {unreadCount > 0 && (
                  <button className="text-xs text-primary hover:text-primary/80 font-normal whitespace-nowrap">
                    {t('dashboard.header.notifications.markAllRead', 'Mark all as read')}
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto max-h-[min(300px,calc(100vh-12rem))] custom-scrollbar" style={{ scrollbarGutter: 'stable' }}>
                {notifications.length === 0 ? (
                  <div className="p-6 sm:p-8 text-center">
                    <p className="text-sm text-muted-foreground">{t('dashboard.header.noNotifications', 'No notifications')}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {notifications.map((notification) => (
                      <div key={notification.id} className={cn("p-3 hover:bg-muted/40 transition-colors relative", !notification.read && "bg-primary/5")}>
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="text-sm font-medium text-foreground">{notification.title}</h4>
                          <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">{notification.time}</span>
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

        {/* Help Menu */}
        <div className="relative hidden md:block" ref={helpMenuRef}>
          <button
            data-tutorial="onboarding-help-button"
            className="relative text-white/90 hover:text-white hover:bg-white/5 transition-all flex-shrink-0 flex items-center justify-center rounded-md p-2"
            aria-label={t('common:header.help', 'Help')}
            onClick={handleTutorialButtonClick}
            title="Help"
          >
            <FiHelpCircle className="h-4 w-4" />
          </button>

          {helpMenuOpen && (
            <div className="absolute top-full right-0 mt-1.5 w-[calc(100vw-2rem)] max-w-[224px] bg-card rounded-lg border border-border/50 shadow-lg animate-in fade-in zoom-in-95 duration-150 overflow-hidden" style={{ zIndex: 200001, backgroundColor: 'var(--background-div-color, #ffffff)' }}>
              <div className="p-1">
                <button
                  onClick={handleTutorialClick}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/40 text-sm text-foreground transition-colors"
                >
                  <FiHelpCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate flex-1 text-left">{t('common:header.tutorial', 'Tutorial')}</span>
                </button>
                <button
                  onClick={handleSupportClick}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/40 text-sm text-foreground transition-colors"
                >
                  <FiMessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate flex-1 text-left">{t('common:header.support', 'Support')}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Language Selector - Dropdown style like UserMenu - Hidden on mobile */}
        <div className="relative hidden md:block" ref={languageRef}>
          <button
            onClick={() => setLanguageOpen(!languageOpen)}
            className="flex items-center justify-center gap-1.5 text-white/90 hover:text-white hover:bg-white/5 transition-all rounded-md px-2.5 py-2"
          >
            <span className="text-xs font-medium uppercase text-white">{i18n.language?.slice(0, 2) || 'EN'}</span>
            <FiChevronDown className={cn("w-3 h-3 text-white transition-transform", languageOpen && "rotate-180")} />
          </button>

          {languageOpen && (
            <div className="absolute top-full right-0 mt-1.5 w-[calc(100vw-2rem)] max-w-[180px] bg-card rounded-lg border border-border/50 shadow-lg animate-in fade-in zoom-in-95 duration-150 overflow-hidden" style={{ zIndex: 11000, backgroundColor: 'var(--background-div-color, #ffffff)' }}>
              <div className="p-1">
                {[
                  { code: 'en', name: 'English' },
                  { code: 'fr', name: 'Français' },
                  { code: 'de', name: 'Deutsch' }
                ].map((lang) => {
                  const isActive = i18n.language === lang.code || i18n.language?.startsWith(lang.code);
                  return (
                    <button
                      key={lang.code}
                      onClick={() => {
                        i18n.changeLanguage(lang.code);
                        setLanguageOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all",
                        isActive
                          ? "bg-muted/40"
                          : "hover:bg-muted/40"
                      )}
                    >
                      <span className="text-xs font-medium uppercase w-6 text-muted-foreground">{lang.code}</span>
                      <span className="flex-1 text-left text-foreground">{lang.name}</span>
                      {isActive && <FiCheck className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative" ref={profileMenuRef}>
          <button
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="flex items-center gap-1.5 text-white/90 hover:text-white hover:bg-white/5 transition-all rounded-md px-1.5 py-1"
          >
            <div
              className="rounded-md flex items-center justify-center cursor-pointer transition-all flex-shrink-0 relative h-7 w-7"
            >
              {user?.photoURL ? (
                <img src={user.photoURL} alt={t('common:header.profileAlt', 'Profile')} className="h-full w-full rounded-md object-cover" />
              ) : (
                <FiUser className="h-4 w-4 text-white" />
              )}
              {unreadCount > 0 && (
                <span className="md:hidden absolute top-0 right-0 h-1.5 w-1.5 rounded-full bg-red-400" />
              )}
            </div>
            <FiChevronDown className={cn("w-3 h-3 text-white transition-transform hidden md:block", profileMenuOpen && "rotate-180")} />
          </button>

          {/* Profile Dropdown */}
          {profileMenuOpen && (
            <div className="absolute top-full right-0 mt-1.5 w-[calc(100vw-2rem)] max-w-[224px] bg-card rounded-lg border border-border/50 shadow-lg animate-in fade-in zoom-in-95 duration-150 overflow-hidden" style={{ zIndex: 200001, backgroundColor: 'var(--background-div-color, #ffffff)' }}>
              <div className="p-3 border-b border-border/50">
                <div className="text-sm font-medium truncate text-foreground">{user?.displayName || (typeof t('dashboard.header.defaultUser') === 'object' ? t('dashboard.header.defaultUser').title : t('dashboard.header.defaultUser', 'User'))}</div>
                <div className="text-xs text-muted-foreground truncate mt-0.5">{user?.email}</div>
              </div>
              <div className="p-1">
                {/* Mobile-only: Notifications */}
                <div className="md:hidden">
                  <button
                    onClick={() => { setNotificationsOpen(true); setProfileMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/40 text-sm text-foreground"
                  >
                    <FiBell className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="truncate flex-1 text-left">{typeof t('dashboard.header.notifications.title') === 'object' ? t('dashboard.header.notifications.title').title : t('dashboard.header.notifications.title', 'Notifications')}</span>
                    {unreadCount > 0 && (
                      <span className="h-4 min-w-[18px] px-1.5 rounded-full bg-red-400 text-white text-xs font-medium flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                  <div className="my-1 h-px bg-border/50" />
                </div>

                {/* Mobile-only: Tutorial */}
                <button
                  onClick={() => { handleTutorialClick(); setProfileMenuOpen(false); }}
                  className="md:hidden w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/40 text-sm text-foreground"
                >
                  <FiHelpCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">
                    {t('common:header.tutorial', 'Tutorial')}
                  </span>
                </button>
                {/* Mobile-only: Support */}
                <button
                  onClick={() => { handleSupportClick(); setProfileMenuOpen(false); }}
                  className="md:hidden w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/40 text-sm text-foreground"
                >
                  <FiMessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">
                    {t('common:header.support', 'Support')}
                  </span>
                </button>

                {/* Mobile-only: Language Selector */}
                <div className="md:hidden">
                  <button
                    onClick={() => setLanguageOpen(!languageOpen)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/40 text-sm text-foreground"
                  >
                    <FiGlobe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="truncate flex-1 text-left">{typeof t('common:header.language') === 'object' ? t('common:header.language').title : t('common:header.language', 'Language')}</span>
                    <span className="text-xs font-medium uppercase text-muted-foreground">{i18n.language?.slice(0, 2) || 'EN'}</span>
                  </button>

                  {languageOpen && (
                    <div className="ml-4 mt-1 mb-2 space-y-0.5">
                      {[
                        { code: 'en', name: 'English' },
                        { code: 'fr', name: 'Français' },
                        { code: 'de', name: 'Deutsch' }
                      ].map((lang) => {
                        const isActive = i18n.language === lang.code || i18n.language?.startsWith(lang.code);
                        return (
                          <button
                            key={lang.code}
                            onClick={() => {
                              i18n.changeLanguage(lang.code);
                              setLanguageOpen(false);
                            }}
                            className={cn(
                              "w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-all",
                              isActive
                                ? "bg-muted/40"
                                : "hover:bg-muted/30"
                            )}
                          >
                            <span className="text-xs font-medium uppercase w-6 text-muted-foreground">{lang.code}</span>
                            <span className="flex-1 text-left text-foreground">{lang.name}</span>
                            {isActive && <FiCheck className="w-3 h-3 text-primary flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <div className="my-1 h-px bg-border/50" />
                </div>

                <button onClick={() => { navigate('/dashboard/profile'); setProfileMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/40 text-sm text-foreground">
                  <FiUser className="w-4 h-4 text-muted-foreground flex-shrink-0" /> <span className="truncate">{typeof t('dashboard.header.profile') === 'object' ? t('dashboard.header.profile').title : t('dashboard.header.profile', 'Profile')}</span>
                </button>
                <button onClick={() => { navigate('/dashboard/profile/settings'); setProfileMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/40 text-sm text-foreground">
                  <FiSettings className="w-4 h-4 text-muted-foreground flex-shrink-0" /> <span className="truncate">{typeof t('dashboard.header.settings') === 'object' ? t('dashboard.header.settings').title : t('dashboard.header.settings', 'Settings')}</span>
                </button>
                <div className="my-1 h-px bg-border/50" />
                <button
                  onClick={() => { setShowResetConfirm(true); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-destructive/5 text-foreground text-sm"
                >
                  <FiRefreshCw className="w-4 h-4 text-muted-foreground flex-shrink-0" /> <span className="truncate">{typeof t('dashboard.header.resetProfile') === 'object' ? t('dashboard.header.resetProfile').title : t('dashboard.header.resetProfile', 'Reset Profile')}</span>
                </button>
                <div className="my-1 h-px bg-border/50" />
                <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-destructive/5 text-destructive text-sm">
                  <FiLogOut className="w-4 h-4 flex-shrink-0" /> <span className="truncate">{typeof t('dashboard.header.logout') === 'object' ? t('dashboard.header.logout').title : t('dashboard.header.logout', 'Log out')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Search Overlay */}
      {mobileSearchOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 flex flex-col z-[15000]" onClick={() => setMobileSearchOpen(false)}>
          <div className="bg-card p-4" style={{ backgroundColor: headerColor }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileSearchOpen(false)}
                className="text-white hover:opacity-80 transition-opacity"
                aria-label={t('common:close', 'Close')}
              >
                <FiArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex-1">
                <ServiceSearchBar
                  className="header-service-search mobile-search-bar"
                  placeholder={t('common:header.search', 'Search...')}
                />
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Contact Form Popup */}
      <ContactFormPopup
        isOpen={showContactForm}
        onClose={() => setShowContactForm(false)}
      />

      {/* Reset Profile Confirmation Dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[20000] px-4" onClick={() => !isResetting && setShowResetConfirm(false)}>
          <div className="bg-card rounded-lg border border-border/50 shadow-lg p-4 sm:p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base sm:text-lg font-medium mb-2 text-foreground">{typeof t('dashboard.header.resetProfileTitle') === 'object' ? t('dashboard.header.resetProfileTitle').title : t('dashboard.header.resetProfileTitle', 'Reset Profile')}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mb-4">
              {typeof t('dashboard.header.resetProfileMessage') === 'object' ? t('dashboard.header.resetProfileMessage').title : t('dashboard.header.resetProfileMessage', 'Are you sure you want to reset your profile? This will remove all your data and set your account back to the initial onboarding state. This action cannot be undone.')}
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-end">
              <button
                onClick={() => setShowResetConfirm(false)}
                disabled={isResetting}
                className="w-full sm:w-auto px-4 py-2 rounded-md border border-border/50 hover:bg-muted/40 transition-colors disabled:opacity-50 text-sm text-foreground"
              >
                {typeof t('common:cancel') === 'object' ? t('common:cancel').title : t('common:cancel', 'Cancel')}
              </button>
              <button
                onClick={handleResetProfile}
                disabled={isResetting}
                className="w-full sm:w-auto px-4 py-2 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50 text-sm"
              >
                {isResetting ? (typeof t('common:processing') === 'object' ? t('common:processing').title : t('common:processing', 'Processing...')) : (typeof t('dashboard.header.resetConfirm') === 'object' ? t('dashboard.header.resetConfirm').title : t('dashboard.header.resetConfirm', 'Reset Profile'))}
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
