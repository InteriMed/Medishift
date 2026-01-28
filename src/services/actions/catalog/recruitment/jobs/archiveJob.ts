import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { doc, updateDoc, getDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { sendNotificationToUser } from '../../../../services/notifications';

const ArchiveJobSchema = z.object({
  jobId: z.string(),
  reason: z.enum(['FILLED', 'CANCELLED', 'EXPIRED']),
  comment: z.string().optional(),
});

export const archiveJobAction: ActionDefinition<typeof ArchiveJobSchema, void> = {
  id: "recruitment.archive_job",
  fileLocation: "src/services/actions/catalog/recruitment/jobs/archiveJob.ts",
  
  requiredPermission: "recruitment.create_job",
  
  label: "Archive Job Posting",
  description: "Close job and notify pending applicants",
  keywords: ["recruitment", "job", "archive", "close"],
  icon: "Archive",
  
  schema: ArchiveJobSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'MEDIUM',
  },

  handler: async (input, ctx) => {
    const { jobId, reason, comment } = input;

    const jobRef = doc(db, 'recruitment_jobs', jobId);
    const jobSnap = await getDoc(jobRef);

    if (!jobSnap.exists()) {
      throw new Error('Job not found');
    }

    const jobData = jobSnap.data();

    await updateDoc(jobRef, {
      status: 'CLOSED',
      closedAt: serverTimestamp(),
      closedBy: ctx.userId,
      closeReason: reason,
      closeComment: comment,
    });

    const applicationsRef = collection(db, 'recruitment_applications');
    const pendingQuery = query(
      applicationsRef,
      where('jobId', '==', jobId),
      where('status', '==', 'PENDING')
    );
    const pendingSnapshot = await getDocs(pendingQuery);

    for (const appDoc of pendingSnapshot.docs) {
      const application = appDoc.data();
      
      await sendNotificationToUser(application.userId, {
        title: 'Position Closed',
        body: `The ${jobData.title} position has been ${reason.toLowerCase()}. Thank you for your interest.`,
        priority: 'LOW',
      });

      await updateDoc(appDoc.ref, {
        status: 'REJECTED',
        rejectedAt: serverTimestamp(),
        rejectionReason: 'Position closed',
      });
    }

    await ctx.auditLogger('recruitment.archive_job', 'SUCCESS', {
      jobId,
      reason,
      notifiedApplicants: pendingSnapshot.size,
    });
  }
};

