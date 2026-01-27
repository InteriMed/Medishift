import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { useDashboard } from '../../contexts/DashboardContext';
import { useMobileView } from '../../hooks/useMobileView';
import { usePageMobile } from '../../contexts/PageMobileContext';
import { useNotification } from '../../../contexts/NotificationContext';
import ConversationsList from './components/ConversationsList';
import ConversationView from './components/ConversationView';
import LoadingSpinner from '../../../components/LoadingSpinner/LoadingSpinner';
import messagesService from '../../../services/messagesService';
import { cn } from '../../../utils/cn';
import { FiMessageSquare, FiBell, FiSearch, FiX, FiSliders, FiPlus, FiShield, FiFileText, FiInbox } from 'react-icons/fi';
import StartNewCommunicationModal from './components/StartNewCommunicationModal';
import { buildDashboardUrl, getWorkspaceIdForUrl } from '../../utils/pathUtils';
import '../../../components/BoxedInputFields/styles/boxedInputFields.css';

const MESSAGE_CONTEXTS = {
  PERSONAL: 'personal',
  FACILITY: 'facility'
};

const MessagesPage = ({ hideHeader }) => {
  const { t } = useTranslation(['messages']);
  const { showError } = useNotification();
  const { user, selectedWorkspace } = useDashboard();
  const isMobile = useMobileView();
  const pageMobileContext = usePageMobile();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const setPageMobileStateRef = useRef(pageMobileContext?.setPageMobileState || (() => { }));

  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showSidebar, setShowSidebar] = useState(true);
  const [showFiltersOverlay, setShowFiltersOverlay] = useState(false);
  const [readConversationIds, setReadConversationIds] = useState(new Set());
  const [showStartNewCommunication, setShowStartNewCommunication] = useState(false);
  const conversationsListener = useRef(null);
  const filterDropdownRef = useRef(null);


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
    if (!user || !selectedWorkspace) {
      setConversations([]);
      setIsLoading(false);
      return;
    }

    const fetchConversations = async () => {
      setIsLoading(true);

      try {
        const conversationsRef = collection(db, 'conversations');
        const conversationsQuery = query(
          conversationsRef,
          where('participantIds', 'array-contains', user.uid),
          orderBy('lastMessageTimestamp', 'desc')
        );

        if (conversationsListener.current) conversationsListener.current();

        conversationsListener.current = onSnapshot(
          conversationsQuery,
          async (snapshot) => {
            const conversationsList = [];
            snapshot.docs.forEach(doc => {
              const conversationData = doc.data();
              const otherParticipant = conversationData.participantInfo?.find(p => p.userId !== user.uid);
              let displayInfo = {};
              
              if (otherParticipant) {
                displayInfo = {
                  displayName: otherParticipant.displayName,
                  photoURL: otherParticipant.photoURL,
                  role: otherParticipant.roleInConversation,
                  otherParticipant
                };
              }
              
              conversationsList.push({ id: doc.id, ...conversationData, ...displayInfo });
            });

            conversationsList.sort((a, b) => {
              const aTime = a.lastMessageTimestamp?.toDate?.() || new Date(0);
              const bTime = b.lastMessageTimestamp?.toDate?.() || new Date(0);
              return bTime - aTime;
            });

            setConversations(conversationsList);
            setIsLoading(false);
          },
          (err) => {
            console.error('Error listening to conversations:', err);
            showError(t('errors.loadingConversations', 'Failed to load conversations'));
            setIsLoading(false);
          }
        );
      } catch (err) {
        console.error('Error setting up conversations listener:', err);
        showError(t('errors.loadingConversations', 'Failed to load conversations'));
        setIsLoading(false);
      }
    };

    fetchConversations();
    return () => {
      if (conversationsListener.current) conversationsListener.current();
    };
  }, [user, selectedWorkspace, t, showError]);

  useEffect(() => {
    const modalParam = searchParams.get('modal');
    const actionParam = searchParams.get('action');
    
    if (modalParam === 'startCommunication' || actionParam === 'startCommunication') {
      setShowStartNewCommunication(true);
    } else if (showStartNewCommunication) {
      setShowStartNewCommunication(false);
    }
  }, [searchParams]);

  const handleCloseStartNewCommunication = useCallback(() => {
    setShowStartNewCommunication(false);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('modal');
    newParams.delete('action');
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleOpenStartNewCommunication = useCallback(() => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('modal', 'startCommunication');
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const setPageMobileState = setPageMobileStateRef.current;
    if (!setPageMobileState || typeof setPageMobileState !== 'function') {
      return;
    }
    if (isMobile) {
      const handleBack = () => {
        setSelectedConversation(null);
        setShowSidebar(true);
      };
      setPageMobileState(!!selectedConversation, handleBack);
    } else {
      setPageMobileState(false, null);
    }
  }, [isMobile, selectedConversation]);

  const filterConversations = useCallback((conversationsList) => {
    let filtered = [...conversationsList];

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(conv =>
        conv.displayName?.toLowerCase().includes(searchLower) ||
        conv.lastMessage?.text?.toLowerCase().includes(searchLower)
      );
    }

    if (filterType === 'unread') {
      filtered = filtered.filter(conv => conv.unreadCount > 0);
    } else if (filterType === 'unresponded') {
      filtered = filtered.filter(conv =>
        conv.lastMessage?.senderId !== user?.uid && conv.unreadCount > 0
      );
    }

    return filtered;
  }, [searchTerm, filterType, user]);

  const allConversations = useMemo(() => {
    return conversations.map(conv => {
      if (readConversationIds.has(conv.id)) {
        return { ...conv, unreadCount: 0 };
      }
      return conv;
    });
  }, [conversations, readConversationIds]);

  const filteredConversations = useMemo(() => filterConversations(allConversations), [allConversations, filterConversations]);

  const handleSelectConversation = useCallback(async (conversationId) => {
    const conversation = allConversations.find(c => c.id === conversationId);
    if (conversation) {
      setSelectedConversation(conversation);
      setReadConversationIds(prev => new Set([...prev, conversationId]));
      if (isMobile) {
        setShowSidebar(false);
      }
      if (user) {
        try {
          await messagesService.markAsRead(conversationId);
        } catch (error) {
          console.error('Error marking conversation as read:', error);
        }
      }
    }
  }, [allConversations, user, isMobile]);

  const handleNavigateToAnnouncements = useCallback(() => {
    if (selectedWorkspace) {
      const workspaceId = getWorkspaceIdForUrl(selectedWorkspace);
      navigate(buildDashboardUrl('/communications/announcements', workspaceId));
    }
  }, [navigate, selectedWorkspace]);

  const handleNavigateToInternalTicket = useCallback(() => {
    if (selectedWorkspace) {
      const workspaceId = getWorkspaceIdForUrl(selectedWorkspace);
      navigate(buildDashboardUrl('/communications/internal-ticket', workspaceId));
    }
  }, [navigate, selectedWorkspace]);

  const handleNavigateToReporting = useCallback(() => {
    if (selectedWorkspace) {
      const workspaceId = getWorkspaceIdForUrl(selectedWorkspace);
      navigate(buildDashboardUrl('/communications/reporting', workspaceId));
    }
  }, [navigate, selectedWorkspace]);

  const handleNavigateToPolicy = useCallback(() => {
    if (selectedWorkspace) {
      const workspaceId = getWorkspaceIdForUrl(selectedWorkspace);
      navigate(buildDashboardUrl('/communications/policy', workspaceId));
    }
  }, [navigate, selectedWorkspace]);

  if (isLoading && conversations.length === 0) return <LoadingSpinner />;

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

      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        <div className={cn(
          "flex-1 flex min-h-0 relative max-w-[1400px] mx-auto w-full p-6",
          isMobile ? "overflow-hidden p-4" : "gap-6 overflow-visible"
        )}>
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
            <div className={cn(
              "shrink-0 w-full overflow-hidden p-6 border-b border-border",
              isMobile && "p-4"
            )} style={{ position: 'relative', zIndex: 100 }}>
              <div ref={filterDropdownRef} style={{ position: 'relative' }}>
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
                  <div className="boxed-dropdown-options" style={{ overflowX: 'hidden', overflowY: 'auto' }}>
                    <button
                      onClick={() => { setFilterType('all'); setShowFiltersOverlay(false); }}
                      className={cn(
                        "boxed-dropdown-option",
                        filterType === 'all' && "boxed-dropdown-option--selected"
                      )}
                      style={{ width: '100%', textAlign: 'left' }}
                    >
                      {t('messages:filters.all', 'All Messages')}
                    </button>
                    <button
                      onClick={() => { setFilterType('unread'); setShowFiltersOverlay(false); }}
                      className={cn(
                        "boxed-dropdown-option",
                        filterType === 'unread' && "boxed-dropdown-option--selected"
                      )}
                      style={{ width: '100%', textAlign: 'left' }}
                    >
                      {t('messages:filters.unreadOnly', 'Unread')}
                    </button>
                    <button
                      onClick={() => { setFilterType('unresponded'); setShowFiltersOverlay(false); }}
                      className={cn(
                        "boxed-dropdown-option",
                        filterType === 'unresponded' && "boxed-dropdown-option--selected"
                      )}
                      style={{ width: '100%', textAlign: 'left' }}
                    >
                      {t('messages:filters.unresponded', 'Unresponded')}
                    </button>
                  </div>
                )}
              </div>
            </div>

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
                      onClick={handleOpenStartNewCommunication}
                      className="bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center justify-center"
                      style={{ 
                        fontFamily: 'var(--font-family-text, Roboto, sans-serif)',
                        height: 'var(--boxed-inputfield-height)',
                        width: 'var(--boxed-inputfield-height)'
                      }}
                      title={t('messages:startNewCommunication.button', 'Start New Communication')}
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
                  messageContext={MESSAGE_CONTEXTS.PERSONAL}
                  currentUserId={user?.uid}
                />
              </div>
            )}
          </div>
        </div>

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
                messageContext={MESSAGE_CONTEXTS.PERSONAL}
                workspaceContext={selectedWorkspace}
                isTutorial={selectedConversation?.isTutorial}
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
                <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-gradient-to-b from-background via-muted/5 to-background" style={{ scrollbarGutter: 'stable' }}>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>

      <StartNewCommunicationModal
        isOpen={showStartNewCommunication}
        onClose={handleCloseStartNewCommunication}
        onSelectTeamMember={(member) => {
          console.log('Selected team member:', member);
        }}
      />
    </div>
  );
};

export default MessagesPage;

