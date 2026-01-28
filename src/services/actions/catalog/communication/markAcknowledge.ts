import { z } from "zod";
import { ActionDefinition, ActionContext } from "../../types";
import { db } from '../../../services/firebase';
import { doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { appendAudit } from '../common/utils';

const acknowledgeCollectionTypeEnum = ['policies', 'announcements'] as const;

const MarkAcknowledgeSchema = z.object({
  collectionType: z.enum(acknowledgeCollectionTypeEnum),
  threadId: z.string(),
});

export const markAcknowledgeAction: ActionDefinition<typeof MarkAcknowledgeSchema, void> = {
  id: "thread.mark_acknowledge",
  fileLocation: "src/services/actions/catalog/messages/markAcknowledge.ts",
  
  requiredPermission: "thread.read",
  
  label: "Acknowledge",
  description: "Acknowledge a policy or announcement",
  keywords: ["acknowledge", "accept", "confirm"],
  icon: "CheckCircle",
  
  schema: MarkAcknowledgeSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'LOW',
  },

  handler: async (input: z.infer<typeof MarkAcknowledgeSchema>, ctx: ActionContext): Promise<void> => {
    const { collectionType, threadId } = input;

    const threadRef = doc(db, collectionType, threadId);
    
    await updateDoc(threadRef, {
      'metadata.acknowledgedBy': arrayUnion(ctx.userId),
      updatedAt: serverTimestamp(),
    });

    await appendAudit(collectionType, threadId, {
      uid: ctx.userId,
      action: 'ACKNOWLEDGED',
      ip: ctx.ipAddress,
      metadata: { acknowledgedAt: Date.now() },
    });

    await ctx.auditLogger('thread.mark_acknowledge', 'SUCCESS', {
      threadId,
      collectionType,
    });
  }
};

