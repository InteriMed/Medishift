import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../../services/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const SetAvailabilitySchema = z.object({
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  status: z.enum(['PREFERRED', 'AVAILABLE', 'IMPOSSIBLE']),
  comment: z.string().optional(),
});

export const setAvailabilityAction: ActionDefinition<typeof SetAvailabilitySchema, void> = {
  id: "calendar.set_availability",
  fileLocation: "src/services/actions/catalog/calendar/requests/setAvailability.ts",
  
  requiredPermission: "thread.create",
  
  label: "Set Availability",
  description: "Set preferred/impossible dates for AI scheduler",
  keywords: ["availability", "preference", "schedule"],
  icon: "CalendarCheck",
  
  schema: SetAvailabilitySchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const { dates, status, comment } = input;

    for (const date of dates) {
      const availabilityId = `${ctx.userId}_${date}`;
      const availabilityRef = doc(db, 'user_availability', availabilityId);

      await setDoc(availabilityRef, {
        userId: ctx.userId,
        facilityId: ctx.facilityId,
        date,
        status,
        comment: comment || '',
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }

    await ctx.auditLogger('calendar.set_availability', 'SUCCESS', {
      dates,
      status,
    });
  }
};

