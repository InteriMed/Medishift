import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { doc, getDoc, deleteDoc, query, collection, where, getDocs, writeBatch } from 'firebase/firestore';

const DeleteEventSchema = z.object({
  eventId: z.string(),
  deleteType: z.enum(['single', 'all', 'future']).default('single'),
  recurrenceId: z.string().optional(),
});

interface DeleteEventResult {
  success: boolean;
  deletedCount: number;
}

export const deleteEventAction: ActionDefinition<typeof DeleteEventSchema, DeleteEventResult> = {
  id: "calendar.delete_event",
  fileLocation: "src/services/actions/catalog/calendar/events/deleteEvent.ts",
  
  requiredPermission: "thread.create",
  
  label: "Delete Calendar Event",
  description: "Delete a calendar event or availability slot",
  keywords: ["event", "availability", "delete", "remove"],
  icon: "Trash2",
  
  schema: DeleteEventSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'MEDIUM',
  },

  handler: async (input, ctx) => {
    const { eventId, deleteType, recurrenceId } = input;

    // Try availability collection first
    let eventRef = doc(db, 'availability', eventId);
    let eventSnap = await getDoc(eventRef);
    let collectionName = 'availability';

    // If not found, try events collection
    if (!eventSnap.exists()) {
      eventRef = doc(db, 'events', eventId);
      eventSnap = await getDoc(eventRef);
      collectionName = 'events';
    }

    if (!eventSnap.exists()) {
      throw new Error('Event not found');
    }

    const eventData = eventSnap.data();

    // Check permission
    if (eventData.userId !== ctx.userId) {
      throw new Error('Permission denied: You can only delete your own events');
    }

    let deletedCount = 0;

    if (deleteType === 'single') {
      await deleteDoc(eventRef);
      deletedCount = 1;
    } else if ((deleteType === 'all' || deleteType === 'future') && recurrenceId) {
      const recurringQuery = query(
        collection(db, collectionName),
        where('userId', '==', ctx.userId),
        where('recurrenceId', '==', recurrenceId)
      );

      const snapshot = await getDocs(recurringQuery);
      const batch = writeBatch(db);

      snapshot.docs.forEach(doc => {
        if (deleteType === 'all') {
          batch.delete(doc.ref);
          deletedCount++;
        } else if (deleteType === 'future') {
          const docData = doc.data();
          const eventDate = docData.from?.toDate?.() || new Date(docData.from);
          const currentEventDate = eventData.from?.toDate?.() || new Date(eventData.from);
          
          if (eventDate >= currentEventDate) {
            batch.delete(doc.ref);
            deletedCount++;
          }
        }
      });

      await batch.commit();
    } else {
      await deleteDoc(eventRef);
      deletedCount = 1;
    }

    await ctx.auditLogger('calendar.delete_event', 'SUCCESS', {
      eventId,
      deleteType,
      deletedCount,
    });

    return {
      success: true,
      deletedCount,
    };
  }
};

