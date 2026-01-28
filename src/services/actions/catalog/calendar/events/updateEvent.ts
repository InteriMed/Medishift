import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

const UpdateEventSchema = z.object({
  eventId: z.string(),
  title: z.string().optional(),
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
  color: z.string().optional(),
  color1: z.string().optional(),
  color2: z.string().optional(),
  notes: z.string().optional(),
  location: z.string().optional(),
  isValidated: z.boolean().optional(),
  isRecurring: z.boolean().optional(),
  recurrenceId: z.string().optional(),
  canton: z.array(z.string()).optional(),
  area: z.array(z.string()).optional(),
  experience: z.string().optional(),
  software: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  workAmount: z.string().optional(),
  isAvailability: z.boolean().optional(),
});

interface UpdateEventResult {
  success: boolean;
}

export const updateEventAction: ActionDefinition<typeof UpdateEventSchema, UpdateEventResult> = {
  id: "calendar.update_event",
  fileLocation: "src/services/actions/catalog/calendar/events/updateEvent.ts",
  
  requiredPermission: "thread.create",
  
  label: "Update Calendar Event",
  description: "Update an existing calendar event or availability slot",
  keywords: ["event", "availability", "update", "modify"],
  icon: "Edit",
  
  schema: UpdateEventSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const { eventId, ...updates } = input;

    // Try availability collection first
    let eventRef = doc(db, 'availability', eventId);
    let eventSnap = await getDoc(eventRef);

    // If not found, try events collection
    if (!eventSnap.exists()) {
      eventRef = doc(db, 'events', eventId);
      eventSnap = await getDoc(eventRef);
    }

    if (!eventSnap.exists()) {
      throw new Error('Event not found');
    }

    const eventData = eventSnap.data();

    // Check permission
    if (eventData.userId !== ctx.userId) {
      throw new Error('Permission denied: You can only update your own events');
    }

    const updateData: any = {
      updatedAt: serverTimestamp(),
    };

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.start) updateData.from = Timestamp.fromDate(new Date(updates.start));
    if (updates.end) updateData.to = Timestamp.fromDate(new Date(updates.end));
    if (updates.color) updateData.color = updates.color;
    if (updates.color1) updateData.color1 = updates.color1;
    if (updates.color2) updateData.color2 = updates.color2;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.location !== undefined) updateData.location = updates.location;
    if (updates.isValidated !== undefined) updateData.isValidated = updates.isValidated;
    if (updates.isRecurring !== undefined) updateData.isRecurring = updates.isRecurring;
    if (updates.recurrenceId !== undefined) updateData.recurrenceId = updates.recurrenceId;
    if (updates.canton) updateData.locationCountry = updates.canton;
    if (updates.area) updateData.LocationArea = updates.area;
    if (updates.experience !== undefined) updateData.experience = updates.experience;
    if (updates.software) updateData.software = updates.software;
    if (updates.certifications) updateData.certifications = updates.certifications;
    if (updates.workAmount !== undefined) updateData.workAmount = updates.workAmount;

    await updateDoc(eventRef, updateData);

    await ctx.auditLogger('calendar.update_event', 'SUCCESS', {
      eventId,
      updates: Object.keys(updateData),
    });

    return {
      success: true,
    };
  }
};

