import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../../services/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, increment } from 'firebase/firestore';

const RatePartySchema = z.object({
  missionId: z.string(),
  targetId: z.string(),
  score: z.number().min(1).max(5),
  tags: z.array(z.string()),
  comment: z.string().optional(),
});

export const ratePartyAction: ActionDefinition<typeof RatePartySchema, void> = {
  id: "marketplace.rate_party",
  fileLocation: "src/services/actions/catalog/marketplace/transaction/rateParty.ts",
  
  requiredPermission: "marketplace.rate",
  
  label: "Rate Party",
  description: "Rate facility or professional after mission completion (dual-sided)",
  keywords: ["marketplace", "rating", "review", "feedback"],
  icon: "Star",
  
  schema: RatePartySchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const { missionId, targetId, score, tags, comment } = input;

    const missionRef = doc(db, 'marketplace_missions', missionId);
    const missionSnap = await getDoc(missionRef);

    if (!missionSnap.exists()) {
      throw new Error('Mission not found');
    }

    const mission = missionSnap.data();

    const isRatingProfessional = targetId !== ctx.facilityId;

    const ratingsRef = collection(db, 'marketplace_ratings');
    await addDoc(ratingsRef, {
      missionId,
      fromUserId: ctx.userId,
      toUserId: targetId,
      score,
      tags,
      comment,
      ratingType: isRatingProfessional ? 'FACILITY_TO_PRO' : 'PRO_TO_FACILITY',
      createdAt: serverTimestamp(),
    });

    const targetRef = isRatingProfessional 
      ? doc(db, 'users', targetId)
      : doc(db, 'facility_profiles', targetId);

    await updateDoc(targetRef, {
      ratingSum: increment(score),
      reviewCount: increment(1),
    });

    await ctx.auditLogger('marketplace.rate_party', 'SUCCESS', {
      missionId,
      targetId,
      score,
      ratingType: isRatingProfessional ? 'FACILITY_TO_PRO' : 'PRO_TO_FACILITY',
    });
  }
};

