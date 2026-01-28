import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    FiMessageSquare,
    FiBarChart2,
    FiHeart,
    FiPlus,
    FiHome,
    FiX,
    FiBell
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useDashboard } from '../../../contexts/dashboardContext';
import { useNotification } from '../../../../contexts/notificationContext';
import { useAction } from '../../../../services/actions/hook';
import { CommunicationToolbar } from './components/CommunicationToolbar';
import { TopicDetail } from './TopicDetail';
import ThreadsList from '../components/ThreadsList';
import ConversationView from '../components/ConversationView';
import LoadingSpinner from '../../../../components/loadingSpinner/loadingSpinner';
import EmptyState from '../../../components/EmptyState/EmptyState';
import { cn } from '../../../../utils/cn';
import { useMobileView } from '../../../hooks/useMobileView';

const ANNOUNCEMENT_CATEGORIES = [
    'general',
    'support',
    'feedback',
    'feature_request',
    'bug_report',
    'question'
];

const categoryLabels = {
    feedback: 'Feedback',
    bug_report: 'Bug Report',
    feature_request: 'Feature Request',
    support: 'Support',
    question: 'Question',
    general: 'General',
};

export const Communication = ({
    canAccessThreads,
    threads,
    isLoadingThreads,
    onSelectThread,
    selectedThread,
    onSwitchToConversations // Callback to switch back to conversations tab
}) => {
    const { t } = useTranslation(['messages']);
    const { user, selectedWorkspace } = useDashboard();
    const { showError, showSuccess } = useNotification();
    const { execute } = useAction();
    const isMobile = useMobileView();

    const [viewMode, setViewMode] = useState('announcements'); // 'announcements' or 'threads'
    const [activeTab, setActiveTab] = useState('community'); // 'community' or 'my-announcements'
    const [announcements, setAnnouncements] = useState([]);
    const [myAnnouncements, setMyAnnouncements] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [selectedAnnouncementId, setSelectedAnnouncementId] = useState(null);

    // Create Announcement State
    const [isCreateAnnouncementOpen, setIsCreateAnnouncementOpen] = useState(false);
    const [createFormData, setCreateFormData] = useState({
        title: '',
        content: '',
        category: 'general'
    });
    const [isCreating, setIsCreating] = useState(false);

    // LOAD ANNOUNCEMENTS
    const loadAnnouncements = useCallback(async () => {
        try {
            setIsLoading(true);
            
            const result = await execute('thread.list', {
                collectionType: 'announcements',
                filters: selectedCategory !== 'all' ? { category: selectedCategory } : {},
                sortBy: 'createdAt',
                sortOrder: 'desc',
                pagination: { limit: 50 }
            });

            if (activeTab === 'community') {
                setAnnouncements(result.threads);
            } else {
                // Filter to only show user's own announcements
                const userAnnouncements = result.threads.filter(
                    a => a.createdBy === user?.uid || a.publishedBy === user?.uid
                );
                setMyAnnouncements(userAnnouncements);
            }
        } catch (error) {
            console.error('Error loading announcements:', error);
            showError(error.message || 'Failed to load announcements');
        } finally {
            setIsLoading(false);
        }
    }, [activeTab, selectedCategory, user?.uid, execute, showError]);

    useEffect(() => {
        loadAnnouncements();
    }, [loadAnnouncements]);

    const handleCreateAnnouncement = async () => {
        if (!createFormData.title.trim() || !createFormData.content.trim()) {
            showError('Please fill in all fields');
            return;
        }

        try {
            setIsCreating(true);
            
            await execute('thread.create', {
                collectionType: 'announcements',
                title: createFormData.title,
                content: createFormData.content,
                category: createFormData.category,
                allowComments: true,
                priority: 'MEDIUM'
            });

            showSuccess('Announcement created successfully');
            setIsCreateAnnouncementOpen(false);
            setCreateFormData({ title: '', content: '', category: 'general' });
            loadAnnouncements();
        } catch (error) {
            console.error('Error creating announcement:', error);
            showError(error.message || 'Failed to create announcement');
        } finally {
            setIsCreating(false);
        }
    };

    const filteredAnnouncements = useMemo(() => {
        let currentAnnouncements = activeTab === 'community' ? announcements : myAnnouncements;

        if (selectedCategory !== 'all') {
            currentAnnouncements = currentAnnouncements.filter(a => a.category === selectedCategory);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            currentAnnouncements = currentAnnouncements.filter(a =>
                (a.title || '').toLowerCase().includes(query) ||
                (a.content || '').toLowerCase().includes(query)
            );
        }

        return currentAnnouncements;
    }, [announcements, myAnnouncements, activeTab, selectedCategory, searchQuery]);

    const renderTopTabs = () => (
        <div className="grid grid-cols-2 gap-2 mb-3 border-b border-border w-full max-w-md px-4 mt-4">
            <button
                onClick={onSwitchToConversations}
                className="w-full px-4 py-2 text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground transition-colors"
            >
                <div className="flex items-center justify-center gap-2">
                    <FiMessageSquare className="w-4 h-4" />
                    <span>{t('messages:tabs.messages', 'Messages')}</span>
                </div>
            </button>
            <button
                className="w-full px-4 py-2 text-sm font-medium border-b-2 border-primary text-primary transition-colors"
            >
                <div className="flex items-center justify-center gap-2">
                    <FiBell className="w-4 h-4" />
                    <span>{t('messages:tabs.announcements', 'Announcements')}</span>
                </div>
            </button>
        </div>
    );

    if (selectedAnnouncementId) {
        return (
            <TopicDetail
                announcementId={selectedAnnouncementId}
                onBack={() => setSelectedAnnouncementId(null)}
            />
        );
    }

    return (
        <div className="flex flex-col h-full bg-background relative overflow-hidden">
            {/* View Mode Switcher + Top Tabs for context */}
            {/* If Thread View: Sidebar has tabs. If Topic View: Top bar has tabs? */}
            {/* Let's unify: Always show Top Tabs at top of page/sidebar for consistency */}

            {viewMode === 'threads' && canAccessThreads ? (
                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar List */}
                    <div className={cn(
                        "w-full md:w-80 border-r border-border flex flex-col bg-background",
                        isMobile && selectedThread ? "hidden" : "flex"
                    )}>
                        {/* Top Tabs inside Sidebar for Threads view to match Messages.js Sidebar feel */}
                        <div className="shrink-0">{renderTopTabs()}</div>

                        {/* View Mode Toggle */}
                        <div className="px-4 pb-2 border-b border-border/40 mb-2">
                            <div className="flex gap-2">
                                <button onClick={() => setViewMode('announcements')} className="flex-1 py-1 text-xs font-medium text-muted-foreground hover:text-foreground">Announcements</button>
                                <button className="flex-1 py-1 text-xs font-medium bg-primary/10 text-primary rounded-md">Threads</button>
                            </div>
                        </div>

                        {isLoadingThreads ? (
                            <LoadingSpinner />
                        ) : (
                            <ThreadsList
                                threads={threads}
                                selectedThreadId={selectedThread?.id}
                                onSelectThread={onSelectThread}
                                currentUserId={user?.uid}
                            />
                        )}
                    </div>

                    {/* Main Content */}
                    <div className={cn(
                        "flex-1 bg-muted/5 flex flex-col min-w-0",
                        isMobile && !selectedThread ? "hidden" : "flex"
                    )}>
                        {selectedThread ? (
                            <ConversationView
                                conversation={selectedThread}
                                currentUser={user}
                                messageContext='personal'
                                workspaceContext={selectedWorkspace}
                            />
                        ) : (
                            <EmptyState
                                title="Select a thread"
                                description="Choose a conversation to view messages"
                                icon={FiHome}
                            />
                        )}
                    </div>
                </div>
            ) : (
                <>
                    {/* Topic View Header with Tabs */}
                    <div className="bg-background/95 backdrop-blur-md z-10 border-b border-border/40">
                        <div className="container mx-auto max-w-7xl">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                {renderTopTabs()}

                        {/* View Mode Toggle (Announcements vs Threads) */}
                        {canAccessThreads && (
                            <div className="flex gap-2 px-4 pb-2 md:pb-0">
                                <button className="px-4 py-1.5 text-sm font-medium bg-primary/10 text-primary rounded-lg transition-colors">Announcements</button>
                                <button onClick={() => setViewMode('threads')} className="px-4 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors">
                                    Threads
                                </button>
                            </div>
                        )}
                            </div>
                        </div>
                    </div>

                    <CommunicationToolbar
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        selectedCategory={selectedCategory}
                        setSelectedCategory={setSelectedCategory}
                        categories={ANNOUNCEMENT_CATEGORIES}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        onCreateTopic={() => setIsCreateAnnouncementOpen(true)}
                        viewMode={viewMode}
                        setViewMode={setViewMode}
                        canAccessThreads={canAccessThreads}
                    />

                    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-muted/5">
                        <div className="max-w-[1400px] mx-auto space-y-4 mt-4">
                            {isLoading ? (
                                <LoadingSpinner />
                            ) : filteredAnnouncements.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                                        <FiMessageSquare className="w-8 h-8 text-muted-foreground/50" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-foreground mb-2">No announcements found</h3>
                                    <p className="text-muted-foreground mb-6">Get started by creating a new announcement.</p>
                                    <button
                                        onClick={() => setIsCreateAnnouncementOpen(true)}
                                        className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center gap-2"
                                    >
                                        <FiPlus className="w-5 h-5" />
                                        Create Announcement
                                    </button>
                                </div>
                            ) : (
                                filteredAnnouncements.map(announcement => (
                                    <div
                                        key={announcement.id}
                                        onClick={() => setSelectedAnnouncementId(announcement.id)}
                                        className="group bg-card hover:bg-card/80 border border-border/50 hover:border-primary/20 rounded-2xl p-6 cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md"
                                    >
                                        <div className="flex items-start justify-between gap-4 mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold border border-border">
                                                    A
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-foreground flex items-center gap-2">
                                                        Announcement
                                                        {announcement.metadata?.isPinned && (
                                                            <span className="bg-yellow-500/10 text-yellow-600 text-[10px] px-2 py-0.5 rounded-full border border-yellow-500/20 flex items-center gap-1">
                                                                <FiBarChart2 className="w-3 h-3 rotate-90" /> Pinned
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {announcement.createdAt?.toDate ? new Date(announcement.createdAt.toDate()).toLocaleDateString() : 'Just now'} · {categoryLabels[announcement.category] || announcement.category}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors line-clamp-1">{announcement.title}</h3>
                                        <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed mb-4">{announcement.content}</p>

                                        <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
                                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary/50">
                                                <FiMessageSquare className="w-3.5 h-3.5" />
                                                <span>View Details</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Create Announcement Modal - Simple Overlay */}
            {isCreateAnnouncementOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div
                        className="bg-card w-full max-w-lg rounded-3xl border border-border shadow-2xl overflow-hidden animate-in zoom-in-95"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-border">
                            <div className="flex items-center justify-between mb-1">
                                <h2 className="text-xl font-bold">New Announcement</h2>
                                <button
                                    onClick={() => setIsCreateAnnouncementOpen(false)}
                                    className="p-2 hover:bg-muted rounded-full transition-colors"
                                >
                                    <FiX className="w-5 h-5 text-muted-foreground" />
                                </button>
                            </div>
                            <p className="text-sm text-muted-foreground">Share information with the community.</p>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Title</label>
                                <input
                                    type="text"
                                    placeholder="Announcement title..."
                                    className="w-full px-4 py-3 rounded-xl bg-secondary/30 border border-input focus:border-primary/50 focus:bg-background transition-all outline-none"
                                    value={createFormData.title}
                                    onChange={e => setCreateFormData({ ...createFormData, title: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Category</label>
                                    <select
                                        className="w-full px-4 py-3 rounded-xl bg-secondary/30 border border-input focus:border-primary/50 focus:bg-background transition-all outline-none appearance-none"
                                        value={createFormData.category}
                                        onChange={e => setCreateFormData({ ...createFormData, category: e.target.value })}
                                    >
                                        {ANNOUNCEMENT_CATEGORIES.map(cat => (
                                            <option key={cat} value={cat}>{categoryLabels[cat] || cat}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Content</label>
                                <textarea
                                    placeholder="Write your announcement..."
                                    rows={5}
                                    className="w-full px-4 py-3 rounded-xl bg-secondary/30 border border-input focus:border-primary/50 focus:bg-background transition-all outline-none resize-none"
                                    value={createFormData.content}
                                    onChange={e => setCreateFormData({ ...createFormData, content: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="p-6 border-t border-border bg-muted/20 flex justify-end gap-3">
                            <button
                                onClick={() => setIsCreateAnnouncementOpen(false)}
                                className="px-6 py-2.5 rounded-xl font-medium text-muted-foreground hover:bg-muted transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={isCreating}
                                onClick={handleCreateAnnouncement}
                                className="px-6 py-2.5 rounded-xl font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center gap-2"
                            >
                                {isCreating && <LoadingSpinner size="sm" color="white" />}
                                Create Announcement
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
