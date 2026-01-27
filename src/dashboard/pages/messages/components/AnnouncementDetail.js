import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    FiArrowLeft,
    FiChevronUp,
    FiMessageSquare,
    FiSend,
    FiBarChart2,
    FiBell,
    FiEdit,
    FiTrash2,
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../../../../contexts/NotificationContext';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import LoadingSpinner from '../../../../components/LoadingSpinner/LoadingSpinner';
import { cn } from '../../../../utils/cn';
import { useDashboard } from '../../../contexts/DashboardContext';
import { buildDashboardUrl, getWorkspaceIdForUrl } from '../../../utils/pathUtils';

function buildReplyTree(messages) {
    if (!messages || messages.length === 0) return [];

    const messageMap = new Map();
    const roots = [];

    messages.forEach(m => {
        messageMap.set(m.id, { ...m, replies: [] });
    });

    messages.forEach(m => {
        const node = messageMap.get(m.id);
        if (m.parentId && messageMap.has(m.parentId)) {
            const parent = messageMap.get(m.parentId);
            parent.replies = parent.replies || [];
            parent.replies.push(node);
        } else {
            roots.push(node);
        }
    });

    return roots;
}

export const AnnouncementDetail = ({ threadId, onBack }) => {
    const { user, selectedWorkspace } = useDashboard();
    const { showError, showSuccess } = useNotification();
    const navigate = useNavigate();
    const workspaceId = getWorkspaceIdForUrl(selectedWorkspace);

    const [thread, setThread] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [replying, setReplying] = useState(null);
    const [replyData, setReplyData] = useState({});
    const [pollVotes, setPollVotes] = useState({});
    const [showPollResults, setShowPollResults] = useState(false);
    const replyInputRef = useRef(null);
    const messagesListener = useRef(null);

    const loadThread = useCallback(async () => {
        try {
            setLoading(true);
            const threadDocRef = doc(db, 'threads', threadId);
            const threadDoc = await getDoc(threadDocRef);
            
            if (!threadDoc.exists()) {
                showError('Thread not found');
                onBack();
                return;
            }

            const threadData = threadDoc.data();
            const participantInfo = threadData.participantInfo || [];
            
            const threadObj = {
                id: threadDoc.id,
                ...threadData,
                user_username: participantInfo[0]?.displayName || 'Anonymous',
                user_email: participantInfo[0]?.email || '',
                title: threadData.title || 'Untitled Announcement',
                content: threadData.description || '',
                created_at: threadData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
                poll: threadData.poll || null
            };
            
            setThread(threadObj);
            setShowPollResults(false);
            
            if (threadData.poll && user) {
                const userVote = threadData.poll.options?.find(opt => 
                    opt.voters?.includes(user.uid)
                );
                if (userVote) {
                    setPollVotes({ [threadDoc.id]: userVote.text });
                }
            }

            const messagesRef = collection(db, 'threads', threadId, 'messages');
            const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));

            if (messagesListener.current) messagesListener.current();

            messagesListener.current = onSnapshot(
                messagesQuery,
                (snapshot) => {
                    const messagesList = [];
                    snapshot.docs.forEach(doc => {
                        const messageData = doc.data();
                        const sender = participantInfo.find(p => p.userId === messageData.senderId);
                        messagesList.push({
                            id: doc.id,
                            ...messageData,
                            user_username: sender?.displayName || 'Anonymous',
                            user_email: sender?.email || '',
                            created_at: messageData.timestamp?.toDate?.()?.toISOString() || new Date().toISOString(),
                            content: messageData.text || '',
                            upvotes: messageData.upvotes || 0,
                            upvoters: messageData.upvoters || [],
                            parentId: messageData.parentId || null
                        });
                    });
                    setMessages(messagesList);
                    setLoading(false);
                },
                (err) => {
                    console.error('Error loading messages:', err);
                    showError('Failed to load messages');
                    setLoading(false);
                }
            );
        } catch (error) {
            console.error('Error loading thread:', error);
            showError('Failed to load thread');
            onBack();
        }
    }, [threadId, showError, onBack, user]);

    useEffect(() => {
        if (threadId) {
            loadThread();
        }
        return () => {
            if (messagesListener.current) messagesListener.current();
        };
    }, [threadId, loadThread]);

    const handleReply = async (parentId = null) => {
        if (!thread || !user) return;
        const key = parentId || thread.id;
        const content = replyData[key]?.trim();

        if (!content) {
            showError('Please enter a message');
            return;
        }

        try {
            setReplying(key);
            await addDoc(collection(db, 'threads', threadId, 'messages'), {
                text: content,
                senderId: user.uid,
                timestamp: serverTimestamp(),
                parentId: parentId || null,
                upvotes: 0,
                upvoters: []
            });

            await updateDoc(doc(db, 'threads', threadId), {
                lastMessage: {
                    text: content,
                    senderId: user.uid,
                    timestamp: serverTimestamp()
                },
                lastMessageTimestamp: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            showSuccess('Message sent');
            setReplyData(prev => ({ ...prev, [key]: '' }));
        } catch (error) {
            showError(error.message || 'Failed to send message');
        } finally {
            setReplying(null);
        }
    };

    const handleUpvote = async (messageId) => {
        if (!user || !threadId) return;

        try {
            const messageRef = doc(db, 'threads', threadId, 'messages', messageId);
            const messageDoc = await getDoc(messageRef);
            
            if (!messageDoc.exists()) {
                showError('Message not found');
                return;
            }

            const messageData = messageDoc.data();
            const currentUpvoters = messageData.upvoters || [];
            const currentUpvotes = messageData.upvotes || 0;
            const hasUpvoted = currentUpvoters.includes(user.uid);

            if (hasUpvoted) {
                await updateDoc(messageRef, {
                    upvotes: Math.max(0, currentUpvotes - 1),
                    upvoters: arrayRemove(user.uid)
                });
            } else {
                await updateDoc(messageRef, {
                    upvotes: currentUpvotes + 1,
                    upvoters: arrayUnion(user.uid)
                });
            }
        } catch (error) {
            console.error('Error upvoting message:', error);
            showError('Failed to upvote message');
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

    const renderReplies = (replies, level = 0, isLast = false) => {
        return (
            <>
                {replies.map((reply, index) => {
                    const isLastReply = index === replies.length - 1;
                    const hasReplies = reply.replies && reply.replies.length > 0;
                    const isUpvoted = reply.upvoters?.includes(user?.uid) || false;
                    const upvoteCount = reply.upvotes || 0;
                    
                    return (
                        <div key={reply.id} className={cn("relative", level > 0 && "ml-8")}>
                            {level > 0 && (
                                <>
                                    <div className="absolute -left-8 top-0 w-px bg-border/60" style={{ height: '20px' }} />
                                    <div className="absolute -left-8 top-5 w-8 h-px bg-border/60" />
                                    {(!isLastReply || hasReplies) && (
                                        <div className="absolute -left-8 top-5 bottom-0 w-px bg-border/60" />
                                    )}
                                </>
                            )}

                            <div className="flex gap-4 bg-white rounded-lg p-4">
                                <div className="w-10 h-10 rounded-full bg-secondary/80 border border-white/5 flex items-center justify-center font-bold text-sm text-foreground shadow-sm flex-shrink-0">
                                    {(reply.user_username || reply.user_email || 'A').charAt(0).toUpperCase()}
                                </div>

                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-sm text-foreground">
                                            {reply.user_username || reply.user_email || 'Anonymous'}
                                        </span>
                                        <span className="text-muted-foreground/30 text-xs">•</span>
                                        <span className="text-xs text-muted-foreground">
                                            {formatDate(reply.created_at)}
                                        </span>
                                    </div>

                                    <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                                        {reply.content}
                                    </div>

                                    <div className="flex items-center justify-between pt-1">
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleUpvote(reply.id); }}
                                                className={cn(
                                                    "flex items-center gap-1.5 text-xs transition-colors p-1 rounded-md hover:bg-muted",
                                                    isUpvoted ? "text-primary" : "text-muted-foreground hover:text-foreground"
                                                )}
                                            >
                                                <FiChevronUp className={cn("w-3.5 h-3.5", isUpvoted && "fill-current")} />
                                                <span>{upvoteCount}</span>
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setReplying(reply.id); }}
                                                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
                                            >
                                                <FiMessageSquare className="w-3.5 h-3.5" />
                                                Reply
                                            </button>
                                        </div>
                                        {user && reply.senderId === user.uid && (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // TODO: Implement edit functionality
                                                    }}
                                                    className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                                                    title="Edit"
                                                >
                                                    <FiEdit className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (window.confirm('Are you sure you want to delete this reply?')) {
                                                            // TODO: Implement delete functionality
                                                        }
                                                    }}
                                                    className="p-1 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                                    title="Delete"
                                                >
                                                    <FiTrash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {replying === reply.id && (
                                        <div className="mt-4 animate-in fade-in slide-in-from-top-2 relative">
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
                                                className="w-full bg-white border border-input hover:bg-white focus:bg-white focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all rounded-xl placeholder:text-muted-foreground/50 resize-none min-h-[60px] py-3 pr-12 text-sm px-4"
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
                                    )}

                                    {hasReplies && (
                                        <div className="pt-4 mt-4">
                                            {renderReplies(reply.replies, level + 1, isLastReply)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </>
        );
    };

    if (loading) return <LoadingSpinner />;
    if (!thread) return null;

    const nestedReplies = buildReplyTree(messages);

    return (
        <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500">
            <div className="shrink-0 py-4 border-b border-border bg-card/30">
                <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8">
                    <h1 className="text-xl font-semibold text-foreground mb-3">
                        Communications
                    </h1>
                    <div className="flex gap-1 sm:gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-1">
                        <button
                            onClick={() => navigate(buildDashboardUrl('/communications/messages', workspaceId))}
                            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
                        >
                            <FiMessageSquare className="w-4 h-4 shrink-0" />
                            <span className="text-xs sm:text-sm min-w-0">Messages</span>
                        </button>
                        <button
                            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 border-primary text-primary bg-primary/5"
                        >
                            <FiBell className="w-4 h-4 shrink-0" />
                            <span className="text-xs sm:text-sm min-w-0">Announcements</span>
                        </button>
                    </div>
                </div>
            </div>
            <div className="shrink-0 border-b border-border bg-background/80 backdrop-blur-xl">
                <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 py-3">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <FiArrowLeft className="w-4 h-4" />
                        <span>Back to Announcements</span>
                    </button>
                </div>
            </div>
        <div className="flex-1 overflow-auto bg-background">
            <main className="w-full max-w-[1400px] mx-auto p-4 md:p-8 space-y-8 flex-1 overflow-auto">
                <div className="bg-card rounded-xl p-6 border border-border hover:shadow-md transition-all duration-300">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-lg font-bold">
                                {(thread.user_username || thread.user_email || 'A').charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-foreground">
                                        {thread.user_username || thread.user_email || 'Anonymous'}
                                    </span>
                                    <span className="text-muted-foreground/30">•</span>
                                    <span className="text-sm text-muted-foreground">
                                        {formatDate(thread.created_at)}
                                    </span>
                                </div>
                            </div>
                        </div>
                        {user && thread.createdBy === user.uid && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        // TODO: Implement edit functionality
                                    }}
                                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                                    title="Edit"
                                >
                                    <FiEdit className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm('Are you sure you want to delete this announcement?')) {
                                            // TODO: Implement delete functionality
                                        }
                                    }}
                                    className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete"
                                >
                                    <FiTrash2 className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    <h1 className="text-2xl md:text-3xl font-bold mb-4 text-foreground leading-tight">
                        {thread.title}
                    </h1>

                    <div className="prose prose-invert max-w-none mb-6">
                        <p className="text-base text-foreground/80 leading-relaxed whitespace-pre-wrap">
                            {thread.content}
                        </p>
                    </div>

                    {thread.poll && (() => {
                        const canSeeResults = thread.poll.showResultsToEveryone || (user && thread.createdBy === user.uid);
                        const totalVotes = thread.poll.options?.reduce((sum, opt) => sum + (opt.votes || 0), 0) || 0;
                        
                        return (
                            <div className="mt-6 pt-6 border-t border-border">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <FiBarChart2 className="w-5 h-5 text-primary" />
                                        <h3 className="text-lg font-semibold text-foreground">{thread.poll.question}</h3>
                                    </div>
                                    {canSeeResults && (
                                        <button
                                            onClick={() => setShowPollResults(!showPollResults)}
                                            className="flex items-center gap-2 px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                        >
                                            <FiBarChart2 className="w-4 h-4" />
                                            {showPollResults ? 'Hide Results' : 'Show Results'}
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-3">
                                    {thread.poll.options?.map((option, index) => {
                                        const percentage = totalVotes > 0 ? ((option.votes || 0) / totalVotes) * 100 : 0;
                                        const isVoted = pollVotes[thread.id] === option.text;
                                        const hasVoted = !!pollVotes[thread.id];
                                        
                                        return (
                                            <button
                                                key={index}
                                                onClick={async () => {
                                                    if (hasVoted && !isVoted) return;
                                                    if (!user) {
                                                        showError('Please log in to vote');
                                                        return;
                                                    }
                                                    
                                                    try {
                                                        const threadRef = doc(db, 'threads', thread.id);
                                                        const currentPoll = thread.poll;
                                                        const updatedOptions = [...currentPoll.options];
                                                        const optionIndex = updatedOptions.findIndex(opt => opt.text === option.text);
                                                        
                                                        if (isVoted) {
                                                            updatedOptions[optionIndex] = {
                                                                ...updatedOptions[optionIndex],
                                                                votes: Math.max(0, (updatedOptions[optionIndex].votes || 0) - 1),
                                                                voters: (updatedOptions[optionIndex].voters || []).filter(v => v !== user.uid)
                                                            };
                                                            setPollVotes(prev => {
                                                                const newVotes = { ...prev };
                                                                delete newVotes[thread.id];
                                                                return newVotes;
                                                            });
                                                        } else {
                                                            const previousVoteIndex = updatedOptions.findIndex(opt => 
                                                                (opt.voters || []).includes(user.uid)
                                                            );
                                                            
                                                            if (previousVoteIndex >= 0) {
                                                                updatedOptions[previousVoteIndex] = {
                                                                    ...updatedOptions[previousVoteIndex],
                                                                    votes: Math.max(0, (updatedOptions[previousVoteIndex].votes || 0) - 1),
                                                                    voters: (updatedOptions[previousVoteIndex].voters || []).filter(v => v !== user.uid)
                                                                };
                                                            }
                                                            
                                                            updatedOptions[optionIndex] = {
                                                                ...updatedOptions[optionIndex],
                                                                votes: (updatedOptions[optionIndex].votes || 0) + 1,
                                                                voters: [...(updatedOptions[optionIndex].voters || []), user.uid]
                                                            };
                                                            setPollVotes(prev => ({ ...prev, [thread.id]: option.text }));
                                                        }
                                                        
                                                        await updateDoc(threadRef, {
                                                            poll: {
                                                                ...currentPoll,
                                                                options: updatedOptions
                                                            }
                                                        });
                                                        
                                                        await loadThread();
                                                    } catch (error) {
                                                        console.error('Error voting:', error);
                                                        showError('Failed to vote');
                                                    }
                                                }}
                                                disabled={hasVoted && !isVoted}
                                                className={cn(
                                                    "w-full text-left p-4 rounded-xl border-2 transition-all",
                                                    isVoted 
                                                        ? "border-primary bg-primary/10" 
                                                        : "border-border hover:border-primary/50 bg-card",
                                                    hasVoted && !isVoted && "opacity-50 cursor-not-allowed"
                                                )}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-medium text-foreground">{option.text}</span>
                                                    {canSeeResults && showPollResults && (
                                                        <span className="text-sm text-muted-foreground">
                                                            {option.votes || 0} {option.votes === 1 ? 'vote' : 'votes'}
                                                        </span>
                                                    )}
                                                </div>
                                                {canSeeResults && showPollResults && (
                                                    <>
                                                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                                            <div 
                                                                className={cn(
                                                                    "h-full transition-all duration-300",
                                                                    isVoted ? "bg-primary" : "bg-primary/50"
                                                                )}
                                                                style={{ width: `${percentage}%` }}
                                                            />
                                                        </div>
                                                        {percentage > 0 && (
                                                            <span className="text-xs text-muted-foreground mt-1 block">
                                                                {percentage.toFixed(1)}%
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                                {canSeeResults && showPollResults && (
                                    <p className="text-xs text-muted-foreground mt-4">
                                        {totalVotes} total {totalVotes === 1 ? 'vote' : 'votes'}
                                    </p>
                                )}
                            </div>
                        );
                    })()}
                </div>

                <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
                    <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        Discussion
                        <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            {messages.length || 0}
                        </span>
                    </h2>

                    <div className="flex gap-4 mb-8">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-sm text-primary flex-shrink-0">
                            {(user?.username || user?.email || 'M').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 relative">
                            <textarea
                                ref={replyInputRef}
                                placeholder="Add to the discussion..."
                                value={replyData[thread.id] || ''}
                                onChange={e => {
                                    e.target.style.height = 'auto';
                                    e.target.style.height = e.target.scrollHeight + 'px';
                                    setReplyData(prev => ({ ...prev, [thread.id]: e.target.value }));
                                }}
                                rows={1}
                                className="w-full bg-white border border-input hover:bg-white focus:bg-white focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all rounded-xl placeholder:text-muted-foreground/50 resize-none min-h-[56px] py-4 px-5 text-sm outline-none"
                                style={{ fontFamily: 'var(--font-family-text)' }}
                            />
                            <div className={cn(
                                "absolute right-2 bottom-2 transition-all duration-200",
                                replyData[thread.id]?.trim() ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
                            )}>
                                <button
                                    className="h-9 w-9 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center shadow-md transition-colors"
                                    onClick={() => handleReply()}
                                    disabled={replying === thread.id}
                                >
                                    <FiSend className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-border/50 pt-6">
                        {nestedReplies.length > 0 ? (
                            <div className="space-y-6">
                                {renderReplies(nestedReplies)}
                            </div>
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
        </div>
    );
};

