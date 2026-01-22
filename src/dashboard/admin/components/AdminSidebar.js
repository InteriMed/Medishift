import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
    ChevronLeft,
    ChevronRight,
    Mail
} from 'lucide-react';
import { cn } from '../../../utils/cn';
import { useAuth } from '../../../contexts/AuthContext';
import { hasPermission, PERMISSIONS } from '../utils/rbac';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import '../../../styles/variables.css';

const AdminSidebar = ({ collapsed = false, onToggleCollapse }) => {
    const { t } = useTranslation(['admin']);
    const location = useLocation();
    const { userProfile } = useAuth();
    const [pendingCount, setPendingCount] = useState(0);
    const [urgentCount, setUrgentCount] = useState(0);

    const userRoles = userProfile?.roles || [];

    // Load badge counts
    useEffect(() => {
        const loadBadgeCounts = async () => {
            try {
                // Pending verifications count
                const usersRef = collection(db, 'users');
                const pendingQuery = query(usersRef, where('onboardingStatus', '==', 'pending_verification'));
                const pendingSnapshot = await getDocs(pendingQuery);
                setPendingCount(pendingSnapshot.size);

                // Urgent vacancies (shifts starting in <24h with no candidate)
                const shiftsRef = collection(db, 'shifts');
                const tomorrow = new Date();
                tomorrow.setHours(tomorrow.getHours() + 24);

                // Query only by status to avoid index requirement
                const urgentQuery = query(
                    shiftsRef,
                    where('status', '==', 'open')
                );

                const urgentSnapshot = await getDocs(urgentQuery);

                // Filter locally for date
                const urgentCount = urgentSnapshot.docs.filter(doc => {
                    const data = doc.data();
                    if (!data.startTime) return false;
                    // Handle both Firestore Timestamp and regular Date objects/strings if generic
                    const shiftDate = data.startTime.toDate ? data.startTime.toDate() : new Date(data.startTime);
                    return shiftDate <= tomorrow;
                }).length;

                setUrgentCount(urgentCount);
            } catch (error) {
                console.error('Error loading badge counts:', error);
            }
        };

        loadBadgeCounts();
        // Refresh every 30 seconds
        const interval = setInterval(loadBadgeCounts, 30000);
        return () => clearInterval(interval);
    }, []);

    // Define sidebar structure
    const sidebarItems = [
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
            permission: PERMISSIONS.VERIFY_USERS,
            badge: pendingCount > 0 ? pendingCount : null,
            badgeColor: 'red'
        },
        {
            title: t('admin:sidebar.shiftList', 'Shift List'),
            icon: Calendar,
            path: '/dashboard/admin/operations/shifts',
            permission: PERMISSIONS.MANAGE_SHIFTS,
            badge: urgentCount > 0 ? urgentCount : null,
            badgeColor: 'orange'
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
            title: t('admin:sidebar.emailCenter', 'Email Center'),
            icon: Mail,
            path: '/dashboard/admin/email',
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

    const renderMenuItem = (item) => {
        if (item.permission && !hasPermission(userRoles, item.permission)) {
            return null;
        }

        // Single menu item
        const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');

        return (
            <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                    "group relative flex items-center justify-between p-2 rounded-lg transition-colors mb-1",
                    isActive
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                    collapsed && "justify-center"
                )}
            >
                <div className={cn(
                    "flex items-center min-w-0",
                    collapsed ? "w-full justify-center" : "gap-2 flex-1"
                )}>
                    {item.icon && <item.icon className="w-5 h-5 shrink-0" />}
                    {!collapsed && (
                        <span className="font-medium text-sm truncate">{item.title}</span>
                    )}
                </div>
                {!collapsed && item.badge && (
                    <span
                        style={{
                            padding: 'var(--spacing-xs) var(--spacing-sm)',
                            borderRadius: 'var(--border-radius)',
                            fontSize: 'var(--font-size-small)',
                            fontWeight: 'var(--font-weight-medium)',
                            flexShrink: 0,
                            backgroundColor: item.badgeColor === 'red' ? 'var(--red-3)' : item.badgeColor === 'orange' ? 'var(--yellow-3)' : 'var(--grey-3)',
                            color: 'var(--white)'
                        }}
                    >
                        {item.badge}
                    </span>
                )}
                {/* Tooltip for collapsed mode */}
                {collapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap border border-border">
                        {item.title}
                        {item.badge && ` (${item.badge})`}
                    </div>
                )}
            </NavLink>
        );
    };

    return (
        <div className={cn(
            "h-full bg-sidebar border-r border-border flex flex-col shadow-xl",
            collapsed ? "w-[70px]" : "w-64"
        )}>
            {/* Header */}
            <div className="h-16 flex items-center justify-center border-b border-border px-3 bg-sidebar">
                <button
                    onClick={onToggleCollapse}
                    className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground hover:text-sidebar-foreground"
                    title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                >
                    {collapsed ? (
                        <ChevronRight className="w-5 h-5" />
                    ) : (
                        <ChevronLeft className="w-5 h-5" />
                    )}
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2">
                {sidebarItems.map(item => renderMenuItem(item))}
            </nav>

            {/* Footer */}
            <div className="border-t border-border p-2">
                <div className={cn(
                    "flex flex-col gap-1 items-center justify-center p-2 text-xs text-muted-foreground opacity-50",
                    collapsed ? "hidden" : "block"
                )}>
                    <span>v2.4.0</span>
                    <span>Admin Portal</span>
                </div>
            </div>
        </div>
    );
};

export default AdminSidebar;
