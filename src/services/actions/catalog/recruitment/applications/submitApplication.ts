import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';

const SubmitApplicationSchema = z.object({
  jobId: z.string(),
  answers: z.record(z.string(), z.any()),
  cvFileUrl: z.string().url().optional(),
});

interface SubmitApplicationResult {
  applicationId: string;
  status: 'PENDING' | 'AUTO_REJECT';
  rejectionReason?: string;
}

export const submitApplicationAction: ActionDefinition<typeof SubmitApplicationSchema, SubmitApplicationResult> = {
  id: "recruitment.submit_application",
  fileLocation: "src/services/actions/catalog/recruitment/applications/submitApplication.ts",
  
  requiredPermission: "recruitment.apply",
  
  label: "Submit Application",
  description: "Apply to job with custom quiz answers and auto-reject validation",
  keywords: ["recruitment", "application", "apply", "submit"],
  icon: "Send",
  
  schema: SubmitApplicationSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const { jobId, answers, cvFileUrl } = input;

    const jobRef = doc(db, 'recruitment_jobs', jobId);
    const jobSnap = await getDoc(jobRef);

    if (!jobSnap.exists()) {
      throw new Error('Job not found');
    }

    const jobData = jobSnap.data();

    if (jobData.status !== 'PUBLISHED') {
      throw new Error('Job is no longer accepting applications');
    }

    const userRef = doc(db, 'users', ctx.userId);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.exists() ? userSnap.data() : {};

    let applicationStatus: 'PENDING' | 'AUTO_REJECT' = 'PENDING';
    let rejectionReason: string | undefined;

    for (const question of jobData.customQuestions || []) {
      if (question.isKnockout) {
        const userAnswer = answers[question.id];
        
        if (userAnswer !== question.knockoutValue) {
          applicationStatus = 'AUTO_REJECT';
          rejectionReason = `Required: ${question.question} must be "${question.knockoutValue}"`;
          break;
        }
      }
    }

    const applicationsRef = collection(db, 'recruitment_applications');
    const applicationDoc = await addDoc(applicationsRef, {
      jobId,
      userId: ctx.userId,
      applicantName: `${userData.firstName} ${userData.lastName}`,
      applicantEmail: userData.email,
      status: applicationStatus,
      answers,
      cvFileUrl,
      rejectionReason,
      profileSync: {
        experience: userData.yearsExperience,
        software: userData.skills,
        certifications: userData.certifications,
      },
      submittedAt: serverTimestamp(),
    });

    await ctx.auditLogger('recruitment.submit_application', 'SUCCESS', {
      applicationId: applicationDoc.id,
      jobId,
      status: applicationStatus,
      autoRejected: applicationStatus === 'AUTO_REJECT',
    });

    return {
      applicationId: applicationDoc.id,
      status: applicationStatus,
      rejectionReason,
    };
  }
};

