import { z } from "zod";
import { ActionDefinition, ActionContext } from "../../types";
import { db } from '../../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

import { functions, auth } from '../../../services/firebase';
import { httpsCallable } from 'firebase/functions';
import { signInWithCustomToken } from 'firebase/auth';

const SwitchWorkspaceSchema = z.object({
  targetWorkspaceId: z.string(),
  workspaceType: z.enum(['personal', 'facility', 'organization', 'admin'])
});

interface SwitchResult {
  token: string;
  workspace: {
    id: string;
    name: string;
    type: string;
    role?: string;
    permissions?: string[];
  };
}

export const switchWorkspaceAction: ActionDefinition<typeof SwitchWorkspaceSchema, SwitchResult> = {
  id: "workspace.switch",
  fileLocation: "src/services/actions/catalog/workspace/switchWorkspace.ts",
  requiredPermission: "thread.read", // Base permission allowed for all active users
  label: "Switch Workspace",
  description: "Verifies membership and issues a secure session token for the target workspace.",
  keywords: ["workspace", "switch", "context", "auth", "passport"],
  icon: "Layout",
  schema: SwitchWorkspaceSchema,
  metadata: {
    autoToast: false,
    riskLevel: 'LOW',
  },
  handler: async (input: z.infer<typeof SwitchWorkspaceSchema>, ctx: ActionContext) => {
    const { targetWorkspaceId, workspaceType } = input;

    try {
      // 1. Call backend to verify membership and get secure passport
      const switchWorkspaceFunction = httpsCallable(functions, 'switchWorkspace');
      const result = await switchWorkspaceFunction({
        targetWorkspaceId,
        workspaceType
      }) as { data: SwitchResult };

      const { token, workspace } = result.data;

      // 2. Re-authenticate with new passport (custom token)
      // This is a side-effect that updates the global app auth state
      await signInWithCustomToken(auth, token);

      // 3. Force token refresh to ensure claims are immediately available
      if (auth.currentUser) {
        await auth.currentUser.getIdToken(true);
      }

      await ctx.auditLogger('workspace.switch', 'SUCCESS', {
        workspaceId: targetWorkspaceId,
        workspaceType
      });

      return {
        token,
        workspace
      };
    } catch (error: any) {
      await ctx.auditLogger('workspace.switch', 'ERROR', {
        workspaceId: targetWorkspaceId,
        workspaceType,
        error: error.message
      });
      throw error;
    }
  }
};

function getPermissionsForFacilityRoles(roles: string[]): string[] {
  const permissionMap: Record<string, string[]> = {
    'admin': [
      'facility.manage_all',
      'facility.manage_employees',
      'facility.manage_schedules',
      'facility.post_positions',
      'facility.manage_contracts',
      'facility.view_analytics',
      'facility.manage_settings',
      'facility.invite_users'
    ],
    'scheduler': [
      'facility.manage_schedules',
      'facility.view_employees',
      'facility.view_contracts',
      'facility.request_staffing'
    ],
    'recruiter': [
      'facility.post_positions',
      'facility.view_applications',
      'facility.manage_contracts',
      'facility.view_professionals'
    ],
    'employee': [
      'facility.view_schedule',
      'facility.request_timeoff',
      'facility.view_contracts'
    ]
  };

  const allPermissions = new Set<string>();

  roles.forEach(role => {
    const perms = permissionMap[role] || permissionMap['employee'];
    perms.forEach(p => allPermissions.add(p));
  });

  return Array.from(allPermissions);
}

