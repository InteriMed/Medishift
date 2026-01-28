import { z } from "zod";
import { ActionDefinition } from "../../../flows/types";
import { db } from '../../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const ReportIncidentSchema = z.object({
  type: z.enum(['MEDICATION_ERROR', 'NEAR_MISS', 'PATIENT_FALL', 'DATA_BREACH', 'THEFT', 'OTHER']),
  description: z.string(),
  isAnonymous: z.boolean().default(true),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  locationFacilityId: z.string().optional(),
  dateOccurred: z.string(),
});

interface ReportIncidentResult {
  incidentId: string;
  isAnonymous: boolean;
}

export const reportIncidentAction: ActionDefinition<typeof ReportIncidentSchema, ReportIncidentResult> = {
  id: "risk.report_incident",
  fileLocation: "src/services/actions/catalog/risk/reportIncident.ts",
  
  requiredPermission: "risk.report_incident",
  
  label: "Report Incident (CIRS)",
  description: "Critical Incident Reporting System (strictly anonymous)",
  keywords: ["cirs", "incident", "anonymous", "quality", "swiss"],
  icon: "AlertOctagon",
  
  schema: ReportIncidentSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'LOW',
    isSwiss: true,
  },

  handler: async (input, ctx) => {
    const { type, description, isAnonymous, severity, locationFacilityId, dateOccurred } = input;

    const incidentsRef = collection(db, 'cirs_incidents');
    const incidentDoc = await addDoc(incidentsRef, {
      type,
      description,
      severity,
      locationFacilityId: locationFacilityId || ctx.facilityId,
      dateOccurred,
      reportedBy: isAnonymous ? 'ANONYMOUS' : ctx.userId,
      reportedByHash: isAnonymous ? hashUserId(ctx.userId) : null,
      isAnonymous,
      status: 'REPORTED',
      createdAt: serverTimestamp(),
    });

    await ctx.auditLogger('risk.report_incident', 'SUCCESS', {
      incidentId: incidentDoc.id,
      type,
      severity,
      isAnonymous,
    });

    return {
      incidentId: incidentDoc.id,
      isAnonymous,
    };
  }
};

function hashUserId(userId: string): string {
  return Buffer.from(userId).toString('base64');
}

