import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAction } from '../../../../services/actions/hook';
import { useDashboard } from '../../../contexts/dashboardContext';
import { useNotification } from '../../../../contexts/notificationContext';
import FilterBar from '../../components/filterBar/filterBar';
import Modal from '../../../../components/modals/modals';
import InputField from '../../../../components/boxedInputFields/personnalizedInputField';
import TextareaField from '../../../../components/boxedInputFields/textareaField';
import SimpleDropdown from '../../../../components/boxedInputFields/SimpleDropdown';
import Button from '../../../../components/boxedInputFields/button';
import { cn } from '../../../../utils/cn';
import { FiMessageSquare, FiBarChart2, FiPlus, FiFileText } from 'react-icons/fi';
import { buildDashboardUrl, getWorkspaceIdForUrl } from '../../../../config/routeUtils';

const CATEGORIES = {
  general: 'General',
  hr: 'HR',
  support: 'Support',
  bug_report: 'Bug Report',
  feature_request: 'Feature Request',
  billing: 'Billing',
  account: 'Account',
  question: 'Question',
  feedback: 'Feedback'
};

const InternalTicketPage = ({ hideHeader }) => {
  const { t } = useTranslation(['messages']);
  const { showError, showSuccess } = useNotification();
  const { user, selectedWorkspace } = useDashboard();
  const { execute, loading } = useAction();
  const navigate = useNavigate();
  const location = useLocation();
  const workspaceId = getWorkspaceIdForUrl(selectedWorkspace);

  const [tickets, setTickets] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    category: 'all',
    fromDate: '',
    toDate: ''
  });
  const [sortBy, setSortBy] = useState('date');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    subject: '',
    message: '',
    category: 'general',
    priority: 'MEDIUM'
  });

  const loadTickets = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const result = await execute('thread.list', {
        collectionType: 'tickets',
        pagination: { limit: 50 },
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      const filtered = result.threads.filter(ticket => !ticket.isAnonymous);
      setTickets(filtered || []);
    } catch (error) {
      console.error('Error loading tickets:', error);
      showError(t('messages:errors.loadingTickets', 'Failed to load tickets'));
    }
  }, [user, execute, showError, t]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    const pathSegments = location.pathname.split('/');
    const lastSegment = pathSegments[pathSegments.length - 1];
    setIsCreateOpen(lastSegment === 'new');
  }, [location.pathname]);

  const handleCreateTicket = async () => {
    if (!createFormData.subject.trim() || !createFormData.message.trim()) {
      showError(t('messages:errors.requiredFields', 'Please fill in all required fields'));
      return;
    }

    try {
      await execute('thread.create', {
        collectionType: 'tickets',
        title: createFormData.subject,
        content: createFormData.message,
        category: createFormData.category,
        priority: createFormData.priority,
        status: 'OPEN'
      });

      showSuccess(t('messages:success.ticketCreated', 'Ticket created successfully'));
      setIsCreateOpen(false);
      setCreateFormData({
        subject: '',
        message: '',
        category: 'general',
        priority: 'MEDIUM'
      });
      navigate(buildDashboardUrl('/communications/internal-ticket', workspaceId));
      loadTickets();
    } catch (error) {
      console.error('Error creating ticket:', error);
      showError(t('messages:errors.createTicket', 'Failed to create ticket'));
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
        t.title?.toLowerCase().includes(query) ||
        t.content?.toLowerCase().includes(query)
      );
    }

    if (sortBy === 'date') {
      currentTickets.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });
    }

    return currentTickets;
  }, [tickets, filters, searchQuery, sortBy]);

  return (
    <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500">
      <div className="flex-1 overflow-auto">
        <div className="w-full max-w-[1400px] mx-auto flex-1 flex flex-col pt-6 px-6">
          <div className="space-y-6">
            <FilterBar
              filters={filters}
              onFilterChange={(key, value) => {
                setFilters(prev => ({ ...prev, [key]: value }));
              }}
              onClearFilters={() => {
                setFilters({ category: 'all', fromDate: '', toDate: '' });
                setSearchQuery('');
              }}
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder={t('messages:searchTickets', 'Search tickets...')}
              dropdownFields={[
                {
                  key: 'category',
                  label: t('messages:category', 'Category'),
                  options: [
                    { value: 'all', label: t('messages:allCategories', 'All Categories') },
                    ...Object.keys(CATEGORIES).map(cat => ({
                      value: cat,
                      label: CATEGORIES[cat]
                    }))
                  ],
                  defaultValue: 'all'
                }
              ]}
              sortOptions={[
                { value: 'date', label: t('messages:sort.date', 'Date') }
              ]}
              sortValue={sortBy}
              onSortChange={setSortBy}
              title={t('messages:internalTicket.title', 'Support Tickets')}
              description={t('messages:internalTicket.description', 'Create and manage support tickets')}
              onRefresh={loadTickets}
              onAdd={() => navigate(buildDashboardUrl('/communications/internal-ticket/new', workspaceId))}
              addLabel={t('messages:newTicket', 'New Ticket')}
              isLoading={loading}
              translationNamespace="messages"
            />

            <div>
              {loading && tickets.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <FiFileText className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {t('messages:noTickets', 'No tickets found')}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {t('messages:createFirstTicket', 'Get started by creating a new ticket')}
                  </p>
                  <button
                    onClick={() => navigate(buildDashboardUrl('/communications/internal-ticket/new', workspaceId))}
                    className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center gap-2"
                  >
                    <FiPlus className="w-5 h-5" />
                    {t('messages:createTicket', 'Create Ticket')}
                  </button>
                </div>
              ) : (
                filteredTickets.map(ticket => (
                  <div
                    key={ticket.id}
                    className="group bg-card hover:bg-card/80 border border-border/50 hover:border-primary/20 rounded-2xl p-6 cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md mb-4"
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold border border-border">
                          {(ticket.createdBy || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">
                            {ticket.createdBy || 'User'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {ticket.createdAt?.toDate ? new Date(ticket.createdAt.toDate()).toLocaleDateString() : 'Just now'} · {CATEGORIES[ticket.category] || ticket.category} · {ticket.status || 'open'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors line-clamp-1">{ticket.title}</h3>
                    <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed mb-4">{ticket.content}</p>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
                      <div className={cn(
                        "flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary/50",
                        ticket.metadata?.priority === 'URGENT' && "text-red-600 bg-red-600/20",
                        ticket.metadata?.priority === 'HIGH' && "text-orange-500 bg-orange-500/10"
                      )}>
                        <FiBarChart2 className="w-3.5 h-3.5" />
                        <span>{ticket.metadata?.priority || 'MEDIUM'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary/50">
                        <FiMessageSquare className="w-3.5 h-3.5" />
                        <span>0 responses</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CREATE TICKET MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          if (!loading) {
            setIsCreateOpen(false);
            setCreateFormData({
              subject: '',
              message: '',
              category: 'general',
              priority: 'MEDIUM'
            });
            navigate(buildDashboardUrl('/communications/internal-ticket', workspaceId));
          }
        }}
        title={t('messages:createTicket', 'Create Support Ticket')}
        size="small"
        closeOnBackdropClick={!loading}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                if (!loading) {
                  setIsCreateOpen(false);
                  navigate(buildDashboardUrl('/communications/internal-ticket', workspaceId));
                }
              }}
              disabled={loading}
            >
              {t('common:cancel', 'Cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateTicket}
              disabled={!createFormData.subject.trim() || !createFormData.message.trim() || loading}
            >
              {loading ? t('common:submitting', 'Submitting...') : t('messages:submitTicket', 'Submit Ticket')}
            </Button>
          </>
        }
      >
        <div className="space-y-4 mt-4">
          <SimpleDropdown
            label={t('messages:priority', 'Priority')}
            options={[
              { value: 'LOW', label: t('messages:priority.low', 'Low') },
              { value: 'MEDIUM', label: t('messages:priority.medium', 'Medium') },
              { value: 'HIGH', label: t('messages:priority.high', 'High') },
              { value: 'URGENT', label: t('messages:priority.urgent', 'Urgent') }
            ]}
            value={createFormData.priority}
            onChange={(value) => setCreateFormData({ ...createFormData, priority: value })}
            disabled={loading}
          />

          <InputField
            label={t('messages:subject', 'Subject')}
            value={createFormData.subject}
            onChange={(e) => setCreateFormData({ ...createFormData, subject: e.target.value })}
            placeholder={t('messages:subjectPlaceholder', 'Enter ticket subject')}
            required
            disabled={loading}
            name="ticketSubject"
          />

          <SimpleDropdown
            label={t('messages:category', 'Category')}
            options={Object.keys(CATEGORIES).map(cat => ({
              value: cat,
              label: CATEGORIES[cat]
            }))}
            value={createFormData.category}
            onChange={(value) => setCreateFormData({ ...createFormData, category: value })}
            disabled={loading}
          />

          <TextareaField
            label={t('messages:message', 'Message')}
            value={createFormData.message}
            onChange={(e) => setCreateFormData({ ...createFormData, message: e.target.value })}
            placeholder={t('messages:messagePlaceholder', 'Describe your issue')}
            rows={5}
            disabled={loading}
            name="ticketMessage"
            required
          />
        </div>
      </Modal>
    </div>
  );
};

export default InternalTicketPage;

