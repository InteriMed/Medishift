import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { appendAudit } from '../../common/utils';

const ClockOutSchema = z.object({
  comment: z.string().optional(),
});

interface ClockOutResult {
  clockId: string;
  totalHours: number;
  overtimeMinutes?: number;
  breakWarning?: string;
}

export const clockOutAction: ActionDefinition<typeof ClockOutSchema, ClockOutResult> = {
  id: "time.clock_out",
  fileLocation: "src/services/actions/catalog/time/clock/clockOut.ts",
  
  requiredPermission: "time.clock_out",
  
  label: "Clock Out",
  description: "Record departure with break validation and overtime check",
  keywords: ["time", "clock", "attendance", "check-out"],
  icon: "LogOut",
  
  schema: ClockOutSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const { comment } = input;

    const clocksRef = collection(db, 'time_clock_entries');
    const clockInQuery = query(
      clocksRef,
      where('userId', '==', ctx.userId),
      where('type', '==', 'CLOCK_IN'),
      orderBy('timestamp', 'desc'),
      limit(1)
    );
    const clockInSnapshot = await getDocs(clockInQuery);

    if (clockInSnapshot.empty) {
      throw new Error('No active clock-in found. Please clock in first.');
    }

    const clockInDoc = clockInSnapshot.docs[0];
    const clockInData = clockInDoc.data();
    const clockInTime = clockInData.timestamp.toDate();
    const now = new Date();

    const totalMinutes = (now.getTime() - clockInTime.getTime()) / 60000;
    const totalHours = totalMinutes / 60;

    const breaksQuery = query(
      clocksRef,
      where('userId', '==', ctx.userId),
      where('type', '==', 'BREAK_START'),
      where('timestamp', '>', clockInData.timestamp)
    );
    const breaksSnapshot = await getDocs(breaksQuery);
    const hasBreaks = !breaksSnapshot.empty;

    let breakWarning: string | undefined;
    if (totalHours > 5.5 && !hasBreaks) {
      breakWarning = 'No break recorded for a shift > 5.5 hours. Did you take your lunch?';
    }

    let overtimeMinutes: number | undefined;
    if (clockInData.linkedShiftId) {
      const shiftRef = await db.collection('calendar_shifts').doc(clockInData.linkedShiftId).get();
      if (shiftRef.exists) {
        const shiftData = shiftRef.data();
        const plannedEnd = new Date(`${shiftData.date}T${shiftData.endTime}`);
        const overtimeMs = now.getTime() - plannedEnd.getTime();
        overtimeMinutes = Math.max(0, overtimeMs / 60000);

        if (overtimeMinutes > 15 && !comment) {
          throw new Error('Overtime > 15 minutes requires a comment explaining the reason.');
        }
      }
    }

    const clockOutDoc = await addDoc(clocksRef, {
      userId: ctx.userId,
      facilityId: clockInData.facilityId,
      type: 'CLOCK_OUT',
      timestamp: serverTimestamp(),
      linkedClockInId: clockInDoc.id,
      linkedShiftId: clockInData.linkedShiftId,
      totalHours,
      overtimeMinutes,
      comment,
      status: 'VALID',
    });

    await appendAudit('time_clock_entries', clockOutDoc.id, {
      uid: ctx.userId,
      action: 'CLOCKED_OUT',
      metadata: { totalHours, overtimeMinutes },
    });

    await ctx.auditLogger('time.clock_out', 'SUCCESS', {
      clockId: clockOutDoc.id,
      totalHours,
      overtimeMinutes,
    });

    return {
      clockId: clockOutDoc.id,
      totalHours,
      overtimeMinutes,
      breakWarning,
    };
  }
};

