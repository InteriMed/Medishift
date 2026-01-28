import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { appendAudit } from '../../common/utils';

const UpdateBrandingSchema = z.object({
  logoUrl: z.string().url(),
  faviconUrl: z.string().url().optional(),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i),
  secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i),
  appName: z.string(),
});

export const updateOrgBrandingAction: ActionDefinition<typeof UpdateBrandingSchema, void> = {
  id: "org.update_branding",
  fileLocation: "src/services/actions/catalog/profile/org/updateBranding.ts",
  
  requiredPermission: "admin.access",
  
  label: "Update Organization Branding",
  description: "White-label the PWA (logo, colors, app name)",
  keywords: ["organization", "branding", "white-label", "theme"],
  icon: "Palette",
  
  schema: UpdateBrandingSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const orgRef = doc(db, 'organizations', 'global_config');
    
    await updateDoc(orgRef, {
      branding: input,
      updatedAt: serverTimestamp(),
      updatedBy: ctx.userId,
    });

    await appendAudit('organizations', 'global_config', {
      uid: ctx.userId,
      action: 'BRANDING_UPDATED',
      metadata: Object.keys(input),
    });

    await ctx.auditLogger('org.update_branding', 'SUCCESS', {
      appName: input.appName,
    });
  }
};

