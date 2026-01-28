import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db, functions } from '../../../../services/firebase';
import { httpsCallable } from 'firebase/functions';

const CreateContractSchema = z.object({
  userId: z.string(),
  facilityId: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  workPercentage: z.number().min(10).max(100).default(100),
  jobTitle: z.string(),
  status: z.enum(['draft', 'pending', 'active']).default('draft'),
  terms: z.record(z.any()).optional(),
});

interface CreateContractResult {
  contractId: string;
}

export const createContractAction: ActionDefinition<typeof CreateContractSchema, CreateContractResult> = {
  id: "contracts.create",
  fileLocation: "src/services/actions/catalog/contracts/createContract.ts",
  
  requiredPermission: "admin.access",
  
  label: "Create Contract",
  description: "Create new employment contract",
  keywords: ["contract", "create", "employment"],
  icon: "FilePlus",
  
  schema: CreateContractSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'HIGH',
  },

  handler: async (input, ctx) => {
    const createContractFunction = httpsCallable(functions, 'createContract');
    
    const result = await createContractFunction({
      ...input,
      createdBy: ctx.userId,
      createdAt: new Date().toISOString(),
    });

    const data = result.data as any;

    await ctx.auditLogger('contracts.create', 'SUCCESS', {
      contractId: data.contractId,
      userId: input.userId,
      facilityId: input.facilityId,
    });

    return {
      contractId: data.contractId,
    };
  }
};

