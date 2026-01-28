import { z } from "zod";
import { ActionDefinition } from "../../../flows/types";
import { functions } from '../../../services/firebase';
import { httpsCallable } from 'firebase/functions';

const CreateAmendmentSchema = z.object({
  originalContractId: z.string(),
  changeType: z.enum(['RATE_CHANGE', 'PERCENTAGE_CHANGE', 'ROLE_CHANGE', 'FACILITY_CHANGE']),
  newValue: z.any(),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().min(10),
});

interface CreateAmendmentResult {
  amendmentId: string;
  amendmentPdfUrl: string;
}

export const createAmendmentAction: ActionDefinition<typeof CreateAmendmentSchema, CreateAmendmentResult> = {
  id: "contracts.create_amendment",
  fileLocation: "src/services/actions/catalog/contracts/createAmendment.ts",
  
  requiredPermission: "admin.access",
  
  label: "Create Contract Amendment (Avenant)",
  description: "Generate one-page addendum linked to original contract",
  keywords: ["amendment", "avenant", "addendum", "contract change"],
  icon: "FilePlus",
  
  schema: CreateAmendmentSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'HIGH',
  },

  handler: async (input, ctx) => {
    const { originalContractId, changeType, newValue, effectiveDate, reason } = input;

    const createAmendmentFunction = httpsCallable(functions, 'createContractAmendment');
    
    const result = await createAmendmentFunction({
      originalContractId,
      changeType,
      newValue,
      effectiveDate,
      reason,
      facilityId: ctx.facilityId,
      createdBy: ctx.userId,
    });

    const data = result.data as any;

    await ctx.auditLogger('contracts.create_amendment', 'SUCCESS', {
      originalContractId,
      amendmentId: data.amendmentId,
      changeType,
    });

    return {
      amendmentId: data.amendmentId,
      amendmentPdfUrl: data.amendmentPdfUrl,
    };
  }
};

