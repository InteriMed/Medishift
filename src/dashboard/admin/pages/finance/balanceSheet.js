import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../../services/services/firebase';
import { FIRESTORE_COLLECTIONS } from '../../../../config/keysDatabase';
import { TrendingUp, TrendingDown, Calculator, Calendar } from 'lucide-react';
import ProtectedRoute from '../../components/protectedRoute';
import { PERMISSIONS } from '../../utils/rbac';
import dateField from '../../../../components/boxedInputFields/dateField';
import { format } from 'date-fns';
import '../../../../styles/variables.css';

const BalanceSheet = () => {
  const { t } = useTranslation(['admin']);
  const [pnl, setPnl] = useState({
    revenues: 0,
    directCosts: 0,
    grossProfit: 0,
    fixedCosts: 0,
    netProfit: 0
  });
  const [loading, setLoading] = useState(true);
  const [fixedCostsList, setFixedCostsList] = useState([]);
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
      loadPnlData();
    }
  }, [dateFrom, dateTo, loadPnlData]);

  const loadPnlData = async () => {
    if (!dateFrom || !dateTo) return;
    setLoading(true);
    try {
      const startDate = new Date(dateFrom);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);

      const [revenues, directCosts, fixedCostsData] = await Promise.all([
        getRevenues(startDate, endDate),
        getDirectCosts(startDate, endDate),
        getFixedCosts(startDate, endDate)
      ]);

      const fixedCostsTotal = fixedCostsData.reduce((sum, cost) => sum + (cost.amount || 0), 0);
      const grossProfit = revenues - directCosts;
      const netProfit = grossProfit - fixedCostsTotal;

      setFixedCostsList(fixedCostsData);
      setPnl({
        revenues,
        directCosts,
        grossProfit,
        fixedCosts: fixedCostsTotal,
        netProfit
      });
    } catch (error) {
      console.error('Error loading P&L data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRevenues = async (startDate, endDate) => {
    try {
      const shiftsRef = collection(db, 'shifts');
      const q = query(
        shiftsRef,
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        where('status', 'in', ['confirmed', 'completed'])
      );
      const snapshot = await getDocs(q);

      let commissions = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        const clientRate = data.hourlyRate || 0;
        const workerRate = data.workerHourlyRate || 0;
        const socialCharges = workerRate * 0.15;
        const spsFee = workerRate * 0.05;
        const commission = clientRate - workerRate - socialCharges - spsFee;
        commissions += Math.max(0, commission * (data.duration || 8));
      });

      const facilitiesRef = collection(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES);
      const facilitiesSnapshot = await getDocs(facilitiesRef);
      let saasMRR = 0;
      facilitiesSnapshot.forEach((doc) => {
        const data = doc.data();
        const subscription = data.subscription || {};
        if (subscription.active && subscription.monthlyFee) {
          saasMRR += subscription.monthlyFee;
        }
      });

      return commissions + saasMRR;
    } catch (error) {
      console.error('Error getting revenues:', error);
      return 0;
    }
  };

  const getDirectCosts = async (startDate, endDate) => {
    try {
      const [referrals, serverCosts, smsCosts] = await Promise.all([
        getReferralCosts(startDate, endDate),
        getServerCosts(startDate, endDate),
        getSMSCosts(startDate, endDate)
      ]);

      return referrals + serverCosts + smsCosts;
    } catch (error) {
      console.error('Error getting direct costs:', error);
      return 0;
    }
  };

  const getReferralCosts = async (startDate, endDate) => {
    try {
      const referralsRef = collection(db, 'referrals');
      const q = query(
        referralsRef,
        where('claimedAt', '>=', startDate),
        where('claimedAt', '<=', endDate)
      );
      const snapshot = await getDocs(q);

      let total = 0;
      snapshot.forEach(() => {
        total += 50;
      });

      return total;
    } catch (error) {
      console.error('Error getting referral costs:', error);
      return 0;
    }
  };

  const getServerCosts = async (startDate, endDate) => {
    try {
      const costsRef = collection(db, 'operationalCosts');
      const snapshot = await getDocs(costsRef);

      let total = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.type === 'server') {
          const costDate = data.date?.toDate?.() || (data.month && data.year ? new Date(data.year, data.month - 1, 1) : null);
          if (costDate && costDate >= startDate && costDate <= endDate) {
            total += data.amount || 0;
          }
        }
      });

      return total;
    } catch (error) {
      console.error('Error getting server costs:', error);
      return 0;
    }
  };

  const getSMSCosts = async (startDate, endDate) => {
    try {
      const costsRef = collection(db, 'operationalCosts');
      const snapshot = await getDocs(costsRef);

      let total = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.type === 'sms') {
          const costDate = data.date?.toDate?.() || (data.month && data.year ? new Date(data.year, data.month - 1, 1) : null);
          if (costDate && costDate >= startDate && costDate <= endDate) {
            total += data.amount || 0;
          }
        }
      });

      return total;
    } catch (error) {
      console.error('Error getting SMS costs:', error);
      return 0;
    }
  };

  const getFixedCosts = async (startDate, endDate) => {
    try {
      const costsRef = collection(db, 'operationalCosts');
      const snapshot = await getDocs(costsRef);

      const fixedCosts = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const costType = data.type || '';
        if (costType !== 'server' && costType !== 'sms') {
          const costDate = data.date?.toDate?.() || (data.month && data.year ? new Date(data.year, data.month - 1, 1) : null);
          if (costDate && costDate >= startDate && costDate <= endDate) {
            fixedCosts.push({
              id: doc.id,
              name: data.name || data.description || costType || 'Fixed Cost',
              type: costType || 'fixed',
              amount: data.amount || 0,
              date: costDate,
              description: data.description || ''
            });
          }
        }
      });

      return fixedCosts.sort((a, b) => b.date - a.date);
    } catch (error) {
      console.error('Error getting fixed costs:', error);
      return [];
    }
  };


  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <div style={{ color: 'var(--text-light-color)', fontSize: 'var(--font-size-medium)' }}>Loading P&L data...</div>
      </div>
    );
  }

  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_BALANCE_SHEET}>
      <div style={{ padding: 'var(--spacing-xl)', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: 'var(--spacing-xl)' }}>
          <h1 style={{ 
            fontSize: 'var(--font-size-xxxlarge)', 
            fontWeight: 'var(--font-weight-large)', 
            color: 'var(--text-color)', 
            marginBottom: 0,
            letterSpacing: '-0.5px'
          }}>
            {t('admin:finance.balanceSheet.title', 'Balance Sheet (P&L Snapshot)')}
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
            <dateField
              label={t('admin:finance.from', 'From')}
              value={dateFrom}
              onChange={(date) => setDateFrom(date)}
              max={dateTo ? format(dateTo, 'yyyy-MM-dd') : undefined}
            />
            <dateField
              label={t('admin:finance.to', 'To')}
              value={dateTo}
              onChange={(date) => setDateTo(date)}
              min={dateFrom ? format(dateFrom, 'yyyy-MM-dd') : undefined}
            />
          </div>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
          gap: 'var(--spacing-lg)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            <div style={{ 
              backgroundColor: 'var(--background-div-color)', 
              borderRadius: 'var(--border-radius-md)', 
              padding: 'var(--spacing-xl)', 
              boxShadow: 'var(--shadow-sm)',
              border: '1px solid var(--grey-2)'
            }}>
              <h2 style={{ 
                fontSize: 'var(--font-size-large)', 
                fontWeight: 'var(--font-weight-medium)', 
                marginBottom: 'var(--spacing-lg)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-sm)',
                color: 'var(--text-color)'
              }}>
                <TrendingUp style={{ color: 'var(--green-4)' }} size={20} />
                {t('admin:finance.balanceSheet.revenues', 'Revenues')}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-light-color)', fontSize: 'var(--font-size-medium)' }}>
                    {t('admin:finance.balanceSheet.commissions', 'Commissions')}
                  </span>
                  <span style={{ fontWeight: 'var(--font-weight-medium)', fontSize: 'var(--font-size-medium)' }}>
                    CHF {pnl.revenues.toLocaleString('de-CH')}
                  </span>
                </div>
                <div style={{ 
                  paddingTop: 'var(--spacing-md)', 
                  borderTop: '1px solid var(--grey-2)', 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  fontWeight: 'var(--font-weight-large)',
                  fontSize: 'var(--font-size-large)'
                }}>
                  <span>{t('admin:finance.balanceSheet.totalRevenues', 'Total Revenues')}</span>
                  <span style={{ color: 'var(--green-4)' }}>
                    CHF {pnl.revenues.toLocaleString('de-CH')}
                  </span>
                </div>
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
                fontSize: 'var(--font-size-large)', 
                fontWeight: 'var(--font-weight-medium)', 
                marginBottom: 'var(--spacing-lg)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-sm)',
                color: 'var(--text-color)'
              }}>
                <TrendingDown style={{ color: 'var(--red-4)' }} size={20} />
                {t('admin:finance.balanceSheet.directCosts', 'Direct Costs')}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-light-color)', fontSize: 'var(--font-size-medium)' }}>
                    {t('admin:finance.balanceSheet.referralBonuses', 'Referral Bonuses')}
                  </span>
                  <span style={{ fontWeight: 'var(--font-weight-medium)', fontSize: 'var(--font-size-medium)' }}>
                    CHF {pnl.directCosts.toLocaleString('de-CH')}
                  </span>
                </div>
                <div style={{ 
                  paddingTop: 'var(--spacing-md)', 
                  borderTop: '1px solid var(--grey-2)', 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  fontWeight: 'var(--font-weight-large)',
                  fontSize: 'var(--font-size-large)'
                }}>
                  <span>{t('admin:finance.balanceSheet.totalDirectCosts', 'Total Direct Costs')}</span>
                  <span style={{ color: 'var(--red-4)' }}>
                    CHF {pnl.directCosts.toLocaleString('de-CH')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            <div style={{ 
              backgroundColor: 'var(--background-div-color)', 
              borderRadius: 'var(--border-radius-md)', 
              padding: 'var(--spacing-xl)', 
              boxShadow: 'var(--shadow-sm)',
              border: '1px solid var(--grey-2)'
            }}>
              <h2 style={{ 
                fontSize: 'var(--font-size-large)', 
                fontWeight: 'var(--font-weight-medium)', 
                marginBottom: 'var(--spacing-lg)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-sm)',
                color: 'var(--text-color)'
              }}>
                <Calculator style={{ color: 'var(--blue-4)' }} size={20} />
                {t('admin:finance.balanceSheet.grossProfit', 'Gross Profit')}
              </h2>
              <div style={{ textAlign: 'center', padding: 'var(--spacing-xl) 0' }}>
                <p style={{ 
                  fontSize: 'var(--font-size-xxxlarge)', 
                  fontWeight: 'var(--font-weight-large)',
                  color: 'var(--green-4)',
                  margin: 0,
                  marginBottom: 'var(--spacing-sm)'
                }}>
                  CHF {pnl.grossProfit.toLocaleString('de-CH')}
                </p>
                <p style={{ 
                  fontSize: 'var(--font-size-small)', 
                  color: 'var(--text-light-color)',
                  margin: 0
                }}>
                  {t('admin:finance.balanceSheet.grossProfitDesc', 'Revenue - Direct Costs')}
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
                fontSize: 'var(--font-size-large)', 
                fontWeight: 'var(--font-weight-medium)', 
                marginBottom: 'var(--spacing-lg)',
                color: 'var(--text-color)'
              }}>
                {t('admin:finance.balanceSheet.fixedCosts', 'Fixed Costs')}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                {fixedCostsList.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--grey-2)' }}>
                          <th style={{ 
                            textAlign: 'left', 
                            padding: 'var(--spacing-md)', 
                            fontSize: 'var(--font-size-small)', 
                            fontWeight: 'var(--font-weight-medium)', 
                            color: 'var(--text-light-color)'
                          }}>
                            {t('admin:finance.balanceSheet.costName', 'Cost Name')}
                          </th>
                          <th style={{ 
                            textAlign: 'left', 
                            padding: 'var(--spacing-md)', 
                            fontSize: 'var(--font-size-small)', 
                            fontWeight: 'var(--font-weight-medium)', 
                            color: 'var(--text-light-color)'
                          }}>
                            {t('admin:finance.balanceSheet.type', 'Type')}
                          </th>
                          <th style={{ 
                            textAlign: 'left', 
                            padding: 'var(--spacing-md)', 
                            fontSize: 'var(--font-size-small)', 
                            fontWeight: 'var(--font-weight-medium)', 
                            color: 'var(--text-light-color)'
                          }}>
                            {t('admin:finance.balanceSheet.date', 'Date')}
                          </th>
                          <th style={{ 
                            textAlign: 'right', 
                            padding: 'var(--spacing-md)', 
                            fontSize: 'var(--font-size-small)', 
                            fontWeight: 'var(--font-weight-medium)', 
                            color: 'var(--text-light-color)'
                          }}>
                            {t('admin:finance.balanceSheet.amount', 'Amount')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {fixedCostsList.map((cost) => (
                          <tr 
                            key={cost.id} 
                            style={{ 
                              borderBottom: '1px solid var(--grey-2)', 
                              transition: 'background-color var(--transition-fast)'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--grey-1)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <td style={{ padding: 'var(--spacing-md)', fontSize: 'var(--font-size-small)' }}>
                              {cost.name}
                            </td>
                            <td style={{ padding: 'var(--spacing-md)', fontSize: 'var(--font-size-small)', color: 'var(--text-light-color)' }}>
                              {cost.type}
                            </td>
                            <td style={{ padding: 'var(--spacing-md)', fontSize: 'var(--font-size-small)', color: 'var(--text-light-color)' }}>
                              {format(cost.date, 'dd MMM yyyy')}
                            </td>
                            <td style={{ padding: 'var(--spacing-md)', fontSize: 'var(--font-size-small)', textAlign: 'right', fontWeight: 'var(--font-weight-medium)' }}>
                              CHF {cost.amount.toLocaleString('de-CH')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ 
                    padding: 'var(--spacing-xl)', 
                    textAlign: 'center', 
                    color: 'var(--text-light-color)',
                    fontSize: 'var(--font-size-medium)'
                  }}>
                    {t('admin:finance.balanceSheet.noFixedCosts', 'No fixed costs found for this period')}
                  </div>
                )}
                <div style={{ 
                  paddingTop: 'var(--spacing-md)', 
                  borderTop: '1px solid var(--grey-2)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ 
                    fontWeight: 'var(--font-weight-medium)',
                    fontSize: 'var(--font-size-large)'
                  }}>
                    {t('admin:finance.balanceSheet.totalFixedCosts', 'Total Fixed Costs')}
                  </span>
                  <span style={{ 
                    fontSize: 'var(--font-size-large)', 
                    fontWeight: 'var(--font-weight-large)',
                    color: 'var(--red-4)'
                  }}>
                    CHF {pnl.fixedCosts.toLocaleString('de-CH')}
                  </span>
                </div>
                <div style={{ 
                  paddingTop: 'var(--spacing-md)', 
                  borderTop: '1px solid var(--grey-2)'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center'
                  }}>
                    <span style={{ 
                      fontWeight: 'var(--font-weight-medium)',
                      fontSize: 'var(--font-size-large)'
                    }}>
                      {t('admin:finance.balanceSheet.netProfit', 'Net Profit')}
                    </span>
                    <span style={{ 
                      fontSize: 'var(--font-size-xxlarge)', 
                      fontWeight: 'var(--font-weight-large)',
                      color: pnl.netProfit >= 0 ? 'var(--green-4)' : 'var(--red-4)'
                    }}>
                      CHF {pnl.netProfit.toLocaleString('de-CH')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default BalanceSheet;

