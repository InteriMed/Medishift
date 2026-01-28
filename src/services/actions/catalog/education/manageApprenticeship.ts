import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const ManageApprenticeshipSchema = z.object({
  userId: z.string(),
  schoolDays: z.array(z.number().min(0).max(6)),
  schoolName: z.string(),
  cfcStartDate: z.string(),
  cfcEndDate: z.string(),
});

export const manageApprenticeshipAction: ActionDefinition<typeof ManageApprenticeshipSchema, void> = {
  id: "education.manage_apprenticeship",
  fileLocation: "src/services/actions/catalog/education/manageApprenticeship.ts",
  
  requiredPermission: "education.manage_apprenticeship",
  
  label: "Manage Apprenticeship (CFC)",
  description: "Lock school days in scheduler (Swiss vocational training)",
  keywords: ["apprenticeship", "cfc", "swiss", "education", "school"],
  icon: "GraduationCap",
  
  schema: ManageApprenticeshipSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'MEDIUM',
    isSwiss: true,
  },

  handler: async (input, ctx) => {
    const { userId, schoolDays, schoolName, cfcStartDate, cfcEndDate } = input;

    const apprenticeshipRef = doc(db, 'apprenticeships', userId);
    
    await setDoc(apprenticeshipRef, {
      userId,
      schoolDays,
      schoolName,
      cfcStartDate,
      cfcEndDate,
      status: 'ACTIVE',
      createdBy: ctx.userId,
      createdAt: serverTimestamp(),
    });

    const availabilityRef = doc(db, 'user_availability_rules', userId);
    await setDoc(availabilityRef, {
      userId,
      blockedDaysOfWeek: schoolDays,
      blockReason: 'CFC_SCHOOL_DAYS',
      permanent: true,
      startDate: cfcStartDate,
      endDate: cfcEndDate,
    }, { merge: true });

    await ctx.auditLogger('education.manage_apprenticeship', 'SUCCESS', {
      userId,
      schoolDays,
      schoolName,
    });
  }
};

