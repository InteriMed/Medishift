import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../../services/firebase';
import { collection, query, getDocs, writeBatch } from 'firebase/firestore';

const StandardizeRolesSchema = z.object({
  roleId: z.string(),
  roleTemplate: z.object({
    permissions: z.array(z.string()),
    jobDescription: z.string(),
    requiredCertifications: z.array(z.string()),
  }),
});

interface StandardizeRolesResult {
  facilitiesUpdated: number;
}

export const standardizeRolesAction: ActionDefinition<typeof StandardizeRolesSchema, StandardizeRolesResult> = {
  id: "org.standardize_roles",
  fileLocation: "src/services/actions/catalog/organization/governance/standardizeRoles.ts",
  
  requiredPermission: "org.standardize_roles",
  
  label: "Standardize Roles",
  description: "Overwrite role definitions across all facilities",
  keywords: ["roles", "standardize", "permissions", "governance"],
  icon: "RefreshCw",
  
  schema: StandardizeRolesSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'HIGH',
  },

  handler: async (input, ctx) => {
    const { roleId, roleTemplate } = input;

    const facilitiesRef = collection(db, 'facility_profiles');
    const facilitiesSnapshot = await getDocs(facilitiesRef);

    const batch = writeBatch(db);

    facilitiesSnapshot.forEach((facilityDoc) => {
      const roleRef = db.collection('facility_profiles').doc(facilityDoc.id)
        .collection('role_definitions').doc(roleId);
      
      batch.set(roleRef, {
        ...roleTemplate,
        standardizedBy: ctx.userId,
        standardizedAt: new Date(),
      }, { merge: true });
    });

    await batch.commit();

    await ctx.auditLogger('org.standardize_roles', 'SUCCESS', {
      roleId,
      facilitiesUpdated: facilitiesSnapshot.size,
    });

    return {
      facilitiesUpdated: facilitiesSnapshot.size,
    };
  }
};

