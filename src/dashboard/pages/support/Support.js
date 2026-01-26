import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    FiMessageSquare,
    FiBarChart2,
    FiHeart,
    FiPlus,
    FiX
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useDashboard } from '../../contexts/DashboardContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { topicService } from '../../../services/topicService';
import { SupportToolbar } from './components/SupportToolbar';
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
        <div className="flex flex-col h-full bg-background relative overflow-hidden">
            <div className="w-full max-w-[1400px] mx-auto flex-1 flex flex-col">
                <SupportToolbar
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    selectedCategory={selectedCategory}
                    setSelectedCategory={setSelectedCategory}
                    categories={topicService.getCategories()}
                    onCreateTopic={() => setIsCreateTopicOpen(true)}
                />

                <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-muted/5">
                    <div className="max-w-[1400px] mx-auto space-y-4 mt-4">
                                {isLoading ? (
                                    <LoadingSpinner />
                                ) : filteredTopics.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-center">
                                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                                            <FiMessageSquare className="w-8 h-8 text-muted-foreground/50" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-foreground mb-2">No topics found</h3>
                                        <p className="text-muted-foreground mb-6">get started by creating a new topic.</p>
                                        <button
                                            onClick={() => setIsCreateTopicOpen(true)}
                                            className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center gap-2"
                                        >
                                            <FiPlus className="w-5 h-5" />
                                            Create Topic
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
        </div>
    );
};

