import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const SearchNetworkAvailabilitySchema = z.object({
  date: z.string(),
  role: z.string(),
  zone: z.string().optional(),
});

interface AvailableStaff {
  userId: string;
  name: string;
  homeFacility: string;
  overtimeBalance: number;
  utilizationPercent: number;
  skills: string[];
}

interface SearchNetworkAvailabilityResult {
  availableStaff: AvailableStaff[];
}

export const searchNetworkAvailabilityAction: ActionDefinition<typeof SearchNetworkAvailabilitySchema, SearchNetworkAvailabilityResult> = {
  id: "pool.search_network_availability",
  fileLocation: "src/services/actions/catalog/organization/pool/searchNetworkAvailability.ts",
  
  requiredPermission: "pool.search_network",
  
  label: "Search Network Availability (God View)",
  description: "Scan ALL rosters to find free staff with right skills",
  keywords: ["pool", "network", "availability", "search"],
  icon: "Search",
  
  schema: SearchNetworkAvailabilitySchema,
  
  metadata: {
    autoToast: false,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const { date, role, zone } = input;

    const usersRef = collection(db, 'users');
    let usersQuery = query(usersRef, where('role', '==', role), where('status', '==', 'ACTIVE'));
    
    if (zone) {
      const poolMembersRef = collection(db, 'floating_pool_members');
      const poolQuery = query(poolMembersRef, where('zones', 'array-contains', zone));
      const poolSnapshot = await getDocs(poolQuery);
      const poolUserIds = poolSnapshot.docs.map(doc => doc.data().userId);
      
      usersQuery = query(usersRef, where('__name__', 'in', poolUserIds));
    }

    const usersSnapshot = await getDocs(usersQuery);

    const availableStaff: AvailableStaff[] = [];

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();

      const shiftsRef = collection(db, 'calendar_shifts');
      const shiftsQuery = query(
        shiftsRef,
        where('userId', '==', userDoc.id),
        where('date', '==', date)
      );
      const shiftsSnapshot = await getDocs(shiftsQuery);

      if (shiftsSnapshot.empty) {
        availableStaff.push({
          userId: userDoc.id,
          name: `${userData.firstName} ${userData.lastName}`,
          homeFacility: userData.facilityId,
          overtimeBalance: userData.overtimeBalance || 0,
          utilizationPercent: userData.weeklyUtilization || 0,
          skills: userData.skills || [],
        });
      }
    }

    availableStaff.sort((a, b) => b.overtimeBalance - a.overtimeBalance);

    await ctx.auditLogger('pool.search_network_availability', 'SUCCESS', {
      date,
      role,
      resultsCount: availableStaff.length,
    });

    return {
      availableStaff,
    };
  }
};

