import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../../services/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const ToggleOpenToWorkSchema = z.object({
  active: z.boolean(),
  availability: z.object({
    daysOfWeek: z.array(z.number().min(0).max(6)),
    timeSlots: z.array(z.string()).optional(),
  }).optional(),
  preferredLocations: z.array(z.string()).optional(),
  minRate: z.number().optional(),
  maxDistanceKM: z.number().optional(),
});

export const toggleOpenToWorkAction: ActionDefinition<typeof ToggleOpenToWorkSchema, void> = {
  id: "marketplace.toggle_open_to_work",
  fileLocation: "src/services/actions/catalog/marketplace/professional/toggleOpenToWork.ts",
  
  requiredPermission: "marketplace.toggle_open_to_work",
  
  label: "Toggle Open to Work",
  description: "Broadcast availability to recruiters (passive income mode)",
  keywords: ["marketplace", "availability", "open to work"],
  icon: "ToggleRight",
  
  schema: ToggleOpenToWorkSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const { active, availability, preferredLocations, minRate, maxDistanceKM } = input;

    const openToWorkRef = doc(db, 'marketplace_open_to_work', ctx.userId);
    
    await setDoc(openToWorkRef, {
      userId: ctx.userId,
      active,
      availability: availability || { daysOfWeek: [] },
      preferredLocations: preferredLocations || [],
      minRate: minRate || 0,
      maxDistanceKM: maxDistanceKM || 50,
      lastUpdated: serverTimestamp(),
    });

    await ctx.auditLogger('marketplace.toggle_open_to_work', 'SUCCESS', {
      active,
      availability: availability?.daysOfWeek,
    });
  }
};

