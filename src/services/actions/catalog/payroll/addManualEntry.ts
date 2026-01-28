import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { doc, getDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';

const AddManualEntrySchema = z.object({
  userId: z.string(),
  month: z.number().min(1).max(12),
  year: z.number(),
  type: z.enum(['BONUS', 'DEDUCTION', 'EXPENSE', 'REIMBURSEMENT']),
  amount: z.number(),
  comment: z.string().min(5),
});

export const addManualEntryAction: ActionDefinition<typeof AddManualEntrySchema, void> = {
  id: "payroll.add_manual_entry",
  fileLocation: "src/services/actions/catalog/payroll/addManualEntry.ts",
  
  requiredPermission: "admin.access",
  
  label: "Add Manual Payroll Entry",
  description: "Add bonus, deduction, or expense to payroll period",
  keywords: ["payroll", "bonus", "deduction", "expense", "spesen"],
  icon: "DollarSign",
  
  schema: AddManualEntrySchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'HIGH',
  },

  handler: async (input, ctx) => {
    const { userId, month, year, type, amount, comment } = input;

    const periodId = `${ctx.facilityId}_${year}_${String(month).padStart(2, '0')}`;
    const periodRef = doc(db, 'payroll_periods', periodId);
    const periodSnap = await getDoc(periodRef);

    if (periodSnap.exists()) {
      const period = periodSnap.data();
      
      if (['LOCKED', 'APPROVED', 'SENT_TO_FIDUCIARY', 'COMPLETED'].includes(period.status)) {
        throw new Error(`Cannot add manual entries. Period is ${period.status}`);
      }
    }

    const manualEntry = {
      id: `entry_${Date.now()}`,
      userId,
      type,
      amount,
      comment,
      addedBy: ctx.userId,
      addedAt: Date.now(),
    };

    await updateDoc(periodRef, {
      manualEntries: arrayUnion(manualEntry),
      updatedAt: serverTimestamp(),
    });

    await ctx.auditLogger('payroll.add_manual_entry', 'SUCCESS', {
      userId,
      month,
      year,
      type,
      amount,
    });
  }
};

