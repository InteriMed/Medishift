import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../services/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { useDashboard } from '../../contexts/DashboardContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { FiDollarSign, FiClock, FiCheckCircle, FiAlertCircle, FiRefreshCw, FiFileText, FiSend, FiGrid, FiList, FiSearch, FiArrowDown, FiSliders, FiCheck, FiUserPlus, FiUsers, FiBriefcase } from 'react-icons/fi';
import { cn } from '../../../utils/cn';
import PageHeader from '../../components/PageHeader/PageHeader';
import DateField from '../../../components/BoxedInputFields/DateField';
import SimpleDropdown from '../../../components/BoxedInputFields/Dropdown-Field';

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
    const [activeTab, setActiveTab] = useState('team');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('date');
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const [viewMode, setViewMode] = useState('list');
    const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
    const [justExpanded, setJustExpanded] = useState(false);
    const [showActiveFilters, setShowActiveFilters] = useState(false);
    const [filters, setFilters] = useState({
        status: 'all',
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

    const tabs = [
        { id: 'team', label: t('payroll:tabs.team', 'Team'), icon: FiUsers },
        { id: 'medishift', label: t('payroll:tabs.medishift', 'Medishift'), icon: FiBriefcase },
        { id: 'all', label: t('payroll:tabs.all', 'All'), icon: FiGrid }
    ];

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

    const activeCount = (filters.status !== 'all' ? 1 : 0) + (filters.fromDate ? 1 : 0) + (filters.toDate ? 1 : 0);

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

        if (activeTab !== 'all') {
            if (activeTab === 'team') {
                result = result.filter(req => req.source === 'team' || !req.source);
            } else if (activeTab === 'medishift') {
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
    }, [payrollRequests, activeTab, searchTerm, filters, sortBy]);

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

            {/* Tabs */}
            <div className="shrink-0">
                <div className="flex gap-2 border-b border-border overflow-x-auto max-w-[1400px] mx-auto px-6">
                    {tabs.map((tab) => {
                        const TabIcon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                                    "touch-manipulation active:scale-95",
                                    activeTab === tab.id
                                        ? "border-primary text-primary bg-primary/5"
                                        : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
                                )}
                                title={tab.label}
                            >
                                <TabIcon className="w-4 h-4 shrink-0" />
                                <span className="text-xs sm:text-sm min-w-0">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Filter Section */}
            <div className="shrink-0 px-6 py-6">
                <div 
                    className={cn(
                        "bg-card rounded-xl border border-border hover:shadow-md transition-shadow w-full payroll-filter-card",
                        isFiltersExpanded ? 'px-6 py-3' : 'px-6 py-2'
                    )}
                    onMouseDown={(e) => {
                        if (e.target.closest('button[title="Parameters"]')) {
                            e.stopPropagation();
                        }
                    }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-semibold text-foreground">
                            {t('payroll:info.title', 'Payroll Management')}
                        </h3>
                        <button
                            onClick={fetchPayrollRequests}
                            disabled={isLoading}
                            className={cn(
                                "px-4 rounded-xl border-2 border-input bg-background text-muted-foreground hover:text-foreground hover:border-muted-foreground/30 text-sm font-medium transition-all flex items-center gap-2 shrink-0",
                                isLoading && "opacity-50 cursor-not-allowed"
                            )}
                            style={{ height: 'var(--boxed-inputfield-height)' }}
                        >
                            <FiRefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                            {t('common:refresh', 'Refresh')}
                        </button>
                    </div>
                    <div className="pt-3 border-t border-border mb-4">
                        <p className="text-sm text-muted-foreground">
                            {t('payroll:info.description', 'Track and manage all payments and salaries.')}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 w-full">
                        <div className="relative flex-1 min-w-[200px]">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder={t('payroll:searchPlaceholder', 'Search by worker name or role...')}
                                className="w-full pl-9 pr-8 rounded-xl border-2 border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-0 focus:shadow-[0_0_0_4px_rgba(79,70,229,0.1)] transition-all hover:border-muted-foreground/30 hover:bg-muted/30"
                                style={{
                                    height: 'var(--boxed-inputfield-height)',
                                    fontWeight: '500',
                                    fontFamily: 'var(--font-family-text, Roboto, sans-serif)',
                                    color: 'var(--boxed-inputfield-color-text)'
                                }}
                            />
                        </div>

                        <div className="relative shrink-0 w-[218px]">
                            <DateField
                                label="From"
                                value={filters.fromDate ? new Date(filters.fromDate) : null}
                                onChange={(date) => handleFilterChange('fromDate', date ? date.toISOString().split('T')[0] : '')}
                                marginBottom="0"
                                showClearButton={true}
                            />
                        </div>

                        <div className="relative shrink-0 w-[218px]">
                            <DateField
                                label="To"
                                value={filters.toDate ? new Date(filters.toDate) : null}
                                onChange={(date) => handleFilterChange('toDate', date ? date.toISOString().split('T')[0] : '')}
                                marginBottom="0"
                                showClearButton={true}
                            />
                        </div>

                        <div className="relative shrink-0">
                            <button
                                onClick={() => setShowSortDropdown(!showSortDropdown)}
                                className="px-4 rounded-xl border-2 border-input bg-background text-muted-foreground hover:text-foreground hover:border-muted-foreground/30 text-sm font-medium transition-all flex items-center gap-2 shrink-0"
                                style={{ height: 'var(--boxed-inputfield-height)' }}
                            >
                                <FiArrowDown className="w-4 h-4" />
                                {t('payroll:sortBy', 'Sort by')}
                            </button>
                            {showSortDropdown && (
                                <>
                                    <div 
                                        className="fixed inset-0 z-10" 
                                        onClick={() => setShowSortDropdown(false)}
                                    />
                                    <div className="absolute top-full mt-2 right-0 z-20 bg-card border border-border rounded-lg shadow-lg min-w-[180px]">
                                        <button
                                            onClick={() => {
                                                setSortBy('date');
                                                setShowSortDropdown(false);
                                            }}
                                            className={cn(
                                                "w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors",
                                                sortBy === 'date' && "bg-muted"
                                            )}
                                        >
                                            {t('payroll:sort.date', 'Date')}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSortBy('name');
                                                setShowSortDropdown(false);
                                            }}
                                            className={cn(
                                                "w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors",
                                                sortBy === 'name' && "bg-muted"
                                            )}
                                        >
                                            {t('payroll:sort.name', 'Name')}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSortBy('amount');
                                                setShowSortDropdown(false);
                                            }}
                                            className={cn(
                                                "w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors",
                                                sortBy === 'amount' && "bg-muted"
                                            )}
                                        >
                                            {t('payroll:sort.amount', 'Amount')}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const willExpand = !isFiltersExpanded;
                                setIsFiltersExpanded(willExpand);
                                if (willExpand) {
                                    setJustExpanded(true);
                                    setTimeout(() => {
                                        setJustExpanded(false);
                                    }, 150);
                                }
                            }}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                            }}
                            className={cn(
                                "flex items-center justify-center rounded-xl border-2 transition-all relative shrink-0",
                                isFiltersExpanded
                                    ? "bg-[var(--color-logo-1)] border-[var(--color-logo-1)] text-white"
                                    : "bg-background border-input text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                            )}
                            style={{ height: 'var(--boxed-inputfield-height)', width: 'var(--boxed-inputfield-height)' }}
                            title="Parameters"
                        >
                            <FiSliders className={`w-4 h-4 ${isFiltersExpanded ? 'text-white' : ''}`} />
                            {activeCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
                                    {activeCount}
                                </span>
                            )}
                        </button>

                        <div className="flex items-center gap-1 border-2 border-input rounded-xl p-0.5 bg-background shrink-0" style={{ height: 'var(--boxed-inputfield-height)' }}>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={cn(
                                    "h-full aspect-square flex items-center justify-center rounded-lg transition-all",
                                    viewMode === 'grid'
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                )}
                                title={t('payroll:view.grid', 'Grid view')}
                            >
                                <FiGrid className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={cn(
                                    "h-full aspect-square flex items-center justify-center rounded-lg transition-all",
                                    viewMode === 'list'
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                )}
                                title={t('payroll:view.list', 'List view')}
                            >
                                <FiList className="w-4 h-4" />
                            </button>
                        </div>

                        {isFiltersExpanded && (
                            <div 
                                className="mt-3 pt-3 border-t border-border animate-in slide-in-from-top-1 duration-200 w-full"
                                style={{ pointerEvents: justExpanded ? 'none' : 'auto' }}
                                onMouseDown={(e) => {
                                    if (justExpanded) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        return;
                                    }
                                }}
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 pb-1">
                                    <SimpleDropdown
                                        label={t('payroll:filter.status', 'Status')}
                                        options={statusOptions}
                                        value={filters.status}
                                        onChange={(value) => handleFilterChange('status', value)}
                                    />
                                </div>
                                {activeCount > 0 && (
                                    <div className="mt-3 pt-3 border-t border-border w-full">
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => {
                                                    setShowActiveFilters(!showActiveFilters);
                                                }}
                                                className="px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all shadow-sm flex items-center gap-2 shrink-0"
                                                style={{ height: 'var(--boxed-inputfield-height)' }}
                                            >
                                                <FiCheck className="w-4 h-4" />
                                                {t('payroll:filter.apply', 'Apply Filters')}
                                            </button>

                                            {showActiveFilters && (
                                                <div className="flex-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground animate-in fade-in slide-in-from-left-1 duration-200">
                                                    {filters.status !== 'all' && (
                                                        <span className="px-2 py-1 rounded-md bg-muted border border-border">
                                                            {t('payroll:filter.status', 'Status')}: {statusOptions.find(o => o.value === filters.status)?.label}
                                                        </span>
                                                    )}
                                                    {filters.fromDate && (
                                                        <span className="px-2 py-1 rounded-md bg-muted border border-border">
                                                            From: {new Date(filters.fromDate).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                    {filters.toDate && (
                                                        <span className="px-2 py-1 rounded-md bg-muted border border-border">
                                                            To: {new Date(filters.toDate).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
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
