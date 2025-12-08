'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { WorkflowContext, NodeDefinition } from '@/types/workflow';
import { Button } from '@/components/ui/button';
import {
  ArrowUp,
  Music,
  X,
  Paperclip,
  Sparkles,
  ImageIcon,
  Loader2,
  Video,
  Upload,
} from 'lucide-react';
import { validateFileType } from './FileValidation';
import type { ProjectType } from '../WorkflowUI';
import { useAgentModeState } from '@/hooks/workflows/useAgentModeState';
import { ModelSelector } from './ModelSelector';
import { QualitySelector } from './QualitySelector';
import { FormatSelector } from './FormatSelector';
import { useActionUIConfig } from '@/hooks/useActionUIConfig';
import { getBackendUrl } from '@/lib/config';
import { useToast } from '@/hooks/ui/use-toast';

import type { StreamingMessage } from '@/types/workflow';

interface PromptAreaProps {
  context: WorkflowContext;
  currentNodeData: NodeDefinition | null;
  selectedProjectType: ProjectType | null;
  workflowProcessor: any | null;
  isAIGenerationMode: boolean;
  setIsAIGenerationMode: (mode: boolean) => void;
  setIsFadingOut: (fading: boolean) => void;
  handleGenerate: () => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleAIGeneration: () => void;
  streamingMessages: Map<string, StreamingMessage>;
  onImageUploadPaywallCheck?: () => Promise<boolean>;
  isSending: boolean;
  setIsSending: (sending: boolean) => void;
  promptAreaUIOutputs?: {
    type: string;
    component: string;
    props?: Record<string, any>;
  } | null;
}

export function PromptArea({
  context,
  currentNodeData: propCurrentNodeData,
  selectedProjectType,
  workflowProcessor,
  isAIGenerationMode,
  setIsAIGenerationMode,
  setIsFadingOut,
  handleGenerate,
  handleFileChange,
  handleDrop,
  handleAIGeneration,
  streamingMessages,
  onImageUploadPaywallCheck,
  isSending,
  setIsSending,
  promptAreaUIOutputs,
}: PromptAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputAreaRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDraggingAnywhere, setIsDraggingAnywhere] = useState(false);
  const [hasBlockingGenerators, setHasBlockingGenerators] = useState(false);
  const sendingTimeRef = useRef<number | null>(null);
  const lastMessageCompleteTimeRef = useRef<number | null>(null);
  const isProcessingRef = useRef(false);
  const sentMessageCountRef = useRef<number>(0);
  const startSendingAssistantIdRef = useRef<string | undefined>(undefined);
  const waitingForResponseRef = useRef<boolean>(false);
  // Track object URLs for cleanup
  const objectUrlsRef = useRef<Set<string>>(new Set());

  // Cleanup object URLs on unmount
  useEffect(() => {
    const objectUrls = objectUrlsRef.current;
    return () => {
      objectUrls.forEach(url => {
        URL.revokeObjectURL(url);
      });
      objectUrls.clear();
    };
  }, []);

  const agentModeState = useAgentModeState(context, streamingMessages);
  const { toast } = useToast();
  
  const [actionButtonsVisible, setActionButtonsVisible] = useState(false);
  const [actionButtonsFadingOut, setActionButtonsFadingOut] = useState(false);

  // Extract current action type from messages, prompt text, or persisted UI state
  const currentActionType = useMemo(() => {
    // First, check persisted UI state (from workflow.ui_context)
    if (promptAreaUIOutputs?.props?.action_type) {
      return promptAreaUIOutputs.props.action_type;
    }

    // Second, try to get from latest message's actions (if available)
    const latestMessage = context.messages[context.messages.length - 1];
    if (latestMessage && (latestMessage as any).actions) {
      const actions = (latestMessage as any).actions as Array<{
        action_type: string;
        action_status: string;
      }>;
      const pendingOrProcessingAction = actions.find(
        a => a.action_status === 'pending' || a.action_status === 'processing'
      );
      if (pendingOrProcessingAction) {
        return pendingOrProcessingAction.action_type;
      }
      
      // Also check for completed actions
      const completedAction = actions.find(
        a => a.action_status === 'completed'
      );
      if (completedAction) {
        return completedAction.action_type;
      }
    }

    // Third, try proactive detection from current prompt text
    const promptLower = context.prompt.toLowerCase().trim();
    if (
      promptLower.includes('generate image') ||
      promptLower.includes('create image') ||
      promptLower.includes('make image') ||
      promptLower.includes('draw')
    ) {
      return 'generate_image';
    }
    if (
      promptLower.includes('generate video') ||
      promptLower.includes('create video') ||
      promptLower.includes('make video')
    ) {
      return 'generate_video';
    }
    if (
      promptLower.includes('generate music') ||
      promptLower.includes('create music') ||
      promptLower.includes('make music')
    ) {
      return 'generate_music';
    }
    if (
      promptLower.includes('generate text') ||
      promptLower.includes('create text')
    ) {
      return 'generate_text';
    }

    return undefined;
  }, [context.messages, context.prompt, promptAreaUIOutputs]);

  // Get UI config based on current action (e.g., generate_image, generate_video)
  const actionUIConfig = useActionUIConfig({
    context,
    currentActionType,
  });

  const hasActionButtons = !!(actionUIConfig.model || actionUIConfig.quality || actionUIConfig.format);

  useEffect(() => {
    if (hasActionButtons) {
      setActionButtonsFadingOut(false);
      setActionButtonsVisible(true);
    } else if (actionButtonsVisible) {
      setActionButtonsFadingOut(true);
      const timer = setTimeout(() => {
        setActionButtonsVisible(false);
        setActionButtonsFadingOut(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [hasActionButtons, actionButtonsVisible]);

  const lastAssistantMessage = context.messages
    .slice()
    .reverse()
    .find(m => m.role === 'assistant');

  const streamingMessagesArray = Array.from(streamingMessages.entries());
  const lastAssistantStreamingData = lastAssistantMessage
    ? streamingMessages.get(lastAssistantMessage.id)
    : null;

  const streamingStateKey = lastAssistantStreamingData
    ? `${lastAssistantMessage?.id}-${lastAssistantStreamingData.isFrontendStreamingComplete}-${lastAssistantStreamingData.isBackendStreamingComplete}`
    : `no-streaming-${lastAssistantMessage?.id || 'none'}`;

  const hasActiveFrontendStreaming = useMemo(() => {
    return lastAssistantStreamingData
      ? !lastAssistantStreamingData.isFrontendStreamingComplete
      : false;
  }, [
    lastAssistantStreamingData,
    lastAssistantStreamingData?.isFrontendStreamingComplete,
    lastAssistantMessage?.id,
    streamingMessagesArray.length,
  ]);

  const lastMessage = context.messages[context.messages.length - 1];
  const isAgentWaitingForFeedback = agentModeState.isAgentWaitingForFeedback;

  const isLastMessageStillRendering = useMemo(() => {
    return lastAssistantMessage && lastAssistantStreamingData
      ? !lastAssistantStreamingData.isFrontendStreamingComplete
      : false;
  }, [
    lastAssistantMessage,
    lastAssistantStreamingData,
    lastAssistantMessage?.id,
    lastAssistantStreamingData?.isFrontendStreamingComplete,
    streamingMessagesArray.length,
  ]);


  const shouldDisableInput =
    (hasActiveFrontendStreaming || isLastMessageStillRendering) &&
    !isAgentWaitingForFeedback;

  // Monitor blocking generators (workflow processing)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkBlockingGenerators = () => {
      const blockingGens = (window as any).blockingGenerators;
      setHasBlockingGenerators(blockingGens && blockingGens.size > 0);
    };

    checkBlockingGenerators();
    const interval = setInterval(checkBlockingGenerators, 200);
    return () => clearInterval(interval);
  }, []);

  const currentNodeData = propCurrentNodeData;

  const hasContent =
    context.prompt.trim() ||
    context.uploadedAudio.length > 0 ||
    context.uploadedImages.length > 0 ||
    context.uploadedVideos.length > 0;

  const maxFiles = currentNodeData?.parameters?.maxFiles;
  const currentFileCount =
    context.uploadedImages.length +
    context.uploadedAudio.length +
    context.uploadedVideos.length;
  const isFileLimitReached =
    maxFiles !== undefined && currentFileCount >= maxFiles;
  const isFileInputDisabled = isFileLimitReached; // Only disable if file limit reached

  const getAcceptString = useCallback(() => {
    if (propCurrentNodeData?.parameters?.accept) {
      return propCurrentNodeData.parameters.accept;
    }
    if (propCurrentNodeData?.category) {
      const category = propCurrentNodeData.category.toLowerCase();
      if (category === 'image') return 'image/*';
      if (category === 'audio') return 'audio/*';
      if (category === 'video') return 'video/*';
    }
    return '';
  }, [propCurrentNodeData]);

  const acceptString = getAcceptString();
  const shouldAllowMultiple = maxFiles === undefined || maxFiles > 1;


  useEffect(() => {
    if (isFileInputDisabled) return;

    const handleGlobalDragEnter = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) {
        setIsDraggingAnywhere(true);
      }
    };

    const handleGlobalDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) {
        e.preventDefault();
      }
    };

    const handleGlobalDragLeave = (e: DragEvent) => {
      if (!e.relatedTarget || (e.relatedTarget as Node).nodeName === 'HTML') {
        setIsDraggingAnywhere(false);
      }
    };

    const handleGlobalDrop = () => {
      setIsDraggingAnywhere(false);
    };

    const handleGlobalDragEnd = () => {
      setIsDraggingAnywhere(false);
    };

    document.addEventListener('dragenter', handleGlobalDragEnter);
    document.addEventListener('dragover', handleGlobalDragOver);
    document.addEventListener('dragleave', handleGlobalDragLeave);
    document.addEventListener('drop', handleGlobalDrop);
    document.addEventListener('dragend', handleGlobalDragEnd);

    return () => {
      document.removeEventListener('dragenter', handleGlobalDragEnter);
      document.removeEventListener('dragover', handleGlobalDragOver);
      document.removeEventListener('dragleave', handleGlobalDragLeave);
      document.removeEventListener('drop', handleGlobalDrop);
      document.removeEventListener('dragend', handleGlobalDragEnd);
    };
  }, [isFileInputDisabled]);

  // Simple, direct processing check
  const isProcessing =
    isSending ||
    hasActiveFrontendStreaming ||
    context.isGenerating ||
    hasBlockingGenerators ||
    agentModeState.isAgentProcessing ||
    isLastMessageStillRendering;

  // Update synchronous ref
  isProcessingRef.current = isProcessing;

  // Can only send if we have content (inputs are always enabled)
  const canSendContent = hasContent;

  // Button is disabled if processing OR can't send content
  const isButtonDisabled = isProcessing || !canSendContent;

  // Send function is disabled if processing
  const isSendFunctionDisabled = isProcessing;

  // Show loading when processing
  const showLoading = isProcessing;

  // Reset sending state when messages are cleared or when there are no messages and not generating
  useEffect(() => {
    if (context.messages.length === 0 && !context.isGenerating && isSending) {
      setIsSending(false);
      isProcessingRef.current = false;
      sendingTimeRef.current = null;
      waitingForResponseRef.current = false;
    }
  }, [context.messages.length, context.isGenerating, isSending, setIsSending]);

  useEffect(() => {
    if (!isSending) {
      sendingTimeRef.current = null;
      lastMessageCompleteTimeRef.current = null;
      waitingForResponseRef.current = false;
      return;
    }

    if (sendingTimeRef.current === null) {
      sendingTimeRef.current = Date.now();
      sentMessageCountRef.current = context.messages.filter(
        m => m.role === 'assistant'
      ).length;
      waitingForResponseRef.current = true;
    }

    const assistantMessages = context.messages.filter(
      m => m.role === 'assistant'
    );
    const latestAssistantMessage =
      assistantMessages[assistantMessages.length - 1];
    const streamingData = latestAssistantMessage
      ? streamingMessages.get(latestAssistantMessage.id)
      : null;

    // Check if we have a new assistant message by comparing IDs
    // If startSendingAssistantIdRef is undefined, any assistant message is considered "new" (or we just started)
    // But we only care if the ID is DIFFERENT from what it was when we started sending.
    const currentLastAssistantId = latestAssistantMessage?.id;
    const hasNewAssistantMessage =
      currentLastAssistantId !== startSendingAssistantIdRef.current;

    // Check if the latest message is complete (backend streaming done)
    // If streamingData is missing but we have a message, assume it's complete (non-streaming response)
    // unless context is explicitly generating.
    const isLatestMessageComplete = streamingData
      ? streamingData.isBackendStreamingComplete === true
      : !context.isGenerating;

    // If there's no assistant message and we're not generating, reset sending state
    if (!latestAssistantMessage && !context.isGenerating) {
      const timeSinceSending = Date.now() - (sendingTimeRef.current || 0);
      if (timeSinceSending > 2000) {
        setIsSending(false);
        isProcessingRef.current = false;
        sendingTimeRef.current = null;
        waitingForResponseRef.current = false;
        return;
      }
    }

    if (hasNewAssistantMessage && isLatestMessageComplete) {
      setIsSending(false);
      isProcessingRef.current = false;
      sendingTimeRef.current = null;
      waitingForResponseRef.current = false;
      return;
    }

    const timeSinceSending = Date.now() - (sendingTimeRef.current || 0);

    if (isLatestMessageComplete && timeSinceSending > 5000) {
      setIsSending(false);
      isProcessingRef.current = false;
      sendingTimeRef.current = null;
      waitingForResponseRef.current = false;
      return;
    }

    if (timeSinceSending > 60000) {
      // Timeout after 60 seconds
      console.warn('[PromptArea] Sending timed out after 60 seconds.');
      setIsSending(false);
      isProcessingRef.current = false;
      sendingTimeRef.current = null;
      waitingForResponseRef.current = false;
    }
  }, [
    isSending,
    context.messages,
    context.isGenerating,
    streamingMessages,
    setIsSending,
  ]);

  useEffect(() => {
    if (textareaRef.current) {
      const lineHeight = 24;
      const padding = 28;
      const minHeight = lineHeight + padding;

      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 400;
      textareaRef.current.style.height = `${Math.max(minHeight, Math.min(scrollHeight, maxHeight))}px`;
      textareaRef.current.style.overflowY =
        scrollHeight > maxHeight ? 'auto' : 'hidden';
    }
  }, [context.prompt]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();

      if (isSendFunctionDisabled || isProcessingRef.current || isSending) {
        return;
      }

      isProcessingRef.current = true;
      startSendingAssistantIdRef.current = lastAssistantMessage?.id;
      setIsSending(true);

      handleGenerate();
    }
  };

  const handleSendClick = () => {
    if (isSendFunctionDisabled || isProcessingRef.current || isSending) {
      return;
    }

    isProcessingRef.current = true;
    startSendingAssistantIdRef.current = lastAssistantMessage?.id;
    setIsSending(true);

    handleGenerate();
  };

  const handleFileButtonClick = async () => {
    const acceptString = context.fileInputRef.current?.accept || '';
    const allowsImages =
      acceptString.includes('image/*') || acceptString.includes('image/');

    if (allowsImages && onImageUploadPaywallCheck) {
      const shouldBlock = await onImageUploadPaywallCheck();
      if (shouldBlock) {
        return;
      }
    }

    context.fileInputRef.current?.click();
  };

  return (
    <div className="sticky bottom-0 z-10 pb-6 sm:pb-8 px-4">
      <div className="max-w-[800px] mx-auto w-full relative">
        <div
          ref={inputAreaRef}
          className={`relative flex flex-col justify-center w-full mx-auto flex-shrink-0 rounded-[2rem] border transition-all duration-300 shadow-2xl ${
            isDragOver
              ? 'border-primary/60 bg-primary/10 ring-4 ring-primary/20 scale-[1.01] backdrop-blur-xl'
              : 'bg-background/60 backdrop-blur-xl border-white/10 shadow-black/20 hover:shadow-black/30 hover:border-white/20 focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10'
          }`}
          style={{ minHeight: '60px' }}
          onDragEnter={e => {
            if (isFileInputDisabled) return;
            e.preventDefault();
            e.stopPropagation();
            setIsDragOver(true);
          }}
          onDragOver={e => {
            if (isFileInputDisabled) return;
            e.preventDefault();
            e.stopPropagation();
          }}
          onDragLeave={e => {
            if (isFileInputDisabled) return;
            e.preventDefault();
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX;
            const y = e.clientY;
            if (
              x < rect.left ||
              x > rect.right ||
              y < rect.top ||
              y > rect.bottom
            ) {
              setIsDragOver(false);
            }
          }}
          onDrop={e => {
            setIsDragOver(false);
            setIsDraggingAnywhere(false);
            handleDrop(e);
          }}
        >
          {(context.uploadedImages.length > 0 ||
            context.uploadedAudio.length > 0 ||
            context.uploadedVideos.length > 0) && (
            <div className="pt-4 px-5 pb-3 flex flex-wrap gap-3 items-center border-b border-white/5 bg-transparent">
              {context.uploadedImages.map((file, index) => {
                const isFileObject = file instanceof File;
                const imageUrl = isFileObject
                  ? (() => {
                      const url = URL.createObjectURL(file);
                      objectUrlsRef.current.add(url);
                      return url;
                    })()
                  : null;
                const fileName = isFileObject
                  ? file.name
                  : (file as any).name || 'Image';

                return (
                  <div
                    key={`img-${index}`}
                    className="group relative w-16 h-16 rounded-2xl overflow-hidden border border-white/10 bg-black/20 shadow-lg transition-all hover:scale-105"
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={fileName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground text-xs">
                        {fileName}
                      </div>
                    )}
                    <button
                      onClick={() => {
                        if (imageUrl) {
                          URL.revokeObjectURL(imageUrl);
                          objectUrlsRef.current.delete(imageUrl);
                        }
                        context.setUploadedImages(prev =>
                          prev.filter((_, i) => i !== index)
                        );
                      }}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200 backdrop-blur-[2px]"
                      aria-label="Remove image"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                );
              })}
              {context.uploadedAudio.map((file, index) => (
                <div
                  key={`audio-${index}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-xs sm:text-sm shadow-sm hover:bg-white/10 transition-all"
                >
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <Music className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="max-w-[120px] sm:max-w-[150px] truncate font-medium text-white/80">
                    {file.name}
                  </span>
                  <button
                    onClick={() =>
                      context.setUploadedAudio(prev =>
                        prev.filter((_, i) => i !== index)
                      )
                    }
                    className="ml-1 hover:text-red-400 transition-colors p-1 rounded-full hover:bg-red-400/10"
                    aria-label="Remove audio"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {context.uploadedAudio.length > 1 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
                  <Music className="w-3.5 h-3.5" />
                  <span>
                    Compilation ({context.uploadedAudio.length} files)
                  </span>
                </div>
              )}
              {context.uploadedVideos.map((file, index) => {
                const isFileObject = file instanceof File;
                const videoUrl = isFileObject
                  ? (() => {
                      const url = URL.createObjectURL(file);
                      objectUrlsRef.current.add(url);
                      return url;
                    })()
                  : null;
                const fileName = isFileObject
                  ? file.name
                  : (file as any).name || 'Video';

                return (
                  <div
                    key={`video-${index}`}
                    className="group relative w-16 h-16 rounded-2xl overflow-hidden border border-white/10 bg-black/20 shadow-lg transition-all hover:scale-105"
                  >
                    {videoUrl ? (
                      <video
                        src={videoUrl}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                        <Video className="w-6 h-6" />
                      </div>
                    )}
                    <button
                      onClick={() => {
                        if (videoUrl) {
                          URL.revokeObjectURL(videoUrl);
                          objectUrlsRef.current.delete(videoUrl);
                        }
                        context.setUploadedVideos(prev =>
                          prev.filter((_, i) => i !== index)
                        );
                      }}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200 backdrop-blur-[2px]"
                      aria-label="Remove video"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex flex-col bg-transparent">
            <div className="bg-transparent">
              <textarea
                ref={textareaRef}
                value={context.prompt}
                onChange={e => {
                  const value = e.target.value;
                  if (value.length <= 2000) {
                    context.setPrompt(value);
                  }
                }}
                onFocus={() => {
                  window.dispatchEvent(new Event('promptFocus'));
                }}
                onBlur={() => {
                  window.dispatchEvent(new Event('promptBlur'));
                }}
                onKeyDown={handleKeyPress}
                maxLength={2000}
                className={`w-full text-[16px] leading-relaxed px-6 py-4 bg-transparent border-0 rounded-t-[2rem] transition-all duration-500 resize-none overflow-hidden outline-none focus:outline-none focus-visible:outline-none placeholder:text-muted-foreground/50`}
                placeholder={
                  isProcessing
                    ? 'Processing...'
                    : isAIGenerationMode
                      ? 'Describe what you want to create...'
                      : currentNodeData?.parameters?.placeholder ||
                        'Type a message or upload files...'
                }
                style={{
                  maxHeight: '200px',
                  outline: 'none',
                  background: 'transparent',
                  backgroundColor: 'transparent',
                }}
              />
            </div>

            <div className="px-4 pb-3 pt-1 flex items-center justify-between bg-transparent">
              <div className="flex items-center gap-2">
                {actionButtonsVisible && (
                  <div className={`flex items-center gap-2 ${actionButtonsFadingOut ? 'fade-out' : 'fade-in-up'}`}>
                    {actionUIConfig.model && (
                      <ModelSelector
                        value={actionUIConfig.model.value}
                        onChange={actionUIConfig.model.onChange}
                        models={actionUIConfig.model.models}
                        disabled={isProcessing}
                      />
                    )}
                    {actionUIConfig.quality && (
                      <QualitySelector
                        value={actionUIConfig.quality.value}
                        onChange={actionUIConfig.quality.onChange}
                        qualities={actionUIConfig.quality.qualities}
                        disabled={isProcessing}
                      />
                    )}
                    {actionUIConfig.format && (
                      <FormatSelector
                        value={actionUIConfig.format.value}
                        onChange={actionUIConfig.format.onChange}
                        formats={actionUIConfig.format.formats}
                        disabled={isProcessing}
                      />
                    )}
                  </div>
                )}
              </div>


              <div className="flex items-center gap-2">
                <input
                  key={`file-input-${currentNodeData?.id || 'default'}-${maxFiles || 'unlimited'}`}
                  ref={context.fileInputRef}
                  type="file"
                  accept={acceptString}
                  multiple={shouldAllowMultiple}
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isFileInputDisabled}
                />

                {(currentNodeData?.ai_button || isAIGenerationMode) && (
                  <div
                    className={`${
                      isAIGenerationMode
                        ? 'p-[1px] rounded-xl border-ai-gradient'
                        : 'p-[1px] rounded-xl border-ai-gradient-inactive'
                    } transition-all duration-1200 ease-in-out`}
                  >
                    <Button
                      onClick={handleAIGeneration}
                      size="sm"
                      variant="ghost"
                      disabled={!currentNodeData?.ai_button || isProcessing}
                      className={`h-10 w-10 p-0 rounded-xl shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden transition-all duration-1200 ease-in-out ${
                        isAIGenerationMode
                          ? 'btn-ai-gradient border-0'
                          : 'hover:bg-white/10 border-0'
                      }`}
                      aria-label={
                        isAIGenerationMode
                          ? 'Exit AI Generation Mode'
                          : 'Enter AI Generation Mode'
                      }
                      title={
                        isAIGenerationMode
                          ? 'Exit AI Generation Mode'
                          : 'Enter AI Generation Mode'
                      }
                    >
                      <Sparkles
                        className={`w-5 h-5 relative z-10 transition-colors duration-1200 ease-in-out ${
                          isAIGenerationMode ? 'text-white' : 'text-primary'
                        }`}
                      />
                    </Button>
                  </div>
                )}

                <Button
                  onClick={handleFileButtonClick}
                  size="sm"
                  variant="ghost"
                  disabled={isFileInputDisabled || isProcessing}
                  className="h-10 w-10 p-0 rounded-xl hover:bg-white/10 transition-all duration-200 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Upload files"
                  title={
                    isFileLimitReached
                      ? `Maximum ${maxFiles} file(s) reached`
                      : 'Upload files'
                  }
                >
                  <Paperclip className="w-5 h-5" />
                </Button>

                <Button
                  onClick={handleSendClick}
                  size="sm"
                  disabled={isButtonDisabled}
                  className={`h-10 w-10 p-0 rounded-xl shadow-lg transition-all duration-300 relative overflow-hidden ${
                    isButtonDisabled
                      ? 'bg-muted text-muted-foreground opacity-50 cursor-not-allowed'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 hover:shadow-primary/25'
                  }`}
                  aria-label="Send"
                >
                  {showLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <ArrowUp className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {isDraggingAnywhere && !isFileInputDisabled && (
            <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none rounded-[2rem] overflow-hidden">
              <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm rounded-[2rem]"></div>
              <div className="relative z-10 bg-card/95 backdrop-blur-xl rounded-2xl border-4 border-dashed border-primary/60 p-8 sm:p-12 shadow-2xl ring-4 ring-primary/20 mx-4">
                <div className="flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                    <Upload className="w-8 h-8 sm:w-10 sm:h-10 text-primary animate-bounce" />
                  </div>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">
                    {selectedProjectType === 'music_video_clip'
                      ? 'Drop Audio Files Here'
                      : 'Drop Files Here'}
                  </h3>
                  <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
                    {selectedProjectType === 'music_video_clip'
                      ? 'Up to 20 audio files for compilation'
                      : 'Images, audio, or video files'}
                  </p>
                  <div className="flex items-center gap-2 mt-4 text-xs sm:text-sm text-muted-foreground/70">
                    <Paperclip className="w-4 h-4" />
                    <span>Release to upload</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
