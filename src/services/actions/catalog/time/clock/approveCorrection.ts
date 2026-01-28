import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { appendAudit } from '../../common/utils';

const ApproveCorrectionSchema = z.object({
  correctionRequestId: z.string(),
  approved: z.boolean(),
  managerComment: z.string().optional(),
});

export const approveCorrectionAction: ActionDefinition<typeof ApproveCorrectionSchema, void> = {
  id: "time.approve_correction",
  fileLocation: "src/services/actions/catalog/time/clock/approveCorrection.ts",
  
  requiredPermission: "time.approve_correction",
  
  label: "Approve Time Correction",
  description: "Manager approval for manual time edits",
  keywords: ["time", "correction", "approval", "manager"],
  icon: "CheckSquare",
  
  schema: ApproveCorrectionSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'HIGH',
  },

  handler: async (input, ctx) => {
    const { correctionRequestId, approved, managerComment } = input;

    const correctionRef = doc(db, 'time_correction_requests', correctionRequestId);
    const correctionSnap = await getDoc(correctionRef);

    if (!correctionSnap.exists()) {
      throw new Error('Correction request not found');
    }

    const correction = correctionSnap.data();

    await updateDoc(correctionRef, {
      status: approved ? 'APPROVED' : 'REJECTED',
      approvedBy: ctx.userId,
      approvedAt: serverTimestamp(),
      managerComment,
    });

    if (approved) {
      const clockRef = doc(db, 'time_clock_entries', correction.originalClockId);
      await updateDoc(clockRef, {
        timestamp: correction.requestedTimestamp,
        status: 'CORRECTED',
        correctedBy: ctx.userId,
        correctedAt: serverTimestamp(),
      });
    }

    await appendAudit('time_correction_requests', correctionRequestId, {
      uid: ctx.userId,
      action: approved ? 'CORRECTION_APPROVED' : 'CORRECTION_REJECTED',
    });

    await ctx.auditLogger('time.approve_correction', 'SUCCESS', {
      correctionRequestId,
      approved,
    });
  }
};

