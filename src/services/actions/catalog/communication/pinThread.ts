import { z } from "zod";
import { ActionDefinition, ActionContext } from "../../types";
import { db } from '../../../services/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { appendAudit } from '../common/utils';

const collectionTypeEnum = ['messages', 'tickets', 'announcements', 'policies', 'hr_reports'] as const;

const PinThreadSchema = z.object({
  collectionType: z.enum(collectionTypeEnum),
  threadId: z.string(),
  isPinned: z.boolean(),
});

export const pinThreadAction: ActionDefinition<typeof PinThreadSchema, void> = {
  id: "thread.pin",
  fileLocation: "src/services/actions/catalog/messages/pinThread.ts",
  
  requiredPermission: "thread.create",
  
  label: "Pin/Unpin Thread",
  description: "Toggle thread pin status",
  keywords: ["pin", "sticky", "important"],
  icon: "Pin",
  
  schema: PinThreadSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'LOW',
  },

  handler: async (input: z.infer<typeof PinThreadSchema>, ctx: ActionContext): Promise<void> => {
    const { collectionType, threadId, isPinned } = input;

    const threadRef = doc(db, collectionType, threadId);
    
    await updateDoc(threadRef, {
      'metadata.isPinned': isPinned,
      updatedAt: serverTimestamp(),
    });

    await appendAudit(collectionType, threadId, {
      uid: ctx.userId,
      action: isPinned ? 'PINNED' : 'UNPINNED',
    });

    await ctx.auditLogger('thread.pin', 'SUCCESS', {
      threadId,
      collectionType,
      isPinned,
    });
  }
};

