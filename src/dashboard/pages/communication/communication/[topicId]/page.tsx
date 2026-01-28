import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '../../../../../components/boxedInputFields/button';
import TextareaField from '../../../../../components/boxedInputFields/textareaField';
import {
    FiTrash2 as Trash2,
    FiSend as Send,
    FiHeart as Heart,
    FiShield as Shield,
    FiPaperclip as Pin,
    FiBell as Megaphone,
    FiMessageSquare as MessageSquare,
    FiArrowLeft as ArrowLeft,
    FiChevronRight as ChevronRight,
} from 'react-icons/fi';
import { useAuth } from '../../../../../contexts/authContext';
import { useNotification } from '../../../../../contexts/notificationContext';
import { useAction } from '../../../../../services/actions/hook';
import { cn } from '../../../../../services/utils/formatting';

// Define missing types
export type TopicCategory = 'feedback' | 'bug_report' | 'feature_request' | 'support' | 'question' | 'general';

export interface Reply {
    id: string;
    content: string;
    user_username?: string;
    user_email?: string;
    created_at: string;
    upvotes: number;
    parent_id?: string;
    is_admin_reply?: boolean;
    replies?: Reply[];
}

export interface Topic {
    id: string;
    title: string;
    content: string;
    category: TopicCategory;
    user_username?: string;
    user_email?: string;
    created_at: string;
    upvotes: number;
    is_pinned?: boolean;
    replies?: Reply[];
}

const categoryLabels: Record<TopicCategory, string> = {
    feedback: 'Feedback',
    bug_report: 'Bug Report',
    feature_request: 'Feature Request',
    support: 'Support',
    question: 'Question',
    general: 'General',
};

function buildReplyTree(replies: Reply[]): Reply[] {
    if (!replies || replies.length === 0) return [];

    const replyMap = new Map<string, Reply>();
    const roots: Reply[] = [];

    replies.forEach(r => {
        replyMap.set(r.id, { ...r, replies: [] });
    });

    replies.forEach(r => {
        const node = replyMap.get(r.id)!;
        if (r.parent_id && replyMap.has(r.parent_id)) {
            const parent = replyMap.get(r.parent_id)!;
            parent.replies = parent.replies || [];
            parent.replies.push(node);
        } else {
            roots.push(node);
        }
    });

    return roots;
}

export default function TopicDetailPage() {
    const params = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const { showError, showSuccess } = useNotification();
    const { execute } = useAction();
    const topicId = params.topicId as string;

    const [topic, setTopic] = useState<Topic | null>(null);
    const [loading, setLoading] = useState(true);
    const [replying, setReplying] = useState<string | null>(null);
    const [replyData, setReplyData] = useState<Record<string, string>>({});
    const replyInputRef = React.useRef<HTMLTextAreaElement>(null);

    const handleFocusReply = () => {
        replyInputRef.current?.focus();
    };

    const loadTopic = useCallback(async () => {
        try {
            setLoading(true);
            const result: any = await execute('thread.fetch', {
                collectionType: 'tickets',
                threadId: topicId,
                includeReplies: true
            });

            if (result && result.thread) {
                const topicData: Topic = {
                    ...result.thread,
                    replies: result.replies || []
                };
                setTopic(topicData);
            }
        } catch (error: any) {
            console.error('Error loading topic:', error);
            showError(error.message || 'Failed to load topic');
            navigate('/dashboard/communication');
        } finally {
            setLoading(false);
        }
    }, [topicId, showError, navigate, execute]);

    useEffect(() => {
        if (topicId) {
            loadTopic();
        }
    }, [topicId, loadTopic]);

    const handleUpvoteTopic = async () => {
        if (!topic) return;
        try {
            // Mapping upvote to a flag priority or similar action if applicable
            // For now just a placeholder if action doesn't exist
            // await execute('thread.upvote', { threadId: topic.id });
            await loadTopic();
        } catch (error) {
            console.error('Failed to upvote topic:', error);
        }
    };

    const handleUpvoteReply = async (replyId: string) => {
        if (!topic) return;
        try {
            // await execute('thread.upvote_reply', { threadId: topic.id, replyId });
            await loadTopic();
        } catch (error) {
            console.error('Failed to upvote reply:', error);
        }
    };

    const handleReply = async (parentId?: string) => {
        if (!topic) return;
        const key = parentId || topic.id;
        const content = replyData[key]?.trim();
        if (!content) {
            showError('Please enter a reply');
            return;
        }

        try {
            setReplying(key);
            await execute('thread.reply', {
                threadId: topic.id,
                content,
                parentId,
                collectionType: 'tickets'
            });

            showSuccess('Your reply has been posted');
            setReplyData({ ...replyData, [key]: '' });
            loadTopic();
        } catch (error: any) {
            showError(error.message || 'Failed to post reply');
        } finally {
            setReplying(null);
        }
    };

    const formatDate = (dateString: any) => {
        if (!dateString) return '';
        // Handle Firestore Timestamp or string
        const date = dateString.toDate ? dateString.toDate() : new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const renderReplies = (replies: Reply[], level: number = 0) => {
        return (
            <div className={cn("space-y-6", level > 0 && "mt-6")}>
                {replies.map(reply => (
                    <div key={reply.id} className="relative">
                        {/* Thread line for nested replies */}
                        {level > 0 && (
                            <div className="absolute -left-6 top-0 bottom-0 w-px bg-border group-last:bottom-auto group-last:h-10" />
                        )}

                        <div className={cn(
                            "group relative",
                            level > 0 && "ml-6"
                        )}>
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 relative">
                                    <div className="w-10 h-10 rounded-full bg-secondary/80 border border-white/5 flex items-center justify-center font-bold text-sm text-foreground shadow-sm">
                                        {(reply.user_username || reply.user_email || 'A').charAt(0).toUpperCase()}
                                    </div>
                                    {reply.is_admin_reply && (
                                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary border border-background flex items-center justify-center shadow-sm z-10">
                                            <Shield className="w-2.5 h-2.5 text-primary-foreground" />
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
                                            onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleUpvoteReply(reply.id); }}
                                            className={cn(
                                                "flex items-center gap-1.5 text-xs transition-colors p-1 -ml-1 rounded-md hover:bg-muted",
                                                reply.upvotes ? "text-rose-500" : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            <Heart className={cn("w-3.5 h-3.5", reply.upvotes ? "fill-current" : "")} />
                                            <span>{reply.upvotes || 0}</span>
                                        </button>
                                        <button
                                            onClick={(e: React.MouseEvent) => { e.stopPropagation(); setReplying(reply.id); }}
                                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
                                        >
                                            <MessageSquare className="w-3.5 h-3.5" />
                                            Reply
                                        </button>
                                    </div>

                                    {replying === reply.id && (
                                        <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                                            <div className="relative">
                                                <div onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                                                    <TextareaField
                                                        label=""
                                                        placeholder="Write a reply..."
                                                        value={replyData[reply.id] || ''}
                                                        onChange={(e: any) => {
                                                            setReplyData({ ...replyData, [reply.id]: e.target.value });
                                                        }}
                                                        name={`reply-${reply.id}`}
                                                        rows={1}
                                                        maxLength={undefined}
                                                        marginBottom={undefined}
                                                        marginTop={undefined}
                                                        marginLeft={undefined}
                                                        marginRight={undefined}
                                                        error={null}
                                                        onErrorReset={() => {}}
                                                    />
                                                </div>
                                                <Button
                                                    className={cn(
                                                        "absolute right-2 bottom-2 h-8 w-8",
                                                        replyData[reply.id]?.trim() ? "text-primary opacity-100" : "text-muted-foreground opacity-50"
                                                    )}
                                                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleReply(reply.id); }}
                                                    disabled={!replyData[reply.id]?.trim()}
                                                >
                                                    <Send className="w-4 h-4" />
                                                </Button>
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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
                <p>Loading discussion...</p>
            </div>
        );
    }

    if (!topic) {
        return null;
    }

    const nestedReplies = buildReplyTree(topic.replies || []);

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
            {/* Header */}
            <header className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-xl">
                <div className="w-full h-16 flex items-center px-6 relative">
                    {/* Left: Back Button */}
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            onClick={() => navigate('/dashboard/communication')}
                            className="hover:bg-muted -ml-2 text-muted-foreground hover:text-foreground"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Center: Category Badge */}
                    <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
                        <span className="border-border/50 bg-secondary/50 text-muted-foreground text-xs px-3 py-1 rounded-full capitalize hover:bg-secondary border">
                            {categoryLabels[topic.category] || topic.category}
                        </span>
                    </div>

                </div>
            </header>

            <main className="mx-auto w-full max-w-6xl py-8 md:py-12 px-6">
                <div className="space-y-6">
                    {/* Topic Main Content */}
                    <div className="bg-secondary rounded-3xl p-6 md:p-10">
                        <article className="space-y-6">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-background border border-white/5 flex items-center justify-center text-lg font-bold shadow-sm">
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
                                        <div className="flex items-center gap-2 mt-1">
                                            {topic.is_pinned && (
                                                <span className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 text-[10px] px-2 h-5 rounded-full border-0 flex items-center">
                                                    <Pin className="w-3 h-3 mr-1" /> Pinned
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
                                    {topic.title}
                                </h1>
                                <div className="prose prose-invert max-w-none">
                                    <p className="text-lg text-foreground/80 leading-relaxed whitespace-pre-wrap">
                                        {topic.content}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <Button
                                    variant="outline"
                                    onClick={handleUpvoteTopic}
                                    className={cn(
                                        "rounded-full border-border/50 bg-background hover:bg-background/80 gap-2 transition-all h-9 px-4",
                                        topic.upvotes ? "text-rose-500 border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <Heart className={cn("w-4 h-4", topic.upvotes ? "fill-current" : "")} />
                                    <span>{topic.upvotes || 'Like'}</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleFocusReply}
                                    className="rounded-full border-border/50 bg-background hover:bg-background/80 gap-2 transition-all h-9 px-4 text-muted-foreground hover:text-foreground"
                                >
                                    <MessageSquare className="w-4 h-4" />
                                    <span>Reply</span>
                                </Button>
                            </div>
                        </article>
                    </div>

                    {/* Discussion Area */}
                    <div className="bg-secondary rounded-3xl p-6 md:p-10">
                        <section className="space-y-8">
                            <div className="flex items-baseline justify-between">
                                <h2 className="text-xl font-semibold flex items-center gap-2">
                                    Discussion
                                    <span className="text-muted-foreground text-sm font-normal ml-1">
                                        {topic.replies?.length || 0}
                                    </span>
                                </h2>
                            </div>

                            {/* Comment Input */}
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-sm text-primary flex-shrink-0">
                                    {(currentUser?.firstName || currentUser?.email || 'Me').charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 relative group/input">
                                    <TextareaField
                                        label=""
                                        placeholder="Add to the discussion..."
                                        value={replyData[topic.id] || ''}
                                        onChange={(e: any) => {
                                            setReplyData({
                                                ...replyData,
                                                [topic.id]: e.target.value,
                                            });
                                        }}
                                        name={`reply-topic-${topic.id}`}
                                        rows={1}
                                        maxLength={undefined}
                                        marginBottom={undefined}
                                        marginTop={undefined}
                                        marginLeft={undefined}
                                        marginRight={undefined}
                                        error={null}
                                        onErrorReset={() => {}}
                                    />
                                    <div className={cn(
                                        "absolute right-2 bottom-2 transition-all duration-200",
                                        replyData[topic.id]?.trim() ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
                                    )}>
                                        <Button
                                            className="h-10 w-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-md flex items-center justify-center"
                                            onClick={() => handleReply()}
                                            disabled={replying === topic.id}
                                        >
                                            {replying === topic.id ? (
                                                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <Send className="w-4 h-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Replies List */}
                            <div className="pt-2">
                                {nestedReplies.length > 0 ? (
                                    renderReplies(nestedReplies)
                                ) : (
                                    <div className="text-center py-12 border border-dashed border-border/50 rounded-2xl bg-background/50">
                                        <MessageSquare className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                                        <p className="text-muted-foreground text-sm">No replies yet.</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
}
