import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { sendNotification } from '../../../../services/notifications';

const BroadcastPolicySchema = z.object({
  policyDocId: z.string(),
  title: z.string(),
  targetFacilities: z.array(z.string()).optional(),
  requiresAcknowledgment: z.boolean().default(true),
});

interface BroadcastPolicyResult {
  recipientCount: number;
}

export const broadcastPolicyAction: ActionDefinition<typeof BroadcastPolicySchema, BroadcastPolicyResult> = {
  id: "org.broadcast_policy",
  fileLocation: "src/services/actions/catalog/organization/governance/broadcastPolicy.ts",
  
  requiredPermission: "org.broadcast_policy",
  
  label: "Broadcast Policy",
  description: "Push SOP to all branches with acknowledgment requirement",
  keywords: ["policy", "broadcast", "sop", "governance"],
  icon: "Radio",
  
  schema: BroadcastPolicySchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'MEDIUM',
  },

  handler: async (input, ctx) => {
    const { policyDocId, title, targetFacilities, requiresAcknowledgment } = input;

    const usersRef = collection(db, 'users');
    let usersQuery = query(usersRef, where('status', '==', 'ACTIVE'));

    if (targetFacilities && targetFacilities.length > 0) {
      usersQuery = query(usersRef, where('facilityId', 'in', targetFacilities));
    }

    const usersSnapshot = await getDocs(usersQuery);

    const policiesRef = collection(db, 'policies');
    const policyDoc = await addDoc(policiesRef, {
      docId: policyDocId,
      title,
      broadcastBy: ctx.userId,
      broadcastAt: serverTimestamp(),
      requiresAcknowledgment,
      targetFacilities: targetFacilities || ['ALL'],
    });

    for (const userDoc of usersSnapshot.docs) {
      await sendNotification({
        title: 'New Policy Broadcast',
        body: title,
        priority: 'HIGH',
        target: {
          type: 'USER',
          userIds: [userDoc.id],
        },
        actionUrl: `/policies/${policyDoc.id}`,
      });
    }

    await ctx.auditLogger('org.broadcast_policy', 'SUCCESS', {
      policyDocId,
      recipientCount: usersSnapshot.size,
    });

    return {
      recipientCount: usersSnapshot.size,
    };
  }
};

