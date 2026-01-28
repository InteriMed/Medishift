import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { appendAudit } from '../../common/utils';
import { sendNotificationToUser } from '../../../../services/notifications';

const DeleteShiftSchema = z.object({
  shiftId: z.string(),
  reason: z.string().min(5),
});

export const deleteShiftAction: ActionDefinition<typeof DeleteShiftSchema, void> = {
  id: "calendar.delete_shift",
  fileLocation: "src/services/actions/catalog/calendar/planning/deleteShift.ts",
  
  requiredPermission: "shift.create",
  
  label: "Delete Shift",
  description: "Soft delete a shift (notifies user if published)",
  keywords: ["shift", "delete", "remove", "cancel"],
  icon: "Trash2",
  
  schema: DeleteShiftSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'HIGH',
  },

  handler: async (input, ctx) => {
    const { shiftId, reason } = input;

    const shiftRef = doc(db, 'shifts', shiftId);
    const shiftSnap = await getDoc(shiftRef);

    if (!shiftSnap.exists()) {
      throw new Error('Shift not found');
    }

    const shift = shiftSnap.data();

    await updateDoc(shiftRef, {
      status: 'CANCELLED',
      cancelledAt: serverTimestamp(),
      cancelledBy: ctx.userId,
      cancellationReason: reason,
      updatedAt: serverTimestamp(),
    });

    await appendAudit('shifts', shiftId, {
      uid: ctx.userId,
      action: 'DELETED',
      metadata: { reason },
    });

    if (shift.status === 'PUBLISHED' && shift.userId) {
      await sendNotificationToUser(shift.userId, {
        title: 'Shift Cancelled',
        body: `Your shift on ${shift.date} has been cancelled. Reason: ${reason}`,
        priority: 'HIGH',
        actionUrl: '/calendar',
        data: {
          shiftId,
          type: 'SHIFT_CANCELLED',
        },
      });
    }

    await ctx.auditLogger('calendar.delete_shift', 'SUCCESS', {
      shiftId,
      reason,
      notificationSent: shift.status === 'PUBLISHED' && !!shift.userId,
    });
  }
};

