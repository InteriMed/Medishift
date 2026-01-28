import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../../services/firebase';
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { appendAudit } from '../../common/utils';
import { sendNotification } from '../../../../services/notifications';

const NegotiateOfferSchema = z.object({
  applicationId: z.string(),
  counterOffer: z.number().positive(),
  message: z.string().optional(),
});

export const negotiateOfferAction: ActionDefinition<typeof NegotiateOfferSchema, void> = {
  id: "marketplace.negotiate_offer",
  fileLocation: "src/services/actions/catalog/marketplace/professional/negotiateOffer.ts",
  
  requiredPermission: "marketplace.negotiate",
  
  label: "Negotiate Offer",
  description: "Counter-offer on mission rate",
  keywords: ["marketplace", "negotiate", "rate", "salary"],
  icon: "DollarSign",
  
  schema: NegotiateOfferSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const { applicationId, counterOffer, message } = input;

    const applicationRef = doc(db, 'marketplace_applications', applicationId);
    const applicationSnap = await getDoc(applicationRef);

    if (!applicationSnap.exists()) {
      throw new Error('Application not found');
    }

    const application = applicationSnap.data();

    if (application.professionalId !== ctx.userId) {
      throw new Error('Not authorized to negotiate this application');
    }

    await updateDoc(applicationRef, {
      status: 'NEGOTIATING',
      counterOffer,
      negotiationMessage: message,
      negotiatedAt: serverTimestamp(),
    });

    const missionRef = doc(db, 'marketplace_missions', application.missionId);
    const missionSnap = await getDoc(missionRef);
    const mission = missionSnap.data();

    await sendNotification({
      title: 'Counter-offer received',
      body: `${application.professionalName} proposed ${counterOffer} CHF/hr`,
      priority: 'HIGH',
      target: {
        type: 'USER',
        userIds: [mission.createdBy],
      },
      actionUrl: `/marketplace/applications/${applicationId}`,
    });

    await appendAudit('marketplace_applications', applicationId, {
      uid: ctx.userId,
      action: 'COUNTER_OFFER_SUBMITTED',
      metadata: { counterOffer, originalRate: mission.ratePerHour },
    });

    await ctx.auditLogger('marketplace.negotiate_offer', 'SUCCESS', {
      applicationId,
      counterOffer,
    });
  }
};

