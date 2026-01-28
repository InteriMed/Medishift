import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    FiMessageSquare,
    FiBarChart2,
    FiHeart,
    FiPlus,
    FiX,
    FiSearch,
    FiArrowDown,
    FiFileText
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useDashboard } from '../../contexts/DashboardContext';
import { useNotification } from '../../../contexts/notificationContext';
import { topicService } from '../../../services/topicService';
import { TopicDetail } from './TopicDetail';
import LoadingSpinner from '../../../components/LoadingSpinner/LoadingSpinner';
import { cn } from '../../../utils/cn';

const categoryLabels = {
    feedback: 'Feedback',
    bug_report: 'Bug Report',
    feature_request: 'Feature Request',
    support: 'Support',
    question: 'Question',
    general: 'General',
};

export const Support = () => {
    const { t } = useTranslation(['messages']);
    const { user } = useDashboard();
    const { showError, showSuccess } = useNotification();

    const [topics, setTopics] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTopicId, setSelectedTopicId] = useState(null);

    const [isCreateTopicOpen, setIsCreateTopicOpen] = useState(false);
    const [createFormData, setCreateFormData] = useState({
        title: '',
        content: '',
        category: 'general'
    });
    const [isCreating, setIsCreating] = useState(false);
    const [showFiltersOverlay, setShowFiltersOverlay] = useState(false);
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

    const loadTopics = useCallback(async () => {
        try {
            setIsLoading(true);
            if (user?.uid) {
                const data = await topicService.listMyTopics(user.uid);
                setTopics(data);
            }
        } catch (error) {
            console.error('Error loading topics:', error);
            showError('Failed to load topics');
        } finally {
            setIsLoading(false);
        }
    }, [user, showError]);

    useEffect(() => {
        loadTopics();
    }, [loadTopics]);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('action') === 'create') {
            setIsCreateTopicOpen(true);
        }

        const handleOpenModal = (event) => {
            if (event.detail?.type === 'createTicket' || event.detail?.action === 'create') {
                setIsCreateTopicOpen(true);
            }
        };

        window.addEventListener('openModal', handleOpenModal);
        return () => window.removeEventListener('openModal', handleOpenModal);
    }, []);

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
        let currentTopics = topics;

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
    }, [topics, selectedCategory, searchQuery]);

    if (selectedTopicId) {
        return (
            <TopicDetail
                topicId={selectedTopicId}
                onBack={() => setSelectedTopicId(null)}
            />
        );
    }

    return (
        <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500">
            <div className="flex-1 overflow-auto">
                <div className="w-full max-w-[1400px] mx-auto flex-1 flex flex-col pt-6">
                    <div className="max-w-[1400px] mx-auto w-full px-6">
                        <div className="bg-card rounded-xl border border-border hover:shadow-md transition-shadow w-full">
                            <div className="flex items-center justify-between mb-4 px-6 pt-6">
                                <h3 className="text-base font-semibold text-foreground">
                                    {t('messages:support.title', 'Support Topics')}
                                </h3>
                                <button
                                    onClick={() => setIsCreateTopicOpen(true)}
                                    className="px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all shadow-sm flex items-center gap-2 shrink-0"
                                    style={{ height: 'var(--boxed-inputfield-height)' }}
                                >
                                    <FiPlus className="w-4 h-4" />
                                    <span>{t('messages:support.newTopic', 'New Topic')}</span>
                                </button>
                            </div>
                            <div className="pt-3 border-t border-border mb-4 px-6">
                                <p className="text-sm text-muted-foreground">
                                    {t('messages:support.description', 'Browse and search for topics in the support community.')}
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 w-full px-6 pb-6">
                                <div className="relative flex-1 min-w-[200px]">
                                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder={t('messages:support.searchPlaceholder', 'Search topics...')}
                                        className="w-full pl-9 pr-8 rounded-xl border-2 border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-0 focus:shadow-[0_0_0_4px_rgba(79,70,229,0.1)] transition-all hover:border-muted-foreground/30 hover:bg-muted/30"
                                        style={{
                                            height: 'var(--boxed-inputfield-height)',
                                            fontWeight: '500',
                                            fontFamily: 'var(--font-family-text, Roboto, sans-serif)',
                                            color: 'var(--boxed-inputfield-color-text)'
                                        }}
                                    />
                                </div>

                                <div className="relative shrink-0" ref={filterDropdownRef}>
                                    <button
                                        onClick={() => setShowFiltersOverlay(!showFiltersOverlay)}
                                        className={cn(
                                            "px-4 rounded-xl border-2 transition-all flex items-center gap-2 shrink-0",
                                            selectedCategory !== 'all' || showFiltersOverlay
                                                ? "bg-primary/10 border-primary/20 text-primary"
                                                : "bg-background border-input text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                                        )}
                                        style={{ height: 'var(--boxed-inputfield-height)' }}
                                        title="Filter by Category"
                                    >
                                        <FiArrowDown className="w-4 h-4" />
                                        <span className="text-sm font-medium">
                                            {selectedCategory !== 'all' ? categoryLabels[selectedCategory] : t('messages:support.filter', 'Filter')}
                                        </span>
                                    </button>

                                    {showFiltersOverlay && (
                                        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-popover shadow-lg p-1.5 z-50 animate-in fade-in zoom-in-95 duration-200">
                                            <div className="text-xs font-semibold text-muted-foreground px-2 py-1.5 mb-1">
                                                {t('messages:support.categories', 'Categories')}
                                            </div>
                                            <button
                                                onClick={() => { setSelectedCategory('all'); setShowFiltersOverlay(false); }}
                                                className={cn(
                                                    "w-full text-left px-2 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2",
                                                    selectedCategory === 'all'
                                                        ? "bg-primary/10 text-primary font-medium"
                                                        : "text-foreground hover:bg-muted"
                                                )}
                                            >
                                                <span>{t('messages:support.allCategories', 'All Categories')}</span>
                                            </button>
                                            {Object.keys(categoryLabels).map((cat) => (
                                                <button
                                                    key={cat}
                                                    onClick={() => { setSelectedCategory(cat); setShowFiltersOverlay(false); }}
                                                    className={cn(
                                                        "w-full text-left px-2 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2",
                                                        selectedCategory === cat
                                                            ? "bg-primary/10 text-primary font-medium"
                                                            : "text-foreground hover:bg-muted"
                                                    )}
                                                >
                                                    <span>{categoryLabels[cat] || cat}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="w-full max-w-[1400px] mx-auto pt-6">
                        <div className="space-y-4 px-6">
                            {isLoading && topics.length === 0 ? (
                                <LoadingSpinner />
                            ) : filteredTopics.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                                        <FiFileText className="w-8 h-8 text-muted-foreground/50" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-foreground mb-2">
                                        {t('messages:support.noTopics', 'No topics found')}
                                    </h3>
                                    <p className="text-muted-foreground mb-6">
                                        {t('messages:support.noTopicsHint', 'Get started by creating a new topic.')}
                                    </p>
                                    <button
                                        onClick={() => setIsCreateTopicOpen(true)}
                                        className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center gap-2"
                                    >
                                        <FiPlus className="w-5 h-5" />
                                        {t('messages:support.createTopic', 'Create Topic')}
                                    </button>
                                </div>
                            ) : (
                                filteredTopics.map(topic => (
                                    <div
                                        key={topic.id}
                                        onClick={() => setSelectedTopicId(topic.id)}
                                        className="group bg-card hover:bg-card/80 border border-border/50 hover:border-primary/20 rounded-2xl p-6 cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md"
                                    >
                                        <div className="flex items-start justify-between gap-4 mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold border border-border">
                                                    {(topic.user_username || topic.user_email || 'A').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-foreground flex items-center gap-2">
                                                        {topic.user_username || 'Anonymous'}
                                                        {topic.is_pinned && (
                                                            <span className="bg-yellow-500/10 text-yellow-600 text-[10px] px-2 py-0.5 rounded-full border border-yellow-500/20 flex items-center gap-1">
                                                                <FiBarChart2 className="w-3 h-3 rotate-90" /> Pinned
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {topic.created_at ? new Date(topic.created_at).toLocaleDateString() : 'Just now'} · {categoryLabels[topic.category] || topic.category}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors line-clamp-1">{topic.title}</h3>
                                        <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed mb-4">{topic.content}</p>

                                        <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
                                            <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary/50", topic.upvotes > 0 && "text-rose-500 bg-rose-500/10")}>
                                                <FiHeart className={cn("w-3.5 h-3.5", topic.upvotes > 0 && "fill-current")} />
                                                <span>{topic.upvotes || 0}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary/50">
                                                <FiMessageSquare className="w-3.5 h-3.5" />
                                                <span>{topic.replies?.length || 0} replies</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

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

