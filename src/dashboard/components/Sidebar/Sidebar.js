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
  FiDollarSign,
  FiUsers,
  FiHome
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
import { normalizePathname, buildDashboardUrl, getWorkspaceIdForUrl, getOrganizationBasePath } from '../../utils/pathUtils';
import { useDashboard } from '../../contexts/DashboardContext';
import {
  isProfessionalSync,
  isAdminSync
} from '../../../config/workspaceDefinitions';
import { useAdminPermission } from '../../admin/hooks/useAdminPermission';
import { WORKSPACE_TYPES } from '../../../utils/sessionAuth';
import { RIGHTS as PERMISSIONS } from '../../admin/utils/rbac';
import LockedMenuItem from './LockedMenuItem';
// Define regular sidebar items structure
// Define regular sidebar items structure
const REGULAR_SIDEBAR_ITEMS = [
  {
    title: 'dashboard.sidebar.overview',
    icon: LayoutDashboard,
    path: '/dashboard/overview'
  },
  {
    title: 'dashboard.sidebar.communication',
    icon: FiMessageSquare,
    path: '/dashboard/messages'
  },
  {
    title: 'dashboard.sidebar.calendar',
    icon: FiCalendar,
    path: '/dashboard/calendar'
  },
  {
    title: 'dashboard.sidebar.profile',
    icon: FiUser,
    path: '/dashboard/profile',
    personalOnly: true
  },
  {
    title: 'dashboard.sidebar.marketplace',
    icon: Briefcase,
    path: '/dashboard/marketplace',
    personalOnly: true
  },
  {
    title: 'dashboard.sidebar.organization',
    icon: FiUsers,
    path: '/dashboard/organization',
    facilityOnly: true,
    dynamicPath: true
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
    title: t('admin:sidebar.rolesPermissions', 'Roles & Permissions'),
    icon: Shield,
    path: '/dashboard/admin/system/roles-permissions',
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
  const { selectedWorkspace, userProfile, user } = useDashboard();
  const { hasRight } = useAdminPermission();

  const isAdminWorkspace = selectedWorkspace?.type === WORKSPACE_TYPES.ADMIN;

  const handleNavClick = () => {
    if (window.innerWidth < 768 && onToggle) {
      onToggle();
    }
    if (isOverlayMode && isOverlayExpanded && onToggle) {
      onToggle();
    }
  };

  const handleToggleClick = () => {
    if (onToggle) {
      onToggle();
    }
  };

  return (
    <aside
      className={cn(
        "fixed left-0 bg-sidebar transition-all duration-200 ease-in-out overflow-x-hidden transform",
        "border-r border-border/50",
        isOverlayMode && isOverlayExpanded ? "top-0 h-screen" : "top-14 h-[calc(100vh-3.5rem)]",
        isMobile ? "top-0 h-screen" : "",
        isOverlayMode ? "w-64" : (collapsed ? "w-[70px]" : "w-64"),
        isOverlayMode ? (isOverlayExpanded ? "translate-x-0" : "-translate-x-full") : "translate-x-0",
        isMobile
          ? "z-[60] flex flex-col md:!hidden"
          : isOverlayMode
            ? isOverlayExpanded
              ? "z-[60] flex flex-col"
              : "z-[60] flex flex-col"
            : "z-40 flex flex-col"
      )}
      style={{
        backgroundColor: 'hsl(var(--sidebar-background))',
        zIndex: isMobile || isOverlayMode ? 60 : undefined
      }}
    >

      {/* Collapse/Expand Button - Above Overview */}
      <div className={cn(
        "h-12 flex items-center",
        collapsed ? "px-2" : "px-3"
      )}>
        <button
          onClick={handleToggleClick}
          className={cn(
            "w-full py-1.5 rounded-md hover:bg-sidebar-accent/50 text-sidebar-foreground/60 hover:text-sidebar-foreground/80 transition-all flex items-center gap-2",
            collapsed ? "justify-center px-2" : "justify-start px-2"
          )}
          title={collapsed ? t('dashboard.sidebar.expand', 'Expand') : t('dashboard.sidebar.collapse', 'Collapse')}
        >
          {collapsed ? (
            <FiChevronRight size={16} />
          ) : (
            <>
              <FiChevronLeft size={16} />
              <span className="text-xs font-normal text-sidebar-foreground/70">{t('dashboard.sidebar.collapse', 'Collapse')}</span>
            </>
          )}
        </button>
      </div>

      {/* Navigation Items */}
      <nav className={cn(
        "flex-1 overflow-y-auto overflow-x-hidden flex flex-col gap-1",
        collapsed ? "py-1 px-1.5" : "py-1 px-2"
      )}>
        {(isAdminWorkspace ? getAdminSidebarItems(t).filter(item => !item.permission || hasRight(item.permission)) : REGULAR_SIDEBAR_ITEMS).map((item) => {
          let itemPath = item.path.startsWith('/dashboard') ? item.path.replace('/dashboard', '') : item.path;
          itemPath = itemPath.startsWith('/') ? itemPath.substring(1) : itemPath;
          
          let dynamicTitle = item.title;
          if (item.dynamicPath && selectedWorkspace) {
            const basePath = getOrganizationBasePath(selectedWorkspace);
            itemPath = itemPath.replace('organization', basePath);
            dynamicTitle = basePath === 'facility' ? 'dashboard.sidebar.facility' : 'dashboard.sidebar.organization';
          }
          
          const isGlobalRoute = ['marketplace'].some(route => itemPath.includes(route));

          const workspaceId = selectedWorkspace ? getWorkspaceIdForUrl(selectedWorkspace) : null;
          const workspaceAwarePath = workspaceId && !isGlobalRoute
            ? buildDashboardUrl(itemPath, workspaceId)
            : item.path;

          const currentItemKey = item.path.split('/').pop();
          const isActive = normalizedPathname.includes(currentItemKey);

          const isAdmin = isAdminSync(user);

          const isPersonalWorkspace = selectedWorkspace?.type === WORKSPACE_TYPES.PERSONAL;
          const isTeamWorkspace = selectedWorkspace?.type === WORKSPACE_TYPES.FACILITY || !!selectedWorkspace?.facilityId;

          if (item.personalOnly && !isPersonalWorkspace) {
            return null;
          }

          if (item.facilityOnly && !isTeamWorkspace) {
            return null;
          }

          const isAccessible = isAdminWorkspace
            ? (!item.permission || hasRight(item.permission))
            : true;

          if (!isAccessible) {
            return (
              <LockedMenuItem
                key={item.path}
                item={{
                  ...item,
                  title: t(dynamicTitle, dynamicTitle.split('.').pop())
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
              to={workspaceAwarePath}
              onClick={(e) => {
                console.log('[Sidebar] Clicking link:', workspaceAwarePath);
                handleNavClick();
              }}
              className={({ isActive: linkActive }) => {
                const active = isActive || linkActive;

                return cn(
                  "group relative flex gap-2 rounded-md hover:bg-muted/40 transition-all cursor-pointer",
                  collapsed ? "p-2 justify-center" : "p-2.5",
                  active && "bg-primary/5"
                );
              }}
            >
              {({ isActive: linkActive }) => {
                const active = isActive || linkActive;
                return (
                  <>
                    <div className={cn(
                      "w-0.5 h-full absolute left-0 top-0 bottom-0 rounded-r",
                      active && "bg-primary"
                    )} />
                    <div className={cn(
                      "w-full flex items-center justify-between",
                      collapsed ? "justify-center pl-0" : "pl-1.5"
                    )}>
                      <div className={cn(
                        "flex items-center",
                        collapsed ? "justify-center" : "gap-2.5"
                      )}>
                        <div className={cn(
                          "transition-colors shrink-0",
                          active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                        )}>
                          <item.icon className="w-4 h-4 shrink-0" />
                        </div>
                        {!collapsed && (
                          <span className={cn(
                            "text-sm font-normal truncate",
                            active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                          )}>
                            {t(dynamicTitle, dynamicTitle.split('.').pop())}
                          </span>
                        )}
                      </div>
                      {!collapsed && (
                        <div className="ml-2 shrink-0">
                        </div>
                      )}
                    </div>
                    {collapsed && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap border border-border/50">
                        {t(dynamicTitle, dynamicTitle.split('.').pop())}
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