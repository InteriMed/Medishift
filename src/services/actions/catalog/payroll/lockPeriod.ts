import { z } from "zod";
import { ActionDefinition } from "../../../flows/types";
import { db } from '../../../services/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';
import { appendAudit } from '../common/utils';

const LockPeriodSchema = z.object({
  facilityId: z.string(),
  month: z.number().min(1).max(12),
  year: z.number(),
});

interface LockPeriodResult {
  periodId: string;
  lockedShifts: number;
  warnings: string[];
}

export const lockPeriodAction: ActionDefinition<typeof LockPeriodSchema, LockPeriodResult> = {
  id: "payroll.lock_period",
  fileLocation: "src/services/actions/catalog/payroll/lockPeriod.ts",
  
  requiredPermission: "admin.access",
  
  label: "Lock Payroll Period (Freeze)",
  description: "HARD LOCK - Make period read-only for payroll processing",
  keywords: ["payroll", "lock", "freeze", "immutable"],
  icon: "Lock",
  
  schema: LockPeriodSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'HIGH',
  },

  handler: async (input, ctx) => {
    const { facilityId, month, year } = input;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const shiftsRef = collection(db, 'shifts');
    const draftQuery = query(
      shiftsRef,
      where('facilityId', '==', facilityId),
      where('status', '==', 'DRAFT'),
      where('date', '>=', startDateStr),
      where('date', '<=', endDateStr)
    );

    const draftSnapshot = await getDocs(draftQuery);
    
    if (!draftSnapshot.empty) {
      throw new Error(
        `Cannot lock period: ${draftSnapshot.size} DRAFT shifts still exist. All shifts must be PUBLISHED or COMPLETED.`
      );
    }

    const periodId = `${facilityId}_${year}_${String(month).padStart(2, '0')}`;
    const periodRef = doc(db, 'payroll_periods', periodId);

    await updateDoc(periodRef, {
      status: 'LOCKED',
      lockedAt: serverTimestamp(),
      lockedBy: ctx.userId,
      dateRange: {
        start: startDateStr,
        end: endDateStr,
      },
      updatedAt: serverTimestamp(),
    });

    const publishedQuery = query(
      shiftsRef,
      where('facilityId', '==', facilityId),
      where('date', '>=', startDateStr),
      where('date', '<=', endDateStr)
    );

    const publishedSnapshot = await getDocs(publishedQuery);
    const batch = writeBatch(db);
    let lockedCount = 0;

    publishedSnapshot.docs.forEach(shiftDoc => {
      batch.update(shiftDoc.ref, {
        isPayrollLocked: true,
        payrollLockedAt: new Date(),
        payrollPeriodId: periodId,
      });
      lockedCount++;
    });

    await batch.commit();

    await appendAudit('payroll_periods', periodId, {
      uid: ctx.userId,
      action: 'PERIOD_LOCKED',
      metadata: {
        month,
        year,
        lockedShifts: lockedCount,
      },
    });

    await ctx.auditLogger('payroll.lock_period', 'SUCCESS', {
      facilityId,
      month,
      year,
      periodId,
      lockedShifts: lockedCount,
    });

    return {
      periodId,
      lockedShifts: lockedCount,
      warnings: [],
    };
  }
};

