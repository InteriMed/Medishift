import { z } from "zod";
import { ActionDefinition, ActionContext } from "../../../types";
import { db } from '../../../../services/firebase';
import { collection, query, getDocs } from 'firebase/firestore';

interface EfficiencyMetric {
  facilityId: string;
  facilityName: string;
  metric: string;
  value: number;
  rank: number;
  networkAverage: number;
}

const metricEnum = ['REVENUE_PER_HOUR', 'STAFF_UTILIZATION', 'COST_PER_PATIENT'] as const;

const CompareEfficiencySchema = z.object({
  metric: z.enum(metricEnum),
});

interface CompareEfficiencyResult {
  rankings: EfficiencyMetric[];
  networkAverage: number;
}

export const compareEfficiencyAction: ActionDefinition<typeof CompareEfficiencySchema, CompareEfficiencyResult> = {
  id: "org.compare_efficiency",
  fileLocation: "src/services/actions/catalog/organization/analytics/compareEfficiency.ts",
  
  requiredPermission: "org.compare_efficiency",
  
  label: "Compare Efficiency",
  description: "Rank facilities by performance metrics",
  keywords: ["analytics", "efficiency", "ranking", "performance"],
  icon: "BarChart",
  
  schema: CompareEfficiencySchema,
  
  metadata: {
    autoToast: false,
    riskLevel: 'LOW',
  },

  handler: async (input: z.infer<typeof CompareEfficiencySchema>, ctx: ActionContext) => {
    const { metric } = input;

    const facilitiesRef = collection(db, 'facility_profiles');
    const facilitiesSnapshot = await getDocs(facilitiesRef);

    const metrics: EfficiencyMetric[] = [];

    for (const facilityDoc of facilitiesSnapshot.docs) {
      const facilityData = facilityDoc.data();

      const value = await calculateMetric(facilityDoc.id, metric);

      metrics.push({
        facilityId: facilityDoc.id,
        facilityName: facilityData.name,
        metric,
        value,
        rank: 0,
        networkAverage: 0,
      });
    }

    const networkAverage = metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;

    metrics.sort((a, b) => b.value - a.value);
    metrics.forEach((m, index) => {
      m.rank = index + 1;
      m.networkAverage = networkAverage;
    });

    await ctx.auditLogger('org.compare_efficiency', 'SUCCESS', {
      metric,
      facilitiesCompared: metrics.length,
    });

    return {
      rankings: metrics,
      networkAverage,
    };
  }
};

async function calculateMetric(facilityId: string, metric: string): Promise<number> {
  return Math.random() * 100;
}

