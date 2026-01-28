import { z } from "zod";
import { ActionDefinition, ActionContext } from "../../types";
import { db } from '../../../services/firebase';
import { collection, doc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';

const planEnum = ['STARTER', 'PRO', 'ENTERPRISE'] as const;

const ProvisionTenantSchema = z.object({
  facilityName: z.string(),
  ownerEmail: z.string().email(),
  plan: z.enum(planEnum),
  modules: z.array(z.string()),
  address: z.object({
    street: z.string(),
    city: z.string(),
    zip: z.string(),
    canton: z.string(),
  }).optional(),
});

interface ProvisionTenantResult {
  facilityId: string;
  invitationSent: boolean;
}

export const provisionTenantAction: ActionDefinition<typeof ProvisionTenantSchema, ProvisionTenantResult> = {
  id: "admin.provision_tenant",
  fileLocation: "src/services/actions/catalog/admin/provisionTenant.ts",
  requiredPermission: "admin.access",
  label: "Provision Tenant",
  description: "Set up new facility with default settings.",
  keywords: ["provision", "tenant", "facility", "setup"],
  icon: "Building",
  schema: ProvisionTenantSchema,
  metadata: {
    riskLevel: "HIGH",
  },
  
  handler: async (input: z.infer<typeof ProvisionTenantSchema>, ctx: ActionContext): Promise<ProvisionTenantResult> => {
    const { facilityName, ownerEmail, plan, modules, address } = input;

    const facilityRef = doc(collection(db, 'facilityProfiles'));
    const facilityId = facilityRef.id;

    await setDoc(facilityRef, {
      facilityProfileId: facilityId,
      profileType: 'FACILITY',
      facilityDetails: {
        name: facilityName,
        address,
      },
      billingInformation: {
        status: 'ACTIVE',
        plan,
        modules,
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      verification: {
        status: 'PENDING',
        verified: false
      },
      createdAt: serverTimestamp(),
      createdBy: ctx.userId,
    });

    await setDoc(doc(db, 'facility_configs', facilityId), {
      facilityId,
      minStaffRules: {},
      breakRules: {
        lunchDuration: 45,
        breakFrequency: 240,
        minBreakDuration: 15,
      },
      overtimeThreshold: 50,
      allowFloaters: false,
    });

    await addDoc(collection(db, 'facilityInvitations'), {
      facilityId,
      invitedEmail: ownerEmail,
      invitedBy: ctx.userId,
      roles: ['FACILITY_OWNER'],
      status: 'pending',
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000)
    });

    return {
      facilityId,
      invitationSent: true,
    };
  }
};