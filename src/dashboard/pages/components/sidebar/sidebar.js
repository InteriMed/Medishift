import React from 'react';
import PropTypes from 'prop-types';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
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
  Briefcase,
  Building,
  Archive
} from 'lucide-react';
import { cn } from '../../../../services/utils/formatting';
import { normalizePathname, buildDashboardUrl, getWorkspaceIdForUrl, getOrganizationBasePath } from '../../../../config/routeUtils';
import { useDashboard } from '../../../contexts/dashboardContext';
import {
  isProfessionalSync,
  isAdminSync
} from '../../../../config/workspaceDefinitions';
import { useAdminPermission } from '../../../admin/hooks/useAdminPermission';
import { WORKSPACE_TYPES } from '../../../utils/sessionAuth';
import { RIGHTS as PERMISSIONS } from '../../../admin/utils/rbac';
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
    path: '/dashboard/communications'
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
    icon: Building,
    path: '/dashboard/organization',
    facilityOnly: true,
    dynamicPath: true
  }
];

// Define admin sidebar items structure
const getAdminSidebarItems = (t, hasRight) => [
  {
    title: t('admin:sidebar.dashboard', 'Executive Dashboard'),
    icon: LayoutDashboard,
    path: '/dashboard/admin/portal',
    permission: PERMISSIONS.VIEW_DASHBOARD
  },
  {
    title: t('admin:sidebar.spendingsIncomes', 'Spendings and Incomes'),
    icon: DollarSign,
    path: '/dashboard/admin/finance/spendings',
    permission: null,
    isGroup: true,
    groupItems: [
      {
        title: t('admin:sidebar.referralPayouts', 'Referral Payouts'),
        path: '/dashboard/admin/finance/spendings',
        permission: PERMISSIONS.VIEW_FINANCE
      },
      {
        title: t('admin:sidebar.revenueCommissions', 'Revenues and Commissions'),
        path: '/dashboard/admin/finance/revenue',
        permission: PERMISSIONS.VIEW_REVENUE
      },
      {
        title: t('admin:sidebar.balanceSheet', 'Balance Sheets'),
        path: '/dashboard/admin/finance/balance-sheet',
        permission: PERMISSIONS.VIEW_BALANCE_SHEET
      }
    ].filter(item => !item.permission || hasRight(item.permission))
  },
  {
    title: t('admin:sidebar.actions', 'Actions'),
    icon: Briefcase,
    path: '/dashboard/admin/verification',
    permission: null,
    isGroup: true,
    groupItems: [
      {
        title: t('admin:sidebar.verificationQueue', 'Verification Queue'),
        path: '/dashboard/admin/verification',
        permission: PERMISSIONS.VERIFY_USERS
      },
      {
        title: t('admin:sidebar.supportCenter', 'Support Center'),
        path: '/dashboard/admin/actions/support-center',
        permission: PERMISSIONS.SEND_NOTIFICATIONS
      }
    ].filter(item => !item.permission || hasRight(item.permission))
  },
  {
    title: t('admin:sidebar.operations', 'Operations'),
    icon: Briefcase,
    path: '/dashboard/admin/operations/users',
    permission: null,
    isGroup: true,
    groupItems: [
      {
        title: t('admin:sidebar.searchCRM', 'Search - CRM'),
        path: '/dashboard/admin/operations/users',
        permission: PERMISSIONS.VIEW_USER_PROFILES
      },
      {
        title: t('admin:sidebar.shiftList', 'Shift List'),
        path: '/dashboard/admin/operations/shifts',
        permission: PERMISSIONS.MANAGE_SHIFTS
      },
      {
        title: t('admin:sidebar.linkedinJobScraper', 'LinkedIn Job Scraper'),
        path: '/dashboard/admin/operations/job-scraper',
        permission: PERMISSIONS.MANAGE_SYSTEM
      }
    ].filter(item => !item.permission || hasRight(item.permission))
  },
  {
    title: t('admin:sidebar.system', 'System'),
    icon: Shield,
    path: '/dashboard/admin/system/audit',
    permission: null,
    isGroup: true,
    groupItems: [
      {
        title: t('admin:sidebar.auditLogs', 'Audit Logs'),
        path: '/dashboard/admin/system/audit',
        permission: PERMISSIONS.VIEW_AUDIT_LOGS
      },
      {
        title: t('admin:sidebar.rolesPermissions', 'Roles & Permissions'),
        path: '/dashboard/admin/system/roles-permissions',
        permission: PERMISSIONS.VIEW_AUDIT_LOGS
      },
      {
        title: t('admin:sidebar.notifications', 'Notifications'),
        path: '/dashboard/admin/system/notifications',
        permission: PERMISSIONS.SEND_NOTIFICATIONS
      },
      {
        title: t('admin:sidebar.emailCenter', 'Email Center'),
        path: '/dashboard/admin/email',
        permission: PERMISSIONS.SEND_NOTIFICATIONS
      },
      {
        title: t('admin:sidebar.glnTest', 'GLN Test'),
        path: '/dashboard/admin/system/gln-test',
        permission: PERMISSIONS.VIEW_AUDIT_LOGS
      }
    ].filter(item => !item.permission || hasRight(item.permission))
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
    path: '/dashboard/admin/management/admins',
    permission: PERMISSIONS.MANAGE_ADMINS
  }
].filter(item => {
  if (item.isGroup) {
    return item.groupItems && item.groupItems.length > 0;
  }
  return !item.permission || hasRight(item.permission);
});

export function Sidebar({ collapsed, onToggle, isMobile = false, isOverlayMode = false, isOverlayExpanded = false }) {
  const { t } = useTranslation(['dashboard', 'admin']);
  const location = useLocation();
  const navigate = useNavigate();
  const normalizedPathname = React.useMemo(() => normalizePathname(location.pathname), [location.pathname]);
  const { selectedWorkspace, userProfile, user } = useDashboard();
  const { hasRight } = useAdminPermission();
  const sidebarRef = React.useRef(null);

  const isAdminWorkspace = selectedWorkspace?.type === WORKSPACE_TYPES.ADMIN;


  const handleMouseEnter = () => {
    if (collapsed && !isMobile && !isOverlayMode && onToggle) {
      onToggle();
    }
  };

  const handleMouseLeave = () => {
    if (!collapsed && !isMobile && !isOverlayMode && onToggle) {
      onToggle();
    }
  };

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
      ref={sidebarRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "fixed left-0 bg-sidebar transition-all duration-200 ease-in-out overflow-x-hidden transform",
        "border-r border-border/50",
        isOverlayMode && isOverlayExpanded ? "top-0 h-screen" : "top-14 h-[calc(100vh-3.5rem)]",
        isMobile ? "top-0 h-screen" : "",
        isOverlayMode ? (collapsed ? "w-[70px] min-w-[70px]" : "w-64 min-w-[256px]") : (collapsed ? "w-[70px] min-w-[70px]" : "w-64 min-w-[256px]"),
        "translate-x-0",
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
        zIndex: isMobile || isOverlayMode ? 60 : undefined,
        width: isOverlayMode ? (collapsed ? '70px' : '256px') : (collapsed ? '70px' : '256px'),
        minWidth: isOverlayMode ? (collapsed ? '70px' : '256px') : (collapsed ? '70px' : '256px')
      }}
    >

      {isMobile ? (
        <div className={cn(
          "h-12 flex items-center",
          "px-3"
        )}>
          <button
            onClick={handleToggleClick}
            className={cn(
              "w-full py-1.5 rounded-md hover:bg-sidebar-accent/50 text-sidebar-foreground/60 hover:text-sidebar-foreground/80 transition-all flex items-center",
              collapsed ? "justify-center px-2" : "justify-start px-2 gap-2"
            )}
            title={collapsed ? t('dashboard.sidebar.expand', 'Expand') : t('dashboard.sidebar.collapse', 'Collapse')}
          >
            {collapsed ? (
              <FiChevronRight size={18} />
            ) : (
              <>
                <FiChevronLeft size={18} />
                <span className="text-xs font-normal text-sidebar-foreground/70">{t('dashboard.sidebar.collapse', 'Collapse')}</span>
              </>
            )}
          </button>
        </div>
      ) : isOverlayMode && collapsed ? (
        <div className="absolute left-0 top-2 z-50">
          <button
            onClick={handleToggleClick}
            className="p-1.5 rounded-md hover:bg-sidebar-accent/50 text-sidebar-foreground/60 hover:text-sidebar-foreground/80 transition-all"
            title={t('dashboard.sidebar.expand', 'Expand')}
          >
            <FiChevronRight size={16} />
          </button>
        </div>
      ) : null}

      {/* Navigation Items */}
      <nav 
        className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden flex flex-col gap-1",
          "py-1 px-2"
        )}
      >
        {(isAdminWorkspace ? getAdminSidebarItems(t, hasRight) : REGULAR_SIDEBAR_ITEMS).map((item) => {
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

          let isActive = false;
          if (item.isGroup && item.groupItems) {
            isActive = item.groupItems.some(groupItem => 
              normalizedPathname.includes(groupItem.path.split('/').pop()) ||
              normalizedPathname.includes(groupItem.path.replace('/dashboard/admin/', ''))
            );
          } else {
            const currentItemKey = item.path.split('/').pop();
            isActive = normalizedPathname.includes(currentItemKey) || 
                      normalizedPathname.includes(item.path.replace('/dashboard/admin/', ''));
          }

          const isAdmin = isAdminSync(user);

          const isPersonalWorkspace = selectedWorkspace?.type === WORKSPACE_TYPES.PERSONAL;
          const isTeamWorkspace = selectedWorkspace?.type === WORKSPACE_TYPES.FACILITY || selectedWorkspace?.type === 'organization' || !!selectedWorkspace?.facilityId;
          
          const isFacilityProfileRoute = normalizedPathname.includes('facility') && normalizedPathname.includes('profile');
          const shouldUseFacilityIcon = isFacilityProfileRoute && item.path.includes('profile');
          const isProfileItemForFacility = item.path.includes('profile') && isFacilityProfileRoute;

          if (item.personalOnly && !isPersonalWorkspace && !isProfileItemForFacility) {
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
          const finalPath = item.isGroup && item.groupItems && item.groupItems.length > 0
            ? (workspaceId ? buildDashboardUrl(item.groupItems[0].path.replace('/dashboard/admin/', ''), workspaceId) : item.groupItems[0].path)
            : workspaceAwarePath;

          return (
            <NavLink
              key={item.path}
              to={finalPath}
              onClick={(e) => {
                console.log('[Sidebar] Clicking link:', finalPath);
                e.stopPropagation();
                handleNavClick();
              }}
              className={({ isActive: linkActive }) => {
                const active = isActive || linkActive;

                return cn(
                  "group relative flex rounded-md hover:bg-muted/40 transition-all cursor-pointer",
                  "p-2.5",
                  collapsed ? "justify-center" : "",
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
                      "w-full flex items-center",
                      collapsed ? "justify-center" : "justify-between"
                    )}>
                      <div className={cn(
                        "flex items-center",
                        collapsed ? "justify-center w-full" : "gap-3"
                      )}>
                        <div className={cn(
                          "transition-colors shrink-0 flex items-center justify-center",
                          "w-5 h-5",
                          active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                        )}>
                          {shouldUseFacilityIcon ? (
                            <Building className="w-5 h-5 shrink-0" />
                          ) : (
                            <item.icon className="w-5 h-5 shrink-0" />
                          )}
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