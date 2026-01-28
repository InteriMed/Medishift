import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const EnrollMemberSchema = z.object({
  userId: z.string(),
  zones: z.array(z.string()),
  skills: z.array(z.string()),
  maxDistanceKM: z.number().default(50),
  weeklyAvailability: z.number().min(0).max(100),
});

export const enrollMemberAction: ActionDefinition<typeof EnrollMemberSchema, void> = {
  id: "pool.enroll_member",
  fileLocation: "src/services/actions/catalog/organization/pool/enrollMember.ts",
  
  requiredPermission: "pool.enroll_member",
  
  label: "Enroll Pool Member",
  description: "Tag user as floater for cross-facility assignments",
  keywords: ["pool", "floater", "flexible", "network"],
  icon: "Users",
  
  schema: EnrollMemberSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const { userId, zones, skills, maxDistanceKM, weeklyAvailability } = input;

    const poolMemberRef = doc(db, 'floating_pool_members', userId);
    
    await setDoc(poolMemberRef, {
      userId,
      homeFacilityId: ctx.facilityId,
      zones,
      skills,
      maxDistanceKM,
      weeklyAvailability,
      enrolledAt: serverTimestamp(),
      enrolledBy: ctx.userId,
    });

    await ctx.auditLogger('pool.enroll_member', 'SUCCESS', {
      userId,
      zones,
    });
  }
};

