import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { functions } from '../../../../services/firebase';
import { httpsCallable } from 'firebase/functions';

const TerminateEmploymentSchema = z.object({
  userId: z.string(),
  lastWorkingDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.enum(['RESIGNATION', 'DISMISSAL', 'CONTRACT_END', 'RETIREMENT']),
  noticeGiven: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  additionalNotes: z.string().optional(),
});

interface TerminateEmploymentResult {
  terminationLetterId: string;
  terminationLetterUrl: string;
  finalPayrollDeadline: string;
}

export const terminateEmploymentAction: ActionDefinition<typeof TerminateEmploymentSchema, TerminateEmploymentResult> = {
  id: "contracts.terminate_employment",
  fileLocation: "src/services/actions/catalog/contracts/terminateEmployment.ts",
  
  requiredPermission: "admin.access",
  
  label: "Terminate Employment Contract",
  description: "Generate termination letter and trigger offboarding",
  keywords: ["terminate", "end contract", "resignation", "dismissal"],
  icon: "FileX",
  
  schema: TerminateEmploymentSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'HIGH',
  },

  handler: async (input, ctx) => {
    const { userId, lastWorkingDay, reason, noticeGiven, additionalNotes } = input;

    const terminateFunction = httpsCallable(functions, 'terminateEmploymentContract');
    
    const result = await terminateFunction({
      userId,
      lastWorkingDay,
      reason,
      noticeGiven,
      additionalNotes: additionalNotes || '',
      facilityId: ctx.facilityId,
      terminatedBy: ctx.userId,
    });

    const data = result.data as any;

    const lastDay = new Date(lastWorkingDay);
    const finalPayrollDeadline = new Date(lastDay);
    finalPayrollDeadline.setMonth(finalPayrollDeadline.getMonth() + 1);
    finalPayrollDeadline.setDate(5);

    await ctx.auditLogger('contracts.terminate_employment', 'SUCCESS', {
      userId,
      lastWorkingDay,
      reason,
      terminationLetterId: data.terminationLetterId,
    });

    return {
      terminationLetterId: data.terminationLetterId,
      terminationLetterUrl: data.terminationLetterUrl,
      finalPayrollDeadline: finalPayrollDeadline.toISOString().split('T')[0],
    };
  }
};

