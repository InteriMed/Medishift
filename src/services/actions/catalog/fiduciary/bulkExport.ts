import { z } from "zod";
import { ActionDefinition, ActionContext } from "../../types";
import { db, storage } from '../../../services/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const BulkExportSchema = z.object({
  facilityIds: z.array(z.string()),
  period: z.string(),
  format: z.enum(['SWISSDEC', 'ABACUS', 'CSV_GENERIC'] as const),
});

interface BulkExportResult {
  zipUrl: string;
  filesIncluded: number;
}

export const bulkExportAction: ActionDefinition<typeof BulkExportSchema, BulkExportResult> = {
  id: "fiduciary.bulk_export",
  fileLocation: "src/services/actions/catalog/fiduciary/bulkExport.ts",
  
  requiredPermission: "fiduciary.bulk_export",
  
  label: "Bulk Export Payroll",
  description: "Generate ZIP with payroll data for linked facilities only",
  keywords: ["fiduciary", "export", "payroll", "bulk"],
  icon: "Download",
  
  schema: BulkExportSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'MEDIUM',
  },

  handler: async (input: z.infer<typeof BulkExportSchema>, ctx: ActionContext) => {
    const { facilityIds, period, format } = input;

    const userRef = doc(db, 'users', ctx.userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      throw new Error('User not found');
    }

    const linkedFacilities = userSnap.data().linkedFacilities || [];

    const unauthorizedFacilities = facilityIds.filter(
      (fid: string) => !linkedFacilities.includes(fid)
    );

    if (unauthorizedFacilities.length > 0) {
      throw new Error(
        `Access denied to facilities: ${unauthorizedFacilities.join(', ')}. Not in linkedFacilities array.`
      );
    }

    const exportFiles: Buffer[] = [];

    for (const facilityId of facilityIds) {
      const payrollDataRef = collection(db, 'payroll_period_data');
      const payrollQuery = query(
        payrollDataRef,
        where('facilityId', '==', facilityId),
        where('period', '==', period)
      );
      const payrollSnapshot = await getDocs(payrollQuery);

      if (!payrollSnapshot.empty) {
        const payrollData = payrollSnapshot.docs[0].data();
        const exportBuffer = await generateExportFile(payrollData, format, facilityId);
        exportFiles.push(exportBuffer);
      }
    }

    const zipBuffer = await createZipArchive(exportFiles);

    const storagePath = `fiduciary_exports/${ctx.userId}/${period}_${Date.now()}.zip`;
    const storageRef = ref(storage, storagePath);
    
    await uploadBytes(storageRef, zipBuffer, {
      contentType: 'application/zip',
    });

    const zipUrl = await getDownloadURL(storageRef);

    await ctx.auditLogger('fiduciary.bulk_export', 'SUCCESS', {
      facilityIds,
      linkedFacilities,
      period,
      format,
      filesIncluded: exportFiles.length,
    });

    return {
      zipUrl,
      filesIncluded: exportFiles.length,
    };
  }
};

async function generateExportFile(data: any, format: string, facilityId: string): Promise<Buffer> {
  return Buffer.from(`Export for ${facilityId}`);
}

async function createZipArchive(files: Buffer[]): Promise<Buffer> {
  return Buffer.from('ZIP_PLACEHOLDER');
}

