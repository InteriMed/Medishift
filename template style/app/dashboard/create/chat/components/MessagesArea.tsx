'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import type {
  WorkflowContext,
  NodeDefinition,
  StreamingMessage,
} from '@/types/workflow';
import { Loader2 } from 'lucide-react';
import { useTaskStreaming } from '@/hooks/chatbot/useTaskStreaming';
import {
  CardSelectorOverlay,
  type CardOption,
} from '@/components/ui/card-selector-overlay';
import type { ProjectType } from '../WorkflowUI';
import { MessageItem } from './MessageItem';
import { LoadingIndicator } from './LoadingIndicator';
import { RawDataDialog } from './RawDataDialog';
import { useAgentStateManager } from '@/hooks/workflows/useAgentStateManager';
import { getLoadingMessage } from './loadingMessageUtils';

interface ContextLayers {
  action_state?: {
    tool_name?: string;
    description?: string;
    action_id?: string;
  } | null;
  subcontext_state?: {
    matches?: Array<{
      tool_name?: string;
      description?: string;
      action_id?: string;
    }>;
    certainty?: number;
  } | null;
  context_state?: {
    page?: string;
    [key: string]: any;
  } | null;
}

interface MessagesAreaProps {
  context: WorkflowContext;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  editingMessageId: string | null;
  setEditingMessageId: (id: string | null) => void;
  editingContent: string;
  setEditingContent: (content: string) => void;
  isThinking: boolean;
  currentNodeData: NodeDefinition | null;
  generatingNodes: Map<string, { name: string; progress?: number }>;
  showProjectTypeCards: boolean;
  setShowProjectTypeCards: (show: boolean) => void;
  selectedProjectType: ProjectType | null;
  onProjectTypeCardSelect: (card: CardOption) => void;
  projectTypeCards: CardOption[];
  handleAgentFeedback?: (
    feedback: string,
    sessionId: string,
    generatorKey: string,
    metadata: any,
    flowStep: any
  ) => Promise<void>;
  isSending?: boolean;
  streamingMessages?: Map<string, StreamingMessage>;
  setStreamingMessages?: React.Dispatch<
    React.SetStateAction<Map<string, StreamingMessage>>
  >;
  workflowContext?: ContextLayers | null;
}

export function MessagesArea({
  context,
  messagesEndRef,
  editingMessageId,
  setEditingMessageId,
  editingContent,
  setEditingContent,
  isThinking,
  currentNodeData,
  generatingNodes,
  showProjectTypeCards,
  setShowProjectTypeCards,
  selectedProjectType,
  onProjectTypeCardSelect,
  projectTypeCards,
  handleAgentFeedback,
  isSending = false,
  streamingMessages: parentStreamingMessages,
  setStreamingMessages: parentSetStreamingMessages,
  workflowContext,
}: MessagesAreaProps) {
  const [showRawDataDialog, setShowRawDataDialog] = useState(false);
  const [rawData, setRawData] = useState<{
    input?: string;
    raw_output?: string;
    iteration?: number;
    data?: any;
  } | null>(null);
  const lastProjectIdRef = useRef<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isScrollbarVisible, setIsScrollbarVisible] = useState(false);
  const [actionDisplayCache, setActionDisplayCache] = useState<Record<string, string>>({});

  const chatId = useMemo(() => {
    return context.chatSessionId || undefined;
  }, [context.chatSessionId]);

  const agentStateManager = useAgentStateManager();

  // Use streaming state from props if provided, otherwise use useTaskStreaming hook
  const streamingHookResult = useTaskStreaming({
    chat_id: chatId,
    enabled: !!chatId && !parentStreamingMessages, // Only enable if no parent streaming state
    context,
    agentStateManager,
  });

  const streamingMessagesFromHook =
    parentStreamingMessages || streamingHookResult.streamingMessages;
  const setStreamingMessagesFromHook =
    parentSetStreamingMessages || streamingHookResult.setStreamingMessages;
  const streamingUpdateKey = streamingHookResult.streamingUpdateKey;
  const streamingMessagesRef = streamingHookResult.streamingMessagesRef;
  const taskIdToMessageIdRef = streamingHookResult.taskIdToMessageIdRef;
  const stableAgentMessageIdRef = streamingHookResult.stableAgentMessageIdRef;
  const lastRenderedContentRef = streamingHookResult.lastRenderedContentRef;
  const initializeStableMessageId =
    streamingHookResult.initializeStableMessageId;

  const previousHookMessagesRef = useRef<Map<string, StreamingMessage>>(
    new Map()
  );

  useEffect(() => {
    if (parentStreamingMessages && parentSetStreamingMessages) {
      const hookMessages = streamingHookResult.streamingMessages;
      const previousHookMessages = previousHookMessagesRef.current;

      if (hookMessages !== previousHookMessages) {
        const hasDifferences =
          hookMessages.size !== previousHookMessages.size ||
          Array.from(hookMessages.keys()).some(key => {
            const hookMsg = hookMessages.get(key);
            const prevMsg = previousHookMessages.get(key);
            return (
              hookMsg?.content !== prevMsg?.content ||
              hookMsg?.isFrontendStreamingComplete !==
                prevMsg?.isFrontendStreamingComplete ||
              hookMsg?.isBackendStreamingComplete !==
                prevMsg?.isBackendStreamingComplete
            );
          });

        if (hasDifferences) {
          previousHookMessagesRef.current = new Map(hookMessages);
          parentSetStreamingMessages(new Map(hookMessages));
        }
      }
    }
  }, [streamingHookResult.streamingMessages, parentSetStreamingMessages]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).lastRenderedContentRef = lastRenderedContentRef.current;
    }
  }, [lastRenderedContentRef]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const showScrollbar = () => {
      setIsScrollbarVisible(true);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrollbarVisible(false);
      }, 1000);
    };

    const handleScroll = () => {
      showScrollbar();
    };

    const handleMouseEnter = () => {
      setIsScrollbarVisible(true);
    };

    const handleMouseLeave = () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrollbarVisible(false);
      }, 1000);
    };

    container.addEventListener('scroll', handleScroll);
    container.addEventListener('wheel', handleScroll);
    container.addEventListener('touchmove', handleScroll);
    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('wheel', handleScroll);
      container.removeEventListener('touchmove', handleScroll);
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (context.projectId) {
      initializeStableMessageId(context.projectId);
    }
  }, [context.projectId, initializeStableMessageId]);

  useEffect(() => {
    if (workflowContext?.action_state?.action_id) {
      const actionId = workflowContext.action_state.action_id;
      if (!actionDisplayCache[actionId]) {
        fetch(`/api/chat/actions/${actionId}/spec`)
          .then(res => res.ok ? res.json() : null)
          .then(spec => {
            if (spec?.context_display) {
              setActionDisplayCache(prev => ({ ...prev, [actionId]: spec.context_display }));
            }
          })
          .catch(() => {});
      }
    }
    if (workflowContext?.subcontext_state?.matches?.[0]?.tool_name) {
      const match = workflowContext.subcontext_state.matches[0];
      const actionId = match.action_id || match.tool_name;
      if (actionId && !actionDisplayCache[actionId]) {
        fetch(`/api/chat/actions/${actionId}/spec`)
          .then(res => res.ok ? res.json() : null)
          .then(spec => {
            if (spec?.context_display) {
              setActionDisplayCache(prev => ({ ...prev, [actionId]: spec.context_display }));
            }
          })
          .catch(() => {});
      }
    }
  }, [workflowContext, actionDisplayCache]);

  const isTestMode = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return (
      process.env.NEXT_PUBLIC_TEST_MODE === 'true' ||
      localStorage.getItem('test_mode') === 'true'
    );
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [context.messages, messagesEndRef, streamingUpdateKey]);

  const sortedMessages = useMemo(() => {
    const sorted = [...context.messages]
      .sort((a, b) => {
        return (
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      })
      .filter(msg => {
        const streamingData = streamingMessagesFromHook.get(msg.id);

        if (msg.role === 'user') {
          return true;
        }

        if (msg.role === 'assistant') {
          const rawContent = msg.content || '';
          const hasContent = rawContent.trim() !== '';
          const hasStreamingData = streamingData !== undefined;
          const isBackendStreaming =
            streamingData && !streamingData.isBackendStreamingComplete;
          const hasFiles =
            msg.files &&
            (msg.files.images?.length > 0 || msg.files.audio?.length > 0);
          const isStreaming =
            streamingData && !streamingData.isFrontendStreamingComplete;

          // Show message if:
          // 1. Has content (from backend, already parsed)
          // 2. Has files
          // 3. Backend is streaming (even if empty - show loading animation)
          // 4. Has agent data
          if (hasContent || hasFiles || isBackendStreaming || msg.agent) {
            return true;
          }

          // Don't show empty message boxes
          return false;
        }

        if (msg.agent) {
          return true;
        }

        const rawContent = msg.content || '';
        if (rawContent.trim() !== '') {
          return true;
        }

        if (
          msg.files &&
          (msg.files.images?.length > 0 || msg.files.audio?.length > 0)
        ) {
          return true;
        }

        return false;
      });

    const expanded: typeof sorted = [];

    sorted.forEach(message => {
      const hasImages =
        message.files?.images && message.files.images.length > 0;
      const hasText = message.content && message.content.trim() !== '';
      const streamingData = streamingMessagesFromHook.get(message.id);
      const displayContent = streamingData?.content ?? message.content;
      const hasDisplayText = displayContent && displayContent.trim() !== '';

      if (hasImages && !message.waveform) {
        message.files!.images!.forEach((img, idx) => {
          expanded.push({
            ...message,
            id: `${message.id}-image-${idx}`,
            content: '',
            files: {
              ...message.files,
              images: [img],
              audio: [],
            },
          });
        });

        if (hasDisplayText) {
          expanded.push({
            ...message,
            id: `${message.id}-text`,
            files: {
              ...message.files,
              images: [],
              audio: message.files?.audio || [],
            },
          });
        } else if (message.files?.audio && message.files.audio.length > 0) {
          expanded.push({
            ...message,
            id: `${message.id}-audio`,
            content: '',
            files: {
              ...message.files,
              images: [],
              audio: message.files.audio,
            },
          });
        }
      } else {
        expanded.push(message);
      }
    });

    return expanded;
  }, [context.messages, streamingMessagesFromHook]);

  const shouldShowLoading = useMemo(() => {
    const lastMessage = sortedMessages[sortedMessages.length - 1];
    const lastMessageIsUser = lastMessage?.role === 'user';

    if (lastMessageIsUser && (isSending || context.isGenerating)) {
      return true;
    }

    const hasStreamingAgentWithoutContent = [...context.messages].some(msg => {
      const streamingData = streamingMessagesFromHook.get(msg.id);
      return (
        msg.role === 'assistant' &&
        msg.agent &&
        streamingData &&
        !streamingData.isFrontendStreamingComplete &&
        !streamingData?.content
      );
    });

    const hasWaitingAgentFeedback = [...context.messages].some(
      (msg: any) =>
        msg.role === 'assistant' && msg.agentFeedback?.waiting === true
    );

    return (
      hasStreamingAgentWithoutContent ||
      (hasWaitingAgentFeedback && (isThinking || lastMessageIsUser))
    );
  }, [
    context.messages,
    sortedMessages,
    streamingMessagesFromHook,
    isThinking,
    isSending,
    context.isGenerating,
  ]);

  const lastAssistantMessage = useMemo(() => {
    return context.messages
      .slice()
      .reverse()
      .find(m => m.role === 'assistant');
  }, [context.messages]);

  const lastAssistantStreamingData = lastAssistantMessage
    ? streamingMessagesFromHook.get(lastAssistantMessage.id)
    : null;

  const hasBackendStreaming = useMemo(() => {
    if (!lastAssistantMessage) return false;
    if (!lastAssistantStreamingData) return false;
    return !lastAssistantStreamingData.isBackendStreamingComplete;
  }, [
    lastAssistantMessage,
    lastAssistantStreamingData,
    lastAssistantMessage?.id,
    lastAssistantStreamingData?.isBackendStreamingComplete,
    streamingMessagesFromHook.size,
  ]);


  return (
    <div
      ref={scrollContainerRef}
      className={`flex-1 overflow-y-auto scrollbar-fade-right ${!isScrollbarVisible ? 'scrollbar-hidden' : ''}`}
    >
      <div className="max-w-[1000px] mx-auto px-4 py-6 space-y-6">
        {sortedMessages.map(message => {
          let originalMessageId = message.id;
          if (message.id.endsWith('-text') || message.id.endsWith('-audio')) {
            originalMessageId = message.id.slice(0, -5);
          } else if (message.id.includes('-image-')) {
            originalMessageId = message.id.substring(
              0,
              message.id.lastIndexOf('-image-')
            );
          }
          const streamingData =
            streamingMessagesFromHook.get(originalMessageId);
          const isStreaming = streamingData
            ? !streamingData.isFrontendStreamingComplete
            : false;
          const isBackendStreaming = streamingData
            ? !streamingData.isBackendStreamingComplete
            : false;

          // Use backend message content as source of truth
          const backendContent = message.content || '';
          const hasBackendContent = backendContent.trim().length > 0;

          // Check if message was recently created (within last 10 seconds) and is empty
          const messageAge = message.timestamp
            ? Date.now() - new Date(message.timestamp).getTime()
            : Infinity;
          const isRecentlyCreated = messageAge < 10000;

          // Show loading animation if:
          // 1. Message is assistant role
          // 2. No content yet (empty or just whitespace)
          // 3. Backend is still streaming OR message was recently created and has streaming data (tokens might arrive soon)
          const hasStreamingData = streamingData !== undefined;
          const shouldShowLoading =
            message.role === 'assistant' &&
            !hasBackendContent &&
            (isBackendStreaming ||
              (isRecentlyCreated && hasStreamingData && !hasBackendContent));

          // Don't render empty message boxes - show loading instead
          if (
            message.role === 'assistant' &&
            !hasBackendContent &&
            !isBackendStreaming &&
            !message.files &&
            !message.agent
          ) {
            return null;
          }

          return (
            <MessageItem
              key={message.id}
              message={message}
              isStreaming={isStreaming || isBackendStreaming}
              streamingContent={backendContent}
              isBackendStreaming={isBackendStreaming}
              shouldShowLoading={shouldShowLoading}
              isTestMode={isTestMode}
              projectId={context.projectId}
              onRawDataClick={rawData => {
                setRawData(rawData);
                setShowRawDataDialog(true);
              }}
              lastRenderedRef={lastRenderedContentRef}
              onQuickOptionSelect={(option) => {
                if (context.sendAgentMessage) {
                  const messageText = option.action_type 
                    ? `${option.label} (${option.action_type})`
                    : option.value === 'yes' 
                      ? 'Yes'
                      : option.value === 'no'
                        ? 'No'
                        : option.value === 'confirm'
                          ? 'Confirm'
                          : option.value === 'cancel'
                            ? 'Cancel'
                            : option.label;
                  
                  context.sendAgentMessage(messageText, undefined, {
                    process_llm: true,
                    execute_actions: !!option.action_type,
                    action_hint: option.action_type || null,
                  }).catch(console.error);
                }
              }}
            />
          );
        })}

        {((isSending || isThinking || context.isGenerating) &&
          (sortedMessages.length === 0 || 
           sortedMessages.length === 1 ||
           (sortedMessages.length > 0 && sortedMessages[sortedMessages.length - 1]?.role === 'user') ||
           (context.messages.length > 0 && context.messages[context.messages.length - 1]?.role === 'user') ||
           context.messages.length === 0)) && (
            <LoadingIndicator
              message={getLoadingMessage({
                isThinking,
                isSending,
                generatingNodes,
                workflowContext,
                actionDisplayCache,
                isFirstMessage: sortedMessages.length === 0 ||
                                 context.messages.length === 0 ||
                                 sortedMessages.length === 1 ||
                                 (sortedMessages.length === 1 && sortedMessages[0]?.role === 'user') ||
                                 (context.messages.length === 1 && context.messages[0]?.role === 'user'),
              })}
            />
          )}

        {hasBackendStreaming && (
          <div className="flex items-center justify-center py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>
                {getLoadingMessage({
                  isThinking,
                  isSending,
                  generatingNodes,
                  workflowContext,
                  actionDisplayCache,
                  isFirstMessage: context.messages.length === 0 || sortedMessages.length === 1,
                })}
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <RawDataDialog
        open={showRawDataDialog}
        onOpenChange={setShowRawDataDialog}
        rawData={rawData}
      />

      {showProjectTypeCards && (
        <CardSelectorOverlay
          isOpen={showProjectTypeCards}
          cards={projectTypeCards}
          onSelect={onProjectTypeCardSelect}
          onClose={() => setShowProjectTypeCards(false)}
          maxWidth="max-w-[1200px]"
        />
      )}
    </div>
  );
}
