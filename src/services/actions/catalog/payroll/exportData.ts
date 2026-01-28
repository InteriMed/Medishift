import { z } from "zod";
import { ActionDefinition, ActionContext } from "../../types";
import { functions } from '../../../services/firebase';
import { httpsCallable } from 'firebase/functions';

const formatEnum = ['CSV_ABACUS', 'CSV_GENERIC', 'XML_ELM'] as const;

const ExportDataSchema = z.object({
  month: z.number().min(1).max(12),
  year: z.number(),
  format: z.enum(formatEnum).optional().default('CSV_ABACUS'),
  facilityIds: z.array(z.string()).optional(),
});

interface ExportDataResult {
  downloadUrl: string;
  fileName: string;
  rowCount: number;
  expiresIn: number;
}

export const exportDataAction: ActionDefinition<typeof ExportDataSchema, ExportDataResult> = {
  id: "payroll.export_data",
  fileLocation: "src/services/actions/catalog/payroll/exportData.ts",
  
  requiredPermission: "admin.access",
  
  label: "Export Payroll Data",
  description: "Generate CSV/XML file for fiduciary (Abacus, DATEV, ELM)",
  keywords: ["payroll", "export", "csv", "abacus", "fiduciary"],
  icon: "Download",
  
  schema: ExportDataSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'HIGH',
  },

  handler: async (input: z.infer<typeof ExportDataSchema>, ctx: ActionContext) => {
    const { month, year, format, facilityIds } = input;

    const exportPayrollFunction = httpsCallable(functions, 'exportPayrollData');
    
    const result = await exportPayrollFunction({
      month,
      year,
      format,
      facilityIds: facilityIds || [],
      exportedBy: ctx.userId,
    });

    const data = result.data as any;

    await ctx.auditLogger('payroll.export_data', 'SUCCESS', {
      month,
      year,
      format,
      rowCount: data.rowCount,
    });

    return {
      downloadUrl: data.downloadUrl,
      fileName: data.fileName,
      rowCount: data.rowCount,
      expiresIn: 3600,
    };
  }
};

