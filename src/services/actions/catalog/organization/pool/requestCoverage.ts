import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const RequestCoverageSchema = z.object({
  facilityId: z.string(),
  date: z.string(),
  role: z.string(),
  reason: z.enum(['SICK_LEAVE', 'PEAK', 'VACATION', 'EMERGENCY']),
  urgency: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
});

interface RequestCoverageResult {
  missionId: string;
}

export const requestCoverageAction: ActionDefinition<typeof RequestCoverageSchema, RequestCoverageResult> = {
  id: "pool.request_coverage",
  fileLocation: "src/services/actions/catalog/organization/pool/requestCoverage.ts",
  
  requiredPermission: "pool.request_coverage",
  
  label: "Request Pool Coverage",
  description: "Create internal mission for pool members (not external marketplace)",
  keywords: ["pool", "coverage", "internal", "mission"],
  icon: "HelpCircle",
  
  schema: RequestCoverageSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'MEDIUM',
  },

  handler: async (input, ctx) => {
    const { facilityId, date, role, reason, urgency } = input;

    const internalMissionsRef = collection(db, 'internal_missions');
    const missionDoc = await addDoc(internalMissionsRef, {
      requestingFacilityId: facilityId,
      date,
      role,
      reason,
      urgency,
      status: 'OPEN',
      visibility: 'POOL_ONLY',
      createdBy: ctx.userId,
      createdAt: serverTimestamp(),
    });

    await ctx.auditLogger('pool.request_coverage', 'SUCCESS', {
      missionId: missionDoc.id,
      facilityId,
      date,
      reason,
    });

    return {
      missionId: missionDoc.id,
    };
  }
};

