import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../services/services/firebase';
import { FIRESTORE_COLLECTIONS } from '../../../config/keysDatabase';
import {
  TrendingUp,
  Users,
  DollarSign,
  AlertCircle,
  Activity,
  Building2,
  UserPlus,
  Percent
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import '../../../styles/variables.css';

// Simple Sparkline component
const Sparkline = ({ data, color = '#2563eb', width = 100, height = 30 }) => {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1 || 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="sparkline">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const ExecutiveDashboard = () => {
  const { t } = useTranslation(['admin']);
  const [metrics, setMetrics] = useState({
    liveShifts: 0,
    urgentVacancies: 0,
    pendingVerifications: 0,
    gmv: 0,
    netRevenue: 0,
    fillRate: 0,
    newFacilities: 0,
    newProfessionals: 0,
    cac: 0
  });
  const [loading, setLoading] = useState(true);
  const [sparklineData, setSparklineData] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const [
        liveShifts,
        urgentVacancies,
        pendingVerifications,
        gmv,
        netRevenue,
        fillRate,
        newFacilities,
        newProfessionals
      ] = await Promise.all([
        getLiveShiftsCount(),
        getUrgentVacanciesCount(),
        getPendingVerificationsCount(),
        getGMV(startOfMonth, now),
        getNetRevenue(startOfMonth, now),
        getFillRate(startOfMonth, now),
        getNewSignupsCount('facility', startOfMonth, now),
        getNewSignupsCount('professional', startOfMonth, now)
      ]);

      setMetrics({
        liveShifts,
        urgentVacancies,
        pendingVerifications,
        gmv,
        netRevenue,
        fillRate,
        newFacilities,
        newProfessionals,
        cac: calculateCAC(newFacilities + newProfessionals)
      });

      loadSparklineData();
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLiveShiftsCount = async () => {
    try {
      const now = new Date();
      const shiftsRef = collection(db, FIRESTORE_COLLECTIONS.SHIFTS);
      const q = query(
        shiftsRef,
        where('startTime', '<=', now),
        where('endTime', '>=', now),
        where('status', '==', 'confirmed')
      );
      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error('Error getting live shifts:', error);
      return 0;
    }
  };

  const getUrgentVacanciesCount = async () => {
    try {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const shiftsRef = collection(db, FIRESTORE_COLLECTIONS.SHIFTS);
      const q = query(
        shiftsRef,
        where('date', '>=', now),
        where('date', '<=', tomorrow),
        where('status', '==', 'open')
      );
      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error('Error getting urgent vacancies:', error);
      return 0;
    }
  };

  const getPendingVerificationsCount = async () => {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const usersRef = collection(db, FIRESTORE_COLLECTIONS.USERS);
      const q = query(
        usersRef,
        where('onboardingStatus', '==', 'pending_verification')
      );
      const snapshot = await getDocs(q);

      let count = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate?.() || data.createdAt;
        if (createdAt && createdAt < yesterday) {
          count++;
        }
      });

      return count;
    } catch (error) {
      console.error('Error getting pending verifications:', error);
      return 0;
    }
  };

  const getGMV = async (startDate, endDate) => {
    try {
      const shiftsRef = collection(db, FIRESTORE_COLLECTIONS.SHIFTS);
      const q = query(
        shiftsRef,
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        where('status', 'in', ['confirmed', 'completed'])
      );
      const snapshot = await getDocs(q);

      let total = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        total += (data.actualCost || data.estimatedCost || 0);
      });

      return total;
    } catch (error) {
      console.error('Error getting GMV:', error);
      return 0;
    }
  };

  const getNetRevenue = async (startDate, endDate) => {
    const gmv = await getGMV(startDate, endDate);
    const commissionRate = 0.15;
    const saasFees = await getSaaSFees(startDate, endDate);
    return (gmv * commissionRate) + saasFees;
  };

  const getSaaSFees = async (startDate, endDate) => {
    try {
      const facilitiesRef = collection(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES);
      const snapshot = await getDocs(facilitiesRef);

      let total = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        const subscription = data.subscription || {};
        if (subscription.active && subscription.monthlyFee) {
          total += subscription.monthlyFee;
        }
      });

      return total;
    } catch (error) {
      console.error('Error getting SaaS fees:', error);
      return 0;
    }
  };

  const getFillRate = async (startDate, endDate) => {
    try {
      const shiftsRef = collection(db, FIRESTORE_COLLECTIONS.SHIFTS);
      const q = query(
        shiftsRef,
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      );
      const snapshot = await getDocs(q);

      let total = 0;
      let filled = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        total++;
        if (['filled', 'confirmed', 'completed'].includes(data.status)) {
          filled++;
        }
      });

      return total > 0 ? (filled / total) * 100 : 0;
    } catch (error) {
      console.error('Error getting fill rate:', error);
      return 0;
    }
  };

  const getNewSignupsCount = async (type, startDate, endDate) => {
    try {
      const usersRef = collection(db, FIRESTORE_COLLECTIONS.USERS);
      const q = query(
        usersRef,
        where('roles', 'array-contains', type === 'facility' ? 'facility' : 'professional')
      );
      const snapshot = await getDocs(q);

      let count = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate?.() || data.createdAt;
        if (createdAt && createdAt >= startDate && createdAt <= endDate) {
          count++;
        }
      });

      return count;
    } catch (error) {
      console.error('Error getting new signups:', error);
      return 0;
    }
  };

  const calculateCAC = (newSignups) => {
    const marketingSpend = 5000;
    return newSignups > 0 ? marketingSpend / newSignups : 0;
  };

  const loadSparklineData = async () => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const revenue = await getNetRevenue(startOfDay, endOfDay);
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: revenue
      });
    }
    setSparklineData(data);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground mb-0">
          {t('admin:executive.title', 'Executive Dashboard')}
        </h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard
          title={t('admin:executive.liveShifts', 'Live Shifts')}
          value={metrics.liveShifts}
          icon={Activity}
          color="green"
          trend={sparklineData}
        />
        <MetricCard
          title={t('admin:executive.urgentVacancies', 'Urgent Vacancies')}
          value={metrics.urgentVacancies}
          icon={AlertCircle}
          color="red"
          urgent={metrics.urgentVacancies > 0}
        />
        <MetricCard
          title={t('admin:executive.pendingVerifications', 'Pending Verifications')}
          value={metrics.pendingVerifications}
          icon={Users}
          color="yellow"
          urgent={metrics.pendingVerifications > 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow">
          <h2 className="text-lg font-semibold mb-4 text-foreground">
            {t('admin:executive.financialPulse', 'Financial Pulse (MTD)')}
          </h2>
          <div className="flex flex-col gap-4">
            <FinancialMetric
              label={t('admin:executive.gmv', 'GMV')}
              value={`CHF ${metrics.gmv.toLocaleString('de-CH')}`}
              icon={DollarSign}
            />
            <FinancialMetric
              label={t('admin:executive.netRevenue', 'Net Revenue')}
              value={`CHF ${metrics.netRevenue.toLocaleString('de-CH')}`}
              icon={TrendingUp}
            />
            <FinancialMetric
              label={t('admin:executive.fillRate', 'Fill Rate')}
              value={`${metrics.fillRate.toFixed(1)}%`}
              icon={Percent}
            />
          </div>
          {sparklineData.length > 0 && (
            <div className="mt-4">
              <ResponsiveContainer width="100%" height={100}>
                <LineChart data={sparklineData}>
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow">
          <h2 className="text-lg font-semibold mb-4 text-foreground">
            {t('admin:executive.growth', 'Growth Metrics')}
          </h2>
          <div className="flex flex-col gap-4">
            <GrowthMetric
              label={t('admin:executive.newFacilities', 'New Facilities')}
              value={metrics.newFacilities}
              icon={Building2}
            />
            <GrowthMetric
              label={t('admin:executive.newProfessionals', 'New Professionals')}
              value={metrics.newProfessionals}
              icon={UserPlus}
            />
            <GrowthMetric
              label={t('admin:executive.cac', 'CAC (Est.)')}
              value={`CHF ${metrics.cac.toFixed(0)}`}
              icon={DollarSign}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, icon: Icon, color, urgent, trend }) => {
  const colorClasses = {
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    blue: 'bg-blue-50 text-blue-600'
  };

  return (
    <div
      className={`bg-card p-6 rounded-xl border border-border hover:shadow-md transition-shadow ${urgent ? 'ring-2 ring-red-300' : ''}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${colorClasses[color] || colorClasses.blue}`}>
          <Icon size={24} />
        </div>
        {trend && trend.length > 0 && (
          <div className="w-20 h-10">
            <Sparkline data={trend.map(d => d.revenue)} color="hsl(var(--primary))" />
          </div>
        )}
      </div>
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-1">{title}</h3>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
};

const FinancialMetric = ({ label, value, icon: Icon }) => (
  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
    <div className="flex items-center gap-4">
      <Icon size={20} className="text-muted-foreground" />
      <span className="font-medium text-sm text-foreground">{label}</span>
    </div>
    <span className="font-semibold text-lg text-foreground">{value}</span>
  </div>
);

const GrowthMetric = ({ label, value, icon: Icon }) => (
  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
    <div className="flex items-center gap-4">
      <Icon size={20} className="text-muted-foreground" />
      <span className="font-medium text-sm text-foreground">{label}</span>
    </div>
    <span className="font-semibold text-lg text-foreground">{value}</span>
  </div>
);

export default ExecutiveDashboard;

