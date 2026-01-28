import { z } from "zod";
import { ActionDefinition } from "../../../flows/types";
import { db } from '../../../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { TrendAnalysis } from '../../types';

const AnalyzeTrendsSchema = z.object({
  dateRange: z.object({
    start: z.string(),
    end: z.string(),
  }),
});

interface AnalyzeTrendsResult {
  trends: TrendAnalysis;
}

export const analyzeTrendsAction: ActionDefinition<typeof AnalyzeTrendsSchema, AnalyzeTrendsResult> = {
  id: "support.analyze_trends",
  fileLocation: "src/services/actions/catalog/support/analyzeTrends.ts",
  
  requiredPermission: "admin.access",
  
  label: "Analyze Support Trends",
  description: "Identify top issues and patterns for feature prioritization",
  keywords: ["support", "trends", "analytics", "admin"],
  icon: "TrendingUp",
  
  schema: AnalyzeTrendsSchema,
  
  metadata: {
    autoToast: false,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const { dateRange } = input;

    const ticketsRef = collection(db, 'support_tickets');
    const ticketsQuery = query(
      ticketsRef,
      where('createdAt', '>=', new Date(dateRange.start)),
      where('createdAt', '<=', new Date(dateRange.end))
    );
    const ticketsSnapshot = await getDocs(ticketsQuery);

    const categoryCount: Record<string, number> = {};
    let totalResolutionTime = 0;
    let resolvedCount = 0;

    ticketsSnapshot.forEach(doc => {
      const ticket = doc.data();
      const category = ticket.category || 'Other';
      
      categoryCount[category] = (categoryCount[category] || 0) + 1;

      if (ticket.resolvedAt && ticket.createdAt) {
        const resolutionTime = ticket.resolvedAt.toMillis() - ticket.createdAt.toMillis();
        totalResolutionTime += resolutionTime;
        resolvedCount++;
      }
    });

    const totalTickets = ticketsSnapshot.size;
    const topIssues = Object.entries(categoryCount)
      .map(([category, count]) => ({
        category,
        count,
        percentage: (count / totalTickets) * 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const averageResolutionTime = resolvedCount > 0 
      ? totalResolutionTime / resolvedCount / (1000 * 60 * 60)
      : 0;

    await ctx.auditLogger('support.analyze_trends', 'SUCCESS', {
      dateRange,
      totalTickets,
      topCategory: topIssues[0]?.category,
    });

    return {
      trends: {
        topIssues,
        totalTickets,
        averageResolutionTime,
      },
    };
  }
};

