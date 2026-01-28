import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const SearchBySkillSchema = z.object({
  skillIds: z.array(z.string()),
  facilityId: z.string().optional(),
  mustHaveAll: z.boolean().default(false),
});

interface SearchBySkillResult {
  users: Array<{
    userId: string;
    firstName: string;
    lastName: string;
    matchingSkills: string[];
    skillCount: number;
  }>;
}

export const searchBySkillAction: ActionDefinition<typeof SearchBySkillSchema, SearchBySkillResult> = {
  id: "team.search_by_skill",
  fileLocation: "src/services/actions/catalog/team/skills/searchBySkill.ts",
  
  requiredPermission: "shift.view",
  
  label: "Search by Skill",
  description: "Find employees with specific skills",
  keywords: ["search", "filter", "skill", "find"],
  icon: "Search",
  
  schema: SearchBySkillSchema,
  
  metadata: {
    autoToast: false,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const { skillIds, facilityId, mustHaveAll } = input;

    const userSkillsRef = collection(db, 'user_skills');
    const q = query(
      userSkillsRef,
      where('skillId', 'in', skillIds.slice(0, 10))
    );

    const snapshot = await getDocs(q);
    const userSkillsMap = new Map<string, string[]>();

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (!userSkillsMap.has(data.userId)) {
        userSkillsMap.set(data.userId, []);
      }
      userSkillsMap.get(data.userId)!.push(data.skillId);
    });

    const matchingUsers: string[] = [];
    userSkillsMap.forEach((skills, userId) => {
      if (mustHaveAll) {
        if (skillIds.every(skillId => skills.includes(skillId))) {
          matchingUsers.push(userId);
        }
      } else {
        matchingUsers.push(userId);
      }
    });

    const usersRef = collection(db, 'users');
    let usersQuery = query(usersRef, where('__name__', 'in', matchingUsers.slice(0, 10)));
    
    if (facilityId) {
      usersQuery = query(usersQuery, where('facilityId', '==', facilityId));
    }

    const usersSnapshot = await getDocs(usersQuery);
    const users = usersSnapshot.docs.map(doc => ({
      userId: doc.id,
      firstName: doc.data().firstName,
      lastName: doc.data().lastName,
      matchingSkills: userSkillsMap.get(doc.id) || [],
      skillCount: (userSkillsMap.get(doc.id) || []).length,
    }));

    await ctx.auditLogger('team.search_by_skill', 'SUCCESS', {
      skillIds,
      resultCount: users.length,
    });

    return {
      users,
    };
  }
};

