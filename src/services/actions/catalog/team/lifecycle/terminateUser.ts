import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db, functions } from '../../../../services/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { appendAudit } from '../../common/utils';

const TerminateUserSchema = z.object({
  userId: z.string(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.enum(['RESIGNATION', 'DISMISSAL', 'CONTRACT_END', 'RETIREMENT']),
  blockAccessImmediately: z.boolean().default(false),
  notes: z.string().optional(),
});

interface TerminateUserResult {
  checklistItems: string[];
}

export const terminateUserAction: ActionDefinition<typeof TerminateUserSchema, TerminateUserResult> = {
  id: "team.terminate_user",
  fileLocation: "src/services/actions/catalog/team/lifecycle/terminateUser.ts",
  
  requiredPermission: "admin.access",
  
  label: "Terminate User (Offboarding)",
  description: "End employment and trigger offboarding checklist",
  keywords: ["terminate", "offboard", "fire", "resign", "leave"],
  icon: "UserMinus",
  
  schema: TerminateUserSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'HIGH',
  },

  handler: async (input, ctx) => {
    const { userId, endDate, reason, blockAccessImmediately, notes } = input;

    const userRef = doc(db, 'users', userId);
    
    await updateDoc(userRef, {
      employmentStatus: 'TERMINATED',
      terminationDate: endDate,
      terminationReason: reason,
      terminatedBy: ctx.userId,
      terminatedAt: serverTimestamp(),
      terminationNotes: notes || '',
      updatedAt: serverTimestamp(),
    });

    await appendAudit('users', userId, {
      uid: ctx.userId,
      action: 'TERMINATED',
      metadata: {
        reason,
        endDate,
        immediate: blockAccessImmediately,
      },
    });

    if (blockAccessImmediately) {
      const revokeAccessFunction = httpsCallable(functions, 'revokeUserAccess');
      await revokeAccessFunction({ userId });
    }

    const checklistItems = [
      'Return facility badge',
      'Return keys',
      'Return company equipment',
      'Archive access logs',
      'Update payroll system',
      'Generate final payslip',
      'Remove from shift patterns',
      'Transfer pending tasks',
    ];

    await ctx.auditLogger('team.terminate_user', 'SUCCESS', {
      userId,
      reason,
      immediate: blockAccessImmediately,
    });

    return {
      checklistItems,
    };
  }
};

