import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../../services/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { appendAudit } from '../../common/utils';

const UpdateContractTermsSchema = z.object({
  userId: z.string(),
  workPercentage: z.number().min(10).max(100).optional(),
  salary: z.number().optional(),
  jobTitle: z.string().optional(),
  annualVacationDays: z.number().optional(),
  maxWeeklyHours: z.number().optional(),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const updateContractTermsAction: ActionDefinition<typeof UpdateContractTermsSchema, void> = {
  id: "team.update_contract_terms",
  fileLocation: "src/services/actions/catalog/team/compliance/updateContractTerms.ts",
  
  requiredPermission: "admin.access",
  
  label: "Update Contract Terms",
  description: "Modify employment contract parameters",
  keywords: ["contract", "salary", "pensum", "percentage"],
  icon: "FileText",
  
  schema: UpdateContractTermsSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'HIGH',
  },

  handler: async (input, ctx) => {
    const { userId, workPercentage, ...updates } = input;

    const contractsRef = collection(db, 'contracts');
    const q = query(
      contractsRef,
      where('userId', '==', userId),
      where('status', '==', 'ACTIVE')
    );

    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      throw new Error('No active contract found for user');
    }

    const contractRef = doc(db, 'contracts', snapshot.docs[0].id);
    const updateData: any = {
      ...updates,
      updatedAt: serverTimestamp(),
      lastModifiedBy: ctx.userId,
    };

    if (workPercentage !== undefined) {
      updateData.workPercentage = workPercentage;
      
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        workPercentage,
        updatedAt: serverTimestamp(),
      });

      const patternsRef = collection(db, 'shift_patterns');
      const patternQuery = query(patternsRef, where('userId', '==', userId));
      const patternsSnap = await getDocs(patternQuery);

      for (const patternDoc of patternsSnap.docs) {
        await updateDoc(patternDoc.ref, {
          workPercentage,
          updatedAt: serverTimestamp(),
        });
      }
    }

    await updateDoc(contractRef, updateData);

    await appendAudit('contracts', snapshot.docs[0].id, {
      uid: ctx.userId,
      action: 'CONTRACT_UPDATED',
      metadata: updates,
    });

    await ctx.auditLogger('team.update_contract_terms', 'SUCCESS', {
      userId,
      updates,
    });
  }
};

