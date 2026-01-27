import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    FiMessageSquare,
    FiBarChart2,
    FiPlus,
    FiShield
} from 'react-icons/fi';
import FilterBar from '../../components/FilterBar/FilterBar';
import { useDashboard } from '../../contexts/DashboardContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { buildDashboardUrl, getWorkspaceIdForUrl } from '../../../config/routeUtils';
import supportTicketService from '../../../services/supportTicketService';
import Dialog from '../../../components/Dialog/Dialog';
import InputField from '../../../components/BoxedInputFields/Personnalized-InputField';
import InputFieldParagraph from '../../../components/BoxedInputFields/TextareaField';
import SimpleDropdown from '../../../components/BoxedInputFields/Dropdown-Field';
import BoxedSwitchField from '../../../components/BoxedInputFields/BoxedSwitchField';
import { cn } from '../../../utils/cn';
import {
    getInitialReportingFormData,
    resetReportingFormData,
    handleCloseReportingPopup,
    isFormValid
} from './utils/ticketPopupUtils';

const categoryLabels = {
    'Leave Request': 'Leave Request',
    'Sick Leave': 'Sick Leave',
    'Appointment': 'Appointment',
    'Meeting': 'Meeting',
    'Schedule': 'Schedule',
    'Other': 'Other',
};


const ReportingPage = ({ hideHeader }) => {
    const { t } = useTranslation(['messages']);
    const { showError, showSuccess } = useNotification();
    const { user, selectedWorkspace } = useDashboard();
    const navigate = useNavigate();
    const location = useLocation();
    const workspaceId = getWorkspaceIdForUrl(selectedWorkspace);

    const [tickets, setTickets] = useState([]);
    const [, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sortBy, setSortBy] = useState('date');
    const [viewMode, setViewMode] = useState('list');
    const [filters, setFilters] = useState({
        category: 'all',
        fromDate: '',
        toDate: ''
    });

    const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false);
    const [createFormData, setCreateFormData] = useState(getInitialReportingFormData());
    const [isCreating, setIsCreating] = useState(false);

    const loadTickets = useCallback(async () => {
        if (!user?.uid) {
            setTickets([]);
            setIsLoading(false);
            return;
        }
        
        try {
            setIsLoading(true);
            const data = await supportTicketService.LIST_MY_TICKETS(user.uid);
            setTickets(data.filter(ticket => ticket.isAnonymous === true));
            setIsLoading(false);
        } catch (error) {
            console.error('Error loading tickets:', error);
            showError('Failed to load reports');
            setIsLoading(false);
        }
    }, [user, showError]);

    useEffect(() => {
        loadTickets();
    }, [loadTickets]);


    useEffect(() => {
        const pathSegments = location.pathname.split('/');
        const lastSegment = pathSegments[pathSegments.length - 1];
        if (lastSegment === 'new') {
            setIsCreateTicketOpen(true);
        } else {
            setIsCreateTicketOpen(false);
        }

        const handleOpenModal = (event) => {
            if (event.detail?.type === 'createTicket' || event.detail?.action === 'create') {
                navigate(buildDashboardUrl('/communications/reporting/new', workspaceId));
            }
        };

        window.addEventListener('openModal', handleOpenModal);
        return () => window.removeEventListener('openModal', handleOpenModal);
    }, [location.pathname, navigate, workspaceId]);

    const handleCreateTicket = async () => {
        if (!isFormValid(createFormData)) {
            showError('Please fill in all required fields');
            return;
        }

        try {
            setIsCreating(true);
            const ticketData = {
                subject: createFormData.subject,
                message: createFormData.message,
                category: createFormData.category,
                priority: createFormData.priority,
                workspace: selectedWorkspace?.id || null,
                facilityId: selectedWorkspace?.facilityId || null,
                organizationId: selectedWorkspace?.organizationId || null,
                isAnonymous: createFormData.isAnonymous
            };

            await supportTicketService.CREATE_TICKET(ticketData, user);
            showSuccess('Ticket created successfully');
            setIsCreateTicketOpen(false);
            resetReportingFormData(setCreateFormData);
            navigate(buildDashboardUrl('/communications/reporting', workspaceId));
            loadTickets();
        } catch (error) {
            console.error('Error creating ticket:', error);
            showError('Failed to create ticket');
        } finally {
            setIsCreating(false);
        }
    };

    const filteredTickets = useMemo(() => {
        let currentTickets = tickets;

        if (filters.category !== 'all') {
            currentTickets = currentTickets.filter(t => t.category === filters.category);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            currentTickets = currentTickets.filter(t =>
                t.subject.toLowerCase().includes(query) ||
                t.message.toLowerCase().includes(query) ||
                (t.userName || '').toLowerCase().includes(query)
            );
        }

        if (filters.fromDate || filters.toDate) {
            currentTickets = currentTickets.filter(t => {
                const ticketDate = t.createdAt ? (t.createdAt.toDate ? t.createdAt.toDate() : new Date(t.createdAt)) : null;
                if (!ticketDate) return false;
                if (filters.fromDate) {
                    const fromDate = new Date(filters.fromDate);
                    fromDate.setHours(0, 0, 0, 0);
                    if (ticketDate < fromDate) return false;
                }
                if (filters.toDate) {
                    const toDate = new Date(filters.toDate);
                    toDate.setHours(23, 59, 59, 999);
                    if (ticketDate > toDate) return false;
                }
                return true;
            });
        }

        if (sortBy === 'date') {
            currentTickets.sort((a, b) => {
                const dateA = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt)) : new Date(0);
                const dateB = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt)) : new Date(0);
                return dateB - dateA;
            });
        } else if (sortBy === 'title') {
            currentTickets.sort((a, b) => {
                const titleA = (a.subject || '').toLowerCase();
                const titleB = (b.subject || '').toLowerCase();
                return titleA.localeCompare(titleB);
            });
        } else if (sortBy === 'priority') {
            const priorityOrder = { Emergency: 0, Urgent: 1, Normal: 2, emergency: 0, urgent: 1, normal: 2, medium: 2 };
            currentTickets.sort((a, b) => {
                const priorityA = priorityOrder[a.priority] ?? 99;
                const priorityB = priorityOrder[b.priority] ?? 99;
                return priorityA - priorityB;
            });
        }

        return currentTickets;
    }, [tickets, filters, searchQuery, sortBy]);

    return (
        <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500">
            {!hideHeader && (
                <div className="shrink-0 pt-4 border-b border-border bg-card/30">
                    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8">
                        <h1 className="text-xl font-semibold text-foreground mb-3">
                            {t('messages:title', 'Communications')}
                        </h1>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-auto">
                <div className="w-full max-w-[1400px] mx-auto flex-1 flex flex-col pt-6 px-6">
                    <div className="space-y-6">
                        <FilterBar
                            filters={filters}
                            onFilterChange={(key, value) => {
                                setFilters(prev => ({ ...prev, [key]: value }));
                                if (key === 'category') {
                                    setSelectedCategory(value);
                                }
                            }}
                            onClearFilters={() => {
                                setFilters({ category: 'all', fromDate: '', toDate: '' });
                                setSelectedCategory('all');
                                setSearchQuery('');
                            }}
                            searchValue={searchQuery}
                            onSearchChange={setSearchQuery}
                            searchPlaceholder={t('messages:reporting.searchPlaceholder', 'Search tickets...')}
                            dropdownFields={[
                                {
                                    key: 'category',
                                    label: t('messages:reporting.filter', 'Filter by Category'),
                                    options: [
                                        { value: 'all', label: t('messages:reporting.allCategories', 'All Categories') },
                                        ...Object.keys(categoryLabels).map(cat => ({
                                            value: cat,
                                            label: categoryLabels[cat]
                                        }))
                                    ],
                                    defaultValue: 'all'
                                }
                            ]}
                            dateFields={[
                                {
                                    key: 'fromDate',
                                    label: t('messages:reporting.fromDate', 'From Date'),
                                    showClearButton: true
                                },
                                {
                                    key: 'toDate',
                                    label: t('messages:reporting.toDate', 'To Date'),
                                    showClearButton: true
                                }
                            ]}
                            sortOptions={[
                                { value: 'date', label: t('messages:reporting.sort.date', 'Date') },
                                { value: 'title', label: t('messages:reporting.sort.title', 'Title') },
                                { value: 'priority', label: t('messages:reporting.sort.priority', 'Priority') }
                            ]}
                            sortValue={sortBy}
                            onSortChange={setSortBy}
                            showViewToggle={true}
                            viewMode={viewMode}
                            onViewModeChange={setViewMode}
                            title={t('messages:reporting.title', 'Anonymous Reports')}
                            description={t('messages:reporting.description', 'Submit confidential reports. Your identity will remain anonymous.')}
                            onRefresh={loadTickets}
                            onAdd={() => navigate(buildDashboardUrl('/communications/reporting/new', workspaceId))}
                            addLabel={t('messages:reporting.submitReport', 'Submit Report')}
                            isLoading={isLoading}
                            translationNamespace="messages"
                        />

                        <div>
                            {isLoading && tickets.length === 0 ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : filteredTickets.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                                        <FiShield className="w-8 h-8 text-muted-foreground/50" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-foreground mb-2">
                                        {t('messages:reporting.noReports', 'No reports found')}
                                    </h3>
                                    <p className="text-muted-foreground mb-6">
                                        {t('messages:reporting.noReportsHint', 'Get started by submitting an anonymous report.')}
                                    </p>
                                    <button
                                        onClick={() => navigate(buildDashboardUrl('/communications/reporting/new', workspaceId))}
                                        className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center gap-2"
                                    >
                                        <FiPlus className="w-5 h-5" />
                                        {t('messages:reporting.submitReport', 'Submit Report')}
                                    </button>
                                </div>
                            ) : (
                                filteredTickets.map(ticket => (
                                    <div
                                        key={ticket.id}
                                        className="group bg-card hover:bg-card/80 border border-border/50 hover:border-primary/20 rounded-2xl p-6 cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md"
                                    >
                                        <div className="flex items-start justify-between gap-4 mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold border border-border">
                                                    {(ticket.userName || 'A').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-foreground flex items-center gap-2">
                                                        {ticket.isAnonymous ? t('messages:reporting.anonymous', 'Anonymous') : (ticket.userName || 'User')}
                                                        {ticket.isAnonymous && (
                                                            <span className="bg-blue-500/10 text-blue-600 text-[10px] px-2 py-0.5 rounded-full border border-blue-500/20 flex items-center gap-1">
                                                                <FiShield className="w-3 h-3" /> Anonymous
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {ticket.createdAt ? new Date(ticket.createdAt.toDate?.() || ticket.createdAt).toLocaleDateString() : 'Just now'} · {categoryLabels[ticket.category] || ticket.category || 'Other'} · {ticket.status || 'open'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors line-clamp-1">{ticket.subject}</h3>
                                        <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed mb-4">{ticket.message}</p>

                                        <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
                                            <div className={cn(
                                                "flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary/50",
                                                (ticket.priority === 'Emergency' || ticket.priority === 'emergent') && "text-red-600 bg-red-500/10 border border-red-500/20",
                                                (ticket.priority === 'Urgent' || ticket.priority === 'urgent') && "text-orange-500 bg-orange-500/10 border border-orange-500/20",
                                                (ticket.priority === 'Normal' || ticket.priority === 'normal' || ticket.priority === 'medium') && "text-blue-500 bg-blue-500/10 border border-blue-500/20"
                                            )}>
                                                <FiBarChart2 className="w-3.5 h-3.5" />
                                                <span>{ticket.priority || 'Normal'}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary/50">
                                                <FiMessageSquare className="w-3.5 h-3.5" />
                                                <span>{ticket.responses?.length || 0} {ticket.responses?.length === 1 ? 'response' : 'responses'}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <Dialog
                isOpen={isCreateTicketOpen}
                onClose={() => {
                    handleCloseReportingPopup(setIsCreateTicketOpen, setCreateFormData, isCreating);
                    navigate(buildDashboardUrl('/communications/reporting', workspaceId));
                }}
                title={t('messages:reporting.submitReport', 'Submit Anonymous Report')}
                size="small"
                closeOnBackdropClick={!isCreating}
                actions={
                    <div className="flex justify-between gap-3 w-full">
                        <button
                            onClick={() => {
                                handleCloseReportingPopup(setIsCreateTicketOpen, setCreateFormData, isCreating);
                                navigate(buildDashboardUrl('/communications/reporting', workspaceId));
                            }}
                            disabled={isCreating}
                            className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {t('common:cancel', 'Cancel')}
                        </button>
                        <button
                            onClick={handleCreateTicket}
                            disabled={!isFormValid(createFormData) || isCreating}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isCreating
                                ? t('common:creating', 'Submitting...')
                                : t('messages:reporting.submitReport', 'Submit Report')}
                        </button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <div className="mt-4">
                        <SimpleDropdown
                            label={t('messages:reporting.priority', 'Priority')}
                            options={[
                                { value: 'Emergency', label: 'Emergency' },
                                { value: 'Urgent', label: 'Urgent' },
                                { value: 'Normal', label: 'Normal' }
                            ]}
                            value={createFormData.priority}
                            onChange={(value) => setCreateFormData({ ...createFormData, priority: value })}
                            disabled={isCreating}
                        />
                    </div>

                    <InputField
                        label={t('messages:reporting.subject', 'Subject')}
                        value={createFormData.subject}
                        onChange={(e) => setCreateFormData({ ...createFormData, subject: e.target.value })}
                        placeholder={t('messages:reporting.subjectPlaceholder', 'Enter ticket subject...')}
                        required
                        disabled={isCreating}
                        name="ticketSubject"
                    />

                    <SimpleDropdown
                        label={t('messages:reporting.category', 'Category')}
                        options={[
                            { value: 'Leave Request', label: categoryLabels['Leave Request'] },
                            { value: 'Sick Leave', label: categoryLabels['Sick Leave'] },
                            { value: 'Appointment', label: categoryLabels['Appointment'] },
                            { value: 'Meeting', label: categoryLabels['Meeting'] },
                            { value: 'Schedule', label: categoryLabels['Schedule'] },
                            { value: 'Other', label: categoryLabels['Other'] },
                        ]}
                        value={createFormData.category}
                        onChange={(value) => setCreateFormData({ ...createFormData, category: value })}
                        disabled={isCreating}
                    />

                    <InputFieldParagraph
                        label={t('messages:reporting.message', 'Message')}
                        value={createFormData.message}
                        onChange={(e) => setCreateFormData({ ...createFormData, message: e.target.value })}
                        placeholder={t('messages:reporting.messagePlaceholder', 'Describe your issue or report...')}
                        rows={5}
                        disabled={isCreating}
                        name="ticketMessage"
                        required
                    />

                    <BoxedSwitchField
                        label={t('messages:reporting.anonymousReporting', 'Submit as Anonymous Report')}
                        checked={createFormData.isAnonymous}
                        onChange={(checked) => setCreateFormData({ ...createFormData, isAnonymous: checked })}
                        disabled={isCreating}
                    />
                </div>
            </Dialog>
        </div>
    );
};

export default ReportingPage;

