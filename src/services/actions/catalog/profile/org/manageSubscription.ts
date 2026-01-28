import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../../services/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { appendAudit } from '../../common/utils';

const ManageSubscriptionSchema = z.object({
  planType: z.enum(['BASIC', 'PRO', 'ENTERPRISE']),
  billingEmail: z.string().email(),
  paymentMethod: z.string().optional(),
  seats: z.number().int().positive(),
});

export const manageOrgSubscriptionAction: ActionDefinition<typeof ManageSubscriptionSchema, void> = {
  id: "org.manage_subscription",
  fileLocation: "src/services/actions/catalog/profile/org/manageSubscription.ts",
  
  requiredPermission: "admin.access",
  
  label: "Manage Organization Subscription",
  description: "Update plan type, billing, and seat count",
  keywords: ["organization", "subscription", "billing", "plan"],
  icon: "CreditCard",
  
  schema: ManageSubscriptionSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'HIGH',
  },

  handler: async (input, ctx) => {
    const orgRef = doc(db, 'organizations', 'global_config');
    
    const featureMap = {
      BASIC: ['calendar', 'messages'],
      PRO: ['calendar', 'messages', 'payroll', 'reporting'],
      ENTERPRISE: ['calendar', 'messages', 'payroll', 'reporting', 'sso', 'ai'],
    };

    await updateDoc(orgRef, {
      subscription: {
        ...input,
        features: featureMap[input.planType],
        updatedAt: serverTimestamp(),
      },
      updatedBy: ctx.userId,
    });

    await appendAudit('organizations', 'global_config', {
      uid: ctx.userId,
      action: 'SUBSCRIPTION_UPDATED',
      metadata: {
        planType: input.planType,
        seats: input.seats,
      },
      severity: 'HIGH',
    });

    await ctx.auditLogger('org.manage_subscription', 'SUCCESS', {
      planType: input.planType,
      seats: input.seats,
    });
  }
};

