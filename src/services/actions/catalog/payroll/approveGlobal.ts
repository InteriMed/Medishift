import { z } from "zod";
import { ActionDefinition, ActionContext } from "../../types";
import { db } from '../../../services/firebase';
import { collection, query, where, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';

const ApproveGlobalSchema = z.object({
  month: z.number().min(1).max(12),
  year: z.number(),
});

interface ApproveGlobalResult {
  approvedFacilities: number;
  totalEmployees: number;
  readyForFiduciary: boolean;
}

export const approveGlobalAction: ActionDefinition<typeof ApproveGlobalSchema, ApproveGlobalResult> = {
  id: "payroll.approve_global",
  fileLocation: "src/services/actions/catalog/payroll/approveGlobal.ts",
  
  requiredPermission: "admin.access",
  
  label: "Approve Global Payroll",
  description: "HQ: Approve all facility payrolls for fiduciary export",
  keywords: ["payroll", "approve", "global", "hq"],
  icon: "CheckCircle2",
  
  schema: ApproveGlobalSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'HIGH',
  },

  handler: async (input: z.infer<typeof ApproveGlobalSchema>, ctx: ActionContext) => {
    const { month, year } = input;

    const periodsRef = collection(db, 'payroll_periods');
    const q = query(
      periodsRef,
      where('month', '==', month),
      where('year', '==', year)
    );

    const snapshot = await getDocs(q);
    const periods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const notLocked = periods.filter((p: any) => p.status !== 'LOCKED');
    
    if (notLocked.length > 0) {
      const facilityIds = notLocked.map((p: any) => p.facilityId).join(', ');
      throw new Error(
        `Cannot approve: ${notLocked.length} facilities not locked yet: ${facilityIds}`
      );
    }

    const batch = writeBatch(db);
    let totalEmployees = 0;

    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        status: 'APPROVED',
        approvedAt: serverTimestamp(),
        approvedBy: ctx.userId,
        updatedAt: serverTimestamp(),
      });

      const period = doc.data();
      totalEmployees += Object.keys(period.variables || {}).length;
    });

    await batch.commit();

    await ctx.auditLogger('payroll.approve_global', 'SUCCESS', {
      month,
      year,
      approvedFacilities: periods.length,
      totalEmployees,
    });

    return {
      approvedFacilities: periods.length,
      totalEmployees,
      readyForFiduciary: true,
    };
  }
};

