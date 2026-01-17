import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../services/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { FiDollarSign, FiClock, FiCheckCircle, FiAlertCircle, FiRefreshCw, FiFileText, FiSend } from 'react-icons/fi';
import { cn } from '../../../utils/cn';

// Status badge colors
const statusConfig = {
    pending: { color: 'bg-transparent text-yellow-700 border-yellow-700', icon: FiClock, label: 'Pending' },
    sent: { color: 'bg-transparent text-blue-700 border-blue-700', icon: FiSend, label: 'Sent to PayrollPlus' },
    confirmed: { color: 'bg-transparent text-green-700 border-green-700', icon: FiCheckCircle, label: 'Confirmed' },
    paid: { color: 'bg-transparent text-emerald-700 border-emerald-700', icon: FiCheckCircle, label: 'Paid' },
    failed: { color: 'bg-transparent text-red-700 border-red-700', icon: FiAlertCircle, label: 'Failed' }
};

const PayrollDashboard = () => {
    const { t } = useTranslation(['payroll', 'common']);
    const { currentUser } = useAuth();
    const { showNotification } = useNotification();

    const [payrollRequests, setPayrollRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [filter, setFilter] = useState('all');
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        sent: 0,
        confirmed: 0,
        totalAmount: 0
    });

    // Fetch payroll requests
    const fetchPayrollRequests = useCallback(async () => {
        if (!currentUser) return;

        setIsLoading(true);
        try {
            const getPayrollRequestsFn = httpsCallable(functions, 'getPayrollRequests');
            const result = await getPayrollRequestsFn({
                status: filter === 'all' ? null : filter,
                limit: 100
            });

            if (result.data.success) {
                const requests = result.data.requests || [];
                setPayrollRequests(requests);

                // Calculate stats
                const newStats = requests.reduce((acc, req) => {
                    acc.total++;
                    acc[req.status] = (acc[req.status] || 0) + 1;
                    acc.totalAmount += req.financials?.totalCost || 0;
                    return acc;
                }, { total: 0, pending: 0, sent: 0, confirmed: 0, paid: 0, totalAmount: 0 });

                setStats(newStats);
            }
        } catch (error) {
            console.error('Error fetching payroll requests:', error);
            showNotification(t('payroll:errors.fetchFailed', 'Failed to load payroll requests'), 'error');
        } finally {
            setIsLoading(false);
        }
    }, [currentUser, filter, showNotification, t]);

    useEffect(() => {
        fetchPayrollRequests();
    }, [fetchPayrollRequests]);

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
            "bg-card rounded-xl border border-border p-5 shadow-sm",
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
            onClick={() => setSelectedRequest(request)}
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
                            <h3 className="text-xl font-semibold text-foreground">
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
                            <div className="bg-muted/30 rounded-lg p-4">
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
                            <div className="relative overflow-hidden p-5 bg-white border-2 border-[var(--red-2)] rounded-xl shadow-lg flex gap-4 text-[var(--red-4)] animate-in fade-in slide-in-from-bottom-2" style={{ boxShadow: 'var(--shadow-elevated)' }}>
                                <div className="flex-shrink-0">
                                    <div className="w-10 h-10 rounded-full bg-[var(--red-2)]/20 flex items-center justify-center border-2 border-[var(--red-2)]">
                                        <FiAlertCircle className="w-5 h-5 text-[var(--red-4)]" />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-sm mb-1 text-[var(--red-4)]">{t('payroll:details.labels.error')}</h4>
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
        <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                <FiFileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
                {t('payroll:empty.title', 'No payroll requests yet')}
            </h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
                {t('payroll:empty.description', 'When you confirm shifts with workers, payroll requests will appear here.')}
            </p>
        </div>
    );

    return (
        <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500">
            {/* Header */}
            <div className="shrink-0 p-6 border-b border-border bg-card/50">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            {t('payroll:title', 'Payroll Management')}
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            {t('payroll:subtitle', 'Track and manage staff payment requests')}
                        </p>
                    </div>
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
                </div>
            </div>

            {/* Stats Cards */}
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

            {/* Filter Tabs */}
            <div className="shrink-0 px-6">
                <div className="flex gap-2 border-b border-border">
                    {['all', 'pending', 'sent', 'confirmed', 'paid'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={cn(
                                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                                filter === status
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {t(`payroll:filter.${status}`, status.charAt(0).toUpperCase() + status.slice(1))}
                            {status !== 'all' && stats[status] > 0 && (
                                <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-muted">
                                    {stats[status]}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : payrollRequests.length === 0 ? (
                    <EmptyState />
                ) : (
                    <div className="bg-card rounded-xl border border-border overflow-hidden">
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
                                {payrollRequests.map((request) => (
                                    <RequestRow key={request.id} request={request} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedRequest && (
                <RequestDetailModal
                    request={selectedRequest}
                    onClose={() => setSelectedRequest(null)}
                />
            )}

            {/* Pilot Mode Banner */}
            <div className="shrink-0 px-6 pb-6">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-green-100">
                            <span className="text-xl">🎉</span>
                        </div>
                        <div>
                            <h4 className="font-medium text-green-800">
                                {t('payroll:pilot.title', 'Pilot Program Active')}
                            </h4>
                            <p className="text-sm text-green-700">
                                {t('payroll:pilot.description', 'You\'re currently enjoying 0% platform fees until February 28, 2025!')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PayrollDashboard;
