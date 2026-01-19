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
  FlaskConical
} from 'lucide-react';
import { cn } from '../../../utils/cn';
import { normalizePathname } from '../../utils/pathUtils';
import { useTutorial } from '../../contexts/TutorialContext';
import { useDashboard } from '../../contexts/DashboardContext';
import { useAuth } from '../../../contexts/AuthContext';
import { WORKSPACE_TYPES } from '../../../utils/sessionAuth';
import { hasPermission, PERMISSIONS } from '../../admin/utils/rbac';
import LockedMenuItem from './LockedMenuItem';

// Define regular sidebar items structure
const REGULAR_SIDEBAR_ITEMS = [
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
    path: '/dashboard/marketplace'
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
  const { isSidebarItemAccessible, forceUpdateElementPosition, isTutorialActive, activeTutorial, stepData } = useTutorial();
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

  const SIDEBAR_ORDER = ['profile', 'messages', 'contracts', 'calendar', 'marketplace', 'payroll', 'organization', 'settings'];

  const getHighlightedItem = React.useMemo(() => {
    const highlightSidebarItem = stepData?.highlightSidebarItem;
    if (highlightSidebarItem) {
      return highlightSidebarItem;
    }

    if (tutorialPassed) {
      return null;
    }

    const isProfileTabsComplete = completedTutorials.includes('profileTabs') || completedTutorials.includes('facilityProfileTabs');
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

      const tutorialKey = item === 'messages' ? 'messages' :
        item === 'contracts' ? 'contracts' :
          item === 'calendar' ? 'calendar' :
            item === 'marketplace' ? 'marketplace' :
              item === 'payroll' ? 'payroll' :
                item === 'organization' ? 'organization' :
                  item === 'settings' ? 'settings' : null;

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
        "fixed left-0 top-16 h-[calc(100vh-4rem)] bg-sidebar shadow-xl shadow-foreground/5 transition-all duration-300 ease-in-out overflow-x-hidden",
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
          title={isTutorialActive ? "Locked during tutorial" : (collapsed ? "Expand" : "Collapse")}
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

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-1.5 px-2 flex flex-col gap-0.5">
        {(isAdminWorkspace ? getAdminSidebarItems(t).filter(item => !item.permission || hasPermission(userRoles, item.permission)) : REGULAR_SIDEBAR_ITEMS.filter(item => {
          const isPersonalWorkspace = selectedWorkspace?.type === WORKSPACE_TYPES.PERSONAL;
          const isTeamWorkspace = selectedWorkspace?.type === WORKSPACE_TYPES.TEAM;
          
          if (item.facilityOnly) {
            return isTeamWorkspace;
          }
          
          const professionalItems = ['messages', 'contracts', 'calendar', 'marketplace'];
          const itemKey = item.path.split('/').pop();
          
          if (professionalItems.includes(itemKey)) {
            return isPersonalWorkspace;
          }
          
          if (itemKey === 'profile') {
            return true;
          }
          
          return isPersonalWorkspace;
        })).map((item) => {
          const isActive = item.exact
            ? normalizedPathname === item.path
            : normalizedPathname.startsWith(item.path);

          const itemKey = item.path.split('/').pop();
          const shouldHighlight = getHighlightedItem === itemKey;

          const isAccessible = isAdminWorkspace
            ? (!item.permission || hasPermission(userRoles, item.permission))
            : isSidebarItemAccessible(item.path);

          // Render locked item with unified component
          if (!isAccessible) {
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

          // Render unlocked item as NavLink
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={(e) => {
                // Check accessibility first (same pattern as profile tabs)
                const currentIsAccessible = isSidebarItemAccessible(item.path);
                if (!currentIsAccessible) {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log(`[Sidebar] Click prevented on ${item.path} - item is not accessible`);
                  return false;
                }

                // Backup check via attributes
                const linkElement = e.currentTarget;
                const isDisabled = linkElement.getAttribute('data-tutorial-disabled') === 'true';
                if (isDisabled) {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log(`[Sidebar] Click prevented on ${item.path} - item is disabled`);
                  return false;
                }
                handleNavClick();
              }}
              data-tutorial={`${item.path.split('/').pop()}-link`}
              className={({ isActive: linkActive }) => {
                const isTutorialTarget = isTutorialActive && activeTutorial === 'profileTabs' && item.path.includes('/profile');
                const active = isActive || linkActive || isTutorialTarget;

                return cn(
                  "group flex items-center justify-between w-full p-2 text-left rounded-lg transition-all duration-200 outline-none relative min-w-0",
                  active
                    ? "bg-primary/5 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  isTutorialTarget && "tutorial-pulse",
                  shouldHighlight && "global-highlight",
                  collapsed && "justify-center px-1.5"
                );
              }}
            >
              {({ isActive: linkActive }) => {
                const isTutorialTarget = isTutorialActive && activeTutorial === 'profileTabs' && item.path.includes('/profile');
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