import { z } from "zod";
import { ActionDefinition, ActionContext } from "../../types";
import { db } from '../../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

const CheckComplianceStatusSchema = z.object({
  userId: z.string(),
});

interface CheckComplianceStatusResult {
  status: 'SAFE' | 'WARNING' | 'NON_COMPLIANT';
  totalPoints: number;
  requiredPoints: number;
  categoryBreakdown: Record<string, number>;
  message: string;
}

export const checkComplianceStatusAction: ActionDefinition<typeof CheckComplianceStatusSchema, CheckComplianceStatusResult> = {
  id: "education.check_compliance_status",
  fileLocation: "src/services/actions/catalog/education/checkComplianceStatus.ts",
  
  requiredPermission: "education.check_compliance_status",
  
  label: "Check FPH Compliance Status",
  description: "Verify pharmacist license status (SAFE/WARNING/NON_COMPLIANT)",
  keywords: ["fph", "compliance", "license", "swiss"],
  icon: "Shield",
  
  schema: CheckComplianceStatusSchema,
  
  metadata: {
    autoToast: false,
    riskLevel: 'LOW',
  },

  handler: async (input: z.infer<typeof CheckComplianceStatusSchema>, ctx: ActionContext) => {
    const { userId } = input;

    const walletRef = doc(db, 'fph_wallets', userId);
    const walletSnap = await getDoc(walletRef);

    if (!walletSnap.exists()) {
      return {
        status: 'NON_COMPLIANT',
        totalPoints: 0,
        requiredPoints: 50,
        categoryBreakdown: {},
        message: 'No FPH credits logged',
      };
    }

    const wallet = walletSnap.data();
    const totalPoints = wallet.totalPoints || 0;
    const requiredPoints = 50;
    const clinicalPharmacyPoints = wallet.categoryPoints?.CLINICAL_PHARMACY || 0;
    const requiredClinicalPoints = 15;

    let status: 'SAFE' | 'WARNING' | 'NON_COMPLIANT';
    let message: string;

    if (totalPoints >= requiredPoints && clinicalPharmacyPoints >= requiredClinicalPoints) {
      status = 'SAFE';
      message = 'License compliance met';
    } else if (totalPoints >= requiredPoints * 0.7) {
      status = 'WARNING';
      message = `${requiredPoints - totalPoints} points needed`;
    } else {
      status = 'NON_COMPLIANT';
      message = 'License at risk - cannot be Responsible Pharmacist';
    }

    await ctx.auditLogger('education.check_compliance_status', 'SUCCESS', {
      userId,
      status,
      totalPoints,
    });

    return {
      status,
      totalPoints,
      requiredPoints,
      categoryBreakdown: wallet.categoryPoints || {},
      message,
    };
  }
};

