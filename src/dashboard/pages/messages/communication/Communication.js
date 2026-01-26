import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    FiMessageSquare,
    FiBarChart2, // Closest to pinned icon
    FiHeart,
    FiPlus,
    FiHome,
    FiX,
    FiSearch,
    FiSliders,
    FiChevronLeft
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useDashboard } from '../../../contexts/DashboardContext';
import { useNotification } from '../../../../contexts/NotificationContext';
import { topicService } from '../../../../services/topicService';
import { TopicDetail } from './TopicDetail';
import ThreadsList from '../components/ThreadsList';
import ConversationView from '../components/ConversationView';
import LoadingSpinner from '../../../../components/LoadingSpinner/LoadingSpinner';
import EmptyState from '../../../components/EmptyState/EmptyState';
import { cn } from '../../../../utils/cn';
import { useMobileView } from '../../../hooks/useMobileView';
import '../../../../components/BoxedInputFields/styles/boxedInputFields.css';

const categoryLabels = {
    feedback: 'Feedback',
    bug_report: 'Bug Report',
    feature_request: 'Feature Request',
    support: 'Support',
    question: 'Question',
    general: 'General',
};

const categoryIcons = {
    feedback: FiMessageSquare,
    bug_report: FiMessageSquare,
    feature_request: FiMessageSquare,
    support: FiMessageSquare,
    question: FiMessageSquare,
    general: FiMessageSquare,
};

export const Communication = ({
    canAccessThreads,
    threads,
    isLoadingThreads,
    onSelectThread,
    selectedThread,
    onSwitchToConversations
}) => {
    const { t } = useTranslation(['messages']);
    const { user, selectedWorkspace } = useDashboard();
    const { showError, showSuccess } = useNotification();
    const isMobile = useMobileView();

    const [viewMode, setViewMode] = useState('topics'); // 'topics' or 'threads'
    const [activeTab, setActiveTab] = useState('community'); // 'community' or 'my-topics'
    const [topics, setTopics] = useState([]);
    const [myTopics, setMyTopics] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTopicId, setSelectedTopicId] = useState(null);
    const [showFiltersOverlay, setShowFiltersOverlay] = useState(false);
    const filterDropdownRef = useRef(null);

    // Create Topic State
    const [isCreateTopicOpen, setIsCreateTopicOpen] = useState(false);
    const [createFormData, setCreateFormData] = useState({
        title: '',
        content: '',
        category: 'general'
    });
    const [isCreating, setIsCreating] = useState(false);

    const loadTopics = useCallback(async () => {
        try {
            setIsLoading(true);
            if (activeTab === 'community') {
                const data = await topicService.listTopics(
                    selectedCategory !== 'all' ? selectedCategory : undefined
                );
                setTopics(data);
            } else {
                if (user?.uid) {
                    const data = await topicService.listMyTopics(user.uid);
                    setMyTopics(data);
                }
            }
        } catch (error) {
            console.error('Error loading topics:', error);
            showError('Failed to load topics');
        } finally {
            setIsLoading(false);
        }
    }, [activeTab, selectedCategory, user, showError]);

    useEffect(() => {
        loadTopics();
    }, [loadTopics]);

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

    const handleCreateTopic = async () => {
        if (!createFormData.title.trim() || !createFormData.content.trim()) {
            showError('Please fill in all fields');
            return;
        }

        try {
            setIsCreating(true);
            await topicService.createTopic(createFormData, user);
            showSuccess('Topic created successfully');
            setIsCreateTopicOpen(false);
            setCreateFormData({ title: '', content: '', category: 'general' });
            loadTopics();
        } catch (error) {
            console.error('Error creating topic:', error);
            showError('Failed to create topic');
        } finally {
            setIsCreating(false);
        }
    };

    const filteredTopics = useMemo(() => {
        let currentTopics = activeTab === 'community' ? topics : myTopics;

        if (selectedCategory !== 'all') {
            currentTopics = currentTopics.filter(t => t.category === selectedCategory);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            currentTopics = currentTopics.filter(t =>
                t.title.toLowerCase().includes(query) ||
                t.content.toLowerCase().includes(query) ||
                (t.user_username || '').toLowerCase().includes(query)
            );
        }

        return currentTopics;
    }, [topics, myTopics, activeTab, selectedCategory, searchQuery]);

    const handleSelectTopic = (topicId) => {
        setSelectedTopicId(topicId);
        onSelectThread(null); // Clear selected thread when selecting a topic
    };

    const handleSelectThreadInternal = (thread) => {
        onSelectThread(thread);
        setSelectedTopicId(null); // Clear selected topic when selecting a thread
    };

    const renderSidebar = () => (
        <div className={cn(
            "w-full md:w-80 border-r border-border flex flex-col bg-background h-full",
            isMobile && (selectedTopicId || selectedThread) ? "hidden" : "flex"
        )}>
            {/* Top Tabs */}
            <div className="shrink-0 px-4 pt-4">
                <div className="grid grid-cols-2 gap-2 mb-3 border-b border-border w-full">
                    <button
                        onClick={onSwitchToConversations}
                        className="w-full px-4 py-2 text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <div className="flex items-center justify-center gap-2">
                            <FiMessageSquare className="w-4 h-4" />
                            <span>{t('messages:tabs.conversations', 'Conversations')}</span>
                        </div>
                    </button>
                    <button
                        className="w-full px-4 py-2 text-sm font-medium border-b-2 border-primary text-primary transition-colors"
                    >
                        <div className="flex items-center justify-center gap-2">
                            <FiHome className="w-4 h-4" />
                            <span>{t('messages:tabs.threads', 'Communication')}</span>
                        </div>
                    </button>
                </div>
            </div>

            {/* View Mode Toggle (Topics vs Threads) */}
            <div className="px-4 pb-2 border-b border-border/40 mb-2">
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            setViewMode('topics');
                            setSelectedTopicId(null);
                            onSelectThread(null);
                        }}
                        className={cn(
                            "flex-1 py-1 text-xs font-medium rounded-md transition-colors",
                            viewMode === 'topics' ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Topics
                    </button>
                    {canAccessThreads && (
                        <button
                            onClick={() => {
                                setViewMode('threads');
                                setSelectedTopicId(null);
                                onSelectThread(null);
                            }}
                            className={cn(
                                "flex-1 py-1 text-xs font-medium rounded-md transition-colors",
                                viewMode === 'threads' ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Threads
                        </button>
                    )}
                </div>
            </div>

            {/* Search and Filters */}
            <div className="px-4 pb-3">
                <div className="relative" ref={filterDropdownRef}>
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                    <input
                        type="text"
                        placeholder={viewMode === 'topics' ? "Search topics..." : "Search threads..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-10 rounded-xl border-2 border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-0 transition-all hover:border-muted-foreground/30"
                        style={{ height: 'var(--boxed-inputfield-height)' }}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <button
                            onClick={() => setShowFiltersOverlay(!showFiltersOverlay)}
                            className={cn(
                                "p-1.5 rounded-full transition-colors relative",
                                selectedCategory !== 'all' ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"
                            )}
                        >
                            <FiSliders className="w-4 h-4" />
                        </button>
                    </div>

                    {showFiltersOverlay && viewMode === 'topics' && (
                        <div className="boxed-dropdown-options" style={{ overflowX: 'hidden', overflowY: 'auto' }}>
                            <button
                                onClick={() => { setSelectedCategory('all'); setShowFiltersOverlay(false); }}
                                className={cn("boxed-dropdown-option", selectedCategory === 'all' && "boxed-dropdown-option--selected")}
                            >
                                All Categories
                            </button>
                            {topicService.getCategories().map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => { setSelectedCategory(cat); setShowFiltersOverlay(false); }}
                                    className={cn("boxed-dropdown-option", selectedCategory === cat && "boxed-dropdown-option--selected")}
                                >
                                    {categoryLabels[cat] || cat}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Create Button (Only for Topics for now, or unified) */}
            <div className="px-4 pb-2">
                <button
                    onClick={() => setIsCreateTopicOpen(true)}
                    className="w-full px-4 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 text-sm"
                    style={{ height: 'var(--boxed-inputfield-height)' }}
                >
                    <FiPlus className="w-4 h-4" />
                    {viewMode === 'topics' ? "New Topic" : "New Thread"}
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
                {viewMode === 'topics' ? (
                    isLoading ? (
                        <div className="flex justify-center p-8"><LoadingSpinner /></div>
                    ) : filteredTopics.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-sm">No topics found</div>
                    ) : (
                        <div className="space-y-0.5">
                            {filteredTopics.map(topic => (
                                <button
                                    key={topic.id}
                                    onClick={() => handleSelectTopic(topic.id)}
                                    className={cn(
                                        "w-full text-left px-4 py-3 border-b border-border/40 transition-colors hover:bg-muted/30",
                                        selectedTopicId === topic.id && "bg-primary/5 border-l-4 border-l-primary"
                                    )}
                                >
                                    <div className="font-semibold text-sm truncate mb-0.5">{topic.title}</div>
                                    <div className="text-xs text-muted-foreground line-clamp-1">{topic.content}</div>
                                    <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                                        <span className="bg-secondary px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">
                                            {categoryLabels[topic.category] || topic.category}
                                        </span>
                                        <span>{new Date(topic.created_at).toLocaleDateString()}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )
                ) : (
                    isLoadingThreads ? (
                        <div className="flex justify-center p-8"><LoadingSpinner /></div>
                    ) : (
                        <ThreadsList
                            threads={threads}
                            selectedThreadId={selectedThread?.id}
                            onSelectThread={handleSelectThreadInternal}
                            currentUserId={user?.uid}
                        />
                    )
                )}
            </div>
        </div>
    );

    const renderMainContent = () => {
        if (selectedTopicId) {
            return (
                <div className="flex-1 flex flex-col min-w-0 bg-background h-full relative">
                    {/* Back Button for Mobile */}
                    {isMobile && (
                        <div className="p-4 border-b border-border flex items-center">
                            <button onClick={() => setSelectedTopicId(null)} className="p-2 hover:bg-muted rounded-full">
                                <FiChevronLeft className="w-5 h-5" />
                            </button>
                            <span className="ml-2 font-semibold">Back to Topics</span>
                        </div>
                    )}
                    <TopicDetail
                        topicId={selectedTopicId}
                        onBack={() => setSelectedTopicId(null)}
                    />
                </div>
            );
        }

        if (selectedThread) {
            return (
                <div className="flex-1 flex flex-col min-w-0 bg-background h-full relative">
                    {/* Back Button for Mobile is handled by ConversationView? Actually Messages.js has a complex system. Let's keep it simple. */}
                    {isMobile && (
                        <div className="p-4 border-b border-border flex items-center">
                            <button onClick={() => onSelectThread(null)} className="p-2 hover:bg-muted rounded-full">
                                <FiChevronLeft className="w-5 h-5" />
                            </button>
                            <span className="ml-2 font-semibold">Back to Threads</span>
                        </div>
                    )}
                    <ConversationView
                        conversation={selectedThread}
                        currentUser={user}
                        messageContext='personal'
                        workspaceContext={selectedWorkspace}
                    />
                </div>
            );
        }

        return (
            <div className={cn(
                "flex-1 flex flex-col min-w-0 bg-muted/5",
                isMobile && "hidden"
            )}>
                <EmptyState
                    title={viewMode === 'topics' ? "Select a topic" : "Select a thread"}
                    description={viewMode === 'topics' ? "Choose a discussion to view and participate" : "Choose a conversation to view messages"}
                    icon={FiHome}
                />
            </div>
        );
    };

    return (
        <div className="flex h-full bg-background relative overflow-hidden">
            {renderSidebar()}
            {renderMainContent()}

            {/* Create Topic Modal */}
            {isCreateTopicOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div
                        className="bg-card w-full max-w-lg rounded-3xl border border-border shadow-2xl overflow-hidden animate-in zoom-in-95"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-border">
                            <div className="flex items-center justify-between mb-1">
                                <h2 className="text-xl font-bold">New Discussion</h2>
                                <button
                                    onClick={() => setIsCreateTopicOpen(false)}
                                    className="p-2 hover:bg-muted rounded-full transition-colors"
                                >
                                    <FiX className="w-5 h-5 text-muted-foreground" />
                                </button>
                            </div>
                            <p className="text-sm text-muted-foreground">Share your thoughts with the community.</p>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Title</label>
                                <input
                                    type="text"
                                    placeholder="What's on your mind?"
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
                                        {topicService.getCategories().map(cat => (
                                            <option key={cat} value={cat}>{categoryLabels[cat] || cat}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Content</label>
                                <textarea
                                    placeholder="Elaborate on your topic..."
                                    rows={5}
                                    className="w-full px-4 py-3 rounded-xl bg-secondary/30 border border-input focus:border-primary/50 focus:bg-background transition-all outline-none resize-none"
                                    value={createFormData.content}
                                    onChange={e => setCreateFormData({ ...createFormData, content: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="p-6 border-t border-border bg-muted/20 flex justify-end gap-3">
                            <button
                                onClick={() => setIsCreateTopicOpen(false)}
                                className="px-6 py-2.5 rounded-xl font-medium text-muted-foreground hover:bg-muted transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={isCreating}
                                onClick={handleCreateTopic}
                                className="px-6 py-2.5 rounded-xl font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center gap-2"
                            >
                                {isCreating && <LoadingSpinner size="sm" color="white" />}
                                Create Topic
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
