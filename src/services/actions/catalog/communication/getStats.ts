import { z } from "zod";
import { ActionDefinition } from "../../types";
import { db } from '../../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

const GetStatsSchema = z.object({
  collectionType: z.enum(['messages', 'tickets', 'announcements', 'policies', 'hr_reports']),
  threadId: z.string(),
});

interface StatsResult {
  seenCount: number;
  seenBy: string[];
  acknowledgedCount: number;
  acknowledgedBy: string[];
  reactions: Record<string, number>;
  reactionsByUser: Record<string, string[]>;
}

export const getStatsAction: ActionDefinition<typeof GetStatsSchema, StatsResult> = {
  id: "thread.get_stats",
  fileLocation: "src/services/actions/catalog/messages/getStats.ts",
  
  requiredPermission: "thread.read",
  
  label: "Get Thread Stats",
  description: "Retrieve metadata stats (seen, acknowledged, reactions)",
  keywords: ["stats", "metadata", "analytics"],
  icon: "BarChart",
  
  schema: GetStatsSchema,
  
  metadata: {
    autoToast: false,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const { collectionType, threadId } = input;

    const threadRef = doc(db, collectionType, threadId);
    const threadSnap = await getDoc(threadRef);

    if (!threadSnap.exists()) {
      throw new Error('Thread not found');
    }

    const threadData = threadSnap.data();
    const metadata = threadData.metadata || {};

    const seenBy = metadata.seenBy || [];
    const acknowledgedBy = metadata.acknowledgedBy || [];
    const reactions = metadata.reactions || {};

    const reactionCounts: Record<string, number> = {};
    Object.entries(reactions).forEach(([emoji, users]) => {
      reactionCounts[emoji] = (users as string[]).length;
    });

    await ctx.auditLogger('thread.get_stats', 'SUCCESS', {
      threadId,
      collectionType,
    });

    return {
      seenCount: seenBy.length,
      seenBy,
      acknowledgedCount: acknowledgedBy.length,
      acknowledgedBy,
      reactions: reactionCounts,
      reactionsByUser: reactions,
    };
  }
};

