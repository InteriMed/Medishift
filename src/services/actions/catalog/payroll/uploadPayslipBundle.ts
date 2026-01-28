import { z } from "zod";
import { ActionDefinition } from "../../../flows/types";
import { storage, functions } from '../../../services/firebase';
import { ref, uploadBytes } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';

const UploadPayslipBundleSchema = z.object({
  month: z.number().min(1).max(12),
  year: z.number(),
  pdfFileBase64: z.string(),
  fileName: z.string(),
  useAISplitter: z.boolean().default(false),
});

interface UploadPayslipBundleResult {
  uploadedPath: string;
  splittingJobId?: string;
  estimatedSplitTime?: number;
}

export const uploadPayslipBundleAction: ActionDefinition<typeof UploadPayslipBundleSchema, UploadPayslipBundleResult> = {
  id: "payroll.upload_payslip_bundle",
  fileLocation: "src/services/actions/catalog/payroll/uploadPayslipBundle.ts",
  
  requiredPermission: "admin.access",
  
  label: "Upload Payslip Bundle",
  description: "Upload 400-page PDF from fiduciary (optional AI splitter)",
  keywords: ["payroll", "payslip", "upload", "pdf", "split"],
  icon: "Upload",
  
  schema: UploadPayslipBundleSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'MEDIUM',
  },

  handler: async (input, ctx) => {
    const { month, year, pdfFileBase64, fileName, useAISplitter } = input;

    const storagePath = `payslip_bundles/${year}/${String(month).padStart(2, '0')}/${fileName}`;
    const storageRef = ref(storage, storagePath);

    const pdfBuffer = Buffer.from(pdfFileBase64, 'base64');
    await uploadBytes(storageRef, pdfBuffer, {
      contentType: 'application/pdf',
      customMetadata: {
        uploadedBy: ctx.userId,
        month: String(month),
        year: String(year),
      },
    });

    let splittingJobId: string | undefined;
    let estimatedSplitTime: number | undefined;

    if (useAISplitter) {
      const splitPayslipsFunction = httpsCallable(functions, 'splitPayslipBundle');
      
      const result = await splitPayslipsFunction({
        storagePath,
        month,
        year,
        uploadedBy: ctx.userId,
      });

      const data = result.data as any;
      splittingJobId = data.jobId;
      estimatedSplitTime = data.estimatedMinutes;
    }

    await ctx.auditLogger('payroll.upload_payslip_bundle', 'SUCCESS', {
      month,
      year,
      fileName,
      useAISplitter,
      splittingJobId,
    });

    return {
      uploadedPath: storagePath,
      splittingJobId,
      estimatedSplitTime,
    };
  }
};

