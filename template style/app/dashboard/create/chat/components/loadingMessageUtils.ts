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

interface LoadingMessageOptions {
  isThinking?: boolean;
  isSending?: boolean;
  generatingNodes?: Map<string, { name: string; progress?: number }>;
  workflowContext?: ContextLayers | null;
  actionDisplayCache?: Record<string, string>;
  isFirstMessage?: boolean;
}

const getActionDisplayName = (
  actionId?: string,
  toolName?: string,
  description?: string,
  actionDisplayCache?: Record<string, string>
): string => {
  if (actionId && actionDisplayCache?.[actionId]) {
    return actionDisplayCache[actionId];
  }
  
  if (toolName) {
    const actionMap: Record<string, string> = {
      'generate_music': 'Generating amazing music',
      'generate_image': 'Creating stunning visuals',
      'generate_video': 'Producing incredible videos',
      'generate_text': 'Crafting compelling content',
      'analyze_music': 'Analyzing audio magic',
      'analyze_image': 'Analyzing visual elements',
      'upscale_video': 'Enhancing video quality',
    };
    return actionMap[toolName] || `Generating ${toolName.replace(/_/g, ' ')}`;
  }
  if (description) {
    return `Generating ${description.toLowerCase()}`;
  }
  return 'Generating amazing content';
};

export function getLoadingMessage({
  isThinking = false,
  isSending = false,
  generatingNodes,
  workflowContext,
  actionDisplayCache = {},
  isFirstMessage = false,
}: LoadingMessageOptions): string {
  if (isFirstMessage) {
    return 'Getting ready to create something amazing...';
  }

  if (generatingNodes && generatingNodes.size > 0) {
    const nodeNames = Array.from(generatingNodes.values())
      .map(n => n.name)
      .join(', ');
    return `Generating ${nodeNames}...`;
  }

  if (isThinking) {
    return 'Analyzing your request...';
  }

  if (isSending) {
    return 'Sending your message...';
  }

  if (workflowContext) {
    if (workflowContext.action_state) {
      const actionState = workflowContext.action_state;
      return getActionDisplayName(
        actionState.action_id,
        actionState.tool_name,
        actionState.description,
        actionDisplayCache
      );
    }

    if (workflowContext.subcontext_state?.matches && workflowContext.subcontext_state.matches.length === 1) {
      const match = workflowContext.subcontext_state.matches[0];
      return getActionDisplayName(
        match.action_id || match.tool_name,
        match.tool_name,
        match.description,
        actionDisplayCache
      );
    }

    if (workflowContext.context_state) {
      const contextState = workflowContext.context_state;
      if (contextState.page && contextState.page.toLowerCase() !== 'unknown') {
        return `Context: ${contextState.page}`;
      }
      return 'Generating amazing content';
    }
  }

  return 'Thinking...';
}

