import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const SetAlertSchema = z.object({
  criteria: z.object({
    roles: z.array(z.string()).optional(),
    minRate: z.number().optional(),
    maxDistanceKM: z.number().optional(),
    daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
    cantons: z.array(z.string()).optional(),
  }),
  active: z.boolean().default(true),
});

interface SetAlertResult {
  alertId: string;
}

export const setAlertAction: ActionDefinition<typeof SetAlertSchema, SetAlertResult> = {
  id: "marketplace.set_alert",
  fileLocation: "src/services/actions/catalog/marketplace/professional/setAlert.ts",
  
  requiredPermission: "marketplace.set_alert",
  
  label: "Set Mission Alert",
  description: "Get notified when matching missions appear",
  keywords: ["marketplace", "alert", "notification"],
  icon: "Bell",
  
  schema: SetAlertSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const { criteria, active } = input;

    const alertsRef = collection(db, 'marketplace_alerts');
    const alertDoc = await addDoc(alertsRef, {
      userId: ctx.userId,
      criteria,
      active,
      createdAt: serverTimestamp(),
    });

    await ctx.auditLogger('marketplace.set_alert', 'SUCCESS', {
      alertId: alertDoc.id,
      criteria,
    });

    return {
      alertId: alertDoc.id,
    };
  }
};

