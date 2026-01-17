import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import {
  TrendingUp,
  Users,
  Calendar,
  DollarSign,
  AlertCircle,
  Activity,
  Building2,
  UserPlus,
  Percent
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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
  }, []);

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
      const shiftsRef = collection(db, 'shifts');
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

      const shiftsRef = collection(db, 'shifts');
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

      const usersRef = collection(db, 'users');
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
      const shiftsRef = collection(db, 'shifts');
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
      const facilitiesRef = collection(db, 'facilityProfiles');
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
      const shiftsRef = collection(db, 'shifts');
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
      const usersRef = collection(db, 'users');
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '256px' }}>
        <div style={{ color: 'var(--text-light-color)' }}>Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--spacing-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h1 style={{ fontSize: 'var(--font-size-xxxlarge)', fontWeight: 'var(--font-weight-large)', color: 'var(--text-color)', marginBottom: 0 }}>
          {t('admin:executive.title', 'Executive Dashboard')}
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-lg)' }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--spacing-lg)' }}>
        <div style={{ backgroundColor: 'var(--background-div-color)', borderRadius: 'var(--border-radius-md)', padding: 'var(--spacing-lg)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--grey-2)' }}>
          <h2 style={{ fontSize: 'var(--font-size-large)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--spacing-md)' }}>
            {t('admin:executive.financialPulse', 'Financial Pulse (MTD)')}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
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
            <div style={{ marginTop: 'var(--spacing-md)' }}>
              <ResponsiveContainer width="100%" height={100}>
                <LineChart data={sparklineData}>
                  <Line type="monotone" dataKey="revenue" stroke="var(--primary-color)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div style={{ backgroundColor: 'var(--background-div-color)', borderRadius: 'var(--border-radius-md)', padding: 'var(--spacing-lg)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--grey-2)' }}>
          <h2 style={{ fontSize: 'var(--font-size-large)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--spacing-md)' }}>
            {t('admin:executive.growth', 'Growth Metrics')}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
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
  const colorStyles = {
    green: { backgroundColor: 'var(--green-1)', color: 'var(--green-4)' },
    red: { backgroundColor: 'var(--red-1)', color: 'var(--red-4)' },
    yellow: { backgroundColor: 'var(--yellow-1)', color: 'var(--yellow-4)' },
    blue: { backgroundColor: 'var(--blue-1)', color: 'var(--blue-4)' }
  };

  return (
    <div style={{
      backgroundColor: 'var(--background-div-color)',
      borderRadius: 'var(--border-radius-md)',
      padding: 'var(--spacing-lg)',
      boxShadow: 'var(--shadow-sm)',
      border: '1px solid var(--grey-2)',
      ...(urgent && { boxShadow: '0 0 0 2px var(--red-3)' })
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-md)' }}>
        <div style={{ padding: 'var(--spacing-md)', borderRadius: 'var(--border-radius-sm)', ...colorStyles[color] }}>
          <Icon size={24} />
        </div>
        {trend && trend.length > 0 && (
          <div style={{ width: '80px', height: '40px' }}>
            <Sparkline data={trend.map(d => d.revenue)} color="var(--primary-color)" />
          </div>
        )}
      </div>
      <h3 style={{ fontSize: 'var(--font-size-small)', fontWeight: 'var(--font-weight-medium)', color: 'var(--text-light-color)', marginBottom: 'var(--spacing-xs)' }}>{title}</h3>
      <p style={{ fontSize: 'var(--font-size-xxxlarge)', fontWeight: 'var(--font-weight-large)', color: 'var(--text-color)' }}>{value}</p>
    </div>
  );
};

const FinancialMetric = ({ label, value, icon: Icon }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--spacing-md)', backgroundColor: 'var(--grey-1)', borderRadius: 'var(--border-radius-sm)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
      <Icon size={20} style={{ color: 'var(--text-light-color)' }} />
      <span style={{ fontWeight: 'var(--font-weight-medium)', fontSize: 'var(--font-size-medium)' }}>{label}</span>
    </div>
    <span style={{ fontWeight: 'var(--font-weight-large)', fontSize: 'var(--font-size-large)' }}>{value}</span>
  </div>
);

const GrowthMetric = ({ label, value, icon: Icon }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--spacing-md)', backgroundColor: 'var(--grey-1)', borderRadius: 'var(--border-radius-sm)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
      <Icon size={20} style={{ color: 'var(--text-light-color)' }} />
      <span style={{ fontWeight: 'var(--font-weight-medium)', fontSize: 'var(--font-size-medium)' }}>{label}</span>
    </div>
    <span style={{ fontWeight: 'var(--font-weight-large)', fontSize: 'var(--font-size-large)' }}>{value}</span>
  </div>
);

export default ExecutiveDashboard;

