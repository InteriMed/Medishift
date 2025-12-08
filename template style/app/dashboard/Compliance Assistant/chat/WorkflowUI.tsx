'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import type {
  WorkflowContext,
  Message,
  WorkflowStep,
  NodeDefinition,
  StreamingMessage,
} from '@/types/workflow';
import type { BrickConfig } from '@/types/workflow';
import { useCardSelector } from '@/hooks/use-card-selector';
import {
  CardSelectorOverlay,
  type CardOption,
} from '@/components/ui/card-selector-overlay';
import { MessagesArea } from './components/MessagesArea';
import { PromptArea } from './components/PromptArea';
import { ContextBar } from './components/ContextBar';
import { AudioDurationCropper } from './action/media_visualization/AudioDurationCropper';
import { useRouter } from 'next/navigation';
import { useMessageSender } from '@/hooks/chatbot/useMessageSender';
import { useFileUpload } from '@/hooks/chatbot/useFileUpload';
import { projectsAPI } from '@/lib/api/projects';
import { Shield } from 'lucide-react';

export type ProjectType =
  | 'music_video_clip'
  | 'video_clip'
  | 'business_ad'
  | 'automate_workflow';

interface WorkflowHandler {
  handleProjectSelect?: () => void;
  handleUserInput: (input: string, skipMessageCreation?: boolean) => void;
  handleFileUpload: (files: File[]) => void;
  renderModals?: () => React.ReactNode;
  currentStepConfig?: any;
  activeBricks?: Map<string, { config: any }>;
  handleBrickAction?: (brickId: string, action: string, data: any) => void;
  handleBrickComplete?: (brickId: string, result: any) => void;
  handleBrickError?: (brickId: string, error: Error) => void;
}

interface WorkflowUIProps {
  context: WorkflowContext;
  selectedProjectType: ProjectType | null;
  setSelectedProjectType: (type: ProjectType | null) => void;
  workflowHandler: WorkflowHandler | null;
  currentStep?: any;
  activeBricks?: Map<string, { config: any }>;
  onBrickAction?: (brickId: string, action: string, data: any) => void;
  onBrickComplete?: (brickId: string, result: any) => void;
  onBrickError?: (brickId: string, error: Error) => void;
  onProjectTypeSelect: (type: ProjectType, isAutoSelect?: boolean) => void;
  isThinking: boolean;
  showProjectTypeCards: boolean;
  setShowProjectTypeCards: (show: boolean) => void;
  workflowId?: string;
  isProjectCreated: boolean;
  pendingProjectType: ProjectType | null;
  createProjectWithDateTime: (type: ProjectType) => Promise<string | null>;
  setProjectId: (id: string | null) => void;
  router: ReturnType<typeof useRouter>;
  streamingMessages: Map<string, StreamingMessage>;
  setStreamingMessages: React.Dispatch<
    React.SetStateAction<Map<string, StreamingMessage>>
  >;
  clearPrompt: () => void;
  workflowContextLayers?: {
    action_state?: any;
    subcontext_state?: any;
    context_state?: any;
  } | null;
}

const PROJECT_TYPE_CARDS: CardOption[] = [
  {
    id: 'compliance_analysis',
    title: 'Compliance Analysis',
    description: 'Analyze your codebase for EU AI Act compliance risks',
  },
  {
    id: 'regulatory_guidance',
    title: 'Regulatory Guidance',
    description: 'Get expert guidance on AI Act requirements and best practices',
  },
  {
    id: 'risk_assessment',
    title: 'Risk Assessment',
    description: 'Assess the risk level of your AI systems and components',
  },
  {
    id: 'documentation',
    title: 'Documentation',
    description: 'Generate compliance documentation and transparency reports',
  },
];

export function WorkflowUI({
  context,
  selectedProjectType,
  setSelectedProjectType,
  workflowHandler,
  currentStep,
  activeBricks,
  onBrickAction,
  onBrickComplete,
  onBrickError,
  onProjectTypeSelect,
  isThinking,
  showProjectTypeCards,
  setShowProjectTypeCards,
  workflowId,
  isProjectCreated,
  pendingProjectType,
  createProjectWithDateTime,
  setProjectId,
  router,
  streamingMessages,
  setStreamingMessages,
  clearPrompt,
  workflowContextLayers,
}: WorkflowUIProps) {
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [currentNodeData, setCurrentNodeData] = useState<NodeDefinition | null>(
    null
  );
  const [generatingNodes, setGeneratingNodes] = useState<
    Map<string, { name: string; progress?: number }>
  >(new Map());
  const [isAIGenerationMode, setIsAIGenerationMode] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperFile, setCropperFile] = useState<File | null>(null);
  const [cropperMaxDuration, setCropperMaxDuration] = useState<
    number | undefined
  >(undefined);
  const [croppedDuration, setCroppedDuration] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [persistedUIState, setPersistedUIState] = useState<{
    type: string;
    component: string;
    props?: Record<string, any>;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { overlay } = useCardSelector();
  const uiStateSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);


  const loadUIState = useCallback(async () => {
    if (!context.projectId) {
      return;
    }

    try {
      const projectResponse = await projectsAPI.getProject(context.projectId);
      const project = projectResponse;

      if (!project) {
        setPersistedUIState(null);
        return;
      }

      const workflow = project.workflow;

      if (!workflow || typeof workflow !== 'object' || workflow === null) {
        setPersistedUIState(null);
        return;
      }

      // Get chat-specific UI context
      const chatSessionId = context.chatSessionId;
      let uiState = null;

      if (chatSessionId && workflow.ui_context && typeof workflow.ui_context === 'object') {
        // Check if ui_context is keyed by chat_session_id
        if (workflow.ui_context[chatSessionId]) {
          uiState = workflow.ui_context[chatSessionId];
        } else if (workflow.ui_context.type) {
          // Legacy format: ui_context is a single object (not keyed by chat)
          // Only use it if it's from the same chat session
          uiState = workflow.ui_context;
        }
      }

      // If no ui_context, try to create it from action_state in workflow
      if (!uiState && workflow.action_state) {
        const actionState = workflow.action_state;
        const actionType = typeof actionState === 'string' ? actionState :
          (actionState?.action_type || actionState?.tool_name || actionState?.action_id);

        // Check if it's a generation action that should show UI buttons
        if (actionType && (
          actionType === 'generate_image' ||
          actionType === 'generate_video' ||
          actionType === 'generate_music' ||
          actionType === 'generate_text'
        )) {
          uiState = {
            type: 'prompt_area',
            component: 'ActionUIButtons',
            props: {
              action_type: actionType,
              selected_model: context.selectedModel || undefined,
              selected_quality: context.selectedQuality || undefined,
              selected_format: context.selectedFormat || undefined,
            },
          };
          console.log('[WorkflowUI] Created UI state from action_state:', actionType);

          // Save it to workflow so it persists (scoped by chat session)
          if (chatSessionId) {
            const updatedWorkflow = {
              ...workflow,
              ui_context: {
                ...(workflow.ui_context && typeof workflow.ui_context === 'object' && !workflow.ui_context.type ? workflow.ui_context : {}),
                [chatSessionId]: uiState,
              },
            };
            try {
              await projectsAPI.updateProject(context.projectId!, {
                workflow: updatedWorkflow,
              } as any);
              console.log('[WorkflowUI] Saved created UI state to workflow for chat:', chatSessionId);
            } catch (error) {
              console.error('[WorkflowUI] Failed to save created UI state:', error);
            }
          }
        }
      }

      // If still no ui_context, try to find it from complete_chat_history
      if (!uiState && project.complete_chat_history && Array.isArray(project.complete_chat_history)) {
        const assistantMessages = project.complete_chat_history
          .filter((m: any) => m.role === 'assistant')
          .reverse();

        for (const message of assistantMessages) {
          if (message.actions && Array.isArray(message.actions)) {
            const promptAreaAction = message.actions.find(
              (a: any) =>
                a.action_status === 'completed' &&
                a.response_payload?.ui_design?.type === 'prompt_area'
            );

            if (promptAreaAction?.response_payload?.ui_design) {
              uiState = promptAreaAction.response_payload.ui_design;
              console.log('[WorkflowUI] Found UI state in complete_chat_history, saving to workflow');
              // Save it to workflow for future loads (scoped by chat session)
              if (chatSessionId) {
                const updatedWorkflow = {
                  ...workflow,
                  ui_context: {
                    ...(workflow.ui_context && typeof workflow.ui_context === 'object' && !workflow.ui_context.type ? workflow.ui_context : {}),
                    [chatSessionId]: uiState,
                  },
                };
                await projectsAPI.updateProject(context.projectId!, {
                  workflow: updatedWorkflow,
                } as any);
              }
              break;
            }
          }
        }
      }

      console.log('[WorkflowUI] Loaded UI state:', {
        chatSessionId,
        hasUiState: !!uiState,
        uiState,
        allChatSessions: workflow.ui_context && typeof workflow.ui_context === 'object' && !workflow.ui_context.type
          ? Object.keys(workflow.ui_context)
          : [],
      });

      if (uiState) {
        setPersistedUIState(uiState);

        // Restore selected model/quality/format from persisted UI state
        if (uiState.props) {
          if (uiState.props.selected_model && context.setSelectedModel) {
            context.setSelectedModel(uiState.props.selected_model);
          }
          if (uiState.props.selected_quality && context.setSelectedQuality) {
            context.setSelectedQuality(uiState.props.selected_quality);
          }
          if (uiState.props.selected_format && context.setSelectedFormat) {
            context.setSelectedFormat(uiState.props.selected_format);
          }
        }
      } else {
        setPersistedUIState(null);
      }
    } catch (error) {
      console.error('Failed to load UI state from project:', error);
    }
  }, [context.projectId, context.chatSessionId, context.selectedModel, context.selectedQuality, context.selectedFormat]);

  useEffect(() => {
    if (context.projectId && context.chatSessionId && isProjectCreated) {
      const timeoutId = setTimeout(() => {
        loadUIState();
      }, 100);
      return () => clearTimeout(timeoutId);
    } else {
      setPersistedUIState(null);
    }
  }, [context.projectId, context.chatSessionId, isProjectCreated, loadUIState]);

  useEffect(() => {
    if (context.projectId && context.chatSessionId && isProjectCreated && context.messages.length > 0 && !persistedUIState) {
      const timeoutId = setTimeout(() => {
        loadUIState();
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [context.projectId, context.chatSessionId, isProjectCreated, context.messages.length, persistedUIState, loadUIState]);

  const saveUIState = useCallback(async (uiState: {
    type: string;
    component: string;
    props?: Record<string, any>;
  } | null) => {
    if (!context.projectId || !context.chatSessionId) return;

    if (uiStateSaveTimeoutRef.current) {
      clearTimeout(uiStateSaveTimeoutRef.current);
    }

    uiStateSaveTimeoutRef.current = setTimeout(async () => {
      try {
        const project = await projectsAPI.getProject(context.projectId!);
        const currentWorkflow = project.workflow || {};
        const chatSessionId = context.chatSessionId!;

        // Preserve all existing workflow fields (context_state, action_state, etc.)
        // Store ui_context keyed by chat_session_id
        const existingUIContext = currentWorkflow.ui_context && typeof currentWorkflow.ui_context === 'object' && !currentWorkflow.ui_context.type
          ? currentWorkflow.ui_context
          : {};

        const updatedWorkflow = {
          ...currentWorkflow,
          ui_context: uiState
            ? {
              ...existingUIContext,
              [chatSessionId]: uiState,
            }
            : existingUIContext,
        };

        // Remove the chat session's UI context if uiState is null
        if (!uiState && updatedWorkflow.ui_context[chatSessionId]) {
          delete updatedWorkflow.ui_context[chatSessionId];
          // If no UI contexts remain, set to empty object
          if (Object.keys(updatedWorkflow.ui_context).length === 0) {
            updatedWorkflow.ui_context = {};
          }
        }

        console.log('[WorkflowUI] 💾 Saving UI state:', {
          uiState,
          chatSessionId,
          currentWorkflowKeys: Object.keys(currentWorkflow),
          hasContextState: !!currentWorkflow.context_state,
          hasActionState: !!currentWorkflow.action_state,
          hasUiContext: !!currentWorkflow.ui_context,
          uiContextKeys: currentWorkflow.ui_context && typeof currentWorkflow.ui_context === 'object' && !currentWorkflow.ui_context.type
            ? Object.keys(currentWorkflow.ui_context)
            : [],
        });

        await projectsAPI.updateProject(context.projectId!, {
          workflow: updatedWorkflow,
        } as any);

        // Verify it was saved
        const verifyProject = await projectsAPI.getProject(context.projectId!);
        const verifyUIContext = verifyProject.workflow?.ui_context;
        const chatSpecificUI = verifyUIContext && typeof verifyUIContext === 'object' && !verifyUIContext.type
          ? verifyUIContext[chatSessionId]
          : null;
        console.log('[WorkflowUI] ✅ Saved UI state. Verification:', {
          chatSessionId,
          hasUiContext: !!verifyUIContext,
          hasChatSpecificUI: !!chatSpecificUI,
          uiContextValue: chatSpecificUI,
          allChatSessions: verifyUIContext && typeof verifyUIContext === 'object' && !verifyUIContext.type
            ? Object.keys(verifyUIContext)
            : [],
          workflowKeys: Object.keys(verifyProject.workflow || {}),
        });
      } catch (error) {
        console.error('Failed to save UI state to project:', error);
      }
    }, 500);
  }, [context.projectId, context.chatSessionId]);

  const currentUIState = useMemo(() => {
    let actionBasedUIState: {
      type: string;
      component: string;
      props?: Record<string, any>;
    } | null = null;

    // First, check workflowContextLayers for action_state
    if (!actionBasedUIState && workflowContextLayers?.action_state) {
      const actionState = workflowContextLayers.action_state;
      const actionType = typeof actionState === 'string' ? actionState :
        (actionState?.action_type || actionState?.tool_name || actionState?.action_id);

      if (actionType && (
        actionType === 'generate_image' ||
        actionType === 'generate_video' ||
        actionType === 'generate_music' ||
        actionType === 'generate_text'
      )) {
        actionBasedUIState = {
          type: 'prompt_area',
          component: 'ActionUIButtons',
          props: {
            action_type: actionType,
            selected_model: context.selectedModel || undefined,
            selected_quality: context.selectedQuality || undefined,
            selected_format: context.selectedFormat || undefined,
          },
        };
      }
    }

    // Second, check messages for actions
    if (!actionBasedUIState && context.messages && context.messages.length > 0) {
      const assistantMessages = context.messages
        .filter(m => m.role === 'assistant')
        .reverse();

      for (const message of assistantMessages) {
        if ((message as any).actions) {
          const actions = (message as any).actions as Array<{
            action_type: string;
            action_status: string;
            response_payload?: {
              ui_design?: {
                type: string;
                component: string;
                props?: Record<string, any>;
              };
            };
          }>;

          // Check for explicit ui_design in response payload (e.g., UpgradeButton)
          const promptAreaAction = actions.find(
            a =>
              (a.action_status === 'completed' || a.action_status === 'processing') &&
              a.response_payload?.ui_design?.type === 'prompt_area'
          );

          if (promptAreaAction?.response_payload?.ui_design) {
            actionBasedUIState = promptAreaAction.response_payload.ui_design;
            break;
          }

          // Check for generation actions (completed or processing)
          const generationAction = actions.find(
            a =>
              (a.action_status === 'completed' || a.action_status === 'processing') &&
              (a.action_type === 'generate_image' ||
                a.action_type === 'generate_video' ||
                a.action_type === 'generate_music' ||
                a.action_type === 'generate_text')
          );

          if (generationAction) {
            actionBasedUIState = {
              type: 'prompt_area',
              component: 'ActionUIButtons',
              props: {
                action_type: generationAction.action_type,
                selected_model: context.selectedModel || undefined,
                selected_quality: context.selectedQuality || undefined,
                selected_format: context.selectedFormat || undefined,
              },
            };
            break;
          }
        }
      }
    }

    return actionBasedUIState || persistedUIState;
  }, [context.messages, persistedUIState, workflowContextLayers, context.selectedModel, context.selectedQuality, context.selectedFormat]);

  useEffect(() => {
    if (context.projectId && isProjectCreated && context.messages.length > 0 && currentUIState) {
      console.log('[WorkflowUI] Messages changed, currentUIState exists:', currentUIState);
    }
  }, [context.messages, currentUIState, context.projectId, isProjectCreated]);

  const previousUIStateRef = useRef<string | null>(null);

  useEffect(() => {
    const currentUIStateString = JSON.stringify(currentUIState);
    const uiStateChanged = previousUIStateRef.current !== currentUIStateString;

    // Check if currentUIState came from an action (not from persisted state)
    // We do this by checking if currentUIState exists and persistedUIState is different or null
    const isActionBased = currentUIState && (
      !persistedUIState ||
      JSON.stringify(currentUIState) !== JSON.stringify(persistedUIState)
    );

    // Also check if we have messages with actions that have UI buttons
    const hasActionWithUI = context.messages && context.messages.some(m => {
      if (m.role !== 'assistant' || !(m as any).actions) return false;
      return (m as any).actions.some(
        (a: any) => a.action_status === 'completed' &&
          a.response_payload?.ui_design?.type === 'prompt_area'
      );
    });

    console.log('[WorkflowUI] Save check:', {
      hasCurrentUIState: !!currentUIState,
      hasPersistedUIState: !!persistedUIState,
      isActionBased,
      hasActionWithUI,
      currentUIState,
      persistedUIState,
      messagesCount: context.messages?.length || 0,
    });

    // Save if we have a UI state from an action
    // Always save when we have a UI state from an action, even if it matches persisted state
    // This ensures it's saved even if the persisted state was cleared or lost
    if (currentUIState && (isActionBased || hasActionWithUI)) {
      // Save if state changed OR if persisted state is missing (to ensure it's saved)
      const needsSave = uiStateChanged || !persistedUIState || previousUIStateRef.current === null;

      if (needsSave) {
        console.log('[WorkflowUI] 💾 Triggering save:', {
          reason: uiStateChanged ? 'state changed' : (!persistedUIState ? 'no persisted state' : 'first save'),
          currentUIState,
          persistedUIState,
        });
        saveUIState(currentUIState);
        previousUIStateRef.current = currentUIStateString;
      } else {
        console.log('[WorkflowUI] ⏭️ Skipping save (already persisted):', {
          currentUIState,
          persistedUIState,
        });
      }
    } else if (!currentUIState && persistedUIState && uiStateChanged && !hasActionWithUI) {
      console.log('[WorkflowUI] 🗑️ Clearing persisted UI state (no current state)');
      saveUIState(null);
      previousUIStateRef.current = null;
    } else if (currentUIState && !isActionBased && !hasActionWithUI) {
      console.log('[WorkflowUI] ⚠️ Has UI state but not from action - not saving');
    }

    return () => {
      if (uiStateSaveTimeoutRef.current) {
        clearTimeout(uiStateSaveTimeoutRef.current);
      }
    };
  }, [currentUIState, persistedUIState, context.messages, saveUIState]);

  const { handleGenerate } = useMessageSender({
    context,
    workflowHandler,
    selectedProjectType,
    pendingProjectType,
    isProjectCreated,
    createProjectWithDateTime,
    setProjectId,
    router,
    clearPrompt,
    sessionId: context.chatSessionId,
  });

  const { processFiles } = useFileUpload({
    context,
    currentNodeData,
    selectedProjectType,
    workflowHandler,
    onImagePaywallCheck: async () => {
      return false;
    },
    onAudioCropperOpen: (file: File, maxDuration: number) => {
      setCropperFile(file);
      setCropperMaxDuration(maxDuration);
      setCropperOpen(true);
    },
  });

  const handleProjectTypeCardSelect = useCallback(
    (card: CardOption) => {
      onProjectTypeSelect(card.id as ProjectType);
    },
    [onProjectTypeSelect]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      if (files.length > 0) {
        processFiles(files, () => {
          if (context.fileInputRef.current) {
            context.fileInputRef.current.value = '';
          }
        });
      }
    },
    [processFiles, context.fileInputRef]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        processFiles(files);
      }
    },
    [processFiles]
  );

  const handleAIGeneration = useCallback(() => {
    setIsAIGenerationMode(true);
  }, []);

  return (
    <div className="flex flex-col h-screen max-h-screen">
      <ContextBar
        messages={context.messages}
        isThinking={isThinking}
        isSending={isSending}
        generatingNodes={generatingNodes}
        workflowContext={workflowContextLayers}
      />
      <div
        className={`flex-1 flex flex-col overflow-hidden relative transition-all duration-500 ${!isProjectCreated ? 'justify-center' : ''}`}
      >
        {isProjectCreated && (
          <div className="flex-1 flex flex-col w-full overflow-hidden min-h-0">
            <MessagesArea
              context={context}
              messagesEndRef={messagesEndRef}
              editingMessageId={editingMessageId}
              setEditingMessageId={setEditingMessageId}
              editingContent={editingContent}
              setEditingContent={setEditingContent}
              isThinking={isThinking}
              currentNodeData={currentNodeData}
              generatingNodes={generatingNodes}
              showProjectTypeCards={showProjectTypeCards}
              setShowProjectTypeCards={setShowProjectTypeCards}
              selectedProjectType={selectedProjectType}
              onProjectTypeCardSelect={handleProjectTypeCardSelect}
              projectTypeCards={PROJECT_TYPE_CARDS}
              handleAgentFeedback={undefined}
              streamingMessages={streamingMessages}
              setStreamingMessages={setStreamingMessages}
              workflowContext={workflowContextLayers}
              isSending={isSending}
            />
          </div>
        )}

        {!isProjectCreated && (
          <div className="flex flex-col items-center justify-center mb-8 px-4">
            <div className="flex items-center gap-3 mb-3">
              <Shield className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground text-center">
                Compliance Assistant
              </h1>
            </div>
            <p className="text-base sm:text-lg text-muted-foreground text-center max-w-2xl">
              Ask questions about EU AI Act compliance, analyze your code, or get guidance on regulatory requirements
            </p>
          </div>
        )}

        <PromptArea
          context={context}
          currentNodeData={currentNodeData}
          selectedProjectType={selectedProjectType}
          workflowProcessor={null}
          isAIGenerationMode={isAIGenerationMode}
          setIsAIGenerationMode={setIsAIGenerationMode}
          setIsFadingOut={setIsFadingOut}
          handleGenerate={() => {
            setIsAIGenerationMode(false);
            handleGenerate();
          }}
          handleFileChange={handleFileChange}
          handleDrop={handleDrop}
          handleAIGeneration={handleAIGeneration}
          streamingMessages={streamingMessages}
          isSending={isSending}
          setIsSending={setIsSending}
          onImageUploadPaywallCheck={async () => {
            return false;
          }}
          promptAreaUIOutputs={currentUIState}
        />
      </div>

      {workflowHandler && workflowHandler.renderModals?.()}
      {overlay}

      <AudioDurationCropper
        open={cropperOpen}
        onClose={() => {
          setCropperOpen(false);
          setCropperFile(null);
          setCropperMaxDuration(undefined);
        }}
        onConfirm={(startTime, endTime) => {
          if (cropperFile) {
            const maxFiles = currentNodeData?.parameters?.maxFiles;
            const currentTotalCount =
              context.uploadedImages.length +
              context.uploadedAudio.length +
              context.uploadedVideos.length;

            if (maxFiles !== undefined && currentTotalCount >= maxFiles) {
              context.toast({
                title: 'File limit reached',
                description: `Maximum ${maxFiles} file(s) allowed. You already have ${currentTotalCount} file(s). Please remove some files before adding more.`,
                variant: 'destructive',
              });
              setCropperOpen(false);
              setCropperFile(null);
              setCropperMaxDuration(undefined);
              return;
            }

            const fileWithDuration = new File([cropperFile], cropperFile.name, {
              type: cropperFile.type,
              lastModified: cropperFile.lastModified,
            });
            (fileWithDuration as any).cropStart = startTime;
            (fileWithDuration as any).cropEnd = endTime;
            (fileWithDuration as any).maxDuration = cropperMaxDuration;
            context.setUploadedAudio(prev => [...prev, fileWithDuration]);
            setCroppedDuration({ start: startTime, end: endTime });
          }
          setCropperOpen(false);
          setCropperFile(null);
          setCropperMaxDuration(undefined);
        }}
        audioFile={cropperFile}
        maxDuration={cropperMaxDuration}
        initialStartTime={croppedDuration?.start}
        initialEndTime={croppedDuration?.end}
      />

    </div>
  );
}
