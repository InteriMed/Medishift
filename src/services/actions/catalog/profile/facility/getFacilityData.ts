import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

const GetFacilityDataSchema = z.object({
  facilityId: z.string(),
});

interface FacilityData {
  [key: string]: any;
}

export const getFacilityDataAction: ActionDefinition<typeof GetFacilityDataSchema, FacilityData> = {
  id: "profile.facility.get_data",
  fileLocation: "src/services/actions/catalog/profile/facility/getFacilityData.ts",
  
  requiredPermission: "thread.create",
  
  label: "Get Facility Data",
  description: "Get complete facility profile data",
  keywords: ["facility", "profile", "get", "read"],
  icon: "Building",
  
  schema: GetFacilityDataSchema,
  
  metadata: {
    autoToast: false,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const facilityRef = doc(db, 'facilityProfiles', input.facilityId);
    const facilitySnap = await getDoc(facilityRef);

    if (!facilitySnap.exists()) {
      throw new Error('Facility not found');
    }

    const facilityData = facilitySnap.data();

    await ctx.auditLogger('profile.facility.get_data', 'SUCCESS', {
      facilityId: input.facilityId,
    });

    return facilityData as FacilityData;
  }
};

