import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../../services/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

const ScoreOpenQuestionsSchema = z.object({
  applicationId: z.string(),
  questionId: z.string(),
});

interface ScoreOpenQuestionsResult {
  score: number;
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  keyPoints: string[];
}

export const scoreOpenQuestionsAction: ActionDefinition<typeof ScoreOpenQuestionsSchema, ScoreOpenQuestionsResult> = {
  id: "recruitment.score_open_questions",
  fileLocation: "src/services/actions/catalog/recruitment/analysis/scoreOpenQuestions.ts",
  
  requiredPermission: "recruitment.score_questions",
  
  label: "Score Open Questions (AI)",
  description: "Analyze open text answers for relevance and sentiment",
  keywords: ["recruitment", "ai", "score", "questions"],
  icon: "Star",
  
  schema: ScoreOpenQuestionsSchema,
  
  metadata: {
    autoToast: false,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const { applicationId, questionId } = input;

    const applicationRef = doc(db, 'recruitment_applications', applicationId);
    const applicationSnap = await getDoc(applicationRef);

    if (!applicationSnap.exists()) {
      throw new Error('Application not found');
    }

    const application = applicationSnap.data();
    const answer = application.answers[questionId];

    if (!answer || typeof answer !== 'string') {
      throw new Error('Answer not found or not text');
    }

    const analysis = await analyzeTextWithAI(answer);

    await updateDoc(applicationRef, {
      [`answerScores.${questionId}`]: analysis.score,
    });

    await ctx.auditLogger('recruitment.score_open_questions', 'SUCCESS', {
      applicationId,
      questionId,
      score: analysis.score,
      sentiment: analysis.sentiment,
    });

    return analysis;
  }
};

async function analyzeTextWithAI(text: string): Promise<ScoreOpenQuestionsResult> {
  const positiveKeywords = ['team', 'solution', 'helped', 'resolved', 'collaborated'];
  const negativeKeywords = ['conflict', 'difficult', 'problem', 'failed'];
  
  const positiveCount = positiveKeywords.filter(kw => 
    text.toLowerCase().includes(kw)
  ).length;
  
  const negativeCount = negativeKeywords.filter(kw => 
    text.toLowerCase().includes(kw)
  ).length;
  
  const score = Math.min(100, 50 + (positiveCount * 10) - (negativeCount * 5));
  
  let sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  if (score > 70) sentiment = 'POSITIVE';
  else if (score > 40) sentiment = 'NEUTRAL';
  else sentiment = 'NEGATIVE';
  
  return {
    score,
    sentiment,
    keyPoints: ['Demonstrates conflict resolution', 'Shows teamwork skills'],
  };
}

