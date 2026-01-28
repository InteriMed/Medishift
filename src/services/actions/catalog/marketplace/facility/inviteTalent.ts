import { z } from "zod";
import { ActionDefinition, ActionContext } from "../../../types";
import { db } from '../../../../services/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { broadcastNotification } from '../../../../services/notifications';
import { NotificationPayload } from '../../../../types/context';

const InviteTalentSchema = z.object({
  missionId: z.string(),
  userId: z.string(),
  personalMessage: z.string().optional(),
});

export const inviteTalentAction: ActionDefinition<typeof InviteTalentSchema, void> = {
  id: "marketplace.invite_talent",
  fileLocation: "src/services/actions/catalog/marketplace/facility/inviteTalent.ts",
  
  requiredPermission: "marketplace.invite_talent",
  
  label: "Invite Talent",
  description: "Send direct invitation to a professional",
  keywords: ["marketplace", "invite", "talent"],
  icon: "UserPlus",
  
  schema: InviteTalentSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'LOW',
  },

  handler: async (input: z.infer<typeof InviteTalentSchema>, ctx: ActionContext) => {
    const { missionId, userId, personalMessage } = input;

    const missionRef = doc(db, 'marketplace_missions', missionId);
    const missionSnap = await getDoc(missionRef);

    if (!missionSnap.exists()) {
      throw new Error('Mission not found');
    }

    const missionData = missionSnap.data();

    const invitationsRef = collection(db, 'marketplace_invitations');
    await addDoc(invitationsRef, {
      missionId,
      targetUserId: userId,
      fromFacilityId: ctx.facilityId,
      fromUserId: ctx.userId,
      personalMessage,
      status: 'SENT',
      createdAt: serverTimestamp(),
    });

    const notificationPayload: NotificationPayload = {
      title: `${missionData.facilityName} invited you to a mission`,
      body: personalMessage || `${missionData.role} position available on ${missionData.dates[0]}`,
      priority: 'HIGH',
      target: {
        type: 'USER',
        userIds: [userId],
      },
      actionUrl: `/marketplace/missions/${missionId}`,
    };

    await broadcastNotification(notificationPayload, ctx.userId, ctx.facilityId);

    await ctx.auditLogger('marketplace.invite_talent', 'SUCCESS', {
      missionId,
      targetUserId: userId,
    });
  }
};

