'use client';

import { useMemo, useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { useCredits } from '@/contexts/credits-context';
import { Loader2 } from 'lucide-react';
import type { Message } from '@/types/workflow';

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

interface ContextBarProps {
  messages: Message[];
  isThinking: boolean;
  isSending: boolean;
  generatingNodes?: Map<string, { name: string; progress?: number }>;
  workflowContext?: ContextLayers | null;
}

export function ContextBar({
  messages,
  isThinking,
  isSending,
  generatingNodes,
  workflowContext,
}: ContextBarProps) {

  const [actionDisplayCache, setActionDisplayCache] = useState<Record<string, string>>({});

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

  const getActionDisplayName = (actionId?: string, toolName?: string, description?: string): string => {
    if (actionId && actionDisplayCache[actionId]) {
      return actionDisplayCache[actionId];
    }
    
    if (toolName) {
      const actionMap: Record<string, string> = {
        'scan_repository': 'Scanning repository for compliance',
        'analyze_code': 'Analyzing code for AI Act compliance',
        'assess_risk': 'Assessing compliance risk level',
        'generate_report': 'Generating compliance report',
        'check_article': 'Checking Article requirements',
        'analyze_library': 'Analyzing AI library usage',
      };
      return actionMap[toolName] || `Processing ${toolName.replace(/_/g, ' ')}`;
    }
    if (description) {
      return description;
    }
    return 'Processing compliance request';
  };

  const contextText = useMemo(() => {
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
        return getActionDisplayName(actionState.action_id, actionState.tool_name, actionState.description);
      }

      if (workflowContext.subcontext_state?.matches && workflowContext.subcontext_state.matches.length === 1) {
        const match = workflowContext.subcontext_state.matches[0];
        return getActionDisplayName(match.action_id || match.tool_name, match.tool_name, match.description);
      }

      if (workflowContext.context_state) {
        const contextState = workflowContext.context_state;
        if (contextState.page && contextState.page.toLowerCase() !== 'unknown') {
          return `Context: ${contextState.page}`;
        }
        return 'Generating amazing content';
      }
    }

    if (!messages || messages.length === 0) {
      return 'Ready to assist';
    }

    return 'Processing compliance request';
  }, [messages, isThinking, isSending, generatingNodes, workflowContext, actionDisplayCache]);

  return (
    <div className="border-b border-border/40 dark:border-b-white/10 backdrop-blur-xl supports-[backdrop-filter]:bg-background/20 shadow-sm">
      <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-end gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-shrink-0">
          {(isThinking || isSending || (generatingNodes && generatingNodes.size > 0)) && (
            <Loader2 className="w-3 h-3 animate-spin" />
          )}
          <span className="truncate max-w-[400px]">{contextText}</span>
        </div>
      </div>
    </div>
  );
}

