import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../../services/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, query, where, getDocs } from 'firebase/firestore';

const RequestLeaveSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(['VACATION', 'UNPAID', 'EDUCATION', 'SICK', 'MATERNITY']),
  comment: z.string().optional(),
  force: z.boolean().optional(),
});

interface RequestLeaveResult {
  requestId: string;
  daysRequested: number;
  remainingBalance: number;
}

export const requestLeaveAction: ActionDefinition<typeof RequestLeaveSchema, RequestLeaveResult> = {
  id: "calendar.request_leave",
  fileLocation: "src/services/actions/catalog/calendar/requests/requestLeave.ts",
  
  requiredPermission: "thread.create",
  
  label: "Request Leave",
  description: "Submit leave request with automatic balance checking",
  keywords: ["leave", "vacation", "time off", "request"],
  icon: "Calendar",
  
  schema: RequestLeaveSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const { startDate, endDate, type, comment, force } = input;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysRequested = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (type === 'VACATION') {
      const userBalance = await getVacationBalance(ctx.userId, ctx.facilityId);
      const remainingBalance = userBalance - daysRequested;

      if (remainingBalance < 0 && !force) {
        throw new Error(
          `Insufficient vacation balance. Requested: ${daysRequested} days, Available: ${userBalance} days`
        );
      }

      if (force && remainingBalance < 0) {
        await ctx.auditLogger('calendar.request_leave', 'START', {
          action: 'FORCE_OVERRIDE',
          reason: 'Vacation balance override',
          deficit: Math.abs(remainingBalance),
        });
      }
    }

    const leaveRequest = {
      userId: ctx.userId,
      facilityId: ctx.facilityId,
      startDate,
      endDate,
      type,
      comment: comment || '',
      daysRequested,
      status: 'PENDING',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      auditHistory: [{
        uid: ctx.userId,
        action: 'REQUESTED',
        timestamp: Date.now(),
      }],
    };

    const requestRef = await addDoc(collection(db, 'leave_requests'), leaveRequest);

    const finalBalance = await getVacationBalance(ctx.userId, ctx.facilityId);

    await ctx.auditLogger('calendar.request_leave', 'SUCCESS', {
      requestId: requestRef.id,
      type,
      daysRequested,
    });

    return {
      requestId: requestRef.id,
      daysRequested,
      remainingBalance: finalBalance,
    };
  }
};

async function getVacationBalance(userId: string, facilityId: string): Promise<number> {
  const contractRef = collection(db, 'contracts');
  const q = query(
    contractRef,
    where('userId', '==', userId),
    where('facilityId', '==', facilityId),
    where('status', '==', 'ACTIVE')
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return 0;

  const contract = snapshot.docs[0].data();
  const annualVacationDays = contract.annualVacationDays || 20;

  const leaveRequestsRef = collection(db, 'leave_requests');
  const leaveQuery = query(
    leaveRequestsRef,
    where('userId', '==', userId),
    where('type', '==', 'VACATION'),
    where('status', 'in', ['APPROVED', 'PENDING'])
  );

  const leaveSnapshot = await getDocs(leaveQuery);
  let usedDays = 0;

  leaveSnapshot.docs.forEach(doc => {
    const leave = doc.data();
    usedDays += leave.daysRequested || 0;
  });

  return annualVacationDays - usedDays;
}

