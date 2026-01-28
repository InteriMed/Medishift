import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { appendAudit } from '../../common/utils';

const ReactivateUserSchema = z.object({
  userId: z.string(),
  reactivationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().optional(),
});

export const reactivateUserAction: ActionDefinition<typeof ReactivateUserSchema, void> = {
  id: "team.reactivate_user",
  fileLocation: "src/services/actions/catalog/team/lifecycle/reactivateUser.ts",
  
  requiredPermission: "admin.access",
  
  label: "Reactivate User",
  description: "Reactivate seasonal or returning employee",
  keywords: ["reactivate", "return", "seasonal", "locum"],
  icon: "UserCheck",
  
  schema: ReactivateUserSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'MEDIUM',
  },

  handler: async (input, ctx) => {
    const { userId, reactivationDate, notes } = input;

    const userRef = doc(db, 'users', userId);
    
    await updateDoc(userRef, {
      employmentStatus: 'ACTIVE',
      reactivationDate,
      reactivatedBy: ctx.userId,
      reactivatedAt: serverTimestamp(),
      reactivationNotes: notes || '',
      updatedAt: serverTimestamp(),
    });

    await appendAudit('users', userId, {
      uid: ctx.userId,
      action: 'REACTIVATED',
      metadata: {
        reactivationDate,
      },
    });

    await ctx.auditLogger('team.reactivate_user', 'SUCCESS', {
      userId,
      reactivationDate,
    });
  }
};

