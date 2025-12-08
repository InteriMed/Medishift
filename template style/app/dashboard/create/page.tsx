'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/ui/use-toast';
import {
  useWorkflowHandlers,
  createWorkflowHandler,
  ProjectType,
} from './chat';
import type { Message } from '@/types/workflow';
import { WorkflowUI } from './chat/WorkflowUI';
import { ProjectType as ApiProjectType } from '@/types/projects';
import { useUnifiedMessageCreation } from '@/hooks/workflows/useUnifiedMessageCreation';
import { useProjectChatPersistence } from '@/hooks/workflows/useProjectChatPersistence';
import { AudioProvider } from '@/contexts/AudioContext';
import {
  useChat,
  useRestoreConversation,
  useTaskStreaming,
} from '@/hooks/chatbot';
import type { ChatMessage as BackendChatMessage } from '@/lib/api/chat';
import type { StreamingMessage } from '@/types/workflow';
import { useAgentStateManager } from '@/hooks/workflows/useAgentStateManager';
import { usePromptPersistence } from '@/hooks/usePromptPersistence';
import { ApiError } from '@/lib/api/base';

export default function CreatePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const [prompt, setPrompt] = useState('');
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [uploadedAudio, setUploadedAudio] = useState<File[]>([]);
  const [uploadedVideos, setUploadedVideos] = useState<File[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedProjectType, setSelectedProjectType] =
    useState<ProjectType | null>(null);
  const [inputEnabled, setInputEnabled] = useState(true);
  const [fileInputEnabled, setFileInputEnabled] = useState(true);
  const [showProjectTypeCards, setShowProjectTypeCards] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const initialProjectId =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('projectId')
      : null;
  const [projectId, setProjectId] = useState<string | null>(initialProjectId);
  // Derive isProjectCreated from projectId (single source of truth)
  const isProjectCreated = useMemo(() => {
    return !!(
      projectId &&
      projectId !== 'undefined' &&
      projectId !== 'null' &&
      projectId.trim() !== '' &&
      projectId.length > 0
    );
  }, [projectId]);
  const [pendingProjectType, setPendingProjectType] =
    useState<ProjectType | null>(null);

  // Track restored session ID to pass to useChat (only set once when restoring)
  const [restoredSessionId, setRestoredSessionId] = useState<string | null>(
    null
  );

  // Hook to restore conversations when loading projects
  const { restoreConversation, loading: restoringConversation } =
    useRestoreConversation();

  const backendDownRef = useRef<boolean>(false);
  const lastBackendCheckRef = useRef<number>(0);

  const { restorePrompt, clearPrompt } = usePromptPersistence(
    prompt,
    setPrompt,
    true
  );

  // Initialize chat session and load messages from backend
  // Use restored session ID if available, otherwise let useChat create one
  // Don't auto-create session if we're restoring a conversation (restoringConversation is true)
  const {
    session,
    sessionId,
    messages: backendMessages,
    loading: chatLoading,
    sendMessage: sendAgentMessage,
    refreshMessages,
  } = useChat({
    sessionId: restoredSessionId, // Use restored session if available
    projectId,
    autoCreateSession: !restoringConversation && !restoredSessionId, // Don't create session while restoring or if we have a restored session
  });

  const typedBackendMessages: BackendChatMessage[] = useMemo(
    () => backendMessages || [],
    [backendMessages]
  );
  const backendMessagesRef = useRef<BackendChatMessage[]>(typedBackendMessages);

  useEffect(() => {
    backendMessagesRef.current = typedBackendMessages;
  }, [typedBackendMessages]);

  // Use useTaskStreaming as single source of truth for streaming state
  const agentStateManager = useAgentStateManager();

  const addAssistantMessageWithDelayForStreaming = useCallback(
    (
      message: Omit<Message, 'id' | 'timestamp'>,
      delay: number = 1000 + Math.random() * 500
    ) => {
      const messageId = `assistant-${Date.now()}`;
      const fullMessage: Message = {
        ...message,
        id: messageId,
        timestamp: new Date(),
      };
      setTimeout(() => {
        setMessages(prev => [...prev, fullMessage]);
      }, delay);
    },
    [setMessages]
  );

  const workflowContextForStreaming = useMemo(
    () => ({
      messages,
      setMessages,
      addAssistantMessageWithDelay: addAssistantMessageWithDelayForStreaming,
      prompt,
      setPrompt,
      inputEnabled,
      setInputEnabled,
      fileInputEnabled,
      setFileInputEnabled,
      fileInputRef,
      uploadedImages,
      setUploadedImages,
      uploadedAudio,
      setUploadedAudio,
      uploadedVideos,
      setUploadedVideos,
      isGenerating,
      setIsGenerating,
      toast,
      projectId,
      chatSessionId: sessionId,
      sendAgentMessage,
      refreshMessages,
    }),
    [
      messages,
      setMessages,
      addAssistantMessageWithDelayForStreaming,
      prompt,
      setPrompt,
      inputEnabled,
      setInputEnabled,
      fileInputEnabled,
      setFileInputEnabled,
      fileInputRef,
      uploadedImages,
      setUploadedImages,
      uploadedAudio,
      setUploadedAudio,
      uploadedVideos,
      setUploadedVideos,
      isGenerating,
      setIsGenerating,
      toast,
      projectId,
      sessionId,
      sendAgentMessage,
      refreshMessages,
    ]
  );

  const {
    streamingMessages,
    setStreamingMessages,
    streamingMessagesRef,
    taskIdToMessageIdRef,
    streamingUpdateKey,
  } = useTaskStreaming({
    chat_id: sessionId || undefined,
    enabled: !!sessionId,
    context: workflowContextForStreaming,
    agentStateManager,
  });

  // Clear messages when projectId is null (fresh create page)
  useEffect(() => {
    if (!projectId && messages.length > 0) {
      console.log('🔄 Clearing messages - no projectId (fresh create page)');
      setMessages([]);
    }
  }, [projectId]);

  // Map backend messages to frontend Message format
  // Only process messages when there's a valid projectId or sessionId
  useEffect(() => {
    // Don't process messages if there's no project and no session
    // This prevents old messages from appearing when starting a new project
    if (!projectId && !sessionId) {
      if (messages.length > 0) {
        console.log('🔄 Clearing messages - no projectId and no sessionId');
        setMessages([]);
      }
      return;
    }

    if (typedBackendMessages && typedBackendMessages.length > 0) {
      const mappedMessages: Message[] = typedBackendMessages.map(
        (msg: BackendChatMessage) => {
          const files = {
            images:
              msg.files
                ?.filter(f => f.file_type === 'image')
                .map(f => ({
                  id: f.id,
                  name: f.file_name,
                  url: f.file_url,
                  presigned_url: f.file_url,
                  s3_url: f.file_url,
                  file_type: f.file_type,
                  file_size: f.file_size,
                  content_type: f.mime_type,
                  metadata: f.metadata,
                })) || [],
            audio:
              msg.files
                ?.filter(f => f.file_type === 'audio')
                .map(f => ({
                  id: f.id,
                  name: f.file_name,
                  url: f.file_url,
                  presigned_url: f.file_url,
                  s3_url: f.file_url,
                  file_type: f.file_type,
                  file_size: f.file_size,
                  content_type: f.mime_type,
                  metadata: f.metadata,
                })) || [],
          };

          // Backend already parses JSON and stores only the answer field
          // No need to parse on frontend - content is already extracted
          const displayContent = msg.content || '';

          return {
            id: msg.id,
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: displayContent,
            timestamp: new Date(msg.created_at),
            files:
              files.images.length > 0 || files.audio.length > 0
                ? files
                : undefined,
            actions: msg.actions,
            context: msg.context || undefined,
          };
        }
      );

      const backendIds = new Set(mappedMessages.map(m => m.id));
      const currentIds = new Set(messages.map(m => m.id));

      const hasNewBackendMessages = mappedMessages.some(
        m => !currentIds.has(m.id)
      );
      const hasContentChanges = mappedMessages.some(m => {
        const existing = messages.find(msg => msg.id === m.id);
        return existing && existing.content !== m.content;
      });

      if (hasNewBackendMessages || hasContentChanges) {
        const sorted = mappedMessages.sort((a, b) => {
          const aBackend = typedBackendMessages.find(m => m.id === a.id);
          const bBackend = typedBackendMessages.find(m => m.id === b.id);

          if (aBackend && bBackend) {
            return (
              (aBackend.sequence_number || 0) - (bBackend.sequence_number || 0)
            );
          }

          return (
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
        });

        setMessages(sorted);
      }
    }
    // Don't clear messages when backend returns empty - messages may be stored in projects table
    // The useProjectChatPersistence hook manages project-based messages separately
  }, [
    typedBackendMessages,
    messages,
    chatLoading,
    refreshMessages,
    projectId,
    sessionId,
  ]);

  // Debounce refreshMessages to prevent excessive calls
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debouncedRefreshMessages = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    refreshTimeoutRef.current = setTimeout(() => {
      if (refreshMessages) {
        refreshMessages();
      }
      refreshTimeoutRef.current = null;
    }, 200);
  }, [refreshMessages]);

  useEffect(() => {
    if (
      restoredSessionId &&
      sessionId === restoredSessionId &&
      typeof refreshMessages === 'function'
    ) {
      debouncedRefreshMessages();
    }
  }, [restoredSessionId, sessionId, debouncedRefreshMessages, refreshMessages]);

  // Clear isGenerating when streaming is complete (with debouncing to prevent premature clearing)
  const isGeneratingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    // Clear any pending timeout
    if (isGeneratingTimeoutRef.current) {
      clearTimeout(isGeneratingTimeoutRef.current);
      isGeneratingTimeoutRef.current = null;
    }

    const lastAssistantMessage = messages
      .slice()
      .reverse()
      .find(m => m.role === 'assistant');
    if (!lastAssistantMessage) {
      // No assistant message, clear isGenerating if it's set
      if (isGenerating) {
        isGeneratingTimeoutRef.current = setTimeout(() => {
          console.log('✅ Clearing isGenerating - no assistant message');
          setIsGenerating(false);
          isGeneratingTimeoutRef.current = null;
        }, 500);
      }
      return;
    }

    const streamingData = streamingMessages.get(lastAssistantMessage.id);
    const isFrontendComplete =
      streamingData?.isFrontendStreamingComplete ?? true;
    const isBackendComplete = streamingData?.isBackendStreamingComplete ?? true;

    // Only clear isGenerating if both frontend and backend streaming are complete
    // Add delay to prevent premature clearing during rapid updates
    if (isGenerating && isFrontendComplete && isBackendComplete) {
      isGeneratingTimeoutRef.current = setTimeout(() => {
        // Double-check state hasn't changed
        const currentLastMessage = messages
          .slice()
          .reverse()
          .find(m => m.role === 'assistant');
        const currentStreamingData = currentLastMessage
          ? streamingMessages.get(currentLastMessage.id)
          : null;
        const stillComplete =
          currentStreamingData?.isFrontendStreamingComplete &&
          currentStreamingData?.isBackendStreamingComplete;

        if (stillComplete) {
          console.log('✅ Clearing isGenerating - streaming complete:', {
            messageId: lastAssistantMessage.id,
            isFrontendComplete,
            isBackendComplete,
          });
          setIsGenerating(false);
        }
        isGeneratingTimeoutRef.current = null;
      }, 500);
    }

    return () => {
      if (isGeneratingTimeoutRef.current) {
        clearTimeout(isGeneratingTimeoutRef.current);
        isGeneratingTimeoutRef.current = null;
      }
    };
  }, [messages, streamingMessages, isGenerating, setIsGenerating]);

  const { saveMessage, loadChatHistory, loadWorkflowState } =
    useProjectChatPersistence({
      projectId,
      messages,
      setMessages,
      enabled: !!projectId,
    });

  const [workflowContextLayers, setWorkflowContextLayers] = useState<{
    action_state?: any;
    subcontext_state?: any;
    context_state?: any;
  } | null>(null);

  const refreshWorkflowContext = useCallback(async () => {
    if (projectId) {
      const state = await loadWorkflowState();
      if (state) {
        setWorkflowContextLayers({
          action_state: state.action_state,
          subcontext_state: state.subcontext_state,
          context_state: state.context_state,
        });
      } else {
        setWorkflowContextLayers(null);
      }
    } else {
      setWorkflowContextLayers(null);
    }
  }, [projectId, loadWorkflowState]);

  useEffect(() => {
    refreshWorkflowContext();
  }, [refreshWorkflowContext]);

  useEffect(() => {
    if (projectId && messages.length > 0) {
      const timeoutId = setTimeout(() => {
        refreshWorkflowContext();
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [projectId, messages.length, refreshWorkflowContext]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).saveChatMessage = saveMessage;
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).saveChatMessage;
      }
    };
  }, [saveMessage]);

  const messagesApi = useUnifiedMessageCreation({
    context: {
      messages,
      setMessages,
      projectId,
      setProjectId: (id: string) => setProjectId(id),
      addAssistantMessageWithDelay: () => {},
      prompt,
      setPrompt,
      inputEnabled,
      setInputEnabled,
      fileInputEnabled,
      setFileInputEnabled,
      fileInputRef,
      uploadedImages,
      setUploadedImages,
      uploadedAudio,
      setUploadedAudio,
      uploadedVideos,
      setUploadedVideos,
      isGenerating,
      setIsGenerating,
      toast,
    },
    streamingMessagesRef,
    setStreamingMessages,
    taskIdToMessageIdRef,
    saveMessage,
  });

  const addAssistantMessageWithDelay = useCallback(
    (
      message: Omit<Message, 'id' | 'timestamp'>,
      delay: number = 1000 + Math.random() * 500
    ) => {
      const isAgentMessage = !!(message as any).agent;
      const effectiveDelay = isAgentMessage ? delay : 0;

      if (isAgentMessage) {
        setIsThinking(true);
      }

      const createAndSaveMessage = () => {
        const messageId = `assistant-${Date.now()}`;
        const fullContent = message.content || '';

        const fullMessage: Message = {
          ...message,
          id: messageId,
          content: fullContent,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, fullMessage]);

        // Inputs are always enabled - no need to control them

        if (projectId && saveMessage) {
          saveMessage(fullMessage);
        }

        if (isAgentMessage) {
          setIsThinking(false);
        }
      };

      if (effectiveDelay > 0) {
        setTimeout(createAndSaveMessage, effectiveDelay);
      } else {
        createAndSaveMessage();
      }
    },
    [projectId, saveMessage]
  );

  const workflowContext = useMemo(
    () => ({
      messages,
      setMessages,
      inputEnabled,
      setInputEnabled,
      fileInputEnabled,
      setFileInputEnabled,
      prompt,
      setPrompt,
      uploadedImages,
      setUploadedImages,
      uploadedAudio,
      setUploadedAudio,
      uploadedVideos,
      setUploadedVideos,
      toast,
      fileInputRef,
      isGenerating,
      setIsGenerating,
      addAssistantMessageWithDelay,
      messagesApi,
      projectId,
      setProjectId,
      chatSessionId: sessionId,
      sendAgentMessage,
      refreshMessages,
    }),
    [
      messages,
      inputEnabled,
      fileInputEnabled,
      prompt,
      uploadedImages,
      uploadedAudio,
      uploadedVideos,
      isGenerating,
      toast,
      addAssistantMessageWithDelay,
      messagesApi,
      projectId,
      sessionId,
      sendAgentMessage,
      refreshMessages,
    ]
  );

  const allWorkflowHandlers = useWorkflowHandlers(workflowContext);

  const workflowHandler = useMemo(() => {
    return createWorkflowHandler(selectedProjectType, allWorkflowHandlers);
  }, [selectedProjectType, allWorkflowHandlers]);

  const prevProjectIdRef = useRef<string | null>(null);
  const autoSelectingRef = useRef<boolean>(false);
  const creatingProjectRef = useRef<boolean>(false);
  const loadingProjectRef = useRef<boolean>(false);
  const loadedProjectIdsRef = useRef<Set<string>>(new Set());

  const checkLLMAvailability = useCallback(async () => {
    const now = Date.now();
    const BACKEND_CHECK_COOLDOWN = 30000;

    if (
      backendDownRef.current &&
      now - lastBackendCheckRef.current < BACKEND_CHECK_COOLDOWN
    ) {
      return;
    }

    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('access_token')
          : null;
      const response = await fetch(
        '/api/v1/ai/runpod/pod/availability?workflow_id=ollama',
        {
          method: 'GET',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      lastBackendCheckRef.current = now;

      if (response.ok) {
        backendDownRef.current = false;
      } else if (response.status === 503) {
        backendDownRef.current = true;
      }
    } catch (error) {
      lastBackendCheckRef.current = now;
      backendDownRef.current = true;
    }
  }, []);

  const createProjectWithDateTime = useCallback(
    async (type: ProjectType): Promise<string | null> => {
      const projectTypeToApiType: Record<ProjectType, ApiProjectType> = {
        music_video_clip: 'music-clip',
        video_clip: 'video-edit',
        business_ad: 'video-edit',
        automate_workflow: 'custom',
      };

      const projectNames: Record<ProjectType, string> = {
        music_video_clip: 'Music Video Clip',
        video_clip: 'Video Clip',
        business_ad: 'Business Ad',
        automate_workflow: 'Automate Workflow',
      };

      // Validate project type
      const validTypes: ProjectType[] = [
        'music_video_clip',
        'video_clip',
        'business_ad',
        'automate_workflow',
      ];
      if (!validTypes.includes(type)) {
        throw new Error(`Invalid project type: ${type}`);
      }

      try {
        const now = new Date();
        // Consistent date/time formatting: YYYY-MM-DD HH:MM (no seconds)
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const dateTimeStr = `${year}-${month}-${day} ${hours}:${minutes}`;

        const { projectsAPI } = await import('@/lib/api/projects');

        const newProject = await projectsAPI.createProject({
          type: projectTypeToApiType[type],
          name: dateTimeStr,
          description: `New ${projectNames[type]} project`,
        });

        if (!newProject || !newProject.id) {
          throw new Error('Project creation failed: No project ID returned');
        }

        return newProject.id;
      } catch (error: any) {
        console.error('❌ Failed to create project:', error);
        throw error;
      }
    },
    []
  );

  const handleProjectTypeSelect = useCallback(
    async (type: ProjectType, isAutoSelect: boolean = false) => {
      if (isAutoSelect && projectId) {
        return;
      }

      setSelectedProjectType(type);
      setPendingProjectType(type);
      setShowProjectTypeCards(false);
      setProjectId(null); // This will automatically set isProjectCreated to false
      setMessages([]);
      restorePrompt();

      if (typeof window !== 'undefined' && (window as any).pendingMessages) {
        (window as any).pendingMessages.clear();
      }
    },
    [projectId, restorePrompt]
  );

  const handleProjectTypeSelectRef = useRef(handleProjectTypeSelect);
  useEffect(() => {
    handleProjectTypeSelectRef.current = handleProjectTypeSelect;
  }, [handleProjectTypeSelect]);

  useEffect(() => {
    const creatingKey = 'clipizy_creating_project';
    const urlProjectId = searchParams.get('projectId');

    console.log('🔍 URL check:', { urlProjectId, projectId, isProjectCreated });

    if (typeof window !== 'undefined' && urlProjectId) {
      sessionStorage.removeItem(creatingKey);
    }

    if (
      urlProjectId &&
      urlProjectId !== 'undefined' &&
      urlProjectId !== 'null' &&
      urlProjectId.trim() !== '' &&
      urlProjectId.length > 0
    ) {
      if (
        prevProjectIdRef.current !== urlProjectId &&
        prevProjectIdRef.current !== null
      ) {
        setMessages([]);
        if (typeof window !== 'undefined' && (window as any).pendingMessages) {
          (window as any).pendingMessages.clear();
        }
      }
      prevProjectIdRef.current = urlProjectId;

      if (projectId !== urlProjectId) {
        console.log('🔄 Setting projectId from URL:', urlProjectId);
        setProjectId(urlProjectId);
        setPendingProjectType(null);
        // Clear restored session ID when project changes - let useChat create/load new session
        setRestoredSessionId(null);
      }
      setShowProjectTypeCards(false);

      if (
        !loadingProjectRef.current &&
        !loadedProjectIdsRef.current.has(urlProjectId)
      ) {
        loadingProjectRef.current = true;
        loadedProjectIdsRef.current.add(urlProjectId);

        const loadProject = async () => {
          try {
            const { projectsAPI } = await import('@/lib/api/projects');
            const project = await projectsAPI.getProject(urlProjectId);

            const projectTypeMap: Record<string, ProjectType> = {
              'music-clip': 'music_video_clip',
              music_video_clip: 'music_video_clip',
              'video-clip': 'video_clip',
              'video-edit': 'video_clip',
              video_clip: 'video_clip',
              'business-ad': 'business_ad',
              business_ad: 'business_ad',
              'automate-workflow': 'automate_workflow',
              automate_workflow: 'automate_workflow',
              custom: 'automate_workflow',
            };

            const mappedType =
              projectTypeMap[project.type] || 'music_video_clip';
            setSelectedProjectType(mappedType);
            console.log('📦 Loaded project:', {
              id: project.id,
              type: project.type,
              mappedType,
            });

            // Restore conversation for this project
            try {
              const conversation = await restoreConversation(urlProjectId);
              if (conversation) {
                console.log('💬 Restored conversation:', {
                  sessionId: conversation.sessionId,
                  messageCount: conversation.messages.length,
                  currentSessionId: sessionId,
                });
                // Store restored session ID so useChat will use it (only set once)
                setRestoredSessionId(conversation.sessionId);

                // Force refresh messages after session is initialized
                // Increased delay to 1000ms to give useChat more time to initialize
                // Also add retry logic to ensure messages are loaded
                let retryCount = 0;
                const maxRetries = 3;
                const expectedMessageCount = conversation.messages?.length || 0;

                const tryRefreshMessages = () => {
                  setTimeout(
                    () => {
                      console.log(
                        `🔄 Refreshing messages after conversation restoration (attempt ${retryCount + 1}/${maxRetries})`,
                        {
                          sessionId: conversation.sessionId,
                          currentSessionId: sessionId,
                          expectedMessageCount,
                        }
                      );

                      if (refreshMessages) {
                        refreshMessages();

                        // Check if messages loaded after a delay, retry if needed
                        // Check backendMessagesRef which is updated directly from API, not derived messages state
                        setTimeout(() => {
                          const currentBackendMessages =
                            backendMessagesRef.current;
                          const loadedMessageCount =
                            currentBackendMessages.length;

                          // Only retry if we expected messages but got none
                          if (
                            expectedMessageCount > 0 &&
                            loadedMessageCount === 0 &&
                            retryCount < maxRetries - 1
                          ) {
                            retryCount++;
                            console.warn(
                              `⚠️ Expected ${expectedMessageCount} messages but got 0, retrying... (${retryCount}/${maxRetries})`
                            );
                            tryRefreshMessages();
                          } else if (loadedMessageCount > 0) {
                            console.log(
                              `✅ Messages loaded successfully: ${loadedMessageCount} messages`
                            );
                          } else if (
                            expectedMessageCount > 0 &&
                            loadedMessageCount === 0
                          ) {
                            console.warn(
                              `⚠️ Expected ${expectedMessageCount} messages but none loaded after ${maxRetries} retries. This may be normal if messages are still being processed.`
                            );
                          } else {
                            console.log(
                              `ℹ️ No messages to load (new conversation)`
                            );
                          }
                        }, 500);
                      }
                    },
                    1000 + retryCount * 500
                  );
                };

                tryRefreshMessages();
              }
            } catch (convError) {
              console.warn(
                '⚠️ Failed to restore conversation, will create new session:',
                convError
              );
              // Continue without restoring - useChat will create a new session
            }

            const workflowState = await loadWorkflowState();
            if (workflowState) {
              console.log('Loaded workflow state:', workflowState);
            }
          } catch (error) {
            if (error instanceof ApiError && error.status === 404) {
              console.warn('⚠️ Project not found');
              toast({
                title: 'Error loading project',
                description: 'Project not found or access denied',
                variant: 'destructive',
              });
              // Don't redirect automatically to avoid state reset loops during debug
              // router.push('/dashboard/create');
              return;
            }
            console.error('❌ Failed to load project:', error);
            loadedProjectIdsRef.current.delete(urlProjectId);
          } finally {
            loadingProjectRef.current = false;
          }
        };
        loadProject();
      }
      return;
    }

    if (urlProjectId === 'undefined' || urlProjectId === 'null') {
      window.location.href = '/dashboard/create';
      return;
    }

    // When there's no projectId in URL, reset to initial state
    // Don't check isCreating/creatingProjectRef/autoSelectingRef - force reset
    if (!urlProjectId || urlProjectId.trim() === '') {
      console.log('🔄 No projectId in URL, resetting to initial state');

      // Reset state when there's no projectId in URL
      if (prevProjectIdRef.current !== null) {
        setMessages([]);
        if (typeof window !== 'undefined' && (window as any).pendingMessages) {
          (window as any).pendingMessages.clear();
        }
        prevProjectIdRef.current = null;
        loadedProjectIdsRef.current.clear();
      }

      // Always reset project state when URL has no projectId
      console.log('🔄 Resetting project state (no projectId in URL)');
      setProjectId(null); // This will automatically set isProjectCreated to false
      setPendingProjectType(null);
      setRestoredSessionId(null);
      restorePrompt();

      // Reset selected project type - this will trigger auto-selection
      setSelectedProjectType(null);

      // Reset auto-selecting flag to allow auto-selection again
      autoSelectingRef.current = false;

      // Session will be cleared automatically by useChat when projectId is null
      setShowProjectTypeCards(false);

      // Auto-select music_video_clip after a short delay
      setTimeout(() => {
        if (!autoSelectingRef.current) {
          checkLLMAvailability();
          autoSelectingRef.current = true;
          handleProjectTypeSelectRef.current('music_video_clip', true);
        }
      }, 100);

      return;
    }

    const isCreating =
      typeof window !== 'undefined' && sessionStorage.getItem(creatingKey);

    if (isCreating || creatingProjectRef.current || autoSelectingRef.current) {
      return;
    }
  }, [
    searchParams,
    projectId,
    loadWorkflowState,
    checkLLMAvailability,
    restorePrompt,
    isProjectCreated,
    refreshMessages,
    restoreConversation,
    router,
  ]);

  const currentStepConfig = workflowHandler
    ? allWorkflowHandlers[selectedProjectType!]?.currentStepConfig
    : null;

  const projectTypeToWorkflowId: Record<ProjectType, string> = {
    music_video_clip: 'music_workflow',
    video_clip: 'video_workflow',
    business_ad: 'business_workflow',
    automate_workflow: 'automate_workflow',
  };

  const workflowId = selectedProjectType
    ? projectTypeToWorkflowId[selectedProjectType]
    : undefined;

  return (
    <AudioProvider>
      <WorkflowUI
        context={workflowContext}
        selectedProjectType={selectedProjectType}
        setSelectedProjectType={setSelectedProjectType}
        workflowHandler={workflowHandler}
        currentStep={currentStepConfig}
        activeBricks={workflowHandler?.activeBricks}
        onBrickAction={(brickId, action, data) =>
          workflowHandler?.handleBrickAction?.(brickId, action, data)
        }
        onBrickComplete={(brickId, result) =>
          workflowHandler?.handleBrickComplete?.(brickId, result)
        }
        onBrickError={(brickId, error) =>
          workflowHandler?.handleBrickError?.(brickId, error)
        }
        onProjectTypeSelect={handleProjectTypeSelect}
        isThinking={isThinking}
        showProjectTypeCards={showProjectTypeCards}
        setShowProjectTypeCards={setShowProjectTypeCards}
        workflowId={workflowId}
        isProjectCreated={isProjectCreated}
        pendingProjectType={pendingProjectType}
        createProjectWithDateTime={createProjectWithDateTime}
        setProjectId={setProjectId}
        router={router}
        streamingMessages={streamingMessages}
        setStreamingMessages={setStreamingMessages}
        clearPrompt={clearPrompt}
        workflowContextLayers={workflowContextLayers}
      />
    </AudioProvider>
  );
}
