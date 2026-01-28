import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const CreateJobPostingSchema = z.object({
  title: z.string(),
  role: z.string(),
  basicDetails: z.object({
    salary: z.number().positive(),
    workPercentage: z.number().min(10).max(100),
    contractType: z.enum(['CDI', 'CDD', 'INTERIM']),
    startDate: z.string(),
    location: z.string(),
  }),
  standardFields: z.object({
    require_cv: z.boolean(),
    require_permit_scan: z.boolean(),
    require_software_netcare: z.boolean(),
    require_diplomas: z.boolean(),
    require_references: z.boolean(),
  }),
  customQuestions: z.array(z.object({
    type: z.enum(['MULTIPLE_CHOICE', 'OPEN_TEXT', 'BOOLEAN', 'FILE_UPLOAD']),
    question: z.string(),
    options: z.array(z.string()).optional(),
    required: z.boolean(),
    isKnockout: z.boolean().optional(),
    knockoutValue: z.any().optional(),
  })),
  description: z.string(),
});

interface CreateJobPostingResult {
  jobId: string;
  publicUrl: string;
}

export const createJobPostingAction: ActionDefinition<typeof CreateJobPostingSchema, CreateJobPostingResult> = {
  id: "recruitment.create_job_posting",
  fileLocation: "src/services/actions/catalog/recruitment/jobs/createJobPosting.ts",
  
  requiredPermission: "recruitment.create_job",
  
  label: "Create Job Posting",
  description: "Build structured job ad with custom screening questions",
  keywords: ["recruitment", "job", "posting", "hiring"],
  icon: "Briefcase",
  
  schema: CreateJobPostingSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const { title, role, basicDetails, standardFields, customQuestions, description } = input;

    const customQuestionsWithIds = customQuestions.map((q, idx) => ({
      ...q,
      id: `q_${idx + 1}`,
    }));

    const knockoutQuestionIds = customQuestionsWithIds
      .filter(q => q.isKnockout)
      .map(q => q.id);

    const jobsRef = collection(db, 'recruitment_jobs');
    const jobDoc = await addDoc(jobsRef, {
      facilityId: ctx.facilityId,
      title,
      role,
      basicDetails,
      standardFields,
      customQuestions: customQuestionsWithIds,
      knockoutQuestionIds,
      description,
      status: 'PUBLISHED',
      createdBy: ctx.userId,
      createdAt: serverTimestamp(),
    });

    const publicUrl = `https://interimed.ch/jobs/${jobDoc.id}`;

    await ctx.auditLogger('recruitment.create_job_posting', 'SUCCESS', {
      jobId: jobDoc.id,
      role,
      customQuestionsCount: customQuestions.length,
      knockoutQuestionsCount: knockoutQuestionIds.length,
    });

    return {
      jobId: jobDoc.id,
      publicUrl,
    };
  }
};

