import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import { FIRESTORE_COLLECTIONS } from '../../../../config/keysDatabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, TrendingUp, Users, Percent, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import ProtectedRoute from '../../components/ProtectedRoute';
import { PERMISSIONS } from '../../utils/rbac';
import DateField from '../../../../components/BoxedInputFields/DateField';
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
  }, [dateFrom, dateTo]);

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

  const COLORS = ['var(--primary-color)', 'var(--green-4)', 'var(--yellow-3)', 'var(--red-3)', 'var(--purple-4)'];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <div style={{ color: 'var(--text-light-color)', fontSize: 'var(--font-size-medium)' }}>{t('admin:finance.loadingRevenue', 'Loading revenue data...')}</div>
      </div>
    );
  }

  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_FINANCE}>
      <div style={{ padding: 'var(--spacing-xl)', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: 'var(--spacing-xl)' }}>
          <h1 style={{ 
            fontSize: 'var(--font-size-xxxlarge)', 
            fontWeight: 'var(--font-weight-large)', 
            color: 'var(--text-color)', 
            marginBottom: 0,
            letterSpacing: '-0.5px'
          }}>
            {t('admin:finance.revenue.title', 'Revenue & Margin Analysis')}
          </h1>
        </div>

        <div style={{ 
          backgroundColor: 'var(--background-div-color)', 
          borderRadius: 'var(--border-radius-md)', 
          padding: 'var(--spacing-lg)', 
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--grey-2)',
          marginBottom: 'var(--spacing-xl)'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'var(--spacing-md)',
            marginBottom: 'var(--spacing-md)'
          }}>
            <Calendar style={{ color: 'var(--primary-color)' }} size={20} />
            <h3 style={{ 
              fontSize: 'var(--font-size-medium)', 
              fontWeight: 'var(--font-weight-medium)', 
              color: 'var(--text-color)' 
            }}>
              {t('admin:finance.period', 'Period')}
            </h3>
          </div>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: 'var(--spacing-lg)'
          }}>
            <DateField
              label={t('admin:finance.from', 'From')}
              value={dateFrom}
              onChange={(date) => setDateFrom(date)}
              max={dateTo ? format(dateTo, 'yyyy-MM-dd') : undefined}
            />
            <DateField
              label={t('admin:finance.to', 'To')}
              value={dateTo}
              onChange={(date) => setDateTo(date)}
              min={dateFrom ? format(dateFrom, 'yyyy-MM-dd') : undefined}
            />
          </div>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: 'var(--spacing-lg)',
          marginBottom: 'var(--spacing-xl)'
        }}>
          <div style={{ 
            backgroundColor: 'var(--background-div-color)', 
            borderRadius: 'var(--border-radius-md)', 
            padding: 'var(--spacing-xl)', 
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--grey-2)',
            transition: 'var(--transition-normal)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ 
              position: 'absolute',
              top: 0,
              right: 0,
              width: '100px',
              height: '100px',
              background: 'linear-gradient(135deg, rgba(63, 139, 27, 0.15), transparent)',
              borderRadius: '0 0 0 100px'
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)', position: 'relative', zIndex: 1 }}>
              <div style={{ 
                backgroundColor: 'var(--green-1)', 
                borderRadius: 'var(--border-radius-sm)', 
                padding: 'var(--spacing-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <DollarSign style={{ color: 'var(--green-4)' }} size={20} />
              </div>
              <h3 style={{ 
                fontSize: 'var(--font-size-small)', 
                fontWeight: 'var(--font-weight-medium)', 
                color: 'var(--text-light-color)',
                margin: 0
              }}>
                {t('admin:finance.revenue.totalCommissions', 'Total Commissions')}
              </h3>
            </div>
            <p style={{ 
              fontSize: 'var(--font-size-xxxlarge)', 
              fontWeight: 'var(--font-weight-large)',
              color: 'var(--text-color)',
              margin: 0,
              position: 'relative',
              zIndex: 1
            }}>
              CHF {metrics.totalCommissions.toLocaleString('de-CH')}
            </p>
          </div>

          <div style={{ 
            backgroundColor: 'var(--background-div-color)', 
            borderRadius: 'var(--border-radius-md)', 
            padding: 'var(--spacing-xl)', 
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--grey-2)',
            transition: 'var(--transition-normal)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ 
              position: 'absolute',
              top: 0,
              right: 0,
              width: '100px',
              height: '100px',
              background: 'linear-gradient(135deg, rgba(0, 40, 77, 0.15), transparent)',
              borderRadius: '0 0 0 100px'
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)', position: 'relative', zIndex: 1 }}>
              <div style={{ 
                backgroundColor: 'var(--blue-1)', 
                borderRadius: 'var(--border-radius-sm)', 
                padding: 'var(--spacing-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <TrendingUp style={{ color: 'var(--blue-4)' }} size={20} />
              </div>
              <h3 style={{ 
                fontSize: 'var(--font-size-small)', 
                fontWeight: 'var(--font-weight-medium)', 
                color: 'var(--text-light-color)',
                margin: 0
              }}>
                {t('admin:finance.revenue.saasMRR', 'SaaS MRR')}
              </h3>
            </div>
            <p style={{ 
              fontSize: 'var(--font-size-xxxlarge)', 
              fontWeight: 'var(--font-weight-large)',
              color: 'var(--text-color)',
              margin: 0,
              position: 'relative',
              zIndex: 1
            }}>
              CHF {metrics.saasMRR.toLocaleString('de-CH')}
            </p>
          </div>

          <div style={{ 
            backgroundColor: 'var(--background-div-color)', 
            borderRadius: 'var(--border-radius-md)', 
            padding: 'var(--spacing-xl)', 
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--grey-2)',
            transition: 'var(--transition-normal)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ 
              position: 'absolute',
              top: 0,
              right: 0,
              width: '100px',
              height: '100px',
              background: 'linear-gradient(135deg, rgba(151, 0, 15, 0.15), transparent)',
              borderRadius: '0 0 0 100px'
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)', position: 'relative', zIndex: 1 }}>
              <div style={{ 
                backgroundColor: 'var(--red-1)', 
                borderRadius: 'var(--border-radius-sm)', 
                padding: 'var(--spacing-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Percent style={{ color: 'var(--red-4)' }} size={20} />
              </div>
              <h3 style={{ 
                fontSize: 'var(--font-size-small)', 
                fontWeight: 'var(--font-weight-medium)', 
                color: 'var(--text-light-color)',
                margin: 0
              }}>
                {t('admin:finance.revenue.churnRate', 'Churn Rate')}
              </h3>
            </div>
            <p style={{ 
              fontSize: 'var(--font-size-xxxlarge)', 
              fontWeight: 'var(--font-weight-large)',
              color: 'var(--text-color)',
              margin: 0,
              position: 'relative',
              zIndex: 1
            }}>
              {metrics.churnRate.toFixed(1)}%
            </p>
          </div>
        </div>

        <div style={{ 
          backgroundColor: 'var(--background-div-color)', 
          borderRadius: 'var(--border-radius-md)', 
          padding: 'var(--spacing-xl)', 
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--grey-2)'
        }}>
          <h2 style={{ 
            fontSize: 'var(--font-size-xlarge)', 
            fontWeight: 'var(--font-weight-medium)', 
            marginBottom: 'var(--spacing-lg)',
            color: 'var(--text-color)'
          }}>
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
            <div style={{ 
              textAlign: 'center', 
              padding: 'var(--spacing-xxl)', 
              color: 'var(--text-light-color)',
              fontSize: 'var(--font-size-medium)'
            }}>
              {t('admin:finance.revenue.noData', 'No data available for this period')}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default RevenueAnalysis;

