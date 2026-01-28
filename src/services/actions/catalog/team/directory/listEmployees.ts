import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../../services/firebase';
import { collection, query, where, getDocs, or } from 'firebase/firestore';

const ListEmployeesSchema = z.object({
  facilityId: z.string().optional(),
  role: z.string().optional(),
  status: z.enum(['ACTIVE', 'TERMINATED', 'SUSPENDED', 'ON_LEAVE']).optional(),
  includeFloaters: z.boolean().default(true),
});

interface ListEmployeesResult {
  employees: Array<{
    id: string;
    firstName: string;
    lastName: string;
    photoURL?: string;
    role: string;
    facilityId: string;
    employmentStatus: string;
    employmentType: string;
    isFloater?: boolean;
  }>;
  totalCount: number;
}

export const listEmployeesAction: ActionDefinition<typeof ListEmployeesSchema, ListEmployeesResult> = {
  id: "team.list_employees",
  fileLocation: "src/services/actions/catalog/team/directory/listEmployees.ts",
  
  requiredPermission: "shift.view",
  
  label: "List Employees",
  description: "Get employee directory with optional filters",
  keywords: ["employees", "staff", "directory", "list"],
  icon: "Users",
  
  schema: ListEmployeesSchema,
  
  metadata: {
    autoToast: false,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const { facilityId, role, status, includeFloaters } = input;

    const usersRef = collection(db, 'users');
    let queries = [];

    if (facilityId) {
      let q = query(
        usersRef,
        where('facilityId', '==', facilityId)
      );

      if (status) {
        q = query(q, where('employmentStatus', '==', status));
      }

      if (role) {
        q = query(q, where('role', '==', role));
      }

      queries.push(q);

      if (includeFloaters) {
        const floaterQuery = query(
          usersRef,
          where('secondaryFacilities', 'array-contains', {
            facilityId,
            accessLevel: 'STANDARD',
          })
        );
        queries.push(floaterQuery);
      }
    } else {
      let q = query(usersRef);

      if (status) {
        q = query(q, where('employmentStatus', '==', status));
      }

      if (role) {
        q = query(q, where('role', '==', role));
      }

      queries.push(q);
    }

    const allEmployees: any[] = [];
    const seenIds = new Set<string>();

    for (const q of queries) {
      const snapshot = await getDocs(q);
      
      snapshot.docs.forEach(doc => {
        if (!seenIds.has(doc.id)) {
          const data = doc.data();
          allEmployees.push({
            id: doc.id,
            firstName: data.firstName,
            lastName: data.lastName,
            photoURL: data.photoURL,
            role: data.role,
            facilityId: data.facilityId,
            employmentStatus: data.employmentStatus,
            employmentType: data.employmentType,
            isFloater: data.facilityId !== facilityId && facilityId !== undefined,
          });
          seenIds.add(doc.id);
        }
      });
    }

    await ctx.auditLogger('team.list_employees', 'SUCCESS', {
      facilityId: facilityId || 'ALL',
      resultCount: allEmployees.length,
    });

    return {
      employees: allEmployees,
      totalCount: allEmployees.length,
    };
  }
};

