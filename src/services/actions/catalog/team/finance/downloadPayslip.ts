import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { generateSignedURL } from '../../common/utils';

const DownloadPayslipSchema = z.object({
  month: z.number().min(1).max(12),
  year: z.number(),
  userId: z.string().optional(),
});

interface DownloadPayslipResult {
  downloadUrl: string;
  expiresIn: number;
}

export const downloadPayslipAction: ActionDefinition<typeof DownloadPayslipSchema, DownloadPayslipResult> = {
  id: "profile.download_payslip",
  fileLocation: "src/services/actions/catalog/team/finance/downloadPayslip.ts",
  
  requiredPermission: "thread.create",
  
  label: "Download Payslip",
  description: "Generate secure download link for monthly payslip",
  keywords: ["payslip", "salary", "download", "pdf"],
  icon: "Download",
  
  schema: DownloadPayslipSchema,
  
  metadata: {
    autoToast: false,
    riskLevel: 'MEDIUM',
  },

  handler: async (input, ctx) => {
    const { month, year, userId } = input;
    const targetUserId = userId || ctx.userId;

    if (targetUserId !== ctx.userId && !ctx.userPermissions.includes('admin.access')) {
      throw new Error('You can only download your own payslips');
    }

    const storagePath = `payslips/${targetUserId}/${year}/${String(month).padStart(2, '0')}_payslip.pdf`;

    const downloadUrl = await generateSignedURL(storagePath, 15);

    await ctx.auditLogger('profile.download_payslip', 'SUCCESS', {
      userId: targetUserId,
      month,
      year,
    });

    return {
      downloadUrl,
      expiresIn: 15 * 60,
    };
  }
};

