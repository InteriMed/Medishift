import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, arrayUnion, arrayRemove } from 'firebase/firestore';
import { FIRESTORE_COLLECTIONS } from '../../../../../config/keysDatabase';

const UpdateEmployeeRoleSchema = z.object({
  userId: z.string(),
  facilityId: z.string(),
  roles: z.array(z.string()),
  isAdmin: z.boolean().optional(),
});

export const updateEmployeeRoleAction: ActionDefinition<typeof UpdateEmployeeRoleSchema, void> = {
  id: "team.update_employee_role",
  fileLocation: "src/services/actions/catalog/team/directory/updateEmployeeRole.ts",
  
  requiredPermission: "admin.access",
  
  label: "Update Employee Role",
  description: "Update employee roles and permissions within facility",
  keywords: ["employee", "role", "update", "permissions"],
  icon: "Shield",
  
  schema: UpdateEmployeeRoleSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'HIGH',
  },

  handler: async (input, ctx) => {
    const { userId, facilityId, roles, isAdmin } = input;

    const facilityRef = doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, facilityId);
    const facilitySnap = await getDoc(facilityRef);

    if (!facilitySnap.exists()) {
      throw new Error('Facility not found');
    }

    const facilityData = facilitySnap.data();
    const employeesList = facilityData.employees || [];
    const employeeIndex = employeesList.findIndex(emp => (emp.user_uid || emp.uid) === userId);

    if (employeeIndex === -1) {
      throw new Error('Employee not found in facility');
    }

    employeesList[employeeIndex].roles = roles;
    employeesList[employeeIndex].rights = roles;
    employeesList[employeeIndex].updatedBy = ctx.userId;
    employeesList[employeeIndex].updatedAt = serverTimestamp();

    const updateData: any = {
      employees: employeesList,
      updatedAt: serverTimestamp()
    };

    if (isAdmin !== undefined) {
      if (isAdmin) {
        updateData.admins = arrayUnion(userId);
      } else {
        updateData.admins = arrayRemove(userId);
      }
    }

    await updateDoc(facilityRef, updateData);

    const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      const existingRoles = userData.roles || [];
      const updatedRoles = existingRoles.map(roleEntry => {
        if (roleEntry.facility_uid === facilityId) {
          return {
            ...roleEntry,
            roles: roles
          };
        }
        return roleEntry;
      });
      
      await updateDoc(userRef, {
        roles: updatedRoles,
        updatedAt: serverTimestamp()
      });
    }

    await ctx.auditLogger('team.update_employee_role', 'SUCCESS', {
      userId,
      facilityId,
      roles,
      isAdmin,
    });
  }
};

