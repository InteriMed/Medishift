import { z } from "zod";
import { ActionDefinition, ActionContext } from "../../types";
import { db } from '../../../services/firebase';
import { doc, updateDoc, serverTimestamp, deleteField } from 'firebase/firestore';

const billingStatusEnum = ['ACTIVE', 'SUSPENDED', 'OVERDUE', 'CANCELLED'] as const;

const ManageBillingSchema = z.object({
  facilityId: z.string(),
  status: z.enum(billingStatusEnum),
  reason: z.string().optional(),
});

interface ManageBillingResult {
  success: boolean;
}

export const manageBillingAction: ActionDefinition<typeof ManageBillingSchema, ManageBillingResult> = {
  id: "admin.manage_billing",
  fileLocation: "src/services/actions/catalog/admin/manageBilling.ts",
  requiredPermission: "admin.access",
  label: "Manage Billing Status",
  description: "Activate, suspend, or cancel facility access.",
  keywords: ["billing", "suspend", "activate", "facility"],
  icon: "CreditCard",
  schema: ManageBillingSchema,
  metadata: {
    riskLevel: "HIGH",
  },
  
  handler: async (input: z.infer<typeof ManageBillingSchema>, ctx: ActionContext): Promise<ManageBillingResult> => {
    const { facilityId, status, reason } = input;

    const facilityRef = doc(db, 'facilityProfiles', facilityId);
    
    const updates: any = {
      'billingInformation.status': status,
      'billingInformation.updatedAt': serverTimestamp(),
      'billingInformation.updatedBy': ctx.userId,
    };

    if (status === 'SUSPENDED') {
      updates['billingInformation.suspendedAt'] = serverTimestamp();
      updates['billingInformation.suspensionReason'] = reason;
    } else if (status === 'ACTIVE') {
      updates['billingInformation.suspendedAt'] = deleteField();
      updates['billingInformation.suspensionReason'] = deleteField();
    }

    await updateDoc(facilityRef, updates);

    await ctx.auditLogger('admin.manage_billing', 'SUCCESS', {
      facilityId,
      status,
      reason,
      severity: status === 'SUSPENDED' ? 'CRITICAL' : 'HIGH'
    });

    return { success: true };
  }
};