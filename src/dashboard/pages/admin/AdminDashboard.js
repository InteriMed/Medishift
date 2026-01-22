import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { getUnverifiedUsersCount, getActiveShiftsCount, getMonthlyRevenue } from '../../../utils/adminUtils';
import { TrendingUp, Users, Calendar, DollarSign, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import PageHeader from '../../components/PageHeader/PageHeader';

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
      const usersRef = collection(db, 'users');
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

  const statCards = [
    {
      title: t('admin:dashboard.activeShifts', 'Active Shifts'),
      value: stats.activeShifts,
      icon: Calendar,
      color: 'var(--blue-3)',
      bgColor: 'var(--blue-1)'
    },
    {
      title: t('admin:dashboard.unverifiedUsers', 'Unverified Users'),
      value: stats.unverifiedUsers,
      icon: Users,
      color: 'var(--yellow-3)',
      bgColor: 'var(--yellow-1)'
    },
    {
      title: t('admin:dashboard.monthlyRevenue', 'Revenue This Month'),
      value: `CHF ${stats.monthlyRevenue.toLocaleString('de-CH')}`,
      icon: DollarSign,
      color: 'var(--green-4)',
      bgColor: 'var(--green-1)'
    },
    {
      title: t('admin:dashboard.pendingVerifications', 'Pending Verifications'),
      value: stats.pendingVerifications,
      icon: AlertCircle,
      color: 'var(--red-3)',
      bgColor: 'var(--red-1)'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PageHeader
        title={t('admin:dashboard.title', 'Admin Dashboard')}
        subtitle={t('admin:dashboard.subtitle', 'Overview of platform metrics and pending actions')}
        variant="default"
      />
      
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              style={{
                backgroundColor: 'var(--background-div-color)',
                borderRadius: 'var(--border-radius-md)',
                padding: 'var(--spacing-lg)',
                boxShadow: 'var(--shadow-sm)',
                border: '1px solid var(--grey-2)'
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: card.bgColor }}
                >
                  <Icon size={24} style={{ color: card.color }} />
                </div>
              </div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                {card.title}
              </h3>
              <p className="text-2xl font-bold" style={{ color: card.color }}>
                {card.value}
              </p>
            </div>
          );
        })}
      </div>

      <div style={{
        marginTop: 'var(--spacing-xl)',
        backgroundColor: 'var(--background-div-color)',
        borderRadius: 'var(--border-radius-md)',
        padding: 'var(--spacing-lg)',
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--grey-2)'
      }}>
        <h2 className="text-xl font-semibold mb-4">
          {t('admin:dashboard.quickActions', 'Quick Actions')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/dashboard/admin/verification"
            className="p-4 bg-primary/5 hover:bg-primary/10 rounded-lg border border-primary/20 transition-colors"
          >
            <h3 className="font-medium mb-1">
              {t('admin:dashboard.verifyUsers', 'Verify Users')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('admin:dashboard.verifyUsersDesc', 'Review and approve pending user verifications')}
            </p>
          </a>
          <a
            href="/dashboard/admin/shifts"
            className="p-4 bg-primary/5 hover:bg-primary/10 rounded-lg border border-primary/20 transition-colors"
          >
            <h3 className="font-medium mb-1">
              {t('admin:dashboard.manageShifts', 'Manage Shifts')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('admin:dashboard.manageShiftsDesc', 'View and manage all platform shifts')}
            </p>
          </a>
          <a
            href="/dashboard/admin/email"
            className="p-4 bg-primary/5 hover:bg-primary/10 rounded-lg border border-primary/20 transition-colors"
          >
            <h3 className="font-medium mb-1">
              {t('admin:dashboard.emailCenter', 'Email Center')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('admin:dashboard.emailCenterDesc', 'Send emails, respond to support, invite team members')}
            </p>
          </a>
        </div>
      </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

