import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { appendAudit } from '../../common/utils';

const UpdateSettingsSchema = z.object({
  facilityId: z.string(),
  openingHours: z.record(z.string(), z.object({
    open: z.string(),
    close: z.string(),
    closed: z.boolean(),
  })).optional(),
  timezone: z.string().optional(),
  address: z.object({
    street: z.string(),
    city: z.string(),
    zip: z.string(),
    canton: z.string(),
  }).optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional(),
});

export const updateFacilitySettingsAction: ActionDefinition<typeof UpdateSettingsSchema, void> = {
  id: "facility.update_settings",
  fileLocation: "src/services/actions/catalog/profile/facility/updateSettings.ts",
  
  requiredPermission: "admin.access",
  
  label: "Update Facility Settings",
  description: "Update workplace settings (hours, address, contact)",
  keywords: ["facility", "settings", "hours", "location"],
  icon: "Building",
  
  schema: UpdateSettingsSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const { facilityId, ...updates } = input;

    if (ctx.facilityId !== facilityId && !ctx.userPermissions.includes('admin.access')) {
      throw new Error('Cannot modify other facility settings');
    }

    const facilityRef = doc(db, 'facility_profiles', facilityId);
    
    await updateDoc(facilityRef, {
      ...updates,
      updatedAt: serverTimestamp(),
      updatedBy: ctx.userId,
    });

    await appendAudit('facility_profiles', facilityId, {
      uid: ctx.userId,
      action: 'SETTINGS_UPDATED',
      metadata: Object.keys(updates),
    });

    await ctx.auditLogger('facility.update_settings', 'SUCCESS', {
      facilityId,
      fieldsUpdated: Object.keys(updates),
    });
  }
};

