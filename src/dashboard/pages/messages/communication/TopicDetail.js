import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    FiArrowLeft,
    FiHeart,
    FiMessageSquare,
    FiSend,
    FiShield,
    FiMoreVertical,
    FiShare2
} from 'react-icons/fi';
import { useNotification } from '../../../../contexts/NotificationContext';
import { topicService } from '../../../../services/topicService';
import LoadingSpinner from '../../../../components/LoadingSpinner/LoadingSpinner';
import { cn } from '../../../../utils/cn';
import { useDashboard } from '../../../contexts/DashboardContext';

const categoryLabels = {
    feedback: 'Feedback',
    bug_report: 'Bug Report',
    feature_request: 'Feature Request',
    support: 'Support',
    question: 'Question',
    general: 'General',
};

function buildReplyTree(replies) {
    if (!replies || replies.length === 0) return [];

    const replyMap = new Map();
    const roots = [];

    replies.forEach(r => {
        replyMap.set(r.id, { ...r, replies: [] });
    });

    replies.forEach(r => {
        const node = replyMap.get(r.id);
        if (r.parent_id && replyMap.has(r.parent_id)) {
            const parent = replyMap.get(r.parent_id);
            parent.replies = parent.replies || [];
            parent.replies.push(node);
        } else {
            roots.push(node);
        }
    });

    return roots;
}

export const TopicDetail = ({ topicId, onBack }) => {
    const { user } = useDashboard();
    const { showError, showSuccess } = useNotification();

    const [topic, setTopic] = useState(null);
    const [loading, setLoading] = useState(true);
    const [replying, setReplying] = useState(null);
    const [replyData, setReplyData] = useState({});
    const replyInputRef = useRef(null);

    const loadTopic = useCallback(async () => {
        try {
            setLoading(true);
            const data = await topicService.getTopic(topicId);
            setTopic(data);
        } catch (error) {
            console.error('Error loading topic:', error);
            showError('Failed to load topic');
            onBack();
        } finally {
            setLoading(false);
        }
    }, [topicId, showError, onBack]);

    useEffect(() => {
        if (topicId) {
            loadTopic();
        }
    }, [topicId, loadTopic]);

    const handleUpvoteTopic = async () => {
        if (!topic || !user) return;
        try {
            await topicService.upvoteTopic(topic.id, user.uid);
            loadTopic();
        } catch (error) {
            console.error('Failed to upvote topic:', error);
        }
    };

    const handleUpvoteReply = async (replyId) => {
        if (!topic || !user) return;
        try {
            await topicService.upvoteReply(topic.id, replyId, user.uid);
            loadTopic();
        } catch (error) {
            console.error('Failed to upvote reply:', error);
        }
    };

    const handleReply = async (parentId = null) => {
        if (!topic || !user) return;
        const key = parentId || topic.id;
        const content = replyData[key]?.trim();

        if (!content) {
            showError('Please enter a reply');
            return;
        }

        try {
            setReplying(key);
            await topicService.createReply(topic.id, { content, parent_id: parentId }, user);
            showSuccess('Reply posted');
            setReplyData(prev => ({ ...prev, [key]: '' }));
            loadTopic();
        } catch (error) {
            showError(error.message || 'Failed to post reply');
        } finally {
            setReplying(null);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const renderReplies = (replies, level = 0) => {
        return (
            <div className={cn("space-y-6", level > 0 && "mt-6")}>
                {replies.map(reply => (
                    <div key={reply.id} className="relative">
                        {level > 0 && (
                            <div className="absolute -left-6 top-0 bottom-0 w-px bg-border group-last:bottom-auto group-last:h-10" />
                        )}

                        <div className={cn("group relative", level > 0 && "ml-6")}>
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 relative">
                                    <div className="w-10 h-10 rounded-full bg-secondary/80 border border-white/5 flex items-center justify-center font-bold text-sm text-foreground shadow-sm">
                                        {(reply.user_username || reply.user_email || 'A').charAt(0).toUpperCase()}
                                    </div>
                                    {reply.is_admin_reply && (
                                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary border border-background flex items-center justify-center shadow-sm z-10">
                                            <FiShield className="w-2.5 h-2.5 text-white" />
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-sm text-foreground">
                                                {reply.user_username || reply.user_email || 'Anonymous'}
                                            </span>
                                            <span className="text-muted-foreground/30 text-xs">•</span>
                                            <span className="text-xs text-muted-foreground">
                                                {formatDate(reply.created_at)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                                        {reply.content}
                                    </div>

                                    <div className="flex items-center gap-4 pt-1">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleUpvoteReply(reply.id); }}
                                            className={cn(
                                                "flex items-center gap-1.5 text-xs transition-colors p-1 -ml-1 rounded-md hover:bg-muted",
                                                (reply.upvoters || []).includes(user?.uid) ? "text-rose-500" : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            <FiHeart className={cn("w-3.5 h-3.5", (reply.upvoters || []).includes(user?.uid) ? "fill-current" : "")} />
                                            <span>{reply.upvotes || 0}</span>
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setReplying(reply.id); }}
                                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
                                        >
                                            <FiMessageSquare className="w-3.5 h-3.5" />
                                            Reply
                                        </button>
                                    </div>

                                    {replying === reply.id && (
                                        <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                                            <div className="relative">
                                                <textarea
                                                    placeholder="Write a reply..."
                                                    value={replyData[reply.id] || ''}
                                                    onChange={e => {
                                                        e.target.style.height = 'auto';
                                                        e.target.style.height = e.target.scrollHeight + 'px';
                                                        setReplyData(prev => ({ ...prev, [reply.id]: e.target.value }));
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    rows={1}
                                                    autoFocus
                                                    className="w-full bg-secondary/50 border border-border/50 hover:bg-secondary/80 focus:bg-secondary focus:border-border focus:outline-none transition-all rounded-xl placeholder:text-muted-foreground/50 resize-none min-h-[60px] py-3 pr-12 text-sm px-4"
                                                    style={{ fontFamily: 'var(--font-family-text)' }}
                                                />
                                                <button
                                                    className={cn(
                                                        "absolute right-2 bottom-2 h-8 w-8 flex items-center justify-center rounded-lg transition-all",
                                                        replyData[reply.id]?.trim() ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-muted-foreground"
                                                    )}
                                                    onClick={(e) => { e.stopPropagation(); handleReply(reply.id); }}
                                                    disabled={!replyData[reply.id]?.trim()}
                                                >
                                                    <FiSend className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {reply.replies && reply.replies.length > 0 && (
                                        <div className="pt-2">
                                            {renderReplies(reply.replies, level + 1)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    if (loading) return <LoadingSpinner />;
    if (!topic) return null;

    const nestedReplies = buildReplyTree(topic.replies || []);

    return (
        <div className="flex flex-col h-full bg-background overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 z-20 w-full bg-background/80 backdrop-blur-xl border-b border-border">
                <div className="w-full h-16 flex items-center px-4 relative justify-between">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <FiArrowLeft className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-secondary text-muted-foreground border border-border capitalize">
                            {categoryLabels[topic.category] || topic.category}
                        </span>
                    </div>

                    <div className="w-9" /> {/* Spacer for balance */}
                </div>
            </div>

            <main className="w-full max-w-4xl mx-auto p-4 md:p-8 space-y-8 flex-1">
                {/* Topic Content */}
                <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-lg font-bold">
                            {(topic.user_username || topic.user_email || 'A').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-foreground">
                                    {topic.user_username || topic.user_email || 'Anonymous'}
                                </span>
                                <span className="text-muted-foreground/30">•</span>
                                <span className="text-sm text-muted-foreground">
                                    {formatDate(topic.created_at)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <h1 className="text-2xl md:text-3xl font-bold mb-4 text-foreground leading-tight">
                        {topic.title}
                    </h1>

                    <div className="prose prose-invert max-w-none mb-6">
                        <p className="text-base text-foreground/80 leading-relaxed whitespace-pre-wrap">
                            {topic.content}
                        </p>
                    </div>

                    <div className="flex items-center gap-3 pt-4 border-t border-border/50">
                        <button
                            onClick={handleUpvoteTopic}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-full border transition-all text-sm font-medium",
                                (topic.upvoters || []).includes(user?.uid)
                                    ? "bg-rose-500/10 border-rose-500/20 text-rose-500"
                                    : "bg-background border-border hover:bg-muted text-muted-foreground"
                            )}
                        >
                            <FiHeart className={cn("w-4 h-4", (topic.upvoters || []).includes(user?.uid) ? "fill-current" : "")} />
                            <span>{topic.upvotes || 'Like'}</span>
                        </button>
                        <button
                            onClick={() => {
                                replyInputRef.current?.focus();
                            }}
                            className="flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-background hover:bg-muted text-muted-foreground transition-all text-sm font-medium"
                        >
                            <FiMessageSquare className="w-4 h-4" />
                            <span>Reply</span>
                        </button>
                    </div>
                </div>

                {/* Discussion Section */}
                <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
                    <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        Discussion
                        <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            {topic.replies?.length || 0}
                        </span>
                    </h2>

                    {/* Main Reply Input */}
                    <div className="flex gap-4 mb-8">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-sm text-primary flex-shrink-0">
                            {(user?.username || user?.email || 'M').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 relative">
                            <textarea
                                ref={replyInputRef}
                                placeholder="Add to the discussion..."
                                value={replyData[topic.id] || ''}
                                onChange={e => {
                                    e.target.style.height = 'auto';
                                    e.target.style.height = e.target.scrollHeight + 'px';
                                    setReplyData(prev => ({ ...prev, [topic.id]: e.target.value }));
                                }}
                                rows={1}
                                className="w-full bg-muted/30 border border-input hover:bg-muted/50 focus:bg-background focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all rounded-xl placeholder:text-muted-foreground/50 resize-none min-h-[56px] py-4 px-5 text-sm outline-none"
                                style={{ fontFamily: 'var(--font-family-text)' }}
                            />
                            <div className={cn(
                                "absolute right-2 bottom-2 transition-all duration-200",
                                replyData[topic.id]?.trim() ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
                            )}>
                                <button
                                    className="h-9 w-9 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center shadow-md transition-colors"
                                    onClick={() => handleReply()}
                                    disabled={replying === topic.id}
                                >
                                    <FiSend className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Replies List */}
                    <div className="border-t border-border/50 pt-6">
                        {nestedReplies.length > 0 ? (
                            renderReplies(nestedReplies)
                        ) : (
                            <div className="text-center py-12">
                                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                                    <FiMessageSquare className="w-6 h-6 text-muted-foreground/40" />
                                </div>
                                <p className="text-muted-foreground text-sm">No replies yet. Be the first to join the conversation!</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};
