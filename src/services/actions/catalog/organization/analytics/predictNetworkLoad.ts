import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { NetworkLoadForecast } from '../../../../flows/types';

const PredictNetworkLoadSchema = z.object({
  dates: z.array(z.string()),
});

interface PredictNetworkLoadResult {
  forecasts: NetworkLoadForecast[];
}

export const predictNetworkLoadAction: ActionDefinition<typeof PredictNetworkLoadSchema, PredictNetworkLoadResult> = {
  id: "org.predict_network_load",
  fileLocation: "src/services/actions/catalog/organization/analytics/predictNetworkLoad.ts",
  
  requiredPermission: "org.predict_network_load",
  
  label: "Predict Network Load",
  description: "Aggregate forecasted traffic to warn of network-wide shortages",
  keywords: ["analytics", "forecast", "load", "prediction"],
  icon: "TrendingUp",
  
  schema: PredictNetworkLoadSchema,
  
  metadata: {
    autoToast: false,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const { dates } = input;

    const forecasts: NetworkLoadForecast[] = [];

    for (const date of dates) {
      const shiftsRef = collection(db, 'calendar_shifts');
      const shiftsQuery = query(shiftsRef, where('date', '==', date));
      const shiftsSnapshot = await getDocs(shiftsQuery);

      const roleBreakdown: Record<string, number> = {};
      let totalSupply = 0;

      shiftsSnapshot.forEach(doc => {
        const shift = doc.data();
        totalSupply++;
        
        if (shift.userId) {
          roleBreakdown[shift.role] = (roleBreakdown[shift.role] || 0) + 1;
        }
      });

      const facilitiesRef = collection(db, 'facility_configs');
      const facilitiesSnapshot = await getDocs(facilitiesRef);

      let totalDemand = 0;
      facilitiesSnapshot.forEach(doc => {
        const config = doc.data();
        if (config.minStaffRules) {
          Object.values(config.minStaffRules).forEach((minStaff: any) => {
            totalDemand += minStaff;
          });
        }
      });

      const gap = totalDemand - totalSupply;

      forecasts.push({
        date,
        totalDemand,
        totalSupply,
        gap,
        roleBreakdown: Object.entries(roleBreakdown).map(([role, count]) => ({
          role,
          shortage: count,
        })),
      });
    }

    await ctx.auditLogger('org.predict_network_load', 'SUCCESS', {
      datesAnalyzed: dates.length,
    });

    return {
      forecasts,
    };
  }
};

