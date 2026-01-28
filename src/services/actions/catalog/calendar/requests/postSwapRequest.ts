import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../../services/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';

const PostSwapRequestSchema = z.object({
  shiftId: z.string(),
  toUser: z.string().optional(),
  comment: z.string().optional(),
});

interface PostSwapRequestResult {
  swapRequestId: string;
  shiftDate: string;
}

export const postSwapRequestAction: ActionDefinition<typeof PostSwapRequestSchema, PostSwapRequestResult> = {
  id: "calendar.post_swap_request",
  fileLocation: "src/services/actions/catalog/calendar/requests/postSwapRequest.ts",
  
  requiredPermission: "thread.create",
  
  label: "Post Swap Request",
  description: "Offer shift for trade on marketplace",
  keywords: ["swap", "trade", "shift", "exchange"],
  icon: "Repeat",
  
  schema: PostSwapRequestSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const { shiftId, toUser, comment } = input;

    const shiftRef = doc(db, 'shifts', shiftId);
    const shiftSnap = await getDoc(shiftRef);

    if (!shiftSnap.exists()) {
      throw new Error('Shift not found');
    }

    const shift = shiftSnap.data();

    if (shift.userId !== ctx.userId) {
      throw new Error('You can only swap your own shifts');
    }

    if (shift.status !== 'PUBLISHED') {
      throw new Error('Only published shifts can be swapped');
    }

    const swapRequest = {
      shiftId,
      fromUser: ctx.userId,
      toUser: toUser || null,
      facilityId: ctx.facilityId,
      shiftDate: shift.date,
      shiftStartTime: shift.startTime,
      shiftEndTime: shift.endTime,
      shiftRole: shift.role,
      comment: comment || '',
      status: 'PENDING',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      auditHistory: [{
        uid: ctx.userId,
        action: 'SWAP_POSTED',
        timestamp: Date.now(),
      }],
    };

    const swapRef = await addDoc(collection(db, 'swap_requests'), swapRequest);

    await ctx.auditLogger('calendar.post_swap_request', 'SUCCESS', {
      swapRequestId: swapRef.id,
      shiftId,
      toUser: toUser || 'OPEN',
    });

    return {
      swapRequestId: swapRef.id,
      shiftDate: shift.date,
    };
  }
};

