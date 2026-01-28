'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Trash2,
  Heart,
  Shield,
  Pin,
  Megaphone,
  MessageSquare,
  Plus,
  Users,
  Home,
} from 'lucide-react';
import {
  topicService,
  Topic,
  TopicCreate,
  TopicCategory,
} from '@/lib/api/topics';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/ui/use-toast';
import { ClipizyLoadingOverlay } from '@/components/ui/clipizy-loading';
import {
  modal,
  modalContent,
  modalDescription,
  modalHeader,
  modalTitle,
} from '@/components/ui/modal';
import {
  Alertmodal,
  AlertmodalAction,
  AlertmodalCancel,
  AlertmodalContent,
  AlertmodalDescription,
  AlertmodalFooter,
  AlertmodalHeader,
  AlertmodalTitle,
} from '@/components/ui/alert-modal';
import { CommunicationToolbar } from './components/CommunicationToolbar';
import { cn } from '@/lib/utils';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/services/firebase';
import ThreadsList from '../components/ThreadsList';
import ConversationView from '../components/ConversationView';

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

export default function CommunicationPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [myTopics, setMyTopics] = useState<Topic[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState('community');
  const [viewMode, setViewMode] = useState<'topics' | 'threads'>('topics');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatemodalOpen, setIsCreatemodalOpen] = useState(false);
  const [isCreateThreadmodalOpen, setIsCreateThreadmodalOpen] = useState(false);
  const [isDeletemodalOpen, setIsDeletemodalOpen] = useState(false);
  const [topicToDelete, setTopicToDelete] = useState<string | null>(null);
  const threadsListener = useRef<(() => void) | null>(null);
  
  const [threadFormData, setThreadFormData] = useState({
    title: '',
    description: '',
  });

  const [formData, setFormData] = useState<TopicCreate>({
    title: '',
    content: '',
    category: 'general',
    is_open: true,
  });

  const canAccessThreads = useMemo(() => {
    return user?.hasFacilityProfile === true;
  }, [user]);

  const loadCategories = async () => {
    try {
      const cats = await topicService.getCategories();
      setCategories(cats);
    } catch (error: any) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadThreads = useCallback(() => {
    if (!user || !canAccessThreads) {
      setThreads([]);
      setLoadingThreads(false);
      if (threadsListener.current) {
        threadsListener.current();
        threadsListener.current = null;
      }
      return;
    }

    setLoadingThreads(true);

    try {
      const threadsRef = collection(db, 'threads');
      const threadsQuery = query(
        threadsRef,
        where('participantIds', 'array-contains', user.uid),
        orderBy('lastMessageTimestamp', 'desc')
      );

      if (threadsListener.current) {
        threadsListener.current();
      }

      threadsListener.current = onSnapshot(
        threadsQuery,
        async (snapshot) => {
          const threadsList: Thread[] = [];
          snapshot.docs.forEach(doc => {
            const threadData = doc.data();
            const otherParticipant = threadData.participantInfo?.find((p: any) => p.userId !== user.uid);
            let displayInfo: any = {};

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
            } as Thread);
          });

          threadsList.sort((a, b) => {
            const aTime = a.lastMessageTimestamp?.toDate?.() || new Date(0);
            const bTime = b.lastMessageTimestamp?.toDate?.() || new Date(0);
            return bTime.getTime() - aTime.getTime();
          });

          setThreads(threadsList);
          setLoadingThreads(false);
        },
        (err: any) => {
          console.error('Error listening to threads:', err);
          if (err.code === 'permission-denied' || err.message?.includes('permission')) {
            toast({
              title: 'Access Denied',
              description: 'You do not have permission to access threads. Please contact your administrator.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Error',
              description: err.message || 'Failed to load threads',
              variant: 'destructive',
            });
          }
          setThreads([]);
          setLoadingThreads(false);
        }
      );
    } catch (err: any) {
      console.error('Error setting up threads listener:', err);
      if (err.code === 'permission-denied' || err.message?.includes('permission')) {
        toast({
          title: 'Access Denied',
          description: 'You do not have permission to access threads. Please contact your administrator.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: err.message || 'Failed to load threads',
          variant: 'destructive',
        });
      }
      setThreads([]);
      setLoadingThreads(false);
    }
  }, [user, canAccessThreads, toast]);

  const handleCreateThread = async () => {
    if (!threadFormData.title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please provide a thread title',
        variant: 'destructive',
      });
      return;
    }

    if (!user) return;

    try {
      setCreating(true);
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
      
      toast({
        title: 'Success!',
        description: 'Thread created successfully',
      });
      setIsCreateThreadmodalOpen(false);
      setThreadFormData({
        title: '',
        description: '',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create thread',
        variant: 'destructive',
      });
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
    try {
      setLoading(true);
      if (activeTab === 'community') {
        const openTopics = await topicService.listTopics(
          selectedCategory !== 'all' ? selectedCategory : undefined,
          true
        );
        setTopics(openTopics);
      } else {
        const myTopicsData = await topicService.listMyTopics();
        setMyTopics(myTopicsData);
      }
    } catch (error: any) {
      console.error('Error loading topics:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load topics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedCategory, toast]);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  useEffect(() => {
    if (viewMode === 'threads') {
      loadThreads();
    }
    return () => {
      if (threadsListener.current) {
        threadsListener.current();
        threadsListener.current = null;
      }
    };
  }, [viewMode, loadThreads]);

  useEffect(() => {
    if (!canAccessThreads && viewMode === 'threads') {
      setViewMode('topics');
      setSelectedThread(null);
    }
  }, [canAccessThreads, viewMode]);

  const handleCreateTopic = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in both title and content',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCreating(true);
      await topicService.createTopic(formData);
      toast({
        title: 'Success!',
        description: 'Your topic has been created successfully',
      });
      setIsCreatemodalOpen(false);
      setFormData({
        title: '',
        content: '',
        category: 'general',
        is_open: activeTab === 'community'
      });
      loadTopics();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create topic',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTopic = async () => {
    if (!topicToDelete) return;

    try {
      await topicService.deleteTopic(topicToDelete);
      toast({
        title: 'Success',
        description: 'Topic deleted successfully',
      });
      setIsDeletemodalOpen(false);
      setTopicToDelete(null);
      loadTopics();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete topic',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const displayTopics = activeTab === 'community' ? topics : myTopics;

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
                    onClick={() => setViewMode('topics')}
                    className={cn(
                      "flex-1 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                      viewMode === 'topics'
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
                  <Input
                    type="text"
                    placeholder="Search threads..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-20 rounded-xl border-2 border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-0 focus:shadow-[0_0_0_4px_rgba(79,70,229,0.1)] transition-all hover:border-muted-foreground/30 hover:bg-muted/30"
                    style={{
                      height: 'var(--boxed-inputfield-height)',
                      fontWeight: '500',
                    }}
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
                  <ThreadsList
                    threads={filteredThreads}
                    selectedThreadId={selectedThread?.id}
                    onSelectThread={handleSelectThread}
                    currentUserId={user?.uid}
                  />
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
            categories={categories}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onCreateTopic={() => {
              setFormData({
                ...formData,
                is_open: activeTab === 'community'
              });
              setIsCreatemodalOpen(true);
            }}
          />

          {canAccessThreads && (
            <div className="container max-w-4xl mx-auto px-6 pt-4">
              <div className="flex gap-2 border-b border-border/40">
                <button
                  onClick={() => setViewMode('topics')}
                  className={cn(
                    "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                    viewMode === 'topics'
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
                    "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
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
            </div>
          )}

          <div className="container max-w-4xl mx-auto p-6 space-y-8 flex-1 pb-20">
            {loading ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="flex flex-col bg-secondary border-0 rounded-[24px] overflow-hidden">
                <div className="p-6">
                  {/* Header Skeleton */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-white/5 animate-pulse shrink-0" />
                    <div className="flex flex-col gap-1.5">
                      <div className="h-4 w-32 bg-white/5 rounded-full animate-pulse" />
                      <div className="h-3 w-24 bg-white/5 rounded-full animate-pulse" />
                    </div>
                  </div>

                  {/* Content Skeleton */}
                  <div className="space-y-3 mb-6">
                    <div className="h-6 w-3/4 bg-white/5 rounded-full animate-pulse" />
                    <div className="space-y-2">
                      <div className="h-4 w-full bg-white/5 rounded-full animate-pulse opacity-60" />
                      <div className="h-4 w-5/6 bg-white/5 rounded-full animate-pulse opacity-60" />
                    </div>
                  </div>

                  {/* Footer Skeleton */}
                  <div className="flex items-center gap-4">
                    <div className="h-8 w-16 bg-white/5 rounded-full animate-pulse" />
                    <div className="h-8 w-16 bg-white/5 rounded-full animate-pulse" />
                  </div>
                </div>
              </Card>
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
                href={`/dashboard/communication/${topic.id}`}
                className="group"
              >
                <Card className="flex flex-col bg-secondary border-0 relative transition-all duration-300 rounded-[24px] overflow-hidden">
                  <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-[1]" />
                  <div className="p-6">
                    {/* Header: User Info & Meta */}
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
                          {formatDate(topic.created_at)}
                        </span>
                        {topic.is_pinned && (
                          <Badge className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border-yellow-500/20 px-2 py-0 text-[10px] h-5 rounded-full">
                            <Pin className="w-2.5 h-2.5 mr-1" />
                            Pinned
                          </Badge>
                        )}
                        <Badge variant="outline" className="bg-white/5 border-white/10 text-[10px] capitalize px-2 py-0 h-5 rounded-full ml-1">
                          {categoryLabels[topic.category] || topic.category}
                        </Badge>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-bold leading-tight mb-3 transition-colors">
                      {topic.title}
                    </h3>

                    {/* Excerpt */}
                    <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 mb-6">
                      {topic.content}
                    </p>

                    {/* Footer: Stats */}
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
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <modal open={isCreatemodalOpen} onOpenChange={setIsCreatemodalOpen}>
        <modalContent className="bg-secondary border-white/10 text-foreground max-w-lg rounded-[32px] p-8">
          <modalHeader className="mb-6">
            <modalTitle className="text-2xl font-bold">New Discussion</modalTitle>
            <modalDescription className="text-muted-foreground text-base">
              Share your thoughts or questions with the community.
            </modalDescription>
          </modalHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground/70 ml-1">Title</label>
              <Input
                placeholder="Brief summary of your topic..."
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="bg-background/40 border-white/10 rounded-2xl h-12 px-4 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground/70 ml-1">Category</label>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setFormData({ ...formData, category: cat as TopicCategory })}
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
              <label className="text-sm font-semibold text-foreground/70 ml-1">Message</label>
              <Textarea
                placeholder="Explain your topic in detail..."
                value={formData.content}
                onChange={e => setFormData({ ...formData, content: e.target.value })}
                className="bg-background/40 border-white/10 rounded-2xl min-h-[140px] px-4 py-3 focus:ring-primary/20 resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-10">
            <Button
              variant="ghost"
              onClick={() => setIsCreatemodalOpen(false)}
              className="rounded-2xl h-12 px-6 hover:bg-white/5 font-medium"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateTopic}
              disabled={creating}
              className="btn-tertiary-gradient rounded-2xl h-12 px-10 text-white font-bold shadow-lg shadow-primary/10"
            >
              {creating ? 'Creating...' : 'Post Topic'}
            </Button>
          </div>
        </modalContent>
      </modal>

      <Alertmodal open={isDeletemodalOpen} onOpenChange={setIsDeletemodalOpen}>
        <AlertmodalContent className="bg-secondary border-white/10 text-foreground rounded-[32px] p-8">
          <AlertmodalHeader>
            <AlertmodalTitle className="text-2xl font-bold">Remove Topic?</AlertmodalTitle>
            <AlertmodalDescription className="text-muted-foreground text-base">
              This will permanently delete this discussion and all associated replies. This action cannot be undone.
            </AlertmodalDescription>
          </AlertmodalHeader>
          <AlertmodalFooter className="mt-8 gap-3">
            <AlertmodalCancel className="bg-background/40 border-white/10 rounded-2xl h-12 px-6 hover:bg-white/5 border-0">Cancel</AlertmodalCancel>
            <AlertmodalAction
              onClick={handleDeleteTopic}
              className="bg-rose-500 hover:bg-rose-600 text-white rounded-2xl h-12 px-8 border-0 font-bold"
            >
              Delete Permanently
            </AlertmodalAction>
          </AlertmodalFooter>
        </AlertmodalContent>
      </Alertmodal>

      <modal open={isCreateThreadmodalOpen} onOpenChange={setIsCreateThreadmodalOpen}>
        <modalContent className="bg-secondary border-white/10 text-foreground max-w-lg rounded-[32px] p-8">
          <modalHeader className="mb-6">
            <modalTitle className="text-2xl font-bold">New Thread</modalTitle>
            <modalDescription className="text-muted-foreground text-base">
              Create a new communication thread.
            </modalDescription>
          </modalHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground/70 ml-1">Title</label>
              <Input
                placeholder="Thread title..."
                value={threadFormData.title}
                onChange={e => setThreadFormData({ ...threadFormData, title: e.target.value })}
                className="bg-background/40 border-white/10 rounded-2xl h-12 px-4 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground/70 ml-1">Description (Optional)</label>
              <Textarea
                placeholder="Add a description or initial message..."
                value={threadFormData.description}
                onChange={e => setThreadFormData({ ...threadFormData, description: e.target.value })}
                className="bg-background/40 border-white/10 rounded-2xl min-h-[140px] px-4 py-3 focus:ring-primary/20 resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-10">
            <Button
              variant="ghost"
              onClick={() => setIsCreateThreadmodalOpen(false)}
              className="rounded-2xl h-12 px-6 hover:bg-white/5 font-medium"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateThread}
              disabled={creating}
              className="btn-tertiary-gradient rounded-2xl h-12 px-10 text-white font-bold shadow-lg shadow-primary/10"
            >
              {creating ? 'Creating...' : 'Create Thread'}
            </Button>
          </div>
        </modalContent>
      </modal>
    </div>
  );
}
