import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../../services/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { validateAHV, formatAHV } from '../types';
import { appendAudit } from '../../common/utils';

const VerifyIdentitySchema = z.object({
  userId: z.string(),
  ahvNumber: z.string(),
  permitType: z.enum(['B', 'C', 'G', 'L', 'SWISS_CITIZEN']),
  permitExpiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  nationality: z.string(),
});

interface VerifyIdentityResult {
  ahvValid: boolean;
  formattedAHV: string;
  permitWarning?: string;
}

export const verifyIdentityAction: ActionDefinition<typeof VerifyIdentitySchema, VerifyIdentityResult> = {
  id: "team.verify_identity",
  fileLocation: "src/services/actions/catalog/team/compliance/verifyIdentity.ts",
  
  requiredPermission: "admin.access",
  
  label: "Verify Swiss Identity",
  description: "Validate AHV number and work permit details",
  keywords: ["ahv", "avs", "permit", "identity", "swiss"],
  icon: "ShieldCheck",
  
  schema: VerifyIdentitySchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'HIGH',
  },

  handler: async (input, ctx) => {
    const { userId, ahvNumber, permitType, permitExpiryDate, nationality } = input;

    const ahvValid = validateAHV(ahvNumber);
    
    if (!ahvValid) {
      throw new Error('Invalid AHV number. Must be in format 756.xxxx.xxxx.xx with valid checksum');
    }

    const formattedAHV = formatAHV(ahvNumber);

    let permitWarning: string | undefined;
    if (permitExpiryDate && permitType !== 'SWISS_CITIZEN') {
      const expiry = new Date(permitExpiryDate);
      const today = new Date();
      const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry < 0) {
        permitWarning = 'Permit has EXPIRED';
      } else if (daysUntilExpiry < 60) {
        permitWarning = `Permit expires in ${daysUntilExpiry} days - renewal required`;
      }
    }

    const userRef = doc(db, 'users', userId);
    
    await updateDoc(userRef, {
      ahvNumber: formattedAHV,
      permitType,
      permitExpiryDate: permitExpiryDate || null,
      nationality,
      identityVerified: true,
      identityVerifiedAt: serverTimestamp(),
      identityVerifiedBy: ctx.userId,
      updatedAt: serverTimestamp(),
    });

    await appendAudit('users', userId, {
      uid: ctx.userId,
      action: 'IDENTITY_VERIFIED',
      metadata: {
        ahvValid,
        permitType,
        nationality,
      },
    });

    await ctx.auditLogger('team.verify_identity', 'SUCCESS', {
      userId,
      ahvValid,
      permitType,
      permitWarning,
    });

    return {
      ahvValid,
      formattedAHV,
      permitWarning,
    };
  }
};

