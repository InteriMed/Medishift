import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { functions } from '../../../../services/firebase';
import { httpsCallable } from 'firebase/functions';

const InviteUserSchema = z.object({
  email: z.string().email(),
  role: z.string(),
  facilityId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  contractStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  workPercentage: z.number().min(10).max(100).default(100),
  jobTitle: z.string(),
});

interface InviteUserResult {
  userId: string;
  inviteUrl: string;
}

export const inviteUserAction: ActionDefinition<typeof InviteUserSchema, InviteUserResult> = {
  id: "team.invite_user",
  fileLocation: "src/services/actions/catalog/team/lifecycle/inviteUser.ts",
  
  requiredPermission: "shift.create",
  
  label: "Invite User (Onboarding)",
  description: "Create new employee account and send welcome email",
  keywords: ["invite", "onboard", "new hire", "employee"],
  icon: "UserPlus",
  
  schema: InviteUserSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'HIGH',
  },

  handler: async (input, ctx) => {
    const inviteUserFunction = httpsCallable(functions, 'inviteUser');
    
    const result = await inviteUserFunction({
      ...input,
      invitedBy: ctx.userId,
      invitedByFacility: ctx.facilityId,
    });

    const data = result.data as any;

    await ctx.auditLogger('team.invite_user', 'SUCCESS', {
      email: input.email,
      facilityId: input.facilityId,
      userId: data.userId,
    });

    return {
      userId: data.userId,
      inviteUrl: data.inviteUrl,
    };
  }
};

