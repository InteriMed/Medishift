import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../services/services/firebase';
import { FIRESTORE_COLLECTIONS } from '../../../config/keysDatabase';
import { getUnverifiedUsersCount, getActiveShiftsCount, getMonthlyRevenue } from '../../../utils/adminUtils';
import { Calendar, DollarSign, AlertCircle, Users, CheckCircle, FileText } from 'lucide-react';
import { AdminPageHeader, StatCard, QuickActionCard } from '../components';

const AdminDashboard = () => {
  const { t } = useTranslation(['admin']);
  const [stats, setStats] = useState({
    activeShifts: 0,
    unverifiedUsers: 0,
    monthlyRevenue: 0,
    pendingVerifications: 0
  });
  const [loading, setLoading] = useState(true);
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const getPendingVerificationsCount = async () => {
    try {
      const usersRef = collection(db, FIRESTORE_COLLECTIONS.USERS);
      const q = query(usersRef, where('onboardingStatus', '==', 'pending_verification'));
      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error('Error getting pending verifications:', error);
      return 0;
    }
  };

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      try {
        const [activeShifts, unverifiedUsers, monthlyRevenue, pendingVerifications] = await Promise.all([
          getActiveShiftsCount(),
          getUnverifiedUsersCount(),
          getMonthlyRevenue(currentMonth, currentYear),
          getPendingVerificationsCount()
        ]);

        setStats({
          activeShifts,
          unverifiedUsers,
          monthlyRevenue,
          pendingVerifications
        });
      } catch (error) {
        console.error('Error loading admin stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [currentMonth, currentYear]);

  return (
    <div className="p-6 space-y-6">
      <AdminPageHeader
        title={t('admin:dashboard.title', 'Admin Dashboard')}
        subtitle={t('admin:dashboard.subtitle', 'Overview of platform metrics and pending actions')}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title={t('admin:dashboard.activeShifts', 'Active Shifts')}
          value={stats.activeShifts}
          icon={Calendar}
          color="var(--blue-3)"
          bgColor="var(--blue-1)"
          loading={loading}
        />
        <StatCard
          title={t('admin:dashboard.unverifiedUsers', 'Unverified Users')}
          value={stats.unverifiedUsers}
          icon={Users}
          color="var(--yellow-3)"
          bgColor="var(--yellow-1)"
          loading={loading}
        />
        <StatCard
          title={t('admin:dashboard.monthlyRevenue', 'Revenue This Month')}
          value={`CHF ${stats.monthlyRevenue.toLocaleString('de-CH')}`}
          icon={DollarSign}
          color="var(--green-4)"
          bgColor="var(--green-1)"
          loading={loading}
        />
        <StatCard
          title={t('admin:dashboard.pendingVerifications', 'Pending Verifications')}
          value={stats.pendingVerifications}
          icon={AlertCircle}
          color="var(--red-3)"
          bgColor="var(--red-1)"
          loading={loading}
          onClick={() => window.location.href = '/dashboard/admin/verification'}
        />
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">
          {t('admin:dashboard.quickActions', 'Quick Actions')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <QuickActionCard
            title={t('admin:dashboard.verifyUsers', 'Verify Users')}
            description={t('admin:dashboard.verifyUsersDesc', 'Review and approve pending user verifications')}
            href="/dashboard/admin/verification"
            icon={CheckCircle}
            badge={stats.pendingVerifications > 0 ? {
              text: `${stats.pendingVerifications} pending`,
              variant: 'error'
            } : null}
          />
          <QuickActionCard
            title={t('admin:dashboard.manageShifts', 'Manage Shifts')}
            description={t('admin:dashboard.manageShiftsDesc', 'View and manage all platform shifts')}
            href="/dashboard/admin/shifts"
            icon={Calendar}
          />
          <QuickActionCard
            title={t('admin:dashboard.userCRM', 'User CRM')}
            description={t('admin:dashboard.userCRMDesc', 'Manage users and view profiles')}
            href="/dashboard/admin/users"
            icon={Users}
          />
          <QuickActionCard
            title={t('admin:dashboard.financialReports', 'Financial Reports')}
            description={t('admin:dashboard.financialReportsDesc', 'View revenue and financial metrics')}
            href="/dashboard/admin/finance/revenue"
            icon={DollarSign}
          />
          <QuickActionCard
            title={t('admin:dashboard.auditLogs', 'Audit Logs')}
            description={t('admin:dashboard.auditLogsDesc', 'View system activity and changes')}
            href="/dashboard/admin/system/audit"
            icon={FileText}
          />
          <QuickActionCard
            title={t('admin:dashboard.debugTool', 'Debug: Account Creation')}
            description={t('admin:dashboard.debugToolDesc', 'Create accounts bypassing verification')}
            href="/dashboard/admin/debug/account-creation"
            icon={AlertCircle}
            variant="warning"
          />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;



