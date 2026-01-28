import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../../services/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { TalentProfile } from '../types';

const SearchTalentPoolSchema = z.object({
  query: z.string().optional(),
  role: z.string().optional(),
  availabilityDate: z.string().optional(),
  radiusKM: z.number().optional(),
  minRating: z.number().min(1).max(5).optional(),
});

interface SearchTalentPoolResult {
  profiles: TalentProfile[];
}

export const searchTalentPoolAction: ActionDefinition<typeof SearchTalentPoolSchema, SearchTalentPoolResult> = {
  id: "marketplace.search_talent_pool",
  fileLocation: "src/services/actions/catalog/marketplace/facility/searchTalentPool.ts",
  
  requiredPermission: "marketplace.search_talent",
  
  label: "Search Talent Pool",
  description: "Find qualified professionals (anonymized to prevent poaching)",
  keywords: ["marketplace", "talent", "search", "professionals"],
  icon: "Search",
  
  schema: SearchTalentPoolSchema,
  
  metadata: {
    autoToast: false,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const { role, availabilityDate, radiusKM, minRating } = input;

    const usersRef = collection(db, 'users');
    let q = query(usersRef, where('status', '==', 'ACTIVE'));

    if (role) {
      q = query(q, where('role', '==', role));
    }

    const snapshot = await getDocs(q);
    
    const profiles: TalentProfile[] = [];
    for (const userDoc of snapshot.docs) {
      const userData = userDoc.data();

      if (minRating && (userData.rating || 0) < minRating) {
        continue;
      }

      profiles.push({
        id: userDoc.id,
        displayName: anonymizeName(userData.firstName, userData.lastName),
        role: userData.role,
        yearsExperience: userData.yearsExperience || 0,
        location: userData.canton || 'Unknown',
        canton: userData.canton,
        rating: userData.rating,
        reviewCount: userData.reviewCount || 0,
        skills: userData.skills || [],
        availability: userData.availability || [],
        isAnonymized: true,
      });
    }

    await ctx.auditLogger('marketplace.search_talent_pool', 'SUCCESS', {
      resultsCount: profiles.length,
      filters: { role, availabilityDate, radiusKM },
    });

    return {
      profiles: profiles.slice(0, 50),
    };
  }
};

function anonymizeName(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}. ${lastName.charAt(0)}.`;
}

