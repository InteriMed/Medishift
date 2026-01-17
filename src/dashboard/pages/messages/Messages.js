import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { useDashboard } from '../../contexts/DashboardContext';
import { useMobileView } from '../../hooks/useMobileView';
import { usePageMobile } from '../../contexts/PageMobileContext';
import { WORKSPACE_TYPES } from '../../../utils/sessionAuth';
import ConversationsList from './components/ConversationsList';
import ConversationView from './components/ConversationView';
import LoadingSpinner from '../../../components/LoadingSpinner/LoadingSpinner';
import EmptyState from '../../components/EmptyState/EmptyState';
import { useNotification } from '../../../contexts/NotificationContext';
import messagesService from '../../../services/messagesService';
import { cn } from '../../../utils/cn';
import { FiMessageSquare, FiSearch, FiX, FiSliders } from 'react-icons/fi';
import { useTutorial } from '../../contexts/TutorialContext';

const MESSAGE_CONTEXTS = {
  PERSONAL: 'personal',
  FACILITY: 'facility'
};

const Messages = () => {
  const { t } = useTranslation(['messages']);
  const { showError } = useNotification();
  const { user, selectedWorkspace } = useDashboard();
  const isMobile = useMobileView();
  const pageMobileContext = usePageMobile();
  const setPageMobileStateRef = useRef(pageMobileContext?.setPageMobileState || (() => { }));
  const { isTutorialActive, activeTutorial } = useTutorial();

  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [dateRange, setDateRange] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [showFiltersOverlay, setShowFiltersOverlay] = useState(false);
  const [readConversationIds, setReadConversationIds] = useState(new Set());
  const conversationsListener = useRef(null);

  const getUserRole = useMemo(() => {
    if (!selectedWorkspace || !user) return null;
    if (selectedWorkspace.type === WORKSPACE_TYPES.PERSONAL) return 'personal';
    if (selectedWorkspace.type === WORKSPACE_TYPES.TEAM) return selectedWorkspace.role || 'employee';
    return null;
  }, [selectedWorkspace, user]);

  const canAccessFacilityMessages = useMemo(() => {
    if (!selectedWorkspace || selectedWorkspace.type !== WORKSPACE_TYPES.TEAM) return false;
    const role = getUserRole;
    return role && role !== 'employee';
  }, [selectedWorkspace, getUserRole]);

  useEffect(() => {
    if (!user || !selectedWorkspace) {
      setConversations([]);
      setIsLoading(false);
      return;
    }

    const fetchConversations = async () => {
      setIsLoading(true);
      setError(null);

      try {
        let conversationsQuery;
        const conversationsRef = collection(db, 'conversations');
        const activeTab = MESSAGE_CONTEXTS.PERSONAL;

        if (activeTab === MESSAGE_CONTEXTS.PERSONAL) {
          conversationsQuery = query(
            conversationsRef,
            where('participantIds', 'array-contains', user.uid),
            orderBy('lastMessageTimestamp', 'desc')
          );
        } else if (activeTab === MESSAGE_CONTEXTS.FACILITY && canAccessFacilityMessages) {
          conversationsQuery = query(
            conversationsRef,
            where('facilityProfileId', '==', selectedWorkspace.facilityId),
            orderBy('lastMessageTimestamp', 'desc')
          );
        } else {
          setConversations([]);
          setIsLoading(false);
          return;
        }

        if (conversationsListener.current) conversationsListener.current();

        conversationsListener.current = onSnapshot(
          conversationsQuery,
          async (snapshot) => {
            const conversationsList = [];
            snapshot.docs.forEach(doc => {
              const conversationData = doc.data();
              let displayInfo = {};
              const activeTab = MESSAGE_CONTEXTS.PERSONAL;
              if (activeTab === MESSAGE_CONTEXTS.PERSONAL) {
                const otherParticipant = conversationData.participantInfo?.find(p => p.userId !== user.uid);
                if (otherParticipant) {
                  displayInfo = {
                    displayName: otherParticipant.displayName,
                    photoURL: otherParticipant.photoURL,
                    role: otherParticipant.roleInConversation,
                    otherParticipant
                  };
                }
              } else if (activeTab === MESSAGE_CONTEXTS.FACILITY) {
                const professionalParticipant = conversationData.participantInfo?.find(p => p.roleInConversation === 'professional');
                if (professionalParticipant) {
                  displayInfo = {
                    displayName: `${professionalParticipant.displayName} (Professional)`,
                    photoURL: professionalParticipant.photoURL,
                    role: 'professional',
                    contractId: conversationData.contractId
                  };
                } else {
                  displayInfo = {
                    displayName: 'Facility Conversation',
                    photoURL: null,
                    role: 'facility',
                    contractId: conversationData.contractId
                  };
                }
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
            setError(err);
            showError(t('errors.loadingConversations', 'Failed to load conversations'));
            setIsLoading(false);
          }
        );
      } catch (err) {
        console.error('Error setting up conversations listener:', err);
        setError(err);
        showError(t('errors.loadingConversations', 'Failed to load conversations'));
        setIsLoading(false);
      }
    };

    fetchConversations();
    return () => {
      if (conversationsListener.current) conversationsListener.current();
    };
  }, [user, selectedWorkspace, canAccessFacilityMessages, t, showError]);

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

  const getMockConversations = useCallback(() => {
    if (!isTutorialActive || activeTutorial !== 'messages') return [];
    
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    return [
      {
        id: 'tutorial-doctor-smith',
        displayName: t('messages:tutorial.doctorName'),
        photoURL: null,
        lastMessage: { text: t('messages:tutorial.doctorMessage') },
        lastMessageTimestamp: { toDate: () => twoHoursAgo },
        createdAt: { toDate: () => new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
        unreadCount: 1,
        participantIds: [user?.uid || 'current-user', 'tutorial-doctor'],
        participantInfo: [
          { userId: user?.uid || 'current-user', displayName: user?.displayName || 'You', roleInConversation: 'professional' },
          { userId: 'tutorial-doctor', displayName: t('messages:tutorial.doctorName'), roleInConversation: 'professional' }
        ],
        isTutorial: true
      },
      {
        id: 'tutorial-lausanne-clinic',
        displayName: t('messages:tutorial.hospitalName'),
        photoURL: null,
        lastMessage: { text: t('messages:tutorial.hospitalMessage') },
        lastMessageTimestamp: { toDate: () => oneDayAgo },
        createdAt: { toDate: () => new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) },
        unreadCount: 0,
        participantIds: [user?.uid || 'current-user', 'tutorial-hospital'],
        participantInfo: [
          { userId: user?.uid || 'current-user', displayName: user?.displayName || 'You', roleInConversation: 'professional' },
          { userId: 'tutorial-hospital', displayName: t('messages:tutorial.hospitalName'), roleInConversation: 'facility' }
        ],
        isTutorial: true
      }
    ];
  }, [isTutorialActive, activeTutorial, user, t]);

  useEffect(() => {
    if (selectedConversation?.isTutorial) {
      if (!isTutorialActive || activeTutorial !== 'messages') {
        setSelectedConversation(null);
        if (isMobile) {
          setShowSidebar(true);
        }
        return;
      }
      const mockConversations = getMockConversations();
      const stillExists = mockConversations.some(c => c.id === selectedConversation.id);
      if (!stillExists) {
        setSelectedConversation(null);
        if (isMobile) {
          setShowSidebar(true);
        }
      }
    }
  }, [isTutorialActive, activeTutorial, selectedConversation, isMobile, getMockConversations]);

  const filterConversations = useCallback((conversationsList) => {
    let filtered = [...conversationsList];

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(conv =>
        conv.displayName?.toLowerCase().includes(searchLower) ||
        conv.lastMessage?.text?.toLowerCase().includes(searchLower)
      );
    }

    if (unreadOnly) {
      filtered = filtered.filter(conv => conv.unreadCount > 0);
    }

    if (dateRange) {
      const now = new Date();
      let cutoffDate = new Date();
      switch (dateRange) {
        case 'last-week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'last-month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        case 'last-3-months':
          cutoffDate.setMonth(now.getMonth() - 3);
          break;
        case 'last-year':
          cutoffDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          cutoffDate = new Date(0);
      }
      filtered = filtered.filter(conv => {
        const lastMessageDate = conv.lastMessageTimestamp?.toDate?.() || new Date(0);
        return lastMessageDate >= cutoffDate;
      });
    }

    return filtered;
  }, [searchTerm, unreadOnly, dateRange]);

  const allConversations = useMemo(() => {
    const mockConversations = getMockConversations();
    const all = mockConversations.length > 0 && conversations.length === 0 ? mockConversations : conversations;
    return all.map(conv => {
      if (readConversationIds.has(conv.id)) {
        return { ...conv, unreadCount: 0 };
      }
      return conv;
    });
  }, [conversations, getMockConversations, readConversationIds]);

  const filteredConversations = useMemo(() => filterConversations(allConversations), [allConversations, filterConversations]);

  const handleSelectConversation = useCallback(async (conversationId) => {
    const conversation = allConversations.find(c => c.id === conversationId);
    if (conversation) {
      setSelectedConversation(conversation);
      setReadConversationIds(prev => new Set([...prev, conversationId]));
      if (isMobile) {
        setShowSidebar(false);
      }
      if (user && !conversation.isTutorial) {
        try {
          await messagesService.markAsRead(conversationId);
        } catch (error) {
          console.error('Error marking conversation as read:', error);
        }
      }
    }
  }, [allConversations, user, isMobile]);

  const unreadCount = useMemo(() => filteredConversations.filter(c => c.unreadCount > 0).length, [filteredConversations]);

  if (isLoading && conversations.length === 0 && (!isTutorialActive || activeTutorial !== 'messages')) return <LoadingSpinner />;

  if (error) {
    return (
      <EmptyState
        title={t('errors.title')}
        description={t('errors.description')}
        actionText={t('errors.retry')}
        onAction={() => window.location.reload()}
      />
    );
  }

  return (
    <div className={cn(
      "h-full flex flex-col overflow-hidden animate-in fade-in duration-500",
      isMobile && "overflow-y-hidden"
    )}>
      {/* Page Top Bar - Search and Filters Only (Title in main header) */}
      <div className={cn(
        "shrink-0 w-full z-20 bg-card/95 backdrop-blur-sm border-b border-border shadow-sm h-16",
        isMobile ? "px-4" : "px-6"
      )}>
        {isMobile ? (
          <div className="flex items-center gap-2 h-full">
            <div className="flex-1 relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder={t('messages:searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-9 pl-9 pr-20 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
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
                  onClick={() => setShowFiltersOverlay(true)}
                  className={cn(
                    "p-1.5 rounded-full transition-colors relative",
                    (unreadOnly || dateRange) ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"
                  )}
                >
                  <FiSliders className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 h-full">
            {/* Search and Filters */}
            <div className="flex-1 flex items-center gap-3">
              {/* Search Input */}
              <div className="flex-1 relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder={t('messages:searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-9 pl-9 pr-8 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full transition-colors"
                  >
                    <FiX className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>

              {/* Filter: Message Type */}
              <select
                value={unreadOnly ? 'unread' : 'all'}
                onChange={(e) => setUnreadOnly(e.target.value === 'unread')}
                className="h-9 px-3 rounded-lg border border-input bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring transition-all shrink-0 min-w-[120px]"
              >
                <option value="all">{t('messages:filters.all')}</option>
                <option value="unread">{t('messages:filters.unreadOnly')}</option>
              </select>

              {/* Filter: Date Range */}
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="h-9 px-3 rounded-lg border border-input bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring transition-all shrink-0 min-w-[120px]"
              >
                <option value="">{t('messages:filters.date.all')}</option>
                <option value="last-week">{t('messages:filters.date.lastWeek')}</option>
                <option value="last-month">{t('messages:filters.date.lastMonth')}</option>
                <option value="last-3-months">{t('messages:filters.date.last3Months')}</option>
                <option value="last-year">{t('messages:filters.date.lastYear')}</option>
              </select>
            </div>

            {/* Right: Unread Count */}
            {unreadCount > 0 && (
              <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 bg-destructive/10 rounded-lg border border-destructive/20">
                <span className="text-xs font-medium text-muted-foreground m-0">{t('messages:unread')}</span>
                <span className="text-sm font-bold text-destructive m-0">{unreadCount}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Main Split Content */}
      <div className={cn(
        "flex-1 flex overflow-hidden min-h-0 relative",
        isMobile ? "p-0" : "p-4 gap-4"
      )}>
        {/* Left: Conversations List Sidebar (No search/filters, just list) */}
        <div className={cn(
          "flex flex-col transition-all duration-300 shrink-0",
          isMobile
            ? cn(
              "absolute inset-0 z-10 bg-background overflow-y-auto",
              showSidebar ? "translate-x-0" : "-translate-x-full"
            )
            : "w-full md:w-[320px] lg:w-[360px] pr-0 overflow-hidden"
        )}>
          {/* Sidebar Container - Just the conversation list */}
          <div className={cn(
            "flex-1 flex flex-col bg-card/60 backdrop-blur-sm border border-border shadow-sm overflow-hidden",
            isMobile ? "rounded-none border-0" : "rounded-xl"
          )}>
            {/* Conversations List */}
            {filteredConversations.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <FiMessageSquare className="w-8 h-8" style={{ color: 'var(--primary-color)' }} />
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)', margin: 0 }}>
                  {searchTerm || unreadOnly || dateRange ? t('messages:empty.noMessagesFound') : t('messages:empty.noConversationsYet')}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)', margin: 0 }}>
                  {searchTerm || unreadOnly || dateRange ? t('messages:empty.adjustFilters') : t('messages:empty.startConversation')}
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
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

        {/* Right: Content Area (Conversation View) - FIXED HEIGHT with internal scroll */}
        <div className={cn(
          "flex-1 flex flex-col bg-transparent relative min-w-0 min-h-0 transition-transform duration-300",
          isMobile && selectedConversation ? "translate-x-0 overflow-y-auto absolute inset-0 z-20" : "overflow-y-auto"
        )}>
          {selectedConversation ? (
            <div className={cn(
              "h-full w-full bg-card/60 backdrop-blur-sm border border-border shadow-sm overflow-hidden",
              isMobile ? "rounded-none border-0" : "rounded-xl"
            )}>
              <ConversationView
                conversation={selectedConversation}
                currentUser={user}
                messageContext={MESSAGE_CONTEXTS.PERSONAL}
                workspaceContext={selectedWorkspace}
                isTutorial={selectedConversation?.isTutorial}
              />
            </div>
          ) : (
            <div className="w-full flex flex-col items-center justify-center p-8 text-center z-0 min-h-[400px]">
              <div className="max-w-md w-full bg-card p-8 rounded-2xl border border-border/50 shadow-lg backdrop-blur-sm animate-in fade-in zoom-in-95 duration-500 mx-auto">
                <div className="w-16 h-16 mx-auto rounded-full bg-muted/50 flex items-center justify-center mb-6 ring-4 ring-background">
                  <FiMessageSquare className="text-muted-foreground w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">{t('messages:selectConversation.title')}</h2>
                <p className="text-muted-foreground mb-6">
                  {t('messages:selectConversation.subtitle')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;