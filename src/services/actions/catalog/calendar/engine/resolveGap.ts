import { z } from "zod";
import { ActionDefinition, ActionContext } from "../../../types";
import { db } from '../../../../services/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { validateShiftConstraints } from '../constraints';
import { CandidateScore } from '../types';

const ResolveGapSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  missingRole: z.string(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

interface ResolveGapResult {
  candidates: CandidateScore[];
  recommendation: CandidateScore | null;
}

export const resolveGapAction: ActionDefinition<typeof ResolveGapSchema, ResolveGapResult> = {
  id: "calendar.resolve_gap",
  fileLocation: "src/services/actions/catalog/calendar/engine/resolveGap.ts",
  
  requiredPermission: "shift.create",
  
  label: "Resolve Coverage Gap (AI)",
  description: "Find best candidate to cover shift using fairness algorithm",
  keywords: ["ai", "coverage", "assign", "algorithm"],
  icon: "Sparkles",
  
  schema: ResolveGapSchema,
  
  metadata: {
    autoToast: false,
    riskLevel: 'LOW',
  },

  handler: async (input: z.infer<typeof ResolveGapSchema>, ctx: ActionContext): Promise<ResolveGapResult> => {
    const { date, missingRole, startTime, endTime } = input;

    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      where('facilityId', '==', ctx.facilityId),
      where('role', '==', missingRole),
      where('status', '==', 'ACTIVE')
    );

    const snapshot = await getDocs(q);
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    const candidates: CandidateScore[] = [];

    for (const user of users) {
      const validation = await validateShiftConstraints(
        user.id,
        ctx.facilityId,
        { date, startTime, endTime },
        undefined,
        false
      );

      const vacationBalance = await getVacationBalance(user.id, ctx.facilityId);
      const weeklyHours = validation.burdenScore;

      let score = 100;
      let category: CandidateScore['category'] = 'INTERNAL';
      let reason = '';

      if (!validation.valid) {
        score = 0;
        reason = 'Constraint violations';
      } else {
        const availabilityRef = doc(db, 'user_availability', `${user.id}_${date}`);
        const availabilitySnap = await getDoc(availabilityRef);

        if (availabilitySnap.exists()) {
          const availability = availabilitySnap.data();
          
          if (availability.status === 'IMPOSSIBLE') {
            score -= 50;
            reason = 'User marked as unavailable';
          } else if (availability.status === 'PREFERRED') {
            score += 20;
            reason = 'User preferred this date';
          }
        }

        if (vacationBalance < 0) {
          score += 30;
          category = 'INTERNAL_LOW_BALANCE';
          reason = 'Low vacation balance (priority)';
        } else if (vacationBalance > 10) {
          score -= 10;
          reason = 'High vacation balance';
        }

        if (weeklyHours > 40) {
          score -= 20;
          if (weeklyHours > 45) {
            category = 'OVERTIME';
            reason = 'Would require overtime pay';
          }
        } else if (weeklyHours < 30) {
          score += 15;
          reason = 'Below typical weekly hours';
        }

        if ((user as any).employmentType === 'FLOATER') {
          category = 'FLOATER';
          score += 10;
          reason = 'Floater (flexible)';
        }

        if ((user as any).employmentType === 'EXTERNAL') {
          category = 'EXTERNAL';
          score -= 25;
          reason = 'External contractor (higher cost)';
        }
      }

      candidates.push({
        userId: user.id,
        score,
        reason,
        category,
        violations: validation.violations,
        vacationBalance,
        weeklyHours,
      });
    }

    candidates.sort((a, b) => {
      if (a.category !== b.category) {
        const categoryOrder = {
          INTERNAL_LOW_BALANCE: 1,
          INTERNAL: 2,
          FLOATER: 3,
          OVERTIME: 4,
          EXTERNAL: 5,
        };
        return categoryOrder[a.category] - categoryOrder[b.category];
      }
      return b.score - a.score;
    });

    const recommendation = candidates.find(c => c.score > 0) || null;

    await ctx.auditLogger('calendar.resolve_gap', 'SUCCESS', {
      date,
      missingRole,
      candidateCount: candidates.length,
      recommendation: recommendation?.userId,
    });

    return {
      candidates,
      recommendation,
    };
  }
};

async function getVacationBalance(userId: string, facilityId: string): Promise<number> {
  const contractRef = collection(db, 'contracts');
  const q = query(
    contractRef,
    where('userId', '==', userId),
    where('facilityId', '==', facilityId),
    where('status', '==', 'ACTIVE')
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return 0;

  const contract = snapshot.docs[0].data();
  const annualVacationDays = contract.annualVacationDays || 20;

  const leaveRequestsRef = collection(db, 'leave_requests');
  const leaveQuery = query(
    leaveRequestsRef,
    where('userId', '==', userId),
    where('type', '==', 'VACATION'),
    where('status', 'in', ['APPROVED', 'PENDING'])
  );

  const leaveSnapshot = await getDocs(leaveQuery);
  let usedDays = 0;

  leaveSnapshot.docs.forEach(doc => {
    const leave = doc.data();
    usedDays += leave.daysRequested || 0;
  });

  return annualVacationDays - usedDays;
}

