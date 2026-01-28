import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';

const LogFphCreditsSchema = z.object({
  userId: z.string(),
  points: z.number().positive(),
  date: z.string(),
  topic: z.string(),
  category: z.enum(['CLINICAL_PHARMACY', 'PHARMACEUTICAL_CARE', 'MANAGEMENT', 'OTHER']),
  proofFileUrl: z.string().url(),
});

export const logFphCreditsAction: ActionDefinition<typeof LogFphCreditsSchema, void> = {
  id: "education.log_fph_credits",
  fileLocation: "src/services/actions/catalog/education/logFphCredits.ts",
  
  requiredPermission: "education.log_fph_credits",
  
  label: "Log FPH Credits (Swiss Continuing Education)",
  description: "Add points to pharmacist's digital wallet",
  keywords: ["fph", "education", "credits", "swiss", "license"],
  icon: "Award",
  
  schema: LogFphCreditsSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'LOW',
    isSwiss: true,
  },

  handler: async (input, ctx) => {
    const { userId, points, date, topic, category, proofFileUrl } = input;

    const creditsRef = collection(db, 'fph_credits');
    await addDoc(creditsRef, {
      userId,
      points,
      date,
      topic,
      category,
      proofFileUrl,
      loggedBy: ctx.userId,
      createdAt: serverTimestamp(),
    });

    const walletRef = doc(db, 'fph_wallets', userId);
    await updateDoc(walletRef, {
      totalPoints: increment(points),
      [`categoryPoints.${category}`]: increment(points),
      lastUpdated: serverTimestamp(),
    });

    await ctx.auditLogger('education.log_fph_credits', 'SUCCESS', {
      userId,
      points,
      category,
    });
  }
};

