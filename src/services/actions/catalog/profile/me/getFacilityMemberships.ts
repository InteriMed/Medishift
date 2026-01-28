import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { FIRESTORE_COLLECTIONS } from '../../../../../config/keysDatabase';

const GetFacilityMembershipsSchema = z.object({
  userId: z.string(),
});

interface FacilityMembership {
  facilityId: string;
  facilityProfileId?: string;
  facilityName: string;
  role: string;
  addedAt?: any;
}

interface GetFacilityMembershipsResult {
  memberships: FacilityMembership[];
}

export const getFacilityMembershipsAction: ActionDefinition<typeof GetFacilityMembershipsSchema, GetFacilityMembershipsResult> = {
  id: "profile.get_facility_memberships",
  fileLocation: "src/services/actions/catalog/profile/me/getFacilityMemberships.ts",
  
  requiredPermission: "thread.read",
  
  label: "Get Facility Memberships",
  description: "Get list of facilities user is a member of",
  keywords: ["facility", "membership", "list"],
  icon: "Building",
  
  schema: GetFacilityMembershipsSchema,
  
  metadata: {
    autoToast: false,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const { userId } = input;

    if (userId !== ctx.userId && !ctx.userPermissions.includes('admin.access')) {
      throw new Error('Access denied: You can only view your own facility memberships');
    }

    const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      throw new Error('User not found');
    }

    const userData = userSnap.data();
    const memberships = userData.facilityMemberships || [];

    await ctx.auditLogger('profile.get_facility_memberships', 'SUCCESS', {
      userId,
      membershipCount: memberships.length,
    });

    return {
      memberships,
    };
  }
};

