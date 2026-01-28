import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { FIRESTORE_COLLECTIONS } from '../../../../../config/keysDatabase';

const DeleteRoleSchema = z.object({
  facilityId: z.string(),
  roleId: z.string(),
});

export const deleteRoleAction: ActionDefinition<typeof DeleteRoleSchema, void> = {
  id: "team.delete_role",
  fileLocation: "src/services/actions/catalog/team/roles/deleteRole.ts",
  
  requiredPermission: "admin.access",
  
  label: "Delete Custom Role",
  description: "Delete custom role (cannot be undone)",
  keywords: ["role", "delete", "remove"],
  icon: "Trash",
  
  schema: DeleteRoleSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'HIGH',
  },

  handler: async (input, ctx) => {
    const { facilityId, roleId } = input;

    const facilityRef = doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, facilityId);
    const facilitySnap = await getDoc(facilityRef);

    if (!facilitySnap.exists()) {
      throw new Error('Facility not found');
    }

    const facilityData = facilitySnap.data();
    const existingRoles = facilityData.customRoles || [];
    
    const updatedRoles = existingRoles.filter((r: any) => r.id !== roleId);

    if (existingRoles.length === updatedRoles.length) {
      throw new Error('Role not found');
    }

    await updateDoc(facilityRef, {
      customRoles: updatedRoles,
      updatedAt: serverTimestamp()
    });

    await ctx.auditLogger('team.delete_role', 'SUCCESS', {
      facilityId,
      roleId,
    });
  }
};

