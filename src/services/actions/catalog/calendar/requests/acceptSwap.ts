import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../../services/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { validateShiftConstraints } from '../constraints';
import { appendAudit } from '../../common/utils';

const AcceptSwapSchema = z.object({
  swapRequestId: z.string(),
});

interface AcceptSwapResult {
  status: 'APPROVED' | 'PENDING_APPROVAL';
  violations: string[];
}

export const acceptSwapAction: ActionDefinition<typeof AcceptSwapSchema, AcceptSwapResult> = {
  id: "calendar.accept_swap",
  fileLocation: "src/services/actions/catalog/calendar/requests/acceptSwap.ts",
  
  requiredPermission: "thread.create",
  
  label: "Accept Swap Request",
  description: "Accept shift swap with constraint validation",
  keywords: ["swap", "accept", "trade"],
  icon: "Check",
  
  schema: AcceptSwapSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'MEDIUM',
  },

  handler: async (input, ctx) => {
    const { swapRequestId } = input;

    const swapRef = doc(db, 'swap_requests', swapRequestId);
    const swapSnap = await getDoc(swapRef);

    if (!swapSnap.exists()) {
      throw new Error('Swap request not found');
    }

    const swap = swapSnap.data();

    if (swap.status !== 'PENDING') {
      throw new Error('Swap request is no longer available');
    }

    if (swap.toUser && swap.toUser !== ctx.userId) {
      throw new Error('This swap request is not directed to you');
    }

    const shiftRef = doc(db, 'shifts', swap.shiftId);
    const shiftSnap = await getDoc(shiftRef);

    if (!shiftSnap.exists()) {
      throw new Error('Original shift not found');
    }

    const shift = shiftSnap.data();

    const validation = await validateShiftConstraints(
      ctx.userId,
      ctx.facilityId,
      {
        date: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime,
      },
      undefined,
      false
    );

    if (!validation.valid) {
      const violationMessages = validation.violations.map(v => v.message);
      
      await updateDoc(swapRef, {
        status: 'REJECTED',
        rejectedBy: ctx.userId,
        rejectionReason: `Constraint violations: ${violationMessages.join('; ')}`,
        updatedAt: serverTimestamp(),
      });

      throw new Error(
        `Cannot accept swap due to constraints: ${violationMessages.join('; ')}`
      );
    }

    await updateDoc(swapRef, {
      acceptedBy: ctx.userId,
      status: 'PENDING_APPROVAL',
      updatedAt: serverTimestamp(),
    });

    await appendAudit('swap_requests', swapRequestId, {
      uid: ctx.userId,
      action: 'ACCEPTED',
      metadata: {
        validationPassed: true,
        warnings: validation.warnings,
      },
    });

    await ctx.auditLogger('calendar.accept_swap', 'SUCCESS', {
      swapRequestId,
      shiftId: swap.shiftId,
      status: 'PENDING_APPROVAL',
    });

    return {
      status: 'PENDING_APPROVAL',
      violations: validation.warnings,
    };
  }
};

