import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { appendAudit } from '../../common/utils';

const AdjustBalanceSchema = z.object({
  userId: z.string(),
  type: z.enum(['VACATION', 'OVERTIME', 'PUBLIC_HOLIDAY', 'COMP_TIME']),
  delta: z.number(),
  reason: z.string(),
});

export const adjustBalanceAction: ActionDefinition<typeof AdjustBalanceSchema, void> = {
  id: "time.adjust_balance",
  fileLocation: "src/services/actions/catalog/time/bank/adjustBalance.ts",
  
  requiredPermission: "admin.access",
  
  label: "Adjust Time Balance (Admin)",
  description: "Manually adjust balances (gift for seniority, corrections)",
  keywords: ["time", "balance", "admin", "adjustment"],
  icon: "Edit",
  
  schema: AdjustBalanceSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'HIGH',
  },

  handler: async (input, ctx) => {
    const { userId, type, delta, reason } = input;

    const balanceRef = doc(db, 'time_balances', userId);
    
    const fieldMap = {
      'VACATION': 'vacation_balance',
      'OVERTIME': 'overtime_balance',
      'PUBLIC_HOLIDAY': 'public_holiday_balance',
      'COMP_TIME': 'comp_time_balance',
    };

    await updateDoc(balanceRef, {
      [fieldMap[type]]: increment(delta),
      lastUpdated: serverTimestamp(),
    });

    await appendAudit('time_balances', userId, {
      uid: ctx.userId,
      action: 'BALANCE_ADJUSTED',
      metadata: { type, delta, reason },
      severity: 'CRITICAL',
    });

    await ctx.auditLogger('time.adjust_balance', 'SUCCESS', {
      userId,
      type,
      delta,
      reason,
    });
  }
};

