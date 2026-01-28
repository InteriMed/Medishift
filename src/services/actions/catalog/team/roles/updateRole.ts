import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { FIRESTORE_COLLECTIONS } from '../../../../../config/keysDatabase';

const UpdateRoleSchema = z.object({
  facilityId: z.string(),
  roleId: z.string(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  permissions: z.array(z.string()).min(1).optional(),
});

export const updateRoleAction: ActionDefinition<typeof UpdateRoleSchema, void> = {
  id: "team.update_role",
  fileLocation: "src/services/actions/catalog/team/roles/updateRole.ts",
  
  requiredPermission: "admin.access",
  
  label: "Update Custom Role",
  description: "Update custom role details and permissions",
  keywords: ["role", "update", "permissions", "edit"],
  icon: "Edit",
  
  schema: UpdateRoleSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'HIGH',
  },

  handler: async (input, ctx) => {
    const { facilityId, roleId, name, description, permissions } = input;

    const facilityRef = doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, facilityId);
    const facilitySnap = await getDoc(facilityRef);

    if (!facilitySnap.exists()) {
      throw new Error('Facility not found');
    }

    const facilityData = facilitySnap.data();
    const existingRoles = facilityData.customRoles || [];
    
    const roleIndex = existingRoles.findIndex(r => r.id === roleId);
    if (roleIndex === -1) {
      throw new Error('Role not found');
    }

    const updatedRole = {
      ...existingRoles[roleIndex],
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(permissions && { permissions }),
      updatedAt: new Date().toISOString(),
      updatedBy: ctx.userId
    };

    existingRoles[roleIndex] = updatedRole;

    await updateDoc(facilityRef, {
      customRoles: existingRoles,
      updatedAt: serverTimestamp()
    });

    await ctx.auditLogger('team.update_role', 'SUCCESS', {
      facilityId,
      roleId,
      changes: { name, description, permissions },
    });
  }
};

