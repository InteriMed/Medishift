import { z } from "zod";
import { ActionDefinition } from "../../types";
import { db } from '../../../services/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';

const FetchThreadSchema = z.object({
  collectionType: z.enum(['messages', 'tickets', 'announcements', 'policies', 'hr_reports']),
  threadId: z.string(),
  includeReplies: z.boolean().optional(),
});

interface FetchThreadResult {
  thread: any;
  replies?: any[];
  canAccess: boolean;
}

export const fetchThreadAction: ActionDefinition<typeof FetchThreadSchema, FetchThreadResult> = {
  id: "thread.fetch",
  fileLocation: "src/services/actions/catalog/messages/fetchThread.ts",
  
  requiredPermission: "thread.read",
  
  label: "Fetch Thread",
  description: "Retrieve a thread with optional replies",
  keywords: ["fetch", "get", "retrieve", "thread"],
  icon: "FileText",
  
  schema: FetchThreadSchema,
  
  metadata: {
    autoToast: false,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const { collectionType, threadId, includeReplies } = input;

    const threadRef = doc(db, collectionType, threadId);
    const threadSnap = await getDoc(threadRef);

    if (!threadSnap.exists()) {
      throw new Error('Thread not found');
    }

    const threadData = { id: threadSnap.id, ...threadSnap.data() };

    let canAccess = true;

    switch (collectionType) {
      case 'messages':
        canAccess = threadData.participants?.includes(ctx.userId) || false;
        break;

      case 'tickets':
        canAccess = 
          threadData.createdBy === ctx.userId ||
          threadData.assignedTo === ctx.userId ||
          ctx.userPermissions.includes('ticket.manage');
        break;

      case 'hr_reports':
        canAccess = 
          (!threadData.isAnonymous && threadData.createdBy === ctx.userId) ||
          (threadData.isAnonymous && threadData.createdByHash === hashUserId(ctx.userId)) ||
          ctx.userPermissions.includes('reporting.read');
        break;

      case 'announcements':
      case 'policies':
        canAccess = true;
        break;
    }

    if (!canAccess) {
      throw new Error('Access denied to this thread');
    }

    if (threadData.isAnonymous && !ctx.userPermissions.includes('reporting.read')) {
      threadData.createdBy = 'Anonymous User';
      delete threadData.createdByHash;
    }

    let replies = [];
    if (includeReplies) {
      const repliesCollection = `${collectionType}_replies`;
      const repliesQuery = query(
        collection(db, repliesCollection),
        where('threadId', '==', threadId),
        orderBy('createdAt', 'asc')
      );

      const repliesSnap = await getDocs(repliesQuery);
      replies = repliesSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(reply => {
          if (reply.visibility === 'internal_only') {
            return ctx.userPermissions.includes('reporting.add_private_note');
          }
          return true;
        });
    }

    await ctx.auditLogger('thread.fetch', 'SUCCESS', {
      threadId,
      collectionType,
    });

    return {
      thread: threadData,
      replies: includeReplies ? replies : undefined,
      canAccess,
    };
  }
};

function hashUserId(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `HASH_${Math.abs(hash).toString(36)}`;
}

