import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db, functions } from '../../../../../services/firebase';
import { doc, updateDoc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { appendAudit } from '../../common/utils';
import { httpsCallable } from 'firebase/functions';

const HireCandidateSchema = z.object({
  applicationId: z.string(),
});

interface HireCandidateResult {
  contractId: string;
  shiftIds: string[];
}

export const hireCandidateAction: ActionDefinition<typeof HireCandidateSchema, HireCandidateResult> = {
  id: "marketplace.hire_candidate",
  fileLocation: "src/services/actions/catalog/marketplace/facility/hireCandidate.ts",
  
  requiredPermission: "marketplace.hire_candidate",
  
  label: "Hire Candidate",
  description: "Accept application and onboard (contract, roster, access)",
  keywords: ["marketplace", "hire", "onboard"],
  icon: "CheckCircle",
  
  schema: HireCandidateSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'HIGH',
  },

  handler: async (input, ctx) => {
    const { applicationId } = input;

    const applicationRef = doc(db, 'marketplace_applications', applicationId);
    const applicationSnap = await getDoc(applicationRef);

    if (!applicationSnap.exists()) {
      throw new Error('Application not found');
    }

    const application = applicationSnap.data();
    const missionRef = doc(db, 'marketplace_missions', application.missionId);
    const missionSnap = await getDoc(missionRef);

    if (!missionSnap.exists()) {
      throw new Error('Mission not found');
    }

    const mission = missionSnap.data();

    await updateDoc(applicationRef, {
      status: 'ACCEPTED',
      acceptedAt: serverTimestamp(),
      acceptedBy: ctx.userId,
    });

    const contractsRef = collection(db, 'marketplace_contracts');
    const contractDoc = await addDoc(contractsRef, {
      missionId: application.missionId,
      professionalId: application.professionalId,
      facilityId: ctx.facilityId,
      contractType: 'CDD',
      startDate: mission.dates[0],
      endDate: mission.dates[mission.dates.length - 1],
      ratePerHour: application.proposedRate || mission.ratePerHour,
      totalHours: mission.dates.length * 8,
      status: 'PENDING_SIGNATURE',
      createdAt: serverTimestamp(),
    });

    const generateContract = httpsCallable(functions, 'generateMissionContract');
    await generateContract({ contractId: contractDoc.id });

    const shiftIds: string[] = [];
    const shiftsRef = collection(db, 'calendar_shifts');
    for (const date of mission.dates) {
      const shiftDoc = await addDoc(shiftsRef, {
        facilityId: ctx.facilityId,
        userId: application.professionalId,
        date,
        startTime: '08:00',
        endTime: '16:00',
        role: mission.role,
        type: 'MISSION',
        missionId: application.missionId,
        status: 'PUBLISHED',
        createdAt: serverTimestamp(),
      });
      shiftIds.push(shiftDoc.id);
    }

    const accessRef = collection(db, 'temporary_access');
    await addDoc(accessRef, {
      userId: application.professionalId,
      facilityId: ctx.facilityId,
      startDate: mission.dates[0],
      endDate: mission.dates[mission.dates.length - 1],
      permissions: ['clock_in', 'clock_out', 'view_roster'],
      createdAt: serverTimestamp(),
    });

    await updateDoc(missionRef, {
      status: 'FILLED',
      filledAt: serverTimestamp(),
      filledBy: application.professionalId,
    });

    await appendAudit('marketplace_applications', applicationId, {
      uid: ctx.userId,
      action: 'APPLICATION_ACCEPTED',
      severity: 'HIGH',
    });

    await ctx.auditLogger('marketplace.hire_candidate', 'SUCCESS', {
      applicationId,
      professionalId: application.professionalId,
      contractId: contractDoc.id,
      shiftsCreated: shiftIds.length,
    });

    return {
      contractId: contractDoc.id,
      shiftIds,
    };
  }
};

