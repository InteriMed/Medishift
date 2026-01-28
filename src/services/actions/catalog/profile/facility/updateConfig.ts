import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { appendAudit } from '../../common/utils';

const UpdateConfigSchema = z.object({
  facilityId: z.string(),
  minStaffRules: z.record(z.string(), z.number()).optional(),
  breakRules: z.object({
    lunchDuration: z.number(),
    breakFrequency: z.number(),
    minBreakDuration: z.number(),
  }).optional(),
  overtimeThreshold: z.number().optional(),
  allowFloaters: z.boolean().optional(),
});

export const updateFacilityConfigAction: ActionDefinition<typeof UpdateConfigSchema, void> = {
  id: "facility.update_config",
  fileLocation: "src/services/actions/catalog/profile/facility/updateConfig.ts",
  
  requiredPermission: "admin.access",
  
  label: "Update Facility Config",
  description: "Update scheduling rules (min staff, breaks, overtime)",
  keywords: ["facility", "config", "rules", "scheduler"],
  icon: "Settings",
  
  schema: UpdateConfigSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'HIGH',
  },

  handler: async (input, ctx) => {
    const { facilityId, ...updates } = input;

    if (ctx.facilityId !== facilityId && !ctx.userPermissions.includes('admin.access')) {
      throw new Error('Cannot modify other facility config');
    }

    const configRef = doc(db, 'facility_configs', facilityId);
    
    await updateDoc(configRef, {
      ...updates,
      updatedAt: serverTimestamp(),
      updatedBy: ctx.userId,
    });

    await appendAudit('facility_configs', facilityId, {
      uid: ctx.userId,
      action: 'CONFIG_UPDATED',
      metadata: Object.keys(updates),
      warning: 'IMPACTS_CALENDAR_VALIDATION',
    });

    await ctx.auditLogger('facility.update_config', 'SUCCESS', {
      facilityId,
      fieldsUpdated: Object.keys(updates),
      warning: 'Changes will affect Calendar Engine validation',
    });
  }
};

