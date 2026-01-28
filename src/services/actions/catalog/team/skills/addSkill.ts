import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const AddSkillSchema = z.object({
  userId: z.string(),
  skillId: z.string(),
  skillName: z.string(),
  category: z.enum(['LANGUAGE', 'SOFTWARE', 'CLINICAL', 'ADMINISTRATIVE']),
  level: z.enum(['BASIC', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).optional(),
  verified: z.boolean().default(false),
});

interface AddSkillResult {
  userSkillId: string;
}

export const addSkillAction: ActionDefinition<typeof AddSkillSchema, AddSkillResult> = {
  id: "team.add_skill",
  fileLocation: "src/services/actions/catalog/team/skills/addSkill.ts",
  
  requiredPermission: "thread.create",
  
  label: "Add Skill/Tag",
  description: "Tag employee with skill for scheduler filtering",
  keywords: ["skill", "tag", "language", "competency"],
  icon: "Tag",
  
  schema: AddSkillSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const { userId, skillId, skillName, category, level, verified } = input;

    const userSkill = {
      userId,
      skillId,
      skillName,
      category,
      level: level || null,
      verified,
      addedBy: ctx.userId,
      addedAt: serverTimestamp(),
    };

    const skillRef = await addDoc(collection(db, 'user_skills'), userSkill);

    await ctx.auditLogger('team.add_skill', 'SUCCESS', {
      userId,
      skillId,
      skillName,
    });

    return {
      userSkillId: skillRef.id,
    };
  }
};

