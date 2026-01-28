import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../../services/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { FiduciaryClient } from '../types';

const GetClientDashboardSchema = z.object({});

interface GetClientDashboardResult {
  clients: FiduciaryClient[];
  linkedFacilities: string[];
}

export const getClientDashboardAction: ActionDefinition<typeof GetClientDashboardSchema, GetClientDashboardResult> = {
  id: "fiduciary.get_client_dashboard",
  fileLocation: "src/services/actions/catalog/fiduciary/getClientDashboard.ts",
  
  requiredPermission: "fiduciary.access",
  
  label: "Get Client Dashboard (Fiduciary)",
  description: "Unified view of linked facility payroll statuses only",
  keywords: ["fiduciary", "clients", "payroll", "dashboard"],
  icon: "BarChart",
  
  schema: GetClientDashboardSchema,
  
  metadata: {
    autoToast: false,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const userRef = doc(db, 'users', ctx.userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error('User not found');
    }

    const userData = userSnap.data();
    const linkedFacilities = userData.linkedFacilities || [];

    if (linkedFacilities.length === 0) {
      await ctx.auditLogger('fiduciary.get_client_dashboard', 'SUCCESS', {
        warning: 'No linked facilities found for fiduciary',
        linkedFacilities: [],
      });

      return {
        clients: [],
        linkedFacilities: [],
      };
    }

    const clients: FiduciaryClient[] = [];

    for (const facilityId of linkedFacilities) {
      const facilityRef = doc(db, 'facility_profiles', facilityId);
      const facilitySnap = await getDoc(facilityRef);

      if (!facilitySnap.exists()) {
        continue;
      }

      const facilityData = facilitySnap.data();

      const payrollPeriodsRef = collection(db, 'payroll_periods');
      const payrollQuery = query(
        payrollPeriodsRef,
        where('facilityId', '==', facilityId)
      );
      const payrollSnapshot = await getDocs(payrollQuery);

      const latestPeriodDoc = payrollSnapshot.docs
        .sort((a, b) => b.data().createdAt.toMillis() - a.data().createdAt.toMillis())[0];

      const latestPeriod = latestPeriodDoc?.data();

      const discrepanciesRef = collection(db, 'payroll_discrepancies');
      const discrepanciesQuery = query(
        discrepanciesRef,
        where('facilityId', '==', facilityId),
        where('status', '==', 'PENDING')
      );
      const discrepanciesSnapshot = await getDocs(discrepanciesQuery);

      clients.push({
        facilityId,
        facilityName: facilityData.name || 'Unknown',
        payrollStatus: latestPeriod?.status || 'DRAFT',
        lastExportDate: latestPeriod?.exportedAt,
        pendingCorrections: discrepanciesSnapshot.size,
      });
    }

    await ctx.auditLogger('fiduciary.get_client_dashboard', 'SUCCESS', {
      fiduciaryId: ctx.userId,
      linkedFacilities,
      clientCount: clients.length,
    });

    return {
      clients,
      linkedFacilities,
    };
  }
};

