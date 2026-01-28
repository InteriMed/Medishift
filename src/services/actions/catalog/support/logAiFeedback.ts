import { z } from "zod";
import { ActionDefinition } from "../../../flows/types";
import { db } from '../../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const LogAiFeedbackSchema = z.object({
  messageId: z.string(),
  conversationId: z.string(),
  rating: z.enum(['thumbs_up', 'thumbs_down']),
  correction: z.string().optional(),
  category: z.enum(['INCORRECT', 'UNHELPFUL', 'INAPPROPRIATE', 'SLOW', 'EXCELLENT']).optional(),
});

export const logAiFeedbackAction: ActionDefinition<typeof LogAiFeedbackSchema, void> = {
  id: "support.log_ai_feedback",
  fileLocation: "src/services/actions/catalog/support/logAiFeedback.ts",
  
  requiredPermission: "thread.create",
  
  label: "Log AI Feedback",
  description: "Submit feedback on AI response quality",
  keywords: ["feedback", "ai", "quality", "rating"],
  icon: "ThumbsUp",
  
  schema: LogAiFeedbackSchema,
  
  metadata: {
    autoToast: false,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const { messageId, conversationId, rating, correction, category } = input;

    const feedbackRef = collection(db, 'ai_feedback');
    await addDoc(feedbackRef, {
      messageId,
      conversationId,
      userId: ctx.userId,
      facilityId: ctx.facilityId,
      rating,
      correction,
      category,
      createdAt: serverTimestamp(),
    });

    // If negative feedback, flag for admin review
    if (rating === 'thumbs_down') {
      const lowRatedRef = collection(db, 'ai_low_rated_responses');
      await addDoc(lowRatedRef, {
        messageId,
        conversationId,
        userId: ctx.userId,
        correction,
        category,
        status: 'PENDING_REVIEW',
        createdAt: serverTimestamp(),
      });
    }

    await ctx.auditLogger('support.log_ai_feedback', 'SUCCESS', {
      messageId,
      rating,
      hasCorrection: !!correction,
    });
  }
};

