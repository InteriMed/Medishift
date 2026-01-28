import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../../services/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { appendAudit } from '../../common/utils';

const UpdateMeSchema = z.object({
  preferredName: z.string().optional(),
  language: z.enum(['en', 'fr', 'de', 'it']).optional(),
  phone: z.string().optional(),
  emergencyContact: z.object({
    name: z.string(),
    relationship: z.string(),
    phone: z.string(),
  }).optional(),
});

export const updateMeAction: ActionDefinition<typeof UpdateMeSchema, void> = {
  id: "profile.update_me",
  fileLocation: "src/services/actions/catalog/profile/me/updateMe.ts",
  
  requiredPermission: "thread.create",
  
  label: "Update My Profile",
  description: "Update personal details (email/legalName require HR)",
  keywords: ["profile", "update", "personal"],
  icon: "Edit",
  
  schema: UpdateMeSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const userRef = doc(db, 'users', ctx.userId);
    
    const updates: any = {
      ...input,
      updatedAt: serverTimestamp(),
    };

    await updateDoc(userRef, updates);

    await appendAudit('users', ctx.userId, {
      uid: ctx.userId,
      action: 'PROFILE_UPDATED',
      metadata: Object.keys(input),
    });

    await ctx.auditLogger('profile.update_me', 'SUCCESS', {
      fieldsUpdated: Object.keys(input),
    });
  }
};

