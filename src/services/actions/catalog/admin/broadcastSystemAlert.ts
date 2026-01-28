import { z } from "zod";
import { ActionDefinition, ActionContext } from "../../types";
import { db, functions } from '../../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

const alertTypeEnum = ['INFO', 'WARNING', 'DOWNTIME'] as const;

const BroadcastSystemAlertSchema = z.object({
  message: z.string(),
  title: z.string(),
  type: z.enum(alertTypeEnum),
  maintenanceWindow: z.object({
    start: z.string(),
    end: z.string(),
  }).optional(),
});

interface BroadcastSystemAlertResult {
  alertId: string;
  sentViaTopic: boolean;
}

export const broadcastSystemAlertAction: ActionDefinition<typeof BroadcastSystemAlertSchema, BroadcastSystemAlertResult> = {
  id: "admin.broadcast_system_alert",
  fileLocation: "src/services/actions/catalog/admin/broadcastSystemAlert.ts",
  requiredPermission: "admin.access",
  label: "Broadcast System Alert",
  description: "Global banner/push for all facilities via FCM Topics.",
  keywords: ["broadcast", "alert", "system", "notification"],
  icon: "Bell",
  schema: BroadcastSystemAlertSchema,
  metadata: {
    riskLevel: "MEDIUM",
  },
  
  handler: async (input: z.infer<typeof BroadcastSystemAlertSchema>, ctx: ActionContext): Promise<BroadcastSystemAlertResult> => {
    const { message, title, type, maintenanceWindow } = input;

    const alertRef = await addDoc(collection(db, 'system_alerts'), {
      title,
      message,
      type,
      maintenanceWindow,
      targetAudience: 'ALL',
      active: true,
      createdBy: ctx.userId,
      createdAt: serverTimestamp(),
    });

    const broadcastNotification = httpsCallable(functions, 'broadcastNotification');
    await broadcastNotification({
      target: 'ALL',
      announcement: {
        title: title,
        body: message,
        priority: type === 'DOWNTIME' ? 'CRITICAL' : type === 'WARNING' ? 'HIGH' : 'LOW',
        actionUrl: '/alerts',
        data: {
          type: 'SYSTEM_ALERT',
          alertId: alertRef.id,
          severity: type,
        }
      }
    });

    return {
      alertId: alertRef.id,
      sentViaTopic: true
    };
  }
};