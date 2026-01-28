import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { appendAudit } from '../../common/utils';

const ValidateTimesheetSchema = z.object({
  missionId: z.string(),
  actualHours: z.array(z.object({
    date: z.string(),
    clockIn: z.string(),
    clockOut: z.string(),
    hours: z.number(),
  })),
  comment: z.string().optional(),
});

interface ValidateTimesheetResult {
  timesheetId: string;
  status: string;
}

export const validateTimesheetAction: ActionDefinition<typeof ValidateTimesheetSchema, ValidateTimesheetResult> = {
  id: "marketplace.validate_timesheet",
  fileLocation: "src/services/actions/catalog/marketplace/transaction/validateTimesheet.ts",
  
  requiredPermission: "marketplace.validate_timesheet",
  
  label: "Validate Timesheet",
  description: "Submit actual hours worked for manager approval",
  keywords: ["marketplace", "timesheet", "hours", "payroll"],
  icon: "Clock",
  
  schema: ValidateTimesheetSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'HIGH',
  },

  handler: async (input, ctx) => {
    const { missionId, actualHours, comment } = input;

    const contractRef = doc(db, 'marketplace_contracts', missionId);
    const contractSnap = await getDoc(contractRef);

    if (!contractSnap.exists()) {
      throw new Error('Mission contract not found');
    }

    const contract = contractSnap.data();
    const totalHours = actualHours.reduce((sum, entry) => sum + entry.hours, 0);

    const timesheetRef = doc(db, 'marketplace_timesheets', `${missionId}_${ctx.userId}`);
    await updateDoc(timesheetRef, {
      missionId,
      professionalId: ctx.userId,
      breakdowns: actualHours,
      submittedHours: totalHours,
      status: 'SUBMITTED',
      comment,
      submittedAt: serverTimestamp(),
    });

    await appendAudit('marketplace_timesheets', timesheetRef.id, {
      uid: ctx.userId,
      action: 'TIMESHEET_SUBMITTED',
      metadata: { totalHours, severity: 'HIGH' },
    });

    await ctx.auditLogger('marketplace.validate_timesheet', 'SUCCESS', {
      missionId,
      submittedHours: totalHours,
      contractedHours: contract.totalHours,
    });

    return {
      timesheetId: timesheetRef.id,
      status: 'SUBMITTED',
    };
  }
};

