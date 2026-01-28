import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { appendAudit } from '../../common/utils';

const ConfigureSSOSchema = z.object({
  enabled: z.boolean(),
  provider: z.enum(['AZURE_AD', 'GOOGLE_WORKSPACE', 'OKTA', 'CUSTOM']),
  idpMetadataUrl: z.string().url().optional(),
  clientId: z.string().optional(),
  tenantId: z.string().optional(),
  domainHint: z.string().optional(),
});

export const configureOrgSSOAction: ActionDefinition<typeof ConfigureSSOSchema, void> = {
  id: "org.configure_sso",
  fileLocation: "src/services/actions/catalog/profile/org/configureSso.ts",
  
  requiredPermission: "admin.access",
  
  label: "Configure Organization SSO",
  description: "Connect to Azure AD / Google Workspace / OKTA",
  keywords: ["organization", "sso", "azure", "identity"],
  icon: "Key",
  
  schema: ConfigureSSOSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'HIGH',
  },

  handler: async (input, ctx) => {
    if (input.enabled) {
      if (!input.clientId) {
        throw new Error('clientId is required when SSO is enabled');
      }
    }

    const ssoRef = doc(db, 'organization_sso', 'config');
    
    await setDoc(ssoRef, {
      ...input,
      updatedAt: serverTimestamp(),
      updatedBy: ctx.userId,
    }, { merge: true });

    await appendAudit('organization_sso', 'config', {
      uid: ctx.userId,
      action: input.enabled ? 'SSO_ENABLED' : 'SSO_DISABLED',
      metadata: {
        provider: input.provider,
      },
      severity: 'CRITICAL',
    });

    await ctx.auditLogger('org.configure_sso', 'SUCCESS', {
      enabled: input.enabled,
      provider: input.provider,
    });
  }
};

