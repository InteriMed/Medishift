import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';

const ListEventsSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  includeContracts: z.boolean().default(false),
});

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  color: string;
  color1: string;
  color2: string;
  isAvailability?: boolean;
  isContract?: boolean;
  isValidated: boolean;
  recurrenceId?: string;
  isRecurring: boolean;
  [key: string]: any;
}

interface ListEventsResult {
  events: CalendarEvent[];
  count: number;
}

export const listEventsAction: ActionDefinition<typeof ListEventsSchema, ListEventsResult> = {
  id: "calendar.list_events",
  fileLocation: "src/services/actions/catalog/calendar/events/listEvents.ts",
  
  requiredPermission: "thread.create",
  
  label: "List Calendar Events",
  description: "Get all calendar events for current user",
  keywords: ["event", "availability", "list", "fetch"],
  icon: "List",
  
  schema: ListEventsSchema,
  
  metadata: {
    autoToast: false,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const events: CalendarEvent[] = [];

    // Fetch availability events
    const availabilityQuery = query(
      collection(db, 'availability'),
      where('userId', '==', ctx.userId)
    );
    const availabilitySnapshot = await getDocs(availabilityQuery);

    availabilitySnapshot.forEach(doc => {
      const data = doc.data();
      const startDate = data.from instanceof Timestamp ? data.from.toDate() : new Date(data.from);
      const endDate = data.to instanceof Timestamp ? data.to.toDate() : new Date(data.to);

      const isValidated = data.isValidated || false;
      let eventColor, color1, color2;

      if (isValidated) {
        eventColor = '#0f54bc';
        color1 = '#a8c1ff';
        color2 = '#4da6fb';
      } else {
        eventColor = '#8c8c8c';
        color1 = '#e6e6e6';
        color2 = '#b3b3b3';
      }

      events.push({
        id: doc.id,
        title: data.title || 'Available',
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        color: eventColor,
        color1: color1,
        color2: color2,
        isAvailability: true,
        isValidated: isValidated,
        recurrenceId: data.recurrenceId || undefined,
        isRecurring: !!data.recurrenceId,
        canton: data.locationCountry || [],
        area: data.LocationArea || [],
        languages: data.languages || [],
        experience: data.experience || '',
        software: data.software || [],
        certifications: data.certifications || [],
        workAmount: data.workAmount || '',
        notes: data.notes || '',
        location: typeof data.location === 'object' ? (data.location.address || data.location.name || '') : (data.location || ''),
      });
    });

    // Fetch from events collection as well
    const eventsQuery = query(
      collection(db, 'events'),
      where('userId', '==', ctx.userId)
    );
    const eventsSnapshot = await getDocs(eventsQuery);

    eventsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.type === 'worker_availability' || data.isAvailability) {
        const startDate = data.from instanceof Timestamp ? data.from.toDate() : new Date(data.from);
        const endDate = data.to instanceof Timestamp ? data.to.toDate() : new Date(data.to);

        events.push({
          id: doc.id,
          title: data.title || 'Available',
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          color: data.color || '#0f54bc',
          color1: data.color1 || '#a8c1ff',
          color2: data.color2 || '#4da6fb',
          isAvailability: true,
          isValidated: data.isValidated || false,
          recurrenceId: data.recurrenceId || undefined,
          isRecurring: !!data.recurrenceId,
          notes: data.notes || '',
          location: typeof data.location === 'object' ? (data.location.address || data.location.name || '') : (data.location || ''),
        });
      }
    });

    // Optionally fetch contracts
    if (input.includeContracts) {
      const contractsQuery = query(
        collection(db, 'contracts'),
        where('parties.professional.profileId', '==', ctx.userId)
      );
      const contractsSnapshot = await getDocs(contractsQuery);

      contractsSnapshot.forEach(doc => {
        const data = doc.data();
        const status = data.statusLifecycle?.currentStatus || data.status;

        if (status === 'active' || status === 'pending' || 
            status === 'pending_professional_approval' || 
            status === 'pending_facility_approval') {
          const startDate = data.from instanceof Timestamp ? data.from.toDate() : new Date(data.from);
          const endDate = data.to instanceof Timestamp ? data.to.toDate() : new Date(data.to);

          events.push({
            id: doc.id,
            title: data.title || 'Contract',
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            color: '#f54455',
            color1: '#ffbbcf',
            color2: '#ff6064',
            isContract: true,
            isValidated: data.isValidated || false,
            isRecurring: false,
            location: data.location || '',
            notes: data.notes || '',
          });
        }
      });
    }

    await ctx.auditLogger('calendar.list_events', 'SUCCESS', {
      count: events.length,
      includeContracts: input.includeContracts,
    });

    return {
      events,
      count: events.length,
    };
  }
};

