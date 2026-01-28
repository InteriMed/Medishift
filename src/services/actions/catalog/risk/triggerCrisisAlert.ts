import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { sendNotification } from '../../../../services/notifications';

const TriggerCrisisAlertSchema = z.object({
  message: z.string(),
  title: z.string(),
  channel: z.enum(['SMS_BLAST', 'PUSH', 'EMAIL', 'ALL']),
  targetAudience: z.enum(['ALL_STAFF', 'FACILITY', 'ROLE']),
  facilityId: z.string().optional(),
  role: z.string().optional(),
});

interface TriggerCrisisAlertResult {
  recipientCount: number;
}

export const triggerCrisisAlertAction: ActionDefinition<typeof TriggerCrisisAlertSchema, TriggerCrisisAlertResult> = {
  id: "risk.trigger_crisis_alert",
  fileLocation: "src/services/actions/catalog/risk/triggerCrisisAlert.ts",
  
  requiredPermission: "risk.trigger_crisis_alert",
  
  label: "Trigger Crisis Alert",
  description: "Emergency broadcast (bypasses DND, batch recall)",
  keywords: ["crisis", "alert", "emergency", "broadcast"],
  icon: "AlertTriangle",
  
  schema: TriggerCrisisAlertSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'HIGH',
  },

  handler: async (input, ctx) => {
    const { message, title, channel, targetAudience, facilityId, role } = input;

    const usersRef = collection(db, 'users');
    let usersQuery = query(usersRef, where('status', '==', 'ACTIVE'));

    if (targetAudience === 'FACILITY' && facilityId) {
      usersQuery = query(usersRef, where('facilityId', '==', facilityId));
    } else if (targetAudience === 'ROLE' && role) {
      usersQuery = query(usersRef, where('role', '==', role));
    }

    const usersSnapshot = await getDocs(usersQuery);

    for (const userDoc of usersSnapshot.docs) {
      await sendNotification({
        title,
        body: message,
        priority: 'CRITICAL',
        target: {
          type: 'USER',
          userIds: [userDoc.id],
        },
        data: {
          bypassDND: true,
          crisisAlert: true,
        },
      });
    }

    await ctx.auditLogger('risk.trigger_crisis_alert', 'SUCCESS', {
      title,
      channel,
      targetAudience,
      recipientCount: usersSnapshot.size,
      severity: 'CRITICAL',
    });

    return {
      recipientCount: usersSnapshot.size,
    };
  }
};

