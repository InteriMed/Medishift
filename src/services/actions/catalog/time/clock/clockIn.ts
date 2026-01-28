import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { appendAudit } from '../../common/utils';

const ClockInSchema = z.object({
  facilityId: z.string(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    ipAddress: z.string(),
  }).optional(),
  method: z.enum(['APP', 'BADGE', 'WEB']),
});

interface ClockInResult {
  clockId: string;
  linkedShiftId?: string;
  earlyWarning?: string;
}

export const clockInAction: ActionDefinition<typeof ClockInSchema, ClockInResult> = {
  id: "time.clock_in",
  fileLocation: "src/services/actions/catalog/time/clock/clockIn.ts",
  
  requiredPermission: "time.clock_in",
  
  label: "Clock In",
  description: "Record arrival with geofence check and schedule matching",
  keywords: ["time", "clock", "attendance", "check-in"],
  icon: "LogIn",
  
  schema: ClockInSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const { facilityId, location, method } = input;

    const whitelistRef = doc(db, 'facility_whitelists', facilityId);
    const whitelistSnap = await getDoc(whitelistRef);

    if (whitelistSnap.exists() && location) {
      const whitelist = whitelistSnap.data();
      
      if (whitelist.geofencing) {
        const distance = calculateDistance(
          location.latitude,
          location.longitude,
          whitelist.geofencing.latitude,
          whitelist.geofencing.longitude
        );

        if (distance > whitelist.geofencing.radiusMeters) {
          throw new Error(`You are ${Math.round(distance)}m away. Must be within ${whitelist.geofencing.radiusMeters}m to clock in.`);
        }
      }

      if (whitelist.allowedIPs && whitelist.allowedIPs.length > 0) {
        const isAllowedIP = whitelist.allowedIPs.some((pattern: string) => 
          location.ipAddress.startsWith(pattern.replace('*', ''))
        );
        
        if (!isAllowedIP) {
          throw new Error('IP address not whitelisted for this facility');
        }
      }
    }

    const today = new Date().toISOString().split('T')[0];
    const shiftsRef = collection(db, 'calendar_shifts');
    const shiftQuery = query(
      shiftsRef,
      where('userId', '==', ctx.userId),
      where('facilityId', '==', facilityId),
      where('date', '==', today)
    );
    const shiftSnapshot = await getDocs(shiftQuery);

    let linkedShiftId: string | undefined;
    let earlyWarning: string | undefined;

    if (!shiftSnapshot.empty) {
      const shift = shiftSnapshot.docs[0];
      linkedShiftId = shift.id;
      const shiftData = shift.data();

      const now = new Date();
      const shiftStart = new Date(`${today}T${shiftData.startTime}`);
      const minutesEarly = (shiftStart.getTime() - now.getTime()) / 60000;

      if (minutesEarly > 15) {
        earlyWarning = `You are clocking in ${Math.round(minutesEarly)} minutes early for your ${shiftData.startTime} shift.`;
      }
    }

    const clocksRef = collection(db, 'time_clock_entries');
    const clockDoc = await addDoc(clocksRef, {
      userId: ctx.userId,
      facilityId,
      type: 'CLOCK_IN',
      timestamp: serverTimestamp(),
      location,
      method,
      linkedShiftId,
      status: 'VALID',
    });

    await appendAudit('time_clock_entries', clockDoc.id, {
      uid: ctx.userId,
      action: 'CLOCKED_IN',
      metadata: { facilityId, method },
    });

    await ctx.auditLogger('time.clock_in', 'SUCCESS', {
      clockId: clockDoc.id,
      facilityId,
      linkedShiftId,
    });

    return {
      clockId: clockDoc.id,
      linkedShiftId,
      earlyWarning,
    };
  }
};

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

