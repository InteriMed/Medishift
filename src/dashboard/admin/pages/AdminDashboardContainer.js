import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    FiUsers,
    FiSearch,
    FiCalendar,
    FiBriefcase,
    FiDollarSign,
    FiFileText,
    FiAlertCircle,
    FiShield,
    FiBell
} from 'react-icons/fi';
import { FlaskConical } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { buildDashboardUrl, getWorkspaceIdForUrl } from '../../utils/pathUtils';
import { useDashboard } from '../../contexts/DashboardContext';
import { useAdminPermission } from '../hooks/useAdminPermission';
import { RIGHTS as PERMISSIONS } from '../utils/rbac';

import ExecutiveDashboard from './ExecutiveDashboard';
import UserVerificationQueue from '../UserVerificationQueue';
import SupportCenter from './actions/SupportCenter';
import UserCRM from './operations/UserCRM';
import ShiftCommandCenter from './operations/ShiftCommandCenter';
import LinkedInJobScraper from './operations/LinkedInJobScraper';
import RevenueAnalysis from './finance/RevenueAnalysis';
import SpendingsTracker from './finance/SpendingsTracker';
import AccountsReceivable from './finance/AccountsReceivable';
import BalanceSheet from './finance/BalanceSheet';
import AuditLogs from './system/AuditLogs';
import RolesAndPermissions from './system/RolesAndPermissions';
import NotificationsCenter from './system/NotificationsCenter';
import GLNTestPage from '../GLNTestPage';
import ConsolidatedPayroll from './payroll/ConsolidatedPayroll';
import AdminManagement from './management/AdminManagement';

const AdminDashboardContainer = () => {
    const { t } = useTranslation(['admin', 'common']);
    const { selectedWorkspace } = useDashboard();
    const { hasRight } = useAdminPermission();
    const navigate = useNavigate();
    const location = useLocation();

    const tabs = useMemo(() => {
        const allTabs = [
            {
                id: 'dashboard',
                path: 'portal',
                label: t('admin:sidebar.dashboard', 'Executive Dashboard'),
                icon: FiUsers,
                permission: PERMISSIONS.VIEW_DASHBOARD,
                component: ExecutiveDashboard
            },
            {
                id: 'spendings-incomes',
                path: 'finance',
                label: t('admin:sidebar.spendingsIncomes', 'Spendings and Incomes'),
                icon: FiDollarSign,
                subTabs: [
                    {
                        id: 'spendings',
                        path: 'spendings',
                        fullPath: 'finance/spendings',
                        label: t('admin:sidebar.referralPayouts', 'Referral Payouts'),
                        icon: FiDollarSign,
                        permission: PERMISSIONS.VIEW_FINANCE,
                        component: SpendingsTracker
                    },
                    {
                        id: 'revenue',
                        path: 'revenue',
                        fullPath: 'finance/revenue',
                        label: t('admin:sidebar.revenueCommissions', 'Revenues and Commissions'),
                        icon: FiDollarSign,
                        permission: PERMISSIONS.VIEW_REVENUE,
                        component: RevenueAnalysis
                    },
                    {
                        id: 'balance-sheet',
                        path: 'balance-sheet',
                        fullPath: 'finance/balance-sheet',
                        label: t('admin:sidebar.balanceSheet', 'Balance Sheets'),
                        icon: FiDollarSign,
                        permission: PERMISSIONS.VIEW_BALANCE_SHEET,
                        component: BalanceSheet
                    }
                ]
            },
            {
                id: 'actions',
                path: 'actions',
                label: t('admin:sidebar.actions', 'Actions'),
                icon: FiBriefcase,
                subTabs: [
                    {
                        id: 'verification',
                        path: 'verification',
                        fullPath: 'verification',
                        label: t('admin:sidebar.verificationQueue', 'Verification Queue'),
                        icon: FiUsers,
                        permission: PERMISSIONS.VERIFY_USERS,
                        component: UserVerificationQueue
                    },
                    {
                        id: 'support-center',
                        path: 'support-center',
                        fullPath: 'actions/support-center',
                        label: t('admin:sidebar.supportCenter', 'Support Center'),
                        icon: FiBell,
                        permission: PERMISSIONS.SEND_NOTIFICATIONS,
                        component: SupportCenter
                    }
                ]
            },
            {
                id: 'operations',
                path: 'operations',
                label: t('admin:sidebar.operations', 'Operations'),
                icon: FiBriefcase,
                subTabs: [
                    {
                        id: 'users',
                        path: 'users',
                        fullPath: 'operations/users',
                        label: t('admin:sidebar.searchCRM', 'Search - CRM'),
                        icon: FiSearch,
                        permission: PERMISSIONS.VIEW_USER_PROFILES,
                        component: UserCRM
                    },
                    {
                        id: 'shifts',
                        path: 'shifts',
                        fullPath: 'operations/shifts',
                        label: t('admin:sidebar.shiftList', 'Shift List'),
                        icon: FiCalendar,
                        permission: PERMISSIONS.MANAGE_SHIFTS,
                        component: ShiftCommandCenter
                    },
                    {
                        id: 'job-scraper',
                        path: 'job-scraper',
                        fullPath: 'operations/job-scraper',
                        label: t('admin:sidebar.linkedinJobScraper', 'LinkedIn Job Scraper'),
                        icon: FiBriefcase,
                        permission: PERMISSIONS.MANAGE_SYSTEM,
                        component: LinkedInJobScraper
                    }
                ]
            },
            {
                id: 'system',
                path: 'system',
                label: t('admin:sidebar.system', 'System'),
                icon: FiShield,
                subTabs: [
                    {
                        id: 'audit',
                        path: 'audit',
                        fullPath: 'system/audit',
                        label: t('admin:sidebar.auditLogs', 'Audit Logs'),
                        icon: FiAlertCircle,
                        permission: PERMISSIONS.VIEW_AUDIT_LOGS,
                        component: AuditLogs
                    },
                    {
                        id: 'roles-permissions',
                        path: 'roles-permissions',
                        fullPath: 'system/roles-permissions',
                        label: t('admin:sidebar.rolesPermissions', 'Roles & Permissions'),
                        icon: FiShield,
                        permission: PERMISSIONS.VIEW_AUDIT_LOGS,
                        component: RolesAndPermissions
                    },
                    {
                        id: 'notifications',
                        path: 'notifications',
                        fullPath: 'system/notifications',
                        label: t('admin:sidebar.notifications', 'Notifications'),
                        icon: FiBell,
                        permission: PERMISSIONS.SEND_NOTIFICATIONS,
                        component: NotificationsCenter
                    },
                    {
                        id: 'gln-test',
                        path: 'gln-test',
                        fullPath: 'system/gln-test',
                        label: t('admin:sidebar.glnTest', 'GLN Test'),
                        icon: FlaskConical,
                        permission: PERMISSIONS.VIEW_AUDIT_LOGS,
                        component: GLNTestPage
                    }
                ]
            },
            {
                id: 'payroll',
                path: 'payroll/export',
                label: t('admin:sidebar.payrollExport', 'Payroll Export'),
                icon: FiFileText,
                permission: PERMISSIONS.EXPORT_PAYROLL,
                component: ConsolidatedPayroll
            },
            {
                id: 'management',
                path: 'management/admins',
                label: t('admin:sidebar.adminManagement', 'Admin Management'),
                icon: FiShield,
                permission: PERMISSIONS.MANAGE_ADMINS,
                component: AdminManagement
            }
        ];

        return allTabs.filter(tab => {
            if (tab.permission && !hasRight(tab.permission)) {
                return false;
            }
            if (tab.subTabs) {
                tab.subTabs = tab.subTabs.filter(subTab => 
                    !subTab.permission || hasRight(subTab.permission)
                );
                return tab.subTabs.length > 0;
            }
            return true;
        });
    }, [t, hasRight]);

    const getActiveTabFromPath = useCallback(() => {
        const pathParts = location.pathname.split('/').filter(Boolean);
        const adminIndex = pathParts.findIndex(part => part === 'admin');
        
        if (adminIndex >= 0) {
            if (adminIndex === pathParts.length - 1 || pathParts[adminIndex + 1] === 'portal') {
                return 'dashboard';
            }
            
            const nextPart = pathParts[adminIndex + 1];
            
            for (const tab of tabs) {
                if (tab.path === nextPart || location.pathname.includes(`/${tab.path}/`)) {
                    return tab.id;
                }
                if (tab.subTabs) {
                    for (const subTab of tab.subTabs) {
                        const subPath = subTab.fullPath || `${tab.path}/${subTab.path}`;
                        if (location.pathname.includes(`/${subPath}`) || 
                            location.pathname.includes(`/${subTab.path}`) ||
                            nextPart === subTab.path) {
                            return tab.id;
                        }
                    }
                }
            }
        }
        
        return 'dashboard';
    }, [location.pathname, tabs]);

    const getActiveSubTabFromPath = useCallback(() => {
        const pathParts = location.pathname.split('/').filter(Boolean);
        const adminIndex = pathParts.findIndex(part => part === 'admin');
        
        if (adminIndex >= 0) {
            const activeTab = tabs.find(tab => {
                if (tab.subTabs) {
                    return tab.subTabs.some(subTab => {
                        const subPath = subTab.fullPath || `${tab.path}/${subTab.path}`;
                        return location.pathname.includes(`/${subPath}`) ||
                               location.pathname.includes(`/${subTab.path}`);
                    });
                }
                return false;
            });
            
            if (activeTab && activeTab.subTabs) {
                for (const subTab of activeTab.subTabs) {
                    const subPath = subTab.fullPath || `${activeTab.path}/${subTab.path}`;
                    if (location.pathname.includes(`/${subPath}`) ||
                        location.pathname.includes(`/${subTab.path}`)) {
                        return subTab.id;
                    }
                }
                return activeTab.subTabs[0]?.id;
            }
        }
        
        return null;
    }, [location.pathname, tabs]);

    const activeTab = getActiveTabFromPath();
    const activeSubTab = getActiveSubTabFromPath();

    const workspaceId = getWorkspaceIdForUrl(selectedWorkspace);

    useEffect(() => {
        const pathParts = location.pathname.split('/').filter(Boolean);
        const adminIndex = pathParts.findIndex(part => part === 'admin');
        
        if (adminIndex >= 0) {
            if (adminIndex === pathParts.length - 1) {
                navigate('/dashboard/admin/portal', { replace: true });
                return;
            }
            
            const nextPart = pathParts[adminIndex + 1];
            const activeTabObj = tabs.find(tab => tab.path === nextPart);
            
            if (activeTabObj && activeTabObj.subTabs && activeTabObj.subTabs.length > 0) {
                const hasSubTabMatch = activeTabObj.subTabs.some(subTab => {
                    const subPath = subTab.fullPath || `${activeTabObj.path}/${subTab.path}`;
                    return location.pathname.includes(`/${subPath}`) || 
                           (pathParts.length > adminIndex + 1 && pathParts[adminIndex + 2] === subTab.path);
                });
                
                if (!hasSubTabMatch) {
                    const firstSubTab = activeTabObj.subTabs[0];
                    const subPath = firstSubTab.fullPath || `${activeTabObj.path}/${firstSubTab.path}`;
                    navigate(buildDashboardUrl(`/admin/${subPath}`, workspaceId), { replace: true });
                }
            }
        }
    }, [location.pathname, navigate, tabs, workspaceId]);

    return (
        <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500">
            <div className="shrink-0 pt-4 border-b border-border bg-card/30">
                <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8">
                    <div className="flex items-center justify-between mb-3">
                        <h1 className="text-xl font-semibold text-foreground">
                            {t('admin:title', 'Admin Portal')}
                        </h1>
                    </div>
                    <div className="flex gap-1 sm:gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-1">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        if (tab.subTabs && tab.subTabs.length > 0) {
                                            const firstSubTab = tab.subTabs[0];
                                            const subPath = firstSubTab.fullPath || `${tab.path}/${firstSubTab.path}`;
                                            navigate(buildDashboardUrl(`/admin/${subPath}`, workspaceId));
                                        } else {
                                            navigate(buildDashboardUrl(`/admin/${tab.path}`, workspaceId));
                                        }
                                    }}
                                    className={cn(
                                        "flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0",
                                        "touch-manipulation active:scale-95",
                                        activeTab === tab.id
                                            ? "border-primary text-primary bg-primary/5"
                                            : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
                                    )}
                                    title={tab.label}
                                >
                                    <Icon className="w-4 h-4 shrink-0" />
                                    <span className="text-xs sm:text-sm min-w-0">{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                    {activeTab && tabs.find(t => t.id === activeTab)?.subTabs && (
                        <div className="flex gap-2 border-b border-border overflow-x-auto max-w-[1400px] mx-auto px-6 mt-2">
                            {tabs.find(t => t.id === activeTab)?.subTabs.map((subTab) => {
                                const SubIcon = subTab.icon;
                                return (
                                    <button
                                        key={subTab.id}
                                        onClick={() => {
                                            const parentTab = tabs.find(t => t.id === activeTab);
                                            const subPath = subTab.fullPath || `${parentTab.path}/${subTab.path}`;
                                            navigate(buildDashboardUrl(`/admin/${subPath}`, workspaceId));
                                        }}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                                            activeSubTab === subTab.id
                                                ? "border-primary text-primary"
                                                : "border-transparent text-muted-foreground hover:text-foreground"
                                        )}
                                        title={subTab.label}
                                    >
                                        <SubIcon className="w-4 h-4 shrink-0" />
                                        <span>{subTab.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                {activeTab === 'dashboard' && (
                    <div className="facility-tab-layout-container">
                        <div className="facility-tab-content-wrapper">
                            <div className="facility-tab-content">
                                <ExecutiveDashboard />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'spendings-incomes' && (
                    <div className="facility-tab-layout-container">
                        <div className="facility-tab-content-wrapper">
                            <div className="facility-tab-content">
                                {activeSubTab === 'spendings' && <SpendingsTracker />}
                                {activeSubTab === 'revenue' && <RevenueAnalysis />}
                                {activeSubTab === 'balance-sheet' && <BalanceSheet />}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'actions' && (
                    <div className="facility-tab-layout-container">
                        <div className="facility-tab-content-wrapper">
                            <div className="facility-tab-content">
                                {activeSubTab === 'verification' && <UserVerificationQueue />}
                                {activeSubTab === 'support-center' && <SupportCenter />}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'operations' && (
                    <div className="facility-tab-layout-container">
                        <div className="facility-tab-content-wrapper">
                            <div className="facility-tab-content">
                                {activeSubTab === 'users' && <UserCRM />}
                                {activeSubTab === 'shifts' && <ShiftCommandCenter />}
                                {activeSubTab === 'job-scraper' && <LinkedInJobScraper />}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'system' && (
                    <div className="facility-tab-layout-container">
                        <div className="facility-tab-content-wrapper">
                            <div className="facility-tab-content">
                                {activeSubTab === 'audit' && <AuditLogs />}
                                {activeSubTab === 'roles-permissions' && <RolesAndPermissions />}
                                {activeSubTab === 'notifications' && <NotificationsCenter />}
                                {activeSubTab === 'gln-test' && <GLNTestPage />}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'payroll' && (
                    <div className="facility-tab-layout-container">
                        <div className="facility-tab-content-wrapper">
                            <div className="facility-tab-content">
                                <ConsolidatedPayroll />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'management' && (
                    <div className="facility-tab-layout-container">
                        <div className="facility-tab-content-wrapper">
                            <div className="facility-tab-content">
                                <AdminManagement />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboardContainer;

