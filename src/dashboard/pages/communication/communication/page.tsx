import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../../../components/boxedInputFields/button';
import PersonnalizedInputField from '../../../../components/boxedInputFields/personnalizedInputField';
import TextareaField from '../../../../components/boxedInputFields/textareaField';
import {
  FiTrash2 as Trash2,
  FiHeart as Heart,
  FiShield as Shield,
  FiPaperclip as Pin,
  FiBell as Megaphone,
  FiMessageSquare as MessageSquare,
  FiPlus as Plus,
  FiUsers as Users,
  FiHome as Home,
} from 'react-icons/fi';
import { useAction } from '../../../../services/actions/hook';
import { useAuth } from '../../../../contexts/authContext';
import { useNotification } from '../../../../contexts/notificationContext';
import Modal from '../../../../components/modals/modals';
import { CommunicationToolbar } from './components/CommunicationToolbar';
import { cn } from '../../../../services/utils/formatting';
import ConversationView from '../components/ConversationView';

type TopicCategory = 'feedback' | 'bug_report' | 'feature_request' | 'support' | 'question' | 'general';

const ANNOUNCEMENT_CATEGORIES: TopicCategory[] = [
  'general',
  'support',
  'feedback',
  'feature_request',
  'bug_report',
  'question'
];

const categoryLabels: Record<TopicCategory, string> = {
  feedback: 'Feedback',
  bug_report: 'Bug Report',
  feature_request: 'Feature Request',
  support: 'Support',
  question: 'Question',
  general: 'General',
};

interface Thread {
  id: string;
  title?: string;
  displayName?: string;
  description?: string;
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: any;
  };
  lastMessageTimestamp?: any;
  updatedAt?: any;
  createdAt?: any;
  photoURL?: string;
  unreadCount?: number;
  participantCount?: number;
  participantIds?: string[];
  participantInfo?: Array<{
    userId: string;
    displayName: string;
    photoURL?: string;
    roleInConversation?: string;
  }>;
  isGroupThread?: boolean;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  category: TopicCategory;
  createdAt?: any;
  created_at?: any;
  createdBy?: string;
  publishedBy?: string;
  user_username?: string;
  user_email?: string;
  is_pinned?: boolean;
  upvotes?: number;
  replies?: any[];
  metadata?: {
    isPinned?: boolean;
    [key: string]: any;
  };
}

interface AnnouncementCreate {
  title: string;
  content: string;
  category: TopicCategory;
}

export default function CommunicationPage() {
  const { currentUser } = useAuth();
  const user = currentUser;
  const { showError, showSuccess } = useNotification();
  const { execute } = useAction();
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [myAnnouncements, setMyAnnouncements] = useState<Announcement[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState('community');
  const [viewMode, setViewMode] = useState<'announcements' | 'threads'>('announcements' as 'announcements' | 'threads');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatemodalOpen, setIsCreatemodalOpen] = useState(false);
  const [isCreateThreadmodalOpen, setIsCreateThreadmodalOpen] = useState(false);
  const [isDeletemodalOpen, setIsDeletemodalOpen] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState<string | null>(null);
  
  const [threadFormData, setThreadFormData] = useState({
    title: '',
    description: '',
  });

  const [formData, setFormData] = useState<AnnouncementCreate>({
    title: '',
    content: '',
    category: 'general',
  });

  const canAccessThreads = useMemo(() => {
    return user?.hasFacilityProfile === true;
  }, [user]);

  // LOAD ANNOUNCEMENTS
  const loadAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      
      const result = await execute('thread.list', {
        collectionType: 'announcements',
        filters: selectedCategory !== 'all' ? { category: selectedCategory } : {},
        sortBy: 'createdAt',
        sortOrder: 'desc',
        pagination: { limit: 50 }
      });

      const resultData: any = result;
      if (activeTab === 'community') {
        setAnnouncements(resultData.threads || []);
      } else {
        const userAnnouncements = (resultData.threads || []).filter(
          (a: any) => a.createdBy === user?.uid || a.publishedBy === user?.uid
        );
        setMyAnnouncements(userAnnouncements);
      }
    } catch (error: any) {
      console.error('Error loading announcements:', error);
      showError(error.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedCategory, user?.uid, execute, showError]);

  // LOAD THREADS using action catalog
  const loadThreads = useCallback(async () => {
    if (!user || !canAccessThreads) {
      setThreads([]);
      setLoadingThreads(false);
      return;
    }

    try {
      setLoadingThreads(true);
      const result = await execute('thread.list', {
        collectionType: 'messages',
        sortBy: 'updatedAt',
        sortOrder: 'desc',
        pagination: { limit: 50 }
      });
      
      const resultData: any = result;
      setThreads(resultData.threads || []);
    } catch (error: any) {
      console.error('Error loading threads:', error);
      showError(error.message || 'Failed to load threads');
      setThreads([]);
    } finally {
      setLoadingThreads(false);
    }
  }, [user, canAccessThreads, execute, showError]);

  const handleCreateThread = async () => {
    if (!threadFormData.title.trim()) {
      showError('Please provide a thread title');
      return;
    }

    if (!user) return;

    try {
      setCreating(true);
      
      await execute('thread.create', {
        collectionType: 'messages',
        title: threadFormData.title,
        content: threadFormData.description || threadFormData.title,
        participants: [user.uid],
        priority: 'MEDIUM'
      });
      
      showSuccess('Thread created successfully');
      setIsCreateThreadmodalOpen(false);
      setThreadFormData({
        title: '',
        description: '',
      });
      loadThreads();
    } catch (error: any) {
      showError(error.message || 'Failed to create thread');
    } finally {
      setCreating(false);
    }
  };

  const handleSelectThread = (threadId: string) => {
    const thread = threads.find(t => t.id === threadId);
    if (thread) {
      setSelectedThread(thread);
    }
  };

  const loadTopics = useCallback(async () => {
    await loadAnnouncements();
  }, [loadAnnouncements]);

  const handleCreateTopic = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      showError('Please fill in both title and content');
      return;
    }

    try {
      setCreating(true);
      await execute('thread.create', {
        collectionType: 'announcements',
        title: formData.title,
        content: formData.content,
        category: formData.category,
        allowComments: true,
        priority: 'MEDIUM'
      });
      
      showSuccess('Your announcement has been created successfully');
      setIsCreatemodalOpen(false);
      setFormData({
        title: '',
        content: '',
        category: 'general',
      });
      loadAnnouncements();
    } catch (error: any) {
      showError(error.message || 'Failed to create announcement');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTopic = async () => {
    if (!announcementToDelete) return;

    try {
      await execute('thread.archive', {
        collectionType: 'announcements',
        threadId: announcementToDelete
      });
      showSuccess('Announcement deleted successfully');
      setIsDeletemodalOpen(false);
      setAnnouncementToDelete(null);
      loadAnnouncements();
    } catch (error: any) {
      showError(error.message || 'Failed to delete announcement');
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  useEffect(() => {
    if (viewMode === 'threads') {
      loadThreads();
    }
  }, [viewMode, loadThreads]);

  useEffect(() => {
    if (!canAccessThreads && viewMode === 'threads') {
      setViewMode('announcements');
      setSelectedThread(null);
    }
  }, [canAccessThreads, viewMode]);

  const formatDate = (dateString: any) => {
    if (!dateString) return '';
    const date = dateString.toDate ? dateString.toDate() : new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const displayTopics = activeTab === 'community' ? announcements : myAnnouncements;

  const filteredTopics = useMemo(() => {
    let filtered = displayTopics;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => {
        const titleMatch = t.title.toLowerCase().includes(query);
        const contentMatch = t.content.toLowerCase().includes(query);
        const categoryMatch = categoryLabels[t.category]?.toLowerCase().includes(query);
        const userMatch = (t.user_username || t.user_email || '').toLowerCase().includes(query);
        return titleMatch || contentMatch || categoryMatch || userMatch;
      });
    }

    return filtered;
  }, [displayTopics, selectedCategory, searchQuery]);

  const filteredThreads = useMemo(() => {
    let filtered = threads;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => {
        const titleMatch = (t.title || t.displayName || '').toLowerCase().includes(query);
        const descMatch = (t.description || '').toLowerCase().includes(query);
        const lastMessageMatch = (t.lastMessage?.text || '').toLowerCase().includes(query);
        return titleMatch || descMatch || lastMessageMatch;
      });
    }

    return filtered;
  }, [threads, searchQuery]);

  return (
    <div className={cn(
      "h-full flex flex-col overflow-hidden animate-in fade-in duration-500",
    )} style={{ fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
      {viewMode === 'threads' ? (
        <div className={cn(
          "flex-1 flex min-h-0 relative mx-4 my-4",
          "gap-6 overflow-visible"
        )}>
          <div className={cn(
            "dashboard-sidebar-container",
            "dashboard-sidebar-container-desktop content-sidebar pr-0"
          )}>
            <div className="dashboard-sidebar-inner">
              <div className="shrink-0 w-full p-4 pb-3" style={{ position: 'relative', zIndex: 100 }}>
                <div className="flex gap-2 mb-3 border-b border-border/40">
                  <button
                    onClick={() => setViewMode('announcements')}
                    className={cn(
                      "flex-1 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                      (viewMode as string) === 'announcements'
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      <span>Topics</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setViewMode('threads')}
                    className={cn(
                      "flex-1 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                      viewMode === 'threads'
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Home className="w-4 h-4" />
                      <span>Communication</span>
                    </div>
                  </button>
                </div>
                <div className="relative">
                  <PersonnalizedInputField
                    label=""
                    placeholder="Search threads..."
                    value={searchQuery}
                    onChange={(e: any) => setSearchQuery(e.target.value)}
                    name="searchThreads"
                    required={false}
                    marginBottom={undefined}
                    marginLeft={undefined}
                    marginRight={undefined}
                    error={null}
                    onErrorReset={() => {}}
                    verification={undefined}
                    clearFilter={undefined}
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  </div>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-muted rounded-full transition-colors"
                    >
                      <Plus className="w-4 h-4 text-muted-foreground rotate-45" />
                    </button>
                  )}
                </div>
                <div className="mt-3">
                  <Button
                    onClick={() => setIsCreateThreadmodalOpen(true)}
                    className="w-full btn-tertiary-gradient h-10 flex items-center gap-2 text-white shadow-lg hover:shadow-primary/20 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    New Thread
                  </Button>
                </div>
              </div>

              {loadingThreads ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
                </div>
              ) : filteredThreads.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 ring-4 ring-background">
                    <Home className="w-8 h-8" style={{ color: 'var(--primary-color)' }} />
                  </div>
                  <h2 className="text-xl font-bold mb-2">
                    {searchQuery ? 'No threads found' : loadingThreads ? 'Loading threads...' : 'No threads yet'}
                  </h2>
                  <p className="mb-6 text-muted-foreground">
                    {searchQuery ? 'Try adjusting your search.' : loadingThreads ? 'Please wait...' : 'Start a new communication thread to get started.'}
                  </p>
                  {!loadingThreads && !searchQuery && (
                    <Button
                      onClick={() => setIsCreateThreadmodalOpen(true)}
                      className="btn-tertiary-gradient h-10 flex items-center gap-2 text-white shadow-lg hover:shadow-primary/20 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      New Thread
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto">
                  {filteredThreads.map((thread) => (
                    <div
                      key={thread.id}
                      onClick={() => handleSelectThread(thread.id)}
                      className={`p-4 border-b border-border/50 cursor-pointer hover:bg-secondary/50 ${
                        selectedThread?.id === thread.id ? 'bg-secondary' : ''
                      }`}
                    >
                      <div className="font-semibold">{thread.title || thread.displayName}</div>
                      {thread.description && (
                        <div className="text-sm text-muted-foreground mt-1">{thread.description}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={cn(
            "dashboard-main-content",
            "dashboard-main-content-desktop"
          )}>
            <div className="dashboard-main-inner">
              {selectedThread ? (
                <ConversationView
                  conversation={selectedThread}
                  currentUser={user}
                  messageContext="personal"
                  workspaceContext={null}
                  isTutorial={false}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 ring-4 ring-background">
                    <Home className="w-8 h-8" style={{ color: 'var(--primary-color)' }} />
                  </div>
                  <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                    Select a Thread
                  </h2>
                  <p className="mb-6" style={{ color: 'var(--text-light-color)', fontFamily: 'var(--font-family-text, Roboto, sans-serif)' }}>
                    Choose a thread from the list to view messages
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          <CommunicationToolbar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            categories={ANNOUNCEMENT_CATEGORIES}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onCreateTopic={() => {
              setFormData({
                ...formData,
              });
              setIsCreatemodalOpen(true);
            }}
          />

          {canAccessThreads && (
            <div className="container max-w-4xl mx-auto px-6 pt-4">
              <div className="flex gap-2 border-b border-border/40">
                <button
                  onClick={() => setViewMode('announcements')}
                  className={cn(
                    "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                    viewMode === 'announcements'
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div className="flex items-center justify-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    <span>Announcements</span>
                  </div>
                </button>
                <button
                  onClick={() => setViewMode('threads')}
                  className={cn(
                    "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                    (viewMode as string) === 'threads'
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Home className="w-4 h-4" />
                    <span>Communication</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          <div className="container max-w-4xl mx-auto p-6 space-y-8 flex-1 pb-20">
            {loading ? (
              <div className="flex flex-col gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex flex-col bg-secondary border-0 rounded-[24px] overflow-hidden">
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-white/5 animate-pulse shrink-0" />
                        <div className="flex flex-col gap-1.5">
                          <div className="h-4 w-32 bg-white/5 rounded-full animate-pulse" />
                          <div className="h-3 w-24 bg-white/5 rounded-full animate-pulse" />
                        </div>
                      </div>

                      <div className="space-y-3 mb-6">
                        <div className="h-6 w-3/4 bg-white/5 rounded-full animate-pulse" />
                        <div className="space-y-2">
                          <div className="h-4 w-full bg-white/5 rounded-full animate-pulse opacity-60" />
                          <div className="h-4 w-5/6 bg-white/5 rounded-full animate-pulse opacity-60" />
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="h-8 w-16 bg-white/5 rounded-full animate-pulse" />
                        <div className="h-8 w-16 bg-white/5 rounded-full animate-pulse" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredTopics.length === 0 ? (
              <div className="flex-1 flex items-center justify-center -mt-20">
            <div className="text-center py-16 px-10 rounded-[32px] bg-secondary/30 w-full max-w-lg mx-auto border border-white/5 backdrop-blur-sm">
              <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <MessageSquare className="w-10 h-10 text-primary opacity-60" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3">
                No topics found
              </h3>
              <p className="text-muted-foreground mb-8 text-base">
                Try adjusting your search or filters to find what you're looking for.
              </p>
              <Button
                onClick={() => setIsCreatemodalOpen(true)}
                className="btn-tertiary-gradient h-12 px-8 text-base rounded-2xl text-white font-bold"
              >
                <Plus className="w-5 h-5 mr-2" />
                Start a Conversation
              </Button>
              </div>
            </div>
            ) : (
              <div className="flex flex-col gap-4">
                {filteredTopics.map(topic => (
                  <Link
                    key={topic.id}
                    to={`/dashboard/communication/${topic.id}`}
                    className="group"
                  >
                    <div className="flex flex-col bg-secondary border-0 relative transition-all duration-300 rounded-[24px] overflow-hidden">
                      <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-[1]" />
                      <div className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-full bg-secondary-background flex items-center justify-center text-sm font-bold border border-white/10 shrink-0">
                            {(topic.user_username || topic.user_email || 'A').charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-[15px] font-bold text-foreground/90 transition-colors">
                              {topic.user_username || 'Anonymous'}
                            </span>
                            <span className="text-muted-foreground/40">•</span>
                            <span className="text-[13px] text-muted-foreground font-medium">
                              {formatDate(topic.created_at || topic.createdAt)}
                            </span>
                            {topic.is_pinned && (
                              <span className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border-yellow-500/20 px-2 py-0 text-[10px] h-5 rounded-full flex items-center">
                                <Pin className="w-2.5 h-2.5 mr-1" />
                                Pinned
                              </span>
                            )}
                            <span className="bg-white/5 border-white/10 text-[10px] capitalize px-2 py-0 h-5 rounded-full ml-1">
                              {categoryLabels[topic.category] || topic.category}
                            </span>
                          </div>
                        </div>

                        <h3 className="text-xl font-bold leading-tight mb-3 transition-colors">
                          {topic.title}
                        </h3>

                        <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 mb-6">
                          {topic.content}
                        </p>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-background/40 rounded-full border border-white/5 text-xs text-muted-foreground group/stat">
                            <Heart className={cn("w-4 h-4 transition-colors", topic.upvotes ? "fill-rose-500 text-rose-500" : "group-hover/stat:text-rose-500")} />
                            <span className="font-bold">{topic.upvotes || 0}</span>
                          </div>
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-background/40 rounded-full border border-white/5 text-xs text-muted-foreground group/stat">
                            <MessageSquare className="w-4 h-4 group-hover/stat:text-primary transition-colors" />
                            <span className="font-bold">{topic.replies?.length || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <Modal
        isOpen={isCreatemodalOpen}
        onClose={() => setIsCreatemodalOpen(false)}
        title="New Discussion"
        size="medium"
        actions={
          <div className="flex justify-end gap-3 mt-10">
            <Button
              variant="secondary"
              onClick={() => setIsCreatemodalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateTopic}
              disabled={creating}
              variant="primary"
            >
              {creating ? 'Creating...' : 'Post Announcement'}
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <PersonnalizedInputField
              label="Title"
              placeholder="Brief summary of your topic..."
              value={formData.title}
              onChange={(e: any) => setFormData({ ...formData, title: e.target.value })}
              name="title"
              required={true}
              marginBottom={undefined}
              marginLeft={undefined}
              marginRight={undefined}
              error={null}
              onErrorReset={() => {}}
              verification={undefined}
              clearFilter={undefined}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground/70 ml-1">Category</label>
            <div className="flex flex-wrap gap-2">
              {ANNOUNCEMENT_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFormData({ ...formData, category: cat })}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 border capitalize",
                    formData.category === cat
                      ? "bg-primary border-primary text-white shadow-lg shadow-primary/20"
                      : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10"
                  )}
                >
                  {categoryLabels[cat as TopicCategory] || cat}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <TextareaField
              label="Message"
              placeholder="Explain your topic in detail..."
              value={formData.content}
              onChange={(e: any) => setFormData({ ...formData, content: e.target.value })}
              name="content"
              required={true}
              rows={6}
              maxLength={undefined}
              marginBottom={undefined}
              marginTop={undefined}
              marginLeft={undefined}
              marginRight={undefined}
              error={null}
              onErrorReset={() => {}}
            />
          </div>

        </div>
      </Modal>

      <Modal
        isOpen={isDeletemodalOpen}
        onClose={() => setIsDeletemodalOpen(false)}
        title="Remove Announcement?"
        messageType="error"
        size="medium"
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsDeletemodalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteTopic}
            >
              Delete Permanently
            </Button>
          </>
        }
      >
        <p>This will archive this announcement. This action cannot be undone.</p>
      </Modal>

      <Modal
        isOpen={isCreateThreadmodalOpen}
        onClose={() => setIsCreateThreadmodalOpen(false)}
        title="New Thread"
        size="medium"
        actions={
          <div className="flex justify-end gap-3 mt-10">
            <Button
              variant="secondary"
              onClick={() => setIsCreateThreadmodalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateThread}
              disabled={creating}
              variant="primary"
            >
              {creating ? 'Creating...' : 'Create Thread'}
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <PersonnalizedInputField
              label="Title"
              placeholder="Thread title..."
              value={threadFormData.title}
              onChange={(e: any) => setThreadFormData({ ...threadFormData, title: e.target.value })}
              name="threadTitle"
              required={true}
              marginBottom={undefined}
              marginLeft={undefined}
              marginRight={undefined}
              error={null}
              onErrorReset={() => {}}
              verification={undefined}
              clearFilter={undefined}
            />
          </div>

          <div className="space-y-2">
            <TextareaField
              label="Description (Optional)"
              placeholder="Add a description or initial message..."
              value={threadFormData.description}
              onChange={(e: any) => setThreadFormData({ ...threadFormData, description: e.target.value })}
              name="threadDescription"
              required={false}
              rows={6}
              maxLength={undefined}
              marginBottom={undefined}
              marginTop={undefined}
              marginLeft={undefined}
              marginRight={undefined}
              error={null}
              onErrorReset={() => {}}
            />
          </div>

        </div>
      </Modal>
    </div>
  );
}
