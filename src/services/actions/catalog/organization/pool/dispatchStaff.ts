import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { sendNotificationToUser } from '../../../../services/notifications';
import { appendAudit } from '../../common/utils';

const DispatchStaffSchema = z.object({
  userId: z.string(),
  targetFacilityId: z.string(),
  shiftId: z.string(),
});

export const dispatchStaffAction: ActionDefinition<typeof DispatchStaffSchema, void> = {
  id: "pool.dispatch_staff",
  fileLocation: "src/services/actions/catalog/organization/pool/dispatchStaff.ts",
  
  requiredPermission: "pool.dispatch_staff",
  
  label: "Dispatch Staff (Command)",
  description: "Force assign staff to cross-facility shift (HQ only)",
  keywords: ["pool", "dispatch", "assign", "command"],
  icon: "Send",
  
  schema: DispatchStaffSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'HIGH',
  },

  handler: async (input, ctx) => {
    const { userId, targetFacilityId, shiftId } = input;

    const shiftRef = doc(db, 'calendar_shifts', shiftId);
    const shiftSnap = await getDoc(shiftRef);

    if (!shiftSnap.exists()) {
      throw new Error('Shift not found');
    }

    const shift = shiftSnap.data();

    const accessRef = collection(db, 'temporary_access');
    await addDoc(accessRef, {
      userId,
      facilityId: targetFacilityId,
      startDate: shift.date,
      endDate: shift.date,
      permissions: ['clock_in', 'clock_out', 'view_roster', 'badge_access'],
      grantedBy: ctx.userId,
      createdAt: serverTimestamp(),
    });

    await sendNotificationToUser(userId, {
      title: 'You have been assigned to a mission',
      body: `You are scheduled at ${targetFacilityId} on ${shift.date}`,
      priority: 'HIGH',
      actionUrl: `/calendar?date=${shift.date}`,
    });

    await appendAudit('calendar_shifts', shiftId, {
      uid: ctx.userId,
      action: 'STAFF_DISPATCHED',
      metadata: { userId, targetFacilityId, severity: 'HIGH' },
    });

    await ctx.auditLogger('pool.dispatch_staff', 'SUCCESS', {
      userId,
      targetFacilityId,
      shiftId,
    });
  }
};

