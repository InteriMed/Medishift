import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { sendNotificationToUser } from '../../../../services/notifications';
import { appendAudit } from '../../common/utils';

const UpdateIbanSchema = z.object({
  iban: z.string().regex(/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/),
  bankName: z.string(),
  confirmPassword: z.string().min(1),
});

export const updateIbanAction: ActionDefinition<typeof UpdateIbanSchema, void> = {
  id: "profile.update_iban",
  fileLocation: "src/services/actions/catalog/team/finance/updateIban.ts",
  
  requiredPermission: "thread.create",
  
  label: "Update Bank Details",
  description: "Update IBAN for salary payments (requires re-auth)",
  keywords: ["iban", "bank", "payment", "salary"],
  icon: "CreditCard",
  
  schema: UpdateIbanSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'HIGH',
  },

  handler: async (input, ctx) => {
    const { iban, bankName, confirmPassword } = input;

    const { auth } = await import('../../../../services/firebase');
    const { reauthenticateWithCredential, EmailAuthProvider } = await import('firebase/auth');
    
    const user = auth.currentUser;
    if (!user || !user.email) {
      throw new Error('User not authenticated');
    }

    try {
      const credential = EmailAuthProvider.credential(user.email, confirmPassword);
      await reauthenticateWithCredential(user, credential);
    } catch (error) {
      throw new Error('Password verification failed. Please enter your correct password.');
    }

    const userRef = doc(db, 'users', ctx.userId);
    
    await updateDoc(userRef, {
      iban,
      bankName,
      ibanUpdatedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await appendAudit('users', ctx.userId, {
      uid: ctx.userId,
      action: 'IBAN_UPDATED',
      ip: ctx.ipAddress,
    });

    await sendNotificationToUser(ctx.userId, {
      title: 'Bank Details Updated',
      body: 'Your IBAN has been changed. If this wasn\'t you, contact HR immediately.',
      priority: 'HIGH',
      actionUrl: '/profile/security',
      data: {
        type: 'IBAN_CHANGED',
      },
    });

    await ctx.auditLogger('profile.update_iban', 'SUCCESS', {
      userId: ctx.userId,
    });
  }
};

