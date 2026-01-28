import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { collection, addDoc, serverTimestamp, Timestamp, writeBatch, doc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

const CreateRecurringEventsSchema = z.object({
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
  repeatValue: z.string(),
  endRepeatValue: z.enum(['After', 'On Date', 'Never']),
  endRepeatCount: z.number().optional(),
  endRepeatDate: z.string().datetime().optional(),
  weeklyDays: z.array(z.boolean()).optional(),
  monthlyType: z.enum(['day', 'weekday']).optional(),
  monthlyDay: z.number().optional(),
  monthlyWeek: z.enum(['first', 'second', 'third', 'fourth', 'last']).optional(),
  monthlyDayOfWeek: z.number().optional(),
  canton: z.array(z.string()).optional(),
  area: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  experience: z.string().optional(),
  software: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  workAmount: z.string().optional(),
});

interface CreateRecurringEventsResult {
  recurrenceId: string;
  count: number;
  success: boolean;
}

export const createRecurringEventsAction: ActionDefinition<typeof CreateRecurringEventsSchema, CreateRecurringEventsResult> = {
  id: "calendar.create_recurring_events",
  fileLocation: "src/services/actions/catalog/calendar/events/createRecurringEvents.ts",
  
  requiredPermission: "thread.create",
  
  label: "Create Recurring Events",
  description: "Create recurring calendar events with pattern",
  keywords: ["event", "recurring", "repeat", "pattern"],
  icon: "Repeat",
  
  schema: CreateRecurringEventsSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const recurrenceId = uuidv4();
    const startDate = new Date(input.start);
    const endDate = new Date(input.end);
    const duration = endDate.getTime() - startDate.getTime();

    // Generate occurrence dates
    const occurrenceDates = generateRecurringDates(input, startDate);

    if (occurrenceDates.length === 0) {
      throw new Error('No valid occurrence dates generated');
    }

    if (occurrenceDates.length > 200) {
      throw new Error('Too many occurrences (max 200). Please adjust your recurrence settings.');
    }

    const batch = writeBatch(db);
    const collectionName = input.isAvailability ? 'availability' : 'events';

    occurrenceDates.forEach((occurrenceDate) => {
      const occurrenceStart = new Date(occurrenceDate);
      occurrenceStart.setHours(startDate.getHours(), startDate.getMinutes(), startDate.getSeconds());
      
      const occurrenceEnd = new Date(occurrenceStart.getTime() + duration);

      const eventData = {
        userId: ctx.userId,
        title: input.title || 'Available',
        from: Timestamp.fromDate(occurrenceStart),
        to: Timestamp.fromDate(occurrenceEnd),
        color: input.color || '#0f54bc',
        color1: input.color1 || '#a8c1ff',
        color2: input.color2 || '#4da6fb',
        notes: input.notes || '',
        location: input.location || '',
        isAvailability: input.isAvailability,
        isValidated: input.isValidated,
        recurrenceId: recurrenceId,
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

      const docRef = doc(collection(db, collectionName));
      batch.set(docRef, eventData);
    });

    await batch.commit();

    await ctx.auditLogger('calendar.create_recurring_events', 'SUCCESS', {
      recurrenceId,
      count: occurrenceDates.length,
      pattern: input.repeatValue,
    });

    return {
      recurrenceId,
      count: occurrenceDates.length,
      success: true,
    };
  }
};

// RECURRING DATE GENERATION HELPER
function generateRecurringDates(input: z.infer<typeof CreateRecurringEventsSchema>, startDate: Date): Date[] {
  const occurrenceDates: Date[] = [];
  const dateMap = new Set<string>();
  
  occurrenceDates.push(new Date(startDate));
  dateMap.add(startDate.toDateString());

  const MAX_END_DATE = new Date(startDate);
  MAX_END_DATE.setFullYear(MAX_END_DATE.getFullYear() + 2);
  const MAX_OCCURRENCES = 200;

  let endDate = MAX_END_DATE;
  if (input.endRepeatValue === 'On Date' && input.endRepeatDate) {
    endDate = new Date(input.endRepeatDate);
    endDate.setHours(23, 59, 59, 999);
  }

  let maxOccurrences = MAX_OCCURRENCES;
  if (input.endRepeatValue === 'After' && input.endRepeatCount) {
    maxOccurrences = Math.min(input.endRepeatCount, MAX_OCCURRENCES);
  }

  const currentDate = new Date(startDate);
  let occurrenceCount = 1;

  if (input.repeatValue === 'Every Day') {
    while (occurrenceCount < maxOccurrences && currentDate < endDate) {
      currentDate.setDate(currentDate.getDate() + 1);
      if (currentDate > endDate) break;
      
      const dateKey = currentDate.toDateString();
      if (!dateMap.has(dateKey)) {
        dateMap.add(dateKey);
        occurrenceDates.push(new Date(currentDate));
        occurrenceCount++;
      }
    }
  } else if (input.repeatValue === 'Every Week') {
    while (occurrenceCount < maxOccurrences && currentDate < endDate) {
      currentDate.setDate(currentDate.getDate() + 7);
      if (currentDate > endDate) break;
      
      const dateKey = currentDate.toDateString();
      if (!dateMap.has(dateKey)) {
        dateMap.add(dateKey);
        occurrenceDates.push(new Date(currentDate));
        occurrenceCount++;
      }
    }
  } else if (input.repeatValue === 'Every Month') {
    while (occurrenceCount < maxOccurrences && currentDate < endDate) {
      currentDate.setMonth(currentDate.getMonth() + 1);
      if (currentDate > endDate) break;
      
      const dateKey = currentDate.toDateString();
      if (!dateMap.has(dateKey)) {
        dateMap.add(dateKey);
        occurrenceDates.push(new Date(currentDate));
        occurrenceCount++;
      }
    }
  }

  return occurrenceDates;
}

