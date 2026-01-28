import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { FIRESTORE_COLLECTIONS } from '../../../../../config/keysDatabase';

const CreateRoleSchema = z.object({
  facilityId: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  permissions: z.array(z.string()).min(1),
});

interface CreateRoleResult {
  roleId: string;
}

export const createRoleAction: ActionDefinition<typeof CreateRoleSchema, CreateRoleResult> = {
  id: "team.create_role",
  fileLocation: "src/services/actions/catalog/team/roles/createRole.ts",
  
  requiredPermission: "admin.access",
  
  label: "Create Custom Role",
  description: "Create custom role with specific permissions",
  keywords: ["role", "create", "permissions", "access"],
  icon: "Key",
  
  schema: CreateRoleSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'HIGH',
  },

  handler: async (input, ctx) => {
    const { facilityId, name, description, permissions } = input;

    const facilityRef = doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, facilityId);
    const facilitySnap = await getDoc(facilityRef);

    if (!facilitySnap.exists()) {
      throw new Error('Facility not found');
    }

    const facilityData = facilitySnap.data();
    const existingRoles = facilityData.customRoles || [];

    const roleId = `role_${Date.now()}`;
    const newRole = {
      id: roleId,
      name,
      description: description || '',
      permissions,
      createdAt: new Date().toISOString(),
      createdBy: ctx.userId
    };

    const updatedRoles = [...existingRoles, newRole];

    await updateDoc(facilityRef, {
      customRoles: updatedRoles,
      updatedAt: serverTimestamp()
    });

    await ctx.auditLogger('team.create_role', 'SUCCESS', {
      facilityId,
      roleId,
      name,
      permissions,
    });

    return {
      roleId,
    };
  }
};

