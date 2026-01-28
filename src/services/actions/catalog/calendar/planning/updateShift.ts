import { z } from "zod";
import { ActionDefinition, ActionContext } from "../../../types";
import { db } from '../../../../services/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { validateShiftConstraints } from '../constraints';
import { appendAudit } from '../../common/utils';
import { sendNotificationToUser } from '../../../../services/notifications';

const shiftTypeEnum = ['STANDARD', 'NIGHT', 'ON_CALL', 'OVERTIME'] as const;
const shiftStatusEnum = ['DRAFT', 'PUBLISHED', 'COMPLETED', 'CANCELLED'] as const;

const UpdateShiftSchema = z.object({
  shiftId: z.string(),
  updates: z.object({
    userId: z.string().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    role: z.string().optional(),
    type: z.enum(shiftTypeEnum).optional(),
    status: z.enum(shiftStatusEnum).optional(),
  }),
  force: z.boolean().optional(),
  reason: z.string().optional(),
});

export const updateShiftAction: ActionDefinition<typeof UpdateShiftSchema, void> = {
  id: "calendar.update_shift",
  fileLocation: "src/services/actions/catalog/calendar/planning/updateShift.ts",
  
  requiredPermission: "shift.create",
  
  label: "Update Shift",
  description: "Modify an existing shift (notifies user if published)",
  keywords: ["shift", "update", "modify", "change"],
  icon: "Edit",
  
  schema: UpdateShiftSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'HIGH',
  },

  handler: async (input: z.infer<typeof UpdateShiftSchema>, ctx: ActionContext): Promise<void> => {
    const { shiftId, updates, force, reason } = input;

    const shiftRef = doc(db, 'shifts', shiftId);
    const shiftSnap = await getDoc(shiftRef);

    if (!shiftSnap.exists()) {
      throw new Error('Shift not found');
    }

    const currentShift = shiftSnap.data();
    const affectedUserId = updates.userId || currentShift.userId;

    if (affectedUserId && (updates.date || updates.startTime || updates.endTime)) {
      const validation = await validateShiftConstraints(
        affectedUserId,
        ctx.facilityId,
        {
          date: updates.date || currentShift.date,
          startTime: updates.startTime || currentShift.startTime,
          endTime: updates.endTime || currentShift.endTime,
        },
        shiftId,
        force || false
      );

      if (!validation.valid) {
        throw new Error(
          `Shift validation failed: ${validation.violations.map(v => v.message).join('; ')}`
        );
      }

      if (force && validation.violations.length > 0) {
        await ctx.auditLogger('calendar.update_shift', 'START', {
          action: 'FORCE_OVERRIDE',
          violations: validation.violations,
          reason: reason || 'Manager override',
        });
      }
    }

    await updateDoc(shiftRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });

    await appendAudit('shifts', shiftId, {
      uid: ctx.userId,
      action: 'UPDATED',
      metadata: {
        updates,
        reason,
      },
    });

    if (currentShift.status === 'PUBLISHED' && affectedUserId) {
      await sendNotificationToUser(affectedUserId, {
        title: 'Shift Updated',
        body: `Your shift on ${updates.date || currentShift.date} has been modified`,
        priority: 'HIGH',
        actionUrl: `/calendar?shiftId=${shiftId}`,
        data: {
          shiftId,
          type: 'SHIFT_UPDATED',
        },
      });
    }

    await ctx.auditLogger('calendar.update_shift', 'SUCCESS', {
      shiftId,
      updates,
      notificationSent: currentShift.status === 'PUBLISHED',
    });
  }
};

