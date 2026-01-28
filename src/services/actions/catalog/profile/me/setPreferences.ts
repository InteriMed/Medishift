import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const SetPreferencesSchema = z.object({
  theme: z.enum(['LIGHT', 'DARK', 'AUTO']).optional(),
  notifications: z.object({
    push: z.object({
      shifts: z.boolean(),
      messages: z.boolean(),
      announcements: z.boolean(),
      payroll: z.boolean(),
    }).optional(),
    email: z.object({
      shifts: z.boolean(),
      messages: z.boolean(),
      announcements: z.boolean(),
      payroll: z.boolean(),
      weekly_summary: z.boolean(),
    }).optional(),
    inApp: z.object({
      all: z.boolean(),
    }).optional(),
  }).optional(),
  defaultView: z.string().optional(),
  locale: z.string().optional(),
});

export const setPreferencesAction: ActionDefinition<typeof SetPreferencesSchema, void> = {
  id: "profile.set_preferences",
  fileLocation: "src/services/actions/catalog/profile/me/setPreferences.ts",
  
  requiredPermission: "thread.create",
  
  label: "Set My Preferences",
  description: "Update notification settings and UI preferences",
  keywords: ["preferences", "settings", "notifications", "theme"],
  icon: "Settings",
  
  schema: SetPreferencesSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const preferencesRef = doc(db, 'user_preferences', ctx.userId);
    
    await setDoc(preferencesRef, {
      ...input,
      userId: ctx.userId,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    await ctx.auditLogger('profile.set_preferences', 'SUCCESS', {
      fieldsUpdated: Object.keys(input),
    });
  }
};

