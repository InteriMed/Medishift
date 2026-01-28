import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { collection, query, where, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';
import { sendNotificationToUser } from '../../../../services/notifications';

const PublishPayslipsSchema = z.object({
  month: z.number().min(1).max(12),
  year: z.number(),
  facilityIds: z.array(z.string()).optional(),
});

interface PublishPayslipsResult {
  publishedCount: number;
  notificationsSent: number;
  affectedUsers: string[];
}

export const publishPayslipsAction: ActionDefinition<typeof PublishPayslipsSchema, PublishPayslipsResult> = {
  id: "payroll.publish_payslips",
  fileLocation: "src/services/actions/catalog/payroll/publishPayslips.ts",
  
  requiredPermission: "admin.access",
  
  label: "Publish Payslips",
  description: "Make split payslips visible to employees (Digital Wallet)",
  keywords: ["payroll", "payslip", "publish", "notify"],
  icon: "Send",
  
  schema: PublishPayslipsSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'MEDIUM',
  },

  handler: async (input, ctx) => {
    const { month, year, facilityIds } = input;

    const payslipsRef = collection(db, 'payslips');
    let q = query(
      payslipsRef,
      where('month', '==', month),
      where('year', '==', year),
      where('published', '==', false)
    );

    if (facilityIds && facilityIds.length > 0) {
      q = query(q, where('facilityId', 'in', facilityIds));
    }

    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    const affectedUsers = new Set<string>();

    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        published: true,
        publishedAt: serverTimestamp(),
        publishedBy: ctx.userId,
      });

      const payslip = doc.data();
      affectedUsers.add(payslip.userId);
    });

    await batch.commit();

    let notificationsSent = 0;
    const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });

    for (const userId of affectedUsers) {
      try {
        await sendNotificationToUser(userId, {
          title: 'New Payslip Available',
          body: `Your payslip for ${monthName} ${year} is ready to view`,
          priority: 'HIGH',
          actionUrl: '/profile/payslips',
          data: {
            month,
            year,
            type: 'PAYSLIP_PUBLISHED',
          },
        });
        notificationsSent++;
      } catch (error) {
        console.error(`Failed to notify user ${userId}:`, error);
      }
    }

    await ctx.auditLogger('payroll.publish_payslips', 'SUCCESS', {
      month,
      year,
      publishedCount: snapshot.size,
      notificationsSent,
    });

    return {
      publishedCount: snapshot.size,
      notificationsSent,
      affectedUsers: Array.from(affectedUsers),
    };
  }
};

