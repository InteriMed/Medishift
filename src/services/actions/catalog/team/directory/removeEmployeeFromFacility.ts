import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, arrayRemove } from 'firebase/firestore';
import { FIRESTORE_COLLECTIONS } from '../../../../../config/keysDatabase';

const RemoveEmployeeFromFacilitySchema = z.object({
  userId: z.string(),
  facilityId: z.string(),
  reason: z.string().optional(),
});

export const removeEmployeeFromFacilityAction: ActionDefinition<typeof RemoveEmployeeFromFacilitySchema, void> = {
  id: "team.remove_employee_from_facility",
  fileLocation: "src/services/actions/catalog/team/directory/removeEmployeeFromFacility.ts",
  
  requiredPermission: "admin.access",
  
  label: "Remove Employee from Facility",
  description: "Remove employee from facility staff",
  keywords: ["employee", "remove", "facility", "terminate"],
  icon: "UserMinus",
  
  schema: RemoveEmployeeFromFacilitySchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'HIGH',
  },

  handler: async (input, ctx) => {
    const { userId, facilityId, reason } = input;

    const facilityRef = doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, facilityId);
    const facilitySnap = await getDoc(facilityRef);

    if (!facilitySnap.exists()) {
      throw new Error('Facility not found');
    }

    const facilityData = facilitySnap.data();
    const employeesList = facilityData.employees || [];
    const updatedEmployees = employeesList.filter(emp => (emp.user_uid || emp.uid) !== userId);

    if (employeesList.length === updatedEmployees.length) {
      throw new Error('Employee not found in facility');
    }

    await updateDoc(facilityRef, {
      employees: updatedEmployees,
      admins: arrayRemove(userId),
      updatedAt: serverTimestamp()
    });

    const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      const existingRoles = userData.roles || [];
      const updatedRoles = existingRoles.filter(roleEntry => roleEntry.facility_uid !== facilityId);
      
      await updateDoc(userRef, {
        roles: updatedRoles,
        updatedAt: serverTimestamp()
      });
    }

    await ctx.auditLogger('team.remove_employee_from_facility', 'SUCCESS', {
      userId,
      facilityId,
      reason: reason || 'Not specified',
    });
  }
};

