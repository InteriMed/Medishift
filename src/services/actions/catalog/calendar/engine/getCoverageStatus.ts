import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { CoverageSlot } from '../types';

const GetCoverageStatusSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  granularity: z.enum(['DAY', 'HOUR']).default('DAY'),
});

interface CoverageStatusResult {
  slots: CoverageSlot[];
  totalDeficit: number;
  criticalDates: string[];
}

export const getCoverageStatusAction: ActionDefinition<typeof GetCoverageStatusSchema, CoverageStatusResult> = {
  id: "calendar.get_coverage_status",
  fileLocation: "src/services/actions/catalog/calendar/engine/getCoverageStatus.ts",
  
  requiredPermission: "shift.view",
  
  label: "Get Coverage Status",
  description: "Analyze schedule coverage gaps (heatmap data)",
  keywords: ["coverage", "gaps", "heatmap", "analytics"],
  icon: "Activity",
  
  schema: GetCoverageStatusSchema,
  
  metadata: {
    autoToast: false,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const { startDate, endDate, granularity } = input;

    const shiftsRef = collection(db, 'shifts');
    const q = query(
      shiftsRef,
      where('facilityId', '==', ctx.facilityId),
      where('status', '==', 'PUBLISHED'),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );

    const snapshot = await getDocs(q);
    const shifts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const requirementsRef = collection(db, 'staffing_requirements');
    const reqQuery = query(
      requirementsRef,
      where('facilityId', '==', ctx.facilityId)
    );
    const reqSnapshot = await getDocs(reqQuery);
    const requirements = reqSnapshot.docs.map(doc => doc.data())[0] || {};

    const slots: CoverageSlot[] = [];
    const criticalDates: string[] = [];
    let totalDeficit = 0;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getDay();

      const dayShifts = shifts.filter(s => s.date === dateStr);

      if (granularity === 'DAY') {
        const requiredStaff = requirements.daily?.[dayOfWeek] || 3;
        const actualStaff = dayShifts.filter(s => s.userId).length;
        const deficit = Math.max(0, requiredStaff - actualStaff);

        const roleCoverage: Record<string, { required: number; actual: number }> = {};
        
        dayShifts.forEach(shift => {
          if (!roleCoverage[shift.role]) {
            roleCoverage[shift.role] = { required: 1, actual: 0 };
          }
          if (shift.userId) {
            roleCoverage[shift.role].actual++;
          }
        });

        slots.push({
          date: dateStr,
          timeSlot: 'ALL_DAY',
          requiredStaff,
          actualStaff,
          deficit,
          roles: roleCoverage,
        });

        if (deficit > 0) {
          totalDeficit += deficit;
          if (deficit >= 2) {
            criticalDates.push(dateStr);
          }
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    await ctx.auditLogger('calendar.get_coverage_status', 'SUCCESS', {
      startDate,
      endDate,
      totalDeficit,
      criticalDates: criticalDates.length,
    });

    return {
      slots,
      totalDeficit,
      criticalDates,
    };
  }
};

