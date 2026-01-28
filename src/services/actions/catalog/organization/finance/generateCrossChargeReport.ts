import { z } from "zod";
import { ActionDefinition, ActionContext } from "../../../types";
import { db } from '../../../../services/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

interface CrossChargeEntry {
  sourceEntityId: string;
  targetEntityId: string;
  userId?: string;
  hours: number;
  rate: number;
  totalAmount: number;
  period: string;
}

const GenerateCrossChargeReportSchema = z.object({
  month: z.number().min(1).max(12),
  year: z.number(),
});

interface GenerateCrossChargeReportResult {
  entries: CrossChargeEntry[];
  totalAmount: number;
}

export const generateCrossChargeReportAction: ActionDefinition<typeof GenerateCrossChargeReportSchema, GenerateCrossChargeReportResult> = {
  id: "org.generate_cross_charge_report",
  fileLocation: "src/services/actions/catalog/organization/finance/generateCrossChargeReport.ts",
  
  requiredPermission: "org.generate_cross_charge_report",
  
  label: "Generate Cross-Charge Report",
  description: "Calculate inter-facility reimbursements (ledger matrix)",
  keywords: ["finance", "cross-charge", "reimbursement", "ledger"],
  icon: "FileText",
  
  schema: GenerateCrossChargeReportSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'LOW',
  },

  handler: async (input: z.infer<typeof GenerateCrossChargeReportSchema>, ctx: ActionContext) => {
    const { month, year } = input;
    const period = `${year}-${String(month).padStart(2, '0')}`;

    const shiftsRef = collection(db, 'calendar_shifts');
    const shiftsQuery = query(
      shiftsRef,
      where('type', '==', 'MISSION'),
      where('date', '>=', `${period}-01`),
      where('date', '<=', `${period}-31`)
    );
    const shiftsSnapshot = await getDocs(shiftsQuery);

    const entries: CrossChargeEntry[] = [];

    for (const shiftDoc of shiftsSnapshot.docs) {
      const shift = shiftDoc.data();
      
      const userRef = doc(db, 'users', shift.userId);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data();
      const homeFacilityId = userData?.facilityId;

      if (homeFacilityId && homeFacilityId !== shift.facilityId) {
        const transferPricingRef = doc(db, 'organization_transfer_pricing', shift.role);
        const transferPricingSnap = await getDoc(transferPricingRef);
        const rate = transferPricingSnap.exists() ? transferPricingSnap.data()?.internalRate : 85;

        const hours = calculateShiftHours(shift.startTime, shift.endTime);

        entries.push({
          sourceEntityId: shift.facilityId,
          targetEntityId: homeFacilityId,
          userId: shift.userId,
          hours,
          rate,
          totalAmount: hours * rate,
          period,
        });
      }
    }

    const totalAmount = entries.reduce((sum, entry) => sum + entry.totalAmount, 0);

    await ctx.auditLogger('org.generate_cross_charge_report', 'SUCCESS', {
      period,
      entriesCount: entries.length,
      totalAmount,
    });

    return {
      entries,
      totalAmount,
    };
  }
};

function calculateShiftHours(startTime: string, endTime: string): number {
  const start = new Date(`2000-01-01T${startTime}`);
  const end = new Date(`2000-01-01T${endTime}`);
  return (end.getTime() - start.getTime()) / 3600000;
}

