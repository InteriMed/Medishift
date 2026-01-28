import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useAction } from '../../../../services/actions/hook';
import { useDashboard } from '../../../contexts/dashboardContext';
import { useMobileView } from '../../../../hooks/useMobileView';
import { usePageMobile } from '../../../../contexts/PageMobileContext';
import { useNotification } from '../../../../contexts/notificationContext';
import ConversationsList from '../components/ConversationsList';
import ConversationView from '../components/ConversationView';
import LoadingSpinner from '../../../../components/loadingSpinner/loadingSpinner';
import { cn } from '../../../../utils/cn';
import { FiMessageSquare, FiSearch, FiX, FiSliders, FiPlus } from 'react-icons/fi';
import Modal from '../../../../components/modals/modal';
import InputField from '../../../../components/boxedInputFields/personnalizedInputField';
import Button from '../../../../components/boxedInputFields/button';

const MessagesPage = ({ hideHeader }) => {
  const { t } = useTranslation(['messages']);
  const { showError } = useNotification();
  const { user, selectedWorkspace } = useDashboard();
  const { execute, loading } = useAction();
  const isMobile = useMobileView();
  const pageMobileContext = usePageMobile();
  const [searchParams, setSearchParams] = useSearchParams();

  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showSidebar, setShowSidebar] = useState(true);
  const [showFiltersOverlay, setShowFiltersOverlay] = useState(false);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [newMessageRecipient, setNewMessageRecipient] = useState('');

  const loadConversations = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      const result = await execute('thread.list', {
        collectionType: 'messages',
        pagination: { limit: 50 },
        sortBy: 'updatedAt',
        sortOrder: 'desc'
      });
      
      setConversations(result.threads || []);
    } catch (err) {
      console.error('Error loading conversations:', err);
      showError(t('messages:errors.loadingConversations', 'Failed to load conversations'));
    }
  }, [user, execute, showError, t]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    const modalParam = searchParams.get('modal');
    if (modalParam === 'new') {
      setShowNewMessageModal(true);
    }
  }, [searchParams]);

  const handleCloseNewMessage = useCallback(() => {
    setShowNewMessageModal(false);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('modal');
    setSearchParams(newParams, { replace: true });
    setNewMessageRecipient('');
  }, [searchParams, setSearchParams]);

  const handleOpenNewMessage = useCallback(() => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('modal', 'new');
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleCreateConversation = async () => {
    if (!newMessageRecipient.trim()) {
      showError(t('messages:errors.recipientRequired', 'Please enter a recipient'));
      return;
    }

    try {
      const result = await execute('thread.create', {
        collectionType: 'messages',
        content: '',
        participants: [user.uid, newMessageRecipient]
      });

      handleCloseNewMessage();
      loadConversations();
      
      const newConv = conversations.find(c => c.id === result.threadId);
      if (newConv) setSelectedConversation(newConv);
    } catch (error) {
      console.error('Error creating conversation:', error);
      showError(t('messages:errors.createConversation', 'Failed to create conversation'));
    }
  };

  const filteredConversations = useMemo(() => {
    let filtered = [...conversations];

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(conv =>
        conv.participants?.some(p => p.displayName?.toLowerCase().includes(searchLower)) ||
        conv.content?.toLowerCase().includes(searchLower)
      );
    }

    if (filterType === 'unread') {
      filtered = filtered.filter(conv => !conv.metadata?.seenBy?.includes(user?.uid));
    }

    return filtered;
  }, [conversations, searchTerm, filterType, user]);

  const handleSelectConversation = useCallback(async (conversationId) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      setSelectedConversation(conversation);
      if (isMobile) setShowSidebar(false);
      
      try {
        await execute('thread.markRead', { threadId: conversationId });
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    }
  }, [conversations, isMobile, execute]);

  if (loading && conversations.length === 0) return <LoadingSpinner />;

  return (
    <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500">
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        <div className={cn(
          "flex-1 flex min-h-0 relative max-w-[1400px] mx-auto w-full p-6",
          isMobile ? "overflow-hidden p-4" : "gap-6 overflow-visible"
        )}>
          {/* SIDEBAR */}
          <div className={cn(
            "dashboard-sidebar-container flex-shrink-0",
            isMobile
              ? cn(
                "dashboard-sidebar-container-mobile",
                showSidebar ? "translate-x-0" : "-translate-x-full"
              )
              : "dashboard-sidebar-container-desktop content-sidebar pr-0"
          )} style={{ maxWidth: '100%' }}>
            <div className={cn(
              "dashboard-sidebar-inner",
              isMobile && "dashboard-sidebar-inner-mobile"
            )}>
              {/* SEARCH */}
              <div className={cn(
                "shrink-0 w-full overflow-hidden p-6 border-b border-border",
                isMobile && "p-4"
              )} style={{ position: 'relative', zIndex: 100 }}>
                <div style={{ position: 'relative' }}>
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                  <input
                    type="text"
                    placeholder={t('messages:searchPlaceholder', 'Search conversations...')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-20 rounded-xl border-2 border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-0 focus:shadow-[0_0_0_4px_rgba(79,70,229,0.1)] transition-all hover:border-muted-foreground/30 hover:bg-muted/30"
                    style={{
                      height: 'var(--boxed-inputfield-height)',
                      fontWeight: '500',
                      fontFamily: 'var(--font-family-text, Roboto, sans-serif)',
                      color: 'var(--boxed-inputfield-color-text)'
                    }}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="p-1.5 hover:bg-muted rounded-full transition-colors"
                      >
                        <FiX className="w-4 h-4 text-muted-foreground" />
                      </button>
                    )}
                    <button
                      onClick={() => setShowFiltersOverlay(!showFiltersOverlay)}
                      className={cn(
                        "p-1.5 rounded-full transition-colors relative",
                        filterType !== 'all' ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"
                      )}
                    >
                      <FiSliders className="w-4 h-4" />
                    </button>
                  </div>

                  {showFiltersOverlay && (
                    <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-border bg-popover shadow-lg p-1.5 z-50 animate-in fade-in zoom-in-95 duration-200">
                      <button
                        onClick={() => { setFilterType('all'); setShowFiltersOverlay(false); }}
                        className={cn(
                          "w-full text-left px-2 py-1.5 rounded-lg text-sm transition-colors",
                          filterType === 'all' ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted"
                        )}
                      >
                        {t('messages:filters.all', 'All Messages')}
                      </button>
                      <button
                        onClick={() => { setFilterType('unread'); setShowFiltersOverlay(false); }}
                        className={cn(
                          "w-full text-left px-2 py-1.5 rounded-lg text-sm transition-colors",
                          filterType === 'unread' ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted"
                        )}
                      >
                        {t('messages:filters.unreadOnly', 'Unread')}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* CONVERSATIONS LIST */}
              {filteredConversations.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 ring-4 ring-background">
                    <FiMessageSquare className="w-8 h-8" style={{ color: 'var(--primary-color)' }} />
                  </div>
                  <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                    {searchTerm || filterType !== 'all' ? t('messages:empty.noMessagesFound', 'No messages found') : t('messages:empty.noConversationsYet', 'No conversations yet')}
                  </h2>
                  {!searchTerm && filterType === 'all' && (
                    <>
                      <p className="mb-6" style={{ color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                        {t('messages:noConversationsHint', 'Start new conversation')}
                      </p>
                      <button
                        onClick={handleOpenNewMessage}
                        className="bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center justify-center"
                        style={{ 
                          fontFamily: 'var(--font-family-text, Roboto, sans-serif)',
                          height: 'var(--boxed-inputfield-height)',
                          width: 'var(--boxed-inputfield-height)'
                        }}
                        title={t('messages:newMessage', 'New Message')}
                      >
                        <FiPlus className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto">
                  <ConversationsList
                    conversations={filteredConversations}
                    selectedConversationId={selectedConversation?.id}
                    onSelectConversation={handleSelectConversation}
                    currentUserId={user?.uid}
                  />
                </div>
              )}
            </div>
          </div>

          {/* MAIN CONTENT */}
          <div className={cn(
            "dashboard-main-content flex-1 min-w-0",
            isMobile && selectedConversation ? "translate-x-0 dashboard-main-content-mobile" : "dashboard-main-content-desktop"
          )} style={{ maxWidth: '100%' }}>
            <div className={cn(
              "dashboard-main-inner",
              isMobile && "dashboard-main-inner-mobile"
            )}>
              {selectedConversation ? (
                <ConversationView
                  conversation={selectedConversation}
                  currentUser={user}
                  workspaceContext={selectedWorkspace}
                  onBack={() => {
                    setSelectedConversation(null);
                    setShowSidebar(true);
                  }}
                />
              ) : (
                <div className="w-full h-full flex flex-col bg-background relative">
                  <div className="shrink-0 flex items-center gap-4 px-4 sm:px-6 md:px-8 py-5 border-b border-border bg-gradient-to-r from-card/95 via-card/90 to-card/95 backdrop-blur-sm">
                    <div className="shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <FiMessageSquare className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-foreground mb-1.5 leading-tight" style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)', margin: 0 }}>
                        {t('messages:selectConversation.title', 'Select a Conversation')}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed" style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)', margin: 0 }}>
                        {t('messages:selectConversation.subtitle', 'Choose a conversation from the list to view messages')}
                      </p>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-gradient-to-b from-background via-muted/5 to-background" style={{ scrollbarGutter: 'stable' }} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* NEW MESSAGE MODAL */}
      <Modal
        isOpen={showNewMessageModal}
        onClose={handleCloseNewMessage}
        title={t('messages:newMessage', 'New Message')}
        size="small"
        actions={
          <>
            <Button variant="secondary" onClick={handleCloseNewMessage}>
              {t('common:cancel', 'Cancel')}
            </Button>
            <Button variant="primary" onClick={handleCreateConversation} disabled={loading}>
              {t('messages:send', 'Send')}
            </Button>
          </>
        }
      >
        <div className="space-y-4 mt-4">
          <InputField
            label={t('messages:recipient', 'Recipient')}
            value={newMessageRecipient}
            onChange={(e) => setNewMessageRecipient(e.target.value)}
            placeholder={t('messages:recipientPlaceholder', 'Enter user ID or email')}
            name="recipient"
          />
        </div>
      </Modal>
    </div>
  );
};

export default MessagesPage;

