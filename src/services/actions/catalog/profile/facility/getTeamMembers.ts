import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

const GetTeamMembersSchema = z.object({
  facilityId: z.string(),
});

interface TeamMember {
  uid: string;
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  rights?: string;
}

interface GetTeamMembersResult {
  members: TeamMember[];
  admins: string[];
  employees: string[];
}

export const getTeamMembersAction: ActionDefinition<typeof GetTeamMembersSchema, GetTeamMembersResult> = {
  id: "profile.facility.get_team_members",
  fileLocation: "src/services/actions/catalog/profile/facility/getTeamMembers.ts",
  
  requiredPermission: "thread.create",
  
  label: "Get Team Members",
  description: "Get all team members for a facility",
  keywords: ["facility", "team", "members", "employees"],
  icon: "Users",
  
  schema: GetTeamMembersSchema,
  
  metadata: {
    autoToast: false,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const facilityRef = doc(db, 'facilityProfiles', input.facilityId);
    const facilitySnap = await getDoc(facilityRef);

    if (!facilitySnap.exists()) {
      throw new Error('Facility not found');
    }

    const facilityData = facilitySnap.data();
    const employeesList = facilityData.employees || [];
    
    const admins = employeesList
      .filter((emp: any) => emp.rights === 'admin')
      .map((emp: any) => emp.uid);
    
    const employees = employeesList
      .filter((emp: any) => emp.rights !== 'admin')
      .map((emp: any) => emp.uid);
    
    const allMemberIdsSet = new Set([...admins, ...employees]);
    const allMemberIds = Array.from(allMemberIdsSet);

    const memberPromises = allMemberIds.map(async (userId: string) => {
      try {
        // Try professional profile first
        const professionalProfileRef = doc(db, 'professionalProfiles', userId);
        const professionalProfileSnap = await getDoc(professionalProfileRef);

        if (professionalProfileSnap.exists()) {
          const professionalData = professionalProfileSnap.data();
          const identity = professionalData.identity || {};
          const firstName = identity.legalFirstName || identity.firstName || '';
          const lastName = identity.legalLastName || identity.lastName || '';

          return {
            uid: userId,
            id: userId,
            firstName: firstName,
            lastName: lastName,
            email: professionalData.contact?.primaryEmail || '',
            rights: employeesList.find((emp: any) => emp.uid === userId)?.rights
          };
        } else {
          // Fallback to users collection
          const userRef = doc(db, 'users', userId);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const userData = userSnap.data();
            return {
              uid: userId,
              id: userId,
              firstName: userData.firstName || userData.name || '',
              lastName: userData.lastName || '',
              email: userData.email || '',
              rights: employeesList.find((emp: any) => emp.uid === userId)?.rights
            };
          }
        }
        
        return null;
      } catch (error) {
        console.error(`Error fetching user ${userId}:`, error);
        return null;
      }
    });

    const members = (await Promise.all(memberPromises)).filter(Boolean) as TeamMember[];

    await ctx.auditLogger('profile.facility.get_team_members', 'SUCCESS', {
      facilityId: input.facilityId,
      memberCount: members.length,
    });

    return {
      members,
      admins,
      employees,
    };
  }
};

