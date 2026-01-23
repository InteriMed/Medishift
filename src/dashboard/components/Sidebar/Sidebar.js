import React from 'react';
import PropTypes from 'prop-types';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FiMessageSquare,
  FiFileText,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiUser,
  FiBox,
  FiDollarSign,
  FiUsers
} from 'react-icons/fi';
import {
  LayoutDashboard,
  Users,
  Calendar,
  DollarSign,
  Shield,
  FileText,
  AlertCircle,
  Bell,
  Search,
  FlaskConical,
  Briefcase
} from 'lucide-react';
import { cn } from '../../../utils/cn';
import { normalizePathname, buildDashboardUrl } from '../../utils/pathUtils';
import { useTutorial } from '../../contexts/TutorialContext';
import { useDashboard } from '../../contexts/DashboardContext';
import { useAuth } from '../../../contexts/AuthContext';
import { WORKSPACE_TYPES } from '../../../utils/sessionAuth';
import { hasPermission, PERMISSIONS } from '../../admin/utils/rbac';
import LockedMenuItem from './LockedMenuItem';
import { TUTORIAL_IDS, isProfileTutorial } from '../../../config/tutorialSystem';

const hasProfessionalAccess = (userData) => {
  if (!userData) return false;
  return userData._professionalProfileExists === true || userData.hasProfessionalProfile === true;
};

// Define regular sidebar items structure
const REGULAR_SIDEBAR_ITEMS = [
  {
    title: 'dashboard.sidebar.overview',
    icon: LayoutDashboard,
    path: '/dashboard/overview'
  },
  {
    title: 'dashboard.sidebar.messages',
    icon: FiMessageSquare,
    path: '/dashboard/messages'
  },
  {
    title: 'dashboard.sidebar.contracts',
    icon: FiFileText,
    path: '/dashboard/contracts'
  },
  {
    title: 'dashboard.sidebar.calendar',
    icon: FiCalendar,
    path: '/dashboard/calendar'
  },
  {
    title: 'dashboard.sidebar.profile',
    icon: FiUser,
    path: '/dashboard/profile'
  },
  {
    title: 'dashboard.sidebar.marketplace',
    icon: FiBox,
    path: '/dashboard/marketplace',
    personalOnly: true
  },
  {
    title: 'dashboard.sidebar.payroll',
    icon: FiDollarSign,
    path: '/dashboard/payroll',
    facilityOnly: true
  },
  {
    title: 'dashboard.sidebar.organization',
    icon: FiUsers,
    path: '/dashboard/organization',
    facilityOnly: true
  }
];

// Define admin sidebar items structure
const getAdminSidebarItems = (t) => [
  {
    title: t('admin:sidebar.dashboard', 'Executive Dashboard'),
    icon: LayoutDashboard,
    path: '/dashboard/admin/portal',
    permission: PERMISSIONS.VIEW_DASHBOARD
  },
  {
    title: t('admin:sidebar.searchCRM', 'Search - CRM'),
    icon: Search,
    path: '/dashboard/admin/operations/users',
    permission: PERMISSIONS.VIEW_USER_PROFILES
  },
  {
    title: t('admin:sidebar.verificationQueue', 'Verification Queue'),
    icon: Users,
    path: '/dashboard/admin/verification',
    permission: PERMISSIONS.VERIFY_USERS
  },
  {
    title: t('admin:sidebar.shiftList', 'Shift List'),
    icon: Calendar,
    path: '/dashboard/admin/operations/shifts',
    permission: PERMISSIONS.MANAGE_SHIFTS
  },
  {
    title: t('admin:sidebar.linkedinJobScraper', 'LinkedIn Job Scraper'),
    icon: Briefcase,
    path: '/dashboard/admin/operations/job-scraper',
    permission: PERMISSIONS.MANAGE_SYSTEM
  },
  {
    title: t('admin:sidebar.revenueCommissions', 'Revenue & Commissions'),
    icon: DollarSign,
    path: '/dashboard/admin/finance/revenue',
    permission: PERMISSIONS.VIEW_REVENUE
  },
  {
    title: t('admin:sidebar.referralPayouts', 'Referral Payouts'),
    icon: DollarSign,
    path: '/dashboard/admin/finance/spendings',
    permission: PERMISSIONS.VIEW_FINANCE
  },
  {
    title: t('admin:sidebar.invoices', 'Invoices (SaaS)'),
    icon: FileText,
    path: '/dashboard/admin/finance/ar',
    permission: PERMISSIONS.VIEW_FINANCE
  },
  {
    title: t('admin:sidebar.balanceSheet', 'Balance Sheet'),
    icon: DollarSign,
    path: '/dashboard/admin/finance/balance-sheet',
    permission: PERMISSIONS.VIEW_BALANCE_SHEET
  },
  {
    title: t('admin:sidebar.auditLogs', 'Audit Logs'),
    icon: AlertCircle,
    path: '/dashboard/admin/system/audit',
    permission: PERMISSIONS.VIEW_AUDIT_LOGS
  },
  {
    title: t('admin:sidebar.notifications', 'Notifications'),
    icon: Bell,
    path: '/dashboard/admin/system/notifications',
    permission: PERMISSIONS.SEND_NOTIFICATIONS
  },
  {
    title: t('admin:sidebar.glnTest', 'GLN Test'),
    icon: FlaskConical,
    path: '/dashboard/admin/system/gln-test',
    permission: PERMISSIONS.VIEW_AUDIT_LOGS
  },
  {
    title: t('admin:sidebar.payrollExport', 'Payroll Export'),
    icon: FileText,
    path: '/dashboard/admin/payroll/export',
    permission: PERMISSIONS.EXPORT_PAYROLL
  },
  {
    title: t('admin:sidebar.adminManagement', 'Admin Management'),
    icon: Shield,
    path: '/dashboard/admin/management/employees',
    permission: PERMISSIONS.MANAGE_EMPLOYEES
  }
];

export function Sidebar({ collapsed, onToggle, isMobile = false, isOverlayMode = false, isOverlayExpanded = false }) {
  const { t } = useTranslation(['dashboard', 'admin']);
  const location = useLocation();
  const normalizedPathname = React.useMemo(() => normalizePathname(location.pathname), [location.pathname]);
  const { isSidebarItemAccessible, forceUpdateElementPosition, isTutorialActive, activeTutorial, stepData, setShowAccessLevelModal, setAllowAccessLevelModalClose, accessLevelChoice } = useTutorial();
  const { selectedWorkspace, completedTutorials = [], profileComplete, tutorialPassed } = useDashboard();
  const { userProfile } = useAuth();

  const userRoles = userProfile?.roles || [];
  const isAdminWorkspace = selectedWorkspace?.type === WORKSPACE_TYPES.ADMIN;

  const handleNavClick = () => {
    if (window.innerWidth < 768 && onToggle) {
      onToggle();
    }
    if (isOverlayMode && isOverlayExpanded && onToggle) {
      onToggle();
    }
  };

  const SIDEBAR_ORDER = ['overview', 'profile', 'messages', 'contracts', 'calendar', 'marketplace', 'payroll', 'organization', 'settings'];

  const getHighlightedItem = React.useMemo(() => {
    const highlightSidebarItem = stepData?.highlightSidebarItem;
    if (highlightSidebarItem) {
      return highlightSidebarItem;
    }

    if (tutorialPassed) {
      return null;
    }

    const isProfileTabsComplete = completedTutorials.includes(TUTORIAL_IDS.PROFILE_TABS) || completedTutorials.includes(TUTORIAL_IDS.FACILITY_PROFILE_TABS);
    const isProfileComplete = profileComplete === true;

    if (!isProfileTabsComplete && !isProfileComplete) {
      return 'profile';
    }

    for (const item of SIDEBAR_ORDER) {
      if (item === 'profile') {
        if (!isProfileTabsComplete && !isProfileComplete) {
          return 'profile';
        }
        continue;
      }

      const tutorialKey = item === 'messages' ? TUTORIAL_IDS.MESSAGES :
        item === 'contracts' ? TUTORIAL_IDS.CONTRACTS :
          item === 'calendar' ? TUTORIAL_IDS.CALENDAR :
            item === 'marketplace' ? TUTORIAL_IDS.MARKETPLACE :
              item === 'payroll' ? TUTORIAL_IDS.PAYROLL :
                item === 'organization' ? TUTORIAL_IDS.ORGANIZATION :
                  item === 'settings' ? TUTORIAL_IDS.SETTINGS : null;

      if (tutorialKey && !completedTutorials.includes(tutorialKey)) {
        return item;
      }
    }

    return null;
  }, [stepData, tutorialPassed, completedTutorials, profileComplete]);

  const handleToggleClick = () => {
    if (isTutorialActive) return;

    if (onToggle) {
      onToggle();
    }

    if (isTutorialActive && forceUpdateElementPosition) {
      setTimeout(() => {
        forceUpdateElementPosition();
      }, 0);

      setTimeout(() => {
        forceUpdateElementPosition();
      }, 320);
    }
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-16 h-[calc(100vh-4rem)] bg-sidebar transition-all duration-300 ease-in-out overflow-x-hidden",
        collapsed ? "w-[70px]" : "w-64",
        isMobile
          ? "z-[60] flex flex-col md:!hidden"
          : isOverlayMode
            ? isOverlayExpanded
              ? "z-[60] flex flex-col"
              : "z-[60] flex flex-col"
            : "z-40 !hidden md:!flex md:flex-col"
      )}
      style={{
        backgroundColor: 'hsl(var(--sidebar-background))',
        zIndex: isMobile || isOverlayMode ? 60 : undefined
      }}
    >

      {/* Collapse/Expand Button - Above Overview */}
      <div className={cn(
        "h-16 flex items-center mb-2",
        collapsed ? "px-2" : "px-3"
      )}>
        <button
          onClick={handleToggleClick}
          disabled={isTutorialActive}
          className={cn(
            "w-full h-full rounded-md hover:bg-sidebar-accent text-sidebar-foreground/70 transition-colors flex items-center gap-2",
            collapsed ? "justify-center px-2" : "justify-start px-2",
            isTutorialActive && "opacity-50 cursor-not-allowed hover:bg-transparent"
          )}
          title={isTutorialActive ? t('dashboard.sidebar.lockedDuringTutorial', 'Locked during tutorial') : (collapsed ? t('dashboard.sidebar.expand', 'Expand') : t('dashboard.sidebar.collapse', 'Collapse'))}
        >
          {collapsed ? (
            <FiChevronRight size={18} />
          ) : (
            <>
              <FiChevronLeft size={18} />
              <span className="text-sm font-medium">{t('dashboard.sidebar.collapse', 'Collapse')}</span>
            </>
          )}
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-1.5 px-2 flex flex-col gap-0.5">
        {(isAdminWorkspace ? getAdminSidebarItems(t).filter(item => !item.permission || hasPermission(userRoles, item.permission)) : REGULAR_SIDEBAR_ITEMS.filter(item => {
          const isPersonalWorkspace = selectedWorkspace?.type === WORKSPACE_TYPES.PERSONAL;
          const isTeamWorkspace = selectedWorkspace?.type === WORKSPACE_TYPES.TEAM;
          const isAdminWorkspaceCheck = selectedWorkspace?.type === WORKSPACE_TYPES.ADMIN;
          
          if (isAdminWorkspaceCheck) {
            return false;
          }
          
          if (item.facilityOnly) {
            return isTeamWorkspace;
          }
          
          if (item.personalOnly) {
            return isPersonalWorkspace;
          }
          
          const sharedItems = ['overview', 'messages', 'contracts', 'calendar'];
          const itemKey = item.path.split('/').pop();
          const hasProfessionalRole = userProfile?.role === 'professional' || hasProfessionalAccess(userProfile);
          
          if (itemKey === 'profile') {
            return true;
          }
          
          if (sharedItems.includes(itemKey)) {
            return true;
          }
          
          return isPersonalWorkspace || (!selectedWorkspace && hasProfessionalRole);
        })).map((item) => {
          const itemPath = item.path.startsWith('/dashboard') ? item.path.replace('/dashboard', '') : item.path;
          const workspaceAwarePath = selectedWorkspace?.id 
            ? buildDashboardUrl(itemPath, selectedWorkspace.id)
            : item.path;
          
          const isActive = item.exact
            ? normalizedPathname === item.path
            : normalizedPathname.startsWith(item.path);

          const itemKey = item.path.split('/').pop();
          const shouldHighlight = getHighlightedItem === itemKey;

          const isAccessible = isAdminWorkspace
            ? (!item.permission || hasPermission(userRoles, item.permission))
            : isSidebarItemAccessible(item.path);

          const isPersonalWorkspace = selectedWorkspace?.type === WORKSPACE_TYPES.PERSONAL;
          const isTeamWorkspace = selectedWorkspace?.type === WORKSPACE_TYPES.TEAM;

          // Marketplace: Locked if profile not complete (tutorialPassed)
          const isMarketplaceTeamLocked = itemKey === 'marketplace' && !isAccessible && isPersonalWorkspace;
          // Organization: Locked if profile not complete (tutorialPassed) 
          const isOrganizationTeamLocked = itemKey === 'organization' && !isAccessible && isTeamWorkspace;

          if (!isAccessible && !isMarketplaceTeamLocked && !isOrganizationTeamLocked) {
            return (
              <LockedMenuItem
                key={item.path}
                item={{
                  ...item,
                  title: t(item.title, item.title.split('.').pop())
                }}
                collapsed={collapsed}
                isMobile={window.innerWidth < 768}
              />
            );
          }

          // Render marketplace/organization locked for team access as clickable item
          if (isMarketplaceTeamLocked || isOrganizationTeamLocked) {
            const itemDisplayName = isMarketplaceTeamLocked ? 'Marketplace' : 'Organization';
            return (
              <button
                key={item.path}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (typeof setAllowAccessLevelModalClose === 'function') {
                    setAllowAccessLevelModalClose(true);
                  }
                  if (typeof setShowAccessLevelModal === 'function') {
                    setShowAccessLevelModal(true);
                  }
                }}
                data-tutorial={`${itemKey}-link`}
                className={cn(
                  "group relative flex items-center justify-between w-full p-2 text-left rounded-lg transition-all duration-200 outline-none min-w-0",
                  "text-muted-foreground/50 cursor-pointer select-none",
                  "border-2 border-transparent bg-muted/10",
                  "hover:bg-muted/20 hover:border-muted/40",
                  collapsed && "justify-center px-1.5"
                )}
              >
                <div className={cn(
                  "w-1.5 h-full absolute left-0 top-0 bottom-0 rounded-l-lg",
                  "bg-muted/30"
                )} />
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className={cn(
                    "p-1.5 rounded-md transition-colors shrink-0",
                    "bg-muted/20 text-muted-foreground/50"
                  )}>
                    <item.icon className="w-5 h-5 shrink-0" />
                  </div>
                  {!collapsed && (
                    <span className="text-sm font-medium truncate flex-1">
                      {t(item.title, item.title.split('.').pop())}
                    </span>
                  )}
                </div>
                {!collapsed && (
                  <svg
                    className="w-4 h-4 text-muted-foreground/40 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                )}
              </button>
            );
          }

          // Render unlocked item as NavLink
          return (
            <NavLink
              key={item.path}
              to={workspaceAwarePath}
              onClick={(e) => {
                const isCurrentlyOnProfile = location.pathname.includes('/profile');
                const isClickingOtherTab = !item.path.includes('/profile');
                const shouldShowAccessPopup = accessLevelChoice === 'team' || accessLevelChoice === 'loading';
                
                if (isCurrentlyOnProfile && isClickingOtherTab && shouldShowAccessPopup) {
                  e.preventDefault();
                  e.stopPropagation();
                  if (typeof setAllowAccessLevelModalClose === 'function') {
                    setAllowAccessLevelModalClose(true);
                  }
                  if (typeof setShowAccessLevelModal === 'function') {
                    setShowAccessLevelModal(true);
                  }
                  return false;
                }
                
                const currentIsAccessible = isSidebarItemAccessible(item.path);
                if (!currentIsAccessible) {
                  e.preventDefault();
                  e.stopPropagation();
                  return false;
                }

                const linkElement = e.currentTarget;
                const isDisabled = linkElement.getAttribute('data-tutorial-disabled') === 'true';
                if (isDisabled) {
                  e.preventDefault();
                  e.stopPropagation();
                  return false;
                }
                handleNavClick();
              }}
              data-tutorial={`${item.path.split('/').pop()}-link`}
              className={({ isActive: linkActive }) => {
                const isTutorialTarget = isTutorialActive && isProfileTutorial(activeTutorial) && item.path.includes('/profile');
                const active = isActive || linkActive || isTutorialTarget;

                return cn(
                  "group flex items-center justify-between w-full p-2 text-left rounded-lg transition-all duration-200 outline-none relative min-w-0 border-2 border-transparent",
                  active
                    ? "bg-primary/5 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  (isTutorialTarget || shouldHighlight) && "tutorial-highlight",
                  collapsed && "justify-center px-1.5"
                );
              }}
            >
              {({ isActive: linkActive }) => {
                const isTutorialTarget = isTutorialActive && isProfileTutorial(activeTutorial) && item.path.includes('/profile');
                const active = isActive || linkActive || isTutorialTarget;

                return (
                  <>
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className={cn(
                        "p-1.5 rounded-md transition-colors shrink-0",
                        active
                          ? "bg-primary/10 text-primary"
                          : "bg-muted/20 text-muted-foreground group-hover:text-foreground"
                      )}>
                        <item.icon className="w-5 h-5 shrink-0" />
                      </div>
                      {!collapsed && (
                        <span className={cn(
                          "font-medium text-sm truncate min-w-0",
                          active
                            ? "text-foreground"
                            : "text-muted-foreground group-hover:text-foreground"
                        )}>
                          {t(item.title, item.title.split('.').pop())}
                        </span>
                      )}
                    </div>
                    {/* Tooltip for collapsed mode */}
                    {collapsed && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap border border-border">
                        {t(item.title, item.title.split('.').pop())}
                      </div>
                    )}
                  </>
                );
              }}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}

Sidebar.propTypes = {
  collapsed: PropTypes.bool,
  onToggle: PropTypes.func,
  isMobile: PropTypes.bool,
  isOverlayMode: PropTypes.bool,
  isOverlayExpanded: PropTypes.bool
};