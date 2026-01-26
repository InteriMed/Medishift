'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Trash2,
    Send,
    Heart,
    Shield,
    Pin,
    Megaphone,
    MessageSquare,
    ArrowLeft,
    ChevronRight,
} from 'lucide-react';
import {
    topicService,
    Topic,
    Reply,
    TopicCategory,
} from '@/lib/api/topics';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/ui/use-toast';
import { ClipizyLoadingOverlay } from '@/components/ui/clipizy-loading';
import { cn } from '@/lib/utils';

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
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();
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
            const data = await topicService.getTopic(topicId);
            setTopic(data);
        } catch (error: any) {
            console.error('Error loading topic:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to load topic',
                variant: 'destructive',
            });
            router.push('/dashboard/communication');
        } finally {
            setLoading(false);
        }
    }, [topicId, toast, router]);

    useEffect(() => {
        if (topicId) {
            loadTopic();
        }
    }, [topicId, loadTopic]);

    const handleUpvoteTopic = async () => {
        if (!topic) return;
        try {
            await topicService.upvoteTopic(topic.id);
            loadTopic();
        } catch (error) {
            console.error('Failed to upvote topic:', error);
        }
    };

    const handleUpvoteReply = async (replyId: string) => {
        if (!topic) return;
        try {
            await topicService.upvoteReply(topic.id, replyId);
            loadTopic();
        } catch (error) {
            console.error('Failed to upvote reply:', error);
        }
    };

    const handleReply = async (parentId?: string) => {
        if (!topic) return;
        const key = parentId || topic.id;
        const content = replyData[key]?.trim();
        if (!content) {
            toast({
                title: 'Validation Error',
                description: 'Please enter a reply',
                variant: 'destructive',
            });
            return;
        }

        try {
            setReplying(key);
            await topicService.createReply(topic.id, { content, parent_id: parentId });
            toast({
                title: 'Success!',
                description: 'Your reply has been posted',
            });
            setReplyData({ ...replyData, [key]: '' });
            loadTopic();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to post reply',
                variant: 'destructive',
            });
        } finally {
            setReplying(null);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
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
                            {/* Connection curve for nested replies - optional detail
                            {level > 0 && (
                                <div className="absolute -left-6 top-6 w-4 h-px bg-border" />
                            )}
                            */}

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
                                            onClick={(e) => { e.stopPropagation(); handleUpvoteReply(reply.id); }}
                                            className={cn(
                                                "flex items-center gap-1.5 text-xs transition-colors p-1 -ml-1 rounded-md hover:bg-muted",
                                                reply.upvotes ? "text-rose-500" : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            <Heart className={cn("w-3.5 h-3.5", reply.upvotes ? "fill-current" : "")} />
                                            <span>{reply.upvotes || 0}</span>
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setReplying(reply.id); }}
                                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
                                        >
                                            <MessageSquare className="w-3.5 h-3.5" />
                                            Reply
                                        </button>
                                    </div>

                                    {replying === reply.id && (
                                        <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                                            <div className="relative">
                                                <Textarea
                                                    placeholder="Write a reply..."
                                                    value={replyData[reply.id] || ''}
                                                    onChange={e => {
                                                        e.target.style.height = 'auto';
                                                        e.target.style.height = e.target.scrollHeight + 'px';
                                                        setReplyData({ ...replyData, [reply.id]: e.target.value });
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    rows={1}
                                                    autoFocus
                                                    className="w-full bg-secondary/50 border-dashed border-border/50 hover:bg-secondary/80 focus:bg-secondary focus:border-border/50 focus-visible:ring-0 transition-all rounded-xl placeholder:text-muted-foreground/50 resize-none min-h-[60px] py-3 pr-12 text-sm"
                                                />
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className={cn(
                                                        "absolute right-2 bottom-2 h-8 w-8 transition-all hover:bg-primary hover:text-primary-foreground",
                                                        replyData[reply.id]?.trim() ? "text-primary opacity-100" : "text-muted-foreground opacity-50"
                                                    )}
                                                    onClick={(e) => { e.stopPropagation(); handleReply(reply.id); }}
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
        return <ClipizyLoadingOverlay message="Loading discussion..." />;
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
                            size="icon"
                            onClick={() => router.push('/dashboard/communication')}
                            className="hover:bg-muted -ml-2 text-muted-foreground hover:text-foreground"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Center: Category Badge */}
                    <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
                        <Badge variant="outline" className="border-border/50 bg-secondary/50 text-muted-foreground text-xs px-3 py-1 rounded-full capitalize hover:bg-secondary">
                            {categoryLabels[topic.category] || topic.category}
                        </Badge>
                    </div>

                </div>
            </header>

            <main className="mx-auto w-full max-w-6xl py-8 md:py-12">
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
                                                <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 text-[10px] px-2 h-5 rounded-full border-0">
                                                    <Pin className="w-3 h-3 mr-1" /> Pinned
                                                </Badge>
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
                                    size="sm"
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
                                    size="sm"
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
                                    {(user?.username || user?.email || 'Me').charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 relative group/input">
                                    <Textarea
                                        ref={replyInputRef}
                                        placeholder="Add to the discussion..."
                                        value={replyData[topic.id] || ''}
                                        onChange={e => {
                                            e.target.style.height = 'auto';
                                            e.target.style.height = e.target.scrollHeight + 'px';
                                            setReplyData({
                                                ...replyData,
                                                [topic.id]: e.target.value,
                                            });
                                        }}
                                        rows={1}
                                        className="w-full bg-background/50 border-dashed border-border/50 hover:bg-background/80 focus:bg-background focus:border-border/50 focus-visible:ring-0 transition-all rounded-2xl placeholder:text-muted-foreground/50 resize-none min-h-[56px] py-4 px-5 text-sm"
                                    />
                                    <div className={cn(
                                        "absolute right-2 bottom-2 transition-all duration-200",
                                        replyData[topic.id]?.trim() ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
                                    )}>
                                        <Button
                                            size="icon"
                                            className="h-10 w-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
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
