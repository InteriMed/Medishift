import { z } from "zod";
import { ActionDefinition, ActionContext } from "../../../types";
import { db, storage } from '../../../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const ManageCertificationSchema = z.object({
  userId: z.string(),
  type: z.enum([
    'VACCINATION_PERMIT',
    'STUDENT_ID',
    'PHARMACY_DIPLOMA',
    'PROFESSIONAL_LICENSE',
    'NARCOTICS_LICENSE',
    'CONTINUING_EDUCATION'
  ]),
  issuer: z.string(),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fileData: z.string().optional(),
  fileName: z.string().optional(),
});

interface ManageCertificationResult {
  certificationId: string;
  fileUrl?: string;
  warningDays?: number;
}

export const manageCertificationAction: ActionDefinition<typeof ManageCertificationSchema, ManageCertificationResult> = {
  id: "team.manage_certification",
  fileLocation: "src/services/actions/catalog/team/compliance/manageCertification.ts",
  
  requiredPermission: "shift.create",
  
  label: "Manage Certification",
  description: "Upload and track professional certifications/permits",
  keywords: ["certification", "permit", "diploma", "license"],
  icon: "Award",
  
  schema: ManageCertificationSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'HIGH',
  },

  handler: async (input: z.infer<typeof ManageCertificationSchema>, ctx: ActionContext) => {
    const { userId, type, issuer, issueDate, expiryDate, fileData, fileName } = input;

    let fileUrl: string | undefined;

    if (fileData && fileName) {
      const storageRef = ref(storage, `certifications/${userId}/${type}_${Date.now()}_${fileName}`);
      const fileBuffer = Buffer.from(fileData, 'base64');
      const uploadResult = await uploadBytes(storageRef, fileBuffer);
      fileUrl = await getDownloadURL(uploadResult.ref);
    }

    const certification = {
      userId,
      type,
      issuer,
      issueDate,
      expiryDate: expiryDate || null,
      fileUrl: fileUrl || null,
      status: 'VALID',
      uploadedBy: ctx.userId,
      uploadedAt: serverTimestamp(),
      verifiedAt: null,
      verifiedBy: null,
    };

    const certRef = await addDoc(collection(db, 'certifications'), certification);

    let warningDays: number | undefined;
    if (expiryDate) {
      const expiry = new Date(expiryDate);
      const today = new Date();
      const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry < 90) {
        warningDays = daysUntilExpiry;
      }
    }

    await ctx.auditLogger('team.manage_certification', 'SUCCESS', {
      userId,
      type,
      certificationId: certRef.id,
      hasFile: !!fileUrl,
    });

    return {
      certificationId: certRef.id,
      fileUrl,
      warningDays,
    };
  }
};

