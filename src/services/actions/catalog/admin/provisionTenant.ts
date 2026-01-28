import { z } from "zod";
import { ActionDefinition } from "../../types";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const db = getFirestore();

const ProvisionTenantSchema = z.object({
  facilityName: z.string(),
  ownerEmail: z.string().email(),
  plan: z.enum(['STARTER', 'PRO', 'ENTERPRISE']),
  modules: z.array(z.string()),
  address: z.object({
    street: z.string(),
    city: z.string(),
    zip: z.string(),
    canton: z.string(),
  }).optional(),
});

export const provisionTenantAction: ActionDefinition = {
  id: "admin.provision_tenant",
  riskLevel: "HIGH",
  label: "Provision Tenant",
  description: "Set up new facility with default settings.",
  schema: ProvisionTenantSchema,
  
  handler: async (input, ctx) => {
    const { facilityName, ownerEmail, plan, modules, address } = input;

    // 1. Create Facility Profile
    // Using auto-ID for new facilities
    const facilityRef = db.collection('facilityProfiles').doc();
    const facilityId = facilityRef.id;

    await facilityRef.set({
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
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
      },
      verification: {
        status: 'PENDING', // Needs document upload later
        verified: false
      },
      createdAt: FieldValue.serverTimestamp(),
      createdBy: ctx.userId,
    });

    // 2. Create Default Configs (Sub-collection or separate collection)
    // We prefer a separate collection `facility_configs` for operational rules
    // so we don't bloat the main profile.
    await db.collection('facility_configs').doc(facilityId).set({
      facilityId,
      minStaffRules: {},
      breakRules: {
        lunchDuration: 45, // Swiss standard
        breakFrequency: 240, // 4 hours
        minBreakDuration: 15,
      },
      overtimeThreshold: 50, // 50h/week max
      allowFloaters: false,
    });

    // 3. Send Invite (Stub)
    // Real implementation would add to `facilityInvitations` collection
    await db.collection('facilityInvitations').add({
      facilityId,
      invitedEmail: ownerEmail,
      invitedBy: ctx.userId,
      roles: ['FACILITY_OWNER'],
      status: 'pending',
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000) // 48h
    });

    return {
      facilityId,
      invitationSent: true,
    };
  }
};