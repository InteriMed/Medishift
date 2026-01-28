import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { appendAudit } from '../../common/utils';

const ApplyMissionSchema = z.object({
  missionId: z.string(),
  proposedRate: z.number().optional(),
  message: z.string().optional(),
});

interface ApplyMissionResult {
  applicationId: string;
  status: string;
}

export const applyMissionAction: ActionDefinition<typeof ApplyMissionSchema, ApplyMissionResult> = {
  id: "marketplace.apply",
  fileLocation: "src/services/actions/catalog/marketplace/professional/applyMission.ts",
  
  requiredPermission: "marketplace.apply",
  
  label: "Apply to Mission",
  description: "Submit application with conflict & certification validation",
  keywords: ["marketplace", "apply", "application"],
  icon: "Send",
  
  schema: ApplyMissionSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const { missionId, proposedRate, message } = input;

    const missionRef = doc(db, 'marketplace_missions', missionId);
    const missionSnap = await getDoc(missionRef);

    if (!missionSnap.exists()) {
      throw new Error('Mission not found');
    }

    const mission = missionSnap.data();

    const userRef = doc(db, 'users', ctx.userId);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.data();

    const certificationsRef = collection(db, 'user_certifications');
    const certQuery = query(certificationsRef, where('userId', '==', ctx.userId));
    const certSnapshot = await getDocs(certQuery);
    
    for (const requiredCert of mission.requirements.certifications) {
      const hasCert = certSnapshot.docs.some(doc => {
        const certData = doc.data();
        return certData.type === requiredCert && 
               certData.expiryDate > new Date().toISOString();
      });
      
      if (!hasCert) {
        throw new Error(`Missing required certification: ${requiredCert}`);
      }
    }

    const shiftsRef = collection(db, 'calendar_shifts');
    for (const missionDate of mission.dates) {
      const conflictQuery = query(
        shiftsRef,
        where('userId', '==', ctx.userId),
        where('date', '==', missionDate)
      );
      const conflictSnapshot = await getDocs(conflictQuery);
      
      if (!conflictSnapshot.empty) {
        throw new Error(`Scheduling conflict on ${missionDate}`);
      }
    }

    const applicationsRef = collection(db, 'marketplace_applications');
    const applicationDoc = await addDoc(applicationsRef, {
      missionId,
      professionalId: ctx.userId,
      professionalName: `${userData?.firstName} ${userData?.lastName}`,
      professionalRating: userData?.rating,
      status: proposedRate ? 'NEGOTIATING' : 'PENDING',
      proposedRate,
      message,
      appliedAt: serverTimestamp(),
    });

    await appendAudit('marketplace_applications', applicationDoc.id, {
      uid: ctx.userId,
      action: 'APPLICATION_SUBMITTED',
      metadata: { missionId, proposedRate },
    });

    await ctx.auditLogger('marketplace.apply', 'SUCCESS', {
      missionId,
      applicationId: applicationDoc.id,
    });

    return {
      applicationId: applicationDoc.id,
      status: proposedRate ? 'NEGOTIATING' : 'PENDING',
    };
  }
};

