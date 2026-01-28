import { z } from "zod";
import { ActionDefinition } from "../../types";
import { db } from '../../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

const GetPollResultsSchema = z.object({
  announcementId: z.string(),
});

interface PollResultsResponse {
  question: string;
  options: string[];
  results: Array<{
    option: string;
    votes: number;
    voters: string[];
    percentage: number;
  }>;
  totalVotes: number;
  isExpired: boolean;
  expiresAt?: number;
}

export const getPollResultsAction: ActionDefinition<typeof GetPollResultsSchema, PollResultsResponse> = {
  id: "announcement.get_poll_results",
  fileLocation: "src/services/actions/catalog/messages/getPollResults.ts",
  
  requiredPermission: "thread.read",
  
  label: "Get Poll Results",
  description: "Retrieve poll voting results for an announcement",
  keywords: ["poll", "vote", "results", "survey"],
  icon: "BarChart3",
  
  schema: GetPollResultsSchema,
  
  metadata: {
    autoToast: false,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const { announcementId } = input;

    const announcementRef = doc(db, 'announcements', announcementId);
    const announcementSnap = await getDoc(announcementRef);

    if (!announcementSnap.exists()) {
      throw new Error('Announcement not found');
    }

    const announcementData = announcementSnap.data();
    const pollData = announcementData.pollData;

    if (!pollData) {
      throw new Error('This announcement does not have a poll');
    }

    const votes = pollData.votes || {};
    let totalVotes = 0;
    const results = pollData.options.map((option: string) => {
      const voters = votes[option] || [];
      totalVotes += voters.length;
      return {
        option,
        votes: voters.length,
        voters,
        percentage: 0,
      };
    });

    results.forEach((result: any) => {
      result.percentage = totalVotes > 0 ? (result.votes / totalVotes) * 100 : 0;
    });

    const isExpired = pollData.expiresAt ? Date.now() > pollData.expiresAt : false;

    await ctx.auditLogger('announcement.get_poll_results', 'SUCCESS', {
      announcementId,
      totalVotes,
    });

    return {
      question: pollData.question,
      options: pollData.options,
      results,
      totalVotes,
      isExpired,
      expiresAt: pollData.expiresAt,
    };
  }
};

