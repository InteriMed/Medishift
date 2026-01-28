import { z } from "zod";
import { ActionDefinition } from "../../types";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

const db = getFirestore();
const messaging = getMessaging();

const BroadcastSystemAlertSchema = z.object({
  message: z.string(),
  title: z.string(),
  type: z.enum(['INFO', 'WARNING', 'DOWNTIME']),
  maintenanceWindow: z.object({
    start: z.string(),
    end: z.string(),
  }).optional(),
});

export const broadcastSystemAlertAction: ActionDefinition = {
  id: "admin.broadcast_system_alert",
  riskLevel: "MEDIUM",
  label: "Broadcast System Alert",
  description: "Global banner/push for all facilities via FCM Topics.",
  schema: BroadcastSystemAlertSchema,
  
  handler: async (input, ctx) => {
    const { message, title, type, maintenanceWindow } = input;

    // 1. Create Alert Document (Frontend pulls this for the Banner)
    const alertRef = await db.collection('system_alerts').add({
      title,
      message,
      type,
      maintenanceWindow,
      targetAudience: 'ALL',
      active: true,
      createdBy: ctx.userId,
      createdAt: FieldValue.serverTimestamp(),
    });

    // 2. 🚀 Send Push via Topic (Scalable Fan-Out)
    // Users subscribe to 'system_alerts' topic on login
    await messaging.sendToTopic('system_alerts', {
      notification: {
        title: title,
        body: message,
      },
      data: {
        type: 'SYSTEM_ALERT',
        alertId: alertRef.id,
        severity: type,
        click_action: '/alerts'
      }
    });

    return {
      alertId: alertRef.id,
      sentViaTopic: true
    };
  }
};