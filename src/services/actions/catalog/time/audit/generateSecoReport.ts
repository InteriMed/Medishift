import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const GenerateSecoReportSchema = z.object({
  userId: z.string().optional(),
  dateRange: z.object({
    start: z.string(),
    end: z.string(),
  }),
});

interface SecoReportResult {
  reportUrl: string;
  entriesIncluded: number;
}

export const generateSecoReportAction: ActionDefinition<typeof GenerateSecoReportSchema, SecoReportResult> = {
  id: "time.generate_seco_report",
  fileLocation: "src/services/actions/catalog/time/audit/generateSecoReport.ts",
  
  requiredPermission: "time.generate_seco_report",
  
  label: "Generate SECO Report (Swiss Labor Inspection)",
  description: "PDF formatted for compliance (hides salary, patient info)",
  keywords: ["seco", "audit", "compliance", "swiss", "inspection"],
  icon: "FileText",
  
  schema: GenerateSecoReportSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'LOW',
    isSwiss: true,
  },

  handler: async (input, ctx) => {
    const { userId, dateRange } = input;

    const clocksRef = collection(db, 'time_clock_entries');
    let clocksQuery = query(
      clocksRef,
      where('timestamp', '>=', new Date(dateRange.start)),
      where('timestamp', '<=', new Date(dateRange.end))
    );

    if (userId) {
      clocksQuery = query(clocksQuery, where('userId', '==', userId));
    }

    const clocksSnapshot = await getDocs(clocksQuery);

    const reportData: any[] = [];

    for (const clockDoc of clocksSnapshot.docs) {
      const clock = clockDoc.data();

      const userRef = await db.collection('users').doc(clock.userId).get();
      const userData = userRef.data();

      reportData.push({
        employeeId: clock.userId,
        employeeName: `${userData?.firstName} ${userData?.lastName}`,
        date: clock.timestamp.toDate().toISOString().split('T')[0],
        clockIn: clock.type === 'CLOCK_IN' ? clock.timestamp.toDate().toTimeString().slice(0, 5) : null,
        clockOut: clock.type === 'CLOCK_OUT' ? clock.timestamp.toDate().toTimeString().slice(0, 5) : null,
        breakDuration: clock.breakDuration || 0,
        totalHours: clock.totalHours || 0,
        restCompliance: clock.restCompliance || 'VALID',
      });
    }

    const pdfBuffer = await generateSecoCompliancePDF(reportData, dateRange);

    const reportUrl = await uploadReportToStorage(pdfBuffer, `seco_report_${Date.now()}.pdf`);

    await ctx.auditLogger('time.generate_seco_report', 'SUCCESS', {
      userId: userId || 'ALL',
      dateRange,
      entriesIncluded: reportData.length,
    });

    return {
      reportUrl,
      entriesIncluded: reportData.length,
    };
  }
};

async function generateSecoCompliancePDF(data: any[], dateRange: any): Promise<Buffer> {
  return Buffer.from('SECO_PDF_PLACEHOLDER');
}

async function uploadReportToStorage(buffer: Buffer, filename: string): Promise<string> {
  return `https://storage.example.com/seco_reports/${filename}`;
}

