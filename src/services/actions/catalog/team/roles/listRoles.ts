import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { FIRESTORE_COLLECTIONS } from '../../../../../config/keysDatabase';

const ListRolesSchema = z.object({
  facilityId: z.string(),
});

interface ListRolesResult {
  roles: Array<{
    id: string;
    name: string;
    description?: string;
    permissions: string[];
    createdAt?: string;
    createdBy?: string;
  }>;
}

export const listRolesAction: ActionDefinition<typeof ListRolesSchema, ListRolesResult> = {
  id: "team.list_roles",
  fileLocation: "src/services/actions/catalog/team/roles/listRoles.ts",
  
  requiredPermission: "thread.read",
  
  label: "List Custom Roles",
  description: "Get all custom roles for facility",
  keywords: ["role", "list", "permissions"],
  icon: "List",
  
  schema: ListRolesSchema,
  
  metadata: {
    autoToast: false,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const { facilityId } = input;

    const facilityRef = doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, facilityId);
    const facilitySnap = await getDoc(facilityRef);

    if (!facilitySnap.exists()) {
      throw new Error('Facility not found');
    }

    const facilityData = facilitySnap.data();
    const roles = facilityData.customRoles || [];

    await ctx.auditLogger('team.list_roles', 'SUCCESS', {
      facilityId,
      roleCount: roles.length,
    });

    return {
      roles,
    };
  }
};

