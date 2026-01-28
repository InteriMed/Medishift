import { z } from "zod";
import { ActionDefinition } from "../../types";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const db = getFirestore();

const ManageBillingSchema = z.object({
  facilityId: z.string(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'OVERDUE', 'CANCELLED']),
  reason: z.string().optional(),
});

export const manageBillingAction: ActionDefinition = {
  id: "admin.manage_billing",
  riskLevel: "HIGH",
  label: "Manage Billing Status",
  description: "Activate, suspend, or cancel facility access.",
  schema: ManageBillingSchema,
  
  handler: async (input, ctx) => {
    const { facilityId, status, reason } = input;

    // We store status in the main profile for easy Frontend access
    const facilityRef = db.collection('facilityProfiles').doc(facilityId);
    
    // 1. Prepare Updates
    const updates: any = {
      'billingInformation.status': status,
      'billingInformation.updatedAt': FieldValue.serverTimestamp(),
      'billingInformation.updatedBy': ctx.userId,
    };

    if (status === 'SUSPENDED') {
      updates['billingInformation.suspendedAt'] = FieldValue.serverTimestamp();
      updates['billingInformation.suspensionReason'] = reason;
      // Also potentially disable all facility admins? 
      // For now, we rely on the Middleware (hook.ts) to check this status field.
    } else if (status === 'ACTIVE') {
      updates['billingInformation.suspendedAt'] = FieldValue.delete();
      updates['billingInformation.suspensionReason'] = FieldValue.delete();
    }

    // 2. Execute
    await facilityRef.update(updates);

    // 3. Audit
    await ctx.auditLogger('admin.manage_billing', 'SUCCESS', {
      facilityId,
      status,
      reason,
      severity: status === 'SUSPENDED' ? 'CRITICAL' : 'HIGH'
    });
  }
};