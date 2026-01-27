import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import { FIRESTORE_COLLECTIONS } from '../../../../config/keysDatabase';
import { Gift, TrendingUp, Users, Calendar } from 'lucide-react';
import ProtectedRoute from '../../components/ProtectedRoute';
import { PERMISSIONS } from '../../utils/rbac';
import DateField from '../../../../components/BoxedInputFields/DateField';
import { format } from 'date-fns';
import '../../../../styles/variables.css';

const SpendingsTracker = () => {
  const { t } = useTranslation(['admin']);
  const [spendings, setSpendings] = useState({
    referralPayouts: [],
    totalReferralCost: 0,
    marketingSpend: 0,
    cac: 0
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
      loadSpendingsData();
    }
  }, [dateFrom, dateTo]);

  const loadSpendingsData = async () => {
    if (!dateFrom || !dateTo) return;
    setLoading(true);
    try {
      const startDate = new Date(dateFrom);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);

      const [referrals, marketing] = await Promise.all([
        getReferralPayouts(startDate, endDate),
        getMarketingSpend(startDate, endDate)
      ]);

      const totalReferralCost = referrals.reduce((sum, ref) => sum + (ref.amount || 50), 0);
      const newSignups = await getNewSignupsCount(startDate, endDate);
      const cac = newSignups > 0 ? marketing / newSignups : 0;

      setSpendings({
        referralPayouts: referrals,
        totalReferralCost,
        marketingSpend: marketing,
        cac
      });
    } catch (error) {
      console.error('Error loading spendings data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getReferralPayouts = async (startDate, endDate) => {
    try {
      const referralsRef = collection(db, 'referrals');
      const q = query(
        referralsRef,
        where('claimedAt', '>=', startDate),
        where('claimedAt', '<=', endDate)
      );
      const snapshot = await getDocs(q);

      const referrals = [];
      snapshot.forEach((doc) => {
        referrals.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return referrals;
    } catch (error) {
      console.error('Error getting referral payouts:', error);
      return [];
    }
  };

  const getMarketingSpend = async (startDate, endDate) => {
    try {
      const marketingRef = collection(db, 'marketingSpend');
      const snapshot = await getDocs(marketingRef);

      let total = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        const spendDate = data.date?.toDate?.() || (data.month && data.year ? new Date(data.year, data.month - 1, 1) : null);
        if (spendDate && spendDate >= startDate && spendDate <= endDate) {
          total += data.amount || 0;
        }
      });

      return total;
    } catch (error) {
      console.error('Error getting marketing spend:', error);
      return 0;
    }
  };

  const getNewSignupsCount = async (startDate, endDate) => {
    try {
      const usersRef = collection(db, FIRESTORE_COLLECTIONS.USERS);
      const snapshot = await getDocs(usersRef);

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

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <div style={{ color: 'var(--text-light-color)', fontSize: 'var(--font-size-medium)' }}>{t('admin:finance.loadingSpendings', 'Loading spendings data...')}</div>
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
            {t('admin:finance.spendings.title', 'Spendings & CAC Tracker')}
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
              background: 'linear-gradient(135deg, rgba(111, 88, 255, 0.15), transparent)',
              borderRadius: '0 0 0 100px'
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)', position: 'relative', zIndex: 1 }}>
              <div style={{ 
                backgroundColor: 'var(--purple-2)', 
                borderRadius: 'var(--border-radius-sm)', 
                padding: 'var(--spacing-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Gift style={{ color: 'var(--purple-4)' }} size={20} />
              </div>
              <h3 style={{ 
                fontSize: 'var(--font-size-small)', 
                fontWeight: 'var(--font-weight-medium)', 
                color: 'var(--text-light-color)',
                margin: 0
              }}>
                {t('admin:finance.spendings.totalReferrals', 'Total Referral Cost')}
              </h3>
            </div>
            <p style={{ 
              fontSize: 'var(--font-size-xxxlarge)', 
              fontWeight: 'var(--font-weight-large)',
              color: 'var(--text-color)',
              margin: 0,
              marginBottom: 'var(--spacing-sm)',
              position: 'relative',
              zIndex: 1
            }}>
              CHF {spendings.totalReferralCost.toLocaleString('de-CH')}
            </p>
            <p style={{ 
              fontSize: 'var(--font-size-small)', 
              color: 'var(--text-light-color)',
              margin: 0,
              position: 'relative',
              zIndex: 1
            }}>
              {spendings.referralPayouts.length} {t('admin:finance.spendings.vouchers', 'vouchers')}
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
                {t('admin:finance.spendings.marketingSpend', 'Marketing Spend')}
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
              CHF {spendings.marketingSpend.toLocaleString('de-CH')}
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
                <Users style={{ color: 'var(--green-4)' }} size={20} />
              </div>
              <h3 style={{ 
                fontSize: 'var(--font-size-small)', 
                fontWeight: 'var(--font-weight-medium)', 
                color: 'var(--text-light-color)',
                margin: 0
              }}>
                {t('admin:finance.spendings.cac', 'CAC')}
              </h3>
            </div>
            <p style={{ 
              fontSize: 'var(--font-size-xxxlarge)', 
              fontWeight: 'var(--font-weight-large)',
              color: 'var(--text-color)',
              margin: 0,
              marginBottom: 'var(--spacing-sm)',
              position: 'relative',
              zIndex: 1
            }}>
              CHF {spendings.cac.toFixed(0)}
            </p>
            <p style={{ 
              fontSize: 'var(--font-size-small)', 
              color: 'var(--text-light-color)',
              margin: 0,
              position: 'relative',
              zIndex: 1
            }}>
              {t('admin:finance.spendings.cacDesc', 'Customer Acquisition Cost')}
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
            {t('admin:finance.spendings.referralPayouts', 'Referral Payouts')}
          </h2>
          {spendings.referralPayouts.length > 0 ? (
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
                      {t('admin:finance.spendings.referrer', 'Referrer')}
                    </th>
                    <th style={{ 
                      textAlign: 'left', 
                      padding: 'var(--spacing-md)', 
                      fontSize: 'var(--font-size-small)', 
                      fontWeight: 'var(--font-weight-medium)', 
                      color: 'var(--text-light-color)'
                    }}>
                      {t('admin:finance.spendings.referred', 'Referred User')}
                    </th>
                    <th style={{ 
                      textAlign: 'left', 
                      padding: 'var(--spacing-md)', 
                      fontSize: 'var(--font-size-small)', 
                      fontWeight: 'var(--font-weight-medium)', 
                      color: 'var(--text-light-color)'
                    }}>
                      {t('admin:finance.spendings.amount', 'Amount')}
                    </th>
                    <th style={{ 
                      textAlign: 'left', 
                      padding: 'var(--spacing-md)', 
                      fontSize: 'var(--font-size-small)', 
                      fontWeight: 'var(--font-weight-medium)', 
                      color: 'var(--text-light-color)'
                    }}>
                      {t('admin:finance.spendings.status', 'Status')}
                    </th>
                    <th style={{ 
                      textAlign: 'left', 
                      padding: 'var(--spacing-md)', 
                      fontSize: 'var(--font-size-small)', 
                      fontWeight: 'var(--font-weight-medium)', 
                      color: 'var(--text-light-color)'
                    }}>
                      {t('admin:finance.spendings.claimedAt', 'Claimed At')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {spendings.referralPayouts.map((referral) => (
                    <tr 
                      key={referral.id} 
                      style={{ 
                        borderBottom: '1px solid var(--grey-2)',
                        transition: 'var(--transition-fast)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--grey-1)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: 'var(--spacing-md)', fontSize: 'var(--font-size-small)' }}>{referral.referrerId || 'N/A'}</td>
                      <td style={{ padding: 'var(--spacing-md)', fontSize: 'var(--font-size-small)' }}>{referral.referredUserId || 'N/A'}</td>
                      <td style={{ padding: 'var(--spacing-md)', fontSize: 'var(--font-size-small)', fontWeight: 'var(--font-weight-medium)' }}>
                        CHF {referral.amount || 50}
                      </td>
                      <td style={{ padding: 'var(--spacing-md)' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: 'var(--border-radius-sm)',
                          fontSize: 'var(--font-size-small)',
                          backgroundColor: referral.status === 'voucher_sent' ? 'var(--green-1)' :
                            referral.status === 'pending_validation' ? 'var(--yellow-1)' :
                              'var(--grey-1)',
                          color: referral.status === 'voucher_sent' ? 'var(--green-4)' :
                            referral.status === 'pending_validation' ? 'var(--yellow-4)' :
                              'var(--grey-4)'
                        }}>
                          {referral.status || 'pending_validation'}
                        </span>
                      </td>
                      <td style={{ padding: 'var(--spacing-md)', fontSize: 'var(--font-size-small)' }}>
                        {referral.claimedAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ 
              textAlign: 'center', 
              padding: 'var(--spacing-xxl)', 
              color: 'var(--text-light-color)',
              fontSize: 'var(--font-size-medium)'
            }}>
              {t('admin:finance.spendings.noReferrals', 'No referral payouts for this period')}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default SpendingsTracker;

