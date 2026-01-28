import { z } from "zod";
import { ActionDefinition, ActionContext } from "../../../types";
import { db } from '../../../../services/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { FIRESTORE_COLLECTIONS } from '../../../../../config/keysDatabase';

const AddEmployeeToFacilitySchema = z.object({
  email: z.string().email(),
  facilityId: z.string(),
  role: z.string(),
  isAdmin: z.boolean().default(false),
});

interface AddEmployeeToFacilityResult {
  userId: string;
  success: boolean;
}

export const addEmployeeToFacilityAction: ActionDefinition<typeof AddEmployeeToFacilitySchema, AddEmployeeToFacilityResult> = {
  id: "team.add_employee_to_facility",
  fileLocation: "src/services/actions/catalog/team/directory/addEmployeeToFacility.ts",
  
  requiredPermission: "shift.create",
  
  label: "Add Employee to Facility",
  description: "Add existing user to facility staff",
  keywords: ["employee", "add", "facility", "staff"],
  icon: "UserPlus",
  
  schema: AddEmployeeToFacilitySchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'HIGH',
  },

  handler: async (input: z.infer<typeof AddEmployeeToFacilitySchema>, ctx: ActionContext) => {
    const { email, facilityId, role, isAdmin } = input;

    const userQuery = query(
      collection(db, FIRESTORE_COLLECTIONS.USERS),
      where('email', '==', email.trim().toLowerCase())
    );
    const userSnapshot = await getDocs(userQuery);

    if (userSnapshot.empty) {
      throw new Error('User not found. They must have an account first.');
    }

    const userId = userSnapshot.docs[0].id;
    const facilityRef = doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, facilityId);
    const facilitySnap = await getDoc(facilityRef);

    if (!facilitySnap.exists()) {
      throw new Error('Facility not found');
    }

    const facilityData = facilitySnap.data();
    const employeesList = facilityData.employees || [];
    const isAlreadyEmployee = employeesList.some((emp: any) => (emp.user_uid || emp.uid) === userId);

    if (isAlreadyEmployee) {
      throw new Error('This user is already an employee');
    }

    const newEmployee = {
      user_uid: userId,
      roles: [role],
      rights: [role],
      hireDate: serverTimestamp(),
      status: 'active',
      addedBy: ctx.userId,
      addedAt: serverTimestamp()
    };

    const updatedEmployees = [...employeesList, newEmployee];
    const updateData: any = {
      employees: updatedEmployees,
      updatedAt: serverTimestamp()
    };

    if (isAdmin) {
      updateData.admins = arrayUnion(userId);
    }

    await updateDoc(facilityRef, updateData);

    const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      const existingRoles = userData.roles || [];
      const newRoleEntry = {
        facility_uid: facilityId,
        roles: [role]
      };
      await updateDoc(userRef, {
        roles: [...existingRoles, newRoleEntry],
        updatedAt: serverTimestamp()
      });
    }

    await ctx.auditLogger('team.add_employee_to_facility', 'SUCCESS', {
      userId,
      facilityId,
      role,
      isAdmin,
    });

    return {
      userId,
      success: true,
    };
  }
};

