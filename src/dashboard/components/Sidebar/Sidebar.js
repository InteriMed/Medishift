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
import { cn } from '../../../utils/cn';
import logoImage from '../../../assets/global/logo.png';
import { normalizePathname } from '../../utils/pathUtils';
import { useTutorial } from '../../contexts/TutorialContext';
import LockedMenuItem from './LockedMenuItem';

// Define sidebar items structure
const SIDEBAR_ITEMS = [
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
  // 🇨🇭 Swiss Compliance - Phase 1: Payroll (Facilities only)
  {
    title: 'dashboard.sidebar.payroll',
    icon: FiDollarSign,
    path: '/dashboard/payroll',
    facilityOnly: true
  },
  // 🔵 Phase 2: Organization Management (Facilities only)
  {
    title: 'dashboard.sidebar.organization',
    icon: FiUsers,
    path: '/dashboard/organization',
    facilityOnly: true
  }
];

export function Sidebar({ collapsed, onToggle, isMobile = false, isOverlayMode = false, isOverlayExpanded = false }) {
  const { t } = useTranslation(['dashboard']);
  const location = useLocation();
  const normalizedPathname = React.useMemo(() => normalizePathname(location.pathname), [location.pathname]);
  const { isSidebarItemAccessible, forceUpdateElementPosition, isTutorialActive, activeTutorial } = useTutorial();

  const handleNavClick = () => {
    if (window.innerWidth < 768 && onToggle) {
      onToggle();
    }
    if (isOverlayMode && isOverlayExpanded && onToggle) {
      onToggle();
    }
  };

  const handleToggleClick = () => {
    // Prevent toggling during tutorial
    if (isTutorialActive) return;

    if (onToggle) {
      onToggle();
    }

    // If tutorial is active, force position updates for smooth repositioning
    if (isTutorialActive && forceUpdateElementPosition) {
      // Update immediately for instant visual feedback
      setTimeout(() => {
        forceUpdateElementPosition();
      }, 0);

      // Update again after sidebar transition completes for final accurate positioning
      setTimeout(() => {
        forceUpdateElementPosition();
      }, 320);
    }
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-sidebar border-r border-border transition-all duration-300 ease-in-out overflow-x-hidden",
        collapsed ? "w-[70px]" : "w-64",
        isMobile
          ? "z-50 flex flex-col md:!hidden"
          : isOverlayMode
            ? isOverlayExpanded
              ? "z-50 flex flex-col"
              : "z-40 flex flex-col"
            : "z-40 !hidden md:!flex md:flex-col"
      )}
    >
      {/* Header Section with Logo */}
      <div className={cn(
        "h-16 flex items-center justify-center border-b border-border bg-sidebar-accent/10 px-3"
      )}>
        <div className="flex items-center gap-3 overflow-hidden opacity-100 transition-opacity duration-300 min-w-0">
          <img
            src={logoImage}
            alt="MediShift"
            className="h-8 w-auto object-contain shrink-0"
          />
          {!collapsed && (
            <span className="text-xl font-bold" style={{ color: 'var(--primary-color)' }}>
              MediShift
            </span>
          )}
        </div>
      </div>

      {/* Collapse/Expand Button - Above Overview */}
      <div className={cn(
        "h-16 border-b border-border flex items-center",
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
        {SIDEBAR_ITEMS.map((item) => {
          const isActive = item.exact
            ? normalizedPathname === item.path
            : normalizedPathname.startsWith(item.path);

          // Check if this item is accessible during onboarding
          const isAccessible = isSidebarItemAccessible(item.path);

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
                // Add highlight for profile if implementation tutorial is active
                const isTutorialTarget = isTutorialActive && activeTutorial === 'profileTabs' && item.path.includes('/profile');
                const active = isActive || linkActive || isTutorialTarget;

                return cn(
                  "group flex items-center justify-between w-full p-2 text-left rounded-lg transition-all duration-200 outline-none border border-transparent relative min-w-0",
                  active
                    ? "bg-primary/5 border-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  isTutorialTarget && !isActive && !linkActive && "ring-1 ring-primary/50 border-primary/20", // Extra visual cue if not actually on the page
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

      {/* Footer - Removed collapse button from here */}
      <div className="p-2 border-t border-border mt-auto">
        {/* Could put user profile here later */}
      </div>
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