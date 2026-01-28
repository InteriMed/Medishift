import { z } from "zod";
import { ActionDefinition, ActionContext } from "../../../types";
import { db } from '../../../../services/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const SetTransferPricingSchema = z.object({
  role: z.string(),
  internalRate: z.number().positive(),
});

export const setTransferPricingAction: ActionDefinition<typeof SetTransferPricingSchema, void> = {
  id: "org.set_transfer_pricing",
  fileLocation: "src/services/actions/catalog/organization/finance/setTransferPricing.ts",
  
  requiredPermission: "org.set_transfer_pricing",
  
  label: "Set Transfer Pricing",
  description: "Define internal rate for cross-facility staff lending",
  keywords: ["finance", "pricing", "internal", "rate"],
  icon: "DollarSign",
  
  schema: SetTransferPricingSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'HIGH',
  },

  handler: async (input: z.infer<typeof SetTransferPricingSchema>, ctx: ActionContext) => {
    const { role, internalRate } = input;

    const pricingRef = doc(db, 'organization_transfer_pricing', role);
    
    await setDoc(pricingRef, {
      role,
      internalRate,
      updatedBy: ctx.userId,
      updatedAt: serverTimestamp(),
    });

    await ctx.auditLogger('org.set_transfer_pricing', 'SUCCESS', {
      role,
      internalRate,
    });
  }
};

