import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, arrayRemove } from 'firebase/firestore';
import { FIRESTORE_COLLECTIONS } from '../../../../../config/keysDatabase';

const LeaveFacilitySchema = z.object({
  userId: z.string(),
  facilityId: z.string(),
});

export const leaveFacilityAction: ActionDefinition<typeof LeaveFacilitySchema, void> = {
  id: "profile.leave_facility",
  fileLocation: "src/services/actions/catalog/profile/me/leaveFacility.ts",
  
  requiredPermission: "thread.create",
  
  label: "Leave Facility",
  description: "Remove yourself from a facility's employee list",
  keywords: ["facility", "leave", "remove", "employee"],
  icon: "LogOut",
  
  schema: LeaveFacilitySchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'HIGH',
  },

  handler: async (input, ctx) => {
    const { userId, facilityId } = input;

    if (userId !== ctx.userId) {
      throw new Error('You can only remove yourself from facilities');
    }

    const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      throw new Error('User not found');
    }

    const userData = userSnap.data();
    const updatedMemberships = (userData.facilityMemberships || []).filter(
      m => m.facilityId !== facilityId && m.facilityProfileId !== facilityId
    );

    await updateDoc(userRef, {
      facilityMemberships: updatedMemberships,
      updatedAt: serverTimestamp()
    });

    const facilityRef = doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, facilityId);
    const facilitySnap = await getDoc(facilityRef);
    
    if (facilitySnap.exists()) {
      const facilityData = facilitySnap.data();
      const updatedEmployees = (facilityData.employees || []).filter(
        e => (e.user_uid || e.uid) !== userId
      );
      
      await updateDoc(facilityRef, {
        employees: updatedEmployees,
        admins: arrayRemove(userId),
        updatedAt: serverTimestamp()
      });
    }

    await ctx.auditLogger('profile.leave_facility', 'SUCCESS', {
      userId,
      facilityId,
    });
  }
};

