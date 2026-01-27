import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import { DollarSign, Mail, AlertCircle } from 'lucide-react';
import ProtectedRoute from '../../components/ProtectedRoute';
import { PERMISSIONS } from '../../utils/rbac';
import Papa from 'papaparse';
import PageHeader from '../../../components/PageHeader/PageHeader';
import FilterBar from '../../../components/FilterBar/FilterBar';
import '../../../../styles/variables.css';

const AccountsReceivable = () => {
  const { t } = useTranslation(['admin']);
  const [arData, setArData] = useState({
    unpaidCommissions: 0,
    outstandingInvoices: [],
    totalOutstanding: 0
  });
  const [loading, setLoading] = useState(true);
  const [filterByDate, setFilterByDate] = useState(false);
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
    loadARData();
  }, [filterByDate, dateFrom, dateTo, loadARData]);

  const loadARData = async () => {
    setLoading(true);
    try {
      const [commissions, invoices] = await Promise.all([
        getUnpaidCommissions(),
        getOutstandingInvoices()
      ]);

      let filteredInvoices = invoices;
      if (filterByDate && dateFrom && dateTo) {
        const startDate = new Date(dateFrom);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        
        filteredInvoices = invoices.filter(inv => {
          const dueDate = inv.dueDate?.toDate?.() || inv.dueDate;
          return dueDate && dueDate >= startDate && dueDate <= endDate;
        });
      }

      const totalOutstanding = commissions + filteredInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);

      setArData({
        unpaidCommissions: commissions,
        outstandingInvoices: filteredInvoices,
        totalOutstanding
      });
    } catch (error) {
      console.error('Error loading AR data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUnpaidCommissions = async () => {
    try {
      const shiftsRef = collection(db, 'shifts');
      const q = query(
        shiftsRef,
        where('status', '==', 'completed'),
        where('commissionPaid', '==', false)
      );
      const snapshot = await getDocs(q);

      let total = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        const clientRate = data.hourlyRate || 0;
        const workerRate = data.workerHourlyRate || 0;
        const socialCharges = workerRate * 0.15;
        const spsFee = workerRate * 0.05;
        const commission = clientRate - workerRate - socialCharges - spsFee;
        total += Math.max(0, commission * (data.duration || 8));
      });

      return total;
    } catch (error) {
      console.error('Error getting unpaid commissions:', error);
      return 0;
    }
  };

  const getOutstandingInvoices = async () => {
    try {
      const invoicesRef = collection(db, 'invoices');
      const q = query(
        invoicesRef,
        where('status', 'in', ['pending', 'overdue'])
      );
      const snapshot = await getDocs(q);

      const invoices = [];
      snapshot.forEach((doc) => {
        invoices.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return invoices;
    } catch (error) {
      console.error('Error getting outstanding invoices:', error);
      return [];
    }
  };

  const handleSendReminder = async (invoiceId, email) => {
    try {
      alert(`Reminder email would be sent to ${email}`);
    } catch (error) {
      console.error('Error sending reminder:', error);
      alert('Error sending reminder email');
    }
  };

  const handleExport = () => {
    const csvData = arData.outstandingInvoices.map(inv => ({
      invoiceId: inv.id,
      facilityId: inv.facilityId || '',
      amount: inv.amount || 0,
      dueDate: inv.dueDate?.toDate?.()?.toLocaleDateString() || '',
      status: inv.status || 'pending'
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `outstanding_invoices_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <div style={{ color: 'var(--text-light-color)', fontSize: 'var(--font-size-medium)' }}>Loading AR data...</div>
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

  const filterBarDateFields = filterByDate ? [
    {
      key: 'fromDate',
      label: t('admin:finance.from', 'From')
    },
    {
      key: 'toDate',
      label: t('admin:finance.to', 'To')
    }
  ] : [];

  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_FINANCE}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <PageHeader
          title={t('admin:finance.ar.title', 'Accounts Receivable')}
          subtitle={t('admin:finance.ar.description', 'Track outstanding invoices and unpaid commissions')}
        />
        
        <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-lg)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
            <div style={{ 
              backgroundColor: 'var(--background-div-color)', 
              borderRadius: 'var(--border-radius-md)', 
              padding: 'var(--spacing-lg)', 
              boxShadow: 'var(--shadow-sm)',
              border: '1px solid var(--grey-2)'
            }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 'var(--spacing-sm)',
                cursor: 'pointer',
                fontSize: 'var(--font-size-small)',
                color: 'var(--text-color)',
                marginBottom: filterByDate ? 'var(--spacing-md)' : 0
              }}>
                <input
                  type="checkbox"
                  checked={filterByDate}
                  onChange={(e) => setFilterByDate(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                {t('admin:finance.enableDateFilter', 'Enable date filter')}
              </label>
              {filterByDate && (
                <FilterBar
                  filters={{
                    fromDate: dateFrom ? dateFrom.toISOString().split('T')[0] : null,
                    toDate: dateTo ? dateTo.toISOString().split('T')[0] : null
                  }}
                  onFilterChange={handleFilterChange}
                  dateFields={filterBarDateFields}
                  translationNamespace="admin"
                  title={t('admin:finance.filterByDate', 'Filter by Date Range')}
                  description={t('admin:finance.filterByDateDescription', 'Select date range to filter invoices')}
                  onRefresh={loadARData}
                  isLoading={loading}
                />
              )}
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
              background: 'linear-gradient(135deg, rgba(248, 176, 19, 0.15), transparent)',
              borderRadius: '0 0 0 100px'
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)', position: 'relative', zIndex: 1 }}>
              <div style={{ 
                backgroundColor: 'var(--yellow-1)', 
                borderRadius: 'var(--border-radius-sm)', 
                padding: 'var(--spacing-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <DollarSign style={{ color: 'var(--yellow-4)' }} size={20} />
              </div>
              <h3 style={{ 
                fontSize: 'var(--font-size-small)', 
                fontWeight: 'var(--font-weight-medium)', 
                color: 'var(--text-light-color)',
                margin: 0
              }}>
                {t('admin:finance.ar.unpaidCommissions', 'Unpaid Commissions (SPS)')}
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
              CHF {arData.unpaidCommissions.toLocaleString('de-CH')}
            </p>
            <p style={{ 
              fontSize: 'var(--font-size-small)', 
              color: 'var(--text-light-color)',
              margin: 0,
              position: 'relative',
              zIndex: 1
            }}>
              {t('admin:finance.ar.unpaidCommissionsDesc', 'Estimated amount SPS owes you')}
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
                <AlertCircle style={{ color: 'var(--red-4)' }} size={20} />
              </div>
              <h3 style={{ 
                fontSize: 'var(--font-size-small)', 
                fontWeight: 'var(--font-weight-medium)', 
                color: 'var(--text-light-color)',
                margin: 0
              }}>
                {t('admin:finance.ar.totalOutstanding', 'Total Outstanding')}
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
              CHF {arData.totalOutstanding.toLocaleString('de-CH')}
            </p>
            <p style={{ 
              fontSize: 'var(--font-size-small)', 
              color: 'var(--text-light-color)',
              margin: 0,
              position: 'relative',
              zIndex: 1
            }}>
              {t('admin:finance.ar.totalOutstandingDesc', 'Commissions + Invoices')}
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
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: 'var(--spacing-lg)',
            flexWrap: 'wrap',
            gap: 'var(--spacing-md)'
          }}>
            <h2 style={{ 
              fontSize: 'var(--font-size-xlarge)', 
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--text-color)',
              margin: 0
            }}>
              {t('admin:finance.ar.outstandingInvoices', 'Outstanding Invoices')}
            </h2>
            <button
              onClick={handleExport}
              style={{
                padding: 'var(--spacing-sm) var(--spacing-md)',
                backgroundColor: 'var(--primary-color)',
                color: 'var(--white)',
                borderRadius: 'var(--border-radius-md)',
                border: 'none',
                fontSize: 'var(--font-size-small)',
                fontWeight: 'var(--font-weight-medium)',
                cursor: 'pointer',
                transition: 'var(--transition-fast)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              {t('admin:finance.ar.export', 'Export CSV')}
            </button>
          </div>

          {arData.outstandingInvoices.length > 0 ? (
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
                      {t('admin:finance.ar.invoiceId', 'Invoice ID')}
                    </th>
                    <th style={{ 
                      textAlign: 'left', 
                      padding: 'var(--spacing-md)', 
                      fontSize: 'var(--font-size-small)', 
                      fontWeight: 'var(--font-weight-medium)', 
                      color: 'var(--text-light-color)'
                    }}>
                      {t('admin:finance.ar.facility', 'Facility')}
                    </th>
                    <th style={{ 
                      textAlign: 'left', 
                      padding: 'var(--spacing-md)', 
                      fontSize: 'var(--font-size-small)', 
                      fontWeight: 'var(--font-weight-medium)', 
                      color: 'var(--text-light-color)'
                    }}>
                      {t('admin:finance.ar.amount', 'Amount')}
                    </th>
                    <th style={{ 
                      textAlign: 'left', 
                      padding: 'var(--spacing-md)', 
                      fontSize: 'var(--font-size-small)', 
                      fontWeight: 'var(--font-weight-medium)', 
                      color: 'var(--text-light-color)'
                    }}>
                      {t('admin:finance.ar.dueDate', 'Due Date')}
                    </th>
                    <th style={{ 
                      textAlign: 'left', 
                      padding: 'var(--spacing-md)', 
                      fontSize: 'var(--font-size-small)', 
                      fontWeight: 'var(--font-weight-medium)', 
                      color: 'var(--text-light-color)'
                    }}>
                      {t('admin:finance.ar.status', 'Status')}
                    </th>
                    <th style={{ 
                      textAlign: 'left', 
                      padding: 'var(--spacing-md)', 
                      fontSize: 'var(--font-size-small)', 
                      fontWeight: 'var(--font-weight-medium)', 
                      color: 'var(--text-light-color)'
                    }}>
                      {t('admin:finance.ar.actions', 'Actions')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {arData.outstandingInvoices.map((invoice) => (
                    <tr 
                      key={invoice.id} 
                      style={{ 
                        borderBottom: '1px solid var(--grey-2)',
                        transition: 'var(--transition-fast)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--grey-1)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: 'var(--spacing-md)', fontSize: 'var(--font-size-small)', fontFamily: 'monospace' }}>
                        {invoice.id.substring(0, 8)}...
                      </td>
                      <td style={{ padding: 'var(--spacing-md)', fontSize: 'var(--font-size-small)' }}>
                        {invoice.facilityId || 'N/A'}
                      </td>
                      <td style={{ padding: 'var(--spacing-md)', fontSize: 'var(--font-size-small)', fontWeight: 'var(--font-weight-medium)' }}>
                        CHF {invoice.amount?.toLocaleString('de-CH') || '0'}
                      </td>
                      <td style={{ padding: 'var(--spacing-md)', fontSize: 'var(--font-size-small)' }}>
                        {invoice.dueDate?.toDate?.()?.toLocaleDateString() || 'N/A'}
                      </td>
                      <td style={{ padding: 'var(--spacing-md)' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: 'var(--border-radius-sm)',
                          fontSize: 'var(--font-size-small)',
                          backgroundColor: invoice.status === 'overdue' ? 'var(--red-1)' : 'var(--yellow-1)',
                          color: invoice.status === 'overdue' ? 'var(--red-4)' : 'var(--yellow-4)'
                        }}>
                          {invoice.status}
                        </span>
                      </td>
                      <td style={{ padding: 'var(--spacing-md)' }}>
                        <button
                          onClick={() => handleSendReminder(invoice.id, invoice.email)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--spacing-sm)',
                            padding: '4px 12px',
                            backgroundColor: 'var(--primary-color)',
                            color: 'var(--white)',
                            borderRadius: 'var(--border-radius-sm)',
                            border: 'none',
                            fontSize: 'var(--font-size-small)',
                            cursor: 'pointer',
                            transition: 'var(--transition-fast)'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                        >
                          <Mail size={14} />
                          {t('admin:finance.ar.sendReminder', 'Send Reminder')}
                        </button>
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
              {t('admin:finance.ar.noInvoices', 'No outstanding invoices')}
            </div>
          )}
          </div>
        </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default AccountsReceivable;

