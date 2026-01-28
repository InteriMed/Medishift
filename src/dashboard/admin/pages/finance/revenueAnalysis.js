import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../../services/services/firebase';
import { FIRESTORE_COLLECTIONS } from '../../../../config/keysDatabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, Percent } from 'lucide-react';
import ProtectedRoute from '../../components/protectedRoute';
import { PERMISSIONS } from '../../utils/rbac';
import PageHeader from '../../../shared/components/titles/PageHeader';
import FilterBar from '../../../pages/marketplace/components/filterbar';
import '../../../../styles/variables.css';

const RevenueAnalysis = () => {
  const { t } = useTranslation(['admin']);
  const [metrics, setMetrics] = useState({
    totalCommissions: 0,
    saasMRR: 0,
    churnRate: 0,
    marginByProfession: []
  });
  const [loading, setLoading] = useState(true);
  const getFirstDayOfMonth = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  };
  const getLastDayOfMonth = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  };
  const [dateFrom, setDateFrom] = useState(getFirstDayOfMonth());
  const [dateTo, setDateTo] = useState(getLastDayOfMonth());

  useEffect(() => {
    if (dateFrom && dateTo) {
      loadRevenueData();
    }
  }, [dateFrom, dateTo, loadRevenueData]);

  const loadRevenueData = async () => {
    if (!dateFrom || !dateTo) return;
    setLoading(true);
    try {
      const startDate = new Date(dateFrom);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);

      const [commissions, saas, marginData, churn] = await Promise.all([
        getCommissions(startDate, endDate),
        getSaaSMRR(),
        getMarginByProfession(startDate, endDate),
        getChurnRate(startDate, endDate)
      ]);

      setMetrics({
        totalCommissions: commissions,
        saasMRR: saas,
        churnRate: churn,
        marginByProfession: marginData
      });
    } catch (error) {
      console.error('Error loading revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCommissions = async (startDate, endDate) => {
    try {
      const shiftsRef = collection(db, 'shifts');
      const q = query(
        shiftsRef,
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        where('status', 'in', ['confirmed', 'completed'])
      );
      const snapshot = await getDocs(q);

      let totalCommissions = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        const clientRate = data.hourlyRate || 0;
        const workerRate = data.workerHourlyRate || 0;
        const socialCharges = workerRate * 0.15;
        const spsFee = workerRate * 0.05;
        const commission = clientRate - workerRate - socialCharges - spsFee;
        totalCommissions += Math.max(0, commission * (data.duration || 8));
      });

      return totalCommissions;
    } catch (error) {
      console.error('Error getting commissions:', error);
      return 0;
    }
  };

  const getSaaSMRR = async () => {
    try {
      const facilitiesRef = collection(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES);
      const snapshot = await getDocs(facilitiesRef);

      let totalMRR = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        const subscription = data.subscription || {};
        if (subscription.active && subscription.monthlyFee) {
          totalMRR += subscription.monthlyFee;
        }
      });

      return totalMRR;
    } catch (error) {
      console.error('Error getting SaaS MRR:', error);
      return 0;
    }
  };

  const getMarginByProfession = async (startDate, endDate) => {
    try {
      const shiftsRef = collection(db, 'shifts');
      const q = query(
        shiftsRef,
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        where('status', 'in', ['confirmed', 'completed'])
      );
      const snapshot = await getDocs(q);

      const professionMargins = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        const profession = data.role || 'Unknown';
        const clientRate = data.hourlyRate || 0;
        const workerRate = data.workerHourlyRate || 0;
        const socialCharges = workerRate * 0.15;
        const spsFee = workerRate * 0.05;
        const margin = clientRate - workerRate - socialCharges - spsFee;
        const duration = data.duration || 8;

        if (!professionMargins[profession]) {
          professionMargins[profession] = 0;
        }
        professionMargins[profession] += Math.max(0, margin * duration);
      });

      return Object.entries(professionMargins).map(([name, value]) => ({
        name,
        margin: value
      }));
    } catch (error) {
      console.error('Error getting margin by profession:', error);
      return [];
    }
  };

  const getChurnRate = async (month, year) => {
    try {
      const facilitiesRef = collection(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES);
      const snapshot = await getDocs(facilitiesRef);

      let activeAtStart = 0;
      let churned = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        const subscription = data.subscription || {};
        const createdAt = data.createdAt?.toDate?.() || data.createdAt;

        if (createdAt && createdAt < new Date(year, month - 1, 1)) {
          activeAtStart++;
          if (!subscription.active) {
            churned++;
          }
        }
      });

      return activeAtStart > 0 ? (churned / activeAtStart) * 100 : 0;
    } catch (error) {
      console.error('Error getting churn rate:', error);
      return 0;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground text-sm">{t('admin:finance.loadingRevenue', 'Loading revenue data...')}</div>
      </div>
    );
  }

  const handleFilterChange = (key, value) => {
    if (key === 'fromDate') {
      setDateFrom(value ? new Date(value) : getFirstDayOfMonth());
    } else if (key === 'toDate') {
      setDateTo(value ? new Date(value) : getLastDayOfMonth());
    }
  };

  const filterBarDateFields = [
    {
      key: 'fromDate',
      label: t('admin:finance.from', 'From')
    },
    {
      key: 'toDate',
      label: t('admin:finance.to', 'To')
    }
  ];

  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_FINANCE}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <PageHeader
          title={t('admin:finance.revenue.title', 'Revenue & Margin Analysis')}
          subtitle={t('admin:finance.revenue.description', 'Analyze revenue, commissions, and margins')}
        />
        
        <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-lg)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
            <FilterBar
              filters={{
                fromDate: dateFrom ? dateFrom.toISOString().split('T')[0] : null,
                toDate: dateTo ? dateTo.toISOString().split('T')[0] : null
              }}
              onFilterChange={handleFilterChange}
              dateFields={filterBarDateFields}
              translationNamespace="admin"
              title={t('admin:finance.period', 'Period')}
              description={t('admin:finance.periodDescription', 'Select date range for revenue analysis')}
              onRefresh={loadRevenueData}
              isLoading={loading}
            />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-100/50 to-transparent rounded-bl-full" />
            <div className="flex items-center gap-4 mb-4 relative z-10">
              <div className="p-2 bg-green-50 rounded-lg flex items-center justify-center">
                <DollarSign className="text-green-600" size={20} />
              </div>
              <h3 className="text-xs font-medium text-muted-foreground m-0">
                {t('admin:finance.revenue.totalCommissions', 'Total Commissions')}
              </h3>
            </div>
            <p className="text-3xl font-semibold text-foreground m-0 relative z-10">
              CHF {metrics.totalCommissions.toLocaleString('de-CH')}
            </p>
          </div>

          <div className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-100/50 to-transparent rounded-bl-full" />
            <div className="flex items-center gap-4 mb-4 relative z-10">
              <div className="p-2 bg-blue-50 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-blue-600" size={20} />
              </div>
              <h3 className="text-xs font-medium text-muted-foreground m-0">
                {t('admin:finance.revenue.saasMRR', 'SaaS MRR')}
              </h3>
            </div>
            <p className="text-3xl font-semibold text-foreground m-0 relative z-10">
              CHF {metrics.saasMRR.toLocaleString('de-CH')}
            </p>
          </div>

          <div className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-red-100/50 to-transparent rounded-bl-full" />
            <div className="flex items-center gap-4 mb-4 relative z-10">
              <div className="p-2 bg-red-50 rounded-lg flex items-center justify-center">
                <Percent className="text-red-600" size={20} />
              </div>
              <h3 className="text-xs font-medium text-muted-foreground m-0">
                {t('admin:finance.revenue.churnRate', 'Churn Rate')}
              </h3>
            </div>
            <p className="text-3xl font-semibold text-foreground m-0 relative z-10">
              {metrics.churnRate.toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow">
          <h2 className="text-xl font-semibold mb-6 text-foreground">
            {t('admin:finance.revenue.marginByProfession', 'Margin by Profession')}
          </h2>
          {metrics.marginByProfession.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={metrics.marginByProfession}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--grey-2)" />
                <XAxis dataKey="name" stroke="var(--text-light-color)" />
                <YAxis stroke="var(--text-light-color)" />
                <Tooltip 
                  formatter={(value) => `CHF ${value.toLocaleString('de-CH')}`}
                  contentStyle={{
                    backgroundColor: 'var(--background-div-color)',
                    border: '1px solid var(--grey-2)',
                    borderRadius: 'var(--border-radius-sm)'
                  }}
                />
                <Legend />
                <Bar dataKey="margin" fill="var(--primary-color)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {t('admin:finance.revenue.noData', 'No data available for this period')}
            </div>
          )}
        </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default RevenueAnalysis;

