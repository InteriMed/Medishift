import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../../services/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { appendAudit } from '../../common/utils';

const ManageWhitelistSchema = z.object({
  facilityId: z.string(),
  allowedIPs: z.array(z.string()).optional(),
  allowedMacAddresses: z.array(z.string()).optional(),
  geofencing: z.object({
    latitude: z.number(),
    longitude: z.number(),
    radiusMeters: z.number(),
  }).optional(),
});

export const manageFacilityWhitelistAction: ActionDefinition<typeof ManageWhitelistSchema, void> = {
  id: "facility.manage_whitelist",
  fileLocation: "src/services/actions/catalog/profile/facility/manageWhitelist.ts",
  
  requiredPermission: "admin.access",
  
  label: "Manage Facility Whitelist",
  description: "Update security whitelist (IPs, MACs, geofencing for Time Clock)",
  keywords: ["facility", "security", "whitelist", "time clock"],
  icon: "Shield",
  
  schema: ManageWhitelistSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'HIGH',
  },

  handler: async (input, ctx) => {
    const { facilityId, ...whitelistData } = input;

    if (ctx.facilityId !== facilityId && !ctx.userPermissions.includes('admin.access')) {
      throw new Error('Cannot modify other facility whitelist');
    }

    const whitelistRef = doc(db, 'facility_whitelists', facilityId);
    
    await setDoc(whitelistRef, {
      ...whitelistData,
      facilityId,
      updatedAt: serverTimestamp(),
      updatedBy: ctx.userId,
    }, { merge: true });

    await appendAudit('facility_whitelists', facilityId, {
      uid: ctx.userId,
      action: 'WHITELIST_UPDATED',
      metadata: Object.keys(whitelistData),
      severity: 'HIGH',
    });

    await ctx.auditLogger('facility.manage_whitelist', 'SUCCESS', {
      facilityId,
      ipCount: whitelistData.allowedIPs?.length || 0,
      geofencingEnabled: !!whitelistData.geofencing,
    });
  }
};

