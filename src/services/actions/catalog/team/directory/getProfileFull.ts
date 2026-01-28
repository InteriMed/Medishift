import { z } from "zod";
import { ActionDefinition, ActionContext } from "../../../types";
import { db } from '../../../../services/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

const GetProfileFullSchema = z.object({
  userId: z.string(),
});

interface GetProfileFullResult {
  profile: any;
  contract?: any;
  certifications?: any[];
  skills?: any[];
  canAccessSensitiveData: boolean;
}

export const getProfileFullAction: ActionDefinition<typeof GetProfileFullSchema, GetProfileFullResult> = {
  id: "team.get_profile_full",
  fileLocation: "src/services/actions/catalog/team/directory/getProfileFull.ts",
  
  requiredPermission: "thread.read",
  
  label: "Get Full Profile",
  description: "Retrieve complete employee profile with access control",
  keywords: ["profile", "employee", "details"],
  icon: "User",
  
  schema: GetProfileFullSchema,
  
  metadata: {
    autoToast: false,
    riskLevel: 'HIGH',
  },

  handler: async (input: z.infer<typeof GetProfileFullSchema>, ctx: ActionContext) => {
    const { userId } = input;

    const isSelf = userId === ctx.userId;
    const isManager = ctx.userPermissions.includes('shift.create');
    const isHRAdmin = ctx.userPermissions.includes('admin.access');

    if (!isSelf && !isManager && !isHRAdmin) {
      throw new Error('Access denied: You can only view your own profile or must be a manager/HR admin');
    }

    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error('User not found');
    }

    const profile: any = { id: userSnap.id, ...userSnap.data() };

    const canAccessSensitiveData = isSelf || isHRAdmin;

    if (!canAccessSensitiveData) {
      delete profile.iban;
      delete profile.salary;
      delete profile.ahvNumber;
      delete profile.bankName;
    }

    let contract: any = null;
    const contractsRef = collection(db, 'contracts');
    const contractQuery = query(
      contractsRef,
      where('userId', '==', userId),
      where('status', '==', 'ACTIVE')
    );
    const contractSnap = await getDocs(contractQuery);
    
    if (!contractSnap.empty) {
      contract = { id: contractSnap.docs[0].id, ...contractSnap.docs[0].data() };
      
      if (!canAccessSensitiveData && contract && contract.salary !== undefined) {
        const { salary, ...contractWithoutSalary } = contract;
        contract = contractWithoutSalary;
      }
    }

    let certifications = [];
    const certsRef = collection(db, 'certifications');
    const certsQuery = query(certsRef, where('userId', '==', userId));
    const certsSnap = await getDocs(certsQuery);
    certifications = certsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    let skills = [];
    const skillsRef = collection(db, 'user_skills');
    const skillsQuery = query(skillsRef, where('userId', '==', userId));
    const skillsSnap = await getDocs(skillsQuery);
    skills = skillsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    await ctx.auditLogger('team.get_profile_full', 'SUCCESS', {
      targetUserId: userId,
      accessLevel: canAccessSensitiveData ? 'FULL' : 'LIMITED',
    });

    return {
      profile,
      contract,
      certifications,
      skills,
      canAccessSensitiveData,
    };
  }
};

