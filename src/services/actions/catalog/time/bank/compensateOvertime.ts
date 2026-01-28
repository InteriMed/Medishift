import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../../services/firebase';
import { doc, updateDoc, getDoc, increment, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { appendAudit } from '../../common/utils';

const CompensateOvertimeSchema = z.object({
  userId: z.string(),
  amountHours: z.number().positive(),
  method: z.enum(['PAY_OUT', 'RECOVER']),
  comment: z.string().optional(),
});

export const compensateOvertimeAction: ActionDefinition<typeof CompensateOvertimeSchema, void> = {
  id: "time.compensate_overtime",
  fileLocation: "src/services/actions/catalog/time/bank/compensateOvertime.ts",
  
  requiredPermission: "time.compensate_overtime",
  
  label: "Compensate Overtime",
  description: "Pay out overtime or convert to comp time",
  keywords: ["time", "overtime", "compensation", "payout"],
  icon: "DollarSign",
  
  schema: CompensateOvertimeSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'HIGH',
  },

  handler: async (input, ctx) => {
    const { userId, amountHours, method, comment } = input;

    const balanceRef = doc(db, 'time_balances', userId);
    const balanceSnap = await getDoc(balanceRef);

    if (!balanceSnap.exists()) {
      throw new Error('Time balance not found');
    }

    const balance = balanceSnap.data();

    if (balance.overtime_balance < amountHours) {
      throw new Error(`Insufficient overtime balance. Available: ${balance.overtime_balance}h`);
    }

    if (method === 'PAY_OUT') {
      const payrollEntriesRef = collection(db, 'payroll_manual_entries');
      await addDoc(payrollEntriesRef, {
        userId,
        period: new Date().toISOString().slice(0, 7),
        type: 'OVERTIME_PAYOUT',
        amount: amountHours * 1.25,
        hours: amountHours,
        comment: comment || 'Overtime payout',
        createdBy: ctx.userId,
        createdAt: serverTimestamp(),
      });

      await updateDoc(balanceRef, {
        overtime_balance: increment(-amountHours),
      });
    } else if (method === 'RECOVER') {
      await updateDoc(balanceRef, {
        overtime_balance: increment(-amountHours),
        comp_time_balance: increment(amountHours),
      });
    }

    await appendAudit('time_balances', userId, {
      uid: ctx.userId,
      action: `OVERTIME_${method}`,
      metadata: { amountHours },
      severity: 'HIGH',
    });

    await ctx.auditLogger('time.compensate_overtime', 'SUCCESS', {
      userId,
      amountHours,
      method,
    });
  }
};

