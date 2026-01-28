import { z } from "zod";
import { ActionDefinition, ActionContext } from "../../types";
import { db } from '../../../services/firebase';
import { doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { appendAudit } from '../common/utils';

const collectionTypeEnum = ['messages', 'tickets', 'announcements', 'policies', 'hr_reports'] as const;

const MarkReadSchema = z.object({
  collectionType: z.enum(collectionTypeEnum),
  threadId: z.string(),
});

export const markReadAction: ActionDefinition<typeof MarkReadSchema, void> = {
  id: "thread.mark_read",
  fileLocation: "src/services/actions/catalog/messages/markRead.ts",
  
  requiredPermission: "thread.read",
  
  label: "Mark as Read",
  description: "Mark a thread as read",
  keywords: ["read", "seen", "mark"],
  icon: "Eye",
  
  schema: MarkReadSchema,
  
  metadata: {
    autoToast: false,
    riskLevel: 'LOW',
  },

  handler: async (input: z.infer<typeof MarkReadSchema>, ctx: ActionContext): Promise<void> => {
    const { collectionType, threadId } = input;

    const threadRef = doc(db, collectionType, threadId);
    
    await updateDoc(threadRef, {
      'metadata.seenBy': arrayUnion(ctx.userId),
      updatedAt: serverTimestamp(),
    });

    await appendAudit(collectionType, threadId, {
      uid: ctx.userId,
      action: 'MARKED_READ',
      ip: ctx.ipAddress,
    });

    await ctx.auditLogger('thread.mark_read', 'SUCCESS', {
      threadId,
      collectionType,
    });
  }
};

