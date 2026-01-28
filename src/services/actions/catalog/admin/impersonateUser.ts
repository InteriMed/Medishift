import { z } from "zod";
import { ActionDefinition, ActionContext } from "../../types";
import { db, functions } from '../../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

const ImpersonateUserSchema = z.object({
  targetUserId: z.string(),
  reason: z.string(),
  durationMinutes: z.number().max(60).default(15), // Cap at 60 mins for safety
});

interface ImpersonateUserResult {
  sessionId: string;
  expiresAt: string;
  masqueradeContext: {
    realUser: string;
    effectiveUser: string;
  };
}

export const impersonateUserAction: ActionDefinition<typeof ImpersonateUserSchema, ImpersonateUserResult> = {
  id: "admin.impersonate_user",
  fileLocation: "src/services/actions/catalog/admin/impersonateUser.ts",
  requiredPermission: "admin.access",
  label: "Impersonate User (Masquerade)",
  description: "Generate short-lived token to debug user issues (maintains audit.realUser)",
  keywords: ["impersonate", "masquerade", "admin", "debug"],
  icon: "UserCheck",
  schema: ImpersonateUserSchema,
  metadata: {
    riskLevel: "HIGH",
  },
  
  handler: async (input: z.infer<typeof ImpersonateUserSchema>, ctx: ActionContext): Promise<ImpersonateUserResult> => {
    const { targetUserId, reason, durationMinutes } = input;

    const targetUserSnap = await getDoc(doc(db, 'users', targetUserId));
    if (!targetUserSnap.exists()) {
      throw new Error('Target user not found');
    }

    const targetUserData = targetUserSnap.data();
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    const startImpersonation = httpsCallable(functions, 'startImpersonation');
    const result = await startImpersonation({
      targetUserId,
    });

    const sessionId = (result.data as any).sessionId;

    await ctx.auditLogger('admin.impersonate_user', 'SUCCESS', {
      targetUserId,
      reason,
      durationMinutes,
      realUser: ctx.userId,
      effectiveUser: targetUserId,
      severity: 'CRITICAL',
      warning: 'ADMIN MASQUERADE INITIATED'
    });

    return {
      sessionId,
      expiresAt: expiresAt.toISOString(),
      masqueradeContext: {
        realUser: ctx.userId,
        effectiveUser: targetUserId,
      },
    };
  }
};