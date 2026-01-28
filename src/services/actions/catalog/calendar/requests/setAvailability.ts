import { z } from "zod";
import { ActionDefinition, ActionContext } from "../../../types";
import { db } from '../../../../services/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const availabilityStatusEnum = ['PREFERRED', 'AVAILABLE', 'IMPOSSIBLE'] as const;

const SetAvailabilitySchema = z.object({
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  status: z.enum(availabilityStatusEnum),
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

  handler: async (input: z.infer<typeof SetAvailabilitySchema>, ctx: ActionContext): Promise<void> => {
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

