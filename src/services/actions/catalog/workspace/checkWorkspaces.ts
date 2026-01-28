import { z } from "zod";
import { ActionDefinition, ActionContext } from "../../types";
import { db } from '../../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

import { functions } from '../../../services/firebase';
import { httpsCallable } from 'firebase/functions';

const CheckWorkspacesSchema = z.object({});

interface WorkspaceInfo {
  id: string;
  name: string;
  type: 'personal' | 'facility' | 'organization' | 'admin';
  role?: string;
  hasAccess?: boolean;
}

interface CheckWorkspacesResult {
  workspaces: WorkspaceInfo[];
  needsOnboarding: boolean;
  hasAnyWorkspace: boolean;
}

export const checkWorkspacesAction: ActionDefinition<typeof CheckWorkspacesSchema, CheckWorkspacesResult> = {
  id: "workspace.check_available",
  fileLocation: "src/services/actions/catalog/workspace/checkWorkspaces.ts",
  requiredPermission: "thread.read", // Base permission for all active users
  label: "Check Available Workspaces",
  description: "Returns all workspaces the user has access to by verifying membership on the server.",
  keywords: ["workspace", "check", "available", "access"],
  icon: "Layout",
  schema: CheckWorkspacesSchema,
  metadata: {
    autoToast: false,
    riskLevel: 'LOW',
  },

  handler: async (input: z.infer<typeof CheckWorkspacesSchema>, ctx: ActionContext): Promise<CheckWorkspacesResult> => {
    try {
      // 1. Call backend to discover workspaces user has access to
      const checkWorkspacesFunction = httpsCallable(functions, 'checkWorkspaces');
      const result = await checkWorkspacesFunction({}) as { data: CheckWorkspacesResult };

      await ctx.auditLogger('workspace.check_available', 'SUCCESS', {
        workspaceCount: result.data.workspaces.length,
        needsOnboarding: result.data.needsOnboarding
      });

      return result.data;
    } catch (error: any) {
      await ctx.auditLogger('workspace.check_available', 'ERROR', {
        error: error.message
      });
      throw error;
    }
  }
};


