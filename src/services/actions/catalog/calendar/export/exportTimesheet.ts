import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { functions } from '../../../../../services/firebase';
import { httpsCallable } from 'firebase/functions';

const ExportTimesheetSchema = z.object({
  userId: z.string().optional(),
  month: z.number().min(1).max(12),
  year: z.number(),
});

interface ExportTimesheetResult {
  pdfUrl: string;
  totalHours: number;
  plannedHours: number;
  variance: number;
}

export const exportTimesheetAction: ActionDefinition<typeof ExportTimesheetSchema, ExportTimesheetResult> = {
  id: "calendar.export_timesheet",
  fileLocation: "src/services/actions/catalog/calendar/export/exportTimesheet.ts",
  
  requiredPermission: "shift.view",
  
  label: "Export Timesheet",
  description: "Generate PDF timesheet for hours worked vs. planned",
  keywords: ["timesheet", "pdf", "export", "hours"],
  icon: "FileText",
  
  schema: ExportTimesheetSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const { userId, month, year } = input;
    const targetUserId = userId || ctx.userId;

    if (targetUserId !== ctx.userId && !ctx.userPermissions.includes('shift.create')) {
      throw new Error('Insufficient permissions to export other users timesheets');
    }

    const generateTimesheet = httpsCallable(functions, 'generateTimesheet');
    
    const result = await generateTimesheet({
      userId: targetUserId,
      facilityId: ctx.facilityId,
      month,
      year,
    });

    const data = result.data as any;

    await ctx.auditLogger('calendar.export_timesheet', 'SUCCESS', {
      userId: targetUserId,
      month,
      year,
      totalHours: data.totalHours,
    });

    return {
      pdfUrl: data.pdfUrl,
      totalHours: data.totalHours,
      plannedHours: data.plannedHours,
      variance: data.totalHours - data.plannedHours,
    };
  }
};

