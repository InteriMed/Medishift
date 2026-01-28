import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

const CreateEventSchema = z.object({
  title: z.string().optional(),
  start: z.string().datetime(),
  end: z.string().datetime(),
  color: z.string().optional(),
  color1: z.string().optional(),
  color2: z.string().optional(),
  notes: z.string().optional(),
  location: z.string().optional(),
  isAvailability: z.boolean().default(true),
  isValidated: z.boolean().default(true),
  canton: z.array(z.string()).optional(),
  area: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  experience: z.string().optional(),
  software: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  workAmount: z.string().optional(),
});

interface CreateEventResult {
  id: string;
  success: boolean;
}

export const createEventAction: ActionDefinition<typeof CreateEventSchema, CreateEventResult> = {
  id: "calendar.create_event",
  fileLocation: "src/services/actions/catalog/calendar/events/createEvent.ts",
  
  requiredPermission: "thread.create",
  
  label: "Create Calendar Event",
  description: "Create a new calendar event or availability slot",
  keywords: ["event", "availability", "create", "calendar"],
  icon: "CalendarPlus",
  
  schema: CreateEventSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const eventData = {
      userId: ctx.userId,
      title: input.title || 'Available',
      from: Timestamp.fromDate(new Date(input.start)),
      to: Timestamp.fromDate(new Date(input.end)),
      color: input.color || '#0f54bc',
      color1: input.color1 || '#a8c1ff',
      color2: input.color2 || '#4da6fb',
      notes: input.notes || '',
      location: input.location || '',
      isAvailability: input.isAvailability,
      isValidated: input.isValidated,
      locationCountry: input.canton || [],
      LocationArea: input.area || [],
      languages: input.languages || [],
      experience: input.experience || '',
      software: input.software || [],
      certifications: input.certifications || [],
      workAmount: input.workAmount || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const collectionName = input.isAvailability ? 'availability' : 'events';
    const eventRef = await addDoc(collection(db, collectionName), eventData);

    await ctx.auditLogger('calendar.create_event', 'SUCCESS', {
      eventId: eventRef.id,
      isAvailability: input.isAvailability,
      start: input.start,
      end: input.end,
    });

    return {
      id: eventRef.id,
      success: true,
    };
  }
};

