import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { useDashboard } from '../../contexts/DashboardContext';
import { useMobileView } from '../../hooks/useMobileView';
import { usePageMobile } from '../../contexts/PageMobileContext';
import { WORKSPACE_TYPES } from '../../../utils/sessionAuth';
import ConversationsList from './components/ConversationsList';
import ThreadsList from './components/ThreadsList';
import ConversationView from './components/ConversationView';
import LoadingSpinner from '../../../components/LoadingSpinner/LoadingSpinner';
import EmptyState from '../../components/EmptyState/EmptyState';
import { useNotification } from '../../../contexts/NotificationContext';
import messagesService from '../../../services/messagesService';
import { cn } from '../../../utils/cn';
import { FiMessageSquare, FiSearch, FiX, FiSliders, FiHome, FiPlus, FiUser, FiSend, FiBell } from 'react-icons/fi';
import StartNewCommunicationModal from './components/StartNewCommunicationModal';
import '../../../components/BoxedInputFields/styles/boxedInputFields.css';

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

  const [conversations, setConversations] = useState([]);
  const [threads, setThreads] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [selectedThread, setSelectedThread] = useState(null);
  const [activeSidebarTab, setActiveSidebarTab] = useState('conversations');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showSidebar, setShowSidebar] = useState(true);
  const [showFiltersOverlay, setShowFiltersOverlay] = useState(false);
  const [readConversationIds, setReadConversationIds] = useState(new Set());
  const [readThreadIds, setReadThreadIds] = useState(new Set());
  const [isCreateThreadDialogOpen, setIsCreateThreadDialogOpen] = useState(false);
  const [isCreatingThread, setIsCreatingThread] = useState(false);
  const [threadFormData, setThreadFormData] = useState({ title: '', description: '' });
  const [showStartNewCommunication, setShowStartNewCommunication] = useState(false);
  const conversationsListener = useRef(null);
  const threadsListener = useRef(null);
  const filterDropdownRef = useRef(null);

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

  const canAccessThreads = useMemo(() => {
    return user?.hasFacilityProfile === true;
  }, [user]);

  useEffect(() => {
    if (!canAccessThreads && activeSidebarTab === 'threads') {
      setActiveSidebarTab('conversations');
      setSelectedThread(null);
    }
  }, [canAccessThreads, activeSidebarTab]);

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
    if (!user || !selectedWorkspace || !canAccessThreads) {
      setThreads([]);
      setIsLoadingThreads(false);
      if (threadsListener.current) {
        threadsListener.current();
        threadsListener.current = null;
      }
      return;
    }

    const fetchThreads = async () => {
      setIsLoadingThreads(true);
      setError(null);

      try {
        const threadsRef = collection(db, 'threads');
        const threadsQuery = query(
          threadsRef,
          where('participantIds', 'array-contains', user.uid),
          orderBy('lastMessageTimestamp', 'desc')
        );

        if (threadsListener.current) threadsListener.current();

        threadsListener.current = onSnapshot(
          threadsQuery,
          async (snapshot) => {
            const threadsList = [];
            snapshot.docs.forEach(doc => {
              const threadData = doc.data();
              const otherParticipant = threadData.participantInfo?.find(p => p.userId !== user.uid);
              let displayInfo = {};
              
              if (otherParticipant) {
                displayInfo = {
                  displayName: otherParticipant.displayName,
                  photoURL: otherParticipant.photoURL,
                  role: otherParticipant.roleInConversation
                };
              } else if (threadData.title) {
                displayInfo = {
                  displayName: threadData.title,
                  photoURL: threadData.photoURL
                };
              } else {
                displayInfo = {
                  displayName: 'Thread',
                  photoURL: null
                };
              }

              threadsList.push({ 
                id: doc.id, 
                ...threadData, 
                ...displayInfo,
                isGroupThread: (threadData.participantIds?.length || 0) > 2,
                participantCount: threadData.participantIds?.length || 0
              });
            });

            threadsList.sort((a, b) => {
              const aTime = a.lastMessageTimestamp?.toDate?.() || new Date(0);
              const bTime = b.lastMessageTimestamp?.toDate?.() || new Date(0);
              return bTime - aTime;
            });

            setThreads(threadsList);
            setIsLoadingThreads(false);
          },
          (err) => {
            console.error('Error listening to threads:', err);
            setError(err);
            showError(t('errors.loadingThreads', 'Failed to load threads'));
            setIsLoadingThreads(false);
          }
        );
      } catch (err) {
        console.error('Error setting up threads listener:', err);
        setError(err);
        showError(t('errors.loadingThreads', 'Failed to load threads'));
        setIsLoadingThreads(false);
      }
    };

    fetchThreads();
    return () => {
      if (threadsListener.current) threadsListener.current();
    };
  }, [user, selectedWorkspace, canAccessThreads, t, showError]);

  useEffect(() => {
    const setPageMobileState = setPageMobileStateRef.current;
    if (!setPageMobileState || typeof setPageMobileState !== 'function') {
      return;
    }
    if (isMobile) {
      const handleBack = () => {
        setSelectedConversation(null);
        setSelectedThread(null);
        setShowSidebar(true);
      };
      setPageMobileState(!!(selectedConversation || selectedThread), handleBack);
    } else {
      setPageMobileState(false, null);
    }
  }, [isMobile, selectedConversation, selectedThread]);

  const getMockConversations = useCallback(() => {
    return [];
  }, []);


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
      setSelectedThread(null);
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

  const handleSelectThread = useCallback(async (threadId) => {
    const thread = threads.find(t => t.id === threadId);
    if (thread) {
      setSelectedThread(thread);
      setSelectedConversation(null);
      setReadThreadIds(prev => new Set([...prev, threadId]));
      if (isMobile) {
        setShowSidebar(false);
      }
    }
  }, [threads, isMobile]);

  const handleCreateThread = useCallback(async () => {
    if (!threadFormData.title.trim()) {
      showError(t('messages:errors.title', 'Title is required'));
      return;
    }

    if (!user) return;

    try {
      setIsCreatingThread(true);
      const threadData = {
        title: threadFormData.title,
        description: threadFormData.description || '',
        participantIds: [user.uid],
        participantInfo: [{
          userId: user.uid,
          displayName: user.displayName || user.email || 'User',
          photoURL: user.photoURL || null,
          roleInConversation: 'creator'
        }],
        lastMessage: {
          text: threadFormData.description || '',
          senderId: user.uid,
          timestamp: serverTimestamp()
        },
        lastMessageTimestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.uid
      };

      await addDoc(collection(db, 'threads'), threadData);
      
      setIsCreateThreadDialogOpen(false);
      setThreadFormData({ title: '', description: '' });
    } catch (error) {
      console.error('Error creating thread:', error);
      showError(error.message || t('messages:errors.loadingThreads', 'Failed to create thread'));
    } finally {
      setIsCreatingThread(false);
    }
  }, [threadFormData, user, showError, t]);

  const filterThreads = useCallback((threadsList) => {
    let filtered = [...threadsList];

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(thread =>
        (thread.title || thread.displayName)?.toLowerCase().includes(searchLower) ||
        thread.lastMessage?.text?.toLowerCase().includes(searchLower) ||
        thread.description?.toLowerCase().includes(searchLower)
      );
    }

    if (filterType === 'unread') {
      filtered = filtered.filter(thread => thread.unreadCount > 0);
    } else if (filterType === 'unresponded') {
      filtered = filtered.filter(thread =>
        thread.lastMessage?.senderId !== user?.uid && thread.unreadCount > 0
      );
    }

    return filtered;
  }, [searchTerm, filterType, user]);

  const allThreads = useMemo(() => {
    return threads.map(thread => {
      if (readThreadIds.has(thread.id)) {
        return { ...thread, unreadCount: 0 };
      }
      return thread;
    });
  }, [threads, readThreadIds]);

  const filteredThreads = useMemo(() => filterThreads(allThreads), [allThreads, filterThreads]);

  const unreadCount = useMemo(() => filteredConversations.filter(c => c.unreadCount > 0).length, [filteredConversations]);

  if (isLoading && conversations.length === 0) return <LoadingSpinner />;

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
      "h-full flex flex-col overflow-hidden animate-in fade-in duration-500 messages-page",
      isMobile && "overflow-y-hidden"
    )} style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
      <div className={cn(
        "flex-1 flex min-h-0 relative mx-4 my-4",
        isMobile ? "p-0 overflow-hidden" : "gap-6 overflow-visible"
      )}>
        <div className={cn(
          "dashboard-sidebar-container",
          isMobile
            ? cn(
              "dashboard-sidebar-container-mobile",
              showSidebar ? "translate-x-0" : "-translate-x-full"
            )
            : "dashboard-sidebar-container-desktop content-sidebar pr-0"
        )}>
          <div className={cn(
            "dashboard-sidebar-inner",
            isMobile && "dashboard-sidebar-inner-mobile"
          )}>
            <div className={cn(
              "shrink-0 w-full overflow-hidden",
              isMobile ? "px-4 pt-4" : "px-4 pt-4"
            )} style={{ position: 'relative', zIndex: 100 }}>
              <div className="grid grid-cols-2 gap-2 mb-3 border-b border-border w-full">
                <button
                  onClick={() => {
                    setActiveSidebarTab('conversations');
                    setSelectedThread(null);
                  }}
                  className={cn(
                    "w-full px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                    activeSidebarTab === 'conversations'
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div className="flex items-center justify-center gap-2">
                    <FiMessageSquare className="w-4 h-4" />
                    <span>{t('messages:tabs.messages', 'Messages')}</span>
                  </div>
                </button>
                <button
                  onClick={() => {
                    if (canAccessThreads) {
                      setActiveSidebarTab('threads');
                      setSelectedConversation(null);
                    }
                  }}
                  disabled={!canAccessThreads}
                  className={cn(
                    "w-full px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                    !canAccessThreads && "opacity-50 cursor-not-allowed",
                    activeSidebarTab === 'threads' && canAccessThreads
                      ? "border-primary text-primary"
                      : canAccessThreads
                      ? "border-transparent text-muted-foreground hover:text-foreground"
                      : "border-transparent text-muted-foreground/50"
                  )}
                  title={!canAccessThreads ? t('messages:tabs.announcementsLocked', 'Announcements are only available for facility members') : undefined}
                >
                  <div className="flex items-center justify-center gap-2">
                    <FiBell className="w-4 h-4" />
                    <span>{t('messages:tabs.announcements', 'Announcements')}</span>
                  </div>
                </button>
              </div>
              <div className={cn(
                isMobile ? "pb-3" : "pb-3"
              )}>
                <div ref={filterDropdownRef} style={{ position: 'relative' }}>
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                <input
                  type="text"
                  placeholder="Search"
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
                      {t('messages:filters.all', 'All')}
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
            </div>

            {activeSidebarTab === 'conversations' ? (
              filteredConversations.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 ring-4 ring-background">
                    <FiMessageSquare className="w-8 h-8" style={{ color: 'var(--primary-color)' }} />
                  </div>
                  <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                    {searchTerm || filterType !== 'all' ? t('messages:empty.noMessagesFound') : t('messages:empty.noConversationsYet')}
                  </h2>
                  {!searchTerm && filterType === 'all' && (
                    <>
                      <p className="mb-6" style={{ color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                        {t('messages:noConversationsHint', 'Start new conversation')}
                      </p>
                      <button
                        onClick={() => setShowStartNewCommunication(true)}
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
              )
            ) : !canAccessThreads ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mb-6 ring-4 ring-background">
                  <FiHome className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <h2 className="text-lg font-semibold mb-2 text-muted-foreground/70" style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                  {t('messages:empty.threadsLocked', 'Threads unavailable')}
                </h2>
                <p className="mb-6 text-muted-foreground/60" style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                  {t('messages:empty.threadsLockedDescription', 'Threads are only available for users who belong to a facility')}
                </p>
              </div>
            ) : isLoadingThreads ? (
              <div className="flex-1 flex items-center justify-center">
                <LoadingSpinner />
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 ring-4 ring-background">
                  <FiHome className="w-8 h-8" style={{ color: 'var(--primary-color)' }} />
                </div>
                <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                  {searchTerm || filterType !== 'all' ? t('messages:empty.noThreadsFound', 'No threads found') : t('messages:empty.noThreadsYet', 'No threads yet')}
                </h2>
                <p className="mb-6" style={{ color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                  {searchTerm || filterType !== 'all' ? t('messages:empty.adjustFilters') : t('messages:empty.startThread', 'Start a new thread')}
                </p>
                {!searchTerm && filterType === 'all' && (
                  <button
                    onClick={() => setIsCreateThreadDialogOpen(true)}
                    className="bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center justify-center"
                    style={{ 
                      fontFamily: 'var(--font-family-text, Roboto, sans-serif)',
                      height: 'var(--boxed-inputfield-height)',
                      width: 'var(--boxed-inputfield-height)'
                    }}
                    title={t('messages:empty.startThread', 'Start new communication')}
                  >
                    <FiPlus className="w-5 h-5" />
                  </button>
                )}
              </div>
            ) : (
              <>
                {activeSidebarTab === 'threads' && (
                  <div className="px-4 pb-2">
                    <button
                      onClick={() => setIsCreateThreadDialogOpen(true)}
                      className="w-full px-4 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 text-sm"
                      style={{ 
                        fontFamily: 'var(--font-family-text, Roboto, sans-serif)',
                        height: 'var(--boxed-inputfield-height)'
                      }}
                    >
                      <FiPlus className="w-4 h-4" />
                      {t('messages:empty.new', '+ New')}
                    </button>
                  </div>
                )}
                <div className="flex-1 overflow-y-auto">
                  <ThreadsList
                    threads={filteredThreads}
                    selectedThreadId={selectedThread?.id}
                    onSelectThread={handleSelectThread}
                    currentUserId={user?.uid}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <div className={cn(
          "dashboard-main-content",
          isMobile && selectedConversation ? "translate-x-0 dashboard-main-content-mobile" : "dashboard-main-content-desktop"
        )}>
          <div className={cn(
            "dashboard-main-inner",
            isMobile && "dashboard-main-inner-mobile"
          )}>
            {selectedConversation || selectedThread ? (
              <ConversationView
                conversation={selectedConversation || selectedThread}
                currentUser={user}
                messageContext={MESSAGE_CONTEXTS.PERSONAL}
                workspaceContext={selectedWorkspace}
                isTutorial={(selectedConversation || selectedThread)?.isTutorial}
              />
            ) : (
              <div className="w-full h-full flex flex-col bg-background relative">
                <div className="shrink-0 flex items-center gap-4 px-4 sm:px-6 md:px-8 py-5 border-b border-border/50 bg-gradient-to-r from-card/95 via-card/90 to-card/95 backdrop-blur-sm">
                  <div className="shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <FiUser className="w-6 h-6 text-primary" />
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
                <div className="shrink-0 px-4 py-4 border-t border-border/50 bg-card/95 backdrop-blur-sm">
                  <style>{`
                    .message-textarea::-webkit-scrollbar {
                      display: none;
                    }
                    .message-textarea {
                      -ms-overflow-style: none;
                      scrollbar-width: none;
                    }
                  `}</style>
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-10 h-10 rounded-full bg-muted/50 border border-border/50 flex items-center justify-center opacity-50">
                      <FiUser className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 relative">
                      <textarea
                        disabled
                        placeholder={t('messages:placeholders.typeMessage', 'Type Message')}
                        rows={1}
                        className="message-textarea w-full resize-none px-4 py-3 rounded-xl border-2 border-input/50 bg-background/50 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-all overflow-y-auto opacity-50 cursor-not-allowed"
                        style={{
                          height: '44px',
                          minHeight: '44px',
                          maxHeight: '120px',
                          fontFamily: 'var(--font-family-text, Roboto, sans-serif)',
                          lineHeight: '1.5',
                          margin: 0
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      disabled
                      className="shrink-0 w-11 h-11 flex items-center justify-center rounded-xl transition-all bg-primary/30 text-primary-foreground shadow-sm opacity-50 cursor-not-allowed border border-primary/20"
                      style={{ margin: 0 }}
                    >
                      <FiSend className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {isCreateThreadDialogOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-lg font-semibold flex items-center gap-2" style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                <FiHome className="w-5 h-5 text-primary" />
                {t('messages:empty.new', '+ New')}
              </h3>
              <button
                onClick={() => {
                  setIsCreateThreadDialogOpen(false);
                  setThreadFormData({ title: '', description: '' });
                }}
                className="p-1 rounded-full hover:bg-muted transition-colors"
              >
                <FiX className="w-5 h-5 opacity-70" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleCreateThread(); }} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                    {t('messages:errors.title', 'Title')} *
                  </label>
                  <input
                    type="text"
                    value={threadFormData.title}
                    onChange={(e) => setThreadFormData({ ...threadFormData, title: e.target.value })}
                    placeholder="Thread title..."
                    className="w-full px-4 py-2 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                    Description (Optional)
                  </label>
                  <textarea
                    value={threadFormData.description}
                    onChange={(e) => setThreadFormData({ ...threadFormData, description: e.target.value })}
                    placeholder="Add a description or initial message..."
                    rows={4}
                    className="w-full px-4 py-2 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateThreadDialogOpen(false);
                    setThreadFormData({ title: '', description: '' });
                  }}
                  className="px-4 py-2 rounded-xl font-medium hover:bg-muted transition-colors"
                  style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingThread || !threadFormData.title.trim()}
                  className="px-6 py-2 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}
                >
                  {isCreatingThread ? 'Creating...' : 'Create Thread'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <StartNewCommunicationModal
        isOpen={showStartNewCommunication}
        onClose={() => setShowStartNewCommunication(false)}
        onSelectTeamMember={(member) => {
          console.log('Selected team member:', member);
        }}
      />
    </div>
  );
};

export default Messages;