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
import { TUTORIAL_IDS } from '../../../config/tutorialSystem';
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
  const { isTutorialActive, activeTutorial } = useTutorial();

  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showSidebar, setShowSidebar] = useState(true);
  const [showFiltersOverlay, setShowFiltersOverlay] = useState(false);
  const [readConversationIds, setReadConversationIds] = useState(new Set());
  const conversationsListener = useRef(null);
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
    if (!isTutorialActive || activeTutorial !== TUTORIAL_IDS.MESSAGES) return [];
    
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    return [
      {
        id: 'tutorial-doctor-smith',
        displayName: t('messages:tutorial.doctorName'),
        photoURL: 'https://ui-avatars.com/api/?name=Doctor+Smith&background=0D8ABC&color=fff',
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
        photoURL: 'https://ui-avatars.com/api/?name=Lausanne+Clinic&background=28a745&color=fff',
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
      if (!isTutorialActive || activeTutorial !== TUTORIAL_IDS.MESSAGES) {
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

  if (isLoading && conversations.length === 0 && (!isTutorialActive || activeTutorial !== TUTORIAL_IDS.MESSAGES)) return <LoadingSpinner />;

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
        "flex-1 flex min-h-0 relative ml-4 my-4",
        isMobile ? "p-0 overflow-hidden" : "gap-6 overflow-visible"
      )}>
        <div className={cn(
          "dashboard-sidebar-container",
          isMobile
            ? cn(
              "dashboard-sidebar-container-mobile",
              showSidebar ? "translate-x-0" : "-translate-x-full"
            )
            : "dashboard-sidebar-container-desktop pr-0"
        )}>
          <div className={cn(
            "dashboard-sidebar-inner",
            isMobile && "dashboard-sidebar-inner-mobile"
          )}>
                        <div className={cn(
                            "shrink-0 w-full",
                            isMobile ? "p-4 pb-3" : "p-4 pb-3"
                        )} style={{ position: 'relative', zIndex: 100 }}>
                            <div ref={filterDropdownRef} style={{ position: 'relative' }}>
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                                <input
                                    type="text"
                                    placeholder={t('messages:searchPlaceholder')}
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
                <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                  {searchTerm || filterType !== 'all' ? t('messages:empty.noMessagesFound') : t('messages:empty.noConversationsYet')}
                </h2>
                <p className="mb-6" style={{ color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                  {searchTerm || filterType !== 'all' ? t('messages:empty.adjustFilters') : t('messages:empty.startConversation')}
                </p>
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
          "dashboard-main-content",
          isMobile && selectedConversation ? "translate-x-0 dashboard-main-content-mobile" : "dashboard-main-content-desktop"
        )}>
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
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 ring-4 ring-background">
                  <FiMessageSquare className="w-8 h-8" style={{ color: 'var(--primary-color)' }} />
                </div>
                <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>{t('messages:selectConversation.title')}</h2>
                <p className="mb-6" style={{ color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                  {t('messages:selectConversation.subtitle')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;