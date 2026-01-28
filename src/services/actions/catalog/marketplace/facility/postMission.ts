import { z } from "zod";
import { ActionDefinition, ActionContext } from "../../../types";
import { db } from '../../../../services/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { appendAudit } from '../../common/utils';

const PostMissionSchema = z.object({
  role: z.string(),
  dates: z.array(z.string()),
  location: z.object({
    address: z.string(),
    city: z.string(),
    canton: z.string(),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number(),
    }).optional(),
  }),
  ratePerHour: z.number().positive(),
  isMarketRate: z.boolean().default(false),
  requirements: z.object({
    skills: z.array(z.string()),
    certifications: z.array(z.string()),
    minExperience: z.number().optional(),
  }),
  targeting: z.enum(['PUBLIC', 'POOL_ONLY', 'FAVORITES'] as const),
  description: z.string(),
  aiDraft: z.boolean().optional(),
});

interface PostMissionResult {
  missionId: string;
  status: string;
}

export const postMissionAction: ActionDefinition<typeof PostMissionSchema, PostMissionResult> = {
  id: "marketplace.post_mission",
  fileLocation: "src/services/actions/catalog/marketplace/facility/postMission.ts",
  
  requiredPermission: "marketplace.post_mission",
  
  label: "Post Mission",
  description: "Create a job posting to fill a gap with qualified talent",
  keywords: ["marketplace", "mission", "job", "posting"],
  icon: "Briefcase",
  
  schema: PostMissionSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'LOW',
  },

  handler: async (input: z.infer<typeof PostMissionSchema>, ctx: ActionContext) => {
    const { ratePerHour, dates, ...missionData } = input;

    const legalMinimumRate = await getLegalMinimumRate(input.role, ctx.facilityId);
    if (ratePerHour < legalMinimumRate) {
      throw new Error(`Rate ${ratePerHour} CHF/hr is below legal minimum (${legalMinimumRate} CHF/hr per CCT)`);
    }

    const facilityRef = doc(db, 'facility_profiles', ctx.facilityId);
    const facilitySnap = await getDoc(facilityRef);
    const facilityName = facilitySnap.exists() ? facilitySnap.data().name : 'Unknown';

    const missionsRef = collection(db, 'marketplace_missions');
    const missionDoc = await addDoc(missionsRef, {
      ...missionData,
      facilityId: ctx.facilityId,
      facilityName,
      ratePerHour,
      dates,
      status: 'PUBLISHED',
      createdBy: ctx.userId,
      createdAt: serverTimestamp(),
      expiresAt: null,
    });

    await appendAudit('marketplace_missions', missionDoc.id, {
      uid: ctx.userId,
      action: 'MISSION_POSTED',
      metadata: { dates, ratePerHour },
    });

    await ctx.auditLogger('marketplace.post_mission', 'SUCCESS', {
      missionId: missionDoc.id,
      dates,
      targeting: input.targeting,
    });

    if (input.targeting === 'PUBLIC') {
      await triggerMissionAlerts(missionDoc.id, input);
    }

    return {
      missionId: missionDoc.id,
      status: 'PUBLISHED',
    };
  }
};

async function getLegalMinimumRate(role: string, facilityId: string): Promise<number> {
  const rateMap: Record<string, number> = {
    'pharmacist': 85,
    'assistant': 60,
    'intern': 45,
  };
  
  return rateMap[role.toLowerCase()] || 50;
}

async function triggerMissionAlerts(missionId: string, missionData: any): Promise<void> {
  // TRIGGER ALERT MATCHING LOGIC
}

