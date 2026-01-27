import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../services/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { useDashboard } from '../../contexts/DashboardContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { FiDollarSign, FiClock, FiCheckCircle, FiAlertCircle, FiRefreshCw, FiFileText, FiSend, FiUsers, FiBriefcase } from 'react-icons/fi';
import { cn } from '../../../utils/cn';
import PageHeader from '../../components/PageHeader/PageHeader';
import FilterBar from '../../components/FilterBar/FilterBar';

const statusConfig = {
    pending: { color: 'bg-transparent text-yellow-700 border-yellow-700', icon: FiClock, label: 'Pending' },
    sent: { color: 'bg-transparent text-blue-700 border-blue-700', icon: FiSend, label: 'Sent to PayrollPlus' },
    confirmed: { color: 'bg-transparent text-green-700 border-green-700', icon: FiCheckCircle, label: 'Confirmed' },
    paid: { color: 'bg-transparent text-emerald-700 border-emerald-700', icon: FiCheckCircle, label: 'Paid' },
    failed: { color: 'bg-transparent text-red-700 border-red-700', icon: FiAlertCircle, label: 'Failed' }
};

const PayrollDashboard = ({ hideHeader = false, hideStats = false }) => {
    const { t } = useTranslation(['payroll', 'common']);
    const { currentUser } = useAuth();
    const { selectedWorkspace } = useDashboard();
    const { showNotification } = useNotification();
    const [searchParams, setSearchParams] = useSearchParams();

    const [payrollRequests, setPayrollRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('date');
    const [viewMode, setViewMode] = useState('list');
    const [filters, setFilters] = useState({
        status: 'all',
        source: 'all',
        fromDate: '',
        toDate: ''
    });
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        sent: 0,
        confirmed: 0,
        paid: 0,
        totalAmount: 0
    });

    const statusOptions = [
        { value: 'all', label: t('payroll:filter.all', 'All') },
        { value: 'pending', label: t('payroll:status.pending', 'Pending') },
        { value: 'sent', label: t('payroll:status.sent', 'Sent') },
        { value: 'confirmed', label: t('payroll:status.confirmed', 'Confirmed') },
        { value: 'paid', label: t('payroll:status.paid', 'Paid') },
        { value: 'failed', label: t('payroll:status.failed', 'Failed') }
    ];

    const handleFilterChange = useCallback((key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
    }, []);

    const handleClearFilters = useCallback(() => {
        setFilters({
            status: 'all',
            source: 'all',
            fromDate: '',
            toDate: ''
        });
    }, []);

    const fetchPayrollRequests = useCallback(async () => {
        if (!currentUser) return;

        setIsLoading(true);
        try {
            const getPayrollRequestsFn = httpsCallable(functions, 'getPayrollRequests');
            const targetFacilityId = selectedWorkspace?.facilityId || currentUser.uid;
            const result = await getPayrollRequestsFn({
                status: filters.status === 'all' ? null : filters.status,
                facilityId: targetFacilityId,
                limit: 1000
            });

            if (result.data.success) {
                const requests = result.data.requests || [];
                setPayrollRequests(requests);

                const newStats = requests.reduce((acc, req) => {
                    acc.total++;
                    acc[req.status] = (acc[req.status] || 0) + 1;
                    acc.totalAmount += req.financials?.totalCost || 0;
                    return acc;
                }, { total: 0, pending: 0, sent: 0, confirmed: 0, paid: 0, failed: 0, totalAmount: 0 });

                setStats(newStats);
            }
        } catch (error) {
            console.error('Error fetching payroll requests:', error);
            if (error.code === 'not-found' || error.message?.includes('NOT_FOUND')) {
                showNotification(t('payroll:errors.functionNotFound', 'Payroll service is currently being synchronized...'), 'warning');
                setPayrollRequests([]);
            } else {
                showNotification(t('payroll:errors.fetchFailed', 'Failed to load payroll requests'), 'error');
            }
        } finally {
            setIsLoading(false);
        }
    }, [currentUser, selectedWorkspace, filters.status, showNotification, t]);

    useEffect(() => {
        fetchPayrollRequests();
    }, [fetchPayrollRequests]);

    useEffect(() => {
        const modalParam = searchParams.get('modal');
        const requestId = searchParams.get('requestId');
        
        if (modalParam === 'details' && requestId) {
            const request = payrollRequests.find(r => r.id === requestId);
            if (request) {
                setSelectedRequest(request);
            }
        }
    }, [searchParams, payrollRequests]);

    const handleCloseModal = useCallback(() => {
        setSelectedRequest(null);
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('modal');
        newParams.delete('requestId');
        setSearchParams(newParams, { replace: true });
    }, [searchParams, setSearchParams]);

    const handleOpenRequestDetails = useCallback((request) => {
        setSelectedRequest(request);
        const newParams = new URLSearchParams(searchParams);
        newParams.set('modal', 'details');
        if (request.id) {
            newParams.set('requestId', request.id);
        }
        setSearchParams(newParams, { replace: true });
    }, [searchParams, setSearchParams]);

    const filteredAndSortedRequests = useMemo(() => {
        let result = [...payrollRequests];

        if (filters.source !== 'all') {
            if (filters.source === 'team') {
                result = result.filter(req => req.source === 'team' || !req.source);
            } else if (filters.source === 'medishift') {
                result = result.filter(req => req.source === 'medishift');
            }
        }

        if (filters.status !== 'all') {
            result = result.filter(req => req.status === filters.status);
        }

        if (searchTerm.trim()) {
            const search = searchTerm.toLowerCase();
            result = result.filter(req => {
                const workerName = req.workerProfile?.fullName || '';
                const role = req.shiftDetails?.role || '';
                return workerName.toLowerCase().includes(search) || role.toLowerCase().includes(search);
            });
        }

        if (filters.fromDate || filters.toDate) {
            result = result.filter(req => {
                const reqDate = req.shiftDetails?.date?.toDate ? req.shiftDetails.date.toDate() : new Date(req.shiftDetails?.date || req.createdAt);
                if (filters.fromDate) {
                    const fromDate = new Date(filters.fromDate);
                    fromDate.setHours(0, 0, 0, 0);
                    if (reqDate < fromDate) return false;
                }
                if (filters.toDate) {
                    const toDate = new Date(filters.toDate);
                    toDate.setHours(23, 59, 59, 999);
                    if (reqDate > toDate) return false;
                }
                return true;
            });
        }

        if (sortBy === 'date') {
            result.sort((a, b) => {
                const dateA = a.shiftDetails?.date?.toDate ? a.shiftDetails.date.toDate() : new Date(a.shiftDetails?.date || a.createdAt || 0);
                const dateB = b.shiftDetails?.date?.toDate ? b.shiftDetails.date.toDate() : new Date(b.shiftDetails?.date || b.createdAt || 0);
                return dateB - dateA;
            });
        } else if (sortBy === 'name') {
            result.sort((a, b) => {
                const nameA = (a.workerProfile?.fullName || '').toLowerCase();
                const nameB = (b.workerProfile?.fullName || '').toLowerCase();
                return nameA.localeCompare(nameB);
            });
        } else if (sortBy === 'amount') {
            result.sort((a, b) => {
                const amountA = a.financials?.totalCost || 0;
                const amountB = b.financials?.totalCost || 0;
                return amountB - amountA;
            });
        }

        return result;
    }, [payrollRequests, searchTerm, filters, sortBy]);

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('de-CH', {
            style: 'currency',
            currency: 'CHF'
        }).format(amount || 0);
    };

    // Format date
    const formatDate = (date) => {
        if (!date) return 'N/A';
        const d = date.toDate ? date.toDate() : new Date(date);
        return d.toLocaleDateString('de-CH', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    // Status Badge Component
    const StatusBadge = ({ status }) => {
        const config = statusConfig[status] || statusConfig.pending;
        const Icon = config.icon;

        return (
            <span className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                config.color
            )}>
                <Icon className="w-3.5 h-3.5" />
                {t(`payroll:status.${status}`, config.label)}
            </span>
        );
    };

    StatusBadge.propTypes = {
        status: PropTypes.string.isRequired
    };

    // Stats Card Component
    const StatCard = ({ icon: Icon, label, value, subValue, className }) => (
        <div className={cn(
            "bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow",
            className
        )}>
            <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="text-2xl font-bold text-foreground">{value}</p>
                    {subValue && (
                        <p className="text-xs text-muted-foreground mt-0.5">{subValue}</p>
                    )}
                </div>
            </div>
        </div>
    );

    StatCard.propTypes = {
        icon: PropTypes.elementType.isRequired,
        label: PropTypes.string.isRequired,
        value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        subValue: PropTypes.string,
        className: PropTypes.string
    };

    // Request Row Component
    const RequestRow = ({ request }) => (
        <tr
            className="border-b border-border hover:bg-muted/30 cursor-pointer transition-colors"
            onClick={() => handleOpenRequestDetails(request)}
        >
            <td className="px-4 py-3">
                <div className="font-medium text-foreground">{request.workerProfile?.fullName || t('payroll:placeholders.unknown')}</div>
                <div className="text-xs text-muted-foreground">{request.shiftDetails?.role || t('payroll:placeholders.pharmacist')}</div>
            </td>
            <td className="px-4 py-3">
                <div className="text-sm">{formatDate(request.shiftDetails?.date)}</div>
                <div className="text-xs text-muted-foreground">
                    {request.shiftDetails?.startTime} - {request.shiftDetails?.endTime}
                </div>
            </td>
            <td className="px-4 py-3">
                <div className="text-sm font-medium">{request.shiftDetails?.duration || 0}h</div>
            </td>
            <td className="px-4 py-3">
                <div className="text-sm font-medium text-foreground">{formatCurrency(request.financials?.totalCost)}</div>
                {request.financials?.isPilot && (
                    <div className="text-xs text-green-600">{t('payroll:details.suffixes.pilotFee')}</div>
                )}
            </td>
            <td className="px-4 py-3">
                <StatusBadge status={request.status} />
            </td>
            <td className="px-4 py-3 text-xs text-muted-foreground">
                {formatDate(request.createdAt)}
            </td>
        </tr>
    );

    RequestRow.propTypes = {
        request: PropTypes.shape({
            workerProfile: PropTypes.shape({
                fullName: PropTypes.string
            }),
            shiftDetails: PropTypes.shape({
                role: PropTypes.string,
                date: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
                startTime: PropTypes.string,
                endTime: PropTypes.string,
                duration: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
            }),
            financials: PropTypes.shape({
                totalCost: PropTypes.number,
                isPilot: PropTypes.bool
            }),
            status: PropTypes.string,
            createdAt: PropTypes.oneOfType([PropTypes.object, PropTypes.string])
        }).isRequired
    };

    // Detail Modal Component
    const RequestDetailModal = ({ request, onClose }) => {
        if (!request) return null;

        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-card rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="p-6 border-b border-border">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-foreground">
                                {t('payroll:details.title', 'Payroll Request Details')}
                            </h3>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-muted rounded-lg transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="mt-2">
                            <StatusBadge status={request.status} />
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                        {/* Worker Info */}
                        <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">
                                {t('payroll:details.worker', 'Worker')}
                            </h4>
                            <div className="bg-muted/30 rounded-lg p-4 border border-border">
                                <p className="font-medium">{request.workerProfile?.fullName}</p>
                                <p className="text-sm text-muted-foreground">{request.workerProfile?.email}</p>
                                {request.workerProfile?.glnNumber && (
                                    <p className="text-xs text-muted-foreground mt-1">GLN: {request.workerProfile.glnNumber}</p>
                                )}
                            </div>
                        </div>

                        {/* Shift Details */}
                        <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">
                                {t('payroll:details.shift', 'Shift Details')}
                            </h4>
                            <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">{t('payroll:details.labels.date')}:</span>
                                    <span>{formatDate(request.shiftDetails?.date)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">{t('payroll:details.labels.time')}:</span>
                                    <span>{request.shiftDetails?.startTime} - {request.shiftDetails?.endTime}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">{t('payroll:details.labels.duration')}:</span>
                                    <span>{request.shiftDetails?.duration} {t('payroll:details.suffixes.hours')}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">{t('payroll:details.labels.role')}:</span>
                                    <span>{request.shiftDetails?.role}</span>
                                </div>
                            </div>
                        </div>

                        {/* Financials */}
                        <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">
                                {t('payroll:details.financials', 'Financials')}
                            </h4>
                            <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">{t('payroll:details.labels.hourlyRate')}:</span>
                                    <span>{formatCurrency(request.financials?.hourlyRate)}{t('payroll:details.suffixes.perHour')}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">{t('payroll:details.labels.workerGrossPay')}:</span>
                                    <span>{formatCurrency(request.financials?.workerGrossPay)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">{t('payroll:details.labels.commission')} ({request.financials?.markup}%):</span>
                                    <span>{formatCurrency(request.financials?.commission)}</span>
                                </div>
                                <div className="flex justify-between pt-2 border-t border-border font-semibold">
                                    <span>{t('payroll:details.labels.totalCost')}:</span>
                                    <span className="text-primary">{formatCurrency(request.financials?.totalCost)}</span>
                                </div>
                                {request.financials?.isPilot && (
                                    <div className="text-center text-sm text-green-600 pt-2">
                                        ✨ {request.financials?.message}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* PayrollPlus Status */}
                        {request.payrollData?.emailSentAt && (
                            <div>
                                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                                    {t('payroll:details.payrollplus', 'PayrollPlus Status')}
                                </h4>
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <p className="text-sm text-green-800">
                                        {t('payroll:details.labels.emailSent')} {formatDate(request.payrollData.emailSentAt)}
                                    </p>
                                </div>
                            </div>
                        )}

                        {request.payrollData?.error && (
                            <div className="relative overflow-hidden p-5 bg-card border border-border rounded-xl hover:shadow-md transition-shadow flex gap-4 text-[var(--red-4)] animate-in fade-in slide-in-from-bottom-2">
                                <div className="flex-shrink-0">
                                    <div className="w-10 h-10 rounded-full bg-[var(--red-2)]/20 flex items-center justify-center border-2 border-[var(--red-2)]">
                                        <FiAlertCircle className="w-5 h-5 text-[var(--red-4)]" />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-sm mb-1 text-[var(--red-4)]">{t('payroll:details.labels.error')}</h4>
                                    <p className="text-sm leading-relaxed text-[var(--red-4)]/90">{request.payrollData.error}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-border">
                        <button
                            onClick={onClose}
                            className="w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                        >
                            {t('common:close', 'Close')}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    RequestDetailModal.propTypes = {
        request: PropTypes.object,
        onClose: PropTypes.func.isRequired
    };

    // Empty State
    const EmptyState = () => (
        <div className="dashboard-empty-state">
            <div className="dashboard-empty-state-card">
                <div className="dashboard-empty-state-icon">
                    <FiFileText className="w-8 h-8" />
                </div>
                <h2 className="dashboard-empty-state-title">
                    {t('payroll:empty.title', 'No payroll requests yet')}
                </h2>
                <p className="dashboard-empty-state-description">
                    {t('payroll:empty.description', 'When you confirm shifts with workers, payroll requests will appear here.')}
                </p>
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500">
            {!hideHeader && (
                <PageHeader
                    title={t('payroll:title', 'Payroll Management')}
                    subtitle={t('payroll:subtitle', 'Track and manage staff payment requests')}
                    actions={
                        <button
                            onClick={fetchPayrollRequests}
                            disabled={isLoading}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg border border-border",
                                "hover:bg-muted transition-colors",
                                isLoading && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            <FiRefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                            {t('common:refresh', 'Refresh')}
                        </button>
                    }
                />
            )}

            {!hideStats && (
                <div className="shrink-0 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            icon={FiFileText}
                            label={t('payroll:stats.total', 'Total Requests')}
                            value={stats.total}
                        />
                        <StatCard
                            icon={FiClock}
                            label={t('payroll:stats.pending', 'Pending')}
                            value={stats.pending || 0}
                        />
                        <StatCard
                            icon={FiSend}
                            label={t('payroll:stats.sent', 'Sent to PayrollPlus')}
                            value={stats.sent || 0}
                        />
                        <StatCard
                            icon={FiDollarSign}
                            label={t('payroll:stats.totalAmount', 'Total Amount')}
                            value={formatCurrency(stats.totalAmount)}
                            subValue={t('payroll:stats.allTime', 'All time')}
                        />
                    </div>
                </div>
            )}

            <div className="shrink-0 px-6 py-6">
                <FilterBar
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onClearFilters={handleClearFilters}
                    searchValue={searchTerm}
                    onSearchChange={setSearchTerm}
                    searchPlaceholder={t('payroll:searchPlaceholder', 'Search by worker name or role...')}
                    dropdownFields={[
                        {
                            key: 'status',
                            label: t('payroll:filter.status', 'Status'),
                            options: statusOptions,
                            defaultValue: 'all'
                        },
                        {
                            key: 'source',
                            label: t('payroll:filter.source', 'Source'),
                            options: [
                                { value: 'all', label: t('payroll:tabs.all', 'All') },
                                { value: 'team', label: t('payroll:tabs.team', 'Team') },
                                { value: 'medishift', label: t('payroll:tabs.medishift', 'Medishift') }
                            ],
                            defaultValue: 'all'
                        }
                    ]}
                    dateFields={[
                        {
                            key: 'fromDate',
                            label: t('payroll:filter.fromDate', 'From Date'),
                            showClearButton: true
                        },
                        {
                            key: 'toDate',
                            label: t('payroll:filter.toDate', 'To Date'),
                            showClearButton: true
                        }
                    ]}
                    showViewToggle={true}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    sortOptions={[
                        { value: 'date', label: t('payroll:sort.date', 'Date') },
                        { value: 'name', label: t('payroll:sort.name', 'Name') },
                        { value: 'amount', label: t('payroll:sort.amount', 'Amount') }
                    ]}
                    sortValue={sortBy}
                    onSortChange={setSortBy}
                    translationNamespace="payroll"
                    title={t('payroll:info.title', 'Payroll Management')}
                    description={t('payroll:info.description', 'Track and manage all payments and salaries.')}
                    onRefresh={fetchPayrollRequests}
                    isLoading={isLoading}
                />
            </div>

            {/* Content */}
            <div className={cn("flex-1 overflow-auto", hideHeader ? "" : "px-6 pb-6")}>
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filteredAndSortedRequests.length === 0 ? (
                    <div className="dashboard-empty-state">
                        <div className="dashboard-empty-state-card">
                            <div className="dashboard-empty-state-icon">
                                <FiFileText className="w-8 h-8" />
                            </div>
                            <h2 className="dashboard-empty-state-title">
                                {t('payroll:empty.title', 'No payroll requests found')}
                            </h2>
                            <p className="dashboard-empty-state-description">
                                {t('payroll:empty.description', 'No payroll requests available at the moment')}
                            </p>
                        </div>
                    </div>
                ) : viewMode === 'list' ? (
                    <div className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow">
                        <table className="w-full">
                            <thead className="bg-muted/30">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                        {t('payroll:table.worker', 'Worker')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                        {t('payroll:table.shift', 'Shift')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                        {t('payroll:table.hours', 'Hours')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                        {t('payroll:table.amount', 'Amount')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                        {t('payroll:table.status', 'Status')}
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                                        {t('payroll:table.created', 'Created')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAndSortedRequests.map((request) => (
                                    <RequestRow key={request.id} request={request} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredAndSortedRequests.map((request) => (
                            <div
                                key={request.id}
                                className="bg-card border border-border rounded-lg hover:border-primary/50 transition-colors p-4 cursor-pointer"
                                onClick={() => handleOpenRequestDetails(request)}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <h4 className="font-medium text-foreground mb-1">
                                            {request.workerProfile?.fullName || t('payroll:placeholders.unknown')}
                                        </h4>
                                        <p className="text-xs text-muted-foreground">
                                            {request.shiftDetails?.role || t('payroll:placeholders.pharmacist')}
                                        </p>
                                    </div>
                                    <StatusBadge status={request.status} />
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">{t('payroll:table.shift', 'Shift')}:</span>
                                        <span>{formatDate(request.shiftDetails?.date)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">{t('payroll:table.hours', 'Hours')}:</span>
                                        <span>{request.shiftDetails?.duration || 0}h</span>
                                    </div>
                                    <div className="flex justify-between font-medium">
                                        <span className="text-muted-foreground">{t('payroll:table.amount', 'Amount')}:</span>
                                        <span className="text-foreground">{formatCurrency(request.financials?.totalCost)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedRequest && (
                <RequestDetailModal
                    request={selectedRequest}
                    onClose={handleCloseModal}
                />
            )}
        </div>
    );
};

PayrollDashboard.propTypes = {
    hideHeader: PropTypes.bool,
    hideStats: PropTypes.bool
};

export default PayrollDashboard;
