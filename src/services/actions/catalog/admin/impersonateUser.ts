import { z } from "zod";
import { ActionDefinition } from "../../types";
import { getAuth } from "firebase-admin/auth"; // ⚠️ MUST use Admin SDK
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();
const auth = getAuth();

const ImpersonateUserSchema = z.object({
  targetUserId: z.string(),
  reason: z.string(),
  durationMinutes: z.number().default(15).max(60), // Cap at 60 mins for safety
});

interface ImpersonateUserResult {
  customToken: string;
  expiresAt: string;
  masqueradeContext: {
    realUser: string;
    effectiveUser: string;
  };
}

export const impersonateUserAction: ActionDefinition = {
  id: "admin.impersonate_user",
  riskLevel: "CRITICAL", // Requires 2FA or re-auth ideally
  label: "Impersonate User (Masquerade)",
  description: "Generate short-lived token to debug user issues (maintains audit.realUser)",
  schema: ImpersonateUserSchema,
  
  handler: async (input, ctx) => {
    const { targetUserId, reason, durationMinutes } = input;

    // 1. Verify Target Exists
    const targetUserSnap = await db.collection('users').doc(targetUserId).get();
    if (!targetUserSnap.exists) {
      throw new Error('Target user not found');
    }

    const targetUserData = targetUserSnap.data();
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    // 2. Mint Custom Token (Admin SDK)
    // We embed 'masquerade' claims so the Frontend knows to show the "Exit Spy Mode" banner
    const customToken = await auth.createCustomToken(targetUserId, {
      masquerade: true,
      realUserId: ctx.userId, // The Admin's ID
      masqueradeReason: reason,
      masqueradeExpiry: expiresAt.toISOString(),
      // Carry over essential RBAC roles so they can actually use the app
      facilityId: targetUserData?.facilityId,
      roles: targetUserData?.roles, 
    });

    // 3. 🛡️ Critical Audit Log
    // This action allows seeing private data, so we log it heavily.
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
      customToken,
      expiresAt: expiresAt.toISOString(),
      masqueradeContext: {
        realUser: ctx.userId,
        effectiveUser: targetUserId,
      },
    };
  }
};