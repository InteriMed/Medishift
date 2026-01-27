import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { useDashboard } from '../../contexts/DashboardContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { AnnouncementsToolbar } from './components/AnnouncementsToolbar';
import { AnnouncementDetail } from './components/AnnouncementDetail';
import LoadingSpinner from '../../../components/LoadingSpinner/LoadingSpinner';
import Dialog from '../../../components/Dialog/Dialog';
import BoxedSwitchField from '../../../components/BoxedInputFields/BoxedSwitchField';
import InputField from '../../../components/BoxedInputFields/Personnalized-InputField';
import InputFieldParagraph from '../../../components/BoxedInputFields/TextareaField';
import SimpleDropdown from '../../../components/BoxedInputFields/Dropdown-Field';
import DateField from '../../../components/BoxedInputFields/DateField';
import { cn } from '../../../utils/cn';
import { FiMessageSquare, FiBarChart2, FiHeart, FiPlus, FiX, FiBell, FiInfo, FiSettings, FiShield, FiFileText } from 'react-icons/fi';
import { buildDashboardUrl, getWorkspaceIdForUrl } from '../../utils/pathUtils';

const AnnouncementsPage = () => {
  const { t } = useTranslation(['messages']);
  const { showError, showSuccess } = useNotification();
  const { user, selectedWorkspace } = useDashboard();
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();
  const workspaceId = getWorkspaceIdForUrl(selectedWorkspace);

  const threadIdFromUrl = params.threadId || location.pathname.split('/').pop();
  const isThreadDetail = threadIdFromUrl && threadIdFromUrl !== 'announcements' && threadIdFromUrl !== 'messages';

  const [threads, setThreads] = useState([]);
  const [selectedThreadId, setSelectedThreadId] = useState(isThreadDetail ? threadIdFromUrl : null);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateAnnouncementOpen, setIsCreateAnnouncementOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    targetRoles: 'all', 
    title: '', 
    description: '', 
    urgency: 'warning',
    category: '',
    publishDate: null,
    displayUntilDate: null
  });
  const [isCreating, setIsCreating] = useState(false);
  const [hasPoll, setHasPoll] = useState(false);
  const [pollData, setPollData] = useState({ 
    question: '', 
    itemType: 'multipleChoice',
    options: ['', ''],
    showResultsToEveryone: false
  });
  const threadsListener = useRef(null);

  const canAccessThreads = useMemo(() => {
    return user?.hasFacilityProfile === true;
  }, [user]);

  const loadThreads = useCallback(async () => {
    try {
      setIsLoading(true);
      if (!user || !canAccessThreads) {
        setThreads([]);
        setIsLoading(false);
        return;
      }

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
            const creator = threadData.participantInfo?.find(p => p.userId === threadData.createdBy) || threadData.participantInfo?.[0];
            
            threadsList.push({ 
              id: doc.id, 
              ...threadData,
              user_username: creator?.displayName || 'Anonymous',
              user_email: creator?.email || '',
              title: threadData.title || 'Untitled Announcement',
              content: threadData.description || threadData.lastMessage?.text || '',
              created_at: threadData.createdAt?.toDate?.()?.toISOString() || threadData.lastMessageTimestamp?.toDate?.()?.toISOString() || new Date().toISOString(),
              replies: [],
              upvotes: 0,
              is_pinned: threadData.isPinned || false
            });
          });

          threadsList.sort((a, b) => {
            const aTime = new Date(a.created_at);
            const bTime = new Date(b.created_at);
            return bTime - aTime;
          });

          setThreads(threadsList);
          setIsLoading(false);
        },
        (err) => {
          console.error('Error listening to threads:', err);
          showError('Failed to load announcements');
          setIsLoading(false);
        }
      );
    } catch (err) {
      console.error('Error setting up threads listener:', err);
      showError('Failed to load announcements');
      setIsLoading(false);
    }
  }, [user, canAccessThreads, showError]);

  useEffect(() => {
    loadThreads();
    return () => {
      if (threadsListener.current) threadsListener.current();
    };
  }, [loadThreads]);

  useEffect(() => {
    const pathSegments = location.pathname.split('/');
    const lastSegment = pathSegments[pathSegments.length - 1];
    if (lastSegment === 'new') {
      setIsCreateAnnouncementOpen(true);
    } else {
      setIsCreateAnnouncementOpen(false);
    }

    const handleOpenModal = (event) => {
      if (event.detail?.type === 'createAnnouncement') {
        navigate(buildDashboardUrl('/announcements/new', workspaceId));
      }
    };

    window.addEventListener('openModal', handleOpenModal);
    return () => window.removeEventListener('openModal', handleOpenModal);
  }, [location.pathname, navigate, workspaceId]);

  const handleCreateAnnouncement = async () => {
    if (!createFormData.title.trim() || !createFormData.description.trim()) {
      showError('Please fill in all fields');
      return;
    }

    if (hasPoll) {
      if (!pollData.question.trim()) {
        showError('Please enter a poll question');
        return;
      }
      if (pollData.itemType === 'multipleChoice' || pollData.itemType === 'multipleChoiceGrid') {
        const validOptions = pollData.options.filter(opt => opt.trim());
        if (validOptions.length < 2) {
          showError('Please add at least 2 poll options');
          return;
        }
      }
    }

    if (!user) return;

    try {
      setIsCreating(true);
      const threadData = {
        title: createFormData.title,
        description: createFormData.description,
        participantIds: [user.uid],
        participantInfo: [{
          userId: user.uid,
          displayName: user.displayName || user.email || 'User',
          photoURL: user.photoURL || null,
          roleInConversation: 'creator'
        }],
        lastMessage: {
          text: createFormData.description,
          senderId: user.uid,
          timestamp: serverTimestamp()
        },
        lastMessageTimestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.uid,
        urgency: createFormData.urgency,
        targetRoles: createFormData.targetRoles || 'all',
        category: createFormData.category || '',
        publishDate: createFormData.publishDate ? (createFormData.publishDate instanceof Date ? createFormData.publishDate.toISOString().split('T')[0] : typeof createFormData.publishDate === 'string' ? createFormData.publishDate : null) : null,
        displayUntilDate: createFormData.displayUntilDate ? (createFormData.displayUntilDate instanceof Date ? createFormData.displayUntilDate.toISOString().split('T')[0] : typeof createFormData.displayUntilDate === 'string' ? createFormData.displayUntilDate : null) : null,
        ...(hasPoll && {
          poll: {
            question: pollData.question,
            itemType: pollData.itemType,
            showResultsToEveryone: pollData.showResultsToEveryone || false,
            ...(pollData.itemType === 'multipleChoice' || pollData.itemType === 'multipleChoiceGrid' ? {
              options: pollData.options.filter(opt => opt.trim()).map(opt => ({
                text: opt.trim(),
                votes: 0,
                voters: []
              }))
            } : {})
          }
        })
      };

      await addDoc(collection(db, 'threads'), threadData);
      showSuccess('Announcement created successfully');
      setIsCreateAnnouncementOpen(false);
      setCreateFormData({ title: '', description: '', urgency: 'warning', targetRoles: 'all', category: '', publishDate: null, displayUntilDate: null });
      setHasPoll(false);
      setPollData({ question: '', itemType: 'multipleChoice', options: ['', ''] });
      navigate(buildDashboardUrl('/announcements', workspaceId));
      loadThreads();
    } catch (error) {
      console.error('Error creating announcement:', error);
      showError('Failed to create announcement');
    } finally {
      setIsCreating(false);
    }
  };

  const filteredThreads = useMemo(() => {
    let currentThreads = threads;

    if (selectedFilter !== 'all') {
      if (selectedFilter === 'unread') {
        currentThreads = currentThreads.filter(t => t.unreadCount > 0);
      } else if (selectedFilter === 'unresponded') {
        currentThreads = currentThreads.filter(t =>
          t.lastMessage?.senderId !== user?.uid && t.unreadCount > 0
        );
      }
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      currentThreads = currentThreads.filter(t =>
        t.title.toLowerCase().includes(query) ||
        t.content.toLowerCase().includes(query) ||
        (t.user_username || '').toLowerCase().includes(query)
      );
    }

    return currentThreads;
  }, [threads, selectedFilter, searchQuery, user]);

  useEffect(() => {
    if (isThreadDetail && threadIdFromUrl) {
      setSelectedThreadId(threadIdFromUrl);
    } else if (!isThreadDetail) {
      setSelectedThreadId(null);
    }
  }, [isThreadDetail, threadIdFromUrl, location.pathname]);

  const handleThreadClick = (threadId) => {
    setSelectedThreadId(threadId);
    navigate(buildDashboardUrl(`/announcements/${threadId}`, workspaceId));
  };

  const handleBack = () => {
    setSelectedThreadId(null);
    navigate(buildDashboardUrl('/announcements', workspaceId));
  };

  if (selectedThreadId) {
    return (
      <AnnouncementDetail
        threadId={selectedThreadId}
        onBack={handleBack}
      />
    );
  }

  const tabs = [
    { id: 'messages', path: 'messages', label: t('messages:tabs.messages', 'Messages'), icon: FiMessageSquare },
    { id: 'announcements', path: 'announcements', label: t('messages:tabs.announcements', 'Announcements'), icon: FiBell },
    { id: 'internalTicket', path: 'internal-ticket', label: t('messages:tabs.internalTicket', 'Internal Ticket'), icon: FiFileText },
    { id: 'reporting', path: 'reporting', label: t('messages:tabs.reporting', 'Reporting'), icon: FiShield },
  ];


  if (!canAccessThreads) {
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
                const isActive = tab.id === 'announcements';
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      if (tab.id === 'messages') {
                        navigate(buildDashboardUrl('/messages', workspaceId));
                      } else if (tab.id === 'internalTicket') {
                        navigate(buildDashboardUrl('/internal-ticket', workspaceId));
                      } else if (tab.id === 'reporting') {
                        navigate(buildDashboardUrl('/reporting', workspaceId));
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
          <div className="w-full max-w-[1400px] mx-auto flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <FiBell className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Announcements unavailable</h3>
            <p className="text-muted-foreground">Announcements are only available for users who belong to a facility</p>
          </div>
        </div>
      </div>
    );
  }

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
              const isActive = tab.id === 'announcements';
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.id === 'messages') {
                      navigate(buildDashboardUrl('/messages', workspaceId));
                    } else if (tab.id === 'internalTicket') {
                      navigate(buildDashboardUrl('/internal-ticket', workspaceId));
                    } else if (tab.id === 'reporting') {
                      navigate(buildDashboardUrl('/reporting', workspaceId));
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
          <AnnouncementsToolbar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedFilter={selectedFilter}
            setSelectedFilter={setSelectedFilter}
            onCreateAnnouncement={() => navigate(buildDashboardUrl('/announcements/new', workspaceId))}
          />

          <div className="w-full max-w-[1400px] mx-auto pt-6">
            <div className="space-y-4 px-6">
              {isLoading ? (
                <LoadingSpinner />
              ) : filteredThreads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <FiMessageSquare className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No announcements found</h3>
                  <p className="text-muted-foreground mb-6">Get started by creating a new announcement.</p>
                  <button
                    onClick={() => navigate(buildDashboardUrl('/announcements/new', workspaceId))}
                    className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center gap-2"
                  >
                    <FiPlus className="w-5 h-5" />
                    Create Announcement
                  </button>
                </div>
              ) : (
                filteredThreads.map((thread, index) => (
                  <div
                    key={thread.id}
                    onClick={() => handleThreadClick(thread.id)}
                    className={cn(
                      "group bg-card hover:bg-card/80 border border-border hover:border-primary/20 rounded-xl px-6 pb-6 cursor-pointer transition-all duration-300 hover:shadow-md",
                      index === 0 ? "pt-6" : "pt-0"
                    )}
                  >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold border border-border">
                        {(thread.user_username || thread.user_email || 'A').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground flex items-center gap-2">
                          {thread.user_username || 'Anonymous'}
                          {thread.is_pinned && (
                            <span className="bg-yellow-500/10 text-yellow-600 text-[10px] px-2 py-0.5 rounded-full border border-yellow-500/20 flex items-center gap-1">
                              <FiBarChart2 className="w-3 h-3 rotate-90" /> Pinned
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {thread.created_at ? new Date(thread.created_at).toLocaleDateString() : 'Just now'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors line-clamp-1">{thread.title}</h3>
                  <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed mb-4">{thread.content}</p>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
                    <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-md bg-white border border-border", thread.upvotes > 0 && "text-rose-500")}>
                      <FiHeart className={cn("w-3.5 h-3.5", thread.upvotes > 0 && "fill-current")} />
                      <span>{thread.upvotes || 0} {thread.upvotes === 1 ? 'Upvote' : 'Upvotes'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white border border-border">
                      <FiMessageSquare className="w-3.5 h-3.5" />
                      <span>{thread.replies?.length || 0} {thread.replies?.length === 1 ? 'reply' : 'replies'}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <Dialog
          isOpen={isCreateAnnouncementOpen}
          onClose={() => {
            if (!isCreating) {
              setIsCreateAnnouncementOpen(false);
              setCreateFormData({ title: '', description: '', urgency: 'warning', targetRoles: 'all', category: '', publishDate: null, displayUntilDate: null });
              setHasPoll(false);
              setPollData({ question: '', itemType: 'multipleChoice', options: ['', ''], showResultsToEveryone: false });
              navigate(buildDashboardUrl('/announcements', workspaceId));
            }
          }}
          title={t('messages:createAnnouncement', 'New Announcement')}
          size={hasPoll ? "large" : "small"}
          messageType={createFormData.urgency === 'danger' ? 'error' : createFormData.urgency === 'warning' ? 'warning' : createFormData.urgency === 'info' ? 'info' : 'success'}
          closeOnBackdropClick={!isCreating}
          actions={
            <div className="flex justify-between gap-3 w-full">
              <button
                onClick={() => {
                  if (!isCreating) {
                    setIsCreateAnnouncementOpen(false);
                    setCreateFormData({ title: '', description: '', urgency: 'warning', targetRoles: 'all', category: '', publishDate: null, displayUntilDate: null });
                    setHasPoll(false);
                    setPollData({ question: '', itemType: 'multipleChoice', options: ['', ''] });
                    navigate(buildDashboardUrl('/announcements', workspaceId));
                  }
                }}
                disabled={isCreating}
                className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('common:cancel', 'Cancel')}
              </button>
              <button
                onClick={handleCreateAnnouncement}
                disabled={!createFormData.title.trim() || !createFormData.description.trim() || isCreating}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating
                  ? t('common:creating', 'Creating...')
                  : t('messages:createAnnouncementButton', 'Create Announcement')}
              </button>
            </div>
          }
        >
          <div className={hasPoll ? "grid grid-cols-2 gap-6" : "space-y-4"}>
            <div className={hasPoll ? "space-y-4" : "space-y-4"}>
              {/* Urgency */}
              <div className="mt-4">
                <SimpleDropdown
                  label={t('messages:announcementUrgency', 'Urgency')}
                  options={[
                    { value: 'danger', label: t('messages:urgency.critical', 'Critical') },
                    { value: 'warning', label: t('messages:urgency.important', 'Important') },
                    { value: 'info', label: t('messages:urgency.informational', 'Informational') },
                    { value: 'validation', label: t('messages:urgency.actionRequired', 'Action Required') }
                  ]}
                  value={createFormData.urgency}
                  onChange={(value) => setCreateFormData({ ...createFormData, urgency: value })}
                  disabled={isCreating}
                  required
                />
              </div>

              {/* Target Roles */}
              <SimpleDropdown
                label={t('messages:announcementRoles', 'Target Roles')}
                options={[
                  { value: 'all', label: t('messages:roles.all', 'All Roles') },
                  { value: 'admin', label: t('messages:roles.admin', 'Admin') },
                  { value: 'pharmacist', label: t('messages:roles.pharmacist', 'Pharmacist') },
                  { value: 'pharmacy_technician', label: t('messages:roles.pharmacyTechnician', 'Pharmacy Technician') },
                  { value: 'intern', label: t('messages:roles.intern', 'Intern') },
                  { value: 'scheduler', label: t('messages:roles.scheduler', 'Scheduler') },
                  { value: 'recruiter', label: t('messages:roles.recruiter', 'Recruiter') },
                  { value: 'employee', label: t('messages:roles.employee', 'Employee') }
                ]}
                value={createFormData.targetRoles || 'all'}
                onChange={(value) => setCreateFormData({ ...createFormData, targetRoles: value })}
                disabled={isCreating}
              />

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t('messages:category', 'Category')}
                </label>
                <div className="space-y-2">
                  <SimpleDropdown
                    options={[
                      { value: '', label: t('messages:category.none', 'No Category') },
                      ...categories.map(cat => ({ value: cat.id, label: cat.name })),
                      { value: '__new__', label: t('messages:category.createNew', '+ Create New Category') }
                    ]}
                    value={createFormData.category || ''}
                    onChange={(value) => {
                      if (value === '__new__') {
                        setShowNewCategoryInput(true);
                      } else {
                        setCreateFormData({ ...createFormData, category: value });
                        setShowNewCategoryInput(false);
                      }
                    }}
                    disabled={isCreating}
                  />
                  {showNewCategoryInput && (
                    <div className="flex gap-2">
                      <InputField
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder={t('messages:category.namePlaceholder', 'Category name...')}
                        disabled={isCreating}
                        name="newCategory"
                        marginBottom={0}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newCategoryName.trim()) {
                            const newCategory = { id: Date.now().toString(), name: newCategoryName.trim() };
                            setCategories([...categories, newCategory]);
                            setCreateFormData({ ...createFormData, category: newCategory.id });
                            setNewCategoryName('');
                            setShowNewCategoryInput(false);
                          }
                        }}
                        disabled={isCreating || !newCategoryName.trim()}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {t('common:add', 'Add')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewCategoryInput(false);
                          setNewCategoryName('');
                        }}
                        disabled={isCreating}
                        className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                      >
                        {t('common:cancel', 'Cancel')}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Separator */}
              <div className="border-t border-border my-4"></div>

              {/* Title */}
              <div className="mt-4">
                <InputField
                  label={t('messages:announcementTitle', 'Title')}
                  value={createFormData.title}
                  onChange={(e) => setCreateFormData({ ...createFormData, title: e.target.value })}
                  placeholder={t('messages:announcementTitlePlaceholder', "What's your announcement?")}
                  required
                  disabled={isCreating}
                  name="announcementTitle"
                />
              </div>

              {/* Content */}
              <InputFieldParagraph
                label={t('messages:announcementContent', 'Content')}
                value={createFormData.description}
                onChange={(e) => setCreateFormData({ ...createFormData, description: e.target.value })}
                placeholder={t('messages:announcementContentPlaceholder', 'Elaborate on your announcement...')}
                rows={5}
                disabled={isCreating}
                name="announcementContent"
                required
              />

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <DateField
                  label={t('messages:announcementPublishDate', 'Publish Date')}
                  value={createFormData.publishDate ? new Date(createFormData.publishDate) : null}
                  onChange={(date) => setCreateFormData({ ...createFormData, publishDate: date })}
                  disabled={isCreating}
                  marginBottom={0}
                />
                <DateField
                  label={t('messages:announcementDisplayUntil', 'Display Until')}
                  value={createFormData.displayUntilDate ? new Date(createFormData.displayUntilDate) : null}
                  onChange={(date) => setCreateFormData({ ...createFormData, displayUntilDate: date })}
                  disabled={isCreating}
                  marginBottom={0}
                />
              </div>

              {/* Separator */}
              <div className="border-t border-border my-4"></div>

              {/* Poll Options */}
              <div className="pt-2">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm font-medium text-foreground">
                    {t('messages:pollOptions', 'Poll Options')}
                  </span>
                  <div className="relative group">
                    <FiInfo className="w-4 h-4 text-muted-foreground cursor-help" />
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-64 max-w-[256px] p-3 bg-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none border border-border overflow-hidden box-border" style={{ color: 'var(--color-logo-1)' }}>
                      <div className="space-y-1 break-words box-border" style={{ overflowWrap: 'break-word', wordBreak: 'break-word', maxWidth: '100%' }}>
                        <div className="font-semibold mb-2 break-words">{t('messages:pollInfoTitle', 'Poll Options')}</div>
                        <ul className="space-y-1 list-disc pl-5 break-words" style={{ listStylePosition: 'outside' }}>
                          <li className="break-words">{t('messages:pollInfo', 'Add a poll to gather feedback from your workspace members')}</li>
                        </ul>
                      </div>
                      <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent" style={{ borderRightColor: 'white' }}></div>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <BoxedSwitchField
                    label={t('messages:includePoll', 'Include a poll')}
                    checked={hasPoll}
                    onChange={setHasPoll}
                    disabled={isCreating}
                  />
                </div>
              </div>
            </div>

            {hasPoll && (
              <div className="space-y-4 pt-2 border-l border-border pl-6 overflow-y-auto max-h-[600px]">
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-foreground">
                      {t('messages:pollQuestion', 'Poll Question')}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setPollData({ ...pollData, question: '' });
                      }}
                      disabled={isCreating}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      {t('common:reset', 'Clear')}
                    </button>
                  </div>
                  <InputField
                    value={pollData.question}
                    onChange={(e) => setPollData({ ...pollData, question: e.target.value })}
                    placeholder={t('messages:pollQuestionPlaceholder', 'Enter your poll question...')}
                    disabled={isCreating}
                    name="pollQuestion"
                    marginBottom={0}
                  />
                </div>

                <SimpleDropdown
                  label={t('messages:pollItemType', 'Item Type')}
                  options={[
                    { value: 'shortAnswer', label: t('messages:pollItemType.shortAnswer', 'Short Answer') },
                    { value: 'longAnswer', label: t('messages:pollItemType.longAnswer', 'Long Answer') },
                    { value: 'multipleChoice', label: t('messages:pollItemType.multipleChoice', 'Multiple Choice') },
                    { value: 'multipleChoiceGrid', label: t('messages:pollItemType.multipleChoiceGrid', 'Multiple Choice Grid') },
                    { value: 'date', label: t('messages:pollItemType.date', 'Date') },
                    { value: 'time', label: t('messages:pollItemType.time', 'Time') }
                  ]}
                  value={pollData.itemType}
                  onChange={(value) => {
                    setPollData({ 
                      ...pollData, 
                      itemType: value,
                      options: value === 'multipleChoice' || value === 'multipleChoiceGrid' ? ['', ''] : []
                    });
                  }}
                  disabled={isCreating}
                />

                {pollData.itemType === 'shortAnswer' && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      {t('messages:pollPreview', 'Preview')}
                    </label>
                    <InputField
                      value=""
                      placeholder={t('messages:pollShortAnswerPlaceholder', 'Short answer...')}
                      disabled={true}
                      name="pollShortAnswerPreview"
                      marginBottom={0}
                    />
                  </div>
                )}

                {pollData.itemType === 'longAnswer' && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      {t('messages:pollPreview', 'Preview')}
                    </label>
                    <InputFieldParagraph
                      value=""
                      placeholder={t('messages:pollLongAnswerPlaceholder', 'Long answer...')}
                      disabled={true}
                      name="pollLongAnswerPreview"
                      rows={4}
                    />
                  </div>
                )}

                <div className="mt-4">
                  <BoxedSwitchField
                    label={t('messages:showResultsToEveryone', 'Show results to everyone')}
                    checked={pollData.showResultsToEveryone || false}
                    onChange={(checked) => setPollData({ ...pollData, showResultsToEveryone: checked })}
                    disabled={isCreating}
                  />
                </div>

                {(pollData.itemType === 'multipleChoice' || pollData.itemType === 'multipleChoiceGrid') && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      {t('messages:pollOptionsLabel', 'Poll Options')}
                    </label>
                    <div className="space-y-2">
                      {pollData.options.map((option, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <InputField
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...pollData.options];
                              newOptions[index] = e.target.value;
                              setPollData({ ...pollData, options: newOptions });
                            }}
                            placeholder={t('messages:pollOptionPlaceholder', 'Option {{index}}', { index: index + 1 })}
                            disabled={isCreating}
                            name={`pollOption${index}`}
                            marginBottom={0}
                          />
                          {pollData.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newOptions = pollData.options.filter((_, i) => i !== index);
                                setPollData({ ...pollData, options: newOptions });
                              }}
                              disabled={isCreating}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
                            >
                              <FiX className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      {pollData.options.length < 10 && (
                        <button
                          type="button"
                          onClick={() => setPollData({ ...pollData, options: [...pollData.options, ''] })}
                          disabled={isCreating}
                          className="w-full px-4 py-2 text-sm text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors disabled:opacity-50"
                        >
                          + {t('messages:addOption', 'Add Option')}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Dialog>
      </div>
    </div>
  );
};

export default AnnouncementsPage;

