import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../../services/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { sendNotification } from '../../../../services/notifications';

const FlagDiscrepancySchema = z.object({
  facilityId: z.string(),
  userId: z.string(),
  period: z.string(),
  note: z.string(),
});

interface FlagDiscrepancyResult {
  discrepancyId: string;
  ticketId: string;
}

export const flagDiscrepancyAction: ActionDefinition<typeof FlagDiscrepancySchema, FlagDiscrepancyResult> = {
  id: "fiduciary.flag_discrepancy",
  fileLocation: "src/services/actions/catalog/fiduciary/flagDiscrepancy.ts",
  
  requiredPermission: "fiduciary.flag_discrepancy",
  
  label: "Flag Payroll Discrepancy",
  description: "Reopen period and send correction request to facility manager",
  keywords: ["fiduciary", "discrepancy", "payroll", "correction"],
  icon: "AlertTriangle",
  
  schema: FlagDiscrepancySchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'HIGH',
  },

  handler: async (input, ctx) => {
    const { facilityId, userId, period, note } = input;

    const discrepanciesRef = collection(db, 'payroll_discrepancies');
    const discrepancyDoc = await addDoc(discrepanciesRef, {
      facilityId,
      userId,
      period,
      note,
      flaggedBy: ctx.userId,
      status: 'PENDING',
      createdAt: serverTimestamp(),
    });

    const periodRef = doc(db, 'payroll_periods', `${facilityId}_${period}`);
    const periodSnap = await getDoc(periodRef);

    if (periodSnap.exists()) {
      await updateDoc(periodRef, {
        status: 'DRAFT',
        reopenedAt: serverTimestamp(),
        reopenedBy: ctx.userId,
        reopenReason: note,
      });
    }

    const ticketsRef = collection(db, 'support_tickets');
    const ticketDoc = await addDoc(ticketsRef, {
      userId: ctx.userId,
      facilityId,
      description: `Payroll Discrepancy: ${note}`,
      severity: 'HIGH',
      category: 'PAYROLL_CORRECTION',
      status: 'OPEN',
      createdAt: serverTimestamp(),
    });

    const facilityRef = await db.collection('facility_profiles').doc(facilityId).get();
    const managerEmail = facilityRef.data()?.ownerEmail;

    await sendNotification({
      title: 'Payroll Correction Requested',
      body: `Fiduciary flagged issue: ${note}`,
      priority: 'HIGH',
      target: {
        type: 'FACILITY',
        facilityIds: [facilityId],
      },
      actionUrl: `/payroll/${period}`,
    });

    await ctx.auditLogger('fiduciary.flag_discrepancy', 'SUCCESS', {
      discrepancyId: discrepancyDoc.id,
      facilityId,
      period,
      severity: 'HIGH',
    });

    return {
      discrepancyId: discrepancyDoc.id,
      ticketId: ticketDoc.id,
    };
  }
};

