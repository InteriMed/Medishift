import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { functions } from '../../../../../services/firebase';
import { httpsCallable } from 'firebase/functions';

const ExportIcalLinkSchema = z.object({
  userId: z.string().optional(),
  expiresInDays: z.number().default(365),
});

interface ExportIcalLinkResult {
  icalUrl: string;
  expiresAt: number;
}

export const exportIcalLinkAction: ActionDefinition<typeof ExportIcalLinkSchema, ExportIcalLinkResult> = {
  id: "calendar.export_ical_link",
  fileLocation: "src/services/actions/catalog/calendar/export/exportIcalLink.ts",
  
  requiredPermission: "shift.view",
  
  label: "Export iCal Link",
  description: "Generate secure iCal feed URL for calendar sync",
  keywords: ["ical", "export", "calendar", "sync"],
  icon: "Calendar",
  
  schema: ExportIcalLinkSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const { userId, expiresInDays } = input;
    const targetUserId = userId || ctx.userId;

    if (targetUserId !== ctx.userId && !ctx.userPermissions.includes('shift.create')) {
      throw new Error('Insufficient permissions to export other users calendars');
    }

    const generateIcal = httpsCallable(functions, 'generateIcalLink');
    
    const result = await generateIcal({
      userId: targetUserId,
      facilityId: ctx.facilityId,
      expiresInDays,
    });

    const data = result.data as any;

    await ctx.auditLogger('calendar.export_ical_link', 'SUCCESS', {
      userId: targetUserId,
      expiresInDays,
    });

    return {
      icalUrl: data.icalUrl,
      expiresAt: data.expiresAt,
    };
  }
};

