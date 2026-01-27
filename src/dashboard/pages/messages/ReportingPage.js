import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    FiMessageSquare,
    FiBarChart2,
    FiHeart,
    FiPlus,
    FiX,
    FiShield,
    FiAlertCircle,
    FiSearch,
    FiSliders,
    FiFileText
} from 'react-icons/fi';
import { useDashboard } from '../../contexts/DashboardContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { buildDashboardUrl, getWorkspaceIdForUrl } from '../../utils/pathUtils';
import supportTicketService from '../../../services/supportTicketService';
import LoadingSpinner from '../../../components/LoadingSpinner/LoadingSpinner';
import Dialog from '../../../components/Dialog/Dialog';
import InputField from '../../../components/BoxedInputFields/Personnalized-InputField';
import InputFieldParagraph from '../../../components/BoxedInputFields/TextareaField';
import SimpleDropdown from '../../../components/BoxedInputFields/Dropdown-Field';
import BoxedSwitchField from '../../../components/BoxedInputFields/BoxedSwitchField';
import { cn } from '../../../utils/cn';
import { FiMessageSquare as FiMessageSquareIcon, FiBell } from 'react-icons/fi';
import {
    getInitialReportingFormData,
    resetReportingFormData,
    handleCloseReportingPopup,
    isFormValid
} from './utils/ticketPopupUtils';

const categoryLabels = {
    feedback: 'Feedback',
    bug_report: 'Bug Report',
    feature_request: 'Feature Request',
    support: 'Support',
    question: 'Question',
    general: 'General',
    reporting: 'Reporting',
    incident: 'Incident',
    compliance: 'Compliance',
};

const ReportingPage = () => {
    const { t } = useTranslation(['messages']);
    const { showError, showSuccess } = useNotification();
    const { user, selectedWorkspace } = useDashboard();
    const navigate = useNavigate();
    const location = useLocation();
    const workspaceId = getWorkspaceIdForUrl(selectedWorkspace);

    const [tickets, setTickets] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedTicketId, setSelectedTicketId] = useState(null);

    const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false);
    const [createFormData, setCreateFormData] = useState(getInitialReportingFormData());
    const [isCreating, setIsCreating] = useState(false);
    const [showFiltersOverlay, setShowFiltersOverlay] = useState(false);
    const filterDropdownRef = useRef(null);

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
        const handleClickOutside = (event) => {
            if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
                setShowFiltersOverlay(false);
            }
        };

        if (showFiltersOverlay) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showFiltersOverlay]);

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
                navigate(buildDashboardUrl('/reporting/new', workspaceId));
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
            navigate(buildDashboardUrl('/reporting', workspaceId));
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

        if (selectedCategory !== 'all') {
            currentTickets = currentTickets.filter(t => t.category === selectedCategory);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            currentTickets = currentTickets.filter(t =>
                t.subject.toLowerCase().includes(query) ||
                t.message.toLowerCase().includes(query) ||
                (t.userName || '').toLowerCase().includes(query)
            );
        }

        return currentTickets;
    }, [tickets, selectedCategory, searchQuery]);

    const handleNavigateToMessages = useCallback(() => {
        if (selectedWorkspace) {
            const workspaceId = getWorkspaceIdForUrl(selectedWorkspace);
            navigate(buildDashboardUrl('/messages', workspaceId));
        }
    }, [navigate, selectedWorkspace]);

    const handleNavigateToAnnouncements = useCallback(() => {
        if (selectedWorkspace) {
            const workspaceId = getWorkspaceIdForUrl(selectedWorkspace);
            navigate(buildDashboardUrl('/announcements', workspaceId));
        }
    }, [navigate, selectedWorkspace]);

    const handleNavigateToInternalTicket = useCallback(() => {
        if (selectedWorkspace) {
            const workspaceId = getWorkspaceIdForUrl(selectedWorkspace);
            navigate(buildDashboardUrl('/internal-ticket', workspaceId));
        }
    }, [navigate, selectedWorkspace]);

    const tabs = [
        { id: 'messages', path: 'messages', label: t('messages:tabs.messages', 'Messages'), icon: FiMessageSquareIcon },
        { id: 'announcements', path: 'announcements', label: t('messages:tabs.announcements', 'Announcements'), icon: FiBell },
        { id: 'internalTicket', path: 'internal-ticket', label: t('messages:tabs.internalTicket', 'Support Tickets'), icon: FiFileText },
        { id: 'reporting', path: 'reporting', label: t('messages:tabs.reporting', 'Anonymous Reports'), icon: FiShield },
    ];

    return (
        <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500">
            <div className="shrink-0 py-4 border-b border-border bg-card/30">
                <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8">
                    <h1 className="text-xl font-semibold text-foreground mb-3">
                        {t('messages:title', 'Communications')}
                    </h1>
                    <div className="flex gap-1 sm:gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-1">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const workspaceId = getWorkspaceIdForUrl(selectedWorkspace);
                            const isActive = tab.id === 'reporting';
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        if (tab.id === 'messages') {
                                            handleNavigateToMessages();
                                        } else if (tab.id === 'announcements') {
                                            handleNavigateToAnnouncements();
                                        } else if (tab.id === 'internalTicket') {
                                            handleNavigateToInternalTicket();
                                        }
                                    }}
                                    className={cn(
                                        "flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0",
                                        "touch-manipulation active:scale-95",
                                        isActive
                                            ? "border-primary text-primary bg-primary/5"
                                            : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
                                    )}
                                    title={tab.label}
                                >
                                    <Icon className="w-4 h-4 shrink-0" />
                                    <span className="text-xs sm:text-sm min-w-0">{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                <div className="w-full max-w-[1400px] mx-auto flex-1 flex flex-col pt-6">
                    <div className="max-w-[1400px] mx-auto w-full px-6">
                        <div className="bg-card rounded-xl border border-border hover:shadow-md transition-shadow w-full">
                            <div className="flex items-center justify-between mb-4 px-6 pt-6">
                                <h3 className="text-base font-semibold text-foreground">
                                    {t('messages:reporting.title', 'Anonymous Reports')}
                                </h3>
                                <button
                                    onClick={() => navigate(buildDashboardUrl('/reporting/new', workspaceId))}
                                    className="px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all shadow-sm flex items-center gap-2 shrink-0"
                                    style={{ height: 'var(--boxed-inputfield-height)' }}
                                >
                                    <FiPlus className="w-4 h-4" />
                                    <span>{t('messages:reporting.submitReport', 'Submit Report')}</span>
                                </button>
                            </div>
                            <div className="pt-3 border-t border-border mb-4 px-6">
                                <p className="text-sm text-muted-foreground">
                                    {t('messages:reporting.description', 'Submit confidential reports. Your identity will remain anonymous.')}
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 w-full px-6 pb-6">
                                <div className="relative flex-1 min-w-[200px]">
                                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder={t('messages:reporting.searchPlaceholder', 'Search tickets...')}
                                        className="w-full pl-9 pr-8 rounded-xl border-2 border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-0 focus:shadow-[0_0_0_4px_rgba(79,70,229,0.1)] transition-all hover:border-muted-foreground/30 hover:bg-muted/30"
                                        style={{
                                            height: 'var(--boxed-inputfield-height)',
                                            fontWeight: '500',
                                            fontFamily: 'var(--font-family-text, Roboto, sans-serif)',
                                            color: 'var(--boxed-inputfield-color-text)'
                                        }}
                                    />
                                </div>

                                <div className="relative shrink-0" ref={filterDropdownRef}>
                                    <button
                                        onClick={() => setShowFiltersOverlay(!showFiltersOverlay)}
                                        className={cn(
                                            "px-4 rounded-xl border-2 transition-all flex items-center gap-2 shrink-0",
                                            selectedCategory !== 'all' || showFiltersOverlay
                                                ? "bg-primary/10 border-primary/20 text-primary"
                                                : "bg-background border-input text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                                        )}
                                        style={{ height: 'var(--boxed-inputfield-height)' }}
                                        title="Filter by Category"
                                    >
                                        <FiSliders className="w-4 h-4" />
                                        <span className="text-sm font-medium">
                                            {selectedCategory !== 'all' ? categoryLabels[selectedCategory] : t('messages:reporting.filter', 'Filter')}
                                        </span>
                                    </button>

                                    {showFiltersOverlay && (
                                        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-popover shadow-lg p-1.5 z-50 animate-in fade-in zoom-in-95 duration-200">
                                            <div className="text-xs font-semibold text-muted-foreground px-2 py-1.5 mb-1">
                                                {t('messages:reporting.categories', 'Categories')}
                                            </div>
                                            <button
                                                onClick={() => { setSelectedCategory('all'); setShowFiltersOverlay(false); }}
                                                className={cn(
                                                    "w-full text-left px-2 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2",
                                                    selectedCategory === 'all'
                                                        ? "bg-primary/10 text-primary font-medium"
                                                        : "text-foreground hover:bg-muted"
                                                )}
                                            >
                                                <span>{t('messages:reporting.allCategories', 'All Categories')}</span>
                                            </button>
                                            {Object.keys(categoryLabels).map((cat) => (
                                                <button
                                                    key={cat}
                                                    onClick={() => { setSelectedCategory(cat); setShowFiltersOverlay(false); }}
                                                    className={cn(
                                                        "w-full text-left px-2 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2",
                                                        selectedCategory === cat
                                                            ? "bg-primary/10 text-primary font-medium"
                                                            : "text-foreground hover:bg-muted"
                                                    )}
                                                >
                                                    <span>{categoryLabels[cat] || cat}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="w-full max-w-[1400px] mx-auto pt-6">
                        <div className="space-y-4 px-6">
                            {isLoading && tickets.length === 0 ? (
                                <LoadingSpinner />
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
                                        onClick={() => navigate(buildDashboardUrl('/reporting/new', workspaceId))}
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
                                        onClick={() => setSelectedTicketId(ticket.id)}
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
                                                        {ticket.createdAt ? new Date(ticket.createdAt.toDate?.() || ticket.createdAt).toLocaleDateString() : 'Just now'} · {categoryLabels[ticket.category] || ticket.category} · {ticket.status || 'open'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors line-clamp-1">{ticket.subject}</h3>
                                        <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed mb-4">{ticket.message}</p>

                                        <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
                                            <div className={cn(
                                                "flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary/50",
                                                ticket.priority === 'urgent' && "text-red-500 bg-red-500/10",
                                                ticket.priority === 'high' && "text-orange-500 bg-orange-500/10",
                                                ticket.priority === 'medium' && "text-yellow-500 bg-yellow-500/10",
                                                ticket.priority === 'low' && "text-blue-500 bg-blue-500/10"
                                            )}>
                                                <FiBarChart2 className="w-3.5 h-3.5" />
                                                <span>{ticket.priority || 'medium'}</span>
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
                    navigate(buildDashboardUrl('/reporting', workspaceId));
                }}
                title={t('messages:reporting.submitReport', 'Submit Anonymous Report')}
                size="small"
                closeOnBackdropClick={!isCreating}
                actions={
                    <div className="flex justify-between gap-3 w-full">
                        <button
                            onClick={() => {
                                handleCloseReportingPopup(setIsCreateTicketOpen, setCreateFormData, isCreating);
                                navigate(buildDashboardUrl('/reporting', workspaceId));
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
                    <BoxedSwitchField
                        label={t('messages:reporting.anonymousReporting', 'Submit as Anonymous Report')}
                        checked={createFormData.isAnonymous}
                        onChange={(checked) => setCreateFormData({ ...createFormData, isAnonymous: checked })}
                        disabled={isCreating}
                    />

                    <div className="mt-4">
                        <InputField
                            label={t('messages:reporting.subject', 'Subject')}
                            value={createFormData.subject}
                            onChange={(e) => setCreateFormData({ ...createFormData, subject: e.target.value })}
                            placeholder={t('messages:reporting.subjectPlaceholder', 'Enter ticket subject...')}
                            required
                            disabled={isCreating}
                            name="ticketSubject"
                        />
                    </div>

                    <SimpleDropdown
                        label={t('messages:reporting.category', 'Category')}
                        options={[
                            { value: 'general', label: categoryLabels.general },
                            { value: 'support', label: categoryLabels.support },
                            { value: 'bug_report', label: categoryLabels.bug_report },
                            { value: 'feature_request', label: categoryLabels.feature_request },
                            { value: 'reporting', label: categoryLabels.reporting },
                            { value: 'incident', label: categoryLabels.incident },
                            { value: 'compliance', label: categoryLabels.compliance },
                            { value: 'question', label: categoryLabels.question },
                            { value: 'feedback', label: categoryLabels.feedback },
                        ]}
                        value={createFormData.category}
                        onChange={(value) => setCreateFormData({ ...createFormData, category: value })}
                        disabled={isCreating}
                    />

                    <SimpleDropdown
                        label={t('messages:reporting.priority', 'Priority')}
                        options={[
                            { value: 'low', label: t('messages:reporting.priority.low', 'Low') },
                            { value: 'medium', label: t('messages:reporting.priority.medium', 'Medium') },
                            { value: 'high', label: t('messages:reporting.priority.high', 'High') },
                            { value: 'urgent', label: t('messages:reporting.priority.urgent', 'Urgent') },
                        ]}
                        value={createFormData.priority}
                        onChange={(value) => setCreateFormData({ ...createFormData, priority: value })}
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
                </div>
            </Dialog>
        </div>
    );
};

export default ReportingPage;

