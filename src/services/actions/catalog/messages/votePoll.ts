import { z } from "zod";
import { ActionDefinition } from "../../types";
import { db } from '../../../services/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { appendAudit } from '../common/utils';

const VotePollSchema = z.object({
  announcementId: z.string(),
  option: z.string(),
  remove: z.boolean().optional(),
});

export const votePollAction: ActionDefinition<typeof VotePollSchema, void> = {
  id: "announcement.vote_poll",
  fileLocation: "src/services/actions/catalog/messages/votePoll.ts",
  
  requiredPermission: "thread.read",
  
  label: "Vote in Poll",
  description: "Submit or remove vote in announcement poll",
  keywords: ["vote", "poll", "select"],
  icon: "Vote",
  
  schema: VotePollSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const { announcementId, option, remove } = input;

    const announcementRef = doc(db, 'announcements', announcementId);
    
    const updateField = `pollData.votes.${option}`;
    
    await updateDoc(announcementRef, {
      [updateField]: remove ? arrayRemove(ctx.userId) : arrayUnion(ctx.userId),
      updatedAt: serverTimestamp(),
    });

    await appendAudit('announcements', announcementId, {
      uid: ctx.userId,
      action: remove ? 'VOTE_REMOVED' : 'VOTED',
      metadata: { option },
    });

    await ctx.auditLogger('announcement.vote_poll', 'SUCCESS', {
      announcementId,
      option,
      action: remove ? 'removed' : 'added',
    });
  }
};

