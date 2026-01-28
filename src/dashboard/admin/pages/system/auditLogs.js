import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import { Search, Filter, Calendar, User, FileText } from 'lucide-react';
import ProtectedRoute from '../../components/protectedRoute';
import { PERMISSIONS } from '../../utils/rbac';
import { format } from 'date-fns';
import PersonnalizedInputField from '../../../../components/boxedInputFields/personnalizedInputField';
import DropdownField from '../../../../components/boxedInputFields/dropdownField';
import PageHeader from '../../../components/PageHeader/PageHeader';
import FilterBar from '../../../../components/dashboard/dashboardFilterBar/FilterBar';
import '../../../../styles/variables.css';

const AuditLogs = () => {
  const { t } = useTranslation(['admin']);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('');

  useEffect(() => {
    loadAuditLogs();
  }, [actionFilter, userFilter]);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const logsRef = collection(db, 'audit_logs');
      let q = query(logsRef, orderBy('timestamp', 'desc'), limit(500));

      if (actionFilter !== 'all') {
        q = query(q, where('action', '==', actionFilter));
      }

      if (userFilter) {
        q = query(q, where('userId', '==', userFilter));
      }

      const snapshot = await getDocs(q);
      const logsList = [];
      snapshot.forEach((doc) => {
        logsList.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate?.() || doc.data().timestamp
        });
      });

      setLogs(logsList);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.action?.toLowerCase().includes(query) ||
      log.userId?.toLowerCase().includes(query) ||
      log.details?.toLowerCase().includes(query) ||
      log.targetId?.toLowerCase().includes(query)
    );
  });

  const getActionIcon = (action) => {
    if (action?.includes('approve') || action?.includes('verify')) {
      return '✓';
    }
    if (action?.includes('reject') || action?.includes('delete')) {
      return '✗';
    }
    if (action?.includes('edit') || action?.includes('update')) {
      return '✎';
    }
    return '•';
  };

  const getActionColor = (action) => {
    if (action?.includes('approve') || action?.includes('verify')) {
      return { backgroundColor: 'var(--green-1)', color: 'var(--green-4)' };
    }
    if (action?.includes('reject') || action?.includes('delete')) {
      return { backgroundColor: 'var(--red-1)', color: 'var(--red-4)' };
    }
    if (action?.includes('edit') || action?.includes('update')) {
      return { backgroundColor: 'var(--blue-1)', color: 'var(--blue-4)' };
    }
    return { backgroundColor: 'var(--grey-1)', color: 'var(--grey-4)' };
  };

  const actionOptions = [
    { value: 'all', label: t('admin:system.audit.allActions', 'All Actions') },
    { value: 'user_approved', label: t('admin:system.audit.userApproved', 'User Approved') },
    { value: 'user_rejected', label: t('admin:system.audit.userRejected', 'User Rejected') },
    { value: 'shift_assigned', label: t('admin:system.audit.shiftAssigned', 'Shift Assigned') },
    { value: 'pay_rate_changed', label: t('admin:system.audit.payRateChanged', 'Pay Rate Changed') },
    { value: 'commission_changed', label: t('admin:system.audit.commissionChanged', 'Commission Changed') }
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '256px' }}>
        <div style={{ color: 'var(--text-light-color)' }}>Loading audit logs...</div>
      </div>
    );
  }

  const handleFilterChange = (key, value) => {
    if (key === 'action') {
      setActionFilter(value);
    }
  };

  const filterBarDropdownFields = [
    {
      key: 'action',
      label: 'Action Type',
      options: actionOptions,
      defaultValue: 'all'
    }
  ];

  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.VIEW_AUDIT_LOGS}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <PageHeader
          title={t('admin:system.audit.title', 'Audit Logs')}
          subtitle={t('admin:system.audit.description', 'View system activity and audit trail')}
        />
        
        <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-lg)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
            <FilterBar
              filters={{ action: actionFilter }}
              onFilterChange={handleFilterChange}
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder={t('admin:system.audit.search', 'Search logs...')}
              dropdownFields={filterBarDropdownFields}
              translationNamespace="admin"
              title={t('admin:system.audit.searchCriteria', 'Search Criteria')}
              description={t('admin:system.audit.searchDescription', 'Filter audit logs by action type or search by user, action, or details')}
              onRefresh={loadAuditLogs}
              isLoading={loading}
            />

        <div style={{ backgroundColor: 'var(--background-div-color)', borderRadius: 'var(--border-radius-md)', padding: 'var(--spacing-md)', border: '1px solid var(--grey-2)', boxShadow: 'var(--shadow-sm)' }}>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-sm font-semibold text-muted-foreground">
                    {t('admin:system.audit.timestamp', 'Timestamp')}
                  </th>
                  <th className="text-left p-3 text-sm font-semibold text-muted-foreground">
                    {t('admin:system.audit.action', 'Action')}
                  </th>
                  <th className="text-left p-3 text-sm font-semibold text-muted-foreground">
                    {t('admin:system.audit.user', 'User')}
                  </th>
                  <th className="text-left p-3 text-sm font-semibold text-muted-foreground">
                    {t('admin:system.audit.target', 'Target')}
                  </th>
                  <th className="text-left p-3 text-sm font-semibold text-muted-foreground">
                    {t('admin:system.audit.details', 'Details')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b border-border hover:bg-grey-1">
                    <td className="p-3 text-sm">
                      {log.timestamp ? format(log.timestamp, 'dd/MM/yyyy HH:mm') : 'N/A'}
                    </td>
                    <td style={{ padding: 'var(--spacing-md)' }}>
                      <span style={{ padding: 'var(--spacing-xs) var(--spacing-sm)', borderRadius: 'var(--border-radius-sm)', fontSize: 'var(--font-size-small)', fontWeight: 'var(--font-weight-medium)', ...getActionColor(log.action) }}>
                        {getActionIcon(log.action)} {log.action || 'N/A'}
                      </span>
                    </td>
                    <td className="p-3 text-sm font-mono">
                      {log.userId?.substring(0, 8)}...
                    </td>
                    <td className="p-3 text-sm font-mono">
                      {log.targetId ? `${log.targetId.substring(0, 8)}...` : 'N/A'}
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {log.details || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredLogs.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              {t('admin:system.audit.noLogs', 'No audit logs found')}
            </div>
          )}
          </div>
        </div>
      </div>
      </div>
    </ProtectedRoute>
  );
};

export default AuditLogs;

