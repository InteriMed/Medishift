import { z } from "zod";
import { ActionDefinition } from "../../../flows/types";
import { db, functions } from '../../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

const GenerateDraftSchema = z.object({
  userId: z.string(),
  templateId: z.string(),
  variables: z.record(z.any()),
});

interface GenerateDraftResult {
  contractId: string;
  previewUrl: string;
  salaryType: 'HOURLY' | 'MONTHLY';
}

export const generateDraftAction: ActionDefinition<typeof GenerateDraftSchema, GenerateDraftResult> = {
  id: "contracts.generate_draft",
  fileLocation: "src/services/actions/catalog/contracts/generateDraft.ts",
  
  requiredPermission: "admin.access",
  
  label: "Generate Contract Draft",
  description: "Create contract PDF from template with variables",
  keywords: ["contract", "draft", "generate", "pdf"],
  icon: "FileText",
  
  schema: GenerateDraftSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'HIGH',
  },

  handler: async (input, ctx) => {
    const { userId, templateId, variables } = input;

    const templateRef = doc(db, 'contract_templates', templateId);
    const templateSnap = await getDoc(templateRef);

    if (!templateSnap.exists()) {
      throw new Error('Contract template not found');
    }

    const template = templateSnap.data();

    const requiredVars = template.variables || [];
    const missingVars = requiredVars.filter((v: string) => !variables[v]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required variables: ${missingVars.join(', ')}`);
    }

    const generateContractFunction = httpsCallable(functions, 'generateContractPDF');
    
    const result = await generateContractFunction({
      userId,
      templateId,
      variables,
      facilityId: ctx.facilityId,
      createdBy: ctx.userId,
    });

    const data = result.data as any;

    await ctx.auditLogger('contracts.generate_draft', 'SUCCESS', {
      userId,
      templateId,
      contractId: data.contractId,
    });

    return {
      contractId: data.contractId,
      previewUrl: data.previewUrl,
      salaryType: template.salaryType,
    };
  }
};

