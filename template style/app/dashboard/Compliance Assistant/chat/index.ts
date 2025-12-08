export type { ProjectType } from './WorkflowUI';
export { WorkflowUI } from './WorkflowUI';

import type { WorkflowContext } from '@/types/workflow';
import type { ProjectType } from './WorkflowUI';

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

type WorkflowHandlers = Record<ProjectType, WorkflowHandler>;

/**
 * Hook to get workflow handlers for all project types
 */
export function useWorkflowHandlers(
  context: WorkflowContext
): WorkflowHandlers {
  // Create basic handlers for each project type
  const createHandler = (type: ProjectType): WorkflowHandler => ({
    handleProjectSelect: () => {
      // Default implementation
      console.log(`Project select for ${type}`);
    },
    handleUserInput: (input: string, skipMessageCreation?: boolean) => {
      const allFiles = [
        ...context.uploadedImages,
        ...context.uploadedAudio,
        ...context.uploadedVideos,
      ];

      if (allFiles.length > 0) {
        context.setUploadedImages(() => []);
        context.setUploadedAudio(() => []);
        context.setUploadedVideos(() => []);
      }

      if (!skipMessageCreation && context.messagesApi) {
        context.messagesApi.createUserMessage(
          input,
          allFiles.length > 0
            ? {
                images: allFiles.filter(f => f.type.startsWith('image/')),
                audio: allFiles.filter(f => f.type.startsWith('audio/')),
              }
            : undefined
        );
      }

      if (context.sendAgentMessage && context.chatSessionId) {
        context
          .sendAgentMessage(input, allFiles.length > 0 ? allFiles : undefined, {
            process_llm: true,
            execute_actions: true,
          })
          .then(() => {
            if (context.refreshMessages) {
              context.refreshMessages();
            }
          })
          .catch(console.error);
      }
    },
    handleFileUpload: (files: File[]) => {
      // Default implementation
      console.log(`File upload for ${type}:`, files);
    },
    renderModals: () => {
      // Default: no modals
      return null;
    },
  });

  return {
    music_video_clip: createHandler('music_video_clip'),
    video_clip: createHandler('video_clip'),
    business_ad: createHandler('business_ad'),
    automate_workflow: createHandler('automate_workflow'),
  };
}

/**
 * Creates a workflow handler for a specific project type
 */
export function createWorkflowHandler(
  projectType: ProjectType | null,
  handlers: WorkflowHandlers
): WorkflowHandler | null {
  if (!projectType) {
    return null;
  }
  return handlers[projectType] || null;
}
