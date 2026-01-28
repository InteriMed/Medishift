import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

const GetMeSchema = z.object({});

interface GetMeResult {
  profile: any;
  mergedPermissions: string[];
  activeFacilityId: string;
}

export const getMeAction: ActionDefinition<typeof GetMeSchema, GetMeResult> = {
  id: "profile.get_me",
  fileLocation: "src/services/actions/catalog/profile/me/getMe.ts",
  
  requiredPermission: "thread.read",
  
  label: "Get My Profile",
  description: "Retrieve current user profile with merged permissions",
  keywords: ["profile", "me", "current user"],
  icon: "User",
  
  schema: GetMeSchema,
  
  metadata: {
    autoToast: false,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const userRef = doc(db, 'users', ctx.userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error('User profile not found');
    }

    const userData = userSnap.data();
    const profile: any = { id: userSnap.id, ...userData };

    const basePermissions = (profile.permissions || userData.permissions || []) as string[];
    const rolePermissions = await getRolePermissions(profile.role || userData.role || '');
    const facilityPermissions = await getFacilityPermissions(ctx.facilityId);

    const mergedPermissions = Array.from(
      new Set([...basePermissions, ...rolePermissions, ...facilityPermissions])
    );

    const activeFacilityId = (profile.activeFacilityId || userData.activeFacilityId || ctx.facilityId) as string;

    await ctx.auditLogger('profile.get_me', 'SUCCESS', {
      userId: ctx.userId,
    });

    return {
      profile,
      mergedPermissions,
      activeFacilityId,
    };
  }
};

async function getRolePermissions(role: string): Promise<string[]> {
  const roleRef = doc(db, 'role_definitions', role);
  const roleSnap = await getDoc(roleRef);
  
  if (!roleSnap.exists()) return [];
  
  return roleSnap.data().permissions || [];
}

async function getFacilityPermissions(facilityId: string): Promise<string[]> {
  const facilityRef = doc(db, 'facility_profiles', facilityId);
  const facilitySnap = await getDoc(facilityRef);
  
  if (!facilitySnap.exists()) return [];
  
  return facilitySnap.data().additionalPermissions || [];
}

