import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, query, where, getDocs, orderBy, Timestamp, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import { useAuth } from '../../../../contexts/AuthContext';
import { useDashboard } from '../../../contexts/DashboardContext';
import { useNotification } from '../../../../contexts/NotificationContext';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../../services/firebase';
import {
  FiCalendar,
  FiClock,
  FiUser,
  FiCheck,
  FiX,
  FiAlertCircle,
  FiRefreshCw,
  FiFilter
} from 'react-icons/fi';
import { cn } from '../../../../utils/cn';
import { format } from 'date-fns';
import FilterBar from '../../../components/FilterBar/FilterBar';

const Requests = ({ organization, memberFacilities = [] }) => {
  const { t } = useTranslation(['organization', 'common']);
  const { currentUser } = useAuth();
  const { selectedWorkspace } = useDashboard();
  const { showNotification } = useNotification();

  const [vacancyRequests, setVacancyRequests] = useState([]);
  const [clockedHoursUpdates, setClockedHoursUpdates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    requestType: 'all',
    fromDate: '',
    toDate: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');

  const facilityIds = useMemo(() => {
    if (memberFacilities && memberFacilities.length > 0) {
      return memberFacilities.map(f => f.id);
    }
    const currentId = selectedWorkspace?.facilityId;
    return currentId ? [currentId] : [];
  }, [selectedWorkspace, memberFacilities]);

  const fetchVacancyRequests = useCallback(async () => {
    if (facilityIds.length === 0) return;

    try {
      const allRequests = [];

      // Since 'in' query has limits (max 10-30 depending on firestore version), 
      // we'll loop if it's small or just use the first query.
      // For vacancy requests, usually there aren't thousands of facilities in one org.

      const batches = [];
      for (let i = 0; i < facilityIds.length; i += 10) {
        batches.push(facilityIds.slice(i, i + 10));
      }

      for (const batch of batches) {
        const requestsQuery = query(
          collection(db, 'employeeVacancyRequests'),
          where('facilityProfileId', 'in', batch),
          orderBy('created', 'desc')
        );

        const snapshot = await getDocs(requestsQuery);
        const batchResults = await Promise.all(snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          let employeeName = 'Unknown Employee';

          if (data.userId) {
            try {
              const userDoc = await getDoc(doc(db, 'users', data.userId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                employeeName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.displayName || 'Unknown Employee';
              }
            } catch (error) {
              console.error('Error fetching user data:', error);
            }
          }

          return {
            id: docSnap.id,
            ...data,
            employeeName,
            type: 'vacancy',
            createdDate: data.created?.toDate?.() || (data.created instanceof Timestamp ? data.created.toDate() : null)
          };
        }));
        allRequests.push(...batchResults);
      }

      setVacancyRequests(allRequests);
    } catch (error) {
      console.error('Error fetching vacancy requests:', error);
    }
  }, [facilityIds]);

  const fetchClockedHoursUpdates = useCallback(async () => {
    if (facilityIds.length === 0) return;

    try {
      const allUpdates = [];

      // For clocked hours, we need to query teamSchedules/{facilityId_date}/shifts
      // This is harder to do organization-wide with a single query.
      // We'll try to fetch for the current active/selected facility or loop through a few.

      for (const facilityId of facilityIds) {
        try {
          const scheduleId = `${facilityId}_${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
          const shiftsRef = collection(db, 'teamSchedules', scheduleId, 'shifts');

          const shiftsQuery = query(
            shiftsRef,
            where('facilityId', '==', facilityId),
            orderBy('editedAt', 'desc')
          );

          try {
            const snapshot = await getDocs(shiftsQuery);
            const updates = await Promise.all(snapshot.docs.map(async (docSnap) => {
              const data = docSnap.data();
              if (!data.editedAt && !data.editedBy) return null;

              let employeeName = 'Unknown Employee';
              if (data.userId) {
                try {
                  const userDoc = await getDoc(doc(db, 'users', data.userId));
                  if (userDoc.exists()) {
                    const userData = userDoc.data();
                    employeeName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.displayName || 'Unknown Employee';
                  }
                } catch (error) {
                  // Silent fail for single user fetch
                }
              }

              const startTime = data.startTime?.toDate?.() || (data.startTime instanceof Timestamp ? data.startTime.toDate() : null);
              const endTime = data.endTime?.toDate?.() || (data.endTime instanceof Timestamp ? data.endTime.toDate() : null);
              const editedAt = data.editedAt?.toDate?.() || (data.editedAt instanceof Timestamp ? data.editedAt.toDate() : null);

              let hours = 0;
              if (startTime && endTime) {
                hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
              }

              return {
                id: docSnap.id,
                ...data,
                facilityId,
                employeeName,
                type: 'clocked_hours',
                hours: hours.toFixed(2),
                editedDate: editedAt,
                startTime,
                endTime
              };
            }));

            allUpdates.push(...updates.filter(Boolean));
          } catch (innerError) {
            // Permission errors are common here if not explicitly authorized for the schedule subcollection
            if (innerError.code !== 'permission-denied') {
              console.warn(`Could not fetch clocked hours for facility ${facilityId}:`, innerError.message);
            }
          }
        } catch (error) {
          // Silent catch for facility loop
        }
      }

      setClockedHoursUpdates(allUpdates);
    } catch (error) {
      // General error for the whole operation
      if (error.code !== 'permission-denied') {
        console.error('Error in fetchClockedHoursUpdates:', error);
      }
    }
  }, [facilityIds]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await Promise.allSettled([
          fetchVacancyRequests(),
          fetchClockedHoursUpdates()
        ]);
      } catch (err) {
        console.warn("Error loading some requests data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [fetchVacancyRequests, fetchClockedHoursUpdates]);

  const handleApproveRequest = async (requestId) => {
    try {
      const acceptFn = httpsCallable(functions, 'acceptEmployeeRequest');
      const result = await acceptFn({
        requestId,
        requestType: 'vacancy_request',
        openInternally: true,
        openExternally: true
      });

      if (result.data.success) {
        showNotification(t('organization:requests.requestApproved', 'Request approved'), 'success');
        await fetchVacancyRequests();
      }
    } catch (error) {
      console.error('Error approving request:', error);
      showNotification(error.message || t('organization:requests.errorApproving', 'Error approving request'), 'error');
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      const requestRef = doc(db, 'employeeVacancyRequests', requestId);
      await updateDoc(requestRef, {
        status: 'rejected',
        rejectedAt: Timestamp.now(),
        rejectedBy: currentUser.uid
      });

      showNotification(t('organization:requests.requestRejected', 'Request rejected'), 'success');
      await fetchVacancyRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      showNotification(error.message || t('organization:requests.errorRejecting', 'Error rejecting request'), 'error');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
      case 'accepted':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
      case 'accepted':
        return <FiCheck className="w-4 h-4" />;
      case 'rejected':
        return <FiX className="w-4 h-4" />;
      case 'pending':
        return <FiAlertCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      const dateObj = date instanceof Date ? date : date.toDate?.() || new Date(date);
      return format(dateObj, 'MMM d, yyyy HH:mm');
    } catch (error) {
      return 'N/A';
    }
  };

  const allRequests = [
    ...vacancyRequests.map(r => ({ ...r, requestType: 'vacancy' })),
    ...clockedHoursUpdates.map(r => ({ ...r, requestType: 'clocked_hours' }))
  ];

  const filteredRequests = allRequests.filter(request => {
    if (filters.status === 'pending' && request.status !== 'pending') return false;
    if (filters.status === 'approved' && request.status !== 'approved' && request.status !== 'accepted') return false;
    if (filters.status === 'rejected' && request.status !== 'rejected') return false;
    if (filters.requestType === 'vacancy' && request.type !== 'vacancy') return false;
    if (filters.requestType === 'clocked_hours' && request.type !== 'clocked_hours') return false;

    if (filters.fromDate || filters.toDate) {
      const requestDate = request.createdDate || request.editedDate;
      if (requestDate) {
        const date = requestDate instanceof Date ? requestDate : new Date(requestDate);
        if (filters.fromDate) {
          const fromDate = new Date(filters.fromDate);
          fromDate.setHours(0, 0, 0, 0);
          if (date < fromDate) return false;
        }
        if (filters.toDate) {
          const toDate = new Date(filters.toDate);
          toDate.setHours(23, 59, 59, 999);
          if (date > toDate) return false;
        }
      }
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const matchesEmployee = request.employeeName?.toLowerCase().includes(query);
      const matchesJobTitle = request.jobTitle?.toLowerCase().includes(query) || request.title?.toLowerCase().includes(query);
      const matchesReason = request.reason?.toLowerCase().includes(query);
      if (!matchesEmployee && !matchesJobTitle && !matchesReason) return false;
    }

    return true;
  });

  const sortedRequests = useMemo(() => {
    let result = [...filteredRequests];

    if (sortBy === 'date') {
      result.sort((a, b) => {
        const dateA = a.createdDate || a.editedDate || new Date(0);
        const dateB = b.createdDate || b.editedDate || new Date(0);
        return dateB - dateA;
      });
    } else if (sortBy === 'employee') {
      result.sort((a, b) => {
        const nameA = (a.employeeName || '').toLowerCase();
        const nameB = (b.employeeName || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
    } else if (sortBy === 'status') {
      result.sort((a, b) => {
        const statusA = (a.status || '').toLowerCase();
        const statusB = (b.status || '').toLowerCase();
        return statusA.localeCompare(statusB);
      });
    }

    return result;
  }, [filteredRequests, sortBy]);

  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleApplyFilters = useCallback(() => {
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({ status: 'all', requestType: 'all', fromDate: '', toDate: '' });
    setSearchQuery('');
  }, []);

  const handleRefresh = useCallback(() => {
    fetchVacancyRequests();
    fetchClockedHoursUpdates();
  }, [fetchVacancyRequests, fetchClockedHoursUpdates]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t('organization:requests.searchPlaceholder', 'Search by employee, job title, or reason...')}
        dropdownFields={[
          {
            key: 'status',
            label: t('organization:requests.filterByStatus', 'Filter by Status'),
            options: [
              { value: 'all', label: t('common:all', 'All') },
              { value: 'pending', label: t('common:pending', 'Pending') },
              { value: 'approved', label: t('common:approved', 'Approved') },
              { value: 'rejected', label: t('common:rejected', 'Rejected') }
            ],
            defaultValue: 'all'
          },
          {
            key: 'requestType',
            label: t('organization:requests.filterByType', 'Filter by Type'),
            options: [
              { value: 'all', label: t('common:all', 'All') },
              { value: 'vacancy', label: t('organization:requests.vacancyRequests', 'Vacancy Requests') },
              { value: 'clocked_hours', label: t('organization:requests.clockedHoursUpdates', 'Clocked Hours Updates') }
            ],
            defaultValue: 'all'
          }
        ]}
        dateFields={[
          {
            key: 'fromDate',
            label: t('organization:requests.fromDate', 'From Date'),
            showClearButton: true
          },
          {
            key: 'toDate',
            label: t('organization:requests.toDate', 'To Date'),
            showClearButton: true
          }
        ]}
        sortOptions={[
          { value: 'date', label: t('organization:requests.sort.date', 'Date') },
          { value: 'employee', label: t('organization:requests.sort.employee', 'Employee') },
          { value: 'status', label: t('organization:requests.sort.status', 'Status') }
        ]}
        sortValue={sortBy}
        onSortChange={setSortBy}
        title={t('organization:requests.title', 'Requests')}
        description={t('organization:requests.subtitle', 'Manage vacancy leave requests and clocked hours updates')}
        onRefresh={handleRefresh}
        showAdd={false}
        isLoading={isLoading}
        translationNamespace="organization"
      />

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {filteredRequests.length === 0 ? (
          <div className="p-12 text-center">
            <FiAlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">{t('organization:requests.noRequests', 'No requests found')}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  {t('organization:requests.type', 'Type')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  {t('organization:requests.employee', 'Employee')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  {t('organization:requests.details', 'Details')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  {t('organization:requests.date', 'Date')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  {t('organization:requests.status', 'Status')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  {t('common:actions', 'Actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRequests.map((request) => (
                <tr key={request.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {request.type === 'vacancy' ? (
                        <FiCalendar className="w-4 h-4 text-blue-600" />
                      ) : (
                        <FiClock className="w-4 h-4 text-purple-600" />
                      )}
                      <span className="text-sm text-foreground">
                        {request.type === 'vacancy'
                          ? t('organization:requests.vacancyRequest', 'Vacancy Request')
                          : t('organization:requests.clockedHoursUpdate', 'Clocked Hours Update')
                        }
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FiUser className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">{request.employeeName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-foreground">
                      {request.type === 'vacancy' ? (
                        <div>
                          <p className="font-medium">{request.jobTitle || request.title || 'N/A'}</p>
                          {request.reason && (
                            <p className="text-xs text-muted-foreground mt-1">{request.reason}</p>
                          )}
                        </div>
                      ) : (
                        <div>
                          <p className="font-medium">{t('organization:requests.hours', 'Hours')}: {request.hours}h</p>
                          {request.startTime && request.endTime && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDate(request.startTime)} - {formatDate(request.endTime)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {formatDate(request.createdDate || request.editedDate)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border",
                      getStatusColor(request.status)
                    )}>
                      {getStatusIcon(request.status)}
                      {request.status || 'pending'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {request.type === 'vacancy' && request.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApproveRequest(request.id)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                          title={t('common:approve', 'Approve')}
                        >
                          <FiCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRejectRequest(request.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title={t('common:reject', 'Reject')}
                        >
                          <FiX className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Requests;

