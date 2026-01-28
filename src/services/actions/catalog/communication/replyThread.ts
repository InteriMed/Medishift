import { z } from "zod";
import { ActionDefinition } from "../../types";
import { db } from '../../../services/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { appendAudit } from '../common/utils';

const ReplyThreadSchema = z.object({
  collectionType: z.enum(['messages', 'tickets', 'announcements', 'policies', 'hr_reports']),
  threadId: z.string(),
  content: z.string().min(1),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string(),
    type: z.string(),
    size: z.number(),
  })).optional(),
  visibility: z.enum(['public', 'internal_only']).optional(),
});

interface ReplyResult {
  replyId: string;
}

export const replyThreadAction: ActionDefinition<typeof ReplyThreadSchema, ReplyResult> = {
  id: "thread.reply",
  fileLocation: "src/services/actions/catalog/messages/replyThread.ts",
  
  requiredPermission: "thread.reply",
  
  label: "Reply to Thread",
  description: "Add a reply to an existing thread",
  keywords: ["reply", "comment", "respond"],
  icon: "MessageSquare",
  
  schema: ReplyThreadSchema,
  
  metadata: {
    autoToast: false,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const { collectionType, threadId, visibility, ...replyData } = input;

    if (visibility === 'internal_only' && !ctx.userPermissions.includes('reporting.add_private_note')) {
      throw new Error('Insufficient permissions to add private notes');
    }

    const reply = {
      threadId,
      content: replyData.content,
      createdBy: ctx.userId,
      facilityId: ctx.facilityId,
      createdAt: serverTimestamp(),
      attachments: replyData.attachments || [],
      visibility: visibility || 'public',
      auditEntry: {
        uid: ctx.userId,
        action: 'REPLIED',
        timestamp: Date.now(),
        ip: ctx.ipAddress,
      },
    };

    const repliesCollection = `${collectionType}_replies`;
    const replyRef = await addDoc(collection(db, repliesCollection), reply);

    const threadRef = doc(db, collectionType, threadId);
    await updateDoc(threadRef, {
      lastReplyAt: serverTimestamp(),
      lastReplyBy: ctx.userId,
      replyCount: arrayUnion(replyRef.id).length,
    });

    await appendAudit(collectionType, threadId, {
      uid: ctx.userId,
      action: 'REPLIED',
      metadata: { replyId: replyRef.id, visibility },
    });

    await ctx.auditLogger('thread.reply', 'SUCCESS', {
      threadId,
      replyId: replyRef.id,
      collectionType,
    });

    return {
      replyId: replyRef.id,
    };
  }
};

