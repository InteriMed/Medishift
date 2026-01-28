import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { appendAudit } from '../../common/utils';

const AssignFloaterSchema = z.object({
  shiftId: z.string(),
  targetUserId: z.string(),
  sourceFacilityId: z.string(),
});

interface AssignFloaterResult {
  crossChargeId: string;
  estimatedCost: number;
}

export const assignFloaterAction: ActionDefinition<typeof AssignFloaterSchema, AssignFloaterResult> = {
  id: "calendar.assign_floater",
  fileLocation: "src/services/actions/catalog/calendar/engine/assignFloater.ts",
  
  requiredPermission: "shift.create",
  
  label: "Assign Floater",
  description: "Assign floater from another facility with cross-charging",
  keywords: ["floater", "cross-charge", "borrow", "facility"],
  icon: "Users",
  
  schema: AssignFloaterSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'MEDIUM',
  },

  handler: async (input, ctx) => {
    const { shiftId, targetUserId, sourceFacilityId } = input;

    const shiftRef = doc(db, 'shifts', shiftId);
    const shiftSnap = await getDoc(shiftRef);

    if (!shiftSnap.exists()) {
      throw new Error('Shift not found');
    }

    const shift = shiftSnap.data();

    const userRef = doc(db, 'users', targetUserId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error('User not found');
    }

    const user = userSnap.data();

    if (user.facilityId !== sourceFacilityId) {
      throw new Error('User does not belong to source facility');
    }

    await updateDoc(shiftRef, {
      userId: targetUserId,
      isFloater: true,
      sourceFacilityId,
      updatedAt: serverTimestamp(),
    });

    await appendAudit('shifts', shiftId, {
      uid: ctx.userId,
      action: 'FLOATER_ASSIGNED',
      metadata: {
        targetUserId,
        sourceFacilityId,
      },
    });

    const shiftStart = parseTime(shift.startTime);
    const shiftEnd = parseTime(shift.endTime);
    const hours = calculateDuration(shiftStart, shiftEnd);

    const rateRef = doc(db, 'floater_rates', sourceFacilityId);
    const rateSnap = await getDoc(rateRef);
    const hourlyRate = rateSnap.exists() ? rateSnap.data().hourlyRate : 50;

    const estimatedCost = hours * hourlyRate;

    const crossCharge = {
      shiftId,
      fromFacility: sourceFacilityId,
      toFacility: ctx.facilityId,
      userId: targetUserId,
      date: shift.date,
      hours,
      hourlyRate,
      totalCost: estimatedCost,
      status: 'PENDING',
      createdAt: serverTimestamp(),
    };

    const crossChargeRef = await addDoc(collection(db, 'cross_charges'), crossCharge);

    await ctx.auditLogger('calendar.assign_floater', 'SUCCESS', {
      shiftId,
      targetUserId,
      sourceFacilityId,
      crossChargeId: crossChargeRef.id,
      estimatedCost,
    });

    return {
      crossChargeId: crossChargeRef.id,
      estimatedCost,
    };
  }
};

function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours + minutes / 60;
}

function calculateDuration(start: number, end: number): number {
  if (end < start) {
    return (24 - start) + end;
  }
  return end - start;
}

