import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FiMessageSquare, FiPlus, FiFileText } from 'react-icons/fi';
import { useAuth } from '../../../../contexts/authContext';
import { useNotification } from '../../../../contexts/notificationContext';
import { useAction } from '../../../../services/actions/hook';
import FilterBar from '../../components/filterBar/filterBar';
import LoadingSpinner from '../../../../components/loadingSpinner/loadingSpinner';
import CreateTicketModal from '../components/createTicketModal';
import TicketDetail from '../components/ticketDetail';
import { cn } from '../../../../utils/cn';

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All Categories' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'bug_report', label: 'Bug Report' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'support', label: 'Support' },
  { value: 'question', label: 'Question' },
  { value: 'general', label: 'General' }
];

const SupportTicketsTab = () => {
  const { t } = useTranslation(['support', 'messages']);
  const { currentUser } = useAuth();
  const { showError, showSuccess } = useNotification();
  const { execute, loading: actionLoading } = useAction();

  const [tickets, setTickets] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const loadTickets = useCallback(async () => {
    if (!currentUser?.uid) return;

    try {
      setIsLoading(true);
      const result = await execute('thread.list', {
        collectionType: 'tickets'
      });

      if (result.success) {
        setTickets(result.data?.threads || []);
      } else {
        showError(t('support:errors.loadFailed', 'Failed to load tickets'));
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
      showError(t('support:errors.loadFailed', 'Failed to load tickets'));
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, execute, showError, t]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const filteredTickets = useMemo(() => {
    let results = tickets;

    if (selectedCategory !== 'all') {
      results = results.filter(t => t.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      results = results.filter(t =>
        t.title?.toLowerCase().includes(query) ||
        t.content?.toLowerCase().includes(query) ||
        t.user_username?.toLowerCase().includes(query)
      );
    }

    return results;
  }, [tickets, selectedCategory, searchQuery]);

  const handleFilterChange = (key, value) => {
    if (key === 'category') {
      setSelectedCategory(value);
    }
  };

  const handleCreateTicket = async (data) => {
    try {
      const result = await execute('thread.create', {
        collectionType: 'tickets',
        title: data.title,
        content: data.content,
        category: data.category
      });

      if (result.success) {
        showSuccess(t('support:success.ticketCreated', 'Ticket created successfully'));
        setIsCreateModalOpen(false);
        loadTickets();
      } else {
        showError(result.error || t('support:errors.createFailed', 'Failed to create ticket'));
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      showError(t('support:errors.createFailed', 'Failed to create ticket'));
    }
  };

  if (selectedTicketId) {
    return (
      <TicketDetail
        ticketId={selectedTicketId}
        onBack={() => setSelectedTicketId(null)}
      />
    );
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto p-6">
      <FilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t('support:tickets.searchPlaceholder', 'Search tickets...')}
        filters={{ category: selectedCategory }}
        onFilterChange={handleFilterChange}
        dropdownFields={[
          {
            key: 'category',
            label: t('support:filters.category', 'Category'),
            options: CATEGORY_OPTIONS,
            defaultValue: 'all'
          }
        ]}
        title={t('support:tickets.title', 'Support Tickets')}
        description={t('support:tickets.description', 'Manage your support requests')}
        onAdd={() => setIsCreateModalOpen(true)}
        addLabel={t('support:tickets.newTicket', 'New Ticket')}
        onRefresh={loadTickets}
        isLoading={isLoading}
        translationNamespace="support"
      />

      <div className="mt-6">
        {isLoading && tickets.length === 0 ? (
          <LoadingSpinner />
        ) : filteredTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <FiFileText className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {t('support:tickets.noTickets', 'No tickets found')}
            </h3>
            <p className="text-muted-foreground mb-6">
              {t('support:tickets.noTicketsHint', 'Create a ticket to get help from our support team')}
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center gap-2"
            >
              <FiPlus className="w-5 h-5" />
              {t('support:tickets.createTicket', 'Create Ticket')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTickets.map(ticket => (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicketId(ticket.id)}
                className="group bg-card hover:bg-card/80 border border-border/50 hover:border-primary/20 rounded-2xl p-6 cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold border border-border">
                      {(ticket.user_username || ticket.user_email || 'A').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">
                        {ticket.user_username || 'Anonymous'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : 'Just now'} · {
                          CATEGORY_OPTIONS.find(c => c.value === ticket.category)?.label || ticket.category
                        }
                      </div>
                    </div>
                  </div>
                </div>

                <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors line-clamp-1">
                  {ticket.title || 'Untitled Ticket'}
                </h3>
                <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed mb-4">
                  {ticket.content}
                </p>

                <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
                  <div className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-md",
                    ticket.status === 'OPEN' ? "bg-blue-500/10 text-blue-500" :
                    ticket.status === 'IN_PROGRESS' ? "bg-yellow-500/10 text-yellow-500" :
                    "bg-green-500/10 text-green-500"
                  )}>
                    <span>{ticket.status || 'OPEN'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary/50">
                    <FiMessageSquare className="w-3.5 h-3.5" />
                    <span>{ticket.replyCount || 0} replies</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isCreateModalOpen && (
        <CreateTicketModal
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={handleCreateTicket}
          isLoading={actionLoading}
        />
      )}
    </div>
  );
};

export default SupportTicketsTab;

