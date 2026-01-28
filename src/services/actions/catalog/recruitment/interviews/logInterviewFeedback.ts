import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../../services/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';

const LogInterviewFeedbackSchema = z.object({
  interviewId: z.string(),
  score: z.number().min(1).max(5),
  decision: z.enum(['HIRE', 'REJECT', 'SECOND_ROUND']),
  notes: z.string(),
  strengths: z.array(z.string()).optional(),
  weaknesses: z.array(z.string()).optional(),
});

interface LogInterviewFeedbackResult {
  feedbackId: string;
}

export const logInterviewFeedbackAction: ActionDefinition<typeof LogInterviewFeedbackSchema, LogInterviewFeedbackResult> = {
  id: "recruitment.log_interview_feedback",
  fileLocation: "src/services/actions/catalog/recruitment/interviews/logInterviewFeedback.ts",
  
  requiredPermission: "recruitment.log_interview_feedback",
  
  label: "Log Interview Feedback",
  description: "Record interview notes and hiring decision (hidden from candidate)",
  keywords: ["recruitment", "interview", "feedback", "notes"],
  icon: "FileText",
  
  schema: LogInterviewFeedbackSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'MEDIUM',
  },

  handler: async (input, ctx) => {
    const { interviewId, score, decision, notes, strengths, weaknesses } = input;

    const feedbackRef = collection(db, 'recruitment_interview_feedback');
    const feedbackDoc = await addDoc(feedbackRef, {
      interviewId,
      score,
      decision,
      notes,
      strengths: strengths || [],
      weaknesses: weaknesses || [],
      createdBy: ctx.userId,
      createdAt: serverTimestamp(),
      visibility: 'HIRING_TEAM_ONLY',
    });

    const interviewRef = doc(db, 'recruitment_interviews', interviewId);
    await updateDoc(interviewRef, {
      status: 'COMPLETED',
      completedAt: serverTimestamp(),
      feedbackId: feedbackDoc.id,
      decision,
    });

    await ctx.auditLogger('recruitment.log_interview_feedback', 'SUCCESS', {
      interviewId,
      feedbackId: feedbackDoc.id,
      decision,
      score,
    });

    return {
      feedbackId: feedbackDoc.id,
    };
  }
};

