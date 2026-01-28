import { z } from "zod";
import { ActionDefinition, ActionContext } from "../../types";
import { db } from '../../../services/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { appendAudit } from '../common/utils';

const collectionTypeEnum = ['messages', 'tickets', 'announcements', 'policies', 'hr_reports'] as const;
const priorityEnum = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

const FlagPrioritySchema = z.object({
  collectionType: z.enum(collectionTypeEnum),
  threadId: z.string(),
  priority: z.enum(priorityEnum),
});

export const flagPriorityAction: ActionDefinition<typeof FlagPrioritySchema, void> = {
  id: "thread.flag_priority",
  fileLocation: "src/services/actions/catalog/messages/flagPriority.ts",
  
  requiredPermission: "thread.create",
  
  label: "Flag Priority",
  description: "Update thread priority level",
  keywords: ["priority", "flag", "urgent"],
  icon: "Flag",
  
  schema: FlagPrioritySchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'LOW',
  },

  handler: async (input: z.infer<typeof FlagPrioritySchema>, ctx: ActionContext): Promise<void> => {
    const { collectionType, threadId, priority } = input;

    const threadRef = doc(db, collectionType, threadId);
    
    await updateDoc(threadRef, {
      'metadata.priority': priority,
      updatedAt: serverTimestamp(),
    });

    await appendAudit(collectionType, threadId, {
      uid: ctx.userId,
      action: 'PRIORITY_CHANGED',
      metadata: { newPriority: priority },
    });

    await ctx.auditLogger('thread.flag_priority', 'SUCCESS', {
      threadId,
      collectionType,
      priority,
    });
  }
};

