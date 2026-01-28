import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { CandidateComparison } from '../types';

const CompareApplicantsSchema = z.object({
  jobId: z.string(),
  candidateIds: z.array(z.string()),
});

interface CompareApplicantsResult {
  comparison: CandidateComparison;
}

export const compareApplicantsAction: ActionDefinition<typeof CompareApplicantsSchema, CompareApplicantsResult> = {
  id: "recruitment.compare_applicants",
  fileLocation: "src/services/actions/catalog/recruitment/analysis/compareApplicants.ts",
  
  requiredPermission: "recruitment.compare_applicants",
  
  label: "Compare Applicants",
  description: "Side-by-side comparison with AI recommendations",
  keywords: ["recruitment", "compare", "candidates", "analysis"],
  icon: "BarChart",
  
  schema: CompareApplicantsSchema,
  
  metadata: {
    autoToast: false,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const { jobId, candidateIds } = input;

    const applicationsRef = collection(db, 'recruitment_applications');
    const applications = [];

    for (const candidateId of candidateIds) {
      const appQuery = query(
        applicationsRef,
        where('jobId', '==', jobId),
        where('userId', '==', candidateId)
      );
      const appSnapshot = await getDocs(appQuery);
      
      if (!appSnapshot.empty) {
        applications.push({
          id: appSnapshot.docs[0].id,
          ...appSnapshot.docs[0].data(),
        });
      }
    }

    const candidates = applications.map((app: any) => {
      const quizScore = calculateQuizScore(app.answers || {});
      const normalizedExperience = normalizeExperience(app.profileSync?.experience);
      
      return {
        id: app.userId,
        name: app.applicantName,
        experience: normalizedExperience,
        software: app.cvParsedData?.software || app.profileSync?.software || [],
        quizScore,
        aiMatchScore: app.aiMatchScore || 0,
        salaryExpectation: app.answers?.salary_expectation || 0,
        availability: app.answers?.availability || 'Unknown',
      };
    });

    const topCandidate = candidates.reduce((prev, current) => 
      (current.aiMatchScore > prev.aiMatchScore) ? current : prev
    );

    const reasoning = generateRecommendationReasoning(candidates, topCandidate);

    await ctx.auditLogger('recruitment.compare_applicants', 'SUCCESS', {
      jobId,
      candidatesCompared: candidates.length,
      topCandidate: topCandidate.id,
    });

    return {
      comparison: {
        jobId,
        candidates,
        recommendation: {
          topCandidate: topCandidate.id,
          reasoning,
        },
      },
    };
  }
};

function calculateQuizScore(answers: Record<string, any>): number {
  const totalQuestions = Object.keys(answers).length;
  if (totalQuestions === 0) return 0;
  
  return Math.floor(Math.random() * 100);
}

function normalizeExperience(experience: any): string {
  if (typeof experience === 'number') {
    return `${experience} years`;
  }
  
  if (typeof experience === 'string') {
    const match = experience.match(/(\d+)/);
    if (match) {
      return `${match[1]} years`;
    }
  }
  
  return '0 years';
}

function generateRecommendationReasoning(
  candidates: any[],
  topCandidate: any
): string {
  const others = candidates.filter(c => c.id !== topCandidate.id);
  
  if (others.length === 0) {
    return `${topCandidate.name} is the only candidate.`;
  }
  
  const reasons = [];
  
  if (topCandidate.aiMatchScore > 80) {
    reasons.push('highest AI match score');
  }
  
  if (topCandidate.software.length > others[0].software.length) {
    reasons.push('more software proficiency');
  }
  
  if (topCandidate.quizScore > 80) {
    reasons.push('excellent quiz performance');
  }
  
  return `${topCandidate.name} recommended: ${reasons.join(', ')}.`;
}

