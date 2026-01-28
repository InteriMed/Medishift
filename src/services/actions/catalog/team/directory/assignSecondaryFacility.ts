import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { appendAudit } from '../../common/utils';

const AssignSecondaryFacilitySchema = z.object({
  userId: z.string(),
  targetFacilityId: z.string(),
  accessLevel: z.enum(['GUEST', 'STANDARD']).default('GUEST'),
});

export const assignSecondaryFacilityAction: ActionDefinition<typeof AssignSecondaryFacilitySchema, void> = {
  id: "team.assign_secondary_facility",
  fileLocation: "src/services/actions/catalog/team/directory/assignSecondaryFacility.ts",
  
  requiredPermission: "shift.create",
  
  label: "Assign Secondary Facility",
  description: "Grant floater badge access to another facility",
  keywords: ["floater", "facility", "access", "badge"],
  icon: "Building",
  
  schema: AssignSecondaryFacilitySchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'MEDIUM',
  },

  handler: async (input, ctx) => {
    const { userId, targetFacilityId, accessLevel } = input;

    const userRef = doc(db, 'users', userId);

    await updateDoc(userRef, {
      secondaryFacilities: arrayUnion({
        facilityId: targetFacilityId,
        accessLevel,
        grantedAt: Date.now(),
        grantedBy: ctx.userId,
      }),
      updatedAt: serverTimestamp(),
    });

    await appendAudit('users', userId, {
      uid: ctx.userId,
      action: 'SECONDARY_FACILITY_ASSIGNED',
      metadata: {
        targetFacilityId,
        accessLevel,
      },
    });

    await ctx.auditLogger('team.assign_secondary_facility', 'SUCCESS', {
      userId,
      targetFacilityId,
      accessLevel,
    });
  }
};

