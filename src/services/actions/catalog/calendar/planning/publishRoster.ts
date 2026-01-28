import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { collection, query, where, getDocs, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { sendNotificationToUser } from '../../../../services/notifications';

const PublishRosterSchema = z.object({
  month: z.number().min(1).max(12),
  year: z.number(),
  notifyUsers: z.boolean().default(true),
});

interface PublishRosterResult {
  publishedCount: number;
  affectedUsers: string[];
  notificationsSent: number;
}

export const publishRosterAction: ActionDefinition<typeof PublishRosterSchema, PublishRosterResult> = {
  id: "calendar.publish_roster",
  fileLocation: "src/services/actions/catalog/calendar/planning/publishRoster.ts",
  
  requiredPermission: "shift.create",
  
  label: "Publish Roster",
  description: "Publish monthly schedule and notify all staff",
  keywords: ["publish", "roster", "schedule", "notify"],
  icon: "Send",
  
  schema: PublishRosterSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'HIGH',
  },

  handler: async (input, ctx) => {
    const { month, year, notifyUsers } = input;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const shiftsRef = collection(db, 'shifts');
    const q = query(
      shiftsRef,
      where('facilityId', '==', ctx.facilityId),
      where('status', '==', 'DRAFT'),
      where('date', '>=', startDateStr),
      where('date', '<=', endDateStr)
    );

    const snapshot = await getDocs(q);
    const shifts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const batch = writeBatch(db);
    const affectedUsers = new Set<string>();

    shifts.forEach(shift => {
      if (shift.userId) {
        affectedUsers.add(shift.userId);
      }

      const shiftRef = doc(db, 'shifts', shift.id);
      batch.update(shiftRef, {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        publishedBy: ctx.userId,
      });
    });

    await batch.commit();

    let notificationsSent = 0;

    if (notifyUsers) {
      const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
      
      for (const userId of affectedUsers) {
        try {
          await sendNotificationToUser(userId, {
            title: `${monthName} Schedule Published`,
            body: `Your schedule for ${monthName} ${year} is now available`,
            priority: 'HIGH',
            actionUrl: `/calendar?month=${month}&year=${year}`,
            data: {
              month,
              year,
              type: 'ROSTER_PUBLISHED',
            },
          });
          notificationsSent++;
        } catch (error) {
          console.error(`Failed to notify user ${userId}:`, error);
        }
      }
    }

    await ctx.auditLogger('calendar.publish_roster', 'SUCCESS', {
      month,
      year,
      publishedCount: shifts.length,
      affectedUsers: Array.from(affectedUsers),
    });

    return {
      publishedCount: shifts.length,
      affectedUsers: Array.from(affectedUsers),
      notificationsSent,
    };
  }
};

